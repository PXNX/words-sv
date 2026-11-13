<!--
  Scribble: draw a word, guess a drawing. Three ways to play:
  - Lilith draws: she sketches a word's picture stroke by stroke; the sooner the learner picks the
    right word, the more points.
  - Draw for a friend: pick one of three words, draw it, hand the phone over; the friend picks
    the word from four.
  - In a Telegram group (opened from the bot's Scribble game with a session): the player whose turn
    it is picks a word and draws it; the picture goes to the group, where the others guess it by
    replying to it (bot/bot/scribble.py).
-->
<script lang="ts">
  import * as v from 'valibot';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { playErrorSound, playSuccessSound } from '#lib/feedback/sounds.js';
  import { callApi, ApiError } from '#lib/api/client.js';
  import { groupGame } from '#lib/games/groupGame.svelte.js';
  import { pictureFor, pictureTranslations } from '#lib/learn/pictures.js';
  import { spokenWord, wordMetadata, type Language } from '#lib/data/vocabulary.js';
  import DrawPad from './DrawPad.svelte';
  import LilithSketch from './LilithSketch.svelte';
  import ScribbleInvite from './ScribbleInvite.svelte';
  import { answerOptions, drawableWords, guessPoints, pickWords } from './scribble';
  import IconBrush from '~icons/material-symbols/brush-rounded';
  import IconVisibility from '~icons/material-symbols/visibility-rounded';
  import IconSend from '~icons/material-symbols/send-rounded';
  import IconArrowBack from '~icons/material-symbols/arrow-back-rounded';

  let { pools, language }: { pools: string[][]; language: string } = $props();

  type View = 'menu' | 'guess' | 'choose' | 'draw' | 'pass' | 'friend' | 'sent';
  const locale = $derived({ locale: settings.interfaceLocale });
  const lang = $derived(language as Language);
  const inGroup = $derived(groupGame.session?.game === 'scribble');

  // Concrete words with a picture: nouns of the learner's level first, then of every level.
  const words = $derived.by(() => {
    const nouns = (pool: string[]) => pool.filter((word) => (wordMetadata[lang]?.[word] as { type?: string } | undefined)?.type !== 'verb');
    const [first = [], ...rest] = pools;
    const level = drawableWords(language, nouns(first));
    return level.length >= 12 ? level : drawableWords(language, nouns([...first, ...rest.flat()]));
  });

  let view = $state<View>('menu');
  let target = $state('');
  let options = $state<string[]>([]);
  let choices = $state<string[]>([]);
  let picked = $state<string | null>(null);
  let progress = $state(0);
  let score = $state(0);
  let rounds = $state(0);
  let drawing = $state('');
  let lines = $state(0);
  let sending = $state(false);
  let error = $state('');
  let pad = $state<DrawPad>();

  const finished = $derived(picked !== null);
  const right = $derived(picked === target);
  const display = (word: string) => spokenWord(lang, word);

  $effect(() => {
    if (inGroup && view === 'menu') startDrawing();
  });

  function startGuessing() {
    target = pickWords(words, 1)[0] ?? '';
    options = answerOptions(target, words, language);
    picked = null;
    progress = 0;
    view = 'guess';
  }

  function pickGuess(word: string) {
    if (finished) return;
    picked = word;
    rounds += 1;
    if (word === target) {
      score += guessPoints(progress);
      playSuccessSound(settings.sound, 'wordle');
      haptic('win');
    } else {
      playErrorSound(settings.sound, 'vocab');
      haptic('tap');
    }
  }

  function startDrawing() {
    choices = pickWords(words, 3);
    target = '';
    lines = 0;
    error = '';
    view = 'choose';
  }

  function choose(word: string) {
    target = word;
    view = 'draw';
  }

  function finishDrawing() {
    drawing = pad?.exportImage() ?? '';
    if (inGroup) {
      void sendToGroup();
      return;
    }
    options = answerOptions(target, words, language);
    picked = null;
    view = 'pass';
  }

  function friendGuess(word: string) {
    if (finished) return;
    picked = word;
    if (word === target) {
      playSuccessSound(settings.sound, 'wordle');
      haptic('win');
    } else playErrorSound(settings.sound, 'vocab');
  }

  /** Every way the group may name the word: as written, with its article, and in German or English. */
  function answersFor(word: string): string[] {
    return [...new Set([word, display(word), ...pictureTranslations(language, word)])];
  }

  const SentSchema = v.object({ ok: v.literal(true) });
  async function sendToGroup() {
    const session = groupGame.session;
    if (!session || sending) return;
    sending = true;
    error = '';
    try {
      await callApi('/api/games/scribble', SentSchema, { body: { session: session.session, word: display(target), answers: answersFor(target), image: drawing } });
      haptic('win');
      view = 'sent';
    } catch (failure) {
      const code = failure instanceof ApiError ? failure.code : '';
      error = code === 'not_your_turn' ? m.scribble_error_turn({}, locale) : code === 'round_running' ? m.scribble_error_running({}, locale) : m.scribble_error_send({}, locale);
    } finally {
      sending = false;
    }
  }

  function closeTelegram() {
    const webApp = (window as { Telegram?: { WebApp?: { close?: () => void } } }).Telegram?.WebApp;
    if (webApp?.close) webApp.close();
    else history.back();
  }
</script>

<section class="scribble" aria-labelledby="scribble-title">
  <header class="scribble-head">
    {#if view !== 'menu' && !inGroup}<button type="button" class="scribble-back" onclick={() => (view = 'menu')} aria-label={m.scribble_back({}, locale)}><IconArrowBack aria-hidden="true" class="rtl:rotate-180" /></button>{/if}
    <h1 id="scribble-title">{m.scribble_title({}, locale)}</h1>
    {#if view === 'guess'}<span class="scribble-score" aria-live="polite">{m.scribble_score({ score: num(score) }, locale)}</span>{/if}
    {#if !inGroup}<ScribbleInvite />{/if}
  </header>

  {#if words.length < 4}
    <p class="scribble-note">{m.scribble_unavailable({}, locale)}</p>
  {:else if view === 'menu'}
    <div class="scribble-menu">
      <button type="button" class="scribble-card panel-play" onclick={startGuessing}>
        <span class="scribble-card-icon" aria-hidden="true"><IconVisibility /></span>
        <strong>{m.scribble_mode_guess({}, locale)}</strong>
        <small>{m.scribble_mode_guess_text({}, locale)}</small>
      </button>
      <button type="button" class="scribble-card panel-play" onclick={startDrawing}>
        <span class="scribble-card-icon" aria-hidden="true"><IconBrush /></span>
        <strong>{m.scribble_mode_draw({}, locale)}</strong>
        <small>{m.scribble_mode_draw_text({}, locale)}</small>
      </button>
      <p class="scribble-note">{m.scribble_group_hint({}, locale)}</p>
    </div>
  {:else if view === 'guess'}
    <div class="scribble-stage">
      {#key target}<LilithSketch emoji={pictureFor(language, target) ?? '?'} reveal={finished} label={m.scribble_sketch_label({}, locale)} onprogress={(value) => (progress = value)} />{/key}
      <p class="scribble-prompt">{finished ? (right ? m.scribble_right({ points: num(guessPoints(progress)) }, locale) : m.scribble_wrong({ word: display(target) }, locale)) : m.scribble_guess_prompt({}, locale)}</p>
      <div class="scribble-options">
        {#each options as option (option)}
          <button type="button" class="btn-play" class:right={finished && option === target} class:wrong={finished && option === picked && option !== target} disabled={finished} onclick={() => pickGuess(option)}>{display(option)}</button>
        {/each}
      </div>
      {#if finished}<button type="button" class="btn-play btn-play-ink" onclick={startGuessing}>{m.scribble_next({}, locale)}</button>{/if}
      {#if rounds > 0}<small class="scribble-note">{m.scribble_rounds({ count: num(rounds) }, locale)}</small>{/if}
    </div>
  {:else if view === 'choose'}
    <div class="scribble-stage">
      <p class="scribble-prompt">{inGroup ? m.scribble_choose_group({}, locale) : m.scribble_choose({}, locale)}</p>
      <div class="scribble-options">
        {#each choices as choice (choice)}
          <button type="button" class="btn-play scribble-choice" onclick={() => choose(choice)}><span aria-hidden="true">{pictureFor(language, choice)}</span>{display(choice)}</button>
        {/each}
      </div>
    </div>
  {:else if view === 'draw'}
    <div class="scribble-stage">
      <p class="scribble-prompt">{m.scribble_draw_prompt({ word: display(target) }, locale)}</p>
      <DrawPad bind:this={pad} onchange={(count) => (lines = count)} />
      <button type="button" class="btn-play btn-play-ink" disabled={lines === 0 || sending} onclick={finishDrawing}>
        {#if inGroup}<IconSend aria-hidden="true" />{sending ? m.scribble_sending({}, locale) : m.scribble_send({}, locale)}{:else}{m.scribble_done({}, locale)}{/if}
      </button>
      {#if error}<p class="scribble-error" role="alert">{error}</p>{/if}
    </div>
  {:else if view === 'pass'}
    <div class="scribble-stage">
      <p class="scribble-prompt">{m.scribble_pass({}, locale)}</p>
      <button type="button" class="btn-play btn-play-ink" onclick={() => (view = 'friend')}>{m.scribble_pass_ready({}, locale)}</button>
    </div>
  {:else if view === 'friend'}
    <div class="scribble-stage">
      <img class="scribble-drawing" src={drawing} alt={m.scribble_drawing_alt({}, locale)} />
      <p class="scribble-prompt">{finished ? (right ? m.scribble_friend_right({}, locale) : m.scribble_wrong({ word: display(target) }, locale)) : m.scribble_friend_prompt({}, locale)}</p>
      <div class="scribble-options">
        {#each options as option (option)}
          <button type="button" class="btn-play" class:right={finished && option === target} class:wrong={finished && option === picked && option !== target} disabled={finished} onclick={() => friendGuess(option)}>{display(option)}</button>
        {/each}
      </div>
      {#if finished}<button type="button" class="btn-play btn-play-ink" onclick={startDrawing}>{m.scribble_swap({}, locale)}</button>{/if}
    </div>
  {:else if view === 'sent'}
    <div class="scribble-stage">
      <img class="scribble-drawing" src={drawing} alt={m.scribble_drawing_alt({}, locale)} />
      <p class="scribble-prompt">{m.scribble_sent({ word: display(target) }, locale)}</p>
      <button type="button" class="btn-play btn-play-ink" onclick={closeTelegram}>{m.scribble_back_to_chat({}, locale)}</button>
    </div>
  {/if}
</section>

<style>
  .scribble { display:grid;gap:1rem;width:min(100%, 34rem);margin-inline:auto;padding:1rem 1rem 2rem; }
  .scribble-head { display:flex;align-items:center;gap:.6rem; }
  .scribble-head h1 { flex:1;margin:0;font-family:'DM Serif Display',serif;font-size:1.9rem;font-weight:400; }
  .scribble-back { display:grid;place-items:center;width:2.3rem;height:2.3rem;border:2px solid currentColor;border-radius:50%;background:none;color:inherit;cursor:pointer; }
  .scribble-score { font-weight:900; }
  .scribble-menu { display:grid;gap:.8rem; }
  .scribble-card { display:grid;grid-template-columns:auto 1fr;gap:.2rem .8rem;align-items:center;padding:1rem;text-align:start;color:inherit;font:inherit;cursor:pointer; }
  .scribble-card-icon { grid-row:span 2;display:grid;place-items:center;width:2.8rem;height:2.8rem;border-radius:50%;background:#e6a527;color:#172a45; }
  .scribble-card-icon :global(svg) { width:1.5rem;height:1.5rem; }
  .scribble-card strong { font-size:1.05rem;font-weight:900; }
  .scribble-card small { font-weight:700;opacity:.75; }
  .scribble-stage { display:grid;gap:.8rem;justify-items:stretch; }
  .scribble-prompt { margin:0;text-align:center;font-size:1.05rem;font-weight:800; }
  .scribble-options { display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:.55rem; }
  .scribble-options .right { background:#34824d;color:#fffdf7; }
  .scribble-options .wrong { background:#c4522e;color:#fffdf7; }
  .scribble-choice { gap:.45rem; }
  .scribble-choice span { font-size:1.3rem; }
  .scribble-drawing { width:100%;max-width:22rem;justify-self:center;border:2px solid #172a45;border-radius:1rem;box-shadow:4px 4px 0 #172a45; }
  .scribble-note { margin:0;text-align:center;font-size:.86rem;font-weight:700;opacity:.7; }
  .scribble-error { margin:0;text-align:center;color:#c4522e;font-weight:800; }
</style>
