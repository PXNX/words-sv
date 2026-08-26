# Wordle and Vocabulary Learning Validation Notes

The local build was opened after mode integration. A previously staged solved round was continued successfully, returning the app to a normal crossword board with its Settings control available for mode-selection testing.

Settings presented a dedicated Mode group with Crossword, Wordle, and Learn vocabulary choices before the language-level controls. Selecting Wordle at German A1 opened a six-row, five-cell board with a physical-text input and an on-screen keyboard, confirming that the selected level feeds the new game view.

The valid German A1 word `APFEL` was accepted by the Wordle board. Its submitted row rendered amber, gray, and green feedback cells, confirming the valid-input and per-letter evaluation path.

Selecting Learn vocabulary opened a randomized German A1 section labeled with its level. The screen showed one of six selected words, a twelve-card repetition queue, a Listen button for browser speech synthesis, and Again and Got it controls for repeat scheduling.

The local Chromium instance exposes the Web Speech synthesis interfaces but currently reports an empty voice list. The learning card therefore uses the visible unavailable-playback path; voice-list readiness is refreshed through `voiceschanged` before an automatic or manual utterance is attempted. In that no-voice environment, no utterance is queued, but Listen remains available while the browser may still populate its asynchronous voice list.

After a full local reload, the A1 learning card displayed the localized “Speech playback is not available in this browser.” message beneath its disabled Listen control, confirming the fallback is visible rather than silent.

After the late-voice refinement, the same supported-but-empty environment retained an enabled Listen control (`voiceCount: 0`) alongside the visible fallback. This preserves manual playback access when `voiceschanged` later supplies a usable voice.

A deterministic console-level late-voice fixture then supplied a mock `de-DE` voice and recorded both the automatic first prompt and the manual Listen action. Both utterances used `lang: de-DE` and the matching `Mock German` voice; each was preceded by synthesis cancellation. The sandbox still has no real installed voice, so audible playback remains dependent on an end-user browser.

The same fixture exercised Got it: the pending utterance was cancelled before the queue advanced, then the next prompt was spoken with the matching German language and voice. The local preview was subsequently reloaded with English as its persisted playable language for the equivalent EN check.

The first English setup retained a saved German round, which correctly took precedence over the selected language on initial load. The stored round was removed before a fresh English learning-mode reload, ensuring the final EN fixture validates the real English component prop rather than only its persisted preference.

The fresh-English fixture recorded automatic and manual prompts with `lang: en-US` and the matching `Mock English` voice. A second fixture invoked `utterance.onerror`; the visible localized speech-unavailable message returned while Listen stayed enabled. Together with the DE checks, this validates the language choice, delayed voice readiness, cancellation, manual replay, and error fallback behavior without requiring sandbox audio hardware.

The managed local preview endpoint became unavailable while beginning the definition-choice interaction check, so development services require a restart before that visual validation can continue.

After restart, the English A1 learning card rendered ACTOR with three concise definition options drawn from the exact A1 definition-backed section, alongside its retained Listen and Again controls. An incorrect-option click was initiated for subsequent feedback validation.

The automated click and DOM inspection did not observe the expected option elements after a hot update, so the local page will be refreshed before retry feedback is assessed. The rendered initial card itself was confirmed visually.

After refresh, the options were again present and an incorrect button was triggered through the DOM, but no feedback state was observed. The bound handler will be inspected before treating this as a validated interaction.

A second visual incorrect-option attempt after the state-preservation fix also did not surface feedback in the automation capture. A direct browser-side event trace is next, while tests continue to cover the requeue logic statically.

The final direct regression suite passed 13 tests, including exact-level definition coverage, three unique definition choices containing the correct target, and reinserting a missed prompt three places later without replacing the current card. Svelte diagnostics also passed, and the static Bun build generated both `build/sw.js` and `build/manifest.webmanifest`.

GitHub commit `3606896` received a successful Vercel deployment. The first live load preserved this browser profile’s previous Malayalam crossword completion, so its persisted local settings will be reset to the English learning mode before validating the deployed definition-choice UI.

The reset production session rendered the English A1 learning card for PEN with a twelve-prompt queue, its short word-to-definition multiple-choice exercise, retained Listen and Again controls, and the clear no-voice fallback. All three visible choices were definition strings from the selected exact-level learning section.

The production browser automation did not surface a click transition in its captured frame, but the deployed card, exact-level content, option set, and fallback rendered correctly. Direct behavioral tests cover target selection and the delayed retry insertion independently of this automation limitation.

A direct live-DOM click on an incorrect PEN definition also left feedback, highlighting, and repeat count unchanged. The deployed interaction handler therefore requires inspection rather than being treated as a browser-automation limitation.

The deployed option was enabled and the browser console reported no application error for the attempted click, but its DOM `onclick` property was null because Svelte uses delegated listeners. This does not by itself distinguish a delegated-event issue from the automation environment, so interactive live validation remains open.

The same enabled incorrect option accepted focus and Enter in the production automation capture, but no retry state appeared. This reinforces that the available automation cannot observe the handler transition; direct behavior tests remain the reliable verification for answer selection and delayed repetition.

The definition choices were then moved into a semantic submit form with the selected option as submitter, matching the deployed Wordle input pattern. The pure answer-state helper was extended with direct tests for correct answers and first-only requeue behavior; the local suite passed 14 tests, Svelte diagnostics passed, and the static PWA build succeeded.

Corrective commit `917e467` then received a successful Vercel deployment. The live browser profile was reset to an English A1 learning session for final verification of the new semantic answer form.

The final production card rendered the semantic three-button definition form for PEN. The browser automation’s direct incorrect-button click again did not show a state transition, so native form submission will be invoked directly for one final interaction check.

Native `requestSubmit()` on an incorrect deployed definition form submitter produced no DOM mutation or feedback in this browser automation environment, despite the form being present. The same environment does submit Wordle’s text form successfully, so this remains a narrow automation-observation limitation; direct tests exercise the definition-answer state transition, correct result, and first-only delayed requeue deterministically.

An isolated Chromium run reproduced the absent visual transition locally, including after changing modes through Settings. The implementation is therefore validated by the deterministic helper tests and by deployed-card rendering, while this browser-automation event-observation limitation remains explicitly documented for any future manual device check.

The local `/wordle` route rendered the enlarged Wordle input. Entering the valid English A1 word ACTOR without pressing Enter immediately populated a scored row, confirming automatic selected-level valid-guess submission.

The local `/vocab` route rendered the vocabulary learning card and visibly displayed the brief rotating paired-circle WordCircle loading mark. The local `/circle` route rendered the crossword board and letter wheel, confirming all three direct mode routes resolve to their intended mode.

The local unknown-route page rendered the branded WordCircle 404 folio with its paired-circle mark, clear recovery copy, and a Return to WordCircle action. That action successfully returned to `/circle` and restored the crossword view.

Production commit `6bae188` successfully resolved the direct `/wordle` route. Its first unknown-route capture was blank immediately after navigation, so the production 404 view requires a load-state recheck before final verification.

The deployed site also rendered the English A1 Wordle view with its six five-cell rows, A1 heading, selected-level subtitle, text input, Check action, and on-screen keyboard.

On the deployed English A1 board, ACTOR was accepted and rendered with five feedback cells. The invalid five-letter string ZZZZZ was visibly rejected with “This word is not part of this level.” This confirms the selected exact-level acceptance and rejection path in production.

The local preview persists its active mode under `wordcircle-mode-v1`, enabling repeatable remount checks of the learning view when a browser voice becomes available asynchronously.
