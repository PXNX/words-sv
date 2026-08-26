import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const load = (name) => JSON.parse(readFileSync(new URL(`../src/lib/data/${name}`, import.meta.url), 'utf8'));
const germanDefinitions = load('definitions.de.json');
const englishDefinitions = load('definitions.en.json');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

function inventory(value) {
  const counts = {};
  for (const letter of value) counts[letter] = (counts[letter] ?? 0) + 1;
  return counts;
}

function canSpell(word, letters) {
  const available = inventory(letters);
  return Object.entries(inventory(word)).every(([letter, count]) => (available[letter] ?? 0) >= count);
}

function normalizedWords(words) {
  return [...new Set(words.map((word) => word.trim().toUpperCase()).filter((word) => /^[A-ZÄÖÜẞ]+$/.test(word) && word.length >= 3 && word.length <= 8))];
}

function hasAnyBase(words) {
  const normalized = normalizedWords(words);
  return normalized.some((word) => word.length >= 5 && word.length <= 8 && normalized.filter((candidate) => candidate !== word && canSpell(candidate, word)).length >= 5);
}

function hasDefinitionBackedBase(words, definitions) {
  const normalized = [...new Set(words.map((word) => word.trim().toUpperCase()).filter((word) => /^[A-ZÄÖÜẞ]+$/.test(word) && word.length >= 3 && word.length <= 8))];
  return Object.keys(definitions).some((word) => normalized.includes(word) && word.length >= 5 && word.length <= 8 && normalized.filter((candidate) => candidate !== word && canSpell(candidate, word)).length >= 5);
}

test('the fixed German tutorial words have predefined definitions', () => {
  for (const word of ['GARTEN', 'GAS', 'TEE']) assert.match(germanDefinitions[word], /\S/);
});

test('the fixed English tutorial words have predefined definitions', () => {
  for (const word of ['PLANET', 'PEN', 'TEA']) assert.match(englishDefinitions[word], /\S/);
});

test('definition catalogues provide multiple base-word options for regular hints', () => {
  assert.ok(Object.keys(germanDefinitions).length >= 10);
  assert.ok(Object.keys(englishDefinitions).length >= 20);
});

test('every playable level can generate a definition-backed idle-hint base', () => {
  for (const [language, definitions] of [['de', germanDefinitions], ['en', englishDefinitions]]) {
    const pools = levels.map((level) => load(`words.${language}.${level}.json`));
    for (const [index, level] of levels.entries()) {
      const selectedPool = hasAnyBase(pools[index]) ? pools[index] : pools.slice(0, index + 1).flat();
      assert.ok(hasDefinitionBackedBase(selectedPool, definitions), `${language}.${level} should have a definition-backed base word`);
    }
  }
});
