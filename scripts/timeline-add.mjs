import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const values = (flag) => {
  const out = [];
  args.forEach((arg, index) => { if (arg === flag && args[index + 1]) out.push(args[index + 1]); });
  return out;
};

if (args.includes('--help') || args.length === 0) {
  console.log(`Usage:\n  npm run timeline:add -- --tag thought --text "突然想到……"\n\nOptions:\n  --tag <tag>       Repeatable. Common: idea, news, thought, musing, note, update, link, observation\n  --text <text>     Chinese/default text (required)\n  --text-en <text>  Optional English text\n  --date <ISO>      Optional ISO datetime; defaults to now\n  --url <url>       Optional related link\n`);
  process.exit(args.length === 0 ? 1 : 0);
}

const text = value('--text');
const tags = values('--tag');
if (!text) throw new Error('--text is required');
if (!tags.length) throw new Error('at least one --tag is required');

const file = new URL('../content/timeline.json', import.meta.url);
const data = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(data.entries)) data.entries = [];
const now = value('--date') || new Date().toISOString();
const textEn = value('--text-en');
const entry = {
  id: randomUUID(),
  date: now,
  tags: [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
  content: textEn ? { zh: text, en: textEn } : { zh: text, en: text },
};
const url = value('--url');
if (url) entry.url = url;
data.entries.push(entry);
await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added timeline entry ${entry.id} [${entry.tags.join(', ')}] at ${entry.date}`);
