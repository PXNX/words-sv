/**
 * CEFR-aligned vocabulary builder.
 *
 * This utility deliberately replaces the former frequency-band allocation.
 * It uses published Goethe A1–B1 lists as German primary evidence, GerVLPro
 * as an openly released, data-driven B2–C2 supplement, and the openly
 * licensed CEFR-J / Octanove profiles for English. It preserves German
 * diacritics and uses infinitive lemmas supplied by the source profiles.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(projectRoot, '..', 'vocabulary-sources');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const;
type Level = (typeof levels)[number];
const acceptedGermanPos = new Set(['NOUN', 'VERB', 'ADJ']);
const acceptedEnglishPos = new Set(['noun', 'verb', 'adjective']);

type Candidate = { word: string; frequency: number; pos: string; source: string };

function isLevel(value: string | undefined): value is Level {
  return value !== undefined && (levels as readonly string[]).includes(value);
}

function germanPuzzleForm(word: string): string {
  const placeholder = '\uE000';
  return word.normalize('NFC')
    .toLocaleLowerCase('de-DE')
    .replaceAll('ß', placeholder)
    .toLocaleUpperCase('de-DE')
    .replaceAll(placeholder, 'ẞ');
}

function isGermanPuzzleWord(word: string): boolean {
  const puzzle = germanPuzzleForm(word);
  return /^[A-ZÄÖÜẞ]{3,8}$/.test(puzzle);
}

function isEnglishPuzzleWord(word: string): boolean {
  return /^[A-Za-z]{3,8}$/.test(word);
}

function scoreSort(left: Candidate, right: Candidate): number {
  return right.frequency - left.frequency || left.word.localeCompare(right.word, 'de-DE');
}

function sourceTextContains(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'iu').test(text);
}

const [gerVlPro, goetheA1, goetheA2, goetheB1, cefrJ, octanove] = await Promise.all([
  readFile(resolve(sourceRoot, 'gervlpro', 'GerVLPro', 'GerVLPro.tsv'), 'utf8'),
  readFile(resolve(sourceRoot, 'goethe', 'goethe-a1.raw.txt'), 'utf8'),
  readFile(resolve(sourceRoot, 'goethe', 'goethe-a2.raw.txt'), 'utf8'),
  readFile(resolve(sourceRoot, 'goethe', 'goethe-b1.raw.txt'), 'utf8'),
  readFile(resolve(sourceRoot, 'olp-en-cefrj', 'cefrj-vocabulary-profile-1.5.csv'), 'utf8'),
  readFile(resolve(sourceRoot, 'olp-en-cefrj', 'octanove-vocabulary-profile-c1c2-1.0.csv'), 'utf8')
]);

const goetheLists: Partial<Record<Level, string>> = { a1: goetheA1, a2: goetheA2, b1: goetheB1 };
const germanByLevel = Object.fromEntries(levels.map((level) => [level, new Map<string, Candidate>()])) as Record<Level, Map<string, Candidate>>;

for (const line of gerVlPro.split(/\r?\n/).slice(1)) {
  const fields = line.split('\t');
  const [lemma, pos, , absoluteFrequency] = fields;
  const level = fields[26]?.toLowerCase();
  if (!lemma || !pos || !isLevel(level) || !acceptedGermanPos.has(pos) || !isGermanPuzzleWord(lemma)) continue;
  const goetheText = goetheLists[level];
  if (goetheText !== undefined && !sourceTextContains(goetheText, lemma)) continue;
  const word = germanPuzzleForm(lemma);
  const current = germanByLevel[level].get(word);
  const frequency = Number(absoluteFrequency) || 0;
  if (!current || frequency > current.frequency) germanByLevel[level].set(word, {
    word,
    frequency,
    pos,
    source: goetheText !== undefined ? `Goethe ${level.toUpperCase()} + GerVLPro` : 'GerVLPro'
  });
}

const englishByLevel = Object.fromEntries(levels.map((level) => [level, new Map<string, Candidate>()])) as Record<Level, Map<string, Candidate>>;
function addEnglishCandidate(level: string | undefined, word: string | undefined, pos: string | undefined, source: string): void {
  if (!level || !word || !pos) return;
  const normalizedLevel = level.toLowerCase();
  if (!isLevel(normalizedLevel) || !acceptedEnglishPos.has(pos) || !isEnglishPuzzleWord(word)) return;
  const puzzleWord = word.toUpperCase();
  if (!englishByLevel[normalizedLevel].has(puzzleWord)) englishByLevel[normalizedLevel].set(puzzleWord, { word: puzzleWord, frequency: 0, pos, source });
}

for (const line of cefrJ.split(/\r?\n/).slice(1)) {
  const [word, pos, level] = line.split(',', 3);
  addEnglishCandidate(level, word, pos, 'CEFR-J 1.5');
}
for (const line of octanove.split(/\r?\n/).slice(1)) {
  const [word, pos, level] = line.split(',', 3);
  addEnglishCandidate(level, word, pos, 'Octanove C1/C2 1.0');
}

type LevelCounts = { candidates: number; exported: number };
type ProvenanceEntry = { word: string; pos: string; source: string };

const report = {
  generatedAt: new Date().toISOString(),
  methodology: {
    german: 'Goethe A1–B1 textual membership intersected with GerVLPro conservative CEFR assignments; GerVLPro conservative assignments for B2–C2.',
    english: 'Open Language Profiles CEFR-J 1.5 for A1–B2 and Octanove C1/C2 1.0 for C1–C2. Individual English Profile lookups are retained as non-bulk primary-source validation evidence.'
  },
  levels: {} as Record<Level, { german: LevelCounts; english: LevelCounts }>
};
const provenance = {
  generatedAt: report.generatedAt,
  sources: {
    german: 'Goethe A1–B1 + GerVLPro conservative CEFR assignment for A1–B1; GerVLPro conservative CEFR assignment for B2–C2.',
    english: 'Open Language Profiles CEFR-J 1.5 for A1–B2; Octanove C1/C2 1.0 for C1–C2.'
  },
  levels: {} as Record<Level, { de: ProvenanceEntry[]; en: ProvenanceEntry[] }>
};

for (const level of levels) {
  const germanEntries = [...germanByLevel[level].values()].sort(scoreSort);
  const englishEntries = [...englishByLevel[level].values()].sort((left, right) => left.word.localeCompare(right.word));
  const german = germanEntries.map((entry) => entry.word);
  const english = englishEntries.map((entry) => entry.word);
  await writeFile(resolve(projectRoot, 'src', 'lib', 'data', `words.de.${level}.json`), `${JSON.stringify(german, null, 2)}\n`);
  await writeFile(resolve(projectRoot, 'src', 'lib', 'data', `words.en.${level}.json`), `${JSON.stringify(english, null, 2)}\n`);
  report.levels[level] = {
    german: { candidates: germanByLevel[level].size, exported: german.length },
    english: { candidates: englishByLevel[level].size, exported: english.length }
  };
  provenance.levels[level] = {
    de: germanEntries.map(({ word, pos, source }) => ({ word, pos, source })),
    en: englishEntries.map(({ word, pos, source }) => ({ word, pos, source }))
  };
}

await writeFile(resolve(projectRoot, 'cefr-vocabulary-alignment-report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(projectRoot, 'cefr-vocabulary-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
