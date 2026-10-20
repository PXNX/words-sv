<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playErrorSound, playSoundEffect, playSuccessSound } from '#lib/sounds.js';
  import { characterNames, fillName, moodFor, storiesFor, type CharacterId, type Mood, type Story, type StoryBeat } from './stories';
  import type { SoundEffect } from '#lib/sounds.js';
  import StoryCharacter from './StoryCharacter.svelte';
  import StoryScene from './StoryScene.svelte';
  import { generateStory, hasMissedWords } from './generated';
  import { clearMissedWord, recordMissedWord } from './missedWords';
  import { applyVoice, type Speaker } from './voices';
  import { LipSync } from './lipSync.svelte';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconVolumeOff from '~icons/material-symbols/volume-off-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  const COMPLETED_KEY = 'wordcircle-story-completed-v1';
  const AUTO_READ_KEY = 'wordcircle-story-auto-read-v1';
  const startlingSounds: SoundEffect[] = ['glass', 'brakes', 'doorbell', 'knock'];
  const speechLocales: Record<string, string> = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-BR', uk: 'uk-UA' };

  const labels = $derived({
    title: m.story_title({}, { locale: settings.interfaceLocale }),
    question: m.story_question({}, { locale: settings.interfaceLocale }),
    reply: m.story_reply({}, { locale: settings.interfaceLocale }),
    finished: m.story_finished({}, { locale: settings.interfaceLocale }),
    next: m.story_next({}, { locale: settings.interfaceLocale }),
    again: m.story_again({}, { locale: settings.interfaceLocale }),
    listen: m.story_listen({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    tryAgain: m.learning_try_again({}, { locale: settings.interfaceLocale }),
    forYou: m.story_for_you({}, { locale: settings.interfaceLocale }),
    practiceWords: m.story_practice_words({}, { locale: settings.interfaceLocale }),
    petLilith: m.pet_lilith({}, { locale: settings.interfaceLocale }),
    autoRead: m.story_auto_read({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));

  let story = $state<Story | null>(null);
  let revealed = $state(1);
  let orders = $state<number[][]>([]);
  let wrong = $state<Record<number, number[]>>({});
  let solved = $state<Record<number, true>>({});
  let transcript = $state<HTMLElement | null>(null);
  let speechSupported = $state(false);
  const lipSync = new LipSync();
  let autoRead = $state(typeof localStorage !== 'undefined' && localStorage.getItem(AUTO_READ_KEY) === 'on');
  let reaction = $state<{ who: CharacterId | 'all'; mood: Mood } | null>(null);

  const lang = $derived(settings.lang);
  const name = $derived(settings.firstName);
  const currentIndex = $derived(revealed - 1);
  const current = $derived(story?.beats[currentIndex] ?? null);
  const awaitingAnswer = $derived(isInteractive(current) && !solved[currentIndex]);
  const finished = $derived(Boolean(story) && revealed === story!.beats.length && !awaitingAnswer);
  const lineSpeaker = $derived(current?.kind === 'line' ? current.speaker : current?.kind === 'reply' ? current.to : null);
  // Whoever is being read aloud takes the spotlight; otherwise the speaker of the current beat.
  const speaker = $derived(lipSync.speaker ?? lineSpeaker);
  const interactiveIndices = $derived(story ? story.beats.flatMap((beat, index) => (isInteractive(beat) ? [index] : [])) : []);
  const firstTry = $derived(interactiveIndices.filter((index) => !wrong[index]?.length).length);

  function isInteractive(beat: StoryBeat | null): beat is Extract<StoryBeat, { kind: 'question' | 'reply' }> {
    return beat?.kind === 'question' || beat?.kind === 'reply';
  }
  function say(text: string) {
    return fillName(text, name);
  }
  function shuffledOrder(length: number) {
    const order = Array.from({ length }, (_, index) => index);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [order[index], order[swap]] = [order[swap], order[index]];
    }
    return order;
  }
  function readCompleted(): string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
  function markCompleted(id: string) {
    const completed = readCompleted();
    if (!completed.includes(id)) localStorage.setItem(COMPLETED_KEY, JSON.stringify([...completed, id]));
  }
  function start(next: Story) {
    cancelSpeech();
    story = next;
    revealed = 1;
    wrong = {};
    solved = {};
    orders = next.beats.map((beat) => (isInteractive(beat) ? shuffledOrder(beat.options.length) : []));
    reaction = null;
    presentBeat(next.beats[0]);
  }
  // A beat's own sound effect (or Lilith purring whenever she speaks), plus the line read aloud
  // in the speaker's voice when auto-read is on.
  function presentBeat(beat: StoryBeat | undefined) {
    if (!beat) return;
    if ((beat.kind === 'narration' || beat.kind === 'line') && beat.sfx) playSoundEffect(settings.sound, beat.sfx);
    else if (beat.kind === 'line' && beat.speaker === 'lilith') playSoundEffect(settings.sound, 'purr');
    if (autoRead && beat.kind === 'line' && story) speak(say(beat.text[lang]), beat.speaker, story.beats.indexOf(beat));
  }
  function toggleAutoRead() {
    autoRead = !autoRead;
    localStorage.setItem(AUTO_READ_KEY, autoRead ? 'on' : 'off');
    if (autoRead && current?.kind === 'line') speak(say(current.text[lang]), current.speaker, currentIndex);
    else if (!autoRead) cancelSpeech();
  }
  // Faces in the scene: whoever is talking shows the line's mood, a loud sound startles everyone,
  // and answering makes the character you talk to (or the whole cast) react.
  function castMood(member: CharacterId): Mood {
    if (reaction && (reaction.who === 'all' || reaction.who === member)) return reaction.mood;
    if (current?.kind === 'narration' && current.sfx && startlingSounds.includes(current.sfx)) return 'surprised';
    if (current?.kind === 'line' && current.speaker === member) return moodFor(current);
    if (current?.kind === 'reply' && current.to === member) return 'curious';
    return 'neutral';
  }
  function storyForYou() {
    return generateStory(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary);
  }
  // Unread stories in level order first. After a written story, a story made from the learner's own
  // words follows whenever there are words to practise; once everything is read, written stories
  // and generated ones take turns.
  function pickStory(skip?: string): Story {
    const pool = storiesFor(settings.vocabularyLevel, settings.includeLowerVocabulary);
    const completed = readCompleted();
    const unread = pool.find((candidate) => !completed.includes(candidate.id) && candidate.id !== skip);
    if (story && !story.generated && (!unread || hasMissedWords(settings.lang))) {
      const generated = storyForYou();
      if (generated) return generated;
    }
    if (unread) return unread;
    const others = pool.filter((candidate) => candidate.id !== skip);
    const candidates = others.length ? others : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  function advance() {
    if (!story || awaitingAnswer || revealed >= story.beats.length) return;
    revealed += 1;
    reaction = null;
    presentBeat(story.beats[revealed - 1]);
    if (revealed === story.beats.length && !isInteractive(story.beats[revealed - 1]) && !story.generated) markCompleted(story.id);
  }
  function choose(option: number) {
    if (!story || !awaitingAnswer) return;
    const focus = current?.kind === 'question' || current?.kind === 'reply' ? current.focus : undefined;
    const who = current?.kind === 'reply' ? current.to : 'all';
    reaction = { who, mood: option === 0 ? 'happy' : 'curious' };
    if (option === 0) {
      if (focus && !wrong[currentIndex]?.length) clearMissedWord(lang, focus);
      solved = { ...solved, [currentIndex]: true };
      playSuccessSound(settings.sound, 'vocab');
      if (revealed === story.beats.length && !story.generated) markCompleted(story.id);
      return;
    }
    if (focus) recordMissedWord(lang, focus);
    wrong = { ...wrong, [currentIndex]: [...(wrong[currentIndex] ?? []), option] };
    playErrorSound(settings.sound, 'vocab');
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(60);
  }
  function speak(text: string, speaker: Speaker = 'narrator', beat: number | null = null) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    lipSync.stop();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocales[lang] ?? lang;
    applyVoice(utterance, speaker, lang, settings.vocabularyLevel === 'a1' || settings.vocabularyLevel === 'a2' ? 0.85 : 1);
    if (speaker !== 'narrator') lipSync.attach(utterance, text, speaker, beat);
    window.speechSynthesis.speak(utterance);
  }
  function cancelSpeech() {
    lipSync.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  // A new level (or the "include lower levels" toggle) means a different story pool.
  $effect(() => {
    settings.vocabularyLevel;
    settings.includeLowerVocabulary;
    untrack(() => start(pickStory()));
  });
  $effect(() => {
    revealed;
    solved;
    void tick().then(() => transcript?.scrollTo({ top: transcript.scrollHeight, behavior: 'smooth' }));
  });

  onMount(() => {
    if (!settings.firstName) void goto('/', { replaceState: true });
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    return cancelSpeech;
  });
</script>

{#if story}
  <section class="story-view" aria-label={labels.title}>
    {#if speechSupported}<button type="button" class="btn-play btn-play-round story-auto-read" class:btn-play-ink={autoRead} onclick={toggleAutoRead} aria-pressed={autoRead} aria-label={labels.autoRead} title={labels.autoRead}>{#if autoRead}<IconVolume aria-hidden="true" />{:else}<IconVolumeOff aria-hidden="true" />{/if}</button>{/if}
    <header class="story-header" dir={interfaceDirection} lang={settings.interfaceLocale}>
      <p>{story.generated ? labels.forYou : labels.title} · {story.level.toUpperCase()}</p>
      <h1 lang={lang}>{story.title[lang]}</h1>
    </header>

    <div class="story-stage">
      <StoryScene scene={story.scene} />
      <div class="story-cast">
        {#each story.cast as member (member)}
          <figure class:active={speaker === member} class:speaking={lipSync.speaker === member} class:dimmed={speaker !== null && speaker !== member} class:pet={member === 'bello' || member === 'lilith'}>
            <StoryCharacter id={member} mood={castMood(member)} talking={!lipSync.speaker && current?.kind === 'line' && current.speaker === member} mouth={lipSync.speaker === member ? lipSync.open : null} label={characterNames[member][lang]} />
            {#if member === 'lilith'}<button type="button" class="story-pet" onclick={() => playSoundEffect(settings.sound, 'purr')} aria-label={labels.petLilith}></button>{/if}
            <figcaption>{characterNames[member][lang]}</figcaption>
          </figure>
        {/each}
      </div>
    </div>

    <ol class="story-transcript" bind:this={transcript} lang={lang} aria-live="polite">
      {#each story.beats.slice(0, revealed) as beat, index (index)}
        {#if beat.kind === 'narration'}
          <li class="story-narration">
            <p>{say(beat.text[lang])}</p>
            {#if speechSupported}<button type="button" class="btn-play btn-play-round btn-play-sm story-listen" onclick={() => speak(say(beat.text[lang]))} aria-label={labels.listen}><IconVolume aria-hidden="true" /></button>{/if}
          </li>
        {:else if beat.kind === 'line'}
          <li class="story-line" class:current={index === currentIndex} class:speaking={lipSync.beat === index}>
            <span class="story-avatar" aria-hidden="true"><StoryCharacter id={beat.speaker} mood={moodFor(beat)} mouth={lipSync.beat === index && lipSync.speaker === beat.speaker ? lipSync.open : null} /></span>
            <div class="story-bubble">
              <b>{characterNames[beat.speaker][lang]}</b>
              <p>{say(beat.text[lang])}</p>
            </div>
            {#if speechSupported}<button type="button" class="btn-play btn-play-round btn-play-sm story-listen" onclick={() => speak(say(beat.text[lang]), beat.speaker, index)} aria-label={labels.listen}><IconVolume aria-hidden="true" /></button>{/if}
          </li>
        {:else if beat.kind === 'question'}
          <li class="story-question" class:solved={solved[index]}>
            <small dir={interfaceDirection} lang={settings.interfaceLocale}>{labels.question}</small>
            <p>{say(beat.prompt[lang])}</p>
            {#if solved[index]}<span class="story-answer"><IconCheck aria-hidden="true" />{say(beat.options[0][lang])}</span>{/if}
          </li>
        {:else if beat.kind === 'reply' && solved[index]}
          <li class="story-line story-line--you">
            <div class="story-bubble">
              <b>{name}</b>
              <p>{say(beat.options[0][lang])}</p>
            </div>
          </li>
        {/if}
      {/each}
    </ol>

    <footer class="story-footer">
      {#if awaitingAnswer && isInteractive(current)}
        <p class="story-prompt" dir={interfaceDirection} lang={settings.interfaceLocale}>
          {current.kind === 'reply' ? labels.reply : labels.question}
          {#if wrong[currentIndex]?.length}<span>{labels.tryAgain}</span>{/if}
        </p>
        <div class="story-options" lang={lang}>
          {#each orders[currentIndex] ?? [] as option (option)}
            {@const missed = wrong[currentIndex]?.includes(option)}
            <button type="button" class="btn-play btn-play-choice" class:missed disabled={missed} onclick={() => choose(option)}>{say(current.options[option][lang])}{#if missed}<IconClose aria-hidden="true" />{/if}</button>
          {/each}
        </div>
      {:else if finished}
        <div class="story-finished" dir={interfaceDirection} lang={settings.interfaceLocale}>
          <strong>{labels.finished}</strong>
          <span>{m.story_score({ correct: String(firstTry), total: String(interactiveIndices.length) }, { locale: settings.interfaceLocale })}</span>
          <div>
            <button type="button" class="btn-play story-secondary" onclick={() => story && start(story)}>{labels.again}</button>
            <button type="button" class="btn-play btn-play-ink story-primary" onclick={() => start(pickStory(story?.id))}>{labels.next}</button>
            {#if !story.generated}<button type="button" class="btn-play btn-play-sun" onclick={() => { const generated = storyForYou(); if (generated) start(generated); }}>{labels.practiceWords}</button>{/if}
          </div>
        </div>
      {:else}
        <button type="button" class="btn-play btn-play-ink story-primary story-continue" onclick={advance} dir={interfaceDirection}>{labels.continue}</button>
      {/if}
    </footer>
  </section>
{/if}

<style>
  .story-view { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.65rem;padding:clamp(.6rem,3vw,1rem) clamp(.7rem,3.4vw,1.2rem) clamp(.7rem,3vw,1rem); }
  .story-header { display:grid;gap:.2rem;padding-top:.35rem;text-align:center; }
  /* Mirrors the home button in the top-left corner of the paper sheet */
  .story-auto-read { position:absolute;z-index:105;top:.62rem;right:.62rem; }.story-auto-read :global(svg) { width:1rem;height:1rem; }
  .story-header p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }
  .story-header h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.55rem,7vw,2.2rem);font-weight:400;letter-spacing:-.03em;line-height:1; }

  .story-stage { position:relative;flex:none;height:clamp(9.5rem,30svh,13rem);overflow:hidden;border:1px solid rgba(23,42,69,.22);border-radius:1.15rem;box-shadow:0 8px 20px rgba(23,42,69,.08); }
  .story-cast { position:absolute;inset:auto 0 0;display:flex;align-items:flex-end;justify-content:center;gap:clamp(.4rem,4vw,1.4rem);height:88%;padding:0 .6rem; }
  .story-cast figure { position:relative;display:flex;flex-direction:column;align-items:center;height:100%;width:clamp(4.6rem,26%,7rem);margin:0;transition:transform .25s cubic-bezier(.23,1,.32,1),opacity .25s ease,filter .25s ease; }
  .story-cast figure :global(.story-character) { flex:1 1 auto;min-height:0; }
  .story-cast figure.pet { height:72%;width:clamp(3.6rem,20%,5.4rem); }
  .story-pet { position:absolute;inset:0;padding:0;border:0;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent; }.story-pet:focus-visible { outline:3px dashed #e6a527;outline-offset:2px;border-radius:1rem; }
  .story-cast figure.active { transform:translateY(-4px) scale(1.06); }
  /* A warm spotlight behind whoever is talking; it breathes while their line is read aloud */
  .story-cast figure::before { content:'';position:absolute;z-index:-1;inset:8% -14% 6%;border-radius:50%;background:radial-gradient(closest-side,rgba(230,165,39,.5),rgba(230,165,39,.16) 60%,transparent);opacity:0;transform:scale(.8);transition:opacity .25s ease,transform .25s cubic-bezier(.23,1,.32,1); }
  .story-cast figure.active::before { opacity:1;transform:scale(1); }
  .story-cast figure.speaking::before { animation:story-spotlight 1.1s ease-in-out infinite alternate; }
  .story-cast figure { isolation:isolate; }
  .story-cast figure.dimmed { opacity:.72;filter:saturate(.75); }
  .story-cast figcaption { position:absolute;bottom:.3rem;padding:.08rem .45rem;border-radius:999px;background:rgba(255,253,247,.92);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:900;letter-spacing:.04em;white-space:nowrap; }
  .story-cast figure.active figcaption { background:#172a45;color:#fffdf7;box-shadow:2px 2px 0 #e6a527; }

  .story-transcript { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.55rem;margin:0;padding:.2rem .1rem .4rem;overflow-y:auto;list-style:none;font-family:'DM Sans',sans-serif; }
  .story-transcript > li { animation:story-in .28s cubic-bezier(.23,1,.32,1); }
  .story-narration { display:flex;align-items:flex-start;gap:.4rem;padding:.6rem .75rem;border-left:3px solid #e6a527;background:rgba(255,253,247,.6); }
  .story-narration p { flex:1;margin:0;color:#596477;font-size:.78rem;font-style:italic;font-weight:600;line-height:1.45; }
  .story-line { display:flex;align-items:flex-end;gap:.45rem;max-width:92%; }
  .story-avatar { flex:none;width:2.1rem;height:2.6rem;overflow:hidden;border:1px solid rgba(23,42,69,.2);border-radius:50%;background:#fffdf7; }
  .story-avatar :global(.story-character) { width:2.1rem;height:2.6rem;transform:scale(1.6) translateY(12%); }
  .story-bubble { min-width:0;padding:.5rem .75rem;border:1px solid rgba(23,42,69,.16);border-radius:1rem 1rem 1rem .3rem;background:#fffdf7;box-shadow:0 4px 12px rgba(23,42,69,.06); }
  .story-bubble b { display:block;color:#a45e38;font-size:.56rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .story-bubble p { margin:.12rem 0 0;color:#172a45;font-size:.84rem;font-weight:700;line-height:1.4; }
  .story-line .story-bubble,.story-line .story-avatar { transition:border-color .2s ease,box-shadow .2s ease,translate .2s cubic-bezier(.34,1.4,.64,1); }
  .story-line.current:not(.story-line--you) .story-bubble { border-color:rgba(230,165,39,.7); }
  .story-line.speaking .story-bubble { border:2px solid #172a45;box-shadow:3px 3px 0 #e6a527; }
  .story-line.speaking .story-avatar { border:2px solid #e6a527;translate:0 -2px; }
  .story-line--you { align-self:flex-end;justify-content:flex-end; }
  .story-line--you .story-bubble { border-color:#172a45;border-radius:1rem 1rem .3rem 1rem;background:#172a45; }
  .story-line--you .story-bubble b { color:#e6a527; }
  .story-line--you .story-bubble p { color:#fffdf7; }
  .story-question { display:grid;gap:.2rem;padding:.55rem .75rem;border:1px dashed rgba(164,94,56,.55);border-radius:.8rem;background:rgba(230,165,39,.08); }
  .story-question small { color:#a45e38;font-size:.55rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .story-question p { margin:0;color:#172a45;font-size:.82rem;font-weight:800;line-height:1.35; }
  .story-question.solved { border-style:solid;border-color:rgba(52,130,77,.45);background:rgba(52,130,77,.07); }
  .story-answer { display:inline-flex;align-items:center;gap:.25rem;color:#34824d;font-size:.76rem;font-weight:800; }
  .story-answer :global(svg) { width:1rem;height:1rem;flex:none; }
  .story-listen { flex:none;align-self:center;box-shadow:2px 2px 0 #172a45;color:#a45e38; }

  .story-footer { flex:none;display:grid;gap:.45rem; }
  .story-prompt { display:flex;flex-wrap:wrap;justify-content:space-between;gap:.3rem;margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .story-prompt span { color:#c0392b;letter-spacing:.02em;text-transform:none; }
  .story-options { display:grid;gap:.42rem; }
  .story-options button { justify-content:space-between;line-height:1.3;text-align:start; }
  .story-options button.missed { border-color:#c0392b;background:#fff2e8;color:#c0392b;box-shadow:none;opacity:.8;animation:story-shake .3s ease; }
  .story-options button :global(svg) { width:1.1rem;height:1.1rem;flex:none; }
    .story-continue { justify-self:center;min-width:min(100%,14rem); }
  .story-finished { display:grid;justify-items:center;gap:.35rem;padding:.8rem;border:1px solid rgba(52,130,77,.4);border-top:3px solid #34824d;border-radius:1rem;background:#fffdf7;text-align:center;font-family:'DM Sans',sans-serif; }
  .story-finished strong { color:#34824d;font-family:'DM Serif Display',serif;font-size:1.3rem;font-weight:400; }
  .story-finished span { color:#596477;font-size:.68rem;font-weight:700; }
  .story-finished div { display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem;margin-top:.25rem; }

  @keyframes story-in { from { opacity:0;transform:translateY(6px); } to { opacity:1;transform:none; } }
  @keyframes story-spotlight { from { transform:scale(.94); } to { transform:scale(1.06); } }
  @keyframes story-shake { 0%,100% { transform:none; } 25% { transform:translateX(-4px); } 75% { transform:translateX(4px); } }
  @media (prefers-reduced-motion:reduce) { .story-transcript > li,.story-options button.missed,.story-cast figure.speaking::before { animation:none; } .story-cast figure,.story-cast figure::before { transition:none; } }

  :global(html.dark) .story-header h1 { color:#fffdf7; }
  :global(html.dark) .story-stage { border-color:rgba(255,253,247,.3); }
  :global(html.dark) .story-narration { background:rgba(255,253,247,.08); }
  :global(html.dark) .story-narration p { color:rgba(255,253,247,.78); }
  :global(html.dark) .story-bubble,:global(html.dark) .story-finished { border-color:rgba(255,253,247,.36);background:#213a5d;color:#fffdf7; }
  :global(html.dark) .story-bubble p,:global(html.dark) .story-question p { color:#fffdf7; }
  :global(html.dark) .story-line.speaking .story-bubble { border-color:#e6a527;box-shadow:3px 3px 0 #0b1626; }
  :global(html.dark) .story-line--you .story-bubble { border-color:#e6a527;background:#e6a527; }
  :global(html.dark) .story-line--you .story-bubble b,:global(html.dark) .story-line--you .story-bubble p { color:#172a45; }
  :global(html.dark) .story-question { border-color:rgba(230,165,39,.5);background:rgba(230,165,39,.1); }
  :global(html.dark) .story-answer,:global(html.dark) .story-finished strong { color:#8ed8a2; }
  :global(html.dark) .story-finished span { color:rgba(255,253,247,.72); }
  :global(html.dark) .story-options button.missed { border-color:#f08a7e;background:rgba(192,57,43,.2);color:#ffc2b8; }
  :global(html.dark) .story-listen { box-shadow:2px 2px 0 #0b1626;color:#e6a527; }
</style>
