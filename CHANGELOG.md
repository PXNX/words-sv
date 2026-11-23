# Changelog

Maintained by `scripts/release.ts`. Add entries under "Unreleased" while working; a release
moves them under a new `## vMAJOR.MINOR.PATCH - YYYY-MM-DD` heading (semantic versioning:
features bump MINOR, fixes PATCH, breaking changes MAJOR). Sections: New, Improved, Fixed,
Migration (anything that needs action), Known issues. Within a section, `#### scope` subheadings
group entries by the area they touch (taken from the Conventional Commit scope); entries without
one stay directly under the section. The first line under a release heading is its one-line
summary and the highlight shown in the app. The changelog is English throughout: entries, section
names, scopes and summaries are never translated.

## Unreleased

## v2.5.0 - 2026-11-23

A steadier Scribble lobby, more forgiving word order, a Telegram login you can try without a bot, and a grouped version history.

### New
#### telegram
- Try the Telegram login without a bot, token or database: `TELEGRAM_MOCK=1 bun server/main.ts` answers the Telegram endpoints from an in-memory fake database and links the device straight away, and `VITE_TELEGRAM_MOCK=1 bun run dev` lets the app talk to that server

### Improved
#### changelog
- Group a release's entries by type and scope in the version history, with the scope as a subheading, and keep the whole changelog in English

### Fixed
#### scribble
- Wait for a second player before a live game starts, list every guess for the drawer and the guessers, tidy the header and add a two-tap Leave
- Drop a closed page out of a live game the same way, so the other side never waits on an absent player; the last player leaving resets the table

#### grammar
- Accept more correct word orders, such as a dass/weil/because clause in front and the natural alternatives of hand-checked sentences; when an answer is rejected, show a correct sentence and a Continue button that always advances

## v2.4.0 - 2026-11-16

More English B1 vocabulary, game feedback in the learner's language, and themed error pages.

### Improved
#### data
- Cover the TOEFL vocabulary of PrepScholar's 327-word list and the Magoosh decks at English B1, and add everyday words from Cambridge's B1 Preliminary list, each with a definition and word type; also correct adjectives that were tagged as nouns in A1–B1

#### i18n
- Announce game results and feedback in the language being learnt: Scribble, Hangman, Wordle and group scores now read in the learner's language, with wording added for French, Italian, Spanish, Portuguese and Ukrainian

#### design
- Give error pages their own themed card: 404, 500 and other statuses get their own localized title and text, Lilith's reaction, and a way home or to retry

#### scribble
- Let either player leave a live Scribble game: the leaver drops out of the standings, their turn passes at once and an unfinished drawing is closed, so the other side never waits on an absent player; the last player leaving resets the table

## v2.3.0 - 2026-11-15

Group games from the bot, a group page for Scribble, and fixes across the app.

### New
#### scribble
- Play Scribble in a Telegram group: the group page shows faces, guess bubbles, underlined letter slots, a letter-reveal switch and a winner card, and the group only sees game messages so ordinary chat stays readable
- Let the drawer choose the group round's time (45 s to 3 min), remembered for the group

#### games
- Open Wordle, Hangman and vocabulary from the bot's `/games` inline results with real Play buttons and leaderboards; an unregistered game is skipped quietly, a game opened from Play has no home button, `/start` answers in groups and long emoji names can play

### Fixed
#### telegram
- Speak in Telegram's Mini App again: its webview lists no voices of its own, so the browser voice was silent; the app now hears that and speaks with its rendered voices instead

#### wordle
- Keep the round on a reload when the current row is a rejected guess

#### script
- Stop offering a letter that shares its Latin reading as a wrong answer

#### progress
- Keep finished achievements finished after the activity log rolls over

#### vocab
- Name the streak that can actually be restored in the repair screen, not the best one

#### audio
- Delete the word audio in the settings for real

#### reminders
- Let the deadline warning through and bring the weekly recap once

#### offline
- Keep a newer deployment's page out of this build's cache

#### listen
- Stop regenerating lower-level stories on every visit

#### conversation
- Keep retry and the switch to the device model from stranding the chat

#### sync
- Carry a live streak into a device that has not played today, count each answer once and keep streaks played offline

## v2.2.0 - 2026-11-14

Learn the Ukrainian script, navigate faster, and get more from OpenRouter.

### New
#### script
- Learn the Ukrainian script with an alphabet table and Latin transcription, words shown in their letters with a small transliteration, and a practice mode

#### conversation
- Explain a failed reply with a retry and a switch to the device model, so either action keeps the chat going

#### cloud
- Start with a free OpenRouter model and say so, and explain when the learner's own key has run out of usage

#### offline
- Show how fast an update is downloading in the update sheet

### Improved
#### data
- Finish definitions for English B2, C1 and C2 and add word types throughout A1 to B1

#### nav
- Show a progress bar while a tap's page is on its way, preload the likely next destinations, and fall back to the cached page after a short wait instead of a long one

#### home
- Make holding Lilith burst hearts above her head, and let her purr on every story page

### Fixed
#### grammar
- Stop treating a dropped letter as a plainly typed umlaut

#### offline
- Stop reading a downloaded model loading into memory as downloading

## v2.1.0 - 2026-11-13

Scribble drawing and Telegram groups, English definitions, and a wider layout.

### New
#### scribble
- Draw against the clock: Lilith draws in colour at three difficulties while a countdown runs, with invite links for a friend and champion achievements for the winners
- Add Scribble to a group with `?startgroup=scribble`, with turns, guesses by reply, points and time-outs

#### bot
- List the games as inline results with logo and description

#### store
- Add a small donate button in the settings with a custom Stars amount, and accept any donation from 500 Stars in the bot

#### data
- Put definitions on English A1, A2 and B1 words

#### profile
- Put more avatar items behind achievements as unlockable bundles

### Improved
#### layout
- Widen the pages on tablets and desktops: the framed sheet grows, the home screen shows its two columns earlier, and the progress panels and repeat groups sit side by side instead of trailing down one phone column (phones unchanged)

#### settings
- Put the learning language and the interface language together in one box in the settings, each with its own name, hint and dropdown, so it is clear which language is being learnt and which one the app speaks
- Rework the model cards in the settings: a radio, the name, size, memory and one line about it, and beneath them the model's state with the one action that fits it (its download with the size, in use, or delete)
- Show the version history in a sheet over the settings instead of its own page, without links out to GitHub; links to `/changelog` now open the sheet on the settings

#### models
- A voice or model that is not on the device yet stays chosen and says so on its card instead of falling back to "no language model"; downloading a model also chooses it

#### onboarding
- Give the first run's introduction the sheet to itself: no dock under it, and an update waits until it is done

#### changelog
- Keep the version history English throughout

### Fixed
#### settings
- Keep Sign in with Telegram clickable when the status check fails

## v2.0.0 - 2026-11-12

Loads about half as much up front, shows insights from the learner's own activity, and leads the home screen with the streak.

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
