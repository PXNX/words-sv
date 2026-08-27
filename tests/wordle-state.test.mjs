import assert from 'node:assert/strict';
import test from 'node:test';

const { evaluateWordleGuess } = await import('../src/lib/modes.js');
const { readWordleState, writeWordleState } = await import('../src/lib/wordleState.js');

const candidates = ['APFEL', 'TASSE', 'KÄLTE'];
const context = { language: 'de', level: 'a1', candidates };

test('an in-progress Wordle round restores only when its target, entries, marks, and input remain valid for the same language and level', () => {
  const serialized = writeWordleState({
    ...context,
    target: 'APFEL',
    entries: [{ word: 'TASSE', marks: evaluateWordleGuess('APFEL', 'TASSE') }],
    guess: 'KÄL'
  });
  assert.deepEqual(readWordleState(serialized, context), {
    target: 'APFEL',
    entries: [{ word: 'TASSE', marks: evaluateWordleGuess('APFEL', 'TASSE') }],
    guess: 'KÄL'
  });
  assert.equal(readWordleState(serialized, { ...context, level: 'a2' }), null);
});

test('Wordle restoration rejects completed, exhausted, duplicated, and tampered local state', () => {
  const valid = JSON.parse(writeWordleState({ ...context, target: 'APFEL', entries: [], guess: '' }));
  assert.equal(readWordleState(JSON.stringify({ ...valid, entries: [{ word: 'APFEL', marks: evaluateWordleGuess('APFEL', 'APFEL') }] }), context), null);
  assert.equal(readWordleState(JSON.stringify({ ...valid, entries: Array.from({ length: 6 }, () => ({ word: 'TASSE', marks: evaluateWordleGuess('APFEL', 'TASSE') })) }), context), null);
  assert.equal(readWordleState(JSON.stringify({ ...valid, entries: [{ word: 'TASSE', marks: ['absent', 'absent', 'absent', 'absent', 'absent'] }] }), context), null);
  assert.equal(readWordleState('{not-json', context), null);
});
