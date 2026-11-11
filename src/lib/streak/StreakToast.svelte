<!--
  A small moment when the day's streak is kept, wherever that happens: a pill slides in at the top
  for a few seconds with the new count, a little brighter on milestones. It never blocks anything
  (no buttons, no focus) and stays silent apart from a soft vibration.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { isStreakMilestone } from './streakWeek.js';
  import IconFlame from '~icons/material-symbols/local-fire-department-rounded';

  const SHOW_MS = 3200;
  let shown = $state<{ count: number; milestone: boolean } | null>(null);
  // Only a change seen while the app is open counts: the day this session started already qualified
  // must not celebrate again on every load.
  let seen: { dateKey: string; qualified: boolean } | null = null;

  $effect(() => {
    const { dateKey, qualified, streakCount } = settings.streak;
    const before = seen;
    seen = { dateKey, qualified };
    if (!before || before.dateKey !== dateKey || before.qualified || !qualified) return;
    const milestone = isStreakMilestone(streakCount);
    shown = { count: streakCount, milestone };
    haptic(milestone ? 'win' : 'success');
  });

  $effect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => (shown = null), SHOW_MS);
    return () => window.clearTimeout(timer);
  });

  const locale = $derived({ locale: settings.interfaceLocale });
  const text = $derived(!shown ? '' : shown.count <= 1 ? m.streak_toast_first({}, locale) : shown.milestone ? m.streak_toast_milestone({ count: num(shown.count) }, locale) : m.streak_toast({ count: num(shown.count) }, locale));
</script>

{#if shown}
  <div class="streak-toast" class:milestone={shown.milestone} role="status" aria-live="polite">
    <span class="streak-toast-flame" aria-hidden="true"><IconFlame /></span>
    <span>{text}</span>
  </div>
{/if}

<style>
  .streak-toast { position:fixed;z-index:61;top:max(.75rem,env(safe-area-inset-top));left:50%;translate:-50% 0;display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .85rem .4rem .55rem;border:2px solid #172a45;border-radius:999px;background:#fffdf7;color:#172a45;box-shadow:3px 3px 0 #172a45;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:900;white-space:nowrap;pointer-events:none;animation:streak-toast-in .5s cubic-bezier(.34,1.56,.64,1),streak-toast-out .4s ease-in 2.8s forwards; }
  .streak-toast.milestone { background:#fff4d9;border-color:#c9832f;box-shadow:3px 3px 0 #c9832f; }
  .streak-toast-flame { display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:#e8622c;color:#fffdf7; }
  .streak-toast-flame :global(svg) { width:1rem;height:1rem;animation:streak-toast-flame .9s ease-out .15s; }
  :global(html.dark) .streak-toast { background:#2b4a70;color:#fffdf7;border-color:#0b1626;box-shadow:3px 3px 0 #0b1626; }
  :global(html.dark) .streak-toast.milestone { border-color:#e6a527;box-shadow:3px 3px 0 #e6a527; }
  @keyframes streak-toast-in { from { translate:-50% -150%;opacity:0; } to { translate:-50% 0;opacity:1; } }
  @keyframes streak-toast-out { to { translate:-50% -150%;opacity:0; } }
  @keyframes streak-toast-flame { 0% { scale:.6; } 50% { scale:1.25; } 100% { scale:1; } }
  @media (prefers-reduced-motion:reduce) { .streak-toast,.streak-toast-flame :global(svg) { animation:none; } }
</style>
