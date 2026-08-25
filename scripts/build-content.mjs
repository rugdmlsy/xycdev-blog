import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, escapeHtml, escapeAttr, extractH2, markdownToHtml, readPostsData } from './content-lib.mjs';

const { posts } = await readPostsData();
posts.sort((a, b) => b.date.localeCompare(a.date));
await mkdir(path.join(ROOT, 'posts'), { recursive: true });

function pair(copy, tag = 'span', className = '') {
  const cls = className ? ` class="${escapeAttr(className)}"` : '';
  return `<${tag}${cls} data-language-copy="zh">${escapeHtml(copy.zh || copy.en || '')}</${tag}><${tag}${cls} data-language-copy="en" hidden>${escapeHtml(copy.en || copy.zh || '')}</${tag}>`;
}
function categoryLabel(category) { return category === 'personal' ? { zh: '个人', en: 'Personal' } : { zh: '技术', en: 'Technology' }; }
function categoryClass(category) { return category === 'personal' ? 'personal' : 'tech'; }
function displayDate(date) { return date.replaceAll('-', '.'); }
function shortDate(date) { return `${date.slice(5, 7)}.${date.slice(8, 10)}`; }
function renderTags(tags) { return tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join(''); }

function renderToc(markdown, language) {
  const h2 = extractH2(markdown);
  if (!h2.length) return '';
  return `<div data-language-copy="${language}"${language === 'en' ? ' hidden' : ''}>${h2.map(({ text, id }) => `<a href="#${escapeAttr(id)}">${escapeHtml(text)}</a>`).join('')}</div>`;
}

function renderArticle(post) {
  const cat = categoryClass(post.category);
  const catLabel = categoryLabel(post.category);
  const tags = [...new Set(post.tags)];
  const metaTags = [...new Set(post.timelineTags)].join(',');
  const bodyZh = markdownToHtml(post.body.zh);
  const bodyEn = markdownToHtml(post.body.en);
  const tocZh = renderToc(post.body.zh, 'zh');
  const tocEn = renderToc(post.body.en, 'en');
  return `<!doctype html>
<html lang="zh-CN" data-theme="light" data-language="zh" data-article-style="editorial">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(post.timelineSummary.zh || post.summary.zh)}">
  <meta name="timeline-tags" content="${escapeAttr(metaTags)}">
  <meta name="timeline-title-en" content="${escapeAttr(post.title.en)}">
  <meta name="timeline-summary-en" content="${escapeAttr(post.timelineSummary.en || post.summary.en)}">
  <meta name="theme-color" content="#f3efe6">
  <title>${escapeHtml(post.title.zh)} — xycdev journal</title>
  <link rel="stylesheet" href="/styles.css?v=20260825-2">
  <script src="/script.js?v=20260825-2" defer></script>
</head>
<body data-page="article" data-post-slug="${escapeAttr(post.slug)}">
  <div class="reading-progress" aria-hidden="true"><span></span></div>
  <a class="skip-link" href="#article" data-i18n="common.skip">跳到正文</a>
  <header class="site-header">
    <a class="site-name" href="/" aria-label="xycdev journal 首页" data-i18n-aria="common.homeAria"><span class="site-name-main">xycdev</span><span class="site-name-sub">journal</span></a>
    <nav class="site-nav" aria-label="主要导航" data-i18n-aria="common.primaryNav">
      <a class="is-current" href="/" data-i18n="nav.writing">文章</a><a href="/timeline.html" data-i18n="nav.timeline">时间线</a><a href="/#about" data-i18n="nav.about">关于</a><a href="https://xycdev.com" data-i18n="nav.mainSite">主站 ↗</a>
    </nav>
    <div class="header-controls"><button class="language-toggle" type="button" aria-label="Switch to English"><span class="language-toggle-label">EN</span></button><button class="theme-toggle" type="button" aria-label="切换深浅色主题" data-i18n-aria="theme.toggleAria"><span aria-hidden="true">◐</span><span class="theme-toggle-label">深色</span></button></div>
  </header>
  <main id="article" class="article-shell">
    <div class="article-return article-return-top"><a href="/" data-i18n-aria="common.backList"><span aria-hidden="true">←</span> <span data-i18n="common.back">返回</span></a></div>
    <header class="article-header">
      <p class="article-breadcrumb"><a href="/" data-i18n="nav.writing">文章</a> / ${pair(catLabel)} / ${escapeHtml(post.slug)}</p>
      <span class="category category-${cat}">${pair(catLabel)}</span>
      <h1>${pair(post.title)}</h1>
      ${pair(post.summary, 'p', 'article-deck')}
      <div class="article-info"><time datetime="${post.date}">${displayDate(post.date)}</time><span data-language-copy="zh">${post.readMinutes.zh} 分钟阅读</span><span data-language-copy="en" hidden>${post.readMinutes.en} min read</span>${renderTags(tags)}</div>
    </header>
    <div class="article-layout">
      <aside class="article-toc" aria-label="文章目录" data-i18n-aria="article.tocAria"><strong data-i18n="article.toc">目录</strong>${tocZh}${tocEn}</aside>
      <article class="prose">
        <div class="article-paper"><div data-language-copy="zh">${bodyZh}</div><div data-language-copy="en" hidden>${bodyEn}</div><div class="article-end"><a class="text-link" href="/"><span aria-hidden="true">←</span> <span data-i18n="common.backList">返回文章列表</span></a></div></div>
        <section class="engagement giscus-section" aria-labelledby="engagement-title"><div class="engagement-heading"><div><p class="engagement-kicker" data-i18n="engagement.kicker">读者反馈</p><h2 id="engagement-title" data-i18n="engagement.title">评论</h2></div></div><p class="giscus-note" data-i18n="engagement.giscusNote">评论由 GitHub Discussions 与 Giscus 提供。发表评论需要登录 GitHub。</p><div class="giscus"></div></section>
      </article>
    </div>
    <div class="article-return article-return-bottom"><a href="/" data-i18n-aria="common.backList"><span aria-hidden="true">←</span> <span data-i18n="common.backList">返回文章列表</span></a></div>
  </main>
  <footer class="site-footer"><div><strong>xycdev journal</strong><span data-i18n="footer.categories">技术与个人</span></div><p>© 2026 xycdev</p><div class="footer-links"><a href="/feed.xml">RSS</a><a href="/timeline.html" data-i18n="nav.timeline">时间线</a><a href="#article" data-i18n="common.backTop">回到顶部 ↑</a></div></footer>
</body>
</html>\n`;
}

for (const post of posts) await writeFile(path.join(ROOT, 'posts', `${post.slug}.html`), renderArticle(post));

let home = await readFile(path.join(ROOT, 'index.html'), 'utf8');
const featured = posts.find((post) => post.featured) || posts[0];
const featuredMarkup = featured ? `<!-- FEATURED:START -->
    <section class="featured" aria-labelledby="featured-title"><div class="featured-label" data-i18n="home.featured">置顶文章</div><article class="featured-card"><div class="featured-meta"><span class="category category-${categoryClass(featured.category)}">${pair(categoryLabel(featured.category))}</span><time datetime="${featured.date}">${displayDate(featured.date)}</time><span data-language-copy="zh">${featured.readMinutes.zh} 分钟阅读</span><span data-language-copy="en" hidden>${featured.readMinutes.en} min read</span></div><h2 id="featured-title"><a href="/posts/${escapeAttr(featured.slug)}.html">${pair(featured.title)}</a></h2>${pair(featured.summary, 'p', 'featured-summary')}<a class="text-link" href="/posts/${escapeAttr(featured.slug)}.html"><span data-i18n="common.readMore">阅读全文</span> <span aria-hidden="true">→</span></a></article></section>
    <!-- FEATURED:END -->` : `<!-- FEATURED:START --><!-- FEATURED:END -->`;
home = home.replace(/<!-- FEATURED:START -->[\s\S]*?<!-- FEATURED:END -->/, featuredMarkup);
const rows = posts.map((post) => `<article class="post-row" data-category="${categoryClass(post.category)}" data-year="${post.date.slice(0,4)}"><div class="post-date"><time datetime="${post.date}">${shortDate(post.date)}</time><span>${post.date.slice(0,4)}</span></div><div class="post-main"><div class="post-meta"><span class="category category-${categoryClass(post.category)}">${pair(categoryLabel(post.category))}</span>${post.tags.map((tag)=>`<span>${escapeHtml(tag)}</span>`).join('')}</div><h3><a href="/posts/${escapeAttr(post.slug)}.html">${pair(post.title)}</a></h3><div class="post-summary">${pair(post.summary,'p')}</div></div><span class="post-arrow" aria-hidden="true">↗</span></article>`).join('\n          ');
const listMarkup = `<!-- POSTS:START -->\n        <div class="post-list" aria-live="polite">\n          ${rows}\n        </div>\n        <!-- POSTS:END -->`;
home = home.replace(/<!-- POSTS:START -->[\s\S]*?<!-- POSTS:END -->/, listMarkup);
await writeFile(path.join(ROOT, 'index.html'), home);

const rssItems = posts.map((post) => `<item><title>${escapeHtml(post.title.zh)}</title><link>https://blog.xycdev.com/posts/${escapeAttr(post.slug)}.html</link><guid>https://blog.xycdev.com/posts/${escapeAttr(post.slug)}.html</guid><pubDate>${new Date(`${post.date}T00:00:00+08:00`).toUTCString()}</pubDate><description>${escapeHtml(post.summary.zh)}</description></item>`).join('');
await writeFile(path.join(ROOT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0"><channel><title>xycdev journal</title><link>https://blog.xycdev.com/</link><description>Blog description placeholder.</description><language>zh-CN</language>${rssItems}</channel></rss>\n`);
console.log(`Generated ${posts.length} post page(s), home post blocks, and RSS.`);
