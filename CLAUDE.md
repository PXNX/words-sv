# Working in this repository

## Concurrent sessions

Other Claude sessions may be working in this same checkout at the same time and may edit the same files you are editing.

- Only commit your own changes. Stage files (or hunks) explicitly, e.g. `git add <file>` or `git add -p`, never `git add -A` / `git add .` / `git commit -a`.
- Before committing, review `git diff --staged` and make sure every staged line is yours. If a file contains both your edits and someone else's, stage only your hunks.
- Do not revert, reformat, stash, or "clean up" changes you did not make (no `git stash`, `git checkout -- <file>`, `git restore`, or `git reset --hard` on files touched by others).
- If an unexpected change blocks your work (e.g. breaks the build), mention it to the user instead of fixing or discarding it yourself.

## Where things live

SvelteKit app (static adapter, PWA), Svelte 5 runes, Paraglide i18n. Code is grouped by feature under `src/lib/<feature>/`; each route in `src/routes/<mode>/+page.svelte` is a thin wrapper around its feature's main component.

| Feature | Folder | Entry points |
|---|---|---|
| Word modes | `vocab/`, `circle/`, `wordle/`, `hangman/`, `grammar/` (+ `routes/grammar`) | `PronunciationMode.svelte`, `AlltagMode.svelte`, `CircleGame.svelte`, `WordleMode.svelte`, `HangmanMode.svelte` |
| Stories, reading, listening | `story/` | `StoryMode.svelte`, `ReadingMode.svelte`, `ListenMode.svelte`, cast in `stories.ts` / `StoryCharacter.svelte` |
| Conversation (on-device LLM) | `conversation/` | `ConversationMode.svelte`, prompt in `conversation.ts`, partners in `partners.ts`, model in `localModel.svelte.ts` + `llm.worker.ts` |
| Speech engines | `voice/` + `story/naturalVoices.svelte.ts` | `voice/engines.ts` (registry), one `*.worker.ts` per model; see `docs/voice-engines.md` |
| Background work, word audio | `audio/` | `backgroundJobs.svelte.ts`, `priorityQueue.ts`, `wordBank.svelte.ts`, `wav.ts` |
| Downloads, storage, offline | `offline/` + `src/service-worker.ts` | `resumableDownload.ts`, `downloadSpeed.ts`, `storage.ts` |
| Settings | `settings/`, `state/settings.svelte.ts` | `SettingsPanel.svelte`, `ModelManager.svelte` |
| Profile, avatar, rewards | `profile/` | `avatar.ts`, `cosmetics.ts` (rules) / `cosmetics.svelte.ts` (state), `AvatarEditor.svelte` |
| Progress, streak, review | `progress/`, `streak/`, `review/`, `today/` | `activity.ts`, `achievements.ts`, `clientStreak.ts`, `ledger.ts` |
| Sound and haptics | `feedback/` | `sounds.ts`, `haptics.ts` |
| PWA, reminders | `pwa/`, `reminders/` | `pwaInstall.svelte.ts`, `pwaUpdate.ts`, `pwaReminders.ts` |
| App shell | `app/`, `routes/+layout.svelte` | `StartupLoader.svelte`, `TutorialDialog.svelte` |
| Vocabulary data | `data/` | `vocabulary.ts` (word pools per language and level) |
| Server functions (Vercel) | `api/` | streak sync, push, Telegram, progress sync |
| Telegram bot (@word_circle_bot) | `bot/` (Python with PostgreSQL, runs as its own process, not on Vercel) | `bot/bot/main.py`, `bot/bot/store.py`, see `bot/README.md` |

Conventions:

- Pure logic goes in `.ts` files with a Vitest test in `tests/` (add it to `tests/vitest.server.config.mjs`); reactive state in `.svelte.ts`. Keep pure files free of `$state` imports so they stay testable.
- Heavy work (models, encoding) runs in a `*.worker.ts` behind a small client module; anything that can wait goes through `audio/priorityQueue.ts` as `'background'`.
- Everything runs on the device; do not add cloud LLM or TTS calls (Edge voices are the one opt-in exception).
- User-facing text goes in `messages/de.json` and `messages/en.json` (German is the base locale; other locales fall back to it).
- Known pre-existing failures: `bun run check` reports ~190 errors in older files, and several tests point at files that no longer exist. Compare against the previous commit before assuming you broke something.

## Committing

- Commit your own changes yourself, feature by feature: as soon as one self-contained piece of work is done (a new module, a route, a wired-up UI, a test), commit it before starting the next. Do not collect a whole task into one big commit at the end, and do not leave finished work uncommitted.
- Each commit should build on its own and have a message that says what that feature does, prefixed `feat(<mode>)`, `fix(<mode>)`, `chore(<mode>)`, `docs(<mode>)` or `refactor(<mode>)` (see `agents.md`).
- The rules from "Concurrent sessions" still apply to every one of these commits.

## Git workflow

- Commit directly onto `main` and push to `origin/main` right after each commit, so `main` is never ahead of `origin`. Do not create feature branches or pull requests unless asked.
- Only commit your own changes. Other work may be in progress in the same working tree, so stage files explicitly and leave unrelated changes alone.
- The full agent rules are in `agents.md`.
