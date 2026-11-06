<!--
  Pops up over any mode the moment one of its cosmetic rewards is unlocked, showing the learner's own
  character already wearing it, with a way to the character editor on the progress page.
-->
<script lang="ts">
  import { haptic } from '#lib/feedback/haptics.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playSoundEffect } from '#lib/feedback/sounds.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { defaultAvatar } from './avatar.js';
  import { cosmetics, cosmeticState, dismissUnlock } from './cosmetics.svelte.js';
  import IconClose from '~icons/material-symbols/close-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const reward = $derived(cosmeticState.justUnlocked ? cosmetics[cosmeticState.justUnlocked] : null);
  const preview = $derived(reward ? { ...(settings.avatar ?? defaultAvatar), [reward.part]: reward.choice } : null);

  $effect(() => {
    if (!reward) return;
    playSoundEffect(settings.sound, 'pop');
    haptic('unlock');
    const timer = window.setTimeout(dismissUnlock, 8000);
    return () => window.clearTimeout(timer);
  });
</script>

{#if reward && preview}
  <aside class="cosmetic-toast" role="status" aria-live="polite">
    <span class="cosmetic-toast-character" aria-hidden="true"><StoryCharacter id="kumar" avatar={preview} mood="laughing" /></span>
    <div class="cosmetic-toast-text">
      <strong>{m.cosmetic_unlocked_title({}, locale)}</strong>
      <span>{reward.source.kind === 'achievement' ? m.cosmetic_unlocked_badge({}, locale) : m.cosmetic_unlocked_body({}, locale)}</span>
      <a href="/progress" onclick={dismissUnlock}>{m.cosmetic_try_on({}, locale)}</a>
    </div>
    <button type="button" class="cosmetic-toast-close" onclick={dismissUnlock} aria-label={m.cosmetic_close({}, locale)}><IconClose aria-hidden="true" /></button>
  </aside>
{/if}

<style>
  .cosmetic-toast { position:fixed;z-index:60;left:50%;bottom:max(1rem,env(safe-area-inset-bottom));translate:-50% 0;width:min(calc(100% - 2rem),24rem);display:flex;align-items:center;gap:.7rem;padding:.6rem .7rem;border:2px solid #172a45;border-radius:18px 12px 16px 13px / 13px 16px 12px 18px;background:#fffdf7;color:#172a45;box-shadow:4px 4px 0 #172a45;animation:cosmetic-pop .5s cubic-bezier(.34,1.56,.64,1); }
  .cosmetic-toast-character { flex:none;display:block;width:3.6rem;height:4.5rem; }
  .cosmetic-toast-character :global(.story-character) { width:100%;height:100%; }
  .cosmetic-toast-text { flex:1;min-width:0;display:grid;gap:.15rem;font-size:.75rem;font-weight:700;line-height:1.3; }
  .cosmetic-toast-text strong { font-family:'DM Serif Display',serif;font-size:1.05rem;font-weight:400; }
  .cosmetic-toast-text a { color:#a45e38;font-weight:900;text-decoration:underline;text-underline-offset:2px; }
  .cosmetic-toast-close { flex:none;align-self:flex-start;display:grid;place-items:center;width:1.8rem;height:1.8rem;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer; }
  :global(html.dark) .cosmetic-toast { background:#2b4a70;color:#fffdf7;border-color:#0b1626;box-shadow:4px 4px 0 #0b1626; }
  :global(html.dark) .cosmetic-toast-text a { color:#e6a527; }
  @keyframes cosmetic-pop { from { translate:-50% 120%;scale:.9; } to { translate:-50% 0;scale:1; } }
  @media (prefers-reduced-motion:reduce) { .cosmetic-toast { animation:none; } }
</style>
