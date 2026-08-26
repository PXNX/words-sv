import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rootSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
const loaderSource = await readFile(new URL('../src/lib/StartupLoader.svelte', import.meta.url), 'utf8');
const errorSource = await readFile(new URL('../src/routes/+error.svelte', import.meta.url), 'utf8');
const staticErrorSource = await readFile(new URL('../static/404.html', import.meta.url), 'utf8');
const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
	const workerSource = await readFile(new URL('../src/sw.ts', import.meta.url), 'utf8');
	const viteSource = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
	const metadata = JSON.parse(await readFile(new URL('../src/lib/data/metadata.de.json', import.meta.url), 'utf8'));

test('direct mode routes reuse the WordCircle page component', async () => {
	for (const route of ['circle', 'wordle', 'vocab', 'settings']) {
    const source = await readFile(new URL(`../src/routes/${route}/+page.svelte`, import.meta.url), 'utf8');
    assert.match(source, /import WordCircle from '\.\.\/\+page\.svelte'/);
    assert.match(source, /<WordCircle\s*\/>/);
  }
  assert.match(rootSource, /crossword: '\/circle', wordle: '\/wordle', learning: '\/vocab'/);
  assert.match(rootSource, /void goto\(modePaths\[nextMode\]\)/);
});

test('loading mark appears only during startup or genuine navigation and respects motion preferences', () => {
	assert.match(layoutSource, /\{#if !hydrated \|\| navigating\.to\}/);
	assert.match(layoutSource, /@media \(orientation:landscape\)/);
	assert.match(layoutSource, /gesturestart/);
	assert.match(layoutSource, /width:min\(100svh,430px\);min-height:100svh/);
	assert.doesNotMatch(layoutSource, /rotate\(90deg\)/);
	assert.doesNotMatch(layoutSource, /Turn your device upright/);
	assert.match(rootSource, /class="home-games"/);
	assert.match(rootSource, /ROOT_ONBOARDING_KEY = 'wordcircle-root-onboarding-v1'/);
	assert.doesNotMatch(rootSource, /mode-settings-heading/);
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

test('Vercel keeps static files first and falls back to the app for direct mode routes', () => {
	assert.deepEqual(vercelConfig.routes, [
		{ handle: 'filesystem' },
		{ src: '/(circle|wordle|vocab|settings)/?', dest: '/index.html' }
	]);
	});

test('Home exposes the requested Settings link, streak status, language catalog, and article-aware vocabulary flow', () => {
	assert.match(rootSource, /class="home-settings-link" onclick=\{goSettings\}/);
	assert.match(rootSource, /class:qualified=\{streak\.qualified\} class="home-streak"/);
	assert.match(rootSource, /const playableLanguages/);
	for (const language of ['fr', 'it', 'es', 'pt', 'uk']) assert.match(rootSource, new RegExp(`code: '${language}'`));
	assert.match(rootSource, /<LearningMode words=\{modeLevelWords\} definitions=\{wordDefinitions\[lang\]\} metadata=\{wordMetadata\[lang\]\}/);
	assert.match(rootSource, /onWin=\{\(\) => void recordStreak\('wordle_completed'\)\}/);
	assert.match(rootSource, /recordStreak\('circle_completed'\)/);
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
