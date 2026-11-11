<!--
  The streak on the home page, kept quiet: the count beside a small flame, the last seven days as
  dots (today's dot fills as the goal is met), freezes only when there are some, and one line that
  says what today is about. Collecting the day's ember is a small button on that line.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playSuccessSound } from '#lib/feedback/sounds.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { FREEZE_EVERY, rewardReady, syncStreak } from './clientStreak.js';
  import { streakNudge, streakWeek } from './streakWeek.js';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';
  import IconFreeze from '~icons/material-symbols/ac-unit-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import { formatWeekday } from '#lib/format/format.js';

  const locale = $derived({ locale: settings.interfaceLocale });
  const streak = $derived(settings.streak);
  const week = $derived(streakWeek(streak));
  const nudge = $derived(streakNudge(streak));
  // Today's ring: the vocabulary goal, or full once any mode qualified the day.
  const goalProgress = $derived(streak.qualified ? 1 : Math.min(1, streak.vocabCorrect / Math.max(1, streak.vocabularyGoal)));
  const weekdayName = $derived.by(() => {
    const context = settings.formatContext;
    return (key: string) => formatWeekday(context, new Date(`${key}T12:00:00.000Z`), 'narrow', 'UTC');
  });

  function formatTime(minutes: number) {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours} h ${String(minutes % 60).padStart(2, '0')} min` : `${minutes} min`;
  }
  const nudgeText = $derived.by(() => {
    if (nudge.kind === 'done') return m.streak_nudge_done({}, locale);
    if (nudge.kind === 'milestone') return m.streak_nudge_milestone({ count: num(nudge.count) }, locale);
    if (nudge.kind === 'urgent') return m.streak_nudge_urgent({ count: num(nudge.count), time: formatTime(nudge.minutes) }, locale);
    if (nudge.kind === 'keep') return m.streak_nudge_keep({ count: num(nudge.count) }, locale);
    return nudge.best > 0 ? m.streak_nudge_start_best({ count: num(nudge.best) }, locale) : m.streak_nudge_start({}, locale);
  });

  let collecting = $state(false);
  // Collecting is idempotent per day on device and server, so a double tap cannot earn twice.
  async function collect() {
    collecting = true;
    playSuccessSound(settings.sound, 'pronunciation');
    haptic('success');
    try {
      settings.streak = await syncStreak('reward_collected', settings.streak);
    } finally {
      collecting = false;
    }
  }
</script>

<div class="streak-strip" class:qualified={streak.qualified}>
  <a class="streak-main" href="/progress" aria-label={`${m.streak({}, locale)}: ${num(streak.streakCount)}`}>
    <span class="streak-flame" aria-hidden="true"><IconFlame /><strong>{num(streak.streakCount)}</strong></span>
    <ol class="streak-days" aria-label={m.streak_week_label({}, locale)}>
      {#each week as day (day.dateKey)}
        <li class="streak-day {day.status}">
          <span class="streak-dot">
            {#if day.status === 'today-open'}
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle class="track" cx="10" cy="10" r="8" pathLength="100" /><circle class="value" cx="10" cy="10" r="8" pathLength="100" stroke-dasharray="100" stroke-dashoffset={100 - goalProgress * 100} /></svg>
            {:else if day.status === 'today-done'}
              <IconCheck aria-hidden="true" />
            {/if}
          </span>
          <small>{weekdayName(day.dateKey)}</small>
        </li>
      {/each}
    </ol>
    {#if streak.freezes > 0}
      <span class="streak-freeze" title={m.streak_freeze_title({ count: num(streak.freezes), embers: num(streak.embers), total: num(FREEZE_EVERY) }, locale)}><IconFreeze aria-hidden="true" />{num(streak.freezes)}</span>
    {/if}
  </a>
  <p class="streak-nudge" class:urgent={nudge.kind === 'urgent'} aria-live="polite">
    <span>{nudgeText}</span>
    {#if rewardReady(streak)}
      <button type="button" class="streak-collect" disabled={collecting} onclick={collect} title={m.streak_freeze_hint({}, locale)}>
        <span class="streak-ember" aria-hidden="true"></span>{m.reward_collect({}, locale)}
      </button>
    {/if}
  </p>
</div>

<style>
  .streak-strip { display:grid;gap:.15rem;padding:.6rem .9rem .55rem;font-family:'DM Sans',sans-serif; }
  .streak-main { display:flex;align-items:center;gap:.75rem;color:inherit;text-decoration:none;border-radius:12px; }
  .streak-main:focus-visible { outline:3px dashed #e6a527;outline-offset:3px; }
  .streak-flame { display:inline-flex;align-items:center;gap:.1rem;flex:none;color:rgba(23,42,69,.38);transition:color .4s ease; }
  .streak-flame :global(svg) { width:1.35rem;height:1.35rem; }
  .streak-flame strong { color:#172a45;font-family:'DM Serif Display',serif;font-size:1.55rem;font-weight:400;line-height:1;font-variant-numeric:tabular-nums; }
  .qualified .streak-flame { color:#e8622c; }
  .qualified .streak-flame :global(svg) { animation:flame-flicker 3.2s ease-in-out infinite;transform-origin:50% 90%; }

  .streak-days { flex:1;display:flex;justify-content:space-between;gap:.2rem;max-width:15rem;margin:0;padding:0;list-style:none; }
  .streak-day { display:grid;justify-items:center;gap:.15rem; }
  .streak-day small { color:rgba(23,42,69,.45);font-size:.8125rem;font-weight:800;line-height:1;text-transform:uppercase; }
  .streak-day.today-open small,.streak-day.today-done small { color:#172a45; }
  .streak-dot { position:relative;display:grid;place-items:center;width:1rem;height:1rem;border-radius:50%; }
  .missed .streak-dot { width:.4rem;height:.4rem;margin:.3rem;background:rgba(23,42,69,.16); }
  .streak-day.done .streak-dot { background:#e6a527;box-shadow:inset 0 0 0 1.5px #c9832f; }
  .today-done .streak-dot { background:#e8622c;color:#fffdf7;animation:day-pop .5s cubic-bezier(.34,1.56,.64,1); }
  .today-done .streak-dot :global(svg) { width:.75rem;height:.75rem; }
  .today-open svg { width:100%;height:100%;rotate:-90deg;overflow:visible; }
  .today-open .track { fill:none;stroke:rgba(23,42,69,.2);stroke-width:2.6; }
  .today-open .value { fill:none;stroke:#e6a527;stroke-width:2.6;stroke-linecap:round;transition:stroke-dashoffset .45s ease; }

  .streak-freeze { display:inline-flex;align-items:center;gap:.1rem;flex:none;color:#3f7fb3;font-size:.84rem;font-weight:900; }
  .streak-freeze :global(svg) { width:.85rem;height:.85rem; }

  .streak-nudge { display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.3rem .6rem;margin:0;color:#596477;font-size:.8125rem;font-weight:700;line-height:1.35; }
  .streak-nudge.urgent { color:#a45e38; }
  .streak-collect { display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border:1.5px solid #c9832f;border-radius:999px;background:#fff4d9;color:#a45e38;font:inherit;font-size:.8125rem;font-weight:900;cursor:pointer;animation:ember-glow 2.4s ease-in-out infinite; }
  .streak-collect:disabled { opacity:.6;cursor:default; }
  .streak-ember { width:.5rem;height:.5rem;border-radius:50% 50% 50% 0;rotate:-45deg;background:#e6a527; }

  @keyframes flame-flicker { 0%,100% { scale:1;rotate:0deg; } 30% { scale:1.04 1.08;rotate:-2deg; } 60% { scale:.98 1.03;rotate:1.5deg; } }
  @keyframes day-pop { from { scale:.4; } to { scale:1; } }
  @keyframes ember-glow { 0%,100% { box-shadow:0 0 0 0 rgba(230,165,39,0); } 50% { box-shadow:0 0 0 4px rgba(230,165,39,.22); } }
  @media (prefers-reduced-motion:reduce) { .qualified .streak-flame :global(svg),.today-done .streak-dot,.streak-collect { animation:none; } }

  :global(html.dark) .streak-flame { color:rgba(255,253,247,.35); }
  :global(html.dark) .streak-flame strong,:global(html.dark) .streak-day.today-open small,:global(html.dark) .streak-day.today-done small { color:#fffdf7; }
  :global(html.dark) .qualified .streak-flame { color:#f08a4b; }
  :global(html.dark) .streak-day small { color:rgba(255,253,247,.45); }
  :global(html.dark) .missed .streak-dot { background:rgba(255,253,247,.18); }
  :global(html.dark) .today-open .track { stroke:rgba(255,253,247,.22); }
  :global(html.dark) .streak-freeze { color:#9cc8ec; }
  :global(html.dark) .streak-nudge { color:rgba(255,253,247,.7); }
  :global(html.dark) .streak-nudge.urgent { color:#f0c06a; }
  :global(html.dark) .streak-collect { background:rgba(230,165,39,.16);border-color:#e6a527;color:#f0c06a; }
</style>
