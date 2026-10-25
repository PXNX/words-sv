import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/** @param {string} name */
const load = (name) => JSON.parse(readFileSync(new URL(`../src/lib/data/${name}`, import.meta.url), 'utf8'));
const a1 = load('de.a1.json');

test('every German A1 word has a definition', () => {
  const missing = Object.entries(a1)
    .filter(([, entry]) => typeof entry.definition !== 'string' || !entry.definition.trim())
    .map(([word]) => word);
  assert.deepEqual(missing, []);
});

test('German A1 definitions read as short, complete sentences', () => {
  for (const [word, entry] of Object.entries(a1)) {
    assert.ok(entry.definition.length <= 160, `${word}: definition is too long`);
    assert.match(entry.definition, /^[A-ZÄÖÜ]/, `${word}: definition should start with a capital letter`);
    assert.match(entry.definition, /[.!?]$/, `${word}: definition should end with punctuation`);
    assert.doesNotMatch(entry.definition, /\{\{|\[\[|<ref|&[a-z]+;/, `${word}: definition still contains wiki markup`);
  }
});

test('German A1 entries use a known word type', () => {
  const types = new Set(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'article', 'numeral', 'interjection', 'particle']);
  for (const [word, entry] of Object.entries(a1)) {
    assert.ok(types.has(entry.type), `${word}: unknown type ${entry.type}`);
  }
});
