# Telegram games for @word_circle_bot

What to enter in @BotFather (`/newgame`) for the group games (see `server/_lib/games.ts` and
`bot/bot/games.py`). The short name has to match exactly; the photo is the 640×360 PNG next to
this file (regenerate with `bun scripts/brand-games.ts`). Telegram shows one title and description
per game, so they are in English; the game page itself follows each player's language.

## Wordle

- Short name: `wordle`
- Title: `Wordle`
- Photo: `game-wordle.png`
- Description:
  > Guess the word in six tries. Green letters sit in the right spot, yellow ones are in the word
  > somewhere else. The fewer tries you need, the higher you climb on your group's leaderboard.

## Hangman

- Short name: `hangman`
- Title: `Hangman`
- Photo: `game-hangman.png`
- Description:
  > Find the hidden word letter by letter before the drawing is done. Every miss left and every
  > letter of a long word adds to your score on your group's leaderboard.

## Word quiz

- Short name: `vocab`
- Title: `Word quiz`
- Photo: `game-vocab.png`
- Description:
  > Pick the right meaning for each word at your level. Your longest run of first-try answers is
  > your score – keep the run going to top your group's leaderboard.

## Scribble

- Short name: `scribble`
- Title: `Scribble`
- Photo: `game-scribble.png`
- Description:
  > Take turns drawing a word while the others guess it by replying to the picture. The first right
  > guess scores, the drawer too – the more you guess, the higher you climb on your group's leaderboard.
