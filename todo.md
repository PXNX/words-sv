# Product TODO — habit loop, sessions and progress

Working list for the next iterations. Ordered by the suggested sequence. Every phase ends with
tests/build, a focused commit and a push to `main`.

## 1. Let every meaningful session feed the streak (S–M)

- [x] Extend `StreakEvent` beyond `vocab_correct | circle_completed | wordle_completed`:
  - [x] `reading_completed` — all questions answered, or the text finished
  - [x] `story_completed` — use the existing completed-story signal in `StoryMode.svelte`
  - [x] `grammar_correct` — counts up, qualifies at 5 correct answers
  - [x] `listen_completed` — a full listening session finished
  - [x] `pronunciation_practised` — counts up, qualifies at 10 scored attempts
- [x] Show a small “counts toward today” indicator on every home card that can qualify.
- [x] Make the daily goal selectable (5 / 8 / 12) and persist it.
- [x] Show the goal on a progress ring (home streak card and `/progress`).
- [x] Keep the server streak endpoint and SQL schema in sync with the new fields.
- [x] Localise all new labels in the nine interface locales.

## 2. Turn the home screen into a “Today” coach (M)

- [x] Add one card above the mode grid that computes the next best action from local state:
  - [x] “N words are due, about M minutes” → `/vocab`
  - [x] “You left <text> at question N” → `/reading`
  - [x] “Your streak needs N more correct words” → `/vocab`
  - [x] “You marked N words in reading — repeat them” → review session
- [x] Aggregate existing data only: `readVocabularyProgressByLanguage`, reading/story progress,
  `readMissedWords`, streak.
- [x] Support deep links into the selected reading text and unfinished story.
- [x] Remove “menu paralysis”: the Today card is visually the primary action.

## 3. Give every session a real ending and a next step (S–M)

- [x] Vocabulary ends after the second pass instead of looping the queue forever.
  - [x] Recap: correct on first try, words to repeat.
  - [x] One primary button: “Practise the N tricky words”.
- [x] Reading: after the last question show score, “Mark these words for repetition” and
  “Read the next text”.
- [x] Story: offer “Mark these words for repetition” for the words answered wrong.
- [x] Listening: recap after a full session, plus replay.
- [x] No undo snapshot: mistakes are handled by the recap, the repeat queue and the 3-button self-rating instead (undo removed from vocabulary and grammar at the user's request).

## 4. Unify review state across modes (M–L)

- [x] Create one review ledger keyed by `language:item` with `repetitions`, `dueAt`, `lapses`
  and a `source`.
- [x] Write reading marks, vocabulary answers, grammar answers and pronunciation results into it.
- [x] Marked reading words resurface as grammar prompts and in generated stories.
- [x] Pronunciation scores feed the same “hard words” list.
- [x] Listening prioritises words the learner marked.
- [x] Add a **Repeat** hub with due count, grouped sources and a mixed session.
- [x] Keep the existing stores readable so no local progress is lost.

## 5. Milestones that mean something (M)

- [x] Learning milestones, not generic badges:
  - [x] First text / first story / first perfect pronunciation
  - [x] 100 words mastered, 7-day streak, all A1 texts read
  - [x] 10 tricky words cleared
- [x] Weekly recap: words mastered, minutes practised, best streak, hardest word.
- [x] Show the next milestone with a progress bar on `/progress`.
- [x] Add a light daily activity log so minutes practised are real, not guessed.
- [x] Make the weekly recap shareable.

## 6. Useful reminders instead of deadline nagging (M)

- [x] Add reminder types:
  - [x] “N words are due — 2 minutes” at an opt-in time
  - [x] “Continue <text>”
  - [x] Weekly recap notification
- [x] Support all nine interface locales (not only German/English).
- [x] Hard cap: one reminder per day; no repeat after dismissal.
- [x] Streak freeze/repair:
  - [x] Earn one freeze per 7 qualified days.
  - [x] Auto-consume a freeze to bridge one missed day.
  - [x] Offer “repair yesterday” with a short session.
- [x] Frame a reset as a restart (“Best: 41 days — start a new streak”).

## Quick fixes with outsized ROI

- [x] Localise the hardcoded home-card descriptions (hangman, definitions, pronunciation,
  Alltag, false friends, grammar determine/order).
- [x] Implement or remove `learning_known`: 3-button self-rating (Again / Hard / Good) in the
  word quiz.
- [x] Persist pronunciation and listening progress across navigation.
- [x] Show due counts on home cards (word quiz, grammar, reading).
- [x] Continue cards for the last unfinished story/text on home.
- [x] Keep the streak count visible but frame a reset as a restart.
- [x] Daily progress rings and pips in green instead of amber.
- [x] Lilith reacts with sad / shocked / happy moods and looks loving from a 5-day streak on.
- [x] Every game mode counts toward the daily streak: definitions, hangman and Alltag record
  their own streak events (`definitions_completed`, `hangman_completed`, `alltag_correct`) and
  show their progress badges on home and on `/progress`.
- [x] The daily word goal (5 / 8 / 12) can only be changed on the stats page; home just shows
  today's ring.

## 7. Shared word audio for Learn and Listen (M)

- [x] Generate the whole level's word bank with the natural voice model on a loading screen
  (`/vocab` and the natural path of `/listen`).
- [x] Keep the bank on the device (`wordcircle-word-audio-v1` in IndexedDB, 16-bit PCM) so a clip
  generated in one mode plays instantly in the other and survives a reload.
- [x] Resume where a session stopped and render the current round's words first.
- [x] Offer "play without waiting" on the loader; the remaining words stay for the next session.
- [x] Fall back to the browser voice whenever a clip is still missing.
- [x] Drop clips of an older voice model and cap decoded buffers in memory.

## 8. A learner profile that belongs to the player (M)

- [x] Move the first name out of the settings panel onto `/progress`, with a small edit button
  (save / cancel, empty state asks for the name).
- [x] Give the learner their own story character: face, eyes, nose, skin, hair style and colour,
  shirt style and colour, plus one accessory, all from a fixed storybook palette.
- [x] Draw the character with the same `StoryCharacter` component as the cast, so the preview and
  the stories match.
- [x] Let the learner's character take Kumar's part in the stories, under the learner's own name,
  once both a name and an avatar exist; stories without Kumar keep their own cast.
- [x] Add ten achievements on `/progress` (first step, 100 words, 5 stories, 5 texts, 50 grammar
  tasks, 10 perfect pronunciations, 3- and 7-day streaks, 50 mastered words, every mode tried).
- [x] Keep achievements a pure model over the activity log, best streak and mastered words.
- [x] Localise all new labels in the nine interface locales.

## 9. Voice loading and installed-app chrome (S)

- [x] Show an ETA on the word-bank loading screen in `/vocab` and `/listen`, fed by the voice
  download's own remaining-time estimate.
- [x] Run the installed app fullscreen (`display: fullscreen` with `standalone` as fallback), so
  no URL bar is shown.
- [x] Remove the duplicate manifest link from `app.html`.

## Verification checklist

- [x] Vitest suites for new pure helpers (streak, Today card, ledger, milestones, Lilith moods,
  word-bank ordering and spoken forms).
- [x] `npm run build` exits 0.
- [x] `npm run check` adds no new errors: it reports 76 errors / 6 warnings, of which 7 come
  from the earlier voice-provider modules (CDN URL imports and the missing
  `src/lib/data/neutts-voices.json`); the rest is the pre-existing baseline.
- [x] Touched Vitest suites pass; only the pre-existing cron endpoint fails without `CRON_SECRET`,
  and the legacy `node --test` suites still fail on old imports (`src/lib/modes.js`).
- [x] Each phase committed separately and pushed to `main`; `out.js` stays untracked.
