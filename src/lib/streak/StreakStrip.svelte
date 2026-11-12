<!--
  The streak, the centre of the home page: a big flame with the count, the best run and the
  freezes beside it, the last seven days as a row of marks (today's fills as the goal is met), the
  way to the next milestone and to today's goal as two bars, and one line that says what today is
  about. Collecting the day's ember is a small button on that line.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playSuccessSound } from '#lib/feedback/sounds.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { FREEZE_EVERY, rewardReady, syncStreak } from './clientStreak.js';
  import { nextMilestone, streakNudge, streakWeek } from './streakWeek.js';
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
  const milestone = $derived(nextMilestone(streak.streakCount));
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
    <span class="streak-flame" aria-hidden="true"><IconFlame /></span>
    <span class="streak-count">
      <strong>{num(streak.streakCount)}</strong>
      <small>{streak.streakCount === 1 ? m.streak_day_label_one({}, locale) : m.streak_day_label({}, locale)}</small>
    </span>
    <span class="streak-side">
      {#if streak.bestStreak > 0}<span class="streak-best">{m.streak_best_short({ count: num(streak.bestStreak) }, locale)}</span>{/if}
      {#if streak.freezes > 0}
        <span class="streak-freeze" title={m.streak_freeze_title({ count: num(streak.freezes), embers: num(streak.embers), total: num(FREEZE_EVERY) }, locale)}><IconFreeze aria-hidden="true" />{num(streak.freezes)}</span>
      {/if}
    </span>
  </a>
  <ol class="streak-days" aria-label={m.streak_week_label({}, locale)}>
    {#each week as day (day.dateKey)}
      <li class="streak-day {day.status}">
        <span class="streak-dot">
          {#if day.status === 'today-open'}
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle class="track" cx="10" cy="10" r="8" pathLength="100" /><circle class="value" cx="10" cy="10" r="8" pathLength="100" stroke-dasharray="100" stroke-dashoffset={100 - goalProgress * 100} /></svg>
          {:else if day.status === 'today-done' || day.status === 'done'}
            <IconCheck aria-hidden="true" />
          {/if}
        </span>
        <small>{weekdayName(day.dateKey)}</small>
      </li>
    {/each}
  </ol>
  <div class="streak-bars">
    <div class="streak-bar">
      <span>{streak.qualified ? m.streak_today_done({}, locale) : m.streak_today({ done: num(Math.min(streak.vocabCorrect, streak.vocabularyGoal)), goal: num(streak.vocabularyGoal) }, locale)}</span>
      <i class="today" style={`--share:${goalProgress}`}></i>
    </div>
    <div class="streak-bar">
      <span>{m.streak_next_milestone({ count: num(milestone.target) }, locale)}</span>
      <i style={`--share:${milestone.share}`}></i>
    </div>
  </div>
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
  .streak-strip { display:grid;gap:.75rem;padding:1rem 1rem .9rem;font-family:var(--font-body); }
  .streak-main { display:flex;align-items:center;gap:.8rem;color:inherit;text-decoration:none;border-radius:14px; }
  .streak-main:focus-visible { outline:3px dashed var(--sun);outline-offset:3px; }
  .streak-flame { flex:none;display:grid;place-items:center;width:3.6rem;height:3.6rem;border:2px solid var(--ink);border-radius:50% 46% 52% 48% / 48% 52% 46% 50%;background:var(--paper-2);box-shadow:3px 3px 0 var(--ink);color:color-mix(in oklch,var(--ink) 35%,transparent);transition:background-color .4s ease,color .4s ease; }
  .streak-flame :global(svg) { width:2.2rem;height:2.2rem; }
  .qualified .streak-flame { background:var(--sun);color:#e8622c; }
  .qualified .streak-flame :global(svg) { animation:flame-flicker 3.2s ease-in-out infinite;transform-origin:50% 90%; }
  .streak-count { display:grid;min-width:0; }
  .streak-count strong { color:var(--text);font-family:var(--font-display);font-size:2.9rem;font-weight:400;line-height:.95;font-variant-numeric:tabular-nums; }
  .streak-count small { color:var(--text-soft);font-size:var(--text-xs);font-weight:800;line-height:1.3; }
  .streak-side { margin-inline-start:auto;display:grid;justify-items:end;gap:.3rem; }
  .streak-best { padding:.15rem .55rem;border:1.5px solid var(--line-soft);border-radius:999px;color:var(--text-soft);font-size:var(--text-xs);font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums; }
  .streak-freeze { display:inline-flex;align-items:center;gap:.15rem;color:#3f7fb3;font-size:var(--text-sm);font-weight:900; }
  .streak-freeze :global(svg) { width:1rem;height:1rem; }

  .streak-days { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.2rem;margin:0;padding:0;list-style:none; }
  .streak-day { display:grid;justify-items:center;gap:.25rem; }
  .streak-day small { color:var(--text-soft);font-size:.6875rem;font-weight:800;line-height:1;text-transform:uppercase; }
  .streak-day.today-open small,.streak-day.today-done small { color:var(--text);font-weight:900; }
  .streak-dot { position:relative;display:grid;place-items:center;width:1.9rem;height:1.9rem;border-radius:50%;color:var(--paper); }
  .streak-dot :global(svg) { width:1.1rem;height:1.1rem; }
  .missed .streak-dot { background:transparent;box-shadow:inset 0 0 0 2px var(--line-soft); }
  .streak-day.done .streak-dot { background:var(--sun);box-shadow:inset 0 0 0 2px #c9832f;color:var(--ink); }
  .today-done .streak-dot { background:#e8622c;box-shadow:0 0 0 2px var(--ink);animation:day-pop .5s var(--ease-spring); }
  .today-open svg { width:100%;height:100%;rotate:-90deg;overflow:visible; }
  .today-open .track { fill:none;stroke:var(--line-soft);stroke-width:2.6; }
  .today-open .value { fill:none;stroke:var(--sun);stroke-width:2.6;stroke-linecap:round;transition:stroke-dashoffset .45s ease; }

  .streak-bars { display:grid;grid-template-columns:1fr 1fr;gap:.7rem; }
  .streak-bar { display:grid;gap:.25rem;min-width:0; }
  .streak-bar span { color:var(--text-soft);font-size:.6875rem;font-weight:800;line-height:1.25; }
  .streak-bar i { display:block;height:.5rem;border-radius:99px;background:linear-gradient(to right,var(--sun) calc(var(--share) * 100%),var(--line-soft) 0);transition:background .45s ease; }
  .streak-bar i.today { background:linear-gradient(to right,var(--go) calc(var(--share) * 100%),var(--line-soft) 0); }
  :global([dir='rtl']) .streak-bar i { background:linear-gradient(to left,var(--sun) calc(var(--share) * 100%),var(--line-soft) 0); }
  :global([dir='rtl']) .streak-bar i.today { background:linear-gradient(to left,var(--go) calc(var(--share) * 100%),var(--line-soft) 0); }

  .streak-nudge { display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.3rem .6rem;margin:0;color:var(--text);font-size:var(--text-sm);font-weight:700;line-height:1.35; }
  .streak-nudge.urgent { color:var(--color-accent); }
  .streak-collect { display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .65rem;border:1.5px solid #c9832f;border-radius:999px;background:#fff4d9;color:#a45e38;font:inherit;font-size:var(--text-xs);font-weight:900;cursor:pointer;animation:ember-glow 2.4s ease-in-out infinite; }
  .streak-collect:disabled { opacity:.6;cursor:default; }
  .streak-ember { width:.5rem;height:.5rem;border-radius:50% 50% 50% 0;rotate:-45deg;background:var(--sun); }

  @keyframes flame-flicker { 0%,100% { scale:1;rotate:0deg; } 30% { scale:1.04 1.08;rotate:-2deg; } 60% { scale:.98 1.03;rotate:1.5deg; } }
  @keyframes day-pop { from { scale:.4; } to { scale:1; } }
  @keyframes ember-glow { 0%,100% { box-shadow:0 0 0 0 rgba(230,165,39,0); } 50% { box-shadow:0 0 0 4px rgba(230,165,39,.22); } }
  @media (prefers-reduced-motion:reduce) { .qualified .streak-flame :global(svg),.today-done .streak-dot,.streak-collect { animation:none; } }

  :global(html.dark) .streak-flame { border-color:var(--ink-deep);background:var(--surface-2);box-shadow:3px 3px 0 var(--ink-deep);color:color-mix(in oklch,var(--paper) 35%,transparent); }
  :global(html.dark) .qualified .streak-flame { background:var(--sun);color:#c8431a; }
  :global(html.dark) .today-done .streak-dot { box-shadow:0 0 0 2px var(--ink-deep); }
  :global(html.dark) .streak-freeze { color:#9cc8ec; }
  :global(html.dark) .streak-collect { background:rgba(230,165,39,.16);border-color:var(--sun);color:#f0c06a; }
</style>
