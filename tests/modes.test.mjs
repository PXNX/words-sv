import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { definitionAnswerResult, definitionChoiceWords, evaluateWordleGuess, fiveLetterWords, insertLearningRepeat, isValidWordleGuess, pickLearningSection } = await import('../src/lib/modes.js');
const learningSource = await readFile(new URL('../src/lib/LearningMode.svelte', import.meta.url), 'utf8');
const wordleSource = await readFile(new URL('../src/lib/WordleMode.svelte', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
const soundSource = await readFile(new URL('../src/lib/sounds.ts', import.meta.url), 'utf8');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

test('five-letter mode accepts only normalized five-letter vocabulary entries', () => {
  assert.deepEqual(fiveLetterWords(['Apfel', 'APFEL', 'HAUS', 'KÄLTE', 'SIEBEN']), ['APFEL', 'KÄLTE']);
});

test('Wordle evaluation handles repeated letters without over-marking presents', () => {
  assert.deepEqual(evaluateWordleGuess('KÄLTE', 'KELLE'), ['correct', 'absent', 'correct', 'absent', 'correct']);
  assert.deepEqual(evaluateWordleGuess('TASSE', 'TASES'), ['correct', 'correct', 'correct', 'present', 'present']);
});

test('Wordle auto-submits only exact-level valid five-letter guesses', () => {
  const a1Candidates = ['ACTOR', 'PENNY', 'APPLE'];
  assert.equal(isValidWordleGuess(a1Candidates, 'actor'), true);
  assert.equal(isValidWordleGuess(a1Candidates, 'other'), false);
  assert.equal(isValidWordleGuess(a1Candidates, 'ACT'), false);
  assert.match(wordleSource, /if \(isValidWordleGuess\(candidates, nextGuess\)\) submit\(\)/);
  assert.match(wordleSource, /else notice = labels\.invalid/);
  assert.doesNotMatch(wordleSource, /class="wordle-form"/);
  assert.doesNotMatch(wordleSource, /id="wordle-guess"/);
  assert.match(wordleSource, /onclick=\{\(\) => press\('ẞ'\)\}/);
  assert.match(wordleSource, /grid-template-columns:repeat\(5,clamp\(2\.35rem,12vw,3\.35rem\)\)/);
});

test('Wordle tutorial is deterministic, playable, and demonstrates repeated-letter scoring', () => {
  assert.match(wordleSource, /WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1'/);
  assert.match(wordleSource, /de: \{ target: 'TASSE', warmup: 'TASES' \}/);
  assert.match(wordleSource, /en: \{ target: 'TASTE', warmup: 'TATES' \}/);
  assert.match(wordleSource, /function tutorialPress\(letter: string\)/);
  assert.match(wordleSource, /evaluateWordleGuess\(tutorialRound\.target, nextGuess\)/);
  assert.match(wordleSource, /class:expected=\{tutorialExpected\[tutorialGuess\.length\] === letter\}/);
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
  assert.match(learningSource, /function selectDefinition\(event: MouseEvent\)/);
  assert.match(learningSource, /definitionAnswerResult\(word, currentWord, queue, position, requeuedCurrent\)/);
  assert.match(learningSource, /untrack\(\(\) => startSection\(\)\)/);
  assert.match(learningSource, /<button type="button" value=\{word\} onclick=\{selectDefinition\}/);
  assert.doesNotMatch(learningSource, /submitDefinition/);
  assert.doesNotMatch(learningSource, /<form class="definition-options"/);
  assert.match(learningSource, /insertLearningRepeat\(queue, position, currentWord\)/);
  assert.match(learningSource, /if \(nextWordKey === choiceWordKey && nextSectionKey === choiceSectionKey\) return/);
  assert.match(learningSource, /untrack\(\(\) => resetDefinitionChoices\(\)\)/);
  assert.match(learningSource, /word === selectedChoice/);
  assert.match(learningSource, /advanceTimer = window\.setTimeout\(\(\) => advance\(\), 520\)/);
  assert.match(learningSource, /onCorrect\(\)/);
});

test('portrait safeguards and persistent optional success sounds remain wired at the application shell', () => {
  assert.match(layoutSource, /screen\.orientation/);
  assert.match(layoutSource, /gesturestart/);
  assert.match(layoutSource, /@media \(orientation:landscape\)/);
  assert.match(pageSource, /SOUND_KEY = 'wordcircle-sound'/);
  assert.match(pageSource, /playSuccessSound\(sound, 'circle'\)/);
  assert.match(pageSource, /playSuccessSound\(sound, 'wordle'\)/);
  assert.match(pageSource, /playSuccessSound\(sound, 'vocab'\)/);
  assert.match(soundSource, /AudioContext/);
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
