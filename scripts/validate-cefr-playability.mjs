import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

function inventory(word) {
  return [...word].reduce((counts, letter) => ({ ...counts, [letter]: (counts[letter] ?? 0) + 1 }), {});
}

function canSpell(word, letters) {
  const available = inventory(letters.join(''));
  return Object.entries(inventory(word)).every(([letter, count]) => (available[letter] ?? 0) >= count);
}

function validPool(words) {
  return [...new Set(words.map((word) => word.trim().toUpperCase()))].filter((word) => /^[A-ZÄÖÜẞ]{3,8}$/.test(word));
}

function viableBaseCount(pool) {
  return pool.filter((word) => word.length >= 5 && word.length <= 8 && pool.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 5).length;
}

function needsCumulativePool(level, words) {
  return level !== 'a1' && viableBaseCount(words) === 0;
}

let valid = true;
for (const language of ['de', 'en']) {
  const pools = {};
  for (const level of levels) {
    pools[level] = validPool(JSON.parse(await readFile(resolve(projectRoot, 'src', 'lib', 'data', `words.${language}.${level}.json`), 'utf8')));
  }
  for (const level of levels) {
    const index = levels.indexOf(level);
    const pool = needsCumulativePool(level, pools[level]) ? validPool(levels.slice(0, index + 1).flatMap((entry) => pools[entry])) : pools[level];
    const viableBases = pool.filter((word) => word.length >= 5 && word.length <= 8 && pool.filter((candidate) => candidate !== word && canSpell(candidate, [...word])).length >= 5);
    console.log(`${language}.${level}: effectivePool=${pool.length} viableBases=${viableBases.length}`);
    if (viableBases.length === 0) valid = false;
  }
}

if (!valid) process.exitCode = 1;
