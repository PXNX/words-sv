// One-off helper: writes `unused_words.json` — per level, the words no story uses yet.
// Run with `bun scripts/story-generation/compute_unused.ts`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
process.chdir(join(here, '..', '..'));

const content = readFileSync('src/lib/story/germanStories.ts', 'utf8');

const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const used: Record<string, Set<string>> = {};
levels.forEach((l) => { used[l] = new Set<string>(); });

let currentLevel: string | null = null;
// Process line by line
const lines = content.split(/\r?\n/);
for (const line of lines) {
  const levelMatch = line.match(/level:\s*'([a-z0-9]+)'/);
  if (levelMatch) {
    currentLevel = levelMatch[1] ?? null;
  }
  // Find german('...') strings; handle escaped quotes? just simple
  const regex = /german\('([^']*)'\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (currentLevel !== null && levels.includes(currentLevel)) {
      const text = m[1] ?? '';
      const words = text.toLowerCase().match(/[a-zäöüß]+/g) ?? [];
      const bucket = used[currentLevel];
      words.forEach((w) => bucket?.add(w));
    }
  }
}

// Read vocabulary files for de
const vocabDir = 'src/lib/data';
const vocab: Record<string, Set<string>> = {};
levels.forEach((l) => {
  const data = JSON.parse(readFileSync(`${vocabDir}/de.${l}.json`, 'utf8')) as Record<string, unknown>;
  vocab[l] = new Set(Object.keys(data));
});

levels.forEach((l) => {
  const vocabWords = vocab[l] ?? new Set<string>();
  const usedWords = used[l] ?? new Set<string>();
  const unused: string[] = [];
  vocabWords.forEach((w) => {
    const lower = w.toLowerCase();
    if (!usedWords.has(lower)) unused.push(w);
  });
  console.log(`Level ${l}: vocab size=${vocabWords.size}, used=${usedWords.size}, unused=${unused.length}`);
  // Show first 50 unused
  console.log(unused.slice(0, 50).join(', '));
});
