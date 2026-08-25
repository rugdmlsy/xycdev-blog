import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, stat, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, readPostsData, writePostsData, TIMELINE_DATA_PATH, normalizePost } from './content-lib.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.BLOG_ADMIN_PORT || 4322);
const MAX_BODY = 2 * 1024 * 1024;
const ADMIN_DIR = path.join(ROOT, 'admin');
let operation = Promise.resolve();

const TYPES = new Map([
  ['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],
  ['.json','application/json; charset=utf-8'],['.xml','application/xml; charset=utf-8'],['.webp','image/webp'],
  ['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.svg','image/svg+xml'],['.txt','text/plain; charset=utf-8'],
]);

function send(res, status, body, headers = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, { 'Content-Length': data.length, ...headers });
  res.end(data);
}
function json(res, status, value) { send(res, status, JSON.stringify(value), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); }
function bad(res, status, message) { json(res, status, { ok: false, error: message }); }

async function readJson(req) {
  const type = String(req.headers['content-type'] || '');
  if (!type.startsWith('application/json')) throw Object.assign(new Error('需要 application/json'), { status: 415 });
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('请求内容过大'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function assertLocalMutation(req) {
  if (req.headers['x-blog-admin'] !== '1') throw Object.assign(new Error('缺少本地编辑器标记'), { status: 403 });
  const origin = req.headers.origin;
  if (origin && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) throw Object.assign(new Error('拒绝非本地来源'), { status: 403 });
}

function run(command, args, { timeoutMs = 120000, acceptDeploymentHang = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, env: process.env, shell: false });
    let stdout = '', stderr = '', settled = false, deploymentUrl = '';
    const finish = (code, timedOut = false) => {
      if (settled) return; settled = true; clearTimeout(timer);
      const output = `${stdout}${stderr}`;
      if (acceptDeploymentHang && output.includes('Deployment complete!')) code = 0;
      resolve({ code: code ?? 1, stdout, stderr, output, timedOut, deploymentUrl });
    };
    const scan = (text) => {
      const match = text.match(/https:\/\/[^\s]+\.pages\.dev/);
      if (match) deploymentUrl = match[0];
      if (acceptDeploymentHang && text.includes('Deployment complete!')) {
        setTimeout(() => { try { child.kill('SIGTERM'); } catch {} }, 250);
      }
    };
    child.stdout.on('data', (d) => { const t=d.toString(); stdout += t; scan(t); });
    child.stderr.on('data', (d) => { const t=d.toString(); stderr += t; scan(t); });
    child.on('error', (e) => { stderr += `${e.message}\n`; finish(1); });
    child.on('close', (code) => finish(code));
    const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {}; finish(null, true); }, timeoutMs);
  });
}

async function runChecked(command, args, options) {
  const result = await run(command, args, options);
  if (result.code !== 0) {
    const err = new Error(result.output.trim() || `${command} failed`);
    err.result = result; throw err;
  }
  return result;
}

async function buildSite() {
  const build = await runChecked('npm', ['run', 'build'], { timeoutMs: 30000 });
  return build.output;
}
async function checkSite() {
  const check = await runChecked('npm', ['run', 'check'], { timeoutMs: 30000 });
  return check.output;
}
async function gitStatus() {
  const status = await runChecked('git', ['status', '--short', '--branch'], { timeoutMs: 10000 });
  return status.stdout.trim();
}
async function readTimeline() {
  const raw = JSON.parse(await readFile(TIMELINE_DATA_PATH, 'utf8'));
  return { entries: Array.isArray(raw.entries) ? raw.entries : [] };
}
async function writeTimeline(data) {
  await writeFile(TIMELINE_DATA_PATH, JSON.stringify({ entries: data.entries || [] }, null, 2) + '\n');
}
async function statePayload() {
  const [{ posts }, timeline, status] = await Promise.all([readPostsData(), readTimeline(), gitStatus()]);
  return { ok: true, posts, timeline: timeline.entries, gitStatus: status, liveUrl: 'https://blog.xycdev.com', previewUrl: `http://${HOST}:${PORT}` };
}

function queue(task) {
  const next = operation.then(task, task);
  operation = next.catch(() => {});
  return next;
}

async function savePost(oldSlug, payload) {
  const data = await readPostsData();
  const post = normalizePost(payload);
  const existingIndex = oldSlug ? data.posts.findIndex((p) => p.slug === oldSlug) : -1;
  if (post.featured) data.posts = data.posts.map((item) => ({ ...item, featured: false }));
  if (!oldSlug && data.posts.some((p) => p.slug === post.slug)) throw Object.assign(new Error(`slug 已存在: ${post.slug}`), { status: 409 });
  if (oldSlug && data.posts.some((p, i) => p.slug === post.slug && i !== existingIndex)) throw Object.assign(new Error(`slug 已存在: ${post.slug}`), { status: 409 });
  if (existingIndex >= 0) data.posts[existingIndex] = post; else data.posts.push(post);
  if (oldSlug && oldSlug !== post.slug) {
    try { await unlink(path.join(ROOT, 'posts', `${oldSlug}.html`)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  await writePostsData(data);
  const log = await buildSite();
  return { post, log };
}

async function publishSite(message) {
  let log = '';
  log += (await runChecked('npm', ['run', 'build'], { timeoutMs: 30000 })).output;
  log += (await runChecked('npm', ['run', 'check'], { timeoutMs: 30000 })).output;
  log += (await runChecked('npm', ['run', 'prepare:deploy'], { timeoutMs: 30000 })).output;
  await runChecked('git', ['add', '--', 'content', 'posts', 'index.html', 'timeline.html', 'feed.xml'], { timeoutMs: 10000 });
  const staged = await runChecked('git', ['diff', '--cached', '--name-only'], { timeoutMs: 10000 });
  let commit = '';
  if (staged.stdout.trim()) {
    const safeMessage = String(message || 'Publish blog content').trim().slice(0, 120) || 'Publish blog content';
    const committed = await runChecked('git', ['commit', '-m', safeMessage], { timeoutMs: 30000 });
    commit = committed.stdout;
    const pushed = await runChecked('git', ['push', 'origin', 'main'], { timeoutMs: 60000 });
    log += committed.output + pushed.output;
  }
  const deploy = await run('npx', ['--yes','--prefer-offline','wrangler@4.123.0','pages','deploy','.pages-dist','--project-name','xycdev-journal'], { timeoutMs: 90000, acceptDeploymentHang: true });
  log += deploy.output;
  if (deploy.code !== 0) throw Object.assign(new Error(deploy.output.trim() || 'Pages 部署失败'), { result: deploy });
  return { log, commit, deploymentUrl: deploy.deploymentUrl, liveUrl: 'https://blog.xycdev.com' };
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, await statePayload());
  if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, { ok: true, gitStatus: await gitStatus() });
  if (req.method !== 'GET') assertLocalMutation(req);

  if (req.method === 'POST' && url.pathname === '/api/build') {
    return queue(async () => { const log = await buildSite() + await checkSite(); json(res, 200, { ok: true, log, gitStatus: await gitStatus() }); });
  }
  if (req.method === 'POST' && url.pathname === '/api/publish') {
    const body = await readJson(req);
    return queue(async () => { const result = await publishSite(body.message); json(res, 200, { ok: true, ...result, gitStatus: await gitStatus() }); });
  }
  if (req.method === 'POST' && url.pathname === '/api/posts') {
    const body = await readJson(req);
    return queue(async () => { const result = await savePost(null, body); json(res, 200, { ok: true, ...result, state: await statePayload() }); });
  }
  const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && req.method === 'PUT') {
    const oldSlug = decodeURIComponent(postMatch[1]); const body = await readJson(req);
    return queue(async () => { const result = await savePost(oldSlug, body); json(res, 200, { ok: true, ...result, state: await statePayload() }); });
  }
  if (postMatch && req.method === 'DELETE') {
    const slug = decodeURIComponent(postMatch[1]);
    return queue(async () => {
      const data = await readPostsData(); const before = data.posts.length;
      data.posts = data.posts.filter((p) => p.slug !== slug);
      if (data.posts.length === before) throw Object.assign(new Error('文章不存在'), { status: 404 });
      await writePostsData(data); try { await unlink(path.join(ROOT, 'posts', `${slug}.html`)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      const log = await buildSite(); json(res, 200, { ok: true, log, state: await statePayload() });
    });
  }
  if (req.method === 'POST' && url.pathname === '/api/timeline') {
    const body = await readJson(req);
    return queue(async () => {
      const data = await readTimeline();
      const entry = { id: randomUUID(), date: String(body.date || new Date().toISOString()), tags: Array.isArray(body.tags) ? body.tags : [], content: body.content || {}, url: String(body.url || '') };
      data.entries.unshift(entry); await writeTimeline(data); const log = await buildSite();
      json(res, 200, { ok: true, entry, log, state: await statePayload() });
    });
  }
  const timelineMatch = url.pathname.match(/^\/api\/timeline\/([^/]+)$/);
  if (timelineMatch && req.method === 'PUT') {
    const id = decodeURIComponent(timelineMatch[1]); const body = await readJson(req);
    return queue(async () => {
      const data = await readTimeline(); const index = data.entries.findIndex((e) => e.id === id);
      if (index < 0) throw Object.assign(new Error('时间线内容不存在'), { status: 404 });
      data.entries[index] = { ...data.entries[index], date: String(body.date || data.entries[index].date), tags: Array.isArray(body.tags) ? body.tags : data.entries[index].tags, content: body.content || data.entries[index].content, url: String(body.url ?? data.entries[index].url ?? '') };
      await writeTimeline(data); const log = await buildSite(); json(res, 200, { ok: true, entry: data.entries[index], log, state: await statePayload() });
    });
  }
  if (timelineMatch && req.method === 'DELETE') {
    const id = decodeURIComponent(timelineMatch[1]);
    return queue(async () => {
      const data = await readTimeline(); const before = data.entries.length; data.entries = data.entries.filter((e) => e.id !== id);
      if (data.entries.length === before) throw Object.assign(new Error('时间线内容不存在'), { status: 404 });
      await writeTimeline(data); const log = await buildSite(); json(res, 200, { ok: true, log, state: await statePayload() });
    });
  }
  bad(res, 404, 'API 不存在');
}

async function serveFile(res, pathname) {
  let filePath;
  if (pathname === '/admin' || pathname === '/admin/') filePath = path.join(ADMIN_DIR, 'index.html');
  else if (pathname.startsWith('/admin/')) filePath = path.join(ADMIN_DIR, pathname.slice('/admin/'.length));
  else {
    const clean = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    filePath = path.join(ROOT, clean);
    if ((await stat(filePath).catch(() => null))?.isDirectory()) filePath = path.join(filePath, 'index.html');
  }
  const base = pathname.startsWith('/admin') ? ADMIN_DIR : ROOT;
  const resolved = path.resolve(filePath);
  if (!(resolved === path.resolve(base) || resolved.startsWith(path.resolve(base) + path.sep))) return bad(res, 403, '非法路径');
  if (resolved.includes(`${path.sep}.git${path.sep}`) || resolved.includes(`${path.sep}content${path.sep}`) || resolved.includes(`${path.sep}scripts${path.sep}`) || resolved.includes(`${path.sep}.wrangler${path.sep}`)) return bad(res, 404, 'Not found');
  try {
    const data = await readFile(resolved); const type = TYPES.get(path.extname(resolved).toLowerCase()) || 'application/octet-stream';
    send(res, 200, data, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  } catch (e) { if (e.code === 'ENOENT' || e.code === 'EISDIR') bad(res, 404, 'Not found'); else throw e; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (url.pathname.startsWith('/api/')) await api(req, res, url); else await serveFile(res, url.pathname);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) bad(res, e.status || 500, e.message || '服务器错误'); else res.end();
  }
});
server.listen(PORT, HOST, () => console.log(`xycdev blog editor: http://${HOST}:${PORT}/admin/`));
