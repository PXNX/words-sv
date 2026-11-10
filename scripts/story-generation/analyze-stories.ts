// One-off helper: counts how many German vocabulary words the stories already use.
// Run with `bun scripts/story-generation/analyze-stories.ts`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));

const content = readFileSync('src/lib/story/stories.ts', 'utf8');
// Find German text fragments
const regex = /de:[\s]*'([^']+?)'/g;
const texts: string[] = [];
let match: RegExpExecArray | null;
while ((match = regex.exec(content)) !== null) {
  texts.push(match[1] ?? '');
}
console.log('Total German fragments:', texts.length);
console.log('Sample:', texts.slice(0, 5));

// Extract vocabulary from level files and check which appear in stories
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
for (const l of levels) {
  const vocab = JSON.parse(readFileSync(`src/lib/data/de.${l}.json`, 'utf8')) as Record<string, unknown>;
  const words = Object.keys(vocab);
  const used = words.filter((w) => texts.some((t) => t.toLowerCase().includes(w.toLowerCase())));
  console.log(`${l}: total=${words.length} used=${used.length} unused=${words.length - used.length}`);
  // Show some unused words
  const unused = words.filter((w) => !used.includes(w));
  if (unused.length > 0) {
    console.log(`  Unused sample: ${unused.slice(0, 8).join(', ')}`);
  }
}
