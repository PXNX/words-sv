// One-off helper: appends a story snippet file to the end of `germanStories.ts`,
// replacing the closing `];` line.
// Run with `bun scripts/story-generation/append_stories.ts <stories file> <snippet file>`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));

const filePath = process.argv[2];
const storiesPath = process.argv[3];
if (!filePath || !storiesPath) {
  throw new Error('usage: bun append_stories.ts <stories file> <snippet file>');
}

const content = readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
// Remove the trailing "];" line (the last line).
if (lines[lines.length - 1] === '];') {
  lines.pop();
}
const stories = readFileSync(storiesPath, 'utf8');
lines.push(stories);
lines.push('];');
writeFileSync(filePath, lines.join('\n'));
console.log('Appended successfully, new line count:', lines.length);
