<!--
  Puts together the learner's own story character: a big preview that reacts to every pick, a row of
  parts (face, skin, eyes, …) and the choices for the open part, drawn as little previews or swatches.
  Used in the intro and on the profile page; `onchange` gets every new look.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playSoundEffect } from '#lib/feedback/sounds.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import type { Mood } from '#lib/story/stories.js';
  import { avatarChoices, avatarParts, randomAvatar, type Avatar, type AvatarPart } from './avatar.js';
  import { cosmetics, cosmeticState, isLocked, rewardFor, type CosmeticMode, type RewardId } from './cosmetics.svelte.js';
  import type { AchievementId } from '#lib/progress/achievements.js';
  import IconCasino from '~icons/material-symbols/casino-rounded';
  import IconLock from '~icons/material-symbols/lock-rounded';

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
  const lockedLabel = $derived(m.cosmetic_locked({}, locale));
  // How each reward is earned, shown when a locked one is tapped.
  const modeHints = $derived<Record<CosmeticMode, string>>({
    vocab: m.cosmetic_hint_vocab({}, locale),
    circle: m.cosmetic_hint_circle({}, locale),
    definitions: m.cosmetic_hint_definitions({}, locale),
    wordle: m.cosmetic_hint_wordle({}, locale),
    hangman: m.cosmetic_hint_hangman({}, locale),
    pronunciation: m.cosmetic_hint_pronunciation({}, locale),
    alltag: m.cosmetic_hint_alltag({}, locale),
    grammar: m.cosmetic_hint_grammar({}, locale),
    story: m.cosmetic_hint_story({}, locale),
    reading: m.cosmetic_hint_reading({}, locale),
    listen: m.cosmetic_hint_listen({}, locale),
    conversation: m.cosmetic_hint_conversation({}, locale)
  });
  const achievementNames = $derived<Record<AchievementId, string>>({
    first_step: m.achievement_first_step({}, locale),
    vocab_100: m.achievement_vocab_100({}, locale),
    story_5: m.achievement_story_5({}, locale),
    reading_5: m.achievement_reading_5({}, locale),
    grammar_50: m.achievement_grammar_50({}, locale),
    perfect_10: m.achievement_perfect_10({}, locale),
    streak_3: m.achievement_streak_3({}, locale),
    streak_7: m.achievement_streak_7({}, locale),
    mastered_50: m.achievement_mastered_50({}, locale),
    all_rounder: m.achievement_all_rounder({}, locale),
    streak_14: m.achievement_streak_14({}, locale),
    vocab_500: m.achievement_vocab_500({}, locale),
    perfect_30: m.achievement_perfect_30({}, locale),
    reading_15: m.achievement_reading_15({}, locale),
    story_15: m.achievement_story_15({}, locale),
    grammar_200: m.achievement_grammar_200({}, locale),
    mastered_200: m.achievement_mastered_200({}, locale),
    streak_30: m.achievement_streak_30({}, locale)
  });
  // How each reward is earned: its mode's own hint, the badge it comes with, or the high score.
  function rewardHint(id: RewardId): string {
    const source = cosmetics[id].source;
    if (source.kind === 'mode') return modeHints[source.mode];
    if (source.kind === 'achievement') return m.cosmetic_hint_achievement({ name: achievementNames[source.achievement] }, locale);
    if (source.kind === 'language') return m.cosmetic_hint_language({ count: source.target, language: new Intl.DisplayNames([settings.interfaceLocale], { type: 'language' }).of(source.language) ?? source.language }, locale);
    if (source.score === 'wordle_two') return m.cosmetic_hint_score_wordle({}, locale);
    if (source.score === 'hangman_five') return m.cosmetic_hint_score_hangman({}, locale);
    return m.cosmetic_hint_score_vocab({}, locale);
  }
  let lockedHint = $state<RewardId | null>(null);
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
    if (isLocked(part, choice, cosmeticState.unlocked)) {
      lockedHint = rewardFor(part, choice);
      playSoundEffect(settings.sound, 'pop');
      react('curious');
      return;
    }
    lockedHint = null;
    if (value[part] === choice) return;
    onchange({ ...value, [part]: choice });
    playSoundEffect(settings.sound, 'pop');
    react(part === 'extra' || part === 'hairStyle' ? 'surprised' : part === 'nose' ? 'laughing' : 'curious');
  }
  function roll() {
    onchange(randomAvatar(cosmeticState.unlocked));
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
      <button type="button" role="tab" class="avatar-part" class:active={part === key} aria-selected={part === key} onclick={() => { part = key; lockedHint = null; }}>{partLabels[key]}</button>
    {/each}
  </div>
  <div class="avatar-choices" class:swatches={colourParts.includes(part)} role="radiogroup" aria-label={partLabels[part]}>
    {#each avatarChoices[part] as choice, index (choice)}
      {@const picked = value[part] === choice}
      {@const locked = isLocked(part, choice, cosmeticState.unlocked)}
      {#if colourParts.includes(part)}
        <button type="button" role="radio" class="avatar-swatch" class:picked class:locked aria-checked={picked} aria-label={locked ? `${partLabels[part]} ${index + 1}: ${lockedLabel}` : `${partLabels[part]} ${index + 1}`} style:--swatch={choice} onclick={() => choose(choice)}>{#if locked}<IconLock class="avatar-lock" aria-hidden="true" />{/if}</button>
      {:else}
        <button type="button" role="radio" class="avatar-tile" class:picked class:locked class:zoom={!bodyParts.includes(part)} aria-checked={picked} aria-label={locked ? `${partLabels[part]} ${index + 1}: ${lockedLabel}` : `${partLabels[part]} ${index + 1}`} onclick={() => choose(choice)}>
          <StoryCharacter id="kumar" avatar={{ ...value, [part]: choice }} still />
          {#if locked}<IconLock class="avatar-lock" aria-hidden="true" />{/if}
        </button>
      {/if}
    {/each}
  </div>
  {#if lockedHint}<p class="avatar-locked-hint" role="status"><IconLock aria-hidden="true" /> {rewardHint(lockedHint)}</p>{/if}
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
  .avatar-tile.locked :global(.story-character) { filter:grayscale(1);opacity:.45; }
  .avatar-swatch.locked { position:relative;opacity:.55;display:grid;place-items:center; }
  .avatar-choices :global(.avatar-lock) { position:absolute;right:.2rem;bottom:.2rem;width:.95rem;height:.95rem;color:#172a45; }
  .avatar-swatch.locked :global(.avatar-lock) { position:static;color:#fffdf7;filter:drop-shadow(0 0 1px #172a45); }
  .avatar-locked-hint { display:flex;align-items:flex-start;gap:.35rem;margin:0;padding:.5rem .65rem;border-radius:12px;background:rgba(230,165,39,.18);font-size:.72rem;font-weight:800;line-height:1.35; }
  .avatar-locked-hint :global(svg) { flex:none;width:.95rem;height:.95rem;margin-top:.05rem; }
  :global(html.dark) .avatar-choices :global(.avatar-lock) { color:#fffdf7; }
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
