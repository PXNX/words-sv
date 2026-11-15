<!--
  Script: learn the writing system of a language that uses another script. Every letter is a card
  with its name (tap to hear it) and its Latin reading; the quiz then asks every letter once, in a
  random direction, and the ones that slipped come back on the result card.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { playErrorSound, playSuccessSound } from '#lib/feedback/sounds.js';
  import { shuffled } from '#lib/grammar/learning.js';
  import { scriptFor, type ScriptLetter } from '#lib/script/script.js';
  import type { Language } from '#lib/data/vocabulary.js';

  let { language }: { language: Language } = $props();

  const info = $derived(scriptFor(language));
  const locale = $derived({ locale: settings.interfaceLocale });

  let stage = $state<'learn' | 'quiz' | 'result'>('learn');
  let tapped = $state<Set<string>>(new Set());
  let questions = $state<readonly Question[]>([]);
  let index = $state(0);
  let picked = $state<string | null>(null);
  let known = $state(0);
  let missed = $state<readonly ScriptLetter[]>([]);

  type Question = { cue: string; options: readonly string[]; answer: string; letter: ScriptLetter; askScript: boolean };

  const SPEECH_LOCALE: Record<string, string> = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' };

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALE[language] ?? language;
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function startQuiz() {
    if (!info) return;
    const letters = shuffled([...info.letters], Math.random);
    questions = letters.map((letter) => {
      const askScript = Math.random() < 0.5;
      // Two letters can share a Latin reading (И and Й are both "y"): such a twin is never offered
      // next to the asked letter, or a right answer would be marked wrong.
      const others = shuffled(letters.filter((other) => other.letter !== letter.letter && other.latin !== letter.latin), Math.random).slice(0, 3);
      const options = askScript
        ? shuffled([letter, ...others], Math.random).map((option) => option.letter)
        : shuffled([letter, ...others], Math.random).map((option) => option.latin);
      return { cue: askScript ? letter.latin : letter.letter, options, answer: askScript ? letter.letter : letter.latin, letter, askScript };
    });
    index = 0;
    picked = null;
    known = 0;
    missed = [];
    stage = 'quiz';
  }

  function choose(option: string) {
    const question = questions[index]!;
    if (picked !== null) return;
    picked = option;
    const right = option === question.answer;
    if (right) {
      known += 1;
      playSuccessSound(settings.sound, 'vocab');
    } else {
      missed = [...missed, question.letter];
      playErrorSound(settings.sound, 'vocab');
    }
    window.setTimeout(() => {
      if (index + 1 < questions.length) {
        index += 1;
        picked = null;
      } else {
        stage = 'result';
      }
    }, 650);
  }
</script>

<main class="script" dir={info?.direction ?? 'auto'} lang={language}>
  {#if !info}
    <p class="script-empty">{m.script_unavailable({}, locale)}</p>
  {:else if stage === 'learn'}
    <header class="script-header">
      <div>
        <p class="script-kicker">{m.script_kicker({}, locale)}</p>
        <h1>{m.script_learn({}, locale)}</h1>
      </div>
      <button type="button" class="btn-play" onclick={startQuiz}>{m.script_quiz({}, locale)}</button>
    </header>
    <div class="script-grid">
      {#each info.letters as letter (letter.letter)}
        <button
          type="button"
          class="script-card"
          class:script-new={!tapped.has(letter.letter)}
          onclick={() => {
            tapped = new Set(tapped).add(letter.letter);
            haptic('tap');
            speak(letter.name ?? letter.letter);
          }}
        >
          <span class="script-letter" dir={info.direction}>{letter.letter}</span>
          <span class="script-latin">{letter.latin}</span>
          <span class="script-name">{letter.name ?? ''}</span>
        </button>
      {/each}
    </div>
  {:else if stage === 'quiz'}
    <p class="script-progress">{index + 1} / {questions.length}</p>
    {#key index}
      <div class="script-question">
        <p class="script-cue">
          {questions[index]!.askScript
            ? m.script_pick_script({ latin: questions[index]!.cue }, locale)
            : m.script_pick_latin({ letter: questions[index]!.cue }, locale)}
        </p>
        <div class="script-options">
          {#each questions[index]!.options as option}
            <button
              type="button"
              class="script-option"
              class:script-right={picked !== null && option === questions[index]!.answer}
              class:script-wrong={picked === option && option !== questions[index]!.answer}
              disabled={picked !== null}
              onclick={() => choose(option)}
            >{option}</button>
          {/each}
        </div>
      </div>
    {/key}
  {:else}
    <p class="script-result">{m.script_result({ known, total: info.letters.length }, locale)}</p>
    {#if missed.length}
      <p class="script-missed-label">{m.script_missed({}, locale)}</p>
      <div class="script-missed">
        {#each missed as letter (letter.letter)}<span class="script-chip" dir={info.direction}>{letter.letter} <small>{letter.latin}</small></span>{/each}
      </div>
    {/if}
    <button type="button" class="btn-play" onclick={startQuiz}>{m.script_again({}, locale)}</button>
  {/if}
</main>

<style>
  .script { flex:1;min-height:0;overflow-y:auto;width:100%;max-width:40rem;margin-inline:auto;padding:clamp(3.2rem,10vw,3.8rem) clamp(1rem,5vw,2rem) 2rem;display:grid;align-content:start;gap:.9rem;font-family:'DM Sans',sans-serif; }
  .script-empty { margin:0;font-size:.95rem;font-weight:700;opacity:.7; }
  .script-header { display:flex;align-items:end;justify-content:space-between;gap:.8rem; }
  .script-kicker { margin:0;color:#a45e38;font-size:.8125rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  :global(html.dark) .script-kicker { color:#e6a527; }
  .script-header h1 { margin:0;font-family:'DM Serif Display',serif;font-size:1.8rem;font-weight:400;line-height:1.05; }
  .script-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(6rem,1fr));gap:.55rem; }
  .script-card { position:relative;display:grid;justify-items:center;gap:.1rem;padding:.7rem .4rem;border:1.5px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:1rem;background:color-mix(in srgb,currentColor 4%,transparent);color:inherit;font:inherit;cursor:pointer;transition:background-color .15s,translate .15s; }
  .script-card:hover { background:color-mix(in srgb,#e6a527 14%,transparent);translate:0 -2px; }
  .script-letter { font-family:'DM Serif Display',serif;font-size:1.9rem;font-weight:700;line-height:1.1; }
  .script-latin { font-size:.84rem;font-weight:800;opacity:.75; }
  .script-name { font-size:.72rem;font-weight:600;opacity:.55; }
  .script-new::after { content:'';position:absolute;top:.4rem;inset-inline-end:.4rem;width:.45rem;height:.45rem;border-radius:50%;background:#e6a527; }
  .script-progress { margin:0;font-size:.84rem;font-weight:800;opacity:.6; }
  .script-question { display:grid;gap:.8rem; }
  .script-cue { margin:0;font-size:1.15rem;font-weight:800; }
  .script-options { display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem; }
  .script-option { padding:.9rem .5rem;border:1.5px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:1rem;background:none;color:inherit;font:inherit;font-size:1.3rem;font-weight:900;cursor:pointer;transition:background-color .15s,translate .15s; }
  .script-option:hover:not(:disabled) { background:color-mix(in srgb,#e6a527 14%,transparent); }
  .script-option:disabled { cursor:default; }
  .script-right { background:color-mix(in srgb,#34824d 22%,transparent) !important;border-color:#34824d; }
  .script-wrong { background:color-mix(in srgb,#d64b45 22%,transparent) !important;border-color:#d64b45; }
  .script-result { margin:0;font-size:1.25rem;font-weight:900; }
  .script-missed-label { margin:0;font-size:.8125rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.65; }
  .script-missed { display:flex;flex-wrap:wrap;gap:.4rem; }
  .script-chip { padding:.3rem .6rem;border-radius:999px;background:color-mix(in srgb,currentColor 6%,transparent);font-weight:900; }
  .script-chip small { margin-inline-start:.25rem;font-weight:700;opacity:.65; }
  @media (min-width:900px) { .script-grid { grid-template-columns:repeat(auto-fill,minmax(7rem,1fr)); } }
</style>
