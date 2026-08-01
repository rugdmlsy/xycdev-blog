import { readFile } from 'node:fs/promises';

const files = [
  'index.html',
  'styles.css',
  'script.js',
  'posts/why-agents-rarely-rollback.html',
];

const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')));
const [home, styles, script, article] = contents;

const assertions = [
  [home.includes('data-filter="tech"'), 'Technology filter is missing'],
  [home.includes('data-filter="personal"'), 'Personal filter is missing'],
  [home.includes('/posts/why-agents-rarely-rollback.html'), 'Featured article link is missing'],
  [styles.includes('@media (max-width: 680px)'), 'Mobile styles are missing'],
  [!styles.includes('linear-gradient'), 'Gradient styling should not be used'],
  [script.includes('localStorage'), 'Theme persistence is missing'],
  [article.includes('class="prose"'), 'Article reading layout is missing'],
];

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message);
}

console.log(`Checked ${files.length} files: OK`);
