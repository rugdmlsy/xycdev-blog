import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const TIMELINE_PATH = process.env.MODEL_NEWS_TIMELINE_PATH
  ? path.resolve(process.env.MODEL_NEWS_TIMELINE_PATH)
  : path.join(ROOT, 'content', 'timeline.json');
const LOOKBACK_DAYS = Math.max(1, Number(process.env.MODEL_NEWS_LOOKBACK_DAYS || 10));
const FETCH_TIMEOUT_MS = Math.max(3000, Number(process.env.MODEL_NEWS_FETCH_TIMEOUT_MS || 15000));
const USER_AGENT = 'Mozilla/5.0';
const STATE_PATH = process.env.MODEL_NEWS_STATE_PATH
  ? path.resolve(process.env.MODEL_NEWS_STATE_PATH)
  : path.join(os.homedir(), '.cache', 'xycdev-blog', 'model-release-news-state.json');
const NOW = process.env.MODEL_NEWS_NOW ? new Date(process.env.MODEL_NEWS_NOW) : new Date();
const CUTOFF = new Date(NOW.getTime() - LOOKBACK_DAYS * 86400_000);

const RELEASE_SIGNAL = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|preview(?:s|ed|ing)?|general availability|ga release)\b|正式(?:发布|推出|上线)|发布并开源|发布|推出|全新模型|模型上线/iu;
const NEGATIVE_TITLE = /\b(?:system card|model card|safety|safeguard|pricing|price|discount|partnership|partner|copilot|bedrock|azure|aws|vertex|foundry|policy|benchmark|evaluation|evals|research agenda|how to|guide|tutorial|usage|limits?|incident|watermark|availability in|now in|support for|integration|integrating|improving|upgrade your|changelog|with references)\b|价格|降价|优惠|合作|接入|安全|水印|评测|教程|指南|事故|限额|更新日志/iu;
const STRONG_TITLE_SIGNAL = /^(?:introducing|announcing|previewing|launching|releasing)|\b(?:ga release|official(?:ly)? released|official launch)\b|(?:正式发布|正式推出|发布并开源|全新发布)/iu;

const SOURCES = [
  {
    id: 'openai', company: 'OpenAI', kind: 'sitemap-new-url',
    roots: ['https://openai.com/sitemap.xml/release/', 'https://openai.com/sitemap.xml/product/', 'https://openai.com/sitemap.xml/security/', 'https://openai.com/sitemap.xml/safety/'],
    includeUrl: (url) => /^https:\/\/openai\.com\/index\//i.test(url),
    model: /\b(?:GPT[-‑ ]?[A-Za-z0-9.]+(?:[-‑ ][A-Za-z0-9.]+){0,3}|o[1-9](?:[-‑ ][A-Za-z0-9.]+){0,2}|Sora(?:[-‑ ][A-Za-z0-9.]+){0,2}|DALL[-‑· ]?E(?:[-‑ ][A-Za-z0-9.]+){0,2}|Whisper(?:[-‑ ][A-Za-z0-9.]+){0,2})\b/giu,
  },
  {
    id: 'openai-model-catalog', company: 'OpenAI', kind: 'index-new-url',
    roots: ['https://developers.openai.com/api/docs/models/all'],
    includeUrl: (url) => /^https:\/\/developers\.openai\.com\/api\/docs\/models\/(?!all(?:[/?#]|$))[^?#/]+\/?$/i.test(url),
    model: /\bGPT[-‑ ]?[A-Za-z0-9.]+(?:[-‑ ][A-Za-z0-9.]+){0,4}\b/giu,
  },
  {
    id: 'anthropic', company: 'Anthropic', kind: 'sitemap', roots: ['https://www.anthropic.com/sitemap.xml'],
    includeUrl: (url) => /^https:\/\/www\.anthropic\.com\/(?:news\/|claude-[^/?#]+\/?$)/i.test(url),
    model: /\bClaude\s+(?:(?:Opus|Sonnet|Haiku|Fable|Mythos)\s*)?\d+(?:\.\d+)*\b/giu,
  },
  {
    id: 'google-deepmind', company: 'Google DeepMind', kind: 'sitemap', roots: ['https://deepmind.google/sitemap.xml'],
    includeUrl: (url) => /^https:\/\/deepmind\.google\/blog\//i.test(url),
    allowDescriptionAnnouncement: true,
    model: /\b(?:(?:Gemini|Gemma|Veo|Imagen|Genie|Lyria)\s+(?:[A-Za-z][A-Za-z-]*\s+){0,2}\d+(?:\.\d+)*(?:\s+[A-Za-z][A-Za-z-]*){0,2}|Gemini\s+(?:Omni|Robotics)(?:\s+\d+(?:\.\d+)*)?(?:\s+[A-Za-z][A-Za-z-]*){0,2}|SL2T(?:\s*\d+(?:\.\d+)*)?)\b/giu,
  },
  {
    id: 'google-ai', company: 'Google', kind: 'sitemap', roots: ['https://blog.google/en-us/sitemap.xml'],
    includeUrl: (url) => /^https:\/\/blog\.google\/innovation-and-ai\/(?:models-and-research\/gemini-models|technology\/developers-tools)\//i.test(url),
    allowDescriptionAnnouncement: true,
    model: /\b(?:(?:Gemini|Gemma|Veo|Imagen|Genie|Lyria)\s+(?:[A-Za-z][A-Za-z-]*\s+){0,2}\d+(?:\.\d+)*(?:\s+[A-Za-z][A-Za-z-]*){0,2}|Gemini\s+(?:Omni|Robotics)(?:\s+\d+(?:\.\d+)*)?(?:\s+[A-Za-z][A-Za-z-]*){0,2}|SL2T(?:\s*\d+(?:\.\d+)*)?)\b/giu,
  },
  {
    id: 'meta', company: 'Meta', kind: 'index', roots: ['https://research.meta.ai/'],
    includeUrl: (url) => /^(?:https:\/\/research\.meta\.ai\/blog\/|https:\/\/ai\.meta\.com\/blog\/)/i.test(url),
    model: /\b(?:Llama\s*\d+(?:\.\d+)*(?:\s*\d+B)?|Muse\s+(?:Spark(?:\s*\d+(?:\.\d+)*)?|Glimmer|Voice\s+Transcribe|Image(?:\s*\d+(?:\.\d+)*)?|Video(?:\s*\d+(?:\.\d+)*)?))\b/giu,
  },
  {
    id: 'mistral', company: 'Mistral AI', kind: 'sitemap', roots: ['https://mistral.ai/sitemap-index.xml'],
    includeUrl: (url) => /^https:\/\/mistral\.ai\/news\//i.test(url),
    model: /\b(?:Mistral\s+(?:(?:Large|Medium|Small|Nemo|Next)(?:\s*\d+(?:\.\d+)*)?|OCR\s*\d+)|Codestral(?:\s*\d+(?:\.\d+)*)?|Devstral(?:\s*\d+(?:\.\d+)*)?|Pixtral(?:\s+[A-Za-z0-9.]+)?|Voxtral(?:\s+[A-Za-z0-9.]+)?|Ministral(?:\s+[A-Za-z0-9.]+)?|Magistral(?:\s+[A-Za-z0-9.]+)?|Mathstral(?:\s+[A-Za-z0-9.]+)?|Robostral(?:\s+[A-Za-z0-9.]+)?|Leanstral(?:\s+[A-Za-z0-9.]+)?|Shieldstral(?:\s+[A-Za-z0-9.]+)?)\b/giu,
  },
  {
    id: 'deepseek', company: 'DeepSeek', kind: 'sitemap', roots: ['https://api-docs.deepseek.com/sitemap.xml'],
    includeUrl: (url) => /^https:\/\/api-docs\.deepseek\.com\/news\//i.test(url),
    model: /\bDeepSeek[-‑ ]?[A-Za-z0-9.]+(?:[-‑ ][A-Za-z0-9.]+){0,3}\b/giu,
  },
  {
    id: 'deepseek-updates', company: 'DeepSeek', kind: 'deepseek-updates', roots: ['https://api-docs.deepseek.com/updates/'],
    model: /\bDeepSeek[-‑ ]?[A-Za-z0-9.]+(?:[-‑ ][A-Za-z0-9.]+){0,3}\b/giu,
  },
  {
    id: 'qwen', company: 'Qwen', kind: 'index-new-url', roots: ['https://qwen.ai/blog'],
    includeUrl: (url) => /^https:\/\/qwen\.ai\/blog(?:\?|$)/i.test(url),
    model: /\b(?:Qwen\d(?:\.\d+)*(?:-[A-Za-z0-9.]+)*|QwQ[A-Za-z0-9.-]*|QVQ[A-Za-z0-9.-]*)\b/gu,
  },
  {
    id: 'qwen-github', company: 'Qwen', kind: 'qwen-github',
    roots: ['https://api.github.com/orgs/QwenLM/repos?per_page=100&sort=updated'],
    model: /\b(?:Qwen\d(?:\.\d+)*(?:-[A-Za-z0-9.]+)*|QwQ[A-Za-z0-9.-]*|QVQ[A-Za-z0-9.-]*)\b/gu,
  },
  {
    id: 'zai', company: 'Z.ai', kind: 'zhipu-research', roots: ['https://www.zhipuai.cn/zh/research'],
    model: /\bGLM[-A-Za-z0-9.]+\b/giu,
  },
  {
    id: 'bytedance-seed', company: 'ByteDance Seed', kind: 'sitemap', roots: ['https://seed.bytedance.com/sitemap.xml'],
    includeUrl: (url) => /^https:\/\/seed\.bytedance\.com\/blog\//i.test(url),
    model: /\b(?:(?:Seedance|Seedream|Seed)\s*[- ]?\s*\d+(?:\.\d+)*(?:\s+(?:Pro|Lite|Preview))?|SeedRealtime|Seed\s+Full[- ]Duplex\s+Speech\s+LLM)\b/giu,
  },
  {
    id: 'kimi', company: 'Moonshot AI', kind: 'index', roots: ['https://www.kimi.com/en/blog/'],
    includeUrl: (url) => /^https:\/\/www\.kimi\.com\/en\/blog\//i.test(url) && url !== 'https://www.kimi.com/en/blog/',
    model: /\bKimi[- ]+[A-Za-z0-9][A-Za-z0-9.-]*(?:\s+(?:Code|Thinking|Turbo|Preview))?\b/giu,
  },
  {
    id: 'xai', company: 'xAI', kind: 'bing-rss', roots: [
      'https://www.bing.com/news/search?q=site%3Ax.ai%2Fnews%20Grok&format=rss',
      'https://www.bing.com/news/search?q=site%3Ax.ai%2Fnews%20Imagine&format=rss',
    ],
    model: /\b(?:Grok\s*\d+(?:\.\d+)*(?:\s+(?:Fast|Mini|Code|Heavy|Reasoning|Beta|Preview))?|Imagine\s+(?:Image|Video)\s*\d+(?:\.\d+)*)\b/giu,
  },
];

function decodeEntities(value = '') {
  return String(value)
    .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripHtml(html = '') {
  return decodeEntities(String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}

function normalizeUrl(raw, base) {
  try {
    const url = new URL(decodeEntities(raw), base);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|ref$|source$|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch { return ''; }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8' },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return { text: await response.text(), finalUrl: response.url };
  } finally { clearTimeout(timer); }
}

function sitemapItems(xml) {
  return [...String(xml).matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/gi)].map((match) => ({
    url: decodeEntities(match[1].trim()),
    lastmod: decodeEntities((match[2].match(/<lastmod>([^<]+)<\/lastmod>/i) || [])[1] || ''),
  }));
}

function sitemapChildren(xml) {
  return [...String(xml).matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi)].map((m) => decodeEntities(m[1].trim()));
}

async function discoverSitemap(source, { includeAll = false } = {}) {
  const out = [];
  const queue = source.roots.map((url) => ({ url, depth: 0 }));
  const seen = new Set();
  while (queue.length) {
    const { url, depth } = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const { text } = await fetchText(url);
    const children = sitemapChildren(text);
    if (children.length && depth < 2) {
      for (const child of children) queue.push({ url: child, depth: depth + 1 });
      continue;
    }
    for (const item of sitemapItems(text)) {
      if (!source.includeUrl?.(item.url)) continue;
      const lm = item.lastmod ? new Date(item.lastmod) : null;
      if (!includeAll && lm && !Number.isNaN(lm.valueOf()) && lm < new Date(CUTOFF.getTime() - 7 * 86400_000)) continue;
      out.push(item);
    }
  }
  const unique = [...new Map(out.map((item) => [item.url, item])).values()]
    .sort((a, b) => Date.parse(b.lastmod || 0) - Date.parse(a.lastmod || 0));
  return includeAll ? unique : unique.slice(0, 80);
}

async function discoverIndex(source) {
  const root = source.roots[0];
  const { text, finalUrl } = await fetchText(root);
  const urls = [];
  for (const match of text.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const url = normalizeUrl(match[1], finalUrl || root);
    if (url && source.includeUrl?.(url)) urls.push({ url, lastmod: '' });
  }
  return [...new Map(urls.map((item) => [item.url, item])).values()].slice(0, 80);
}

async function anthropicNewsroomDates() {
  const root = 'https://www.anthropic.com/news';
  const { text, finalUrl } = await fetchText(root);
  const base = finalUrl || root;
  const out = new Map();
  for (const match of text.matchAll(/href=["']([^"']+)["']/gi)) {
    const url = normalizeUrl(match[1], base);
    if (!/^https:\/\/www\.anthropic\.com\/(?:news\/|claude-[^/?#]+\/?$)/i.test(url)) continue;
    const snippet = text.slice(match.index, match.index + 2200);
    const time = stripHtml((snippet.match(/<time\b[^>]*>([\s\S]*?)<\/time>/i) || [])[1] || '');
    if (!time) continue;
    const parsed = new Date(`${time} UTC`);
    if (!Number.isNaN(parsed.valueOf())) out.set(url.replace(/\/$/, ''), parsed.toISOString().slice(0, 10));
  }
  return out;
}

function bingActualUrl(raw) {
  try {
    const u = new URL(decodeEntities(raw));
    const nested = u.searchParams.get('url');
    return nested ? decodeURIComponent(nested) : u.toString();
  } catch { return ''; }
}

async function discoverBingRss(source) {
  const items = [];
  for (const root of source.roots) {
    const { text } = await fetchText(root);
    for (const item of text.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
      const body = item[1];
      const title = decodeEntities((body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
      const link = bingActualUrl((body.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '');
      const date = decodeEntities((body.match(/<pubDate>([^<]+)<\/pubDate>/i) || [])[1] || '');
      const description = stripHtml((body.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '');
      if (link.startsWith('https://x.ai/news/')) items.push({ url: link, lastmod: date, prefetched: { title, description, date } });
    }
  }
  return [...new Map(items.map((item) => [item.url, item])).values()];
}

function metaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const attr of ['property', 'name', 'itemprop']) {
    const a = html.match(new RegExp(`<meta\\s+[^>]*${attr}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'));
    if (a) return decodeEntities(a[1]);
    const b = html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${escaped}["'][^>]*>`, 'i'));
    if (b) return decodeEntities(b[1]);
  }
  return '';
}

function articleFromHtml(html, url, fallbackDate = '') {
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const documentTitle = stripHtml((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const metadataTitle = metaContent(html, 'og:title') || metaContent(html, 'twitter:title') || stripHtml(h1Match?.[1] || '') || documentTitle;
  const title = STRONG_TITLE_SIGNAL.test(documentTitle) ? documentTitle : metadataTitle;
  const description = metaContent(html, 'description') || metaContent(html, 'og:description');
  const jsonDate = (html.match(/["']datePublished["']\s*:\s*["']([^"']+)/i) || [])[1] || '';
  const timeDate = (html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i) || [])[1] || '';
  const nearHeading = h1Match ? stripHtml(html.slice(h1Match.index, h1Match.index + 3500)) : '';
  const visibleDate = (nearHeading.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+20\d{2}\b/i) || [])[0]
    || (nearHeading.match(/\b20\d{2}[/-]\d{2}[/-]\d{2}\b/) || [])[0] || '';
  const datedNews = (() => {
    try {
      const match = new URL(url).pathname.match(/\/news\/news(\d{2})(\d{2})(\d{2})\/?$/i);
      return match ? `20${match[1]}-${match[2]}-${match[3]}` : '';
    } catch { return ''; }
  })();
  const date = metaContent(html, 'article:published_time') || metaContent(html, 'datePublished') || jsonDate || timeDate || datedNews || visibleDate || fallbackDate;
  return { url, title: stripHtml(title), description: stripHtml(description), date, body: stripHtml(html).slice(0, 12000) };
}

function modelNames(source, article) {
  if (source.id === 'openai') {
    let slug = '';
    try { slug = decodeURIComponent(new URL(article.url).pathname.split('/').filter(Boolean).at(-1) || ''); } catch {}
    const version = slug.match(/gpt-(\d+)-(\d+)(?:-([a-z0-9-]+))?/i);
    if (version) {
      const base = `GPT-${version[1]}.${version[2]}`;
      const tail = String(version[3] || '');
      if (tail.startsWith('mini-and-nano')) return [`${base} Mini`, `${base} Nano`];
      const suffix = (tail.match(/^(sol|instant|mini|nano|pro|turbo|live|codex)/i) || [])[1];
      return [suffix ? `${base} ${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}` : base];
    }
  }
  const haystack = `${article.title}\n${article.description}`;
  if (source.id.startsWith('qwen')) {
    const matches = [...haystack.matchAll(/\b(?:Qwen\d(?:\.\d+)*(?:-[A-Za-z0-9.]+)*|QwQ[A-Za-z0-9.-]*|QVQ[A-Za-z0-9.-]*)\b/gu)].map((m) => m[0]);
    return [...new Map(matches.map((name) => [canonical(name), name])).values()].slice(0, 6);
  }
  if (source.id === 'anthropic') {
    const matches = [...haystack.matchAll(/\b(?:Claude\s+)?(?:Opus|Sonnet|Haiku|Fable|Mythos)\s+\d+(?:\.\d+)*\b/giu)]
      .map((m) => m[0].replace(/\s+/g, ' ').trim())
      .map((name) => /^Claude\s+/i.test(name) ? name : `Claude ${name}`);
    return [...new Map(matches.map((name) => [canonical(name), name])).values()].slice(0, 3);
  }
  if (source.id.startsWith('deepseek')) {
    const matches = [...haystack.matchAll(/\bDeepSeek[-‑][A-Za-z0-9.]+(?:[-‑][A-Za-z0-9.]+){0,4}\b/giu)]
      .map((m) => m[0].replaceAll('‑', '-'));
    return [...new Map(matches.map((name) => [canonical(name), name])).values()].slice(0, 3);
  }
  if (source.id.startsWith('google-')) {
    const patterns = [
      /\bGemini\s+Robotics\s+\d+(?:\.\d+)*\b/giu,
      /\bGemini\s+Omni\s+\d+(?:\.\d+)*(?:\s+(?:Flash|Pro|Live|Preview))?\b/giu,
      /\bGemini\s+\d+(?:\.\d+)*(?:\s+(?:Flash|Pro|Live|Cyber|Transcribe)){0,2}\b/giu,
      /\b(?:Gemma|Veo|Imagen|Genie|Lyria)\s+\d+(?:\.\d+)*(?:\s+[A-Za-z][A-Za-z-]*)?\b/giu,
      /\bSL2T(?:\s*\d+(?:\.\d+)*)?\b/giu,
    ];
    const matches = patterns.flatMap((pattern) => [...haystack.matchAll(pattern)].map((m) => m[0].replace(/\s+/g, ' ').trim()));
    for (const match of haystack.matchAll(/\b(?:and|\/)\s+(\d+(?:\.\d+)*)\s+(Flash(?:\s+Cyber)?|Pro|Live|Transcribe)\b/giu)) {
      matches.push(`Gemini ${match[1]} ${match[2].replace(/\s+/g, ' ').trim()}`);
    }
    return [...new Map(matches.map((name) => [canonical(name), name])).values()].slice(0, 3);
  }
  if (source.id === 'mistral') {
    const matches = [...haystack.matchAll(/\b(?:(?:Mistral\s+(?:Large|Medium|Small|Nemo|Next|OCR)(?:\s+\d+(?:\.\d+)*)?)|(?:Codestral|Devstral|Pixtral|Voxtral|Ministral|Magistral|Mathstral|Robostral|Leanstral|Shieldstral)(?:\s+\d+(?:\.\d+)*)?)\b/giu)]
      .map((m) => m[0].replace(/\s+/g, ' ').trim());
    return [...new Map(matches.map((name) => [canonical(name), name])).values()].slice(0, 3);
  }
  const matches = [...haystack.matchAll(source.model)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  return [...new Map(matches.map((name) => [canonical(name), name])).values()].slice(0, 3);
}

function canonical(value = '') {
  return String(value).toLowerCase().normalize('NFKC').replace(/[^a-z0-9\p{Script=Han}]+/gu, '');
}

function isRecent(date) {
  const parsed = Date.parse(date || '');
  if (Number.isNaN(parsed)) return false;
  return parsed >= CUTOFF.getTime() && parsed <= NOW.getTime() + 86400_000;
}

function classifyRelease(source, article) {
  const names = modelNames(source, article);
  if (!names.length) return { accepted: false, reason: 'no-model-name', names };
  const title = article.title || '';
  const urlWords = (() => {
    try { return decodeURIComponent(new URL(article.url).pathname).replace(/[-_/]+/g, ' '); }
    catch { return ''; }
  })();
  const cleanTitle = title.replace(/\s*[|—-]\s*(?:OpenAI|Anthropic|Mistral AI|xAI|Qwen|Moonshot AI|ByteDance Seed).*$/i, '').trim();
  const titleIsModelLed = names.some((name) => {
    const lowerTitle = cleanTitle.toLowerCase();
    const lowerName = name.toLowerCase();
    return canonical(cleanTitle) === canonical(name)
      || lowerTitle.startsWith(`${lowerName}:`)
      || lowerTitle.startsWith(`${lowerName} —`)
      || lowerTitle.startsWith(`${lowerName} `);
  });
  const explicitAnnouncement = RELEASE_SIGNAL.test(title)
    || RELEASE_SIGNAL.test(urlWords)
    || STRONG_TITLE_SIGNAL.test(title)
    || (source.allowDescriptionAnnouncement && RELEASE_SIGNAL.test(article.description || ''));
  if (!explicitAnnouncement && !titleIsModelLed) return { accepted: false, reason: 'not-an-announcement-title', names };
  if (NEGATIVE_TITLE.test(title) && !STRONG_TITLE_SIGNAL.test(title)) return { accepted: false, reason: 'negative-title', names };
  if (!isRecent(article.date)) return { accepted: false, reason: 'outside-lookback', names };
  return { accepted: true, reason: 'release', names };
}

async function qwenGithubArticles(source) {
  const { text } = await fetchText(source.roots[0]);
  const repos = JSON.parse(text);
  if (!Array.isArray(repos)) throw new Error('Unexpected QwenLM repositories response');
  const repoCutoff = new Date(CUTOFF.getTime() - 14 * 86400_000);
  const candidates = repos
    .filter((repo) => /^Qwen\d/i.test(String(repo.name || '')))
    .filter((repo) => {
      const pushed = Date.parse(repo.pushed_at || repo.updated_at || '');
      return !Number.isNaN(pushed) && pushed >= repoCutoff.getTime();
    })
    .slice(0, 20);
  const out = [];
  for (const repo of candidates) {
    try {
      const branch = repo.default_branch || 'main';
      const raw = `https://raw.githubusercontent.com/QwenLM/${encodeURIComponent(repo.name)}/${encodeURIComponent(branch)}/README.md`;
      const { text: readme } = await fetchText(raw);
      const news = (readme.match(/^##\s+News\s*$([\s\S]*?)(?=^##\s|\Z)/im) || [])[1] || '';
      for (const line of news.split(/\r?\n/)) {
        const match = line.match(/^[-*]\s+(20\d{2}-\d{2}-\d{2}):\s+(.+)$/);
        if (!match) continue;
        const date = match[1];
        const body = match[2];
        if (!isRecent(date)) continue;
        const names = [...body.matchAll(/\b(?:Qwen\d(?:\.\d+)*(?:-[A-Za-z0-9.]+)*|QwQ[A-Za-z0-9.-]*|QVQ[A-Za-z0-9.-]*)\b/gu)].map((m) => m[0]);
        const uniqueNames = [...new Map(names.map((name) => [canonical(name), name])).values()];
        if (!uniqueNames.length) continue;
        if (!/(?:\b(?:release|released|open[- ]source)\b|\bavailable on (?:\[(?:Hugging Face|ModelScope)[^\]]*\]|Hugging Face|ModelScope))/iu.test(body)) continue;
        const blog = (body.match(/\[[^\]]*(?:blog|release)[^\]]*\]\((https:\/\/qwen\.ai\/blog[^)]+)\)/i) || [])[1];
        out.push({
          url: blog || `https://github.com/QwenLM/${repo.name}#news`,
          title: `${uniqueNames.join(' / ')} release`,
          description: body,
          date,
          body,
        });
      }
    } catch (error) {
      console.warn(`[model-news] qwen-github: skip ${repo.name}: ${error.message}`);
    }
  }
  return out;
}

function zhipuResearchArticles(source, html, url) {
  const out = [];
  const regex = /\\"id\\":(\d+),\\"title_zh\\":\\"([^"\\]+)\\",\\"title_en\\":(?:null|\\"([^"\\]*)\\"),\\"createAt\\":\\"([^"\\]+)\\"/g;
  for (const match of html.matchAll(regex)) {
    const [, id, titleZh, titleEn = '', date] = match;
    const title = decodeEntities(titleEn || titleZh);
    const names = [...`${titleZh} ${titleEn}`.matchAll(source.model)].map((m) => m[0]);
    if (!names.length) continue;
    out.push({
      url: `${url.replace(/\/$/, '')}/${id}`,
      title,
      description: decodeEntities(titleZh),
      date,
      body: `${decodeEntities(titleZh)} ${decodeEntities(titleEn)}`,
    });
  }
  return out;
}

function releaseNotesArticles(source, html, url) {
  const text = stripHtml(html);
  const out = [];
  const regex = /(20\d{2}[-\/]\d{2}[-\/]\d{2})([\s\S]{0,220}?)(GLM[-A-Za-z0-9.]+)/g;
  for (const match of text.matchAll(regex)) {
    const date = match[1].replaceAll('/', '-');
    const model = match[3];
    out.push({ url: `${url}#${model.toLowerCase()}`, title: `${model} release`, description: match[2].trim(), date, body: `${date} ${match[2]} ${model} 发布` });
  }
  return out;
}

function deepSeekUpdatesArticles(source, html, url) {
  const out = [];
  const sectionPattern = /<h2\b[^>]*id=["']date-(20\d{2}-\d{2}-\d{2})["'][^>]*>[\s\S]*?<\/h2>\s*<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h2\b|$)/gi;
  for (const match of html.matchAll(sectionPattern)) {
    const date = match[1];
    const heading = stripHtml(match[2]);
    const body = stripHtml(match[3]);
    const haystack = `${heading} ${body.slice(0, 1800)}`;
    const names = [...haystack.matchAll(source.model)].map((m) => m[0].replace(/\s+/g, ' ').trim());
    const uniqueNames = [...new Map(names.map((name) => [canonical(name), name])).values()];
    if (!uniqueNames.length) continue;
    if (!/\b(?:official release|release|released|launch(?:ed)?|general availability|public beta)\b|正式(?:发布|推出|上线)/iu.test(haystack)) continue;
    const model = uniqueNames[0];
    out.push({
      url: `${url}#date-${date}`,
      title: `${model} release`,
      description: body.slice(0, 800),
      date,
      body: `${heading} ${body}`,
    });
  }
  return out;
}

function normalizedModelText(value = '') {
  return String(value).normalize('NFKC').replace(/[‐‑‒–—−]/g, '-').replace(/\s+/g, ' ').trim();
}

function containsExactModelName(text, name) {
  const normalizedText = normalizedModelText(text);
  const normalizedName = normalizedModelText(name);
  const escaped = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9-])${escaped}(?![A-Za-z0-9-]|\\.\\d)`, 'iu').test(normalizedText);
}

function entryAlreadyExists(entries, article, names) {
  const articleUrl = String(article.url || '');
  const hashSensitive = /\/updates\/#date-/i.test(articleUrl);
  if (entries.some((entry) => {
    const existingUrl = String(entry.url || '');
    return hashSensitive ? existingUrl === articleUrl : existingUrl.replace(/#.*$/, '') === articleUrl.replace(/#.*$/, '');
  })) return true;
  const existing = entries.map((entry) => `${entry.content?.zh || ''} ${entry.content?.en || ''}`);
  return names.some((name) => existing.some((text) => containsExactModelName(text, name)));
}

function releaseDateIso(date) {
  const value = String(date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return NOW.toISOString();
  return parsed.toISOString();
}

function makeEntry(source, article, names) {
  const joined = names.join(' / ');
  return {
    id: randomUUID(),
    date: releaseDateIso(article.date),
    tags: ['news', 'model-release'],
    content: {
      zh: `${source.company} 发布 ${joined}。`,
      en: `${source.company} released ${joined}.`,
    },
    url: article.url,
  };
}

async function loadTimeline() {
  const raw = JSON.parse(await readFile(TIMELINE_PATH, 'utf8'));
  return { entries: Array.isArray(raw.entries) ? raw.entries : [] };
}

async function loadState() {
  try {
    const raw = JSON.parse(await readFile(STATE_PATH, 'utf8'));
    return { seenUrls: raw.seenUrls && typeof raw.seenUrls === 'object' ? raw.seenUrls : {} };
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`[model-news] state reset: ${error.message}`);
    return { seenUrls: {} };
  }
}

async function saveState(state) {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function articleFromNewUrl(source, item) {
  let rawName = '';
  try {
    const url = new URL(item.url);
    rawName = source.id === 'qwen'
      ? String(url.searchParams.get('id') || '').replace(/^qwen/i, 'Qwen')
      : decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) || '');
  } catch {}
  const title = rawName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { url: item.url, title, description: title, date: NOW.toISOString(), body: title };
}

async function inspectSource(source, state) {
  if (source.kind === 'release-notes') {
    const { text, finalUrl } = await fetchText(source.roots[0]);
    return releaseNotesArticles(source, text, finalUrl || source.roots[0]);
  }
  if (source.kind === 'qwen-github') return qwenGithubArticles(source);
  if (source.kind === 'zhipu-research') {
    const { text, finalUrl } = await fetchText(source.roots[0]);
    return zhipuResearchArticles(source, text, finalUrl || source.roots[0]);
  }
  if (source.kind === 'deepseek-updates') {
    const { text, finalUrl } = await fetchText(source.roots[0]);
    return deepSeekUpdatesArticles(source, text, finalUrl || source.roots[0]);
  }
  if (source.kind === 'sitemap-new-url' || source.kind === 'index-new-url') {
    const discovered = source.kind === 'sitemap-new-url'
      ? await discoverSitemap(source, { includeAll: true })
      : await discoverIndex(source);
    const previous = new Set(Array.isArray(state.seenUrls[source.id]) ? state.seenUrls[source.id] : []);
    state.seenUrls[source.id] = discovered.map((item) => item.url);
    // First scan establishes a baseline. Later scans only classify truly new
    // official URLs, so edited old pages cannot become fake "new releases".
    if (!previous.size) return [];
    return discovered.filter((item) => !previous.has(item.url)).map((item) => articleFromNewUrl(source, item));
  }
  const discovered = source.kind === 'sitemap' ? await discoverSitemap(source)
    : source.kind === 'index' ? await discoverIndex(source)
      : await discoverBingRss(source);
  const articles = [];
  const anthropicDates = source.id === 'anthropic' ? await anthropicNewsroomDates() : null;
  for (const item of discovered) {
    if (item.prefetched) {
      articles.push({ url: item.url, title: item.prefetched.title, description: item.prefetched.description, date: item.prefetched.date, body: `${item.prefetched.title} ${item.prefetched.description}` });
      continue;
    }
    try {
      const { text, finalUrl } = await fetchText(item.url);
      const article = articleFromHtml(text, finalUrl || item.url, item.lastmod);
      if (anthropicDates) {
        const exactDate = anthropicDates.get(String(article.url).replace(/\/$/, ''));
        if (exactDate) article.date = exactDate;
      }
      articles.push(article);
    } catch (error) {
      console.warn(`[model-news] ${source.id}: skip ${item.url}: ${error.message}`);
    }
  }
  return articles;
}

async function selfTest() {
  const cases = [
    ['openai', { title: 'Introducing GPT-5.7', description: 'We are releasing GPT-5.7 today.', date: NOW.toISOString(), body: '' }, true],
    ['openai', { title: 'GPT-5.6 in GitHub Copilot', description: 'GPT-5.6 is now available in Copilot.', date: NOW.toISOString(), body: '' }, false],
    ['openai', { title: 'GPT-OSS Model Card', description: 'Technical details and evaluations for gpt-oss.', date: NOW.toISOString(), body: '', url: 'https://openai.com/index/gpt-oss-model-card/' }, false],
    ['anthropic', { title: 'Improving Claude Fable 5 biology safeguards', description: 'We are updating safeguards.', date: NOW.toISOString(), body: '' }, false],
    ['anthropic', { title: 'Anthropic Economic Index: Insights from Claude 3.7 Sonnet', description: 'The report discusses results observed after release.', date: NOW.toISOString(), body: '' }, false],
    ['anthropic', { title: 'Introducing Claude Fable 5.1 and Claude Mythos 5.1', description: 'Today we launch two new models.', date: NOW.toISOString(), body: '' }, true],
    ['mistral', { title: 'Mistral x HUMAIN', description: 'A partnership using Mistral models.', date: NOW.toISOString(), body: '' }, false],
    ['mistral', { title: 'Introducing Shieldstral', description: 'Today we are releasing Shieldstral, our new model.', date: NOW.toISOString(), body: '' }, true],
    ['xai', { title: 'Grok 4.6 on Microsoft Foundry', description: 'Grok 4.6 is now available on Microsoft Foundry.', date: NOW.toISOString(), body: '', url: 'https://x.ai/news/grok-4-6-microsoft-foundry' }, false],
    ['xai', { title: 'Imagine Image 2.0', description: 'Introducing our new image generation model.', date: NOW.toISOString(), body: '', url: 'https://x.ai/news/grok-imagine-image-2' }, true],
    ['xai', { title: 'Imagine Video 1.5 with References', description: 'When we launched Imagine Video 1.5 last month, today it goes further with references.', date: NOW.toISOString(), body: '', url: 'https://x.ai/news/grok-imagine-video-1-5-references' }, false],
    ['meta', { title: 'Introducing Muse Spark 1.3', description: 'A new frontier model.', date: NOW.toISOString(), body: '', url: 'https://research.meta.ai/blog/introducing-muse-spark-1-3' }, true],
    ['meta', { title: 'Multimodal Intelligence of Muse Spark 1.2', description: 'Research and evaluations of Muse Spark 1.2.', date: NOW.toISOString(), body: '', url: 'https://research.meta.ai/blog/multimodal-intelligence-of-muse-spark-1-2' }, false],
    ['google-deepmind', { title: 'Gemini Omni 1.1 Flash lets you build with more control', description: 'The new Gemini Omni 1.1 Flash model is generally available.', date: NOW.toISOString(), body: '', url: 'https://deepmind.google/blog/gemini-omni-1-1-flash/' }, true],
    ['google-deepmind', { title: 'Putting sign language AI into users’ hands', description: 'Introducing SL2T, our breakthrough sign-language-to-text model.', date: NOW.toISOString(), body: '', url: 'https://deepmind.google/blog/putting-sign-language-ai-into-users-hands/' }, true],
    ['google-ai', { title: 'Introducing Gemini 3.8 Flash and 3.8 Flash Cyber', description: 'Today we release two new models.', date: NOW.toISOString(), body: '', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/' }, true],
    ['google-ai', { title: 'Gemini API Managed Agents: 3.6 Flash, hooks, and more', description: 'We are announcing new managed-agent capabilities.', date: NOW.toISOString(), body: '', url: 'https://blog.google/innovation-and-ai/technology/developers-tools/managed-agents/' }, false],
    ['bytedance-seed', { title: '一镜成片，随心参考｜Seedance 2.5 正式发布', description: 'Seedance 2.5 正式发布。', date: NOW.toISOString(), body: '' }, true],
    ['kimi', { title: 'Kimi K3: Open Frontier Intelligence', description: 'Today, we are introducing Kimi K3, our most capable model.', date: NOW.toISOString(), body: '' }, true],
  ];
  let failed = 0;
  for (const [id, article, expected] of cases) {
    const source = SOURCES.find((item) => item.id === id);
    const actual = classifyRelease(source, article).accepted;
    if (actual !== expected) { failed += 1; console.error(`FAIL ${id}: expected ${expected}, got ${actual}: ${article.title}`); }
  }
  const dedupCases = [
    ['base model is not swallowed by derived model', 'DeepSeek released DeepSeek-V4-Flash-Vision-Exp.', 'DeepSeek-V4-Flash', false],
    ['exact base model dedups', 'DeepSeek released DeepSeek-V4-Flash.', 'DeepSeek-V4-Flash', true],
    ['Unicode hyphen dedups', 'GLM‑5.3‑Flash Released.', 'GLM-5.3-Flash', true],
  ];
  for (const [label, text, name, expected] of dedupCases) {
    const actual = containsExactModelName(text, name);
    if (actual !== expected) { failed += 1; console.error(`FAIL dedup ${label}: expected ${expected}, got ${actual}`); }
  }
  const nameCases = [
    ['google-ai', { title: 'Introducing Gemini 3.8 Flash and 3.8 Flash Cyber', description: '', url: '' }, ['Gemini 3.8 Flash', 'Gemini 3.8 Flash Cyber']],
    ['google-ai', { title: 'Gemini Omni 1.1 Flash lets you build with more control', description: '', url: '' }, ['Gemini Omni 1.1 Flash']],
    ['meta', { title: 'Introducing Muse Code and Muse Spark 1.2', description: '', url: '' }, ['Muse Spark 1.2']],
    ['qwen-github', { title: 'Qwen3.8-Flash-Next release', description: 'Read more on qwen.ai.', url: '' }, ['Qwen3.8-Flash-Next']],
  ];
  for (const [id, article, expected] of nameCases) {
    const source = SOURCES.find((item) => item.id === id);
    const actual = modelNames(source, article);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failed += 1;
      console.error(`FAIL model names ${id}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  const total = cases.length + dedupCases.length + nameCases.length;
  if (failed) process.exitCode = 1; else console.log(`model-release classifier self-test: ${total}/${total} passed`);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const timeline = await loadTimeline();
  const state = await loadState();
  const additions = [];
  let healthySources = 0;
  for (const source of SOURCES) {
    try {
      const articles = await inspectSource(source, state);
      healthySources += 1;
      let accepted = 0;
      for (const article of articles) {
        const verdict = classifyRelease(source, article);
        if (!verdict.accepted) continue;
        if (entryAlreadyExists([...timeline.entries, ...additions], article, verdict.names)) continue;
        additions.push(makeEntry(source, article, verdict.names));
        accepted += 1;
      }
      console.log(`[model-news] ${source.company}: checked ${articles.length}, new releases ${accepted}`);
    } catch (error) {
      console.warn(`[model-news] ${source.company}: source failed: ${error.message}`);
    }
  }
  if (!healthySources) throw new Error('All model-news sources failed');
  await saveState(state);
  if (!additions.length) {
    console.log(`[model-news] no new model releases in the last ${LOOKBACK_DAYS} days`);
    return;
  }
  timeline.entries.unshift(...additions.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)));
  await writeFile(TIMELINE_PATH, JSON.stringify(timeline, null, 2) + '\n');
  console.log(`[model-news] added ${additions.length} timeline entr${additions.length === 1 ? 'y' : 'ies'}:`);
  for (const entry of additions) console.log(`  - ${entry.date.slice(0, 10)} ${entry.content.en} ${entry.url}`);
}

await main();
