import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rootSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
const homeSource = await readFile(new URL('../src/lib/HomeView.svelte', import.meta.url), 'utf8');
const settingsPageSource = await readFile(new URL('../src/routes/settings/+page.svelte', import.meta.url), 'utf8');
const settingsViewSource = await readFile(new URL('../src/lib/SettingsView.svelte', import.meta.url), 'utf8');
const circlePageSource = await readFile(new URL('../src/routes/circle/+page.svelte', import.meta.url), 'utf8');
const circleTutorialPageSource = await readFile(new URL('../src/routes/circle/tutorial/+page.svelte', import.meta.url), 'utf8');
const wordlePageSource = await readFile(new URL('../src/routes/wordle/+page.svelte', import.meta.url), 'utf8');
const wordleTutorialPageSource = await readFile(new URL('../src/routes/wordle/tutorial/+page.svelte', import.meta.url), 'utf8');
const vocabPageSource = await readFile(new URL('../src/routes/vocab/+page.svelte', import.meta.url), 'utf8');
const vocabularySource = await readFile(new URL('../src/lib/data/vocabulary.ts', import.meta.url), 'utf8');
const circleGameSource = await readFile(new URL('../src/lib/circle/CircleGame.svelte', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
const loaderSource = await readFile(new URL('../src/lib/StartupLoader.svelte', import.meta.url), 'utf8');
const errorSource = await readFile(new URL('../src/routes/+error.svelte', import.meta.url), 'utf8');
const staticErrorSource = await readFile(new URL('../static/404.html', import.meta.url), 'utf8');
const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const workerSource = await readFile(new URL('../src/sw.ts', import.meta.url), 'utf8');
const viteSource = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
const metadata = JSON.parse(await readFile(new URL('../src/lib/data/metadata.de.json', import.meta.url), 'utf8'));

test('each game mode owns a real route and component instead of re-rendering one mega page', () => {
  assert.match(rootSource, /<HomeView \/>/);
  assert.match(settingsPageSource, /<SettingsView \/>/);
  assert.match(circlePageSource, /import CircleGame from '\$lib\/circle\/CircleGame\.svelte'/);
  assert.match(wordlePageSource, /import WordleMode from '\$lib\/WordleMode\.svelte'/);
  assert.match(vocabPageSource, /import LearningMode from '\$lib\/LearningMode\.svelte'/);
  assert.doesNotMatch(circlePageSource, /import WordCircle from/);
  assert.doesNotMatch(wordlePageSource, /import WordCircle from/);
  assert.doesNotMatch(vocabPageSource, /import WordCircle from/);
  assert.doesNotMatch(settingsPageSource, /import WordCircle from/);
  assert.doesNotMatch(rootSource, /GameShell/);
  assert.doesNotMatch(circlePageSource, /GameShell/);
  assert.match(layoutSource, /class="game-shell"/);
  assert.match(layoutSource, /class="game-paper"/);
  assert.match(layoutSource, /class="home-trigger"/);
});

test('the circle game always renders, even while a redirect to its tutorial is in flight', () => {
  assert.match(circlePageSource, /<CircleGame \{practiceLanguage\} \/>/);
  assert.doesNotMatch(circlePageSource, /\{#if !needsTutorial\}/);
  assert.match(circlePageSource, /if \(needsTutorial\) void goto\('\/circle\/tutorial', \{ replaceState: true \}\)/);
});

test('tutorials live directly on their own /circle/tutorial and /wordle/tutorial routes (no pass-through wrapper component) and redirect back once finished', () => {
  assert.match(circleTutorialPageSource, /class="tutorial-panel"/);
  assert.match(circleTutorialPageSource, /requestCirclePractice\(tutorialLanguage\)/);
  assert.doesNotMatch(circleTutorialPageSource, /CircleTutorial/);
  assert.match(wordleTutorialPageSource, /class="wordle-tutorial-view"/);
  assert.match(wordleTutorialPageSource, /<WordleGrid rows=\{2\}/);
  assert.doesNotMatch(wordleTutorialPageSource, /<WordleTutorial/);
  assert.match(wordlePageSource, /if \(isWordleTutorialLanguage\(settings\.lang\) && !wordleTutorialComplete\(\)\) void goto\('\/wordle\/tutorial'\)/);
  assert.match(wordleTutorialPageSource, /function finish\(\)/);
  assert.match(wordleTutorialPageSource, /void goto\('\/wordle'\)/);
});

test('the home screen offers a tutorial shortcut next to Circle and Wordle, in addition to the automatic first-play redirect', () => {
  assert.match(homeSource, /function openTutorial\(mode: 'circle' \| 'wordle'\)/);
  assert.match(homeSource, /void goto\(`\/\$\{mode\}\/tutorial`\)/);
  assert.match(homeSource, /class="home-tutorial-link" onclick=\{\(\) => openTutorial\('circle'\)\}/);
  assert.match(homeSource, /class="home-tutorial-link" onclick=\{\(\) => openTutorial\('wordle'\)\}/);
});

test('loading mark appears only during startup or genuine navigation and respects motion preferences', () => {
	assert.match(layoutSource, /\{#if !hydrated \|\| navigating\.to\}/);
	assert.match(layoutSource, /@media \(orientation:landscape\)/);
	assert.match(layoutSource, /gesturestart/);
	assert.match(layoutSource, /width:min\(100svh,430px\);min-height:100svh/);
	assert.doesNotMatch(layoutSource, /rotate\(90deg\)/);
	assert.doesNotMatch(layoutSource, /Turn your device upright/);
	assert.match(homeSource, /class="home-games"/);
	assert.match(homeSource, /ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1'/);
	assert.doesNotMatch(settingsViewSource, /mode-settings-heading/);
  assert.match(loaderSource, /class="startup-loader" role="status"/);
  assert.match(loaderSource, /animation:startup-spin \.82s linear infinite/);
  assert.match(loaderSource, /@media \(prefers-reduced-motion:reduce\) \{ \.startup-mark/);
});

test('unknown routes receive a branded 404 page with a clear return route', () => {
  assert.match(errorSource, /This trail has no word\./);
  assert.match(errorSource, /href="\/circle"/);
  assert.match(errorSource, /class="not-found-card"/);
  assert.match(staticErrorSource, /This trail has no word\./);
  assert.match(staticErrorSource, /href="\/circle"/);
});

test('Vercel keeps static files first and falls back to the app for direct mode routes, including their tutorial sub-routes', () => {
	assert.deepEqual(vercelConfig.routes, [
		{ handle: 'filesystem' },
		{ src: '/(circle(/tutorial)?|wordle(/tutorial)?|vocab|settings)/?', dest: '/index.html' }
	]);
	});

test('Home exposes the requested Settings link, streak status, and language catalog', () => {
	assert.match(homeSource, /<button class="home-settings-link" onclick=\{\(\) => void goto\('\/settings'\)\}>/);
	assert.match(homeSource, /class:qualified=\{settings\.streak\.qualified\} class="home-streak"/);
	assert.match(homeSource, /import \{ playableLanguages, type Language \} from '\$lib\/data\/vocabulary'/);
	for (const language of ['fr', 'it', 'es', 'pt', 'uk']) assert.match(vocabularySource, new RegExp(`code: '${language}'`));
	assert.match(vocabPageSource, /<LearningMode \{words\} definitions=\{wordDefinitions\[settings\.lang\]\} metadata=\{wordMetadata\[settings\.lang\]\}/);
	assert.match(wordlePageSource, /onWin=\{\(\) => void settings\.recordStreak\('wordle_completed'\)\}/);
	assert.match(circleGameSource, /recordStreak\('circle_completed'\)/);
});

test('custom service worker and narrow endpoints support background reminders without a platform cron declaration', async () => {
	assert.match(viteSource, /strategies: 'injectManifest'/);
	assert.match(workerSource, /precacheAndRoute\(self\.__WB_MANIFEST\)/);
	assert.match(workerSource, /addEventListener\('push'/);
	assert.match(workerSource, /addEventListener\('notificationclick'/);
	for (const file of ['api/push/public-key.mjs', 'api/push/subscribe.mjs', 'api/push/unsubscribe.mjs', 'api/cron/reminders.mjs']) {
		const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
		assert.ok(source.length > 80, `${file} must contain a real handler`);
	}
	assert.doesNotMatch(JSON.stringify(vercelConfig), /crons/);
});

test('German structured metadata carries grammatical fields and only a directly checked Duden rarity class', () => {
	assert.deepEqual(metadata.HAUS, { type: 'Substantiv', gender: 'neuter', article: 'das', rarity: { source: 'Duden', dudenClass: 4, label: 'common' }, sources: ['Duden', 'ynsrc/gerhard-koebler'] });
	assert.deepEqual(metadata.MANN.gender, 'masculine');
	assert.equal(metadata.ARBEITEN.type, 'Verb');
	assert.deepEqual(metadata.GARTEN.rarity, { source: 'Duden', dudenClass: 3, label: 'established' });
});
