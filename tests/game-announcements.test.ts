import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Game feedback is announced in the language being learnt, not the interface language. Every
// playable language therefore needs these keys in its own catalog – falling back to the German
// base would announce an English learner's round in German.
const LANGUAGES = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'] as const;
const ANNOUNCEMENTS = [
  'scribble_score',
  'scribble_right',
  'scribble_timeout',
  'scribble_wrong',
  'scribble_guess_prompt',
  'scribble_draw_prompt',
  'scribble_live_bubble_right',
  'scribble_live_champion',
  'scribble_live_you_got_it',
  'scribble_live_guessed',
  'scribble_live_waiting',
  'scribble_live_left',
  'hangman_hit',
  'hangman_miss',
  'hangman_win',
  'hangman_lost',
  'wordle_win',
  'wordle_invalid',
  'wordle_solved_in',
  'wordle_mark_correct',
  'group_game_best',
  'group_game_score'
] as const;

describe('game announcements in the learning language', () => {
  for (const language of LANGUAGES) {
    it(`${language} has its own wording for every game announcement`, () => {
      const messages = JSON.parse(readFileSync(new URL(`../messages/${language}.json`, import.meta.url), 'utf8')) as Record<string, string>;
      const missing = ANNOUNCEMENTS.filter((key) => typeof messages[key] !== 'string' || !messages[key]!.trim());
      expect(missing).toEqual([]);
    });
  }
});
