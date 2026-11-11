# Changelog

Maintained by `scripts/release.ts`. Add entries under "Unreleased" while working; a release
moves them under a new `## vMAJOR.MINOR.PATCH - YYYY-MM-DD` heading (semantic versioning:
features bump MINOR, fixes PATCH, breaking changes MAJOR). Sections: New, Improved, Fixed,
Migration (anything that needs action), Known issues. The first line under a release heading is
its one-line summary; the localised highlight shown in the app lives in the message files
(`changelog_v<version>`). Entries are technical and stay in English.

## Unreleased

### New
- Add Taboo: describe a word without saying it or any word built on the same base, rated against the definition's key words, and reveal the definition when skipping

### Fixed
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
