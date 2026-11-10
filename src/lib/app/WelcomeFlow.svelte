<!--
  The first time someone opens the app: a short, animated welcome where Mia, Tom and Lilith walk
  in and introduce themselves, then the learning language, the learner's name and their own
  character, ending in a small celebration. Learners who already chose a language before names
  existed start at the name step; the character step is skipped when they already have one.
-->
<script lang="ts">
  import { fly, scale, fade } from 'svelte/transition';
  import { backOut, cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { settings, interfaceLocales, FIRST_NAME_MAX_LENGTH } from '#lib/state/settings.svelte.js';
  import { playableLanguages, type Language } from '#lib/data/vocabulary.js';
  import { playSoundEffect } from '#lib/feedback/sounds.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { randomAvatar, type Avatar } from '#lib/profile/avatar.js';
  import AvatarEditor from '#lib/profile/AvatarEditor.svelte';
  import SelectMenu from '#lib/settings/SelectMenu.svelte';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import WalkingLilith from '#lib/story/WalkingLilith.svelte';
  import type { CharacterId } from '#lib/story/stories.js';

  type Step = 'hello' | 'cast' | 'language' | 'name' | 'look' | 'done';
  let { start = 'hello', onlanguage, onfinish }: {
    start?: Step;
    onlanguage: (language: Language) => void;
    onfinish: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let step = $state<Step>(start);
  let castIndex = $state(0);
  let nameDraft = $state(settings.firstName);
  let lookDraft = $state<Avatar>(randomAvatar());

  const locale = $derived({ locale: settings.interfaceLocale });
  const still = $derived(prefersReducedMotion.current);
  const ms = (duration: number) => (still ? 0 : duration);
  const steps = $derived<Step[]>(start === 'hello' ? ['hello', 'cast', 'language', 'name', ...(settings.avatar ? [] : ['look' as const])] : ['name', ...(settings.avatar ? [] : ['look' as const])]);
  const position = $derived(Math.max(0, steps.indexOf(step)));

  // Each friend says who they are and what they do in the app.
  const cast = $derived<Array<{ id: CharacterId; line: string }>>([
    { id: 'tom', line: m.welcome_meet_tom({}, locale) },
    { id: 'mia', line: m.welcome_meet_mia({}, locale) },
    { id: 'lilith', line: m.welcome_meet_lilith({}, locale) }
  ]);
  const interfaceOptions = interfaceLocales.map((entry) => ({ value: entry.code as string, label: entry.label }));

  function go(next: Step) {
    haptic('tap');
    step = next;
  }
  function nextFriend() {
    if (castIndex < cast.length - 1) {
      castIndex += 1;
      haptic('tap');
    } else go('language');
  }
  function chooseLanguage(language: Language) {
    onlanguage(language);
    go('name');
  }
  function submitName(event: SubmitEvent) {
    event.preventDefault();
    if (!nameDraft.trim()) return;
    settings.setFirstName(nameDraft);
    if (settings.avatar) celebrate();
    else go('look');
  }
  function submitLook(event: SubmitEvent) {
    event.preventDefault();
    settings.setAvatar(lookDraft);
    celebrate();
  }
  function celebrate() {
    step = 'done';
    haptic('win');
    playSoundEffect(settings.sound, 'purr');
  }
  function pet() {
    playSoundEffect(settings.sound, 'purr');
    haptic('select');
  }
  // Confetti for the finale: a fixed spread so it looks the same on every device.
  const CONFETTI = ['#e6a527', '#e86a9a', '#4b78c2', '#34824d', '#d64b45', '#8a62b6'];
  const pieces = Array.from({ length: 22 }, (_, index) => ({ color: CONFETTI[index % CONFETTI.length], left: (index * 41) % 100, delay: (index % 7) * 0.06, spin: index % 2 ? 1 : -1 }));
</script>

<div class="welcome" class:still>
  {#if step !== 'hello' && step !== 'done'}
    <ol class="welcome-dots" aria-hidden="true">{#each steps as entry, index (entry)}<li class:active={index <= position}></li>{/each}</ol>
  {/if}

  {#key step}
    <div class="welcome-step" in:fly={{ x: 40, duration: ms(380), delay: ms(120), easing: cubicOut }} out:fly={{ x: -40, duration: ms(180) }}>
      {#if step === 'hello'}
        <label class="welcome-locale">
          <span class="sr-only">{m.interface_language({}, locale)}</span>
          <SelectMenu class="w-[9.6rem]" value={settings.interfaceLocale} options={interfaceOptions} label={m.interface_language({}, locale)} onchange={(value) => { if (interfaceLocales.some((entry) => entry.code === value)) settings.setInterfaceLocale(value as typeof settings.interfaceLocale); }} />
        </label>
        <span class="welcome-rings" aria-hidden="true"><i></i><b></b></span>
        <div class="welcome-parade">
          <span class="walk-in left" aria-hidden="true" style="--d:.25s"><StoryCharacter id="mia" mood="happy" /></span>
          <span class="welcome-stroll"><WalkingLilith from="right" label={m.pet_lilith({}, locale)} onpet={pet} /></span>
          <span class="walk-in right" style="--d:.5s" aria-hidden="true"><StoryCharacter id="tom" mood="happy" /></span>
        </div>
        <p class="welcome-kicker rise" style="--d:1s">{m.welcome_kicker({}, locale)}</p>
        <h1 class="rise" style="--d:1.1s">{m.welcome_title({}, locale)}</h1>
        <span class="welcome-body rise" style="--d:1.2s">{m.welcome_body({}, locale)}</span>
        <button type="button" class="btn-play btn-play-ink welcome-cta rise" style="--d:1.35s" onclick={() => go('cast')}>{m.welcome_start({}, locale)}</button>
      {:else if step === 'cast'}
        {@const friend = cast[castIndex]!}
        <p class="welcome-kicker">{m.welcome_meet_title({}, locale)}</p>
        <div class="welcome-friends" aria-hidden="true">
          {#each cast as entry, index (entry.id)}
            <span class="welcome-friend" class:speaking={index === castIndex} class:met={index < castIndex}><StoryCharacter id={entry.id} mood={index === castIndex ? 'happy' : 'neutral'} talking={index === castIndex && !still} /></span>
          {/each}
        </div>
        {#key castIndex}
          <p class="welcome-bubble" class:lilith={friend.id === 'lilith'} in:scale={{ start: 0.85, duration: ms(320), easing: backOut }} aria-live="polite">{friend.line}</p>
        {/key}
        <div class="welcome-actions">
          <button type="button" class="btn-play btn-play-soft" onclick={() => go('language')}>{m.welcome_skip({}, locale)}</button>
          <button type="button" class="btn-play btn-play-ink" onclick={nextFriend}>{m.continue({}, locale)}</button>
        </div>
      {:else if step === 'language'}
        <span class="welcome-solo" aria-hidden="true"><StoryCharacter id="lilith" mood="curious" /></span>
        <p class="welcome-kicker">{m.onboarding_learning_language({}, locale)}</p>
        <h1>{m.onboarding_title({}, locale)}</h1>
        <div class="welcome-languages">
          {#each playableLanguages as language, index (language.code)}
            <button type="button" class="btn-play" in:scale={{ start: 0.8, delay: ms(200 + index * 50), duration: ms(260), easing: backOut }} onclick={() => chooseLanguage(language.code)}>{language.label}</button>
          {/each}
        </div>
        <span class="welcome-body">{m.onboarding_subtitle({}, locale)}</span>
      {:else if step === 'name'}
        <div class="welcome-friends small" aria-hidden="true">
          <span class="welcome-friend wave"><StoryCharacter id="mia" mood="happy" /></span>
          <span class="welcome-friend"><StoryCharacter id="lilith" mood={nameDraft.trim() ? 'happy' : 'curious'} /></span>
          <span class="welcome-friend wave" style="--d:.2s"><StoryCharacter id="tom" mood="happy" /></span>
        </div>
        <form class="welcome-form" onsubmit={submitName}>
          <h1>{m.onboarding_name_title({}, locale)}</h1>
          <label class="welcome-field">
            <span>{m.onboarding_name_label({}, locale)}</span>
            <!-- svelte-ignore a11y_autofocus -->
            <input bind:value={nameDraft} type="text" name="given-name" autocomplete="given-name" autocapitalize="words" maxlength={FIRST_NAME_MAX_LENGTH} placeholder={m.onboarding_name_placeholder({}, locale)} required autofocus />
          </label>
          <span class="welcome-body">{m.onboarding_name_hint({}, locale)}</span>
          <button type="submit" class="btn-play btn-play-ink welcome-cta" disabled={!nameDraft.trim()}>{m.continue({}, locale)}</button>
        </form>
      {:else if step === 'look'}
        <form class="welcome-form" onsubmit={submitLook}>
          <h1>{m.avatar_title({}, locale)}</h1>
          <span class="welcome-body">{m.avatar_hint({}, locale)}</span>
          <AvatarEditor value={lookDraft} onchange={(next) => (lookDraft = next)} />
          <button type="submit" class="btn-play btn-play-ink welcome-cta">{m.continue({}, locale)}</button>
        </form>
      {:else}
        <div class="welcome-confetti" aria-hidden="true">{#each pieces as piece}<i style={`--c:${piece.color};--x:${piece.left}%;--d:${piece.delay}s;--s:${piece.spin}`}></i>{/each}</div>
        <div class="welcome-parade finale" aria-hidden="true">
          <span class="hop" style="--d:0s"><StoryCharacter id="mia" mood="laughing" /></span>
          {#if settings.avatar}<span class="hop" style="--d:.12s"><StoryCharacter id="kumar" avatar={settings.avatar} mood="laughing" /></span>{/if}
          <span class="welcome-lilith hop" style="--d:.24s"><StoryCharacter id="lilith" mood="happy" /><span class="welcome-hearts"><b>♥</b><b>♥</b><b>♥</b></span></span>
          <span class="hop" style="--d:.36s"><StoryCharacter id="tom" mood="laughing" /></span>
        </div>
        <h1 in:scale={{ start: 0.7, delay: ms(250), duration: ms(420), easing: backOut }}>{m.welcome_done_title({ name: settings.firstName }, locale)}</h1>
        <span class="welcome-body" in:fade={{ delay: ms(450), duration: ms(300) }}>{m.welcome_done_body({}, locale)}</span>
        <button type="button" class="btn-play btn-play-ink welcome-cta" in:fly={{ y: 16, delay: ms(600), duration: ms(300) }} onclick={onfinish}>{m.welcome_done_go({}, locale)}</button>
      {/if}
    </div>
  {/key}
</div>

<style>
  .welcome { position:relative;width:min(100%,27rem);justify-self:center;display:grid;padding:clamp(1.15rem,6vw,1.8rem);border-radius:22px 14px 20px 15px / 15px 20px 14px 22px;border:2px solid #172a45;background:#fffdf7;box-shadow:4px 4px 0 #172a45;text-align:center;overflow:hidden; }
  .welcome-step { grid-area:1/1;display:grid;justify-items:center;gap:.8rem; }
  .welcome-dots { position:absolute;top:.7rem;inset-inline:0;display:flex;justify-content:center;gap:.35rem;margin:0;padding:0;list-style:none; }
  .welcome-dots li { width:.45rem;height:.45rem;border-radius:999px;background:rgba(23,42,69,.16);transition:width .3s,background .3s; }
  .welcome-dots li.active { width:1.1rem;background:#e6a527; }
  .welcome-locale { justify-self:end; }
  .welcome h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.9rem,9vw,2.8rem);font-weight:400;letter-spacing:-.04em;line-height:.95; }
  .welcome-kicker { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .welcome-body { color:#596477;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;line-height:1.45; }
  .welcome-cta { width:100%;min-height:2.9rem;justify-content:center;font-size:.78rem; }

  /* the two brand rings draw themselves and settle into their overlap */
  .welcome-rings { position:relative;width:3rem;height:3rem; }
  .welcome-rings i,.welcome-rings b { position:absolute;width:1.9rem;height:1.9rem;border-radius:999px;border:3px solid #172a45; }
  .welcome-rings i { top:0;left:0;animation:welcome-ring-a .7s cubic-bezier(.34,1.56,.64,1) both; }
  .welcome-rings b { right:0;bottom:0;border-color:#e6a527;animation:welcome-ring-b .7s cubic-bezier(.34,1.56,.64,1) .12s both; }

  .welcome-parade { display:flex;align-items:flex-end;justify-content:center;gap:.2rem;height:7rem; }
  .welcome-parade > .walk-in :global(.story-character),.welcome-parade.finale > .hop:not(.welcome-lilith) :global(.story-character) { width:5.4rem;height:100%; }
  /* Lilith strolls in the gap between Mia and Tom (story/WalkingLilith.svelte) */
  .welcome-stroll { flex:1;min-width:6rem;height:5.6rem;align-self:flex-end; }
  .welcome-lilith { position:relative;width:4.6rem;height:5.6rem;padding:0;border:0;background:none;cursor:pointer;align-self:flex-end; }
  .welcome-lilith :global(.story-character) { width:100%; }
  .walk-in { display:block;height:100%;animation:welcome-walk .8s cubic-bezier(.22,1,.36,1) var(--d) both; }
  .walk-in.left { --from:-140%; }
  .walk-in.right { --from:140%; }
  .rise { animation:welcome-rise .45s ease-out var(--d) both; }
  .welcome-hearts { position:absolute;inset:0;pointer-events:none; }
  .welcome-hearts b { position:absolute;top:25%;left:50%;color:#e86a9a;font-size:.95rem;opacity:0;animation:welcome-heart 1.4s ease-out forwards; }
  .welcome-hearts b:nth-child(1) { --hx:-2.2rem; }
  .welcome-hearts b:nth-child(2) { --hx:2rem;animation-delay:.2s; }
  .welcome-hearts b:nth-child(3) { --hx:-.2rem;animation-delay:.4s; }

  .welcome-friends { display:flex;align-items:flex-end;justify-content:center;gap:.5rem;height:6.2rem;margin-top:.6rem; }
  .welcome-friends.small { height:4.6rem; }
  .welcome-friend { display:block;height:100%;opacity:.45;filter:saturate(.6);transform:scale(.86);transform-origin:50% 100%;transition:opacity .3s,filter .3s,transform .35s cubic-bezier(.34,1.56,.64,1); }
  .welcome-friend :global(.story-character) { width:4.6rem;height:100%; }
  .welcome-friend.met { opacity:.8;filter:none; }
  .welcome-friend.speaking { opacity:1;filter:none;transform:scale(1.08);animation:welcome-bob 1.6s ease-in-out infinite; }
  .welcome-friends.small .welcome-friend { opacity:1;filter:none;transform:none; }
  .welcome-friends.small :global(.story-character) { width:3.8rem; }
  .welcome-friend.wave { animation:welcome-bob 1.8s ease-in-out var(--d,0s) infinite; }
  .welcome-bubble { position:relative;margin:.2rem 0 0;padding:.75rem .9rem;border:2px solid #172a45;border-radius:1rem;background:#fff6e0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:800;line-height:1.45; }
  .welcome-bubble::before { content:'';position:absolute;top:-.55rem;left:50%;width:.9rem;height:.9rem;border-top:2px solid #172a45;border-left:2px solid #172a45;background:inherit;transform:translateX(-50%) rotate(45deg); }
  .welcome-bubble.lilith { background:#fde7ef; }
  .welcome-actions { display:grid;grid-template-columns:1fr 1.6fr;gap:.5rem;width:100%; }
  .welcome-actions button { justify-content:center; }

  .welcome-solo { display:block;width:4.4rem;height:5.4rem;margin-top:.6rem;animation:welcome-bob 2s ease-in-out infinite; }
  .welcome-languages { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;width:100%; }
  .welcome-languages button { min-height:2.8rem;justify-content:center;font-size:.74rem;text-transform:none; }
  .welcome-form { display:grid;gap:.8rem;width:100%; }
  .welcome-field { display:grid;gap:.3rem;text-align:start; }
  .welcome-field span { color:#a45e38;font-size:.58rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .welcome-field input { min-height:2.7rem;padding:0 .8rem;border-radius:.7rem;border:1px solid rgba(23,42,69,.28);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:800; }
  .welcome-field input:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }

  .welcome-parade.finale .hop { display:block;height:100%;animation:welcome-pop .5s cubic-bezier(.34,1.56,.64,1) var(--d) both, welcome-hop .9s ease-in-out calc(var(--d) + .6s) 3; transform-origin:50% 100%; }
  .welcome-confetti { position:absolute;inset:0 0 auto;height:12rem;pointer-events:none;overflow:hidden; }
  .welcome-confetti i { position:absolute;top:-1rem;left:var(--x);width:.45rem;height:.8rem;border-radius:.12rem;background:var(--c);opacity:0;animation:welcome-confetti 1.8s cubic-bezier(.2,.7,.4,1) var(--d) forwards; }

  @keyframes welcome-ring-a { from { transform:translate(-1.4rem,-.4rem) scale(.3);opacity:0; } }
  @keyframes welcome-ring-b { from { transform:translate(1.4rem,.4rem) scale(.3);opacity:0; } }
  @keyframes welcome-walk { 0% { transform:translateX(var(--from));opacity:0; } 60% { opacity:1; } 70% { transform:translateX(0) translateY(-.4rem); } 85% { transform:translateY(0) scale(1.04,.96); } 100% { transform:none; } }
  @keyframes welcome-pop { from { transform:scale(.2) rotate(-14deg);opacity:0; } }
  @keyframes welcome-rise { from { opacity:0;transform:translateY(.6rem); } }
  @keyframes welcome-bob { 0%,100% { translate:0 0; } 50% { translate:0 -.25rem; } }
  @keyframes welcome-hop { 0%,100% { transform:translateY(0); } 30% { transform:translateY(0) scale(1.06,.92); } 55% { transform:translateY(-1rem) rotate(-4deg); } 80% { transform:translateY(0) scale(1.03,.96); } }
  @keyframes welcome-heart { 0% { opacity:0;transform:translate(-50%,0) scale(.4); } 25% { opacity:1; } 100% { opacity:0;transform:translate(calc(-50% + var(--hx)),-3rem) scale(1.2); } }
  @keyframes welcome-confetti { 0% { opacity:1;transform:translateY(0) rotate(0); } 100% { opacity:0;transform:translateY(11rem) rotate(calc(var(--s) * 600deg)); } }

  .still *,.still *::before { animation:none !important;transition:none !important; }
  .still .welcome-confetti,.still .welcome-hearts { display:none; }

  :global(html.dark) .welcome { border-color:#0b1626;background:#213a5d;box-shadow:4px 4px 0 #0b1626; }
  :global(html.dark) .welcome h1 { color:#fffdf7; }
  :global(html.dark) .welcome-body { color:rgba(255,253,247,.72); }
  :global(html.dark) .welcome-bubble { border-color:#0b1626;background:#2c4a73;color:#fffdf7; }
  :global(html.dark) .welcome-bubble.lilith { background:#4a2f4f; }
  :global(html.dark) .welcome-field input { border-color:rgba(255,253,247,.4);background:#213a5d;color:#fffdf7; }
  :global(html.dark) .welcome-dots li { background:rgba(255,253,247,.2); }
  :global(html.dark) .welcome-rings i { border-color:#fffdf7; }
</style>
