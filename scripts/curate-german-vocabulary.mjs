/**
 * Papier & Tinte vocabulary curation: retain short, common, source-backed German
 * lemmas for the compact letter-wheel puzzle. Nouns come from german-nouns;
 * verbs are restricted to Wiktionary-derived infinitive lists.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(projectRoot, '..', 'vocabulary-sources');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const quotas = {
  a1: { nouns: 100, verbs: 20 },
  a2: { nouns: 140, verbs: 25 },
  b1: { nouns: 180, verbs: 25 },
  b2: { nouns: 220, verbs: 25 },
  c1: { nouns: 260, verbs: 25 },
  c2: { nouns: 300, verbs: 23 }
};
const excludedExistingForms = new Set([
  'ANALY', 'ANSPRU', 'ANNE', 'ANAL', 'ANALY', 'AUS', 'BEDINGT', 'BLAU', 'CANE',
  'EINFLU', 'FREI', 'GRAU', 'HEUL', 'LASE', 'LERNE', 'LIEß', 'LISS', 'LYSE',
  'MISE', 'MUTE', 'NUAN', 'ORDA', 'PARA', 'PAX', 'PRÄM', 'RATE', 'RISK', 'ROTE',
  'MUSS', 'SAMMEN', 'SEN', 'SIR', 'SUD', 'SUCH', 'TAN', 'THEOR', 'URTE', 'VERLASS', 'WIRK', 'WURDE', 'ZUSAM', 'HEUL', 'STRASS'
]);
const legacySharpSReplacements = new Map([
  ['FUSS', 'FUẞ'],
  ['MASS', 'MAẞ'],
  ['RUSS', 'RUẞ'],
  ['SCHOSS', 'SCHOẞ'],
  ['SPASS', 'SPAẞ']
]);
const lowercaseSharpSReplacements = new Map(
  [...legacySharpSReplacements].map(([legacy, corrected]) => [legacy.toLocaleLowerCase('de-DE'), corrected.toLocaleLowerCase('de-DE')])
);
const puzzleWord = /^[a-zäöüß]{3,8}$/iu;
const coreInfinitives = [
  'sein', 'haben', 'heißen', 'kommen', 'gehen', 'wohnen', 'lernen', 'spielen', 'machen', 'arbeiten', 'lesen', 'schreiben', 'hören', 'sehen', 'sprechen', 'essen', 'trinken', 'kaufen', 'brauchen', 'können',
  'dürfen', 'müssen', 'wollen', 'sollen', 'bleiben', 'beginnen', 'bekommen', 'bringen', 'denken', 'fahren', 'finden', 'folgen', 'fragen', 'geben', 'helfen', 'kennen', 'leben', 'lieben', 'nehmen', 'öffnen', 'reisen', 'sagen', 'schlafen', 'suchen', 'tanzen',
  'antworten', 'aufhören', 'aussehen', 'auswählen', 'bedeuten', 'besuchen', 'bezahlen', 'bestehen', 'bewegen', 'erklären', 'erfahren', 'erlauben', 'erzählen', 'gewinnen', 'glauben', 'genießen', 'geschehen', 'handeln', 'hoffen', 'lachen', 'meinen', 'merken', 'planen', 'probieren', 'reagieren', 'scheinen', 'senden', 'sparen', 'steigen', 'stellen',
  'ablehnen', 'anbieten', 'annehmen', 'anpassen', 'auftreten', 'bedecken', 'beeilen', 'befassen', 'behalten', 'behandeln', 'beweisen', 'dienen', 'drohen', 'drucken', 'erkennen', 'erwarten', 'fördern', 'gelten', 'geraten', 'gehören', 'gründen', 'heben', 'leiten', 'meiden', 'nennen', 'nutzen', 'prüfen', 'retten', 'rufen', 'wirken',
  'abschaffen', 'abwarten', 'angeben', 'anregen', 'anrufen', 'anziehen', 'aufgeben', 'auslösen', 'beitragen', 'betreffen', 'einführen', 'einhalten', 'einsehen', 'entstehen', 'ergeben', 'erheben', 'erleiden', 'erfolgen', 'erfassen', 'fordern', 'gewähren', 'klären', 'leiden', 'leisten', 'mindern', 'prägen', 'raten', 'rechnen', 'regeln', 'sichern', 'stärken', 'steigern',
  'abdecken', 'ablegen', 'abrufen', 'abwägen', 'aneignen', 'anstoßen', 'aufbauen', 'aufweisen', 'ausbauen', 'ausführen', 'ausgehen', 'auslegen', 'auswerten', 'bedingen', 'beheben', 'belegen', 'beruhen', 'betreten', 'bewahren', 'bewirken', 'beziehen', 'einordnen', 'erörtern', 'verfügen', 'verweisen'
];

function parseNoun(line) {
  const [lemma = '', pos = ''] = line.split(',', 2);
  return { lemma: lemma.trim(), pos: pos.trim() };
}

function normalize(word) {
  const normalized = word.normalize('NFC').toLocaleLowerCase('de-DE');
  return lowercaseSharpSReplacements.get(normalized) ?? normalized;
}

function toPuzzleForm(word) {
  const sharpSPlaceholder = '\uE000';
  return normalize(word)
    .replaceAll('ß', sharpSPlaceholder)
    .toLocaleUpperCase('de-DE')
    .replaceAll(sharpSPlaceholder, 'ẞ');
}

function isPuzzleWord(word) {
  return puzzleWord.test(word) && !word.includes('-') && !word.includes(' ');
}

function isPuzzleForm(word) {
  return /^[A-ZÄÖÜẞ]{3,8}$/.test(toPuzzleForm(word));
}

const [nounsRaw, frequencyRaw, verbsRaw] = await Promise.all([
  readFile(resolve(sourceRoot, 'german-nouns.csv'), 'utf8'),
  readFile(resolve(sourceRoot, 'german-word-frequencies.csv'), 'utf8'),
  readFile(resolve(sourceRoot, 'german-infinitive-verbs.txt'), 'utf8')
]);

const frequencies = new Map();
for (const line of frequencyRaw.split(/\r?\n/).slice(1)) {
  const [word, value] = line.split(',', 2);
  const frequency = Number(value);
  if (word && Number.isFinite(frequency)) frequencies.set(normalize(word), frequency);
}

const nounCandidates = new Map();
for (const line of nounsRaw.split(/\r?\n/).slice(1)) {
  const { lemma, pos } = parseNoun(line);
  const word = normalize(lemma);
  if (!isPuzzleWord(word) || !isPuzzleForm(word)) continue;
  if (!pos.includes('Substantiv') || /Affix|Gebundenes|Eigenname|Suffix/i.test(pos)) continue;
  const frequency = frequencies.get(word) ?? 0;
  if (frequency < 100) continue;
  nounCandidates.set(word, Math.max(nounCandidates.get(word) ?? 0, frequency));
}

const infinitiveCandidates = new Map();
for (const entry of verbsRaw.split(/\r?\n/)) {
  const word = normalize(entry.trim());
  if (!isPuzzleWord(word)) continue;
  infinitiveCandidates.set(word, frequencies.get(word) ?? 0);
}

const ranked = (candidates) => [...candidates.entries()]
  .sort(([, leftFrequency], [, rightFrequency]) => rightFrequency - leftFrequency)
  .map(([word]) => toPuzzleForm(word));

const rankedNouns = ranked(nounCandidates);
const rankedVerbs = [...new Set(coreInfinitives.map(normalize))]
  .filter((word) => isPuzzleWord(word) && isPuzzleForm(word))
  .map(toPuzzleForm);
const transliteratedSharpSForms = new Set(
  [...rankedNouns, ...rankedVerbs]
    .filter((word) => word.includes('ẞ'))
    .map((word) => word.replaceAll('ẞ', 'SS'))
);
let nounCursor = 0;
let verbCursor = 0;
const summary = {};

for (const level of levels) {
  const filePath = resolve(projectRoot, 'src', 'lib', 'data', `words.de.${level}.json`);
  const existing = JSON.parse(await readFile(filePath, 'utf8'));
  const retained = existing
    .map((word) => legacySharpSReplacements.get(word) ?? word)
    .filter((word) => !excludedExistingForms.has(word) && isPuzzleWord(normalize(word)) && !transliteratedSharpSForms.has(word));
  const nouns = rankedNouns.slice(nounCursor, nounCursor + quotas[level].nouns);
  const verbs = rankedVerbs.slice(verbCursor, verbCursor + quotas[level].verbs);
  nounCursor += quotas[level].nouns;
  verbCursor += quotas[level].verbs;
  const merged = [...new Set([...retained, ...nouns, ...verbs])];
  await writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`);
  summary[level] = { total: merged.length, nounsAdded: nouns.length, infinitiveVerbsAdded: verbs.length };
}

await writeFile(resolve(projectRoot, 'vocabulary-curation-report.json'), `${JSON.stringify({
  sourceCandidates: { nouns: rankedNouns.length, infinitiveVerbs: rankedVerbs.length },
  summary
}, null, 2)}\n`);

console.log(JSON.stringify({ sourceCandidates: { nouns: rankedNouns.length, infinitiveVerbs: rankedVerbs.length }, summary }, null, 2));
