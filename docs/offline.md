# Offline audit

What WordCircle does without a connection, checked against `src/service-worker.ts` and the code
that calls out. The app is a static build: every page is prerendered and cached on install, and
everything a learner practises is stored on the device first.

## Works offline (once the app was opened online once)

| Area | Why |
|---|---|
| Every page and mode (circle, wordle, hangman, vocabulary, grammar, Satzbau, Alltag, writing, stories, reading, listening, dictionary, progress, store page view, settings) | Prerendered HTML and all build files are precached per version (`install` in the service worker). |
| Interface languages | Each language's messages are their own build file (`src/lib/i18n/messages.ts`), precached with the rest; switching the interface language needs no connection. |
| Vocabulary, definitions, dictionary | The level files are part of the build (`src/lib/data/*.json`). |
| Progress, streak, review, achievements, character | localStorage and IndexedDB; the streak syncs later (`syncStreak` falls back to the local state). |
| Writing grading without AI, conversation without AI | Rule-based grader and scripted dialogues, no model needed. |
| Browser voices | The device's own speech synthesis (needs the OS voices, which are local on most devices). |
| Downloaded voice models (Piper, Supertonic, Kokoro, Kitten) and the chat model | Cached in their own caches; the worker files are kept in `wordcircle-on-demand`. |
| Word audio and rendered listening stories | IndexedDB (`wordcircle-word-audio-v1`, the listening library). |
| PWA streak reminders | Periodic Background Sync reads the reminder state from IndexedDB. |

## Needs the network

| Feature | What happens offline |
|---|---|
| Telegram sign-in, progress sync | The sign-in button is disabled; sync retries on the next visit online. |
| Store purchases, Pro status | Buy buttons are disabled; owned items stay unlocked (stored locally). |
| Telegram group games | Rounds still count for the learner; only the group board misses them. |
| Edge voices | Fall back to the next engine (see `voice/engines.ts`). |
| OpenRouter (opt-in, own key) | Replies fail while offline; with the "Without WebGPU" setting the on-device model, where there is one, keeps answering. |
| First download of a voice or chat model | Needs the connection once; afterwards it is cached. |
| Server push and Telegram reminders | Sent by the server; the PWA's own reminders keep working. |
| Wiktionary link in the dictionary | Opens the external page. |

## In the interface

A small pill at the top (`offline/OfflinePill.svelte`) says the device is offline and that learning
goes on and is saved. It is fixed, so nothing moves when it appears. `offline/network.svelte.ts`
holds the online state for buttons that need the network.
