/**
 * Paper & Ink data pipeline: source-aware, lemma-first word pools for a compact puzzle surface.
 * Generates common/rare files; verbs supplied below are infinitives only.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const nounsCsv = '/home/ubuntu/german-nouns-source/german_nouns/nouns.csv';
const frequenciesCsv = '/home/ubuntu/word-data/opensubtitles_cistem_freq.csv';
const outputDir = resolve(root, 'src/lib/data');

const validWord = /^[A-ZÄÖÜ]{3,8}$/;

const germanCore = [
  'ABEND', 'ABER', 'ACHT', 'ALLES', 'ALT', 'ANDERS', 'ANFANG', 'ANGST', 'ANTWORT', 'AUGE', 'AUTO', 'BALD', 'BAUM', 'BEIDE', 'BEISPIEL', 'BERG', 'BILD', 'BIS', 'BITTE', 'BLEIBEN', 'BLICK', 'BLUME', 'BODEN', 'BRAUCHEN', 'BREIT', 'BRIEF', 'BRINGEN', 'BRUDER', 'BUCH', 'DACH', 'DANKE', 'DANN', 'DAUER', 'DEIN', 'DENKEN', 'DIESE', 'DING', 'DORF', 'DORT', 'DREI', 'DURCH', 'EIGEN', 'EINFACH', 'ELTERN', 'ENDE', 'ERDE', 'ERST', 'ESSEN', 'ETWAS', 'FACH', 'FAHREN', 'FALL', 'FAMILIE', 'FARBE', 'FENSTER', 'FERN', 'FINDEN', 'FISCH', 'FLUSS', 'FRAGEN', 'FREI', 'FREUND', 'FRÜH', 'FÜNF', 'FÜR', 'FUSS', 'GARTEN', 'GEBEN', 'GEGEN', 'GEHEN', 'GELD', 'GENAU', 'GERADE', 'GESICHT', 'GESTERN', 'GLAUBEN', 'GLEICH', 'GLÜCK', 'GROSS', 'GRUND', 'GUT', 'HABEN', 'HALB', 'HALTEN', 'HAND', 'HAUS', 'HELFEN', 'HELL', 'HEUTE', 'HIER', 'HILFE', 'HIMMEL', 'HOCH', 'HÖREN', 'HUND', 'IMMER', 'INSEL', 'JAHR', 'JETZT', 'JUNG', 'KALT', 'KIND', 'KLEIN', 'KLAR', 'KLEID', 'KOPF', 'KRAFT', 'KRANK', 'KREIS', 'KUNST', 'KURZ', 'LACHEN', 'LAND', 'LANG', 'LAUFEN', 'LAUT', 'LEBEN', 'LEER', 'LEGEN', 'LEICHT', 'LEID', 'LEISE', 'LERNEN', 'LEUTE', 'LIEBE', 'LIEGEN', 'LIEB', 'LIEFERN', 'LINIE', 'LINKS', 'LOS', 'LUST', 'MACHEN', 'MAL', 'MANN', 'MARKT', 'MEHR', 'MEIN', 'MENSCH', 'MORGEN', 'MUND', 'MUSIK', 'MÜDE', 'MÜSSEN', 'NAME', 'NATUR', 'NEBEN', 'NEU', 'NICHT', 'NOCH', 'NUR', 'OBEN', 'OFFEN', 'OHNE', 'ORT', 'PAPIER', 'PLATZ', 'PREIS', 'RAD', 'RECHT', 'REDEN', 'REGEN', 'REISE', 'RICHTIG', 'RING', 'RUHIG', 'SACHE', 'SAGEN', 'SAUBER', 'SCHNELL', 'SCHÖN', 'SCHREIBEN', 'SCHWARZ', 'SCHWER', 'SEHEN', 'SEHR', 'SEIN', 'SEITE', 'SELBST', 'SIEBEN', 'SITZEN', 'SOFORT', 'SOHN', 'SONNE', 'SPÄT', 'SPIEL', 'SPRECHEN', 'SPRINGEN', 'STADT', 'STARK', 'STEHEN', 'STELLEN', 'STIMME', 'STUNDE', 'SUCHE', 'SÜSS', 'TAG', 'TANZEN', 'TEIL', 'TIER', 'TISCH', 'TÜR', 'TRAGEN', 'TREFFEN', 'TREU', 'TRINKEN', 'UNTEN', 'VATER', 'VIEL', 'VIELLEICHT', 'VIER', 'VOLL', 'VON', 'VOR', 'WARM', 'WARTEN', 'WARUM', 'WASSER', 'WEG', 'WEIL', 'WEITER', 'WELT', 'WENN', 'WERDEN', 'WICHTIG', 'WIEDER', 'WIND', 'WISSEN', 'WOCHE', 'WOHNEN', 'WORT', 'WUNDER', 'ZEIGEN', 'ZEIT', 'ZEHN', 'ZIEL', 'ZIMMER', 'ZWEI', 'ZWISCHEN'
];

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { cells.push(value); value = ''; }
    else value += char;
  }
  cells.push(value);
  return cells;
}

function normalise(value) {
  return value.trim().toLocaleUpperCase('de-DE');
}

function unique(words) {
  return [...new Set(words.map(normalise).filter((word) => validWord.test(word)))].sort((a, b) => a.localeCompare(b, 'de'));
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function sourceWords(levels) {
  const words = await Promise.all(levels.map((level) => readJson(`src/lib/data/words.en.${level}.json`)));
  return unique(words.flat());
}

async function buildGermanPools() {
  const [nounsContents, frequencyContents] = await Promise.all([readFile(nounsCsv, 'utf8'), readFile(frequenciesCsv, 'utf8')]);
  const frequencyLines = frequencyContents.trim().split(/\r?\n/);
  const totalTokens = frequencyLines.slice(1).reduce((total, line) => total + Number(line.slice(line.lastIndexOf(',') + 1) || 0), 0);
  const frequency = new Map();
  for (const line of frequencyLines.slice(1)) {
    const separator = line.lastIndexOf(',');
    if (separator < 1) continue;
    frequency.set(line.slice(0, separator).toLocaleUpperCase('de-DE'), Number(line.slice(separator + 1)));
  }
  const [header, ...rows] = nounsContents.trim().split(/\r?\n/);
  const columns = parseCsvLine(header);
  const lemmaIndex = columns.indexOf('lemma');
  const posIndex = columns.indexOf('pos');
  const nounCandidates = [];
  for (const row of rows) {
    const values = parseCsvLine(row);
    const lemma = normalise(values[lemmaIndex] ?? '');
    const pos = values[posIndex] ?? '';
    if (!pos.includes('Substantiv') || /Affix|Gebundenes Lexem|Vorname|Nachname|Toponym|Eigenname|Straßenname|Abkürzung|Buchstabe|Deklinierte Form|Redewendung|Geflügeltes Wort|Grußformel/.test(pos) || !validWord.test(lemma)) continue;
    const rawFrequency = frequency.get(lemma) ?? 0;
    const perMillion = totalTokens ? (rawFrequency / totalTokens) * 1_000_000 : 0;
    nounCandidates.push({ lemma, perMillion });
  }
  const deduplicated = [...new Map(nounCandidates.map((entry) => [entry.lemma, entry])).values()];
  const commonNouns = deduplicated.filter((entry) => entry.perMillion >= 10).sort((a, b) => b.perMillion - a.perMillion).slice(0, 1800).map((entry) => entry.lemma);
  const rareNouns = deduplicated.filter((entry) => entry.perMillion > 0 && entry.perMillion < 1).sort((a, b) => b.perMillion - a.perMillion).slice(0, 1600).map((entry) => entry.lemma);
  return { common: unique([...germanCore, ...commonNouns]), rare: unique(rareNouns), totalTokens, commonNouns: commonNouns.length, rareNouns: rareNouns.length };
}

async function main() {
  const german = await buildGermanPools();
  const englishCommon = await sourceWords(['a1', 'a2', 'b1']);
  const englishRare = await sourceWords(['b2', 'c1', 'c2']);
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDir, 'words.de.common.json'), `${JSON.stringify(german.common, null, 2)}\n`),
    writeFile(resolve(outputDir, 'words.de.rare.json'), `${JSON.stringify(german.rare, null, 2)}\n`),
    writeFile(resolve(outputDir, 'words.en.common.json'), `${JSON.stringify(englishCommon, null, 2)}\n`),
    writeFile(resolve(outputDir, 'words.en.rare.json'), `${JSON.stringify(englishRare, null, 2)}\n`)
  ]);
  console.log(JSON.stringify({ german: { common: german.common.length, rare: german.rare.length, scoredCommonNouns: german.commonNouns, scoredRareNouns: german.rareNouns, totalTokens: german.totalTokens }, english: { common: englishCommon.length, rare: englishRare.length } }, null, 2));
}

await main();
