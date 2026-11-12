# Changelog

Maintained by `scripts/release.ts`. Add entries under "Unreleased" while working; a release
moves them under a new `## vMAJOR.MINOR.PATCH - YYYY-MM-DD` heading (semantic versioning:
features bump MINOR, fixes PATCH, breaking changes MAJOR). Sections: New, Improved, Fixed,
Migration (anything that needs action), Known issues. The first line under a release heading is
its one-line summary; the localised highlight shown in the app lives in the message files
(`changelog_v<version>`). Entries are technical and stay in English.

## Unreleased

### New
- Rebuild the home screen around the streak: a big flame and count, the week as marks, bars for today's goal and the next milestone, a daily mix with one step each for ear, eye and hand, cards coloured and filtered by skill, and a dock for the hub pages
- Ask words in the quiz by meaning, sound, picture, typing, dictation or letter tiles; known words are recalled instead of recognised, and a learning style setting decides what comes first
- Add pictures for 480 everyday words and a coverage report (`bun run pictures`)
- Show a memory map on the progress page: one tile per word of the level, filled by how well it is remembered
- Explain every case answer with a rule chain (cue, case, form) that builds itself
- Add `/insights`: activity, return rates, modes compared, recall by presentation and flagged content, all on the device
- Add on-device experiments with a first one on animated explanations (`docs/experiments.md`)
- Add 80 tense gaps (Futur I and II, Konjunktiv I) and 50 curated word-order sentences, mostly B2 to C2
- Add afro, braids, headscarf, turban, kippah and hearing aid to the avatar; give Lilith an idle rig
- Draw the market, old town, corner shop, factory and classroom scenes
- Add a credits page with licences
- Add letter tiles with physics on the home screen and after a finished round
- Add Taboo: describe a word without saying it or any word built on the same base, rated against the definition's key words, and reveal the definition when skipping

### Improved
- Load interface messages per language and stories per level (shell 316 → 159 KB gzip, heaviest page ~540 → 226 KB); lower the budgets and run Lighthouse in CI
- Raise the type scale: no running text below 13 px
- Define design tokens in OKLCH for colours, skills, type and motion; pair every gender colour with a shape
- Keep quiz pages still: fixed card heights and reserved feedback slots, the verdict always a check on green or a cross on red with the answer sound
- Fold the avatar editor behind a button on the progress page
- Run content QA in CI (`bun run qa:content`)

### Fixed
- Build grammar sentences that fit their noun (people, things, everything else) instead of pairing words at random
- Follow the interface language in the grammar headings and task lines
- Make text readable in the dark theme on the dictionary, changelog, progress and writing pages
- Replace the duplicate library story; ask the learner for advice in the job application story
- Write the cast's names in Persian and Arabic script and Telegram in Latin throughout
- Play the answer sounds in the everyday mode
- Serve Web Push from one serverless function so a deployment stays within the plan's function limit

## v1.3.0 - 2026-11-10

New avatar parts to unlock, a language-focused progress page and automatic updates.

### New
- Draw three new face shapes, five eye styles and five noses
- Unlock the new faces, eyes and noses with eight long-road achievements and per-language practice
- Tag activity with its learning language
- Focus the progress page on the selected learning language
- Install updates automatically with a joyful Lilith instead of asking
- Pick the unseen releases' features and fixes for the what's new sheet
- Celebrate each update with a what's new sheet, confetti and a bouncing Lilith

## v1.2.0 - 2026-11-10

Readiness per skill, FSRS scheduling and complete German definitions.

### New
- Schedule reviews with FSRS-5; older entries keep their due dates
- Record every answer in an on-device learning event log
- Offer updates in a bottom sheet with a link to what's new
- Build release notes from feat and fix commits, leaving out docs and chore
- Show changelog entries as bullets under separate feature and fix headings
- Build a level ladder and per-skill readiness overview from scheduler states and events
- Choose a target exam for weighted readiness
- Show readiness ranges, the level ladder, known words and frequent mistakes

### Fixed
- Define every German word and correct mistyped, misspelled and inflected headwords
- Correct the spelling of entstehen in a B2 story

## v1.1.0 - 2026-11-10

Dates and numbers follow the learned language; version history in Settings.

### New
- Dates, times and numbers follow the learned language; Settings → "Format like" switches back to the app language, with calendar and digit choices for Persian and Arabic.
- Spoken forms for German and English numbers, ordinals and clock times.
- Typed grammar-feature taxonomy and branded domain ids as the base for per-feature progress.
- Version row in Settings and a "What's new" page listing every release offline.

## v1.0.0 - 2026-11-10

Baseline release.

### New
- Streaks across every mode, a selectable daily goal and progress ring.
- Today coach card, session recaps and continue cards.
- Unified review ledger with a Repeat hub.
- Milestones, weekly recap and ten achievements.
- Reminders capped at one per day, with streak freezes and repair.
- Shared word audio for Learn and Listen; learner avatar in the stories.
- Short-sentence and full-text writing with on-device grading.
