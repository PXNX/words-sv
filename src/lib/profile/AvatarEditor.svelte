<!--
  Puts together the learner's own story character: a big preview that reacts to every pick, a row of
  parts (face, skin, eyes, …) and the choices for the open part, drawn as little previews or swatches.
  Used in the intro and on the profile page; `onchange` gets every new look.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playSoundEffect } from '#lib/sounds.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import type { Mood } from '#lib/story/stories.js';
  import { avatarChoices, avatarParts, randomAvatar, type Avatar, type AvatarPart } from './avatar.js';
  import IconCasino from '~icons/material-symbols/casino-rounded';

  let { value, onchange }: { value: Avatar; onchange: (next: Avatar) => void } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const partLabels = $derived<Record<AvatarPart, string>>({
    face: m.avatar_face({}, locale),
    skin: m.avatar_skin({}, locale),
    eyes: m.avatar_eyes({}, locale),
    nose: m.avatar_nose({}, locale),
    hairStyle: m.avatar_hair({}, locale),
    hair: m.avatar_hair_colour({}, locale),
    shirt: m.avatar_shirt({}, locale),
    top: m.avatar_shirt_colour({}, locale),
    extra: m.avatar_extra({}, locale)
  });
  const randomLabel = $derived(m.avatar_random({}, locale));
  // Colours are picked from swatches; the rest from small previews of the character, zoomed in on
  // the head for everything but the top.
  const colourParts: AvatarPart[] = ['skin', 'hair', 'top'];
  const bodyParts: AvatarPart[] = ['shirt'];

  let part = $state<AvatarPart>('face');
  let mood = $state<Mood>('happy');
  let bump = $state(0);
  let rolling = $state(false);
  let moodTimer: number | undefined;

  // The preview pulls a face at every pick and settles back into a smile.
  function react(next: Mood) {
    mood = next;
    bump += 1;
    window.clearTimeout(moodTimer);
    moodTimer = window.setTimeout(() => (mood = 'happy'), 900);
  }
  $effect(() => () => window.clearTimeout(moodTimer));

  function choose(choice: string) {
    if (value[part] === choice) return;
    onchange({ ...value, [part]: choice });
    playSoundEffect(settings.sound, 'pop');
    react(part === 'extra' || part === 'hairStyle' ? 'surprised' : part === 'nose' ? 'laughing' : 'curious');
  }
  function roll() {
    onchange(randomAvatar());
    playSoundEffect(settings.sound, 'pop');
    rolling = false;
    requestAnimationFrame(() => (rolling = true));
    react('laughing');
  }
</script>

<div class="avatar-editor">
  <div class="avatar-stage">
    {#key bump}<span class="avatar-preview" aria-hidden="true"><StoryCharacter id="kumar" avatar={value} {mood} /></span>{/key}
    <button type="button" class="btn-play btn-play-round avatar-roll" class:rolling onanimationend={() => (rolling = false)} onclick={roll} aria-label={randomLabel} title={randomLabel}><IconCasino aria-hidden="true" /></button>
  </div>
  <div class="avatar-parts" role="tablist">
    {#each avatarParts as key (key)}
      <button type="button" role="tab" class="avatar-part" class:active={part === key} aria-selected={part === key} onclick={() => (part = key)}>{partLabels[key]}</button>
    {/each}
  </div>
  <div class="avatar-choices" class:swatches={colourParts.includes(part)} role="radiogroup" aria-label={partLabels[part]}>
    {#each avatarChoices[part] as choice, index (choice)}
      {@const picked = value[part] === choice}
      {#if colourParts.includes(part)}
        <button type="button" role="radio" class="avatar-swatch" class:picked aria-checked={picked} aria-label={`${partLabels[part]} ${index + 1}`} style:--swatch={choice} onclick={() => choose(choice)}></button>
      {:else}
        <button type="button" role="radio" class="avatar-tile" class:picked class:zoom={!bodyParts.includes(part)} aria-checked={picked} aria-label={`${partLabels[part]} ${index + 1}`} onclick={() => choose(choice)}>
          <StoryCharacter id="kumar" avatar={{ ...value, [part]: choice }} still />
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .avatar-editor { display:grid;gap:.7rem;min-width:0; }
  .avatar-stage { position:relative;display:flex;justify-content:center;align-items:flex-end;height:9.5rem;border-radius:18px 12px 16px 13px / 13px 16px 12px 18px;background:radial-gradient(circle at 50% 85%,rgba(230,165,39,.32),transparent 60%),rgba(23,42,69,.05); }
  .avatar-preview { display:block;width:7.2rem;height:9rem;transform-origin:50% 100%;animation:avatar-hop .45s cubic-bezier(.34,1.56,.64,1); }
  .avatar-preview :global(.story-character) { width:100%;height:100%; }
  .avatar-roll { position:absolute;top:.5rem;right:.5rem; }
  .avatar-roll :global(svg) { width:1.15rem;height:1.15rem; }
  .avatar-roll.rolling :global(svg) { animation:avatar-roll .5s cubic-bezier(.34,1.56,.64,1); }
  .avatar-parts { display:flex;gap:.35rem;overflow-x:auto;padding:.1rem .1rem .3rem;scrollbar-width:none; }
  .avatar-parts::-webkit-scrollbar { display:none; }
  .avatar-part { flex:none;min-height:1.9rem;padding:0 .7rem;border:2px solid #172a45;border-radius:999px;background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:transform .15s ease,background .15s ease; }
  .avatar-part.active { background:#172a45;color:#fffdf7; }
  .avatar-part:active { transform:scale(.94); }
  .avatar-choices { display:grid;grid-template-columns:repeat(auto-fill,minmax(3.6rem,1fr));gap:.45rem; }
  .avatar-choices.swatches { grid-template-columns:repeat(auto-fill,minmax(2.5rem,1fr));justify-items:center; }
  .avatar-tile { position:relative;overflow:hidden;aspect-ratio:1;padding:0;border:2px solid rgba(23,42,69,.22);border-radius:14px 10px 13px 11px;background:#fffdf7;cursor:pointer;transition:transform .15s cubic-bezier(.34,1.56,.64,1),border-color .15s ease; }
  .avatar-tile :global(.story-character) { width:100%;height:100%; }
  .avatar-tile.zoom :global(.story-character) { width:133%;height:166%;margin:-6% 0 0 -16.5%; }
  .avatar-tile.picked { border-color:#172a45;background:#fbe6b5;box-shadow:2px 2px 0 #172a45; }
  .avatar-swatch { width:2.3rem;height:2.3rem;padding:0;border:2px solid rgba(23,42,69,.3);border-radius:50%;background:var(--swatch);cursor:pointer;transition:transform .15s cubic-bezier(.34,1.56,.64,1); }
  .avatar-swatch.picked { border-color:#172a45;box-shadow:0 0 0 3px #fffdf7,0 0 0 5px #172a45;transform:scale(1.08); }
  .avatar-tile:hover,.avatar-swatch:hover { transform:translateY(-2px) rotate(-2deg); }
  .avatar-tile:active,.avatar-swatch:active { transform:scale(.92); }
  .avatar-part:focus-visible,.avatar-tile:focus-visible,.avatar-swatch:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  :global(html.dark) .avatar-stage { background:radial-gradient(circle at 50% 85%,rgba(230,165,39,.28),transparent 60%),rgba(11,22,38,.35); }
  :global(html.dark) .avatar-part { border-color:#0b1626;background:#2b4a70;color:#fffdf7; }
  :global(html.dark) .avatar-part.active { background:#e6a527;color:#172a45; }
  :global(html.dark) .avatar-tile { border-color:rgba(255,253,247,.25);background:#2b4a70; }
  :global(html.dark) .avatar-tile.picked { border-color:#e6a527;background:#3d5f8a;box-shadow:2px 2px 0 #0b1626; }
  :global(html.dark) .avatar-swatch.picked { box-shadow:0 0 0 3px #213a5d,0 0 0 5px #e6a527; }
  @keyframes avatar-hop { 0% { scale:1; } 35% { scale:1.08 .92; } 65% { translate:0 -.5rem;scale:.97 1.04; } 100% { scale:1;translate:0 0; } }
  @keyframes avatar-roll { from { transform:rotate(0) scale(1); } 50% { transform:rotate(200deg) scale(1.25); } to { transform:rotate(360deg) scale(1); } }
  @media (prefers-reduced-motion:reduce) { .avatar-preview,.avatar-roll.rolling :global(svg) { animation:none; } .avatar-tile,.avatar-swatch,.avatar-part { transition:none; } }
</style>
