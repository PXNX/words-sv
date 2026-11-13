<!--
  Scribble with a Telegram group, live (server/_lib/scribbleGame.ts). The page asks the server about
  once a second what is going on:
  - your turn: pick one of three words (or ask for others), then draw; every line reaches the
    others while you draw, and you see the clock and who guessed it;
  - someone else draws: watch the picture appear, see the blanks and the clock, type guesses;
  - between turns: whose turn it is, and the match standings (five rounds, then a winner).
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
  import { spokenWord, type Language } from '#lib/data/vocabulary.js';
  import DrawPad from './DrawPad.svelte';
  import LiveCanvas from './LiveCanvas.svelte';
  import { pickWords, type LiveLine } from './scribble';
  import { recordScribbleWins } from './scribbleWins';
  import IconTimer from '~icons/material-symbols/timer-rounded';
  import IconShuffle from '~icons/material-symbols/shuffle-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconTrophy from '~icons/material-symbols/trophy-rounded';

  let { words, language }: { words: string[]; language: string } = $props();

  const POLL_MS = 1000;
  const SEND_MS = 600;
  const LineSchema = v.object({ c: v.string(), s: v.number(), p: v.array(v.number()) });
  const StateSchema = v.object({
    ok: v.literal(true),
    role: v.picklist(['draw', 'watch', 'wait']),
    me: v.object({ name: v.string(), wins: v.number() }),
    drawer: v.nullable(v.string()),
    roundSeconds: v.number(),
    roundTimes: v.array(v.number()),
    turnSecondsLeft: v.number(),
    round: v.nullable(v.object({
      id: v.number(),
      status: v.picklist(['drawing', 'solved', 'timeout']),
      drawer: v.string(),
      mine: v.boolean(),
      letters: v.number(),
      word: v.nullable(v.string()),
      guesser: v.nullable(v.string()),
      guessedByMe: v.boolean(),
      points: v.nullable(v.number()),
      seconds: v.number(),
      secondsLeft: v.number(),
      version: v.number(),
      lines: v.nullable(v.array(LineSchema))
    })),
    match: v.object({ round: v.number(), of: v.number(), standings: v.array(v.object({ name: v.string(), points: v.number(), me: v.boolean() })) })
  });
  type State = v.InferOutput<typeof StateSchema>;
  const OkSchema = v.object({ ok: v.literal(true) });
  const StartSchema = v.object({ ok: v.literal(true), round: v.number() });
  const GuessSchema = v.object({ ok: v.literal(true), result: v.picklist(['right', 'close', 'wrong', 'none']) });

  const locale = $derived({ locale: settings.interfaceLocale });
  const lang = $derived(language as Language);
  const session = $derived(groupGame.session?.session ?? '');
  const display = (word: string) => spokenWord(lang, word);

  let game = $state<State | null>(null);
  let failed = $state('');
  let lines = $state.raw<LiveLine[]>([]);
  let version = -1;
  let roundId = 0;
  let choices = $state<string[]>([]);
  let chosen = $state('');
  let starting = $state(false);
  // The drawer's choice of round time; the group's last choice until they pick another.
  let seconds = $state<number | null>(null);
  let typed = $state('');
  let hint = $state<'close' | 'wrong' | ''>('');
  let pending: LiveLine[] | null = null;
  let sending = false;

  const round = $derived(game?.round ?? null);
  const drawing = $derived(round?.status === 'drawing');
  const iDraw = $derived(Boolean(round?.mine && drawing));
  const blanks = $derived(round ? Array.from({ length: round.letters }, () => '_').join(' ') : '');

  async function poll() {
    if (!session) return;
    try {
      const next = await callApi('/api/games/scribble', StateSchema, { body: { action: 'state', session, since: version, locale: settings.interfaceLocale } });
      failed = '';
      if (next.round?.id !== roundId) {
        roundId = next.round?.id ?? 0;
        version = -1;
        lines = [];
        typed = '';
        hint = '';
      }
      // The drawer keeps their own lines; everybody else takes the server's newest.
      if (next.round?.lines && !(next.round.mine && next.round.status === 'drawing')) lines = next.round.lines;
      if (next.round) version = next.round.version;
      if (next.round && next.round.status !== 'drawing' && game?.round?.status === 'drawing') {
        if (next.round.guessedByMe || (next.round.mine && next.round.status === 'solved')) { playSuccessSound(settings.sound, 'wordle'); haptic('win'); }
      }
      if (next.role === 'draw' && !next.round?.mine && choices.length === 0) choices = pickWords(words, 3);
      if (next.role !== 'draw') { choices = []; chosen = ''; }
      recordScribbleWins(next.me.wins);
      game = next;
    } catch (error) {
      failed = error instanceof ApiError && error.code === 'session_expired' ? m.scribble_live_expired({}, locale) : m.scribble_live_offline({}, locale);
    }
  }

  $effect(() => {
    if (!session) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await poll();
      if (!stopped) timer = setTimeout(loop, POLL_MS);
    };
    void loop();
    return () => { stopped = true; clearTimeout(timer); };
  });

  /** Every few hundred milliseconds, the drawer's newest lines go out (one request at a time). */
  $effect(() => {
    const timer = setInterval(() => void flush(), SEND_MS);
    return () => clearInterval(timer);
  });
  async function flush() {
    if (sending || !pending || !iDraw || !round) return;
    const batch = pending;
    pending = null;
    sending = true;
    try {
      await callApi('/api/games/scribble', OkSchema, { body: { action: 'lines', session, round: round.id, lines: batch }, accept: [409] });
    } catch {
      pending ??= batch;
    } finally {
      sending = false;
    }
  }

  function answersFor(word: string): string[] {
    return [...new Set([word, display(word), ...pictureTranslations(language, word)])];
  }

  async function start(word: string) {
    if (starting) return;
    starting = true;
    chosen = word;
    try {
      await callApi('/api/games/scribble', StartSchema, { body: { action: 'start', session, word: display(word), answers: answersFor(word), seconds: seconds ?? game?.roundSeconds ?? 90 } });
      lines = [];
      await poll();
    } catch (error) {
      chosen = '';
      failed = error instanceof ApiError && error.code === 'round_running' ? m.scribble_error_running({}, locale) : error instanceof ApiError && error.code === 'not_your_turn' ? m.scribble_error_turn({}, locale) : m.scribble_error_send({}, locale);
    } finally {
      starting = false;
    }
  }

  async function sendGuess() {
    const text = typed.trim();
    if (!text || !drawing) return;
    typed = '';
    try {
      const reply = await callApi('/api/games/scribble', GuessSchema, { body: { action: 'guess', session, text } });
      if (reply.result === 'right') {
        hint = '';
        playSuccessSound(settings.sound, 'wordle');
        haptic('win');
        await poll();
      } else if (reply.result === 'close' || reply.result === 'wrong') {
        hint = reply.result;
        playErrorSound(settings.sound, 'vocab');
        haptic('tap');
      }
    } catch {
      failed = m.scribble_live_offline({}, locale);
    }
  }

  function closeTelegram() {
    const webApp = (window as { Telegram?: { WebApp?: { close?: () => void } } }).Telegram?.WebApp;
    if (webApp?.close) webApp.close();
    else history.back();
  }
</script>

<div class="group-scribble">
  {#if failed}<p class="live-error" role="alert">{failed}</p>{/if}

  {#if !game}
    <p class="live-note">{m.scribble_live_loading({}, locale)}</p>
  {:else}
    <div class="live-match">
      <span>{m.scribble_live_round({ round: num(Math.max(1, game.match.round)), of: num(game.match.of) }, locale)}</span>
      {#if round && drawing}<span class="live-time" class:low={round.secondsLeft <= Math.min(10, round.seconds / 4)}><IconTimer aria-hidden="true" />{num(round.secondsLeft)}</span>{/if}
    </div>

    {#if game.role === 'draw' && !round?.mine}
      <!-- Your turn: choose the word. -->
      <div class="live-stage">
        <p class="live-prompt">{m.scribble_choose_group({}, locale)}</p>
        <div class="live-options">
          {#each choices as choice (choice)}
            <button type="button" class="btn-play live-choice" disabled={starting} onclick={() => start(choice)}><span aria-hidden="true">{pictureFor(language, choice)}</span>{display(choice)}</button>
          {/each}
        </div>
        <button type="button" class="live-link" disabled={starting} onclick={() => (choices = pickWords(words, 3))}><IconShuffle aria-hidden="true" />{m.scribble_other_words({}, locale)}</button>
        <div class="live-times" role="radiogroup" aria-label={m.scribble_live_round_time({}, locale)}>
          <span><IconTimer aria-hidden="true" />{m.scribble_live_round_time({}, locale)}</span>
          {#each game.roundTimes as option (option)}
            <button type="button" role="radio" aria-checked={(seconds ?? game.roundSeconds) === option} onclick={() => (seconds = option)}>{m.scribble_seconds({ seconds: num(option) }, locale)}</button>
          {/each}
        </div>
        <small class="live-note">{m.scribble_live_turn_left({ seconds: num(game.turnSecondsLeft) }, locale)}</small>
      </div>
    {:else if iDraw && round}
      <div class="live-stage">
        <p class="live-prompt">{m.scribble_draw_prompt({ word: round.word ?? chosen }, locale)}</p>
        <DrawPad onlive={(next) => (pending = next)} />
        <small class="live-note">{m.scribble_live_drawing_hint({}, locale)}</small>
      </div>
    {:else if round}
      <div class="live-stage">
        <LiveCanvas {lines} label={m.scribble_live_canvas({ name: round.drawer }, locale)} />
        {#if drawing}
          <p class="live-prompt">{m.scribble_live_watch({ name: round.drawer }, locale)}</p>
          <p class="live-blanks" aria-label={m.scribble_live_letters({ count: num(round.letters) }, locale)}>{blanks} <small>({num(round.letters)})</small></p>
          <form class="live-guess" onsubmit={(event) => { event.preventDefault(); void sendGuess(); }}>
            <input type="text" bind:value={typed} autocomplete="off" autocapitalize="off" spellcheck="false" aria-label={m.scribble_spell_label({}, locale)} placeholder={m.scribble_spell_placeholder({}, locale)} class:close={hint === 'close'} />
            <button type="submit" class="btn-play btn-play-ink" disabled={!typed.trim()}>{m.scribble_spell_submit({}, locale)}</button>
          </form>
          {#if hint}<p class="live-hint" aria-live="polite">{hint === 'close' ? m.scribble_close({}, locale) : m.scribble_try_again({}, locale)}</p>{/if}
        {:else}
          <p class="live-result" aria-live="polite">
            {#if round.status === 'solved'}<span class="live-mark" aria-hidden="true"><IconCheck /></span>{/if}
            {round.status === 'solved'
              ? round.guessedByMe ? m.scribble_live_you_got_it({ word: round.word ?? '', points: num(round.points ?? 0) }, locale) : m.scribble_live_guessed({ name: round.guesser ?? '', word: round.word ?? '' }, locale)
              : m.scribble_timeout({ word: round.word ?? '' }, locale)}
          </p>
        {/if}
      </div>
    {/if}

    {#if !round || !drawing}
      {#if game.role === 'wait'}<p class="live-prompt">{game.drawer ? m.scribble_live_waiting({ name: game.drawer }, locale) : m.scribble_live_waiting_anyone({}, locale)}</p>{/if}
    {/if}

    {#if game.match.standings.some((row) => row.points > 0)}
      <section class="live-board" aria-label={m.scribble_live_standings({}, locale)}>
        <h2><IconTrophy aria-hidden="true" />{m.scribble_live_standings({}, locale)}</h2>
        <ol>
          {#each game.match.standings.filter((row) => row.points > 0) as row, index (index)}
            <li class:me={row.me}><span>{num(index + 1)}.</span><span class="name">{row.name || '–'}</span><b>{num(row.points)}</b></li>
          {/each}
        </ol>
      </section>
    {/if}

    <button type="button" class="live-link" onclick={closeTelegram}>{m.scribble_back_to_chat({}, locale)}</button>
  {/if}
</div>

<style>
  .group-scribble { display:grid;gap:.9rem; }
  .live-match { display:flex;align-items:center;justify-content:space-between;font-weight:900; }
  .live-time { display:inline-flex;align-items:center;gap:.25rem;font-variant-numeric:tabular-nums; }
  .live-time :global(svg) { width:1.1rem;height:1.1rem; }
  .live-time.low { color:#c4522e; }
  .live-stage { display:grid;gap:.75rem; }
  .live-prompt { margin:0;text-align:center;font-size:1.05rem;font-weight:800; }
  .live-options { display:grid;grid-template-columns:repeat(auto-fit, minmax(8rem, 1fr));gap:.55rem; }
  .live-choice { gap:.45rem; }
  .live-choice span { font-size:1.3rem; }
  .live-times { display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.35rem; }
  .live-times span { display:inline-flex;align-items:center;gap:.25rem;flex:1 1 100%;justify-content:center;font-size:.9rem;font-weight:900; }
  .live-times span :global(svg) { width:1rem;height:1rem; }
  .live-times button { padding:.3rem .7rem;border:2px solid currentColor;border-radius:999px;background:none;color:inherit;font:inherit;font-size:.86rem;font-weight:800;cursor:pointer; }
  .live-times button[aria-checked='true'] { background:#e6a527;color:#172a45;border-color:#172a45; }
  .live-blanks { margin:0;text-align:center;font-size:1.5rem;font-weight:900;letter-spacing:.12em; }
  .live-blanks small { font-size:.85rem;letter-spacing:0;opacity:.65; }
  .live-guess { display:flex;gap:.5rem; }
  .live-guess input { flex:1;min-width:0;padding:.6rem .8rem;border:2px solid currentColor;border-radius:.8rem;background:none;color:inherit;font:inherit;font-size:1.05rem;font-weight:800; }
  .live-guess input.close { border-color:#e6a527; }
  .live-hint { margin:0;text-align:center;font-weight:800;color:#c4522e; }
  .live-result { margin:0;text-align:center;font-size:1.05rem;font-weight:900; }
  .live-mark { display:inline-grid;place-items:center;width:1.6rem;height:1.6rem;margin-inline-end:.35rem;border-radius:50%;background:#34824d;color:#fffdf7;vertical-align:middle; }
  .live-mark :global(svg) { width:1.1rem;height:1.1rem; }
  .live-note { margin:0;text-align:center;font-size:.86rem;font-weight:700;opacity:.7; }
  .live-error { margin:0;text-align:center;color:#c4522e;font-weight:800; }
  .live-link { display:inline-flex;align-items:center;justify-self:center;gap:.3rem;padding:.3rem .6rem;border:0;background:none;color:inherit;font:inherit;font-size:.9rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer;opacity:.8; }
  .live-link :global(svg) { width:1.05rem;height:1.05rem; }
  .live-board { display:grid;gap:.4rem;padding:.8rem .9rem;border:2px solid currentColor;border-radius:1rem; }
  .live-board h2 { display:flex;align-items:center;gap:.35rem;margin:0;font-size:.95rem;font-weight:900; }
  .live-board h2 :global(svg) { width:1.1rem;height:1.1rem;color:#e6a527; }
  .live-board ol { display:grid;gap:.2rem;margin:0;padding:0;list-style:none; }
  .live-board li { display:grid;grid-template-columns:2rem 1fr auto;gap:.4rem;font-weight:800; }
  .live-board li.me { color:#2a6fa8; }
  .live-board .name { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
</style>
