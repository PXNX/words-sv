import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { definitionAnswerResult, definitionChoiceWords, evaluateWordleGuess, fiveLetterWords, insertLearningRepeat, isValidWordleGuess, pickLearningSection } = await import('../src/lib/modes.js');
const learningSource = await readFile(new URL('../src/lib/LearningMode.svelte', import.meta.url), 'utf8');
const wordleSource = await readFile(new URL('../src/lib/WordleMode.svelte', import.meta.url), 'utf8');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

test('five-letter mode accepts only normalized five-letter vocabulary entries', () => {
  assert.deepEqual(fiveLetterWords(['Apfel', 'APFEL', 'HAUS', 'KÄLTE', 'SIEBEN']), ['APFEL', 'KÄLTE']);
});

test('Wordle evaluation handles repeated letters without over-marking presents', () => {
  assert.deepEqual(evaluateWordleGuess('KÄLTE', 'KELLE'), ['correct', 'absent', 'correct', 'absent', 'correct']);
});

test('Wordle auto-submits only exact-level valid five-letter guesses', () => {
  const a1Candidates = ['ACTOR', 'PENNY', 'APPLE'];
  assert.equal(isValidWordleGuess(a1Candidates, 'actor'), true);
  assert.equal(isValidWordleGuess(a1Candidates, 'other'), false);
  assert.equal(isValidWordleGuess(a1Candidates, 'ACT'), false);
  assert.match(wordleSource, /isValidWordleGuess\(candidates, guess\)\) submit\(\)/);
  assert.match(wordleSource, /width:clamp\(13rem,66vw,21rem\)/);
  assert.match(wordleSource, /min-height:3rem/);
});

test('learning sections select no more than six unique level words', () => {
  const section = pickLearningSection(['Apfel', 'Birne', 'Käse', 'Garten', 'Tee', 'Haus', 'Wasser'], () => 0.25);
  assert.equal(section.length, 6);
  assert.equal(new Set(section).size, 6);
});

test('definition choices include one correct target and two distinct curated distractors', () => {
  const definitions = { ACTOR: 'Performs in a play.', PEN: 'Writes with ink.', TEA: 'Hot leaf drink.', ADDRESS: 'Location details.' };
  const choices = definitionChoiceWords('actor', ['ACTOR', 'PEN', 'TEA', 'ADDRESS'], definitions, () => 0.5);
  assert.equal(choices.length, 3);
  assert.ok(choices.includes('ACTOR'));
  assert.equal(new Set(choices).size, 3);
  assert.ok(choices.every((word) => definitions[word]));
});

test('a missed definition is inserted three prompts later without replacing the current card', () => {
  assert.deepEqual(insertLearningRepeat(['ACTOR', 'PEN', 'TEA', 'ADDRESS'], 0, 'ACTOR'), ['ACTOR', 'PEN', 'TEA', 'ACTOR', 'ADDRESS']);
});

test('definition answer results retain the correct queue or requeue only the first missed target', () => {
  const queue = ['ACTOR', 'PEN', 'TEA', 'ADDRESS'];
  assert.deepEqual(definitionAnswerResult('ACTOR', 'ACTOR', queue, 0), { isCorrect: true, queue, requeued: false });
  assert.deepEqual(definitionAnswerResult('PEN', 'ACTOR', queue, 0), { isCorrect: false, queue: ['ACTOR', 'PEN', 'TEA', 'ACTOR', 'ADDRESS'], requeued: true });
  assert.deepEqual(definitionAnswerResult('TEA', 'ACTOR', queue, 0, true), { isCorrect: false, queue, requeued: true });
});

test('every exact DE/EN level supplies at least three curated-definition targets for definition choices', async () => {
  for (const language of ['de', 'en']) {
    const definitions = (await import(`../src/lib/data/definitions.${language}.json`, { with: { type: 'json' } })).default;
    for (const level of levels) {
      const words = (await import(`../src/lib/data/words.${language}.${level}.json`, { with: { type: 'json' } })).default;
      const eligible = words.filter((word) => definitions[word.trim().toUpperCase()]);
      assert.ok(eligible.length >= 3, `${language}:${level} needs three definition-choice targets`);
    }
  }
});

test('learning cards choose definition-backed exact-level words and requeue a missed definition', () => {
  assert.match(learningSource, /const definitionWords = \$derived\(words\.filter/);
  assert.match(learningSource, /pickLearningSection\(definitionWords, random, 6\)/);
  assert.match(learningSource, /function selectDefinition\(word: string\)/);
  assert.match(learningSource, /definitionAnswerResult\(word, currentWord, queue, position, requeuedCurrent\)/);
  assert.match(learningSource, /function submitDefinition\(event: SubmitEvent\)/);
  assert.match(learningSource, /<form class="definition-options" onsubmit=\{submitDefinition\}>/);
  assert.match(learningSource, /insertLearningRepeat\(queue, position, currentWord\)/);
  assert.match(learningSource, /if \(nextWordKey === choiceWordKey && nextSectionKey === choiceSectionKey\) return/);
  assert.match(learningSource, /word === selectedChoice/);
  assert.match(learningSource, /window\.setTimeout\(advance, 520\)/);
});

test('learning prompts wait for voices, prefer the selected language, and cancel speech on card changes', () => {
  assert.match(learningSource, /window\.speechSynthesis\.getVoices\(\)/);
  assert.match(learningSource, /addEventListener\('voiceschanged', refreshVoices\)/);
  assert.match(learningSource, /if \(voices\.length === 0\)/);
  assert.match(learningSource, /voice\.lang\.toLowerCase\(\)\.startsWith\(language\)/);
  assert.match(learningSource, /function scheduleInitialSpeech\(\)/);
  assert.match(learningSource, /disabled=\{!speechSupported\}/);
  assert.match(learningSource, /window\.speechSynthesis\.cancel\(\)/);
  assert.match(learningSource, /utterance\.onerror/);
});
