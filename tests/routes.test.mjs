import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rootSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
const loaderSource = await readFile(new URL('../src/lib/StartupLoader.svelte', import.meta.url), 'utf8');
const errorSource = await readFile(new URL('../src/routes/+error.svelte', import.meta.url), 'utf8');
const staticErrorSource = await readFile(new URL('../static/404.html', import.meta.url), 'utf8');
const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

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
