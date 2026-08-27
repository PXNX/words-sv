import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { definitionAnswerResult, definitionChoiceWords, evaluateWordleGuess, fiveLetterWords, insertLearningRepeat, isValidWordleGuess, pickLearningSection } = await import('../src/lib/modes.js');
const { prioritizeLearningWords, updateReviewProgress } = await import('../src/lib/spacedRepetition.js');
const learningSource = await readFile(new URL('../src/lib/LearningMode.svelte', import.meta.url), 'utf8');
const wordleSource = await readFile(new URL('../src/lib/WordleMode.svelte', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
const soundSource = await readFile(new URL('../src/lib/sounds.ts', import.meta.url), 'utf8');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

test('five-letter mode accepts only normalized five-letter vocabulary entries', () => {
	  assert.deepEqual(fiveLetterWords(['Apfel', 'APFEL', 'HAUS', 'KÄLTE', 'SIEBEN']), ['APFEL', 'KÄLTE']);
	  assert.deepEqual(fiveLetterWords(['ÉCOLE', 'ШКОЛА', 'ДІМ']), ['ÉCOLE', 'ШКОЛА']);
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
	assert.match(wordleSource, /entries\.some\(\(entry\) => entry\.word === normalized\)/);
	assert.match(wordleSource, /notice = labels\.invalid;\n\s+guess = '';/);
	assert.match(wordleSource, /if \(nextGuess\.length === 5\) \{\n\s+submit\(\);/);
  assert.doesNotMatch(wordleSource, /class="wordle-form"/);
  assert.doesNotMatch(wordleSource, /id="wordle-guess"/);
	  assert.match(wordleSource, /const keyboardLayouts/);
	  assert.match(wordleSource, /extras: \['Ä', 'Ö', 'Ü', 'ẞ'\]/);
	  assert.match(wordleSource, /grid-template-columns:repeat\(5,clamp\(2\.35rem,12vw,3\.35rem\)\)/);
});

test('Wordle keyboard greys scored-absent letters while preserving present and correct score priority', () => {
	assert.match(wordleSource, /const keyboardMarks = \$derived\.by/);
	assert.match(wordleSource, /const priority: Record<WordleMark, number> = \{ absent: 1, present: 2, correct: 3 \}/);
	assert.match(wordleSource, /class:correct=\{keyboardMarks\[letter\] === 'correct'\}/);
	assert.match(wordleSource, /class:present=\{keyboardMarks\[letter\] === 'present'\}/);
	assert.match(wordleSource, /class:absent=\{keyboardMarks\[letter\] === 'absent'\}/);
	assert.match(wordleSource, /\.wordle-keyboard button\.absent \{ border-color:#69727a;background:#69727a;color:#fffdf7; \}/);
});

test('Wordle persists only a validated in-progress round and clears saved state after reset or completion', () => {
	assert.match(wordleSource, /import \{ readWordleState, WORDLE_STATE_KEY, writeWordleState \} from '\$lib\/wordleState\.js'/);
	assert.match(wordleSource, /function restoreOrStart\(\)/);
	assert.match(wordleSource, /readWordleState\(localStorage\.getItem\(WORDLE_STATE_KEY\), \{ language, level, candidates \}\)/);
	assert.match(wordleSource, /localStorage\.setItem\(WORDLE_STATE_KEY, writeWordleState\(\{ language, level, target, entries, guess \}\)\)/);
	assert.match(wordleSource, /if \(won \|\| exhausted\) \{\n\s+localStorage\.removeItem\(WORDLE_STATE_KEY\)/);
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

test('learning cards separate word and audio prompts, reveal every answer state, and wait for explicit continuation', () => {
	assert.match(learningSource, /type PromptKind = 'word' \| 'audio'/);
	assert.match(learningSource, /const definitionWords = \$derived\(words\.map/);
	assert.match(learningSource, /pickLearningSection\(prioritized, random, 6\)/);
	assert.match(learningSource, /function chooseAnswer\(event: MouseEvent\)/);
	assert.match(learningSource, /untrack\(\(\) => startSection\(\)\)/);
	assert.match(learningSource, /<button type="button" value=\{word\} onclick=\{chooseAnswer\}/);
	assert.match(learningSource, /insertLearningRepeat\(queue, position, currentWord\)/);
	assert.match(learningSource, /class:correct-option=\{answerStatus !== null && word === currentWord\}/);
	assert.match(learningSource, /class:wrong-option=\{answerStatus === 'wrong' && word === selectedChoice\}/);
	assert.match(learningSource, /<IconCheck class="answer-icon answer-icon-correct"/);
	assert.match(learningSource, /<IconClose class="answer-icon answer-icon-wrong"/);
	assert.match(learningSource, /class="continue-learning" onclick=\{continueLearning\}/);
	assert.doesNotMatch(learningSource, /class="listen-icon"/);
	assert.doesNotMatch(learningSource, /class="definition-feedback"/);
	assert.match(learningSource, /onCorrect\(\)/);
	assert.match(learningSource, /const currentArticle = \$derived\(articleFor\(currentWord\)\)/);
	assert.match(learningSource, /entry\.type !== 'Substantiv'/);
	assert.match(learningSource, /new SpeechSynthesisUtterance\(currentWord\)/);
	assert.doesNotMatch(learningSource, /new SpeechSynthesisUtterance\(currentDisplayWord\)/);
	assert.match(learningSource, /currentDisplayWord/);
});

test('local spaced repetition resets after a mistake and extends review intervals after successive correct answers', () => {
	const now = 1_700_000_000_000;
	const firstCorrect = updateReviewProgress({}, 'ACTOR', true, now);
	assert.deepEqual(firstCorrect.ACTOR, { repetitions: 1, dueAt: now + 86_400_000 });
	const secondCorrect = updateReviewProgress(firstCorrect, 'ACTOR', true, now);
	assert.deepEqual(secondCorrect.ACTOR, { repetitions: 2, dueAt: now + 172_800_000 });
	const afterMistake = updateReviewProgress(secondCorrect, 'ACTOR', false, now);
	assert.deepEqual(afterMistake.ACTOR, { repetitions: 0, dueAt: now + 86_400_000 });
	assert.deepEqual(prioritizeLearningWords(['LATER', 'DUE'], { LATER: { repetitions: 4, dueAt: now + 99_999 }, DUE: { repetitions: 0, dueAt: now - 1 } }, now), ['DUE', 'LATER']);
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
	assert.match(pageSource, /ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1'/);
	assert.match(pageSource, /function preferredInterfaceLocale\(\)/);
	assert.match(pageSource, /class="home-games"/);
	assert.match(pageSource, /nextMode === 'crossword' && \(lang === 'de' \|\| lang === 'en'\) && localStorage\.getItem\(TUTORIAL_STATE_KEY\) !== 'complete'/);
	assert.match(pageSource, /class="home-trigger" onclick=\{goHome\}/);
		assert.match(pageSource, /function goSettings\(\) \{ tutorialOpen = false; void goto\('\/settings'\); \}/);
		assert.match(pageSource, /<button class="home-settings-link" onclick=\{goSettings\}>/);
	assert.match(pageSource, /class="settings-page"/);
	assert.doesNotMatch(pageSource, /class="setting-row mode-picker"/);
	assert.doesNotMatch(pageSource, /settingsOpen/);
	assert.match(pageSource, /{#if gameMode === 'crossword'}/);
});

test('learning prompts load available voices, use the selected language, and expose the large audio control', () => {
  assert.match(learningSource, /window\.speechSynthesis\.getVoices\(\)/);
  assert.match(learningSource, /addEventListener\('voiceschanged', refreshVoices\)/);
	assert.match(learningSource, /speechStatus = '';/);
	assert.match(learningSource, /if \(!speechSupported \|\| !currentWord\)/);
	assert.match(learningSource, /voice\.lang\.toLowerCase\(\)\.startsWith\(language\)/);
	assert.match(learningSource, /disabled=\{!speechSupported\}/);
  assert.match(learningSource, /window\.speechSynthesis\.cancel\(\)/);
  assert.match(learningSource, /utterance\.onerror/);
});
