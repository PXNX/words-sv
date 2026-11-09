# WordCircle Release Notes
## Current state as of 2026-11-09

### Completed
- **Phase T (TypeScript hardening)** — `bun run check` at 0 errors/warnings:
  - `000c953` Type the story casts, API endpoints and Telegram test
  - `3e671ab` Port the legacy node --test suites to Vitest
  - `b0eea71` Speak German in the settings + voice hints
  - `c602f4d` Enable `noImplicitOverride` and `verbatimModuleSyntax`
  - Fixed `noUncheckedIndexedAccess` errors file by file through `t8`
  - `5c747167` Changelog page ("Was ist neu")

### In Progress
- **Sentence Composition mode** — `grade()` + route + streak wiring:
  - `src/lib/sentence/grading.ts` — rule-based scorer (`grade`, `WeightKey`, `GradeResult`, `isPassableForToday`, `emptyGrade`)
  - `src/lib/sentence/prompt.ts` — topic pool + per-day prompt index
  - `src/routes/sentence/+page.svelte` — editor UI: prompt, textarea, submit, score display
  - `src/lib/streak/clientStreak.ts` — `StreakMode` union + `sentenceCompleted` field + `sentence_completed` event + `modeDone`
  - `api/_lib/streak.mjs` — server-side `sentence_completed` handling + `qualifiesToday` + typedefs
  - `src/routes/+page.svelte` — home card row for the new mode (`modeSentence`, `group_sentence`, `home_sentence`)
  - `messages/{de,en}.json` — `mode_sentence`, `group_sentence`, `home_sentence`, `sentence_*` keys
  - Paraglide regenerated
  - `review`: ESLint gate, then LLM grading hook-in (TODO)

### Remaining
- ESLint setup and CI gate for the sentence module
- Hook the LLM (or the rule-based scorer) into the actual grade pipeline
- Make todos dropboxes render as a proper app feature page
