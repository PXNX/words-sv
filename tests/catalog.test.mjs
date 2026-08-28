import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../src/lib/data/', import.meta.url);
const read = (name) => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const languages = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'];

for (const language of languages) {
  test(`${language} merged catalog has a lossless entry shape`, () => {
    const catalog = read(`catalog.${language}.json`);
    assert.ok(Object.keys(catalog).length > 0);
    for (const [word, entry] of Object.entries(catalog)) {
      assert.ok(Array.isArray(entry.levels), `${language}:${word} should retain level membership`);
      assert.ok(entry.levels.every((level) => levels.includes(level)), `${language}:${word} has an unknown level`);
      if (entry.article) assert.equal(entry.type, 'Substantiv', `${language}:${word} articles belong only to nouns`);
      if (entry.rarity) assert.equal(typeof entry.rarity.source, 'string');
    }
  });
}

test('German merge preserves the requested Haus entry and source rarity shape', () => {
  const haus = read('catalog.de.json').HAUS;
  assert.deepEqual(haus.levels, ['a2']);
  assert.equal(haus.definition, read('definitions.de.json').HAUS);
  assert.equal(haus.type, 'Substantiv');
  assert.equal(haus.gender, 'neuter');
  assert.equal(haus.article, 'das');
  assert.deepEqual(haus.rarity, { source: 'Duden', dudenClass: 4, label: 'common' });
});

test('merged catalogs retain the expanded multilingual learning samples', () => {
  const samples = { fr: 'PORTE', it: 'CASA', es: 'CASA', pt: 'CASA', uk: 'КНИГА' };
  for (const [language, word] of Object.entries(samples)) {
    const entry = read(`catalog.${language}.json`)[word];
    assert.ok(entry, `${language}:${word} should be present`);
    assert.ok(entry.definition);
    assert.ok(entry.levels.length > 0);
  }
});
