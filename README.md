# WordCircle

A small, local-first language-learning app: crosswords, word games, stories, listening and speaking
practice from A1 to C2 in German and English (with starter content in French, Italian, Spanish,
Portuguese and Ukrainian). The web app is a static SvelteKit PWA; an API server next to the database
handles streaks and Telegram group games, and a Telegram bot posts those games to groups.

## Getting started

```bash
bun install --frozen-lockfile
cp .env.example .env          # only needed for the API server, not for the web app
bun run dev
```

The app opens at the URL Vite prints. Vocabulary, voices and models are downloaded on the device
when a mode first needs them; no account or cloud key is required to practise.

The Telegram login can also be tried without a bot, token or database, with the API server in mock
mode (an in-memory fake database) and the app in dev mode, both with Bun:

```bash
TELEGRAM_MOCK=1 bun server/main.ts   # the API server, with the fake Telegram database
VITE_TELEGRAM_MOCK=1 bun run dev     # the app, which then calls that server instead of refusing
```

## Where things live

Code is grouped by feature under `src/lib/<feature>/`. Each route in `src/routes/<mode>/+page.svelte`
is a thin wrapper around its feature's main component.

| Area | Folder | Entry points |
| --- | --- | --- |
| Word modes | `vocab/`, `circle/`, `wordle/`, `hangman/`, `grammar/`, `taboo/` | `PronunciationMode.svelte`, `CircleGame.svelte`, `WordleMode.svelte`, `HangmanMode.svelte` |
| Stories and reading | `story/` | `StoryMode.svelte`, `ReadingMode.svelte`, `ListenMode.svelte` |
| Conversation | `conversation/` | `ConversationMode.svelte`, `dialogues.ts`, `scripted.ts`, `localModel.svelte.ts` |
| Scribble | `scribble/` | `ScribbleMode.svelte`, `GroupScribble.svelte` |
| Speech engines | `voice/`, `story/naturalVoices.svelte.ts` | `voice/engines.ts`, one `*.worker.ts` per model |
| Background work, audio | `audio/`, `offline/` | `backgroundJobs.svelte.ts`, `priorityQueue.ts`, `resumableDownload.ts` |
| Settings, profile, progress | `settings/`, `profile/`, `progress/`, `streak/`, `review/` | `SettingsPanel.svelte`, `ExamCoach.svelte`, `activity.ts` |
| App shell | `app/`, `routes/+layout.svelte` | `StartupLoader.svelte`, `TutorialDialog.svelte` |
| Vocabulary data | `data/` | `vocabulary.ts`, `<language>.<level>.json`, `catalog.<language>.json` |
| Assessment | `assessment/` | `PlacementTest.svelte`, `mockTest.ts`, `examItems.ts` |
| API server | `server/`, `api/proxy.ts` | `server/main.ts`, endpoints for streaks, push, Telegram and group games |
| Telegram bot | `bot/` | `bot/bot/main.py`, `bot/bot/group_games.py`, `bot/README.md` |
| Tests | `tests/` | Vitest suites, `tests/vitest.server.config.ts` |
| Data tooling | `scripts/` | CEFR alignment, catalog merge, content QA, brand images, releases |

## Everyday commands

```bash
bun run lint        # ESLint
bun run fmt         # bun fmt; bun run fmt:check checks without writing
bun run check       # svelte-check
bun run test        # Vitest
bun run build       # production build, including Open Graph images
bun run qa:content  # checks vocabulary definitions
bun run pictures    # picture-coverage report
```

`bun run ci` runs lint, type checks and tests. Pure logic lives in `.ts` files with a test in
`tests/`; reactive state lives in `.svelte.ts`. User-facing interface text lives in
`messages/de.json` and `messages/en.json`, with per-language catalogs for the learning languages.

## Deployment

See [docs/deploy.md](docs/deploy.md). Vercel serves the static build from `vercel.json`; the API
server and the bot run as long-lived containers with their own secrets.
