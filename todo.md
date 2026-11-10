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

## 10. Release hardening and the sentence composition mode (in progress)

### Phase T — TypeScript hardening
- [x] Drive `bun run check` to 0 errors / 0 warnings.
- [x] Port the legacy `node --test` suites to Vitest.
- [x] Strict typing at the API/domain boundaries; enable `noImplicitOverride`,
  `verbatimModuleSyntax` and `noUncheckedIndexedAccess`.
- [x] Shared `tests/support/api.ts` with `responseCapture()` typed against `api/_lib/http.ts`.
- [x] Add ESLint and a CI gate that fails on `check` errors (`eslint.config.ts`,
  `.github/workflows/ci.yml`: lint → check → tests → build).
- [x] Run the linter through Bun's built-in `bun lint` (same config, rules run natively).
- [x] Move the app, tests, configs and build scripts to TypeScript: `src/lib/seo.ts`,
  `scripts/og.ts`, the six vocabulary/brand scripts, the three `.mjs` test suites and
  `tests/vitest.server.config.ts`. `tsconfig.json` now type-checks `scripts/*.ts` and
  `eslint.config.ts` too. The Vercel server functions in `api/` are TypeScript as well (Vercel
  runs them under Bun); `static/sw.js`, `static/voices/piper-worker.js` and the Mini App assets stay plain JS
  because they are served as-is.

### Phase I — quick fixes
- [x] Translate the remaining English Settings strings.
- [x] Describe "Aufgenommen" and "VoxCPM" (`voiceHint` on every voice card).
- [x] No duplicate "Aussprache" card exists in the current code (already resolved).

### Sentence composition mode
- [x] `src/lib/sentence/grading.ts` — rule-based scorer (`grade`, `WeightKey`,
  `GradeResult`, `isPassableForToday`, `emptyGrade`).
- [x] `src/lib/sentence/prompt.ts` — topic pool plus a stable per-day prompt index.
- [x] `src/routes/sentence/+page.svelte` — editor UI: prompt card, textarea, submit, score/verdict.
- [x] Streak wiring: `StreakMode` `'sentence'`, `sentenceCompleted`, `sentence_completed` event,
  `modeDone`, `qualifiesToday`, plus the server side in `api/_lib/streak.ts`.
- [x] Home card row with `group_sentence` heading and `mode_sentence` / `home_sentence` labels.
- [x] Localised keys in `messages/de.json` and `messages/en.json`; Paraglide regenerated.
- [x] Register the mode in `seo.js` and the Vercel rewrites (`/sentence`).
- [x] Split into two modes with their own home cards: `/sentence` (short) and
  `/sentence/full` (a whole text), sharing one scorer with per-mode thresholds.
- [x] Full-text writing tools: revealable model answer, word-target progress bar, live
  word/paragraph counts, localStorage draft autosave, reset.
- [x] `GradeResultCard.svelte` renders the result as localised factors, not raw strings.
- [x] Vitest coverage for the grader and the prompt index (`tests/sentence.test.ts`).
- [x] Hook an actual LLM grader behind `grade()`: `llmPrompt.ts` (pure JSON prompt/reply
  parsing) + `llmGrader.ts` + `graderClient.svelte.ts`, using the on-device WebLLM model.
  Every failure falls back to the rule scorer; the result card shows the source and comment.
- [x] Vitest coverage for the LLM prompt and reply parsing (`tests/llm-grader.test.ts`).

### Reading word explainer
- [x] Read the tapped word aloud from the word sheet: natural clip when neural voices are on,
  browser speech synthesis otherwise.
- [x] New `reading_word_speak` label in every locale.

### Verification
- [x] `bun run check` → 0 errors, 0 warnings.
- [x] `bun run lint` → 0 errors (30 `no-explicit-any` warnings).
- [x] `bun run test` → 31 files, 205 tests passing.
- [x] `bun run build` → 24 routes, OG tags written (the OG step now runs as
  `bun scripts/og.ts`).

## 11. Implementation plan: learning progress (from `impl-plan.md`)

Status of the full plan against the code. Items marked done above (sections 1–10) are not
repeated. Conventions in this repo win over the plan where they differ: commits go straight to
`main` (no feature branches or PRs), and the bot uses PostgreSQL.

### Done
- [x] `v1.0.0` baseline tag and GitHub release (9.1).
- [x] Phase T: strict flags, zero `check` errors, Vitest
  only, CI gate, typescript-eslint.
- [x] Domain types: `src/lib/domain/types.ts` (`LangCode`, `Level`, `Skill`, branded `ItemId` /
  `SessionId`, `assertNever`).
- [x] Typed grammar-feature taxonomy (3.7): `src/lib/grammar/taxonomy.ts` with `FeatureKey`,
  `featureKey()`, `ALL_FEATURE_KEYS` snapshot, `isFeatureKey`, rename map, `labelKey`; type tests.
- [x] Phase L core: `src/lib/format/format.ts` (one convention per learned language, explicit
  calendar/digits, cached `Intl` formatters, ordinals, week start, LTR isolate) and
  `src/lib/format/spoken.ts` (German/English numbers, ordinals, clock times); Settings →
  "Format like" (learned language / app language) with Persian calendar and native-digit options;
  progress, streak strip, listening history and sync time use it; ESLint bans raw
  `toLocale*String()`.
- [x] Semantic versioning 1.x.x (replaces the plan's CalVer, 9.2, 9.4, 9.5):
  `src/lib/app/version.ts` (`AppVersion`, `parseVersion`, `compareVersions`, `latestVersion`,
  `bumpVersion`), `scripts/release.ts` (minor by default, `--patch`/`--major`, tested `cutChangelog`),
  `CHANGELOG.md`, `__APP_VERSION__` from `package.json`.
- [x] Changelog page (9.6): `/changelog`, bundled and offline, newest first, unseen badge
  (`lastSeenVersion`), anchors per release, localised highlights (`changelog_v<version>`),
  GitHub links; Settings row with version and unseen dot.

### Phase T leftovers
- [x] `exactOptionalPropertyTypes`, for the whole project at once (only 30 places needed it).
- [x] Schema library (Valibot) at the boundaries: every `api/` reply through the typed fetch client
  (`src/lib/api/client.ts`, `schemas.ts`), IndexedDB aggregates and the sync metadata, the LLM
  grade JSON, Telegram `initData` (client and server). The older localStorage readers keep their
  hand-written normalisers, which the v1.0.0 fixture test covers.
- [x] Typed worker protocol (`src/lib/workers/protocol.ts`: calls with params, result and updates;
  shared client with timeouts and crash handling) for the LLM, Supertonic, VoxCPM and WAV workers.
  The Piper worker stays plain JS under `static/`.
- [x] Locale check (`tests/locales.test.ts`): English complete, no stray keys, same placeholders.
- [x] Type-aware lint rules (`no-floating-promises`, `switch-exhaustiveness-check`) over `src/` and
  `tests/`.

### Phase L leftovers
- [x] Byte sizes and download speeds follow the format setting.
- [x] Route the remaining numbers through `format.ts` (quiz counters, scores, recap minutes, ETAs,
  PWA reminder texts; there is no reminder time picker).
- [ ] Alltag/Satzbau drills for dates, times, ordinals, prices; spoken forms wired into listening.
- [ ] Interface formatting in Telegram reminder texts.

### Phase P — content packs and fast loading
- [ ] Measure where the per-level word files land in the bundle; move them to hashed, fetched,
  validated packs with a manifest; `loadPack()` with cache, idle prefetch, download manager.
- [ ] Budgets: bundle size and pack size in CI, Lighthouse CI.

### Phase A — progress foundation
- [x] Append-only `LearningEvent` log in IndexedDB (`progress/events.ts`, `progress/eventLog.ts`)
  with 12-month compaction into daily aggregates; review answers, reading questions and mode
  completions are logged. No backfill: the ledger keeps its state, events start now.
- [x] FSRS-5 scheduler (own implementation, no dependency) behind `schedule()`; SM-2 entries
  migrate on their next review without moving due dates.
- [x] Item stages `new → learning → young → mature`, leeches (6 lapses); "known" = R ≥ 0.9 and
  S ≥ 21 days.
- [x] Skill × level state (coverage, mastery, retained accuracy, confidence) in
  `progress/skillState.ts`.
- [x] Per-feature accuracy keyed by `FeatureKey` (`featureStats`); German grammar prompts name the
  features they test, wrong answers count against them; labels for every feature in de/en.
- [x] Writing scores and every hangman round are logged; the Today card suggests the weakest feature.
- [x] Log answers from the remaining modes (circle words, wordle rounds, words used in conversation).

### Phase B — assessment and visibility
- [x] Readiness ranges per skill, level ladder, known words, error profile on `/progress`.
- [x] Readiness per language level, all skills weighted the same (no exam-specific targets).
- [x] Placement test (`/placement`, yes/no vocabulary format with invented words, any language
  with 40+ words per level), saved as four-weekly checkpoints with a trend on `/progress`.
- [x] Forecast: weeks until 80 % of the current level is known, from weekly mastery snapshots.
- [ ] Exam date, listening items in checkpoints.

### Phase V — visual layer
- [ ] V1 tokens (OKLCH, gender colours with shape cue, motion tokens), V2 word→picture map with
  coverage report and Credits page, V3 cat mascot rig and inclusive avatar options, V4 teaching
  animations, V5 scenes, V6 memory map, V7 retention A/B.

### Phases C, W, D, E, F, G, H, I
- [ ] C: Formen verbs/adjectives (German first) on `FormItem`/`FeatureKey`, partial credit,
  feature errors as events; deeper gap-fill, Satzbau and B2–C2 content.
- [x] W: offline dictionary (`/dictionary`): search across levels, inflected forms to their base word,
  German cases and compound parts, listen, add to review; tap-to-lookup in reading opens it.
- [ ] D: provider router (WebGPU first, OpenRouter BYOK opt-in), per-language model settings.
- [ ] E: Persian/Arabic native-speaker path, RTL audit, L1 error priors.
- [ ] F: writing rubric per level, reading/listening task formats, speaking simulation, mock tests per
  level (no exam-specific formats).
- [ ] G: offline audit.
- [x] H: group competition through Telegram games (`/games`, `/top` in a group), scored on the server.
- [ ] I: dashboards, A/B framework, content QA loop.

### First run
- [x] Animated welcome flow: Mia, Tom and Lilith walk in and introduce themselves, then language,
  name, character and a confetti finale.

### German vocabulary
- [x] Every German entry has a definition (686 written), mistyped adverbs/adjectives fixed,
  conjugated forms, participles and misspellings replaced by their infinitives or removed;
  `tests/data/german-vocabulary.test.ts` keeps it that way.
- [ ] The 25 "Extra" stories in `story/germanStories.ts` are word lists, not stories; rewrite.

### Release process leftovers
- [x] `tests/fixtures/v1.0.0/` snapshot of a learner's local data for migration tests
  (`scripts/snapshot-local-data.ts`, `tests/local-data-migration.test.ts`).
- [x] Forced updates with a Lilith sheet, a what's new sheet after each update (1.3.0).
- [x] Service-worker caches are already keyed by the build version.
- [x] Version in the Telegram bot's `/version` (from `package.json`, `APP_VERSION` as override).
