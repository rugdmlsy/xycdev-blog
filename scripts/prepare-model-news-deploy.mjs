import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.pages-dist');
const LIVE_BASE = new URL(process.env.BLOG_MODEL_NEWS_LIVE_URL || 'https://blog.xycdev.com/');
const TIMELINE_PATH = path.join(ROOT, 'timeline.html');
const START = '<!-- TIMELINE:START -->';
const END = '<!-- TIMELINE:END -->';
const REQUIRED = new Set(['/', '/timeline.html', '/styles.css', '/script.js']);
const INITIAL = [
  '/', '/timeline.html', '/404.html', '/styles.css', '/script.js', '/feed.xml',
  '/giscus-light.css', '/giscus-dark.css', '/assets/favicon.png', '/assets/apple-touch-icon.png',
];
const FETCHABLE_EXT = new Set([
  '.html', '.css', '.js', '.xml', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.json', '.pdf', '.mp4', '.webm', '.avif',
]);

function timelineBlock(html) {
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start < 0 || end < start) throw new Error('timeline.html is missing generator markers');
  return html.slice(start, end + END.length);
}

function safeOutputPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const normalized = path.normalize(relative);
  if (!relative || normalized.startsWith('..') || path.isAbsolute(normalized)) return null;
  return path.join(OUT, normalized);
}

function shouldFetch(url) {
  if (url.origin !== LIVE_BASE.origin) return false;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return false;
  if (url.pathname === '/') return true;
  const ext = path.extname(url.pathname).toLowerCase();
  return FETCHABLE_EXT.has(ext);
}

function discoverReferences(text, pageUrl) {
  const refs = [];
  const patterns = [
    /(?:href|src)\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = String(match[1] || '').trim();
      if (!raw || raw.startsWith('#') || /^(?:data|javascript|mailto|tel):/i.test(raw)) continue;
      try {
        const resolved = new URL(raw, pageUrl);
        resolved.hash = '';
        resolved.search = '';
        if (shouldFetch(resolved)) refs.push(resolved.pathname || '/');
      } catch {}
    }
  }
  return refs;
}

async function fetchLive(pathname) {
  const url = new URL(pathname, LIVE_BASE);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0', accept: '*/*' },
  });
  if (!response.ok) {
    if (REQUIRED.has(pathname)) throw new Error(`Required live asset ${pathname} returned ${response.status}`);
    return null;
  }
  return {
    url: response.url,
    contentType: String(response.headers.get('content-type') || ''),
    body: Buffer.from(await response.arrayBuffer()),
  };
}

const generatedTimeline = await readFile(TIMELINE_PATH, 'utf8');
const generatedBlock = timelineBlock(generatedTimeline);
const queue = [...INITIAL];
const seen = new Set();
let fetched = 0;
let liveTimeline = '';

while (queue.length && seen.size < 500) {
  const pathname = queue.shift();
  if (seen.has(pathname)) continue;
  seen.add(pathname);

  const result = await fetchLive(pathname);
  if (!result) continue;
  fetched += 1;

  const outputPath = safeOutputPath(pathname);
  if (!outputPath) continue;

  if (pathname === '/timeline.html') {
    liveTimeline = result.body.toString('utf8');
  } else {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, result.body);
  }

  if (/text\/(?:html|css|javascript)|application\/(?:javascript|xml|json)|\+xml/i.test(result.contentType)) {
    const text = result.body.toString('utf8');
    for (const ref of discoverReferences(text, result.url)) {
      if (!seen.has(ref)) queue.push(ref);
    }
  }
}

if (!liveTimeline) throw new Error('Could not fetch the live timeline shell');
const liveStart = liveTimeline.indexOf(START);
const liveEnd = liveTimeline.indexOf(END);
if (liveStart < 0 || liveEnd < liveStart) throw new Error('Live timeline is missing generator markers');
const mergedTimeline = liveTimeline.slice(0, liveStart) + generatedBlock + liveTimeline.slice(liveEnd + END.length);
await writeFile(path.join(OUT, 'timeline.html'), mergedTimeline);

console.log(`Overlayed ${fetched} live file(s); replaced only the generated timeline block for model-news deployment.`);
