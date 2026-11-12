// Content QA: walks the learning content and reports what can be found mechanically, so mistakes
// are caught before a learner meets them. Errors make the script (and CI) fail; warnings are a
// list to work through.
//   - vocabulary packs (src/lib/data/<lang>.<level>.json): empty definitions, a definition that
//     gives the word away, nouns without gender, doubled spaces, missing end punctuation;
//   - German stories: empty beats, questions whose options repeat, answers that are also a wrong option;
//   - tense gaps and curated word-order sentences: duplicate ids, the answer among the wrong options.
// Usage: bun scripts/content-qa.ts [--json] [--warnings]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TENSE_GAPS } from '../src/lib/grammar/tenseGaps';
import { curatedExercises } from '../src/lib/grammar/sentenceBuilder';
import { germanStories } from '../src/lib/story/germanStories';

type Finding = { severity: 'error' | 'warning'; where: string; problem: string };
const findings: Finding[] = [];
const error = (where: string, problem: string) => findings.push({ severity: 'error', where, problem });
const warning = (where: string, problem: string) => findings.push({ severity: 'warning', where, problem });

const data = join(import.meta.dirname, '../src/lib/data');
type Entry = { type?: string; genus?: string; article?: string; definition?: string };
const fold = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

for (const file of readdirSync(data).sort()) {
  const match = /^([a-z]{2})\.([a-c][12])\.json$/u.exec(file);
  if (!match) continue;
  const pack = JSON.parse(readFileSync(join(data, file), 'utf8')) as Record<string, Entry>;
  const seen = new Map<string, string>();
  for (const [word, entry] of Object.entries(pack)) {
    const where = `${match[1]}.${match[2]}:${word}`;
    if (!word.trim()) error(where, 'empty headword');
    const key = word.toLocaleLowerCase();
    // "Morgen" and "morgen" are two words; only an exact repeat in another spelling of spaces counts.
    if (seen.has(word.trim()) && seen.get(word.trim()) !== word) error(where, `same word as "${seen.get(word.trim())}"`);
    seen.set(word.trim(), word);
    if (!entry.type) warning(where, 'no word type');
    if (match[1] === 'de' && entry.type === 'noun' && (!entry.genus || !entry.article)) warning(where, 'noun without gender or article');
    const definition = entry.definition;
    if (definition === undefined) continue;
    if (!definition.trim()) { error(where, 'empty definition'); continue; }
    if (/\s{2,}/u.test(definition)) warning(where, 'doubled space in the definition');
    if (!/[.!?…)"”“]$/u.test(definition.trim())) warning(where, 'definition without end punctuation');
    // A definition that contains the word itself is no help in a quiz that asks for the meaning.
    if (key.length >= 4 && new RegExp(`(?<![\\p{L}])${fold(key).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?![\\p{L}])`, 'u').test(fold(definition))) warning(where, 'the definition contains the word');
  }
}

const storyIds = new Set<string>();
for (const story of germanStories) {
  if (storyIds.has(story.id)) error(`story:${story.id}`, 'duplicate story id');
  storyIds.add(story.id);
  story.beats.forEach((beat, index) => {
    const where = `story:${story.id}:${index}`;
    if (beat.kind === 'line' || beat.kind === 'narration') {
      if (!beat.text.de.trim()) error(where, 'empty text');
      if (/\s{2,}/u.test(beat.text.de)) warning(where, 'doubled space');
    } else {
      const options = beat.options.map((option) => option.de.trim());
      if (options.some((option) => !option)) error(where, 'empty option');
      if (new Set(options.map(fold)).size !== options.length) error(where, 'the same option twice');
      if (options.length < 2) error(where, 'fewer than two options');
      if (beat.kind === 'question' && !beat.prompt.de.trim().endsWith('?')) warning(where, 'question without a question mark');
    }
  });
}

const gapIds = new Set<string>();
for (const gap of TENSE_GAPS) {
  const where = `tense:${gap.id}`;
  if (gapIds.has(gap.id)) error(where, 'duplicate id');
  gapIds.add(gap.id);
  if (gap.wrong.includes(gap.correct)) error(where, 'the right answer is among the wrong ones');
  if (new Set(gap.wrong).size !== gap.wrong.length) error(where, 'the same wrong answer twice');
  if (!gap.features.length) warning(where, 'no grammar feature named');
  if (!/[.!?]$/u.test(`${gap.before}${gap.correct}${gap.after}`.trim())) warning(where, 'sentence without end punctuation');
}

for (const language of ['de', 'en'] as const) {
  const ids = new Set<string>();
  for (const level of ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const) {
    for (const exercise of curatedExercises(language, level)) {
      const where = `order:${language}:${exercise.id}`;
      if (ids.has(exercise.id)) error(where, 'the same sentence twice');
      ids.add(exercise.id);
      if (exercise.tokens.length < 3) warning(where, 'fewer than three words to order');
      if (!/[.!?]$/u.test(exercise.answers[0]!)) warning(where, 'sentence without end punctuation');
    }
  }
}

const errors = findings.filter((finding) => finding.severity === 'error');
const warnings = findings.filter((finding) => finding.severity === 'warning');
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ errors, warnings }, null, 2));
} else {
  for (const finding of errors) console.log(`error    ${finding.where}: ${finding.problem}`);
  if (process.argv.includes('--warnings')) for (const finding of warnings) console.log(`warning  ${finding.where}: ${finding.problem}`);
  else {
    const byProblem = new Map<string, number>();
    for (const finding of warnings) byProblem.set(finding.problem, (byProblem.get(finding.problem) ?? 0) + 1);
    for (const [problem, count] of [...byProblem].sort((a, b) => b[1] - a[1])) console.log(`warning  ${String(count).padStart(5)} × ${problem}`);
  }
  console.log(`\n${errors.length} errors, ${warnings.length} warnings${warnings.length && !process.argv.includes('--warnings') ? ' (list them with --warnings)' : ''}`);
}
if (errors.length) process.exit(1);
