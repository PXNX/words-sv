<!--
  Scribble with a Telegram group, live (server/_lib/scribbleGame.ts). The page asks the server about
  once a second what is going on:
  - your turn: pick one of three words, then draw; every line reaches the others while you draw,
    and you see the clock and who guessed it;
  - someone else draws: watch the picture appear, see the blanks and the clock, type guesses
    (guessing happens only here, never in the chat);
  - between turns: whose turn it is; after five rounds, the winner.
  Above it all sit the players' faces with their match points; every guess pops up as a speech
  bubble over its player (right and close ones without the word). With "reveal letters" on, the
  word's underlined slots fill in one letter at a time.
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
  import { parseAvatar, seededAvatar } from '#lib/profile/avatar.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import DrawPad from './DrawPad.svelte';
  import LiveCanvas from './LiveCanvas.svelte';
  import { pickWords, type LiveLine } from './scribble';
  import { recordScribbleWins } from './scribbleWins';
  import IconTimer from '~icons/material-symbols/timer-rounded';
  import IconBrush from '~icons/material-symbols/brush-rounded';
  import IconHourglass from '~icons/material-symbols/hourglass-top-rounded';
  import IconMedal from '~icons/material-symbols/workspace-premium-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconSpell from '~icons/material-symbols/spellcheck-rounded';

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
    guesses: v.optional(v.array(v.object({ id: v.number(), player: v.number(), name: v.string(), result: v.string(), text: v.nullable(v.string()) })), []),
    reveal: v.optional(v.boolean(), true),
    round: v.nullable(v.object({
      id: v.number(),
      status: v.picklist(['drawing', 'solved', 'timeout']),
      drawer: v.string(),
      mine: v.boolean(),
      letters: v.number(),
      pattern: v.optional(v.array(v.nullable(v.string())), []),
      word: v.nullable(v.string()),
      guesser: v.nullable(v.string()),
      guessedByMe: v.boolean(),
      points: v.nullable(v.number()),
      seconds: v.number(),
      secondsLeft: v.number(),
      version: v.number(),
      lines: v.nullable(v.array(LineSchema))
    })),
    match: v.object({
      round: v.number(),
      of: v.number(),
      standings: v.array(v.object({ id: v.optional(v.number(), 0), name: v.string(), points: v.number(), me: v.boolean(), avatar: v.optional(v.nullable(v.string()), null), drawing: v.optional(v.boolean(), false) })),
      champion: v.optional(v.nullable(v.object({ name: v.string(), points: v.number(), wins: v.number() })), null)
    })
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
  // Whether letters of the word appear over time; the group's last choice until the drawer picks.
  let reveal = $state<boolean | null>(null);
  let pending: LiveLine[] | null = null;
  let sending = false;

  // The learner's avatar goes to the table with the first poll and again whenever it changes.
  let sentAvatar: string | null | undefined;
  function avatarUpdate(): { avatar?: string | null } {
    const avatar = settings.avatar ? JSON.stringify(settings.avatar) : null;
    if (avatar === sentAvatar) return {};
    sentAvatar = avatar;
    return { avatar };
  }

  type Guess = State['guesses'][number];
  type Bubble = { key: number; result: string; text: string | null };
  const BUBBLE_MS = 3500;
  // The newest guess per player floats above their face for a few seconds.
  let bubbles = $state<Record<number, Bubble>>({});
  let seenGuess = -1;
  let bubbleRound = 0;
  function showBubbles(guesses: Guess[], round: number) {
    if (round !== bubbleRound) {
      bubbleRound = round;
      // Joining mid-round: what was said before stays unsaid.
      seenGuess = game === null ? Math.max(-1, ...guesses.map((guess) => guess.id)) : -1;
    }
    for (const guess of guesses) {
      if (guess.id <= seenGuess) continue;
      seenGuess = guess.id;
      bubbles[guess.player] = { key: guess.id, result: guess.result, text: guess.text };
      setTimeout(() => {
        if (bubbles[guess.player]?.key === guess.id) delete bubbles[guess.player];
      }, BUBBLE_MS);
    }
  }

  function faceOf(player: { id: number; avatar: string | null; me: boolean }) {
    if (player.me && settings.avatar) return settings.avatar;
    return parseAvatar(player.avatar) ?? seededAvatar(player.id);
  }
  function bubbleText(bubble: Bubble) {
    if (bubble.result === 'right') return m.scribble_live_bubble_right({}, locale);
    if (bubble.result === 'close') return m.scribble_live_bubble_close({}, locale);
    return bubble.text ?? '';
  }

  const round = $derived(game?.round ?? null);
  const drawing = $derived(round?.status === 'drawing');
  const iDraw = $derived(Boolean(round?.mine && drawing));
  // One slot per letter: underlined, filled once revealed (or for the drawer and after the round).
  const slots = $derived(round ? (round.pattern.length ? round.pattern : Array.from({ length: round.letters }, () => null)) : []);

  async function poll() {
    if (!session) return;
    try {
      const next = await callApi('/api/games/scribble', StateSchema, { body: { action: 'state', session, since: version, locale: settings.interfaceLocale, ...avatarUpdate() } });
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
      showBubbles(next.guesses, next.round?.id ?? 0);
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
      await callApi('/api/games/scribble', StartSchema, { body: { action: 'start', session, word: display(word), answers: answersFor(word), seconds: seconds ?? game?.roundSeconds ?? 90, reveal: reveal ?? game?.reveal ?? true } });
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
</script>

{#snippet wordSlots(pattern: Array<string | null>, letters: number)}
  <p class="live-slots" aria-label={m.scribble_live_letters({ count: num(letters) }, locale)}>
    {#each pattern as slot, index (index)}
      {#if slot === ' '}<span class="gap"></span>{:else}<span class="slot" class:open={slot !== null}>{#if slot !== null}<span class="letter">{slot}</span>{/if}</span>{/if}
    {/each}
    <small>({num(letters)})</small>
  </p>
{/snippet}

<div class="group-scribble">
  {#if failed}<p class="live-error" role="alert">{failed}</p>{/if}

  {#if !game}
    <div class="live-card live-wait"><span class="live-badge pulse" aria-hidden="true"><IconBrush /></span><p class="live-note">{m.scribble_live_loading({}, locale)}</p></div>
  {:else}
    <header class="live-head">
      <span class="live-pill">{m.scribble_live_round({ round: num(Math.max(1, game.match.round)), of: num(game.match.of) }, locale)}</span>
      {#if round && drawing}
        <span class="live-pill live-time" class:low={round.secondsLeft <= Math.min(10, round.seconds / 4)}><IconTimer aria-hidden="true" />{num(round.secondsLeft)}</span>
      {:else if game.role === 'draw' && !round?.mine}
        <span class="live-pill live-turn"><IconBrush aria-hidden="true" />{m.scribble_live_your_turn({}, locale)}</span>
      {/if}
      <span class="live-dots" aria-hidden="true">
        {#each Array.from({ length: game.match.of }, (_, index) => index) as index (index)}<i class:done={index < game.match.round - (drawing ? 1 : 0)} class:now={drawing && index === game.match.round - 1}></i>{/each}
      </span>
      {#if round && drawing}<span class="live-bar" aria-hidden="true"><i style:width="{Math.max(0, Math.min(100, (round.secondsLeft / round.seconds) * 100))}%"></i></span>{/if}
    </header>

    {#if game.match.standings.length > 0}
      <!-- Everyone at the table: face, points, who draws, and their latest guess as a speech bubble. -->
      <ul class="live-players" aria-label={m.scribble_live_players({}, locale)}>
        {#each game.match.standings as player, index (player.id || index)}
          {@const bubble = bubbles[player.id]}
          <li class:me={player.me} class:drawing={player.drawing} class:lead={index === 0 && player.points > 0}>
            {#if bubble}
              {#key bubble.key}<span class="live-bubble {bubble.result}" aria-live="polite">{bubbleText(bubble)}</span>{/key}
            {/if}
            <span class="live-face">
              <StoryCharacter id="kumar" avatar={faceOf(player)} still label={player.name} />
              {#if player.drawing}<span class="live-face-badge" aria-hidden="true"><IconBrush /></span>{:else if index === 0 && player.points > 0}<span class="live-face-badge gold" aria-hidden="true"><IconMedal /></span>{/if}
            </span>
            <span class="live-name">{player.name || '–'}</span>
            <b class="live-points">{num(player.points)}</b>
          </li>
        {/each}
      </ul>
    {/if}

    {#if game.match.champion}
      <div class="live-card live-champion" aria-live="polite">
        <span class="live-badge gold" aria-hidden="true"><IconMedal /></span>
        <p class="live-prompt">{m.scribble_live_champion({ name: game.match.champion.name || '–' }, locale)}</p>
        <small class="live-note">{m.scribble_live_champion_points({ points: num(game.match.champion.points), wins: num(game.match.champion.wins) }, locale)}</small>
      </div>
    {/if}

    {#if game.role === 'draw' && !round?.mine}
      <!-- Your turn: choose the word. -->
      <div class="live-card">
        <p class="live-prompt">{m.scribble_choose_group({}, locale)}</p>
        <div class="live-options">
          {#each choices as choice (choice)}
            <button type="button" class="live-choice" disabled={starting} onclick={() => start(choice)}><span class="live-emoji" aria-hidden="true">{pictureFor(language, choice)}</span><span>{display(choice)}</span></button>
          {/each}
        </div>
        <div class="live-times" role="radiogroup" aria-label={m.scribble_live_round_time({}, locale)}>
          <span><IconTimer aria-hidden="true" />{m.scribble_live_round_time({}, locale)}</span>
          {#each game.roundTimes as option (option)}
            <button type="button" role="radio" aria-checked={(seconds ?? game.roundSeconds) === option} onclick={() => (seconds = option)}>{m.scribble_seconds({ seconds: num(option) }, locale)}</button>
          {/each}
        </div>
        <label class="live-switch">
          <input type="checkbox" checked={reveal ?? game.reveal} onchange={(event) => (reveal = event.currentTarget.checked)} />
          <span class="track" aria-hidden="true"></span>
          <IconSpell aria-hidden="true" />{m.scribble_live_reveal({}, locale)}
        </label>
        <small class="live-note"><IconHourglass aria-hidden="true" />{m.scribble_live_turn_left({ seconds: num(game.turnSecondsLeft) }, locale)}</small>
      </div>
    {:else if iDraw && round}
      <div class="live-stage">
        <p class="live-prompt live-word">{m.scribble_draw_prompt({ word: round.word ?? chosen }, locale)}</p>
        <DrawPad onlive={(next) => (pending = next)} />
        <small class="live-note">{m.scribble_live_drawing_hint({}, locale)}</small>
      </div>
    {:else if round}
      <div class="live-stage">
        <div class="live-canvas"><LiveCanvas {lines} label={m.scribble_live_canvas({ name: round.drawer }, locale)} /></div>
        {#if drawing}
          <p class="live-prompt">{m.scribble_live_watch({ name: round.drawer }, locale)}</p>
          {@render wordSlots(slots, round.letters)}
          <form class="live-guess" onsubmit={(event) => { event.preventDefault(); void sendGuess(); }}>
            <input type="text" bind:value={typed} autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" aria-label={m.scribble_spell_label({}, locale)} placeholder={m.scribble_spell_placeholder({}, locale)} class:close={hint === 'close'} class:shake={hint === 'wrong'} />
            <button type="submit" class="btn-play btn-play-ink" disabled={!typed.trim()}>{m.scribble_spell_submit({}, locale)}</button>
          </form>
          {#if hint}<p class="live-hint" class:close={hint === 'close'} aria-live="polite">{hint === 'close' ? m.scribble_close({}, locale) : m.scribble_try_again({}, locale)}</p>{/if}
        {:else}
          {@render wordSlots(slots, round.letters)}
          <p class="live-result" class:solved={round.status === 'solved'} aria-live="polite">
            {#if round.status === 'solved'}<span class="live-mark" aria-hidden="true"><IconCheck /></span>{/if}
            {round.status === 'solved'
              ? round.guessedByMe ? m.scribble_live_you_got_it({ word: round.word ?? '', points: num(round.points ?? 0) }, locale) : m.scribble_live_guessed({ name: round.guesser ?? '', word: round.word ?? '' }, locale)
              : m.scribble_timeout({ word: round.word ?? '' }, locale)}
          </p>
        {/if}
      </div>
    {/if}

    {#if (!round || !drawing) && game.role === 'wait'}
      <div class="live-card live-wait">
        <span class="live-badge pulse" aria-hidden="true"><IconBrush /></span>
        <p class="live-prompt">{game.drawer ? m.scribble_live_waiting({ name: game.drawer }, locale) : m.scribble_live_waiting_anyone({}, locale)}</p>
      </div>
    {/if}

  {/if}
</div>

<style>
  .group-scribble { display:grid;gap:.85rem; }
  .live-head { display:flex;flex-wrap:wrap;align-items:center;gap:.45rem; }
  .live-pill { display:inline-flex;align-items:center;gap:.3rem;padding:.28rem .7rem;border:2px solid currentColor;border-radius:999px;font-size:.88rem;font-weight:900;font-variant-numeric:tabular-nums; }
  .live-pill :global(svg) { width:1.05rem;height:1.05rem; }
  .live-time.low { color:#c4522e;animation:live-pulse 1s ease-in-out infinite; }
  .live-turn { background:#e6a527;color:#172a45;border-color:#172a45; }
  .live-dots { display:inline-flex;gap:.3rem;margin-inline-start:auto; }
  .live-dots i { width:.6rem;height:.6rem;border:2px solid currentColor;border-radius:50%;opacity:.45; }
  .live-dots i.done { background:currentColor;opacity:.8; }
  .live-dots i.now { background:#e6a527;border-color:#e6a527;opacity:1; }
  .live-bar { flex:1 1 100%;height:.35rem;border-radius:999px;background:color-mix(in srgb, currentColor 14%, transparent);overflow:hidden; }
  .live-bar i { display:block;height:100%;border-radius:inherit;background:#34824d;transition:width 1s linear; }
  .live-card { display:grid;justify-items:center;gap:.7rem;padding:1rem;border:2px solid currentColor;border-radius:1.1rem;background:color-mix(in srgb, currentColor 4%, transparent); }
  .live-stage { display:grid;gap:.7rem; }
  .live-canvas { border-radius:1rem;overflow:hidden;box-shadow:0 .35rem 0 color-mix(in srgb, currentColor 18%, transparent); }
  .live-prompt { margin:0;text-align:center;font-size:1.08rem;font-weight:900; }
  .live-word { font-size:1.2rem; }
  .live-options { display:grid;grid-template-columns:repeat(auto-fit, minmax(7.5rem, 1fr));gap:.55rem;width:100%; }
  .live-choice { display:grid;justify-items:center;gap:.25rem;padding:.8rem .5rem;border:2px solid currentColor;border-radius:1rem;background:none;color:inherit;font:inherit;font-weight:900;cursor:pointer;transition:transform .12s ease, background .12s ease; }
  .live-choice:hover:not(:disabled), .live-choice:focus-visible { background:#e6a527;color:#172a45;transform:translateY(-2px); }
  .live-choice:disabled { opacity:.55;cursor:default; }
  .live-emoji { font-size:2rem;line-height:1; }
  .live-times { display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.35rem; }
  .live-times span { display:inline-flex;align-items:center;gap:.25rem;flex:1 1 100%;justify-content:center;font-size:.9rem;font-weight:900; }
  .live-times span :global(svg) { width:1rem;height:1rem; }
  .live-times button { padding:.3rem .7rem;border:2px solid currentColor;border-radius:999px;background:none;color:inherit;font:inherit;font-size:.86rem;font-weight:800;cursor:pointer; }
  .live-times button[aria-checked='true'] { background:#e6a527;color:#172a45;border-color:#172a45; }
  .live-guess { display:flex;gap:.5rem; }
  .live-guess input { flex:1;min-width:0;padding:.65rem .85rem;border:2px solid currentColor;border-radius:.9rem;background:none;color:inherit;font:inherit;font-size:1.05rem;font-weight:800; }
  .live-guess input.close { border-color:#e6a527;box-shadow:0 0 0 3px color-mix(in srgb, #e6a527 35%, transparent); }
  .live-guess input.shake { animation:live-shake .3s ease; }
  .live-hint { margin:0;text-align:center;font-weight:800;color:#c4522e; }
  .live-hint.close { color:#b07a12; }
  .live-result { margin:0;padding:.7rem;border-radius:1rem;text-align:center;font-size:1.05rem;font-weight:900;background:color-mix(in srgb, #c4522e 12%, transparent); }
  .live-result.solved { background:color-mix(in srgb, #34824d 14%, transparent); }
  .live-mark { display:inline-grid;place-items:center;width:1.6rem;height:1.6rem;margin-inline-end:.35rem;border-radius:50%;background:#34824d;color:#fffdf7;vertical-align:middle; }
  .live-mark :global(svg) { width:1.1rem;height:1.1rem; }
  .live-badge { display:grid;place-items:center;width:3rem;height:3rem;border-radius:50%;background:#e6a527;color:#172a45; }
  .live-badge :global(svg) { width:1.6rem;height:1.6rem; }
  .live-badge.pulse { animation:live-pulse 1.6s ease-in-out infinite; }
  .live-champion { border-color:#e6a527;background:color-mix(in srgb, #e6a527 14%, transparent); }
  .live-note { display:inline-flex;align-items:center;justify-content:center;gap:.25rem;margin:0;text-align:center;font-size:.86rem;font-weight:700;opacity:.7; }
  .live-note :global(svg) { width:1rem;height:1rem; }
  .live-error { margin:0;text-align:center;color:#c4522e;font-weight:800; }
  .live-players { display:flex;gap:.55rem;margin:0;padding:2.4rem .1rem .2rem;list-style:none;overflow-x:auto;scrollbar-width:none; }
  .live-players::-webkit-scrollbar { display:none; }
  .live-players li { position:relative;display:grid;justify-items:center;gap:.1rem;flex:0 0 4.2rem;min-width:0;font-variant-numeric:tabular-nums; }
  .live-face { position:relative;display:block;width:3.2rem;height:3.2rem;border:2px solid currentColor;border-radius:50%;background:#f7e2b0;overflow:hidden; }
  .live-face :global(.story-character) { position:absolute;left:-30%;top:-4%;width:160%;height:auto; }
  .live-players li.me .live-face { border-color:#2a6fa8;box-shadow:0 0 0 3px color-mix(in srgb, #2a6fa8 35%, transparent); }
  .live-players li.drawing .live-face { border-color:#e6a527;box-shadow:0 0 0 3px color-mix(in srgb, #e6a527 45%, transparent); }
  .live-face-badge { position:absolute;right:-.05rem;bottom:-.05rem;display:grid;place-items:center;width:1.25rem;height:1.25rem;border-radius:50%;background:#e6a527;color:#172a45; }
  .live-face-badge :global(svg) { width:.85rem;height:.85rem; }
  .live-name { max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.78rem;font-weight:800; }
  .live-points { font-size:.82rem;font-weight:900;opacity:.75; }
  .live-players li.lead .live-points { color:#b07a12;opacity:1; }
  .live-bubble { position:absolute;bottom:calc(100% - .2rem);left:50%;z-index:2;max-width:8rem;padding:.3rem .55rem;border:2px solid currentColor;border-radius:.8rem;background:#fffdf7;color:#172a45;font-size:.8rem;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transform:translateX(-50%);animation:live-bubble 3.5s ease forwards; }
  .live-bubble::after { content:'';position:absolute;left:50%;bottom:-.42rem;width:.6rem;height:.6rem;border:solid currentColor;border-width:0 2px 2px 0;background:inherit;transform:translateX(-50%) rotate(45deg); }
  .live-bubble.right { background:#d8efd9;color:#1f5a33; }
  .live-bubble.close { background:#fbe7b5;color:#7a5306; }
  .live-players li:first-child .live-bubble { left:0;transform:none; }
  .live-players li:first-child .live-bubble::after { left:1.6rem; }
  .live-slots { display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;gap:.3rem;margin:0; }
  .live-slots .slot { display:grid;place-items:end center;width:1.5rem;height:2rem;border-bottom:3px solid currentColor;font-size:1.35rem;font-weight:900;line-height:1;text-transform:uppercase; }
  .live-slots .slot.open { border-color:#e6a527; }
  .live-slots .letter { animation:live-letter .45s cubic-bezier(.34,1.56,.64,1); }
  .live-slots .gap { width:.8rem; }
  .live-slots small { align-self:center;margin-inline-start:.35rem;font-size:.85rem;font-weight:800;opacity:.65; }
  .live-switch { position:relative;display:inline-flex;align-items:center;gap:.4rem;font-size:.9rem;font-weight:800;cursor:pointer; }
  .live-switch input { position:absolute;opacity:0;width:1px;height:1px; }
  .live-switch .track { position:relative;width:2.3rem;height:1.3rem;border:2px solid currentColor;border-radius:999px;transition:background .15s ease; }
  .live-switch .track::after { content:'';position:absolute;top:.12rem;left:.12rem;width:.8rem;height:.8rem;border-radius:50%;background:currentColor;transition:transform .15s ease; }
  .live-switch input:checked + .track { background:#e6a527; }
  .live-switch input:checked + .track::after { transform:translateX(1rem); }
  .live-switch input:focus-visible + .track { outline:2px solid #2a6fa8;outline-offset:2px; }
  .live-switch :global(svg) { width:1.05rem;height:1.05rem; }
  @keyframes live-bubble { 0% { opacity:0;translate:0 .4rem;scale:.8; } 10% { opacity:1;translate:0 0;scale:1; } 85% { opacity:1; } 100% { opacity:0;translate:0 -.3rem; } }
  @keyframes live-letter { from { opacity:0;transform:translateY(-.6rem) scale(.6); } }
  @keyframes live-pulse { 50% { transform:scale(1.08); } }
  @keyframes live-shake { 25% { transform:translateX(-4px); } 75% { transform:translateX(4px); } }
  @media (prefers-reduced-motion: reduce) { .live-badge.pulse, .live-time.low, .live-guess input.shake, .live-slots .letter { animation:none; } .live-bubble { animation-name:none; } .live-bar i, .live-choice { transition:none; } }
</style>
