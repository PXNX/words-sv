// How much of each level's vocabulary has a picture (src/lib/learn/pictures.ts).
// Usage: bun scripts/picture-coverage.ts [--missing] [--json]
// `--missing` also lists the nouns without a picture, the candidates worth adding next.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hasPictures, pictureFor } from '../src/lib/learn/pictures';

type Entry = { type?: string };
const data = join(import.meta.dirname, '../src/lib/data');
const listMissing = process.argv.includes('--missing');
const rows: { pack: string; words: number; pictured: number; nouns: number; picturedNouns: number; missing: string[] }[] = [];

for (const file of readdirSync(data).sort()) {
  const match = /^([a-z]{2})\.([a-c][12])\.json$/u.exec(file);
  if (!match || !hasPictures(match[1]!)) continue;
  const pack = JSON.parse(readFileSync(join(data, file), 'utf8')) as Record<string, Entry>;
  const words = Object.keys(pack);
  const nouns = words.filter((word) => pack[word]?.type === 'noun');
  rows.push({
    pack: `${match[1]}.${match[2]}`,
    words: words.length,
    pictured: words.filter((word) => pictureFor(match[1]!, word)).length,
    nouns: nouns.length,
    picturedNouns: nouns.filter((word) => pictureFor(match[1]!, word)).length,
    missing: nouns.filter((word) => !pictureFor(match[1]!, word))
  });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows.map(({ missing, ...row }) => (listMissing ? { ...row, missing } : row)), null, 2));
} else {
  const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %`.padStart(5) : '    –');
  console.log('pack    words  pictured        nouns  pictured');
  for (const row of rows) {
    console.log(`${row.pack.padEnd(7)} ${String(row.words).padStart(5)}  ${String(row.pictured).padStart(4)} ${percent(row.pictured, row.words)}   ${String(row.nouns).padStart(5)}  ${String(row.picturedNouns).padStart(4)} ${percent(row.picturedNouns, row.nouns)}`);
    if (listMissing && row.missing.length) console.log(`        without a picture: ${row.missing.join(', ')}`);
  }
}
