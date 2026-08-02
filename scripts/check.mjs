import { access, readFile } from 'node:fs/promises';

const files = [
  'index.html',
  'styles.css',
  'script.js',
  'posts/why-agents-rarely-rollback.html',
];

const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')));
const [home, styles, script, article] = contents;
await access('assets/parchment-surface.webp');

const assertions = [
  [home.includes('data-filter="tech"'), 'Technology filter is missing'],
  [home.includes('data-filter="personal"'), 'Personal filter is missing'],
  [home.includes('/posts/why-agents-rarely-rollback.html'), 'Featured article link is missing'],
  [home.includes('/styles.css?v=20260802-3') && home.includes('/script.js?v=20260802-3') && article.includes('/styles.css?v=20260802-3') && article.includes('/script.js?v=20260802-3'), 'Versioned static assets are missing'],
  [styles.includes('@media (max-width: 680px)'), 'Mobile styles are missing'],
  [styles.includes('overflow-x: clip;') && styles.includes('overscroll-behavior-x: none;') && styles.includes('touch-action: pan-y;'), 'Horizontal viewport locking is missing'],
  [styles.includes('top: 24px;') && styles.includes('background: transparent;') && styles.includes('z-index: 2;'), 'Plain sticky table-of-contents styling is missing'],
  [script.includes('readingProgress.style.width') && script.includes('window.requestAnimationFrame(updateReadingProgress)') && !script.includes('readingProgress.style.transform'), 'Frame-synchronized reading progress updates are missing'],
  [!styles.includes('linear-gradient'), 'Gradient styling should not be used'],
  [styles.includes('--paper: #f2dfb5;') && styles.includes('--parchment-card: #f7e4b8;'), 'Bright light parchment palette is missing'],
  [styles.includes('background-blend-mode: soft-light;') && styles.includes('html[data-theme="dark"] body[data-page="article"]'), 'Light-only soft texture blending is missing'],
  [script.includes('localStorage'), 'Theme persistence is missing'],
  [article.includes('class="prose"'), 'Article reading layout is missing'],
  [article.includes('data-article-style="editorial"'), 'Editorial article style should be the default'],
  [article.includes('class="article-style-toggle"'), 'Article style toggle is missing'],
  [script.includes('xycdev-blog-article-style') && script.includes('applyArticleStyle'), 'Persistent article style switching is missing'],
  [!article.includes('class="article-paper-stack"'), 'Stacked parchment wrapper should be removed'],
  [article.includes('article-return-top') && article.includes('article-return-bottom'), 'Article return links are missing'],
  [styles.includes('/assets/parchment-surface.webp'), 'Parchment fiber texture is missing'],
  [!styles.includes('/assets/parchment-patina.webp'), 'Water-stain patina should not be used'],
  [styles.includes('.article-paper::before') && styles.includes('feTurbulence'), 'Procedural crumple texture is missing'],
  [!styles.includes('.article-paper-stack'), 'Layered upper parchment CSS should be removed'],
  [styles.includes('0 28px 0 var(--parchment-card-layer-deep)'), 'Heavy lower parchment thickness is missing'],
  [styles.includes("surfaceScale='31'"), 'Pronounced crumple relief is missing'],
  [styles.includes('--article-paper-shape: polygon(') && styles.includes('clip-path: var(--article-paper-shape)'), 'Irregular parchment card edges are missing'],
  [styles.includes('0.72% 0%, 99.28% 0%') && styles.includes('0.72% 100%'), 'Straight horizontal parchment edges are missing'],
  [styles.includes('98.9% 29.82%') && styles.includes('98.76% 43.62%') && styles.includes('1.34% 29.82%') && styles.includes('1.04% 43.62%'), 'Varied narrow parchment edge widths are missing'],
  [styles.includes('border-top-width: 0;') && styles.includes('border-top: 2px solid rgba(255, 249, 226, 0.52);'), 'Single light parchment top edge is missing'],
  [styles.includes('html[data-article-style="editorial"] .article-paper') && styles.includes('clip-path: none;') && styles.includes('box-shadow: none;'), 'No-card editorial article theme is missing'],
  [styles.includes('body > header') && styles.includes('body > main'), 'Parchment content stacking is missing'],
  [!styles.includes('/assets/paper-distress.webp'), 'Obsolete distress overlay remains'],
  [styles.includes('grid-template-columns: minmax(0, 860px) minmax(150px, 180px)'), 'Right-side article contents layout is missing'],
  [styles.includes('p:first-child::first-letter'), 'Manuscript drop cap is missing'],
  [!styles.includes('box-shadow:\n    0 22px 54px'), 'Obsolete article card shadow remains'],
  [!styles.includes('.article-back'), 'Obsolete floating back button styles remain'],
];

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message);
}

console.log(`Checked ${files.length} files: OK`);
