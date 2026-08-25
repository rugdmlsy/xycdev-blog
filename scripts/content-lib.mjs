import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = process.cwd();
export const POSTS_DATA_PATH = path.join(ROOT, 'content', 'posts.json');
export const TIMELINE_DATA_PATH = path.join(ROOT, 'content', 'timeline.json');

export const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function escapeAttr(value = '') { return escapeHtml(value); }

export function normalizeSlug(value) {
  const slug = String(value || '').trim().toLowerCase()
    .replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '').replace(/^-+|-+$/g, '');
  if (!slug || slug === '.' || slug === '..') throw new Error('Slug 只能包含英文小写字母、数字、点、下划线和连字符');
  return slug;
}

export function normalizeTags(value) {
  const input = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(input.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
}

export function estimateReadingTime(markdown = '') {
  const source = String(markdown || '');
  const images = [...source.matchAll(/!\[[^\]]*\]\([^\s)]+\)/g)].length;
  const text = source
    .replace(/!\[[^\]]*\]\([^\s)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*|```$/g, ' '))
    .replace(/[`*_>#~-]/g, ' ');
  const cjkChars = (text.match(/[\p{Script=Han}]/gu) || []).length;
  const latinWords = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  const textSeconds = (cjkChars / 500) * 60 + (latinWords / 238) * 60;
  let imageSeconds = 0;
  for (let i = 0; i < images; i += 1) imageSeconds += Math.max(3, 12 - i);
  return {
    minutes: Math.max(1, Math.ceil((textSeconds + imageSeconds) / 60)),
    cjkChars,
    latinWords,
    images,
  };
}

export function estimateReadingTimePair(body = {}) {
  return {
    zh: estimateReadingTime(body.zh || body.en || ''),
    en: estimateReadingTime(body.en || body.zh || ''),
  };
}

export function normalizePost(post, index = 0) {
  if (!post || typeof post !== 'object') throw new Error(`文章 #${index + 1} 格式错误`);
  const slug = normalizeSlug(post.slug);
  const date = String(post.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${slug}: 日期必须为 YYYY-MM-DD`);
  const category = ['tech', 'personal'].includes(post.category) ? post.category : 'tech';
  const title = typeof post.title === 'string' ? { zh: post.title, en: post.title } : (post.title || {});
  if (!String(title.zh || title.en || '').trim()) throw new Error(`${slug}: 缺少标题`);
  const summary = typeof post.summary === 'string' ? { zh: post.summary, en: post.summary } : (post.summary || {});
  const rawBody = typeof post.body === 'string' ? { zh: post.body, en: post.body } : (post.body || {});
  const body = { zh: String(rawBody.zh || rawBody.en || ''), en: String(rawBody.en || rawBody.zh || '') };
  const reading = estimateReadingTimePair(body);
  return {
    slug, date, category, featured: Boolean(post.featured),
    tags: normalizeTags(post.tags), timelineTags: normalizeTags(post.timelineTags),
    readMinutes: { zh: reading.zh.minutes, en: reading.en.minutes },
    readingStats: { zh: reading.zh, en: reading.en },
    title: { zh: String(title.zh || title.en || '').trim(), en: String(title.en || title.zh || '').trim() },
    summary: { zh: String(summary.zh || summary.en || '').trim(), en: String(summary.en || summary.zh || '').trim() },
    timelineSummary: {
      zh: String(post.timelineSummary?.zh || summary.zh || summary.en || '').trim(),
      en: String(post.timelineSummary?.en || summary.en || summary.zh || '').trim(),
    },
    body,
  };
}

export async function readPostsData() {
  const raw = JSON.parse(await readFile(POSTS_DATA_PATH, 'utf8'));
  const posts = (raw.posts || []).map(normalizePost);
  const seen = new Set();
  for (const post of posts) {
    if (seen.has(post.slug)) throw new Error(`重复 slug: ${post.slug}`);
    seen.add(post.slug);
  }
  return { posts };
}

export async function writePostsData(data) {
  const posts = (data.posts || []).map(normalizePost);
  const sourcePosts = posts.map(({ readMinutes, readingStats, ...post }) => post);
  await writeFile(POSTS_DATA_PATH, JSON.stringify({ posts: sourcePosts }, null, 2) + '\n');
  return { posts };
}

export function inlineMarkdown(text) {
  let out = escapeHtml(text);
  out = out.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" decoding="async">');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function markdownToHtml(markdown = '') {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let paragraph = [];
  let list = [];
  let code = null;
  let codeLang = '';
  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    out.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const line of lines) {
    const fence = line.match(/^```\s*([\w-]*)\s*$/);
    if (fence) {
      if (code !== null) {
        out.push(`<pre><code${codeLang ? ` class="language-${escapeAttr(codeLang)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null; codeLang = '';
      } else {
        flushParagraph(); flushList(); code = []; codeLang = fence[1] || '';
      }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    const h = line.match(/^(#{2,4})\s+(.+)$/);
    if (h) {
      flushParagraph(); flushList();
      const level = Math.min(4, h[1].length);
      const id = slugifyHeading(h[2]);
      out.push(`<h${level}${level === 2 ? ` id="${escapeAttr(id)}"` : ''}>${inlineMarkdown(h[2])}</h${level}>`);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { flushParagraph(); flushList(); out.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) { flushParagraph(); list.push(item[1]); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    paragraph.push(line.trim());
  }
  if (code !== null) out.push(`<pre><code${codeLang ? ` class="language-${escapeAttr(codeLang)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
  flushParagraph(); flushList();
  return out.join('\n');
}

export function slugifyHeading(value) {
  const ascii = String(value).trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  return ascii || `section-${Math.random().toString(36).slice(2, 8)}`;
}

export function extractH2(markdown = '') {
  return String(markdown).split(/\r?\n/).map((line) => line.match(/^##\s+(.+)$/)).filter(Boolean).map((m) => ({ text: m[1], id: slugifyHeading(m[1]) }));
}

export function languagePair(copy, tag = 'span', attrs = '') {
  const zh = escapeHtml(copy?.zh || copy?.en || '');
  const en = escapeHtml(copy?.en || copy?.zh || '');
  return `<${tag}${attrs} data-language-copy="zh">${zh}</${tag}><${tag}${attrs} data-language-copy="en" hidden>${en}</${tag}>`;
}
