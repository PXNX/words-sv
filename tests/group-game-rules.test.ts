import { describe, expect, it } from 'vitest';
import { hangmanScore, sessionFromUrl, vocabScore, wordleScore } from '../src/lib/games/groupGameRules';
import { MAX_SCORES } from '../server/_lib/games.js';

const session = 'a'.repeat(32);

describe('group game rules', () => {
  it('reads the session from the Play link only', () => {
    expect(sessionFromUrl(new URL(`https://x.test/wordle?game=wordle&game_session=${session}`))).toEqual({ game: 'wordle', session });
    expect(sessionFromUrl(new URL(`https://x.test/wordle?game=chess&game_session=${session}`))).toBeNull();
    expect(sessionFromUrl(new URL('https://x.test/wordle?game=wordle&game_session=short'))).toBeNull();
  });

  it('scores rounds within what the server accepts', () => {
    expect(wordleScore(1)).toBe(600);
    expect(wordleScore(6)).toBe(100);
    expect(wordleScore(7)).toBe(0);
    expect(wordleScore(1)).toBeLessThanOrEqual(MAX_SCORES.wordle);
    expect(hangmanScore(6, 30)).toBeLessThanOrEqual(MAX_SCORES.hangman);
    expect(hangmanScore(2, 5)).toBe(200);
    expect(vocabScore(9999)).toBe(MAX_SCORES.vocab);
  });
});
