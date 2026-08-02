import { access, readFile } from 'node:fs/promises';

const files = ['index.html', 'styles.css', 'script.js', 'posts/placeholder.html'];
const [home, styles, script, article] = await Promise.all(files.map((file) => readFile(file, 'utf8')));
await access('assets/parchment-surface.webp');

const assertions = [
  [home.includes('/posts/placeholder.html'), 'Placeholder article link is missing'],
  [!home.includes('SWE-Replay') && !home.includes('Rollback 后') && !article.includes('Coding Agent'), 'Old sample content remains'],
  [home.includes('data-year="2026"') && home.includes('class="archive-list"'), 'Functional archive markup is missing'],
  [script.includes('data-archive-year') && script.includes('applyPostFilters'), 'Archive filtering logic is missing'],
  [script.includes('Intl.DateTimeFormat') && home.includes('class="now-updated"'), 'Localized Now update date is missing'],
  [article.includes('class="giscus"') && script.includes("repo: 'rugdmlsy/xycdev-blog'") && script.includes("'repo-id': 'R_kgDOTqxEFA'") && script.includes("'category-id': 'DIC_kwDOTqxEFM4DCf0F'"), 'Giscus configuration is missing'],
  [script.includes('updateGiscus') && script.includes('dark_dimmed'), 'Giscus theme and language synchronization is missing'],
  [home.includes('/styles.css?v=20260802-7') && article.includes('/script.js?v=20260802-7'), 'Versioned production assets are missing'],
  [styles.includes('overflow-x: clip;') && styles.includes('touch-action: pan-y;'), 'Horizontal viewport locking is missing'],
  [script.includes('articleContent.getBoundingClientRect().bottom'), 'Article-bounded reading progress is missing'],
  [!styles.includes('linear-gradient'), 'Gradient styling should not be used'],
];
for (const [condition, message] of assertions) if (!condition) throw new Error(message);
console.log(`Checked ${files.length} files: OK`);
