// One-off helper: prints how many of a level's still-unused words each generated snippet uses.
// Run with `bun scripts/story-generation/check_snippet.ts`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
process.chdir(join(here, '..', '..'));

const unused = JSON.parse(readFileSync(join(here, 'unused_words.json'), 'utf8')) as Record<string, string[]>;

function check(file: string, level: string): void {
  const text = readFileSync(file, 'utf8');
  const blocks = text.split('  {');
  const words = unused[level] ?? [];
  blocks.forEach((block, i) => {
    if (!block.trim()) return;
    const lower = block.toLowerCase();
    const used = words.filter((w) => {
      const re = new RegExp(`\\b${w.toLowerCase()}\\b`);
      return re.test(lower);
    });
    const id = block.match(/id: '[^']+'/);
    console.log(file, i, id ? id[0] : 'none', 'used words:', used.length, 'first 12:', used.slice(0, 12));
  });
}

['snippet_a2.txt', 'snippet_b1.txt', 'snippet_b2.txt', 'snippet_c1.txt', 'snippet_c2.txt'].forEach((f) => {
  check(join(here, f), f.replace('snippet_', '').replace('.txt', ''));
});
