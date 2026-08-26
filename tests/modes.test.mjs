import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { definitionChoiceWords, evaluateWordleGuess, fiveLetterWords, insertLearningRepeat, pickLearningSection } = await import('../src/lib/modes.js');
const learningSource = await readFile(new URL('../src/lib/LearningMode.svelte', import.meta.url), 'utf8');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

test('five-letter mode accepts only normalized five-letter vocabulary entries', () => {
  assert.deepEqual(fiveLetterWords(['Apfel', 'APFEL', 'HAUS', 'KÄLTE', 'SIEBEN']), ['APFEL', 'KÄLTE']);
});

test('Wordle evaluation handles repeated letters without over-marking presents', () => {
  assert.deepEqual(evaluateWordleGuess('KÄLTE', 'KELLE'), ['correct', 'absent', 'correct', 'absent', 'correct']);
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
