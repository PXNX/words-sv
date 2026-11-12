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
- Add `/insights`: activity, return rates, modes compared, recall by presentation and flagged content, all on the device
- Add on-device experiments with a first one on animated explanations (`docs/experiments.md`)
- Add a credits page that names the typefaces, icons, voices, models and software the app builds on, with their licences
- Add afro, braids, headscarf and turban as hair, kippah and hearing aid as extras, and give Lilith a sitting rig with a flicking tail, twitching ears and a nod
- Draw the market, old town, corner shop, factory and classroom scenes
- Run a content QA script that walks vocabulary, stories, tense gaps and word-order sentences and fails CI on hard errors

### Improved
- Load interface messages per language and stories per level (shell 316 → 158 KB gzip, story routes 563 → 226 KB gzip); lower the budgets and run Lighthouse in CI
- Keep quiz pages still: fixed card heights and reserved feedback slots, the verdict always a check on green or a cross on red with the answer sound
- Keep tutorial cards at one height across their steps and answered reading options in place, the right one green and wrong picks red
- Give the home screen more room at the top and between the blocks, fewer loose tiles, and the mix's hint only before the first step
- Add 119 tense gaps for Futur I and II, Konjunktiv I, Perfekt, Präteritum, Konjunktiv II, passive and genitive from A2, and fifty more word-order sentences weighted towards B2 and C2

### Fixed
- Replace the duplicate library story with a film night; ask the learner for advice in the job application story
- Write the cast's names in Persian and Arabic script and Telegram in Latin throughout
- Keep words' own reading direction inside right-to-left interfaces, and let the German dock label fit
- Derive the flag button's state instead of copying it in an effect
- Make text readable in the dark theme on the dictionary, changelog, progress and writing pages

## v1.8.0 - 2026-11-11

Taboo, letter tiles and a home screen that asks words by ear, eye and hand.

### New
- Add Taboo: describe a word without saying it or any word built on the same base, rated against the definition's key words, with a tutorial, offline grading and the definition on skip; it counts as a streak mode
- Ask words in the quiz by meaning, sound, picture, typing, dictation or letter tiles; known words are recalled instead of recognised, and a learning style setting decides what comes first
- Add pictures for 480 everyday words and a coverage report (`bun run pictures`)
- Add letter tiles with physics on the home screen and after a finished round
- Show a memory map on the progress page: one tile per word of the level, filled by how well it is remembered
- Explain every case answer with a rule chain (cue, case, form) that builds itself
- Define design tokens in OKLCH for colours, skills, type and motion, and pair every gender colour with a shape
- Raise the type scale: no running text below 13 px
- Put a shimmering golden stage behind Pro subscribers, and sell the store colours in the editor with an animated star and the price in the information bar
- Show face and name on the progress page's profile card, with the look editor behind a button

### Fixed
- Build grammar sentences that fit their noun (people, things, everything else) and follow the interface language in the headings and task lines

## v1.7.0 - 2026-11-11

A mock test per level, typed forms, and more to read, hear and get wrong.

### New
- Add a mock test per level with reading, listening, language, a rubric-scored writing task and a spoken task the browser transcribes
- Show a writing rubric per level (task, vocabulary, accuracy, coherence) under the full-text grade
- Add Formen: typed verb and adjective forms with partial credit for capitals, umlauts and typos
- Add hand-checked gap sentences for Perfekt, Präteritum, Konjunktiv II, passive and genitive in Lücken füllen from A2
- Add listening questions to placements and checkpoints: hear the word, pick its meaning
- Add L1 error priors, so a new learner's grammar focus starts where speakers of their first language usually struggle
- Offer OpenRouter as an opt-in with the learner's own key where WebGPU is missing, or always, and choose the chat model per learning language
- Give every mode that reads aloud or uses a model a voice and language-model chooser in its settings sheet
- Complete the Persian and Arabic interfaces

### Improved
- Check bundle and pack budgets in CI, and load the reading catalogue on the home page only while a text is in progress (home 489 → 320 KB gzip)
- Move customising onto the progress page with the colour bundles; WordCircle Pro sits with the streak once signed in with Telegram

### Fixed
- Use logical start and end spacing, borders and mirrored arrows in the right-to-left interface, kept by a guard test
- Turn the extra word lists into real stories in every level and reply to whoever spoke last
- Restore the Persian, Arabic and story loader texts that were saved as question marks

## v1.6.0 - 2026-11-10

A store for Telegram Stars with WordCircle Pro, and speech models on the device.

### New
- Sell character items, sets and a Pro subscription for Telegram Stars, with invoice links and payment records on the server, checked and booked by the bot
- Let WordCircle Pro forgive one missed day a week before a freeze is used, on the device and on the server
- Add the store's six colours as character items, with a page to try them on
- Run Supertonic 3 voices on the device for every language the app teaches, with ten named voices on WebGPU or WebAssembly
- Add Kokoro's 28 English voices and Kitten TTS's 8 voices (25 MB) through one StyleTTS 2 worker
- Describe every engine fully in the registry (name, tier, footprint, licence, named voices) and list voice models like the chat models
- Add an offline dictionary of the learning language: search words, forms and meanings across all levels, German cases and compound parts, listen and add to review
- Drill clock times, dates, numbers and prices in German and English every other card, and read clock times and euro prices in German texts the way people say them
- Set a goal date for the level and see whether the forecast gets there in time
- Show an offline pill, disable network-only buttons while offline and audit what works without a connection
- Prepare story audio as a background job that outlives the page
- Format reminders and Telegram numbers with the learner's digit choice
- Reward ten friends joined through the invite link with an exclusive Telegram-blue top, announced in Telegram

### Improved
- Log writing scores, hangman rounds, circle words, Wordle rounds and the words used in conversation as learning events

### Fixed
- Remove VoxCPM, which never loaded in a stock browser runtime; its setting falls back to Piper and its 1.6 GB cache is freed
- Serve Web Push from one serverless function so a deployment stays within the plan's function limit

## v1.5.0 - 2026-11-10

Talking and writing without AI, a Telegram account, and games in the group.

### New
- Add a scripted dialogue engine with topics per partner, word questions and rule-checked answers in all seven languages, with reply suggestions and a with-or-without-AI switch once a model is there
- Grade writing by rules without downloading the AI model
- Play Telegram group games: open Wordle, Hangman and vocabulary rounds from a group session, post every round to the group's scoreboard and ask for the boards with `/top`
- Sign a device in to its Telegram account through a one-time bot link, from settings or the save-your-progress hint, and out again
- Add `/version` to the bot, with the app version and a link to its changelog entry
- Redesign settings as four folding cards with one-line summaries, shared row and segmented controls, and a device card with a real WebGPU check (device plus a compute shader) before the first on-device model
- Add false friends for learners coming from Russian, Ukrainian, Portuguese, English and German, with meanings in the learner's language
- Run the word-order mode on a sentence builder that builds correct German and English sentences from a checked lexicon
- Celebrate unlocks with a badge, rays, confetti and a one-tap way to wear the new item, and open game tutorials over the running round with game settings in a bottom sheet
- Show quiz counters, scores, recap minutes and ETAs in the learner's number format

### Improved
- Run every worker (WAV encoder, voices, on-device LLM) on one typed request/reply protocol
- Validate every `api/` reply with Valibot through one typed fetch client, and port the server functions to TypeScript
- Snapshot a v1.0.0 learner's local data and test that the current readers keep it
- Make the start page more joyful: drifting letter tiles, a waving title, a hopping cast, cards that pop in and wiggly icons
- Link the update sheet to its changelog entry

### Fixed
- Decline weak masculine nouns, drop doubled adjective endings and keep verb examples right for every person
- Keep the day after a sync by accepting `sentence_completed` in the streak endpoint, and keep `best_streak` a number when an event leaves it unset
- Keep the game toolbar clear of Telegram's header

## v1.4.0 - 2026-11-10

A welcome flow, a placement test that sets the level, and a progress page for the exam.

### New
- Introduce Mia, Tom and Lilith with an animated welcome flow, and let Lilith stroll between them on a walk cycle
- Add a yes/no vocabulary placement model with invented words, then an adaptive placement exam with meaning, article and grammar questions and guessing-corrected scoring
- Store placements as four-weekly checkpoints spaced by the daily word goal, with a trend and the next due date
- Keep a weekly snapshot of level mastery and forecast when 80 % of the level will be known
- Rebuild the progress page around exam preparation: a readiness ring, next steps, skill tiles, the level ladder and a step-by-step readiness explanation with the learner's own numbers
- Name the grammar features each German prompt tests, label them in German and English, log tested and wrong answers, track accuracy per feature, and plan a session for the weakest feature from the home screen
- Distinguish a downloaded model from one loaded into memory with badges, and always grade writing with the on-device model, asking for its download before the first grade
- Add one progress component for downloads, loading into memory and updates, with Lilith walking around the word and story loaders
- Add a fire to the what's new sheet's go button

### Improved
- Ask before large downloads on mobile data or with data saver on
- Check that every locale matches the German keys and placeholders

### Fixed
- Show wrong answers in red instead of greyed out, in texts, stories and quizzes
- Translate the empty Telegram share text in four locales

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
