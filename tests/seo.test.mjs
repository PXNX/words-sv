import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { imageSlug, pages, pageTitle } from '../src/lib/seo.js';

const routesDir = new URL('../src/routes/', import.meta.url);
const routes = (await readdir(routesDir, { recursive: true }))
	.map((file) => file.replaceAll('\\', '/'))
	.filter((file) => file.endsWith('+page.svelte'))
	.map((file) => `/${file.replace(/\/?\+page\.svelte$/, '')}`);
const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const rewrite = new RegExp(`^${vercelConfig.routes[1].src}$`);

test('every page route has SEO metadata and nothing is described that does not exist', () => {
	assert.deepEqual(Object.keys(pages).sort(), routes.sort());
});

test('every non-root route is rewritten to its own generated HTML file on Vercel', () => {
	for (const route of routes.filter((route) => route !== '/')) {
		assert.ok(rewrite.test(route), `${route} is not rewritten`);
		assert.ok(rewrite.test(`${route}/`), `${route}/ is not rewritten`);
		assert.equal(`/${route.slice(1)}`.replace(rewrite, vercelConfig.routes[1].dest), `${route}/index.html`);
	}
});

test('titles, descriptions and image slugs resolve per route', () => {
	assert.equal(pageTitle('/'), 'WordCircle – Dein Worttraining');
	assert.equal(pageTitle('/hangman/'), 'Hangman · WordCircle');
	assert.equal(imageSlug('/'), 'home');
	assert.equal(imageSlug('/circle/definitions'), 'circle-definitions');
	assert.equal(imageSlug('/wordle/tutorial'), 'wordle');
	for (const meta of Object.values(pages)) assert.ok(meta.description.length <= 160, meta.title);
});
