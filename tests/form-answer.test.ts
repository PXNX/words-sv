import { describe, expect, it } from 'vitest';
import { editDistance, formCountsAsRight, scoreForm } from '../src/lib/grammar/formAnswer';

const GEBEN = ['gebe', 'gibst', 'gibt', 'geben', 'gebt', 'geben'];
const FAHREN = ['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'];

describe('typed form credit', () => {
  it('gives full credit for the exact form and most of it for capitals', () => {
    expect(scoreForm('gibt', 'gibt', GEBEN)).toEqual({ verdict: 'exact', credit: 1 });
    expect(scoreForm('  gibt ', 'gibt', GEBEN).verdict).toBe('exact');
    expect(scoreForm('Gibt', 'gibt', GEBEN).verdict).toBe('case');
  });

  it('accepts umlauts and ß typed plainly as a spelling slip', () => {
    expect(scoreForm('faehrt', 'fährt', FAHREN).verdict).toBe('spelling');
    expect(scoreForm('weiss', 'weiß').verdict).toBe('spelling');
    expect(formCountsAsRight(scoreForm('weiss', 'weiß'))).toBe(true);
  });

  it('treats another form of the same word as a grammar error, not a slip', () => {
    expect(scoreForm('gebt', 'gibt', GEBEN).verdict).toBe('wrong');
    expect(scoreForm('fahrt', 'fährt', FAHREN).verdict).toBe('wrong');
  });

  it('gives half credit for one letter off in a longer word', () => {
    expect(scoreForm('sprichy', 'spricht').verdict).toBe('typo');
    expect(formCountsAsRight(scoreForm('sprichy', 'spricht'))).toBe(false);
    expect(scoreForm('git', 'gibt').verdict).toBe('wrong');
    expect(scoreForm('', 'gibt').credit).toBe(0);
  });

  it('measures edit distance with an early stop', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('abc', 'abc')).toBe(0);
    expect(editDistance('abc', 'abd', 1)).toBe(1);
  });
});
