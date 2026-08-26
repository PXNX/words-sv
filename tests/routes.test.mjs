import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rootSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

test('direct mode routes reuse the WordCircle page component', async () => {
  for (const route of ['circle', 'wordle', 'vocab']) {
    const source = await readFile(new URL(`../src/routes/${route}/+page.svelte`, import.meta.url), 'utf8');
    assert.match(source, /import WordCircle from '\.\.\/\+page\.svelte'/);
    assert.match(source, /<WordCircle\s*\/>/);
  }
  assert.match(rootSource, /crossword: '\/circle', wordle: '\/wordle', learning: '\/vocab'/);
  assert.match(rootSource, /void goto\(modePaths\[nextMode\]\)/);
});

test('initial loading mark rotates without forcing motion preferences', () => {
  assert.match(rootSource, /class="startup-loader" role="status"/);
  assert.match(rootSource, /animation:startup-spin \.82s linear infinite/);
  assert.match(rootSource, /@media \(prefers-reduced-motion:reduce\) \{ \.startup-mark/);
});
