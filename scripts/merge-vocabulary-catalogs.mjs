import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const dataDir = path.join(root, 'src/lib/data');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const languages = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'];

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);

function loadAddedPacks() {
  const raw = fs.readFileSync(path.join(dataDir, 'languagePacks.ts'), 'utf8');
  const source = raw.slice(0, raw.indexOf('export const existingArticles'))
    .replace(/^export const addedLanguagePacks = /, 'const addedLanguagePacks = ')
    .replace(/\s+as const;\s*$/, ';');
  const context = {};
  vm.runInNewContext(`${source}; result = addedLanguagePacks;`, context);
  return context.result;
}

function mergeCatalog(language, source) {
  const entries = new Map();
  const add = (word) => {
    const key = word.trim().toUpperCase();
    if (!entries.has(key)) entries.set(key, { levels: [] });
    return entries.get(key);
  };

  for (const level of levels) {
    for (const word of source.words[level] ?? []) {
      const entry = add(word);
      if (!entry.levels.includes(level)) entry.levels.push(level);
    }
  }
  for (const [word, definition] of Object.entries(source.definitions ?? {})) add(word).definition = definition;
  for (const [word, metadata] of Object.entries(source.metadata ?? {})) Object.assign(add(word), metadata);
  for (const [word, article] of Object.entries(source.articles ?? {})) {
    const entry = add(word);
    entry.article = article;
    if (!entry.type) entry.type = 'Substantiv';
  }

  return Object.fromEntries([...entries.entries()].sort(([a], [b]) => a.localeCompare(b, language)));
}

const added = loadAddedPacks();
const germanWords = Object.fromEntries(levels.map((level) => [level, readJson(`words.de.${level}.json`)]));
const englishWords = Object.fromEntries(levels.map((level) => [level, readJson(`words.en.${level}.json`)]));
const definitionsDe = readJson('definitions.de.json');
const definitionsEn = readJson('definitions.en.json');
const metadataDe = readJson('metadata.de.json');

const sources = {
  de: { words: germanWords, definitions: definitionsDe, metadata: metadataDe },
  en: { words: englishWords, definitions: definitionsEn, metadata: {} },
  ...Object.fromEntries(['fr', 'it', 'es', 'pt', 'uk'].map((language) => [language, added[language]]))
};

for (const language of languages) writeJson(`catalog.${language}.json`, mergeCatalog(language, sources[language]));
console.log(`Merged ${languages.length} catalogs in ${dataDir}`);
