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
  [styles.includes('@media (max-width: 680px)'), 'Mobile styles are missing'],
  [!styles.includes('linear-gradient'), 'Gradient styling should not be used'],
  [script.includes('localStorage'), 'Theme persistence is missing'],
  [article.includes('class="prose"'), 'Article reading layout is missing'],
  [article.includes('article-return-top') && article.includes('article-return-bottom'), 'Article return links are missing'],
  [styles.includes('/assets/parchment-surface.webp'), 'Parchment sheet texture is missing'],
  [styles.includes('body::before'), 'Continuous parchment sheet is missing'],
  [styles.includes('body > header') && styles.includes('body > main'), 'Parchment content stacking is missing'],
  [!styles.includes('/assets/paper-distress.webp'), 'Obsolete distress overlay remains'],
  [styles.includes('grid-template-columns: minmax(0, 810px) minmax(150px, 180px)'), 'Right-side article contents layout is missing'],
  [styles.includes('p:first-child::first-letter'), 'Manuscript drop cap is missing'],
  [!styles.includes('box-shadow:\n    0 22px 54px'), 'Obsolete article card shadow remains'],
  [!styles.includes('.article-back'), 'Obsolete floating back button styles remain'],
];

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message);
}

console.log(`Checked ${files.length} files: OK`);
