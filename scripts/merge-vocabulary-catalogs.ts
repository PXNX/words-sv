import fs from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const dataDir = resolve(root, 'src/lib/data');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const languages = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'];

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(join(dataDir, file), 'utf8')) as T;
const writeJson = (file: string, value: unknown): void =>
  fs.writeFileSync(join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);

type VocabularyEntry = {
  definition?: string;
  type?: string;
  genus?: 'masculine' | 'feminine' | 'neuter';
  article?: string;
};

type LanguagePack = {
  words?: Record<string, string[]>;
  definitions?: Record<string, string>;
  metadata?: Record<string, Record<string, unknown>>;
  articles?: Record<string, string>;
};

type CatalogEntry = {
  levels: string[];
  definition?: string;
  article?: string;
  type?: string;
  [key: string]: unknown;
};

function loadAddedPacks(): Record<string, LanguagePack> {
  const raw = fs.readFileSync(join(dataDir, 'languagePacks.ts'), 'utf8');
  const source = raw.slice(0, raw.indexOf('export const existingArticles'))
    .replace(/^export const addedLanguagePacks = /, 'const addedLanguagePacks = ')
    .replace(/\s+as const;\s*$/, ';');
  const context: Record<string, unknown> = {};
  vm.runInNewContext(`${source}; result = addedLanguagePacks;`, context);
  return context.result as Record<string, LanguagePack>;
}

function buildSourceFromLevelFiles(language: string): LanguagePack {
  const words: Record<string, string[]> = {};
  const definitions: Record<string, string> = {};
  const metadata: Record<string, Record<string, unknown>> = {};
  const articles: Record<string, string> = {};

  for (const level of levels) {
    const data = readJson<Record<string, VocabularyEntry>>(`${language}.${level}.json`);
    words[level] = Object.keys(data);
    for (const [word, entry] of Object.entries(data)) {
      const key = word.toUpperCase();
      if (entry.definition) definitions[key] = entry.definition;
      if (entry.type) metadata[key] = { ...metadata[key], type: entry.type };
      if (entry.genus) metadata[key] = { ...metadata[key], genus: entry.genus };
      if (entry.article) articles[key] = entry.article;
    }
  }
  return { words, definitions, metadata, articles };
}

function mergeCatalog(language: string, source: LanguagePack): Record<string, CatalogEntry> {
  const entries = new Map<string, CatalogEntry>();
  const add = (word: string): CatalogEntry => {
    const key = word.trim().toUpperCase();
    let entry = entries.get(key);
    if (!entry) {
      entry = { levels: [] };
      entries.set(key, entry);
    }
    return entry;
  };

  for (const level of levels) {
    for (const word of source.words?.[level] ?? []) {
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

const sources: Record<string, LanguagePack> = {
  de: buildSourceFromLevelFiles('de'),
  en: buildSourceFromLevelFiles('en'),
  ...Object.fromEntries(['fr', 'it', 'es', 'pt', 'uk'].map((language) => [language, added[language]]))
};

for (const language of languages) {
  const source = sources[language];
  if (!source) throw new Error(`no vocabulary source for ${language}`);
  writeJson(`catalog.${language}.json`, mergeCatalog(language, source));
}
console.log(`Merged ${languages.length} catalogs in ${dataDir}`);