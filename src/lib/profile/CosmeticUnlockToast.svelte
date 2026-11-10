<!--
  Celebrates an unlocked reward over any mode: a gold badge with spinning rays and sparkles, confetti,
  and the learner's own character popping in already wearing the new item. It names what earned it
  (a badge, a language, a great round) and which part is new, and can put it on right away.
  Closes on tap, Escape, or after a while, so it never blocks a game for long.
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { haptic } from '#lib/feedback/haptics.js';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playSoundEffect } from '#lib/feedback/sounds.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { defaultAvatar, type AvatarPart } from './avatar.js';
  import { cosmetics, cosmeticState, dismissUnlock } from './cosmetics.svelte.js';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconTrophy from '~icons/material-symbols/trophy-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';

  type MessageFn = (inputs: object, options: { locale: string }) => string;
  const messages = m as unknown as Record<string, MessageFn | undefined>;
  const PART_LABEL: Record<AvatarPart, string> = { face: 'avatar_face', skin: 'avatar_skin', eyes: 'avatar_eyes', nose: 'avatar_nose', hairStyle: 'avatar_hair', hair: 'avatar_hair_colour', shirt: 'avatar_shirt', top: 'avatar_shirt_colour', extra: 'avatar_extra' };
  const AUTO_CLOSE_MS = 12_000;

  const locale = $derived({ locale: settings.interfaceLocale });
  const reward = $derived(cosmeticState.justUnlocked ? cosmetics[cosmeticState.justUnlocked] : null);
  const preview = $derived(reward ? { ...(settings.avatar ?? defaultAvatar), [reward.part]: reward.choice } : null);
  let worn = $state(false);

  // What earned it, in words: the badge's name, the language practised, or a great round.
  const source = $derived.by(() => {
    if (!reward) return '';
    const from = reward.source;
    if (from.kind === 'achievement') return m.cosmetic_from_badge({ name: messages[`achievement_${from.achievement}`]?.({}, locale) ?? from.achievement }, locale);
    if (from.kind === 'language') return m.cosmetic_from_language({ count: from.target, language: new Intl.DisplayNames([settings.interfaceLocale], { type: 'language' }).of(from.language) ?? from.language }, locale);
    return m.cosmetic_unlocked_body({}, locale);
  });
  const partName = $derived(reward ? messages[PART_LABEL[reward.part]]?.({}, locale) ?? reward.part : '');

  const CONFETTI = ['#e6a527', '#e86a9a', '#4b78c2', '#34824d', '#d64b45', '#8a62b6'];
  const pieces = Array.from({ length: 24 }, (_, index) => ({ color: CONFETTI[index % CONFETTI.length], angle: (index / 24) * 360, distance: 7 + (index % 4) * 1.6, delay: (index % 5) * 0.03 }));

  $effect(() => {
    if (!reward) return;
    worn = false;
    playSoundEffect(settings.sound, 'pop');
    haptic('unlock');
    const timer = window.setTimeout(dismissUnlock, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  });

  function wear() {
    if (!reward) return;
    settings.setAvatar({ ...(settings.avatar ?? defaultAvatar), [reward.part]: reward.choice });
    worn = true;
    haptic('success');
    window.setTimeout(dismissUnlock, 1200);
  }
</script>

<svelte:window onkeydown={(event) => { if (reward && event.key === 'Escape') dismissUnlock(); }} />

{#if reward && preview}
  {#key cosmeticState.justUnlocked}
    <div class="unlock-layer" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale} transition:fade={{ duration: 180 }}>
      <button type="button" class="unlock-backdrop" aria-label={m.cosmetic_close({}, locale)} onclick={dismissUnlock}></button>
      <div class="unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-title" aria-describedby="unlock-source">
        <button type="button" class="unlock-close" onclick={dismissUnlock} aria-label={m.cosmetic_close({}, locale)}><IconClose aria-hidden="true" /></button>
        <div class="unlock-stage" aria-hidden="true">
          <span class="unlock-rays"></span>
          <span class="unlock-burst">{#each pieces as piece}<i style={`--c:${piece.color};--a:${piece.angle}deg;--r:${piece.distance}rem;--d:${piece.delay}s`}></i>{/each}</span>
          <span class="unlock-medal"><IconTrophy /></span>
          <span class="unlock-character"><StoryCharacter id="kumar" avatar={preview} mood="laughing" /></span>
          <span class="unlock-sparkles"><b>✦</b><b>✦</b><b>✦</b><b>✦</b></span>
        </div>
        <p class="unlock-kicker">{m.cosmetic_new_part({ part: partName }, locale)}</p>
        <h2 id="unlock-title">{m.cosmetic_unlocked_title({}, locale)}</h2>
        <p id="unlock-source" class="unlock-source">{source}</p>
        <div class="unlock-actions">
          {#if worn}
            <span class="unlock-worn"><IconCheck aria-hidden="true" />{m.cosmetic_worn({}, locale)}</span>
          {:else}
            <button type="button" class="btn-play btn-play-ink" onclick={wear}>{m.cosmetic_wear({}, locale)}</button>
            <a class="btn-play btn-play-soft" href="/progress" onclick={dismissUnlock}>{m.cosmetic_try_on({}, locale)}</a>
          {/if}
        </div>
      </div>
    </div>
  {/key}
{/if}

<style>
  .unlock-layer { position:fixed;inset:0;z-index:85;display:grid;place-items:center;padding:1rem; }
  .unlock-backdrop { position:absolute;inset:0;border:0;background:radial-gradient(circle at 50% 42%,rgba(230,165,39,.35),rgba(12,24,40,.6) 60%);cursor:pointer; }
  .unlock-card { position:relative;display:grid;justify-items:center;gap:.45rem;width:min(100%,22rem);padding:1rem 1.1rem 1.15rem;border:2px solid #172a45;border-radius:22px 14px 20px 15px / 15px 20px 14px 22px;background:#fffdf7;color:#172a45;box-shadow:5px 5px 0 #172a45;text-align:center;animation:unlock-pop .55s cubic-bezier(.34,1.56,.64,1) both; }
  .unlock-close { position:absolute;top:.45rem;inset-inline-end:.45rem;display:grid;place-items:center;width:1.9rem;height:1.9rem;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;z-index:2; }
  .unlock-close :global(svg) { width:1.1rem;height:1.1rem; }

  .unlock-stage { position:relative;display:grid;place-items:center;width:10rem;height:10rem; }
  .unlock-rays { position:absolute;inset:-1rem;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(230,165,39,.34) 0 10deg,transparent 10deg 24deg);mask:radial-gradient(circle,#000 30%,transparent 70%);animation:unlock-spin 9s linear infinite; }
  .unlock-medal { position:absolute;top:.2rem;inset-inline-end:.4rem;display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;border:2px solid #172a45;background:radial-gradient(circle at 35% 30%,#ffe08a,#e6a527 60%,#b77a12);color:#172a45;box-shadow:2px 2px 0 #172a45;animation:unlock-medal .6s cubic-bezier(.34,1.56,.64,1) .35s both, unlock-shine 2.4s ease-in-out 1s infinite;z-index:2; }
  .unlock-medal :global(svg) { width:1.4rem;height:1.4rem; }
  .unlock-character { position:relative;display:block;width:6.4rem;height:8rem;transform-origin:50% 100%;animation:unlock-rise .6s cubic-bezier(.34,1.56,.64,1) .15s both, unlock-hop 1s ease-in-out .9s 2; }
  .unlock-character :global(.story-character) { width:100%;height:100%; }
  .unlock-burst { position:absolute;inset:50% auto auto 50%; }
  .unlock-burst i { position:absolute;width:.42rem;height:.7rem;margin:-.35rem 0 0 -.21rem;border-radius:.1rem;background:var(--c);opacity:0;animation:unlock-burst 1.1s cubic-bezier(.15,.8,.3,1) calc(.2s + var(--d)) both; }
  .unlock-sparkles b { position:absolute;color:#e6a527;font-size:1rem;opacity:0;animation:unlock-twinkle 1.8s ease-in-out infinite; }
  .unlock-sparkles b:nth-child(1) { top:12%;left:8%;animation-delay:.5s; }
  .unlock-sparkles b:nth-child(2) { top:58%;left:2%;animation-delay:1.1s;font-size:.75rem; }
  .unlock-sparkles b:nth-child(3) { top:30%;right:4%;animation-delay:.8s;font-size:.8rem; }
  .unlock-sparkles b:nth-child(4) { bottom:6%;right:12%;animation-delay:1.4s; }

  .unlock-kicker { margin:0;color:#a45e38;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;animation:unlock-in .4s ease-out .45s both; }
  .unlock-card h2 { margin:0;font-family:'DM Serif Display',serif;font-size:1.6rem;font-weight:400;line-height:1;animation:unlock-in .4s ease-out .55s both; }
  .unlock-source { margin:0;color:#596477;font-size:.76rem;font-weight:700;line-height:1.4;animation:unlock-in .4s ease-out .65s both; }
  .unlock-actions { display:grid;grid-template-columns:1fr 1fr;gap:.45rem;width:100%;margin-top:.35rem;animation:unlock-in .4s ease-out .8s both; }
  .unlock-actions .btn-play { justify-content:center;min-height:2.6rem;font-size:.7rem;text-decoration:none; }
  .unlock-worn { grid-column:1 / -1;display:inline-flex;align-items:center;justify-content:center;gap:.3rem;min-height:2.6rem;color:#34824d;font-weight:900;animation:unlock-pop .4s cubic-bezier(.34,1.56,.64,1); }
  .unlock-worn :global(svg) { width:1.2rem;height:1.2rem; }

  @keyframes unlock-pop { from { transform:scale(.6) rotate(-4deg);opacity:0; } }
  @keyframes unlock-spin { to { transform:rotate(360deg); } }
  @keyframes unlock-medal { from { transform:scale(0) rotate(-60deg); } }
  @keyframes unlock-shine { 0%,100% { filter:brightness(1); } 50% { filter:brightness(1.18); } }
  @keyframes unlock-rise { from { transform:translateY(1.5rem) scale(.4);opacity:0; } }
  @keyframes unlock-hop { 0%,100% { transform:translateY(0); } 30% { transform:scale(1.06,.92); } 55% { transform:translateY(-.9rem) rotate(-3deg); } 80% { transform:scale(1.03,.96); } }
  @keyframes unlock-burst { 0% { opacity:1;transform:rotate(var(--a)) translateY(0) scale(.5); } 100% { opacity:0;transform:rotate(var(--a)) translateY(calc(var(--r) * -1)) rotate(220deg) scale(1); } }
  @keyframes unlock-twinkle { 0%,100% { opacity:0;transform:scale(.4); } 50% { opacity:1;transform:scale(1.15) rotate(20deg); } }
  @keyframes unlock-in { from { opacity:0;transform:translateY(.5rem); } }
  @media (prefers-reduced-motion:reduce) {
    .unlock-card,.unlock-rays,.unlock-medal,.unlock-character,.unlock-kicker,.unlock-card h2,.unlock-source,.unlock-actions,.unlock-worn { animation:none; }
    .unlock-burst,.unlock-sparkles { display:none; }
  }
  :global(html.dark) .unlock-card { background:#213a5d;color:#fffdf7;border-color:#0b1626;box-shadow:5px 5px 0 #0b1626; }
  :global(html.dark) .unlock-source { color:rgba(255,253,247,.75); }
  :global(html.dark) .unlock-kicker { color:#e6a527; }
</style>
