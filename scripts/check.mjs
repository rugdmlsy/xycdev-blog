import { access, readFile } from 'node:fs/promises';

const files = ['index.html', 'timeline.html', 'styles.css', 'script.js', 'posts/placeholder.html', '404.html', 'giscus-light.css', 'giscus-dark.css', 'content/timeline.json', 'scripts/build-timeline.mjs', 'scripts/timeline-add.mjs'];
const [home, timeline, styles, script, article, notFound, giscusLight, giscusDark, timelineData, timelineBuilder, timelineAdd] = await Promise.all(files.map((file) => readFile(file, 'utf8')));
await access('assets/parchment-surface.webp');

const parsedTimeline = JSON.parse(timelineData);
const assertions = [
  [home.includes('/posts/placeholder.html'), 'Placeholder article link is missing'],
  [!home.includes('SWE-Replay') && !home.includes('Rollback 后') && !article.includes('Coding Agent'), 'Old sample content remains'],
  [notFound.includes('<meta name="robots" content="noindex">') && notFound.includes('页面不存在'), 'Dedicated 404 page is missing'],
  [home.includes('data-year="2026"') && home.includes('class="archive-list"'), 'Functional archive markup is missing'],
  [script.includes('data-archive-year') && script.includes('applyPostFilters'), 'Archive filtering logic is missing'],
  [script.includes('Intl.DateTimeFormat') && home.includes('class="now-updated"'), 'Localized Now update date is missing'],
  [article.includes('class="giscus"') && script.includes("repo: 'rugdmlsy/xycdev-blog'") && script.includes("'repo-id': 'R_kgDOTqxEFA'") && script.includes("'category-id': 'DIC_kwDOTqxEFM4DCf0F'"), 'Giscus configuration is missing'],
  [script.includes('updateGiscus') && script.includes('giscus-dark.css') && script.includes('giscus-light.css'), 'Custom Giscus theme synchronization is missing'],
  [giscusLight.includes('--color-canvas-default: #f3efe6') && giscusLight.includes('background-image: url("https://blog.xycdev.com/assets/parchment-surface.webp")') && giscusLight.includes('background-blend-mode: soft-light') && giscusLight.includes('.gsc-reactions-popover') && giscusLight.includes('--color-accent-fg: #98463a'), 'Giscus light palette is missing'],
  [giscusDark.includes('--color-canvas-default: #1b1b19') && giscusDark.includes('background-image: url("https://blog.xycdev.com/assets/parchment-surface.webp")') && giscusDark.includes('background-blend-mode: multiply') && giscusDark.includes('--color-accent-fg: #cf7a6e'), 'Giscus dark palette is missing'],
  [home.includes('/styles.css?v=20260825-1') && article.includes('/script.js?v=20260825-1') && timeline.includes('/script.js?v=20260825-1'), 'Versioned production assets are missing'],
  [styles.includes('overflow-x: clip;') && styles.includes('touch-action: pan-y;'), 'Horizontal viewport locking is missing'],
  [script.includes('articleContent.getBoundingClientRect().bottom'), 'Article-bounded reading progress is missing'],
  [!styles.includes('linear-gradient'), 'Gradient styling should not be used'],
  [home.includes('href="/timeline.html"') && article.includes('href="/timeline.html"'), 'Timeline navigation is missing from existing pages'],
  [timeline.includes('data-page="timeline"') && timeline.includes('<!-- TIMELINE:START -->') && timeline.includes('<!-- TIMELINE:END -->'), 'Timeline page or generator markers are missing'],
  [timeline.includes('data-timeline-filter="blog"') && timeline.includes('data-timeline-tags="blog tech"'), 'Discovered blog post is missing from timeline'],
  [timelineBuilder.includes("['blog', ...extraTags]") && timelineBuilder.includes("walkHtml(POSTS_DIR)"), 'Automatic blog-post discovery is missing'],
  [Array.isArray(parsedTimeline.entries), 'Manual timeline data must contain an entries array'],
  [timelineAdd.includes("--tag") && timelineAdd.includes("--text"), 'Manual timeline helper is missing required CLI fields'],
  [script.includes('applyTimelineFilter') && script.includes('data-language-copy') && script.includes('updateTimelineDates'), 'Timeline filtering/localization logic is missing'],
  [styles.includes('.timeline-entry') && styles.includes('body[data-page="timeline"]'), 'Timeline styling is missing'],
];
for (const [condition, message] of assertions) if (!condition) throw new Error(message);
console.log(`Checked ${files.length} files: OK`);
