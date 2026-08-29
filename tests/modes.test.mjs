import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { definitionAnswerResult, definitionChoiceWords, evaluateWordleGuess, fiveLetterWords, insertLearningRepeat, isValidWordleGuess, pickLearningSection } = await import('../src/lib/modes.js');
const { prioritizeLearningWords, updateReviewProgress } = await import('../src/lib/spacedRepetition.js');
const learningSource = await readFile(new URL('../src/lib/LearningMode.svelte', import.meta.url), 'utf8');
const wordleSource = await readFile(new URL('../src/lib/WordleMode.svelte', import.meta.url), 'utf8');
const keyboardLayoutsSource = await readFile(new URL('../src/lib/wordle/keyboardLayouts.ts', import.meta.url), 'utf8');
const wordleGridSource = await readFile(new URL('../src/lib/wordle/WordleGrid.svelte', import.meta.url), 'utf8');
const wordleKeyboardSource = await readFile(new URL('../src/lib/wordle/WordleKeyboard.svelte', import.meta.url), 'utf8');
const wordleTutorialDataSource = await readFile(new URL('../src/lib/wordle/tutorial.ts', import.meta.url), 'utf8');
const homeSource = await readFile(new URL('../src/lib/HomeView.svelte', import.meta.url), 'utf8');
const settingsViewSource = await readFile(new URL('../src/lib/SettingsView.svelte', import.meta.url), 'utf8');
const settingsStoreSource = await readFile(new URL('../src/lib/state/settings.svelte.ts', import.meta.url), 'utf8');
const vocabPageSource = await readFile(new URL('../src/routes/vocab/+page.svelte', import.meta.url), 'utf8');
const circleGameSource = await readFile(new URL('../src/lib/circle/CircleGame.svelte', import.meta.url), 'utf8');
const circlePageSource = await readFile(new URL('../src/routes/circle/+page.svelte', import.meta.url), 'utf8');
const wordleTutorialRouteSource = await readFile(new URL('../src/routes/wordle/tutorial/+page.svelte', import.meta.url), 'utf8');
const wordlePageSource = await readFile(new URL('../src/routes/wordle/+page.svelte', import.meta.url), 'utf8');
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
	assert.match(wordleSource, /if \(nextGuess\.length === 5\) submit\(\);/);
  assert.doesNotMatch(wordleSource, /class="wordle-form"/);
  assert.doesNotMatch(wordleSource, /id="wordle-guess"/);
	  assert.match(keyboardLayoutsSource, /export const keyboardLayouts/);
	  assert.match(keyboardLayoutsSource, /extras: \['Ä', 'Ö', 'Ü', 'ẞ'\]/);
	  assert.match(wordleGridSource, /grid-template-columns:repeat\(5,clamp\(2\.35rem,12vw,3\.35rem\)\)/);
});

test('Wordle keyboard greys already-used letters, keeping present/correct legible while dimming absent keys', () => {
	assert.match(keyboardLayoutsSource, /export function keyboardMarksFrom/);
	assert.match(keyboardLayoutsSource, /const priority: Record<WordleMark, number> = \{ absent: 1, present: 2, correct: 3 \}/);
	assert.match(wordleSource, /const keyboardMarks = \$derived\(keyboardMarksFrom\(entries\)\)/);
	assert.match(wordleKeyboardSource, /class:correct=\{marks\[letter\] === 'correct'\}/);
	assert.match(wordleKeyboardSource, /class:present=\{marks\[letter\] === 'present'\}/);
	assert.match(wordleKeyboardSource, /class:absent=\{marks\[letter\] === 'absent'\}/);
	assert.match(wordleKeyboardSource, /\.wordle-keyboard button\.absent \{ border-color:#69727a;background:#69727a;color:#fffdf7;opacity:\.6; \}/);
});

test('Wordle persists only a validated in-progress round and clears saved state after reset or completion', () => {
	assert.match(wordleSource, /import \{ readWordleState, WORDLE_STATE_KEY, writeWordleState \} from '\$lib\/wordleState\.js'/);
	assert.match(wordleSource, /function restoreOrStart\(\)/);
	assert.match(wordleSource, /readWordleState\(localStorage\.getItem\(WORDLE_STATE_KEY\), \{ language, level, candidates \}\)/);
	assert.match(wordleSource, /localStorage\.setItem\(WORDLE_STATE_KEY, writeWordleState\(\{ language, level, target, entries, guess \}\)\)/);
	assert.match(wordleSource, /if \(won \|\| exhausted\) \{\n\s+localStorage\.removeItem\(WORDLE_STATE_KEY\)/);
});

test('Wordle tutorial is deterministic, playable, lives at its own route, and demonstrates repeated-letter scoring', () => {
  assert.match(wordleTutorialDataSource, /WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1'/);
  assert.match(wordleTutorialDataSource, /de: \{ target: 'TASSE', warmup: 'TASES' \}/);
  assert.match(wordleTutorialDataSource, /en: \{ target: 'TASTE', warmup: 'TATES' \}/);
  assert.match(wordleTutorialRouteSource, /function press\(letter: string\)/);
  assert.match(wordleTutorialRouteSource, /evaluateWordleGuess\(tutorialRound\.target, nextGuess\)/);
  assert.match(wordleKeyboardSource, /class:expected=\{guided && expectedLetter === letter\}/);
  assert.match(wordleTutorialRouteSource, /class="wordle-tutorial-view"/);
  assert.match(wordleTutorialRouteSource, /<WordleGrid rows=\{2\}/);
  assert.match(wordleTutorialRouteSource, /<WordleKeyboard language=\{settings\.lang\}/);
  assert.match(wordlePageSource, /if \(isWordleTutorialLanguage\(settings\.lang\) && !wordleTutorialComplete\(\)\) void goto\('\/wordle\/tutorial'\)/);
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
  assert.match(settingsStoreSource, /SOUND_KEY = 'wordcircle-sound'/);
  assert.match(circleGameSource, /playSuccessSound\(settings\.sound, 'circle'\)/);
  assert.match(wordlePageSource, /playSuccessSound\(settings\.sound, 'wordle'\)/);
  assert.match(vocabPageSource, /playSuccessSound\(settings\.sound, 'vocab'\)/);
	assert.match(soundSource, /AudioContext/);
	assert.match(homeSource, /ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1'/);
	assert.match(settingsStoreSource, /function preferredInterfaceLocale\(\)/);
	assert.match(homeSource, /class="home-games"/);
	assert.match(circlePageSource, /\(settings\.lang === 'de' \|\| settings\.lang === 'en'\) && localStorage\.getItem\(CIRCLE_TUTORIAL_STATE_KEY\) !== 'complete'/);
	assert.match(layoutSource, /class="home-trigger" onclick=\{\(\) => void goto\('\/'\)\}/);
	assert.match(homeSource, /<button class="home-settings-link" onclick=\{\(\) => void goto\('\/settings'\)\}>/);
	assert.match(settingsViewSource, /class="settings-page"/);
	assert.doesNotMatch(settingsViewSource, /class="setting-row mode-picker"/);
	assert.doesNotMatch(settingsViewSource, /settingsOpen/);
	assert.match(circlePageSource, /<CircleGame \{practiceLanguage\} \/>/);
	assert.match(wordlePageSource, /<WordleMode /);
	assert.match(vocabPageSource, /<LearningMode /);
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
