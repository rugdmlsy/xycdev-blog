import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.pages-dist');
const PUBLIC_FILES = [
  'index.html',
  'timeline.html',
  '404.html',
  'styles.css',
  'script.js',
  'feed.xml',
  'giscus-light.css',
  'giscus-dark.css',
];
const PUBLIC_DIRS = ['assets', 'posts'];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const file of PUBLIC_FILES) await cp(path.join(ROOT, file), path.join(OUT, file));
for (const dir of PUBLIC_DIRS) {
  const source = path.join(ROOT, dir);
  if (await stat(source).catch(() => null)) await cp(source, path.join(OUT, dir), { recursive: true });
}

async function summarize(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await summarize(full);
      files += nested.files;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += (await stat(full)).size;
    }
  }
  return { files, bytes };
}

const summary = await summarize(OUT);
console.log(`Prepared .pages-dist with ${summary.files} files (${(summary.bytes / 1024).toFixed(1)} KiB).`);
