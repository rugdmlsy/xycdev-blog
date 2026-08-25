import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const MANUAL_PATH = path.join(ROOT, 'content', 'timeline.json');
const TIMELINE_PATH = path.join(ROOT, 'timeline.html');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const decodeHtml = (value = '') => String(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

function meta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const direct = html.match(new RegExp(`<meta\\s+[^>]*name=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'));
  if (direct) return decodeHtml(direct[1]);
  const reverse = html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*name=["']${escaped}["'][^>]*>`, 'i'));
  return reverse ? decodeHtml(reverse[1]) : '';
}

function firstText(html, tag) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function firstDate(html) {
  const match = html.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : '';
}

async function walkHtml(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

async function readPosts() {
  const files = await walkHtml(POSTS_DIR);
  const posts = [];
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    if (meta(html, 'timeline') === 'false') continue;
    const date = meta(html, 'timeline-date') || firstDate(html);
    const titleZh = meta(html, 'timeline-title') || firstText(html, 'h1');
    if (!date || !titleZh) continue;
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const extraTags = (meta(html, 'timeline-tags') || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    posts.push({
      id: `post:${rel}`,
      kind: 'post',
      date,
      tags: [...new Set(['blog', ...extraTags])],
      title: { zh: titleZh, en: meta(html, 'timeline-title-en') || titleZh },
      summary: { zh: meta(html, 'description'), en: meta(html, 'timeline-summary-en') || meta(html, 'description') },
      url: `/${rel}`,
    });
  }
  return posts;
}

function normalizeManual(entry, index) {
  if (!entry || typeof entry !== 'object') throw new Error(`timeline entry #${index + 1} must be an object`);
  if (!entry.date) throw new Error(`timeline entry #${index + 1} is missing date`);
  const tags = Array.isArray(entry.tags) ? entry.tags : entry.tag ? [entry.tag] : [];
  if (!tags.length) throw new Error(`timeline entry #${index + 1} is missing tags`);
  const content = typeof entry.content === 'string' ? { zh: entry.content, en: entry.content } : (entry.content || {});
  if (!content.zh && !content.en) throw new Error(`timeline entry #${index + 1} is missing content`);
  return {
    id: entry.id || `manual:${entry.date}:${index}`,
    kind: 'note',
    date: entry.date,
    tags: [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))],
    content: { zh: content.zh || content.en, en: content.en || content.zh },
    url: entry.url || '',
  };
}

function sortKey(date) {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function langSpans(copy, className) {
  return `<span class="${className}" data-language-copy="zh">${escapeHtml(copy.zh || '')}</span><span class="${className}" data-language-copy="en" hidden>${escapeHtml(copy.en || copy.zh || '')}</span>`;
}

function renderEntry(entry) {
  const tags = entry.tags.map((tag) => `<button class="timeline-tag" type="button" data-timeline-tag-jump="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('');
  const date = escapeHtml(entry.date);
  if (entry.kind === 'post') {
    const summary = entry.summary?.zh || entry.summary?.en ? `<p class="timeline-summary">${langSpans(entry.summary, 'timeline-copy')}</p>` : '';
    return `<article class="timeline-entry timeline-entry-post" data-timeline-tags="${escapeHtml(entry.tags.join(' '))}">
      <div class="timeline-date"><time datetime="${date}" data-timeline-date>${escapeHtml(entry.date.slice(0, 10))}</time></div>
      <div class="timeline-marker" aria-hidden="true"></div>
      <div class="timeline-entry-main">
        <div class="timeline-tags">${tags}</div>
        <h2><a href="${escapeHtml(entry.url)}">${langSpans(entry.title, 'timeline-copy')}</a></h2>
        ${summary}
        <a class="timeline-entry-link" href="${escapeHtml(entry.url)}"><span data-i18n="timeline.readPost">阅读全文</span> <span aria-hidden="true">↗</span></a>
      </div>
    </article>`;
  }
  const body = `<p class="timeline-note-copy">${langSpans(entry.content, 'timeline-copy')}</p>`;
  const link = entry.url ? `<a class="timeline-entry-link" href="${escapeHtml(entry.url)}" rel="noopener noreferrer"><span data-i18n="timeline.openLink">打开链接</span> <span aria-hidden="true">↗</span></a>` : '';
  return `<article class="timeline-entry timeline-entry-note" data-timeline-tags="${escapeHtml(entry.tags.join(' '))}">
    <div class="timeline-date"><time datetime="${date}" data-timeline-date>${escapeHtml(entry.date.replace('T', ' ').slice(0, 16))}</time></div>
    <div class="timeline-marker" aria-hidden="true"></div>
    <div class="timeline-entry-main">
      <div class="timeline-tags">${tags}</div>
      ${body}${link}
    </div>
  </article>`;
}

const manualRaw = JSON.parse(await readFile(MANUAL_PATH, 'utf8'));
const manualEntries = (manualRaw.entries || []).map(normalizeManual);
const entries = [...await readPosts(), ...manualEntries].sort((a, b) => sortKey(b.date) - sortKey(a.date));
const tags = [...new Set(entries.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b));

let html = await readFile(TIMELINE_PATH, 'utf8');
const start = '<!-- TIMELINE:START -->';
const end = '<!-- TIMELINE:END -->';
if (!html.includes(start) || !html.includes(end)) throw new Error('timeline.html is missing generator markers');

const tagButtons = tags.map((tag) => `<button class="timeline-filter" type="button" data-timeline-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('\n        ');
const entryMarkup = entries.map(renderEntry).join('\n        ');
const generated = `${start}\n      <div class="timeline-filter-row" aria-label="Timeline tag filters" data-i18n-aria="timeline.filtersAria">
        <button class="timeline-filter is-active" type="button" data-timeline-filter="all" data-i18n="timeline.all">全部</button>${tagButtons ? `\n        ${tagButtons}` : ''}
      </div>
      <div class="timeline-list" aria-live="polite">${entryMarkup ? `\n        ${entryMarkup}\n      ` : ''}</div>
      <p class="timeline-empty" hidden data-i18n="timeline.empty">这个标签下还没有内容。</p>
      ${end}`;

html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), generated);
await writeFile(TIMELINE_PATH, html);
console.log(`Generated timeline.html with ${entries.length} entries and ${tags.length} tags.`);
