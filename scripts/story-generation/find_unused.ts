// One-off helper: prints, per level, the words the level's stories never mention.
// Run with `bun scripts/story-generation/find_unused.ts`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));

const content = readFileSync('src/lib/story/germanStories.ts', 'utf8');
const vocabDir = 'src/lib/data';
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

// Collect all german('...') strings per level by scanning lines with level tracking.
const lines = content.split(/\r?\n/);
const textsByLevel: Record<string, string[]> = {};
levels.forEach((l) => { textsByLevel[l] = []; });
let currentLevel: string | null = null;
for (const line of lines) {
  const levelMatch = line.match(/level:\s*'([a-z0-9]+)'/);
  if (levelMatch) {
    currentLevel = levelMatch[1] ?? null;
  }
  const regex = /german\('([^']*)'\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (currentLevel !== null && levels.includes(currentLevel)) {
      textsByLevel[currentLevel]?.push(m[1] ?? '');
    }
  }
}

// For each level, find vocabulary words whose lowercase form appears exactly in any text string of that level.
levels.forEach((l) => {
  const vocabData = JSON.parse(readFileSync(`${vocabDir}/de.${l}.json`, 'utf8')) as Record<string, unknown>;
  const vocabWords = Object.keys(vocabData);
  const texts = (textsByLevel[l] ?? []).join(' ');
  const lowerTexts = texts.toLowerCase();
  const unused = vocabWords.filter((w) => {
    const re = new RegExp(`\\b${w.toLowerCase()}\\b`);
    return !re.test(lowerTexts);
  });
  console.log(`=== Level ${l} === vocab=${vocabWords.length} unused=${unused.length}`);
  console.log(unused.slice(0, 30).join(', '));
});
