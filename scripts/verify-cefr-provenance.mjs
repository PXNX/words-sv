import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const provenance = JSON.parse(await readFile(resolve(projectRoot, 'cefr-vocabulary-provenance.json'), 'utf8'));
let valid = true;

for (const language of ['de', 'en']) {
  for (const level of levels) {
    const words = JSON.parse(await readFile(resolve(projectRoot, 'src', 'lib', 'data', `words.${language}.${level}.json`), 'utf8'));
    const entries = provenance.levels[level][language];
    const missing = words.filter((word) => !entries.some((entry) => entry.word === word));
    console.log(`${language}.${level}: words=${words.length} provenance=${entries.length} missing=${missing.length}`);
    if (missing.length > 0) {
      valid = false;
      console.error(`${language}.${level} missing provenance: ${missing.join(', ')}`);
    }
  }
}

if (!valid) process.exitCode = 1;
