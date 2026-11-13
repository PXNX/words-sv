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
  import { answerOptions, checkGuess, DIFFICULTIES, drawableWords, pickDifficulty, pickWords, roundPoints, type Difficulty } from './scribble';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconCross from '~icons/material-symbols/close-rounded';
  import IconTimer from '~icons/material-symbols/timer-rounded';
  import IconShuffle from '~icons/material-symbols/shuffle-rounded';
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
  let score = $state(0);
  let difficulty = $state<Difficulty>('easy');
  let timeLeft = $state(0);
  let timedOut = $state(false);
  let lastPoints = $state(0);
  let typed = $state('');
  let hint = $state<'close' | 'wrong' | ''>('');
  let timer: ReturnType<typeof setInterval> | undefined;
  // Spell the answer instead of picking it from four: remembered on this device.
  const SPELL_KEY = 'wordcircle-scribble-spell';
  let spell = $state(readSpell());
  function readSpell() {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem(SPELL_KEY) === '1'; } catch { return false; }
  }
  function setSpell(value: boolean) {
    spell = value;
    try { localStorage.setItem(SPELL_KEY, value ? '1' : '0'); } catch { /* not remembered, still on for now */ }
  }
  let rounds = $state(0);
  let drawing = $state('');
  let lines = $state(0);
  let sending = $state(false);
  let error = $state('');
  let pad = $state<DrawPad>();

  const finished = $derived(picked !== null);
  const right = $derived(picked === target);
  const rule = $derived(DIFFICULTIES[difficulty]);
  const difficultyLabel = $derived(difficulty === 'easy' ? m.scribble_easy({}, locale) : difficulty === 'medium' ? m.scribble_medium({}, locale) : m.scribble_hard({}, locale));
  const display = (word: string) => spokenWord(lang, word);

  $effect(() => {
    if (inGroup && view === 'menu') startDrawing();
  });

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = undefined;
  }
  $effect(() => stopTimer);

  function resetAnswer() {
    picked = null;
    typed = '';
    hint = '';
    timedOut = false;
    lastPoints = 0;
  }

  function startGuessing() {
    stopTimer();
    target = pickWords(words, 1)[0] ?? '';
    options = answerOptions(target, words, language);
    difficulty = pickDifficulty();
    resetAnswer();
    view = 'guess';
    timeLeft = DIFFICULTIES[difficulty].seconds;
    const ends = Date.now() + timeLeft * 1000;
    timer = setInterval(() => {
      timeLeft = Math.max(0, (ends - Date.now()) / 1000);
      if (timeLeft > 0) return;
      timedOut = true;
      finishGuess('');
    }, 200);
  }

  /** Ends Lilith's round: `word` is the answer given ('' for a wrong spelling or no answer in time). */
  function finishGuess(word: string) {
    if (finished) return;
    stopTimer();
    picked = word;
    rounds += 1;
    if (word === target) {
      lastPoints = roundPoints(difficulty, timeLeft / rule.seconds);
      score += lastPoints;
      playSuccessSound(settings.sound, 'wordle');
      haptic('win');
    } else {
      playErrorSound(settings.sound, 'vocab');
      haptic('tap');
    }
  }

  /** A spelled answer: right ends the round, close or wrong lets the learner try again while time is left. */
  function submitSpelling(onRight: (word: string) => void) {
    if (finished || !typed.trim()) return;
    const result = checkGuess(typed, answersFor(target));
    if (result === 'right') {
      hint = '';
      onRight(target);
      return;
    }
    hint = result === 'close' ? 'close' : 'wrong';
    typed = '';
    playErrorSound(settings.sound, 'vocab');
    haptic('tap');
  }

  function startDrawing() {
    stopTimer();
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
    resetAnswer();
    view = 'pass';
  }

  function friendGuess(word: string) {
    if (finished) return;
    picked = word;
    hint = '';
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

{#snippet optionButtons(onpick: (word: string) => void)}
  <div class="scribble-options">
    {#each options as option (option)}
      {@const isRight = finished && option === target}
      {@const isWrong = finished && option === picked && option !== target}
      <button type="button" class="btn-play" class:right={isRight} class:wrong={isWrong} disabled={finished} onclick={() => onpick(option)}>
        {display(option)}{#if isRight}<IconCheck aria-label={m.scribble_mark_right({}, locale)} />{:else if isWrong}<IconCross aria-label={m.scribble_mark_wrong({}, locale)} />{/if}
      </button>
    {/each}
  </div>
{/snippet}

{#snippet spellForm(onright: (word: string) => void)}
  <form class="scribble-spell" onsubmit={(event) => { event.preventDefault(); submitSpelling(onright); }}>
    <!-- svelte-ignore a11y_autofocus -->
    <input type="text" bind:value={typed} autocomplete="off" autocapitalize="off" spellcheck="false" autofocus aria-label={m.scribble_spell_label({}, locale)} placeholder={m.scribble_spell_placeholder({}, locale)} class:close={hint === 'close'} />
    <button type="submit" class="btn-play btn-play-ink" disabled={!typed.trim()}>{m.scribble_spell_submit({}, locale)}</button>
  </form>
{/snippet}

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
      <label class="scribble-setting"><input type="checkbox" class="toggle toggle-sm toggle-primary" checked={spell} onchange={(event) => setSpell((event.currentTarget as HTMLInputElement).checked)} /><span><strong>{m.scribble_spell({}, locale)}</strong><small>{m.scribble_spell_hint({}, locale)}</small></span></label>
      <p class="scribble-note">{m.scribble_group_hint({}, locale)}</p>
    </div>
  {:else if view === 'guess'}
    <div class="scribble-stage">
      <div class="scribble-round">
        <span class="scribble-level {difficulty}">{difficultyLabel}{#if rule.multiplier > 1} ×{num(rule.multiplier)}{/if}</span>
        <span class="scribble-time" class:low={timeLeft <= 5 && !finished}><IconTimer aria-hidden="true" />{num(Math.ceil(timeLeft))}</span>
      </div>
      <div class="scribble-timer" role="progressbar" aria-label={m.scribble_time_left({}, locale)} aria-valuemin={0} aria-valuemax={rule.seconds} aria-valuenow={Math.ceil(timeLeft)}><i style:width="{(timeLeft / rule.seconds) * 100}%" class:low={timeLeft <= 5}></i></div>
      {#key target}<LilithSketch emoji={pictureFor(language, target) ?? '?'} {rule} duration={rule.seconds * rule.drawShare * 1000} reveal={finished} label={m.scribble_sketch_label({}, locale)} />{/key}
      <p class="scribble-prompt" aria-live="polite">
        {#if finished}<span class="scribble-mark" class:right aria-hidden="true">{#if right}<IconCheck />{:else}<IconCross />{/if}</span>{/if}
        {finished ? (right ? m.scribble_right({ points: num(lastPoints) }, locale) : timedOut ? m.scribble_timeout({ word: display(target) }, locale) : m.scribble_wrong({ word: display(target) }, locale)) : hint === 'close' ? m.scribble_close({}, locale) : hint === 'wrong' ? m.scribble_try_again({}, locale) : m.scribble_guess_prompt({}, locale)}
      </p>
      {#if spell}
        {#if !finished}{@render spellForm(finishGuess)}{/if}
      {:else}
        {@render optionButtons(finishGuess)}
      {/if}
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
      <button type="button" class="scribble-reroll" onclick={() => (choices = pickWords(words, 3))}><IconShuffle aria-hidden="true" />{m.scribble_other_words({}, locale)}</button>
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
      <p class="scribble-prompt" aria-live="polite">
        {#if finished}<span class="scribble-mark" class:right aria-hidden="true">{#if right}<IconCheck />{:else}<IconCross />{/if}</span>{/if}
        {finished ? (right ? m.scribble_friend_right({}, locale) : m.scribble_wrong({ word: display(target) }, locale)) : hint === 'close' ? m.scribble_close({}, locale) : hint === 'wrong' ? m.scribble_try_again({}, locale) : m.scribble_friend_prompt({}, locale)}
      </p>
      {#if spell}
        {#if !finished}
          {@render spellForm(friendGuess)}
          <button type="button" class="scribble-reroll" onclick={() => friendGuess('')}>{m.scribble_give_up({}, locale)}</button>
        {/if}
      {:else}
        {@render optionButtons(friendGuess)}
      {/if}
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
  .scribble-options .btn-play { gap:.35rem; }
  .scribble-options .btn-play :global(svg) { width:1.15rem;height:1.15rem; }
  .scribble-mark { display:inline-grid;place-items:center;width:1.6rem;height:1.6rem;margin-inline-end:.35rem;border-radius:50%;background:#c4522e;color:#fffdf7;vertical-align:middle; }
  .scribble-mark.right { background:#34824d; }
  .scribble-mark :global(svg) { width:1.1rem;height:1.1rem; }
  .scribble-round { display:flex;align-items:center;justify-content:space-between;gap:.6rem; }
  .scribble-level { padding:.15rem .6rem;border-radius:999px;font-size:.8rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;background:#d9efdd;color:#1f5a33; }
  .scribble-level.medium { background:#fbe9c4;color:#7a4f00; }
  .scribble-level.hard { background:#f6d5c9;color:#8a2c12; }
  .scribble-time { display:inline-flex;align-items:center;gap:.25rem;font-weight:900;font-variant-numeric:tabular-nums; }
  .scribble-time :global(svg) { width:1.1rem;height:1.1rem; }
  .scribble-time.low { color:#c4522e; }
  .scribble-timer { height:.5rem;border-radius:999px;background:color-mix(in srgb, currentColor 14%, transparent);overflow:hidden; }
  .scribble-timer i { display:block;height:100%;border-radius:inherit;background:#34824d;transition:width .2s linear, background-color .3s; }
  .scribble-timer i.low { background:#c4522e; }
  .scribble-spell { display:flex;gap:.5rem; }
  .scribble-spell input { flex:1;min-width:0;padding:.6rem .8rem;border:2px solid currentColor;border-radius:.8rem;background:none;color:inherit;font:inherit;font-size:1.05rem;font-weight:800; }
  .scribble-spell input.close { border-color:#e6a527; }
  .scribble-reroll { display:inline-flex;align-items:center;justify-self:center;gap:.3rem;padding:.3rem .6rem;border:0;background:none;color:inherit;font:inherit;font-size:.9rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer;opacity:.8; }
  .scribble-reroll :global(svg) { width:1.05rem;height:1.05rem; }
  .scribble-setting { display:flex;align-items:center;gap:.7rem;padding:.2rem .3rem;cursor:pointer; }
  .scribble-setting span { display:grid;gap:.1rem; }
  .scribble-setting small { font-size:.82rem;font-weight:700;opacity:.7; }
</style>
