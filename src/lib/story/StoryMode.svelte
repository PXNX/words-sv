<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { playErrorSound, playSoundEffect, playSuccessSound, soundEffectSeconds, startCrackle, stopSoundEffects } from '#lib/sounds.js';
  import { characterNames, fillName, moodFor, storiesFor, withWeather, type CharacterId, type HeldItem, type Lights, type Mood, type Story, type StoryBeat } from './stories';
  import type { SoundEffect } from '#lib/sounds.js';
  import StoryCharacter from './StoryCharacter.svelte';
  import StoryScene from './StoryScene.svelte';
  import { generateStory, hasMissedWords } from './generated';
  import { clearMissedWord, recordMissedWord } from './missedWords';
  import { applyVoice, type Speaker } from './voices';
  import { intonationOf, pauseAfter, pronounceable, sentences, splitSounds } from './speech';
  import { LipSync } from './lipSync.svelte';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconVolumeOff from '~icons/material-symbols/volume-off-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconQuestion from '~icons/material-symbols/question-mark-rounded';
  import IconAnnouncement from '~icons/material-symbols/campaign-rounded';

  const COMPLETED_KEY = 'wordcircle-story-completed-v1';
  const AUTO_READ_KEY = 'wordcircle-story-auto-read-v1';
  const startlingSounds: SoundEffect[] = ['glass', 'brakes', 'doorbell', 'knock'];
  const speechLocales: Record<string, string> = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-BR', uk: 'uk-UA' };
  // Reading pace grows a little with the learner's level: unhurried for beginners, close to natural
  // speed at the top.
  const levelRates: Record<string, number> = { a1: 0.9, a2: 0.95, b1: 1.03, b2: 1.07, c1: 1.11, c2: 1.15 };
  // The sound a pet makes in place of a spoken "Miau!" or "Wuff!", and while it talks otherwise.
  const petSounds: Partial<Record<CharacterId, { slot: SoundEffect; start: SoundEffect }>> = {
    lilith: { slot: 'meow', start: 'purr' },
    bello: { slot: 'bark', start: 'bark' },
    bird: { slot: 'tweet', start: 'tweet' },
    cow: { slot: 'moo', start: 'moo' },
    horse: { slot: 'neigh', start: 'neigh' },
    giraffe: { slot: 'hum', start: 'hum' },
    elephant: { slot: 'trumpet', start: 'trumpet' },
    snake: { slot: 'hiss', start: 'hiss' }
  };
  // Small animals stand in the smaller slot on stage.
  const smallAnimals: CharacterId[] = ['bello', 'seagull', 'fox', 'lilith', 'bird', 'snake'];

  const labels = $derived({
    title: m.story_title({}, { locale: settings.interfaceLocale }),
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

  // `story` is the playthrough (with its random weather); `written` the story as written, for "again".
  let story = $state<Story | null>(null);
  let written: Story | null = null;
  let run = 0;
  let revealed = $state(1);
  let orders = $state<number[][]>([]);
  let wrong = $state<Record<number, number[]>>({});
  let solved = $state<Record<number, true>>({});
  let transcript = $state<HTMLElement | null>(null);
  let speechSupported = $state(false);
  const lipSync = new LipSync();
  // Stories are read aloud unless the learner has switched it off.
  let autoRead = $state(typeof localStorage === 'undefined' || localStorage.getItem(AUTO_READ_KEY) !== 'off');
  let reaction = $state<{ who: CharacterId | 'all'; mood: Mood } | null>(null);
  let petted = $state(false);
  let hearts = $state(0);
  let heartsShown = $state(false);
  let heartsTimer = 0;
  let pettedTimer = 0;
  // Bumped whenever speech is cancelled or replaced, so a running performance knows to stop.
  let performing = 0;
  // Chrome drops utterances that are garbage-collected mid-speech, before their end event fires.
  let liveUtterances: SpeechSynthesisUtterance[] = [];
  // Set once the learner leaves the story, so nothing still pending starts speaking or playing sounds.
  let left = false;
  // Without reading aloud, a line's speaker moves their mouth for about as long as the line would
  // take to say, then stops.
  let miming = $state<number | null>(null);
  let mimeTimer = 0;
  // While a question is being read out, its speaker raises an eyebrow.
  let askingAloud = $state(false);
  // Fades out the loudspeaker crackle of an announcement that is being read.
  let crackle: () => void = () => {};
  function silenceCrackle() {
    crackle();
    crackle = () => {};
  }
  let reduceMotion = $state(false);

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
  const ballThrown = $derived(Boolean(story?.beats.slice(0, revealed).some((beat) => beat.kind === 'narration' && beat.prop === 'ball')));
  const lilithHappy = $derived(Boolean(story?.cast.includes('lilith')) && castMood('lilith') === 'happy');
  const purring = $derived(current ? [beatSounds(current).start, beatSounds(current).slot].includes('purr') : false);
  const woolRolling = $derived(current?.kind === 'narration' && current.prop === 'wool');
  // Once the eagle has been pointed out, it keeps circling high above the stage.
  const eagleCircling = $derived(Boolean(story?.beats.slice(0, revealed).some((beat) => beat.kind === 'narration' && beat.prop === 'eagle')));
  // The announcer only gets a voice cast in stories that have announcements.
  const voiceCast = $derived<Speaker[]>(story ? [...story.cast, ...(story.beats.some((beat) => beat.kind === 'narration' && beat.announcement) ? ['announcer' as const] : [])] : []);
  // Who is on stage and what they hold so far. Everyone whose first stage cue is an entrance waits
  // in the wings until then; exits send them off, and their own lines bring them back. The room
  // keeps the last `lights` it was given.
  const staging = $derived.by(() => {
    const present = new Set<CharacterId>();
    const holding: Partial<Record<CharacterId, HeldItem>> = {};
    let lights: Lights = 'on';
    if (!story) return { present, holding, lights };
    const cues = (beat: StoryBeat, member: CharacterId) => beat.kind === 'narration' || beat.kind === 'line'
      ? { enters: Boolean(beat.enters?.includes(member)), other: Boolean(beat.exits?.includes(member)) || (beat.kind === 'line' && beat.speaker === member) }
      : { enters: false, other: false };
    for (const member of story.cast) {
      const first = story.beats.find((beat) => cues(beat, member).enters || cues(beat, member).other);
      if (!first || !cues(first, member).enters) present.add(member);
    }
    for (const beat of story.beats.slice(0, revealed)) {
      if (beat.kind !== 'narration' && beat.kind !== 'line') continue;
      lights = beat.lights ?? lights;
      for (const member of beat.enters ?? []) present.add(member);
      if (beat.kind === 'line') present.add(beat.speaker);
      for (const member of beat.exits ?? []) present.delete(member);
      for (const [member, item] of Object.entries(beat.holds ?? {}) as [CharacterId, HeldItem | null][]) {
        if (item) holding[member] = item;
        else delete holding[member];
      }
    }
    return { present, holding, lights };
  });
  const onStage = $derived(story ? story.cast.filter((member) => staging.present.has(member)) : []);

  // Roughly every third longer word is lost in the noise of a `noisy` line.
  function drownedWords(text: string) {
    let count = 0;
    return text.split(/(\s+)/).map((part) => ({ text: part, lost: /\p{L}{4,}/u.test(part) && ++count % 3 === 2 }));
  }
  function isInteractive(beat: StoryBeat | null): beat is Extract<StoryBeat, { kind: 'question' | 'reply' }> {
    return beat?.kind === 'question' || beat?.kind === 'reply';
  }
  function say(text: string) {
    return fillName(text, name);
  }
  function canSpeak() {
    return !left && typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
  function wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
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
    run += 1;
    written = next;
    const playthrough = withWeather(next);
    story = playthrough;
    revealed = 1;
    wrong = {};
    solved = {};
    orders = playthrough.beats.map((beat) => (isInteractive(beat) ? shuffledOrder(beat.options.length) : []));
    reaction = null;
    presentBeat(playthrough.beats[0], 0);
  }
  // A beat's sound: played where the text has onomatopoeia ("klirr!", "Miau!") when read aloud,
  // otherwise as the beat appears. Lilith purrs and Bello barks whenever they talk.
  function beatSounds(beat: StoryBeat): { start: SoundEffect | null; slot: SoundEffect | null } {
    if (beat.kind === 'narration' && beat.announcement) return { start: beat.sfx ?? 'gong', slot: beat.sfx ?? null };
    if (beat.kind === 'narration') return { start: beat.sfx ?? null, slot: beat.sfx ?? null };
    if (beat.kind !== 'line') return { start: null, slot: null };
    const pet = petSounds[beat.speaker];
    return { start: beat.sfx ?? pet?.start ?? null, slot: beat.sfx ?? pet?.slot ?? null };
  }
  function playBeatSound(beat: StoryBeat) {
    if (left || (beat.kind !== 'narration' && beat.kind !== 'line')) return;
    const sounds = beatSounds(beat);
    const sound = splitSounds(beat.text[lang], lang).some((part) => part.kind === 'sound') ? sounds.slot : sounds.start;
    if (sound) playSoundEffect(settings.sound, sound);
  }
  // With auto-read the beat is read aloud (sounds included); without it, its sound plays and a
  // practice word in the line is still pronounced by whoever says it.
  function presentBeat(beat: StoryBeat | undefined, index: number) {
    if (!beat) return;
    if (autoRead && canSpeak()) {
      readBeat(beat, index);
      return;
    }
    playBeatSound(beat);
    if (beat.kind === 'line' && beat.word) void perform(beat.word, beat.speaker, index, moodFor(beat));
    else if (beat.kind === 'line') mime(index, beat.text[lang]);
  }
  function mime(index: number, text: string) {
    miming = index;
    clearTimeout(mimeTimer);
    mimeTimer = window.setTimeout(() => (miming = null), Math.min(6000, 900 + text.length * 55));
  }
  function readBeat(beat: StoryBeat, index: number) {
    const sounds = beatSounds(beat);
    if (beat.kind === 'narration' && beat.announcement) void announce(say(beat.text[lang]));
    else if (beat.kind === 'narration') void perform(say(beat.text[lang]), 'narrator', index, 'neutral', sounds.start, sounds.slot);
    else if (beat.kind === 'line') void perform(say(beat.text[lang]), beat.speaker, index, moodFor(beat), sounds.start, sounds.slot, beat.noisy);
    else if (beat.kind === 'question') void perform(say(beat.prompt[lang]), beat.asker ?? 'narrator', index, 'curious');
  }
  function toggleAutoRead() {
    autoRead = !autoRead;
    localStorage.setItem(AUTO_READ_KEY, autoRead ? 'on' : 'off');
    if (autoRead && current) readBeat(current, currentIndex);
    else if (!autoRead) cancelSpeech();
  }
  // Faces in the scene: whoever is talking shows the line's mood, a loud sound startles everyone,
  // and answering makes the character you talk to (or the whole cast) react.
  function castMood(member: CharacterId): Mood {
    if (member === 'lilith' && petted) return 'happy';
    if (member === 'lilith' && current?.kind === 'narration' && current.sfx === 'purr') return 'happy';
    if (reaction && (reaction.who === 'all' || reaction.who === member)) return reaction.mood;
    // A question being read out lifts the speaker's eyebrow, whatever the rest of the line's mood.
    if (askingAloud && lipSync.speaker === member) return 'curious';
    const face = current?.kind === 'narration' || current?.kind === 'line' ? current.faces?.[member] : undefined;
    if (face) return face;
    if (current?.kind === 'narration' && current.sfx && startlingSounds.includes(current.sfx)) return 'surprised';
    if (current?.kind === 'line' && current.speaker === member) return moodFor(current);
    if (current?.kind === 'question' && current.asker === member) return 'curious';
    if (current?.kind === 'reply' && current.to === member) return 'curious';
    return 'neutral';
  }
  // Hearts rise above Lilith only when she is happy and purring (being petted, or a purring beat);
  // a burst plays out even if her mood moves on.
  function burstHearts() {
    hearts += 1;
    heartsShown = true;
    clearTimeout(heartsTimer);
    heartsTimer = window.setTimeout(() => (heartsShown = false), 2200);
  }
  function petLilith() {
    playSoundEffect(settings.sound, 'purr');
    petted = true;
    burstHearts();
    clearTimeout(pettedTimer);
    pettedTimer = window.setTimeout(() => (petted = false), 1600);
  }
  function storyForYou() {
    return generateStory(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary);
  }
  // Unread stories in level order first. After a written story, a story made from the learner's own
  // words follows whenever there are words to practise; once everything is read, written stories
  // and generated ones take turns.
  function pickStory(skip?: string): Story {
    const pool = storiesFor(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary);
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
    presentBeat(story.beats[revealed - 1], revealed - 1);
    if (revealed === story.beats.length && !isInteractive(story.beats[revealed - 1]) && !story.generated) markCompleted(story.id);
  }
  function choose(option: number) {
    if (!story || !isInteractive(current) || !awaitingAnswer) return;
    const beat = current;
    const who = beat.kind === 'reply' ? beat.to : 'all';
    reaction = { who, mood: option === 0 ? 'happy' : 'curious' };
    if (option === 0) {
      if (beat.focus && !wrong[currentIndex]?.length) clearMissedWord(lang, beat.focus);
      solved = { ...solved, [currentIndex]: true };
      playSuccessSound(settings.sound, 'vocab');
      if (revealed === story.beats.length && !story.generated) markCompleted(story.id);
      void continueAfter(beat);
      return;
    }
    if (beat.focus) recordMissedWord(lang, beat.focus);
    wrong = { ...wrong, [currentIndex]: [...(wrong[currentIndex] ?? []), option] };
    playErrorSound(settings.sound, 'vocab');
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(60);
  }
  // A right answer carries the story on by itself: after the chime, whoever asked pronounces the
  // practised word, then the next beat follows (unless the learner already moved on).
  async function continueAfter(beat: Extract<StoryBeat, { kind: 'question' | 'reply' }>) {
    const at = { run, revealed };
    const still = () => at.run === run && at.revealed === revealed;
    await wait(450);
    if (!still()) return;
    const asker = beat.kind === 'question' ? beat.asker : beat.to;
    if (beat.word && asker && canSpeak()) await perform(beat.word, asker, null, 'happy');
    else await wait(500);
    if (still()) advance();
  }
  // Reads a text in the speaker's voice: sentence by sentence for intonation, with the beat's sound
  // effect in place of any onomatopoeia. Resolves when done or when something else starts speaking.
  async function perform(text: string, speaker: Speaker, beat: number | null, mood: Mood, startSound: SoundEffect | null = null, slotSound: SoundEffect | null = null, noisy = false) {
    if (!canSpeak()) return;
    const token = ++performing;
    window.speechSynthesis.cancel();
    silenceCrackle();
    const parts = splitSounds(text, lang);
    if (startSound && !parts.some((part) => part.kind === 'sound')) playSoundEffect(settings.sound, startSound);
    if (speaker === 'narrator') lipSync.stop();
    else lipSync.start(speaker, beat);
    for (const part of parts) {
      if (token !== performing) return;
      if (part.kind === 'say') {
        await speakSentences(part.text, speaker, mood, token, noisy);
      } else if (slotSound && settings.sound) {
        playSoundEffect(true, slotSound);
        if (speaker !== 'narrator') lipSync.pulse(Math.min(soundEffectSeconds[slotSound], 0.9));
        await wait(soundEffectSeconds[slotSound] * 1000);
      } else {
        await wait(250);
      }
    }
    if (token === performing) {
      lipSync.stop();
      askingAloud = false;
    }
  }
  // A station announcement: the narrator sets the scene ("Der Lautsprecher knackt:"), then the gong
  // sounds and the quoted part comes over a crackling loudspeaker in the announcer's voice.
  async function announce(text: string) {
    if (!canSpeak()) return;
    const quote = text.match(/^(.*?)[„“"«»]([^„“”"«»]+)[“”"«»]\s*$/su);
    if (!quote) {
      await perform(text, 'narrator', null, 'neutral', 'gong');
      return;
    }
    const token = ++performing;
    window.speechSynthesis.cancel();
    silenceCrackle();
    lipSync.stop();
    const intro = quote[1].replace(/[\s:,–—-]+$/u, '');
    if (/\p{L}/u.test(intro)) await speakSentences(intro, 'narrator', 'neutral', token, false);
    if (token !== performing) return;
    playSoundEffect(settings.sound, 'gong');
    await wait(soundEffectSeconds.gong * 1000);
    if (token !== performing) return;
    crackle = startCrackle(settings.sound);
    await speakSentences(quote[2], 'announcer', 'neutral', token, false);
    silenceCrackle();
  }
  // One utterance per sentence, each with its own melody, and a short breath in between.
  async function speakSentences(text: string, speaker: Speaker, mood: Mood, token: number, noisy: boolean) {
    const parts = sentences(text);
    for (const [index, sentence] of parts.entries()) {
      if (token !== performing) return;
      await speakSentence(sentence, speaker, mood, noisy);
      if (index < parts.length - 1 && token === performing) await wait(pauseAfter[intonationOf(sentence)]);
    }
  }
  function speakSentence(sentence: string, speaker: Speaker, mood: Mood, noisy: boolean) {
    return new Promise<void>((resolve) => {
      const locale = speechLocales[lang] ?? lang;
      const baseRate = levelRates[settings.vocabularyLevel] ?? 1;
      let safety = 0;
      const done = () => {
        clearTimeout(safety);
        resolve();
      };
      const spoken = pronounceable(sentence, lang);
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = locale;
      applyVoice(utterance, speaker, lang, locale, voiceCast, baseRate, mood);
      // Under a roaring plane the voice is barely carrying.
      if (noisy) utterance.volume *= 0.45;
      if (speaker !== 'narrator' && speaker !== 'announcer') lipSync.track(utterance, spoken);
      askingAloud = intonationOf(sentence) === 'question';
      utterance.addEventListener('end', () => (askingAloud = false));
      utterance.addEventListener('end', done);
      utterance.addEventListener('error', done);
      liveUtterances = [utterance];
      window.speechSynthesis.speak(utterance);
      // Some engines never fire `end`; the story must not hang on them.
      safety = window.setTimeout(done, 4000 + (sentence.length * 110) / baseRate);
    });
  }
  function cancelSpeech() {
    performing += 1;
    liveUtterances = [];
    lipSync.stop();
    silenceCrackle();
    askingAloud = false;
    miming = null;
    if (canSpeak()) window.speechSynthesis.cancel();
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
  $effect(() => {
    if (lilithHappy && purring) untrack(burstHearts);
  });

  // Leaving the story (another page, or the tab going away) silences it at once: speech, sound
  // effects still ringing out, and anything queued to follow a right answer.
  function leave() {
    left = true;
    run += 1;
    cancelSpeech();
    stopSoundEffects();
  }

  onMount(() => {
    if (!settings.firstName) void goto('/', { replaceState: true });
    speechSupported = canSpeak();
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onPageHide = () => leave();
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) left = false; };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      leave();
      clearTimeout(heartsTimer);
      clearTimeout(pettedTimer);
      clearTimeout(mimeTimer);
    };
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
      <StoryScene scene={story.scene} weather={story.weather} />
      <!-- Like on a theatre stage, the house lights go down while someone talks -->
      <div class="story-dark" class:on={speaker !== null} aria-hidden="true"></div>
      <!-- The room's own light: one harsh lamp over a dark table (an interrogation) or a power cut -->
      <div class="story-gloom" class:on={staging.lights !== 'on'} class:off={staging.lights === 'off'} aria-hidden="true">{#if staging.lights === 'lamp'}<span></span>{/if}</div>
      <div class="story-cast" class:blackout={staging.lights === 'off'}>
        <!-- Characters walk on when they enter (a guest after knocking) and dash off when they leave -->
        {#each onStage as member (member)}
          <figure class:active={speaker === member} class:speaking={lipSync.speaker === member} class:dimmed={speaker !== null && speaker !== member} class:pet={smallAnimals.includes(member)} animate:flip={{ duration: reduceMotion ? 0 : 350 }} in:fly={{ x: -140, duration: reduceMotion ? 0 : 520 }} out:fly={{ x: 320, duration: reduceMotion ? 0 : 480 }}>
            <span class="story-beam" aria-hidden="true"></span>
            <StoryCharacter id={member} mood={castMood(member)} holding={staging.holding[member] ?? null} talking={!lipSync.speaker && miming === currentIndex && current?.kind === 'line' && current.speaker === member} mouth={lipSync.speaker === member ? lipSync.open : null} label={characterNames[member][lang]} />
            {#if member === 'lilith'}<button type="button" class="story-pet" onclick={petLilith} aria-label={labels.petLilith}></button>{/if}
            {#if member === 'lilith' && heartsShown}
              {#key hearts}<span class="story-hearts" aria-hidden="true">{#each [0, 1, 2] as heart (heart)}<svg viewBox="0 0 24 22" style:--heart={heart}><path d="M12 21C5.2 15.4 1 11.6 1 7.1A5.6 5.6 0 0 1 12 5.2 5.6 5.6 0 0 1 23 7.1c0 4.5-4.2 8.3-11 13.9Z" /></svg>{/each}</span>{/key}
            {/if}
            {#if member === 'bello' && ballThrown}<span class="story-ball" aria-hidden="true"><span></span></span>{/if}
            <figcaption>{characterNames[member][lang]}</figcaption>
          </figure>
        {/each}
      </div>
      {#if woolRolling}
        <!-- A ball of wool rolls across the room, with Lilith hard on its heels -->
        {#key currentIndex}<span class="story-wool" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e0647a" /><path d="M4 9q8-4 16 2M3.5 14q9-5 17 1M7 20q4-9 12-14M6 5q2 9 10 16" fill="none" stroke="#b33a52" stroke-width="1.4" stroke-linecap="round" /></svg></span>{/key}
      {/if}
      {#if eagleCircling}
        <!-- A golden eagle glides in and keeps circling above the peaks, slowly beating its wings -->
        <span class="story-eagle" aria-hidden="true"><svg viewBox="0 0 64 30"><path d="M32 13Q22 3 4 5L0 6l4 1.5L.5 9.5l4.5.5-2.5 2.5 5-.5-1 3q8-2 13 1 5 2 12-3Z" fill="#6b4226" /><path d="M32 13q10-10 28-8l4 1-4 1.5 3.5 2-4.5.5 2.5 2.5-5-.5 1 3q-8-2-13 1-5 2-12-3Z" fill="#6b4226" /><ellipse cx="32" cy="16" rx="5" ry="9" fill="#5a361e" /><circle cx="32" cy="7.5" r="3.8" fill="#c99a3e" /><path d="M30.6 9.5h2.8l-1.4 3Z" fill="#e6b52e" /><path d="M28.5 23l3.5 6 3.5-6Z" fill="#4a2c18" /></svg></span>
      {/if}
    </div>

    <ol class="story-transcript" bind:this={transcript} lang={lang} aria-live="polite">
      {#each story.beats.slice(0, revealed) as beat, index (index)}
        {#if beat.kind === 'narration'}
          <li class="story-narration" class:story-announcement={beat.announcement}>
            {#if beat.announcement}<IconAnnouncement class="story-announcement-icon" aria-hidden="true" />{/if}
            <p>{say(beat.text[lang])}</p>
            {#if speechSupported}<button type="button" class="btn-play btn-play-round btn-play-sm story-listen" onclick={() => readBeat(beat, index)} aria-label={labels.listen}><IconVolume aria-hidden="true" /></button>{/if}
          </li>
        {:else if beat.kind === 'line'}
          <li class="story-line" class:current={index === currentIndex} class:speaking={lipSync.beat === index}>
            <span class="story-avatar" aria-hidden="true"><StoryCharacter id={beat.speaker} mood={moodFor(beat)} still /></span>
            <div class="story-bubble">
              <b>{characterNames[beat.speaker][lang]}</b>
              {#if beat.noisy && index === currentIndex}
                <!-- While the plane roars, some words are lost; they come back once the story moves on -->
                <p>{#each drownedWords(say(beat.text[lang])) as part, at (at)}{#if part.lost}<span class="story-drowned">{part.text}</span>{:else}{part.text}{/if}{/each}</p>
              {:else}
                <p>{say(beat.text[lang])}</p>
              {/if}
            </div>
            {#if speechSupported}<button type="button" class="btn-play btn-play-round btn-play-sm story-listen" onclick={() => readBeat(beat, index)} aria-label={labels.listen}><IconVolume aria-hidden="true" /></button>{/if}
          </li>
        {:else if beat.kind === 'question' && solved[index]}
          <!-- An open question is asked above the answers; once solved it joins the transcript -->
          <li class="story-question solved">
            <span class="story-question-badge" aria-hidden="true"><IconQuestion /></span>
            <div>
              <p>{say(beat.prompt[lang])}</p>
              <span class="story-answer"><IconCheck aria-hidden="true" />{say(beat.options[0][lang])}</span>
            </div>
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
        <p class="story-prompt" class:story-prompt--question={current.kind === 'question'}>
          {#if current.kind === 'question'}<span class="story-question-badge" aria-hidden="true"><IconQuestion /></span><span class="story-prompt-text" lang={lang}>{say(current.prompt[lang])}</span>{:else}<span dir={interfaceDirection} lang={settings.interfaceLocale}>{labels.reply}</span>{/if}
          {#if wrong[currentIndex]?.length}<span class="story-try-again" dir={interfaceDirection} lang={settings.interfaceLocale}>{labels.tryAgain}</span>{/if}
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
            <button type="button" class="btn-play story-secondary" onclick={() => written && start(written)}>{labels.again}</button>
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
  /* Theatre lighting: the stage darkens, a beam falls on the speaker and the others stay in the dark */
  .story-dark { position:absolute;inset:0;background:radial-gradient(ellipse at 50% 100%,rgba(11,22,38,.28),rgba(11,22,38,.5));opacity:0;transition:opacity .35s ease;pointer-events:none; }
  .story-dark.on { opacity:1; }
  .story-gloom { position:absolute;inset:0;background:radial-gradient(ellipse 46% 78% at 50% 8%,rgba(255,240,196,.16),rgba(6,10,18,.72) 70%,rgba(6,10,18,.86));opacity:0;transition:opacity 1.2s ease;pointer-events:none; }
  .story-gloom.on { opacity:1; }
  /* Lights fail at once and plunge everyone into the dark; whoever talks is still faintly lit, as by a phone torch */
  .story-gloom.off { background:rgba(4,7,13,.9);transition-duration:.08s; }
  .story-stage .story-cast.blackout figure { filter:brightness(.3) saturate(.5); }
  .story-stage .story-cast.blackout figure.active { filter:brightness(.62) saturate(.7); }
  .story-gloom span { position:absolute;top:0;left:50%;width:2.6rem;height:1.1rem;translate:-50% 0;border-radius:0 0 1.3rem 1.3rem;background:#2a3140;box-shadow:0 .5rem 1.6rem .4rem rgba(255,236,180,.55); }
  .story-gloom span::before { content:'';position:absolute;bottom:100%;left:50%;width:2px;height:2rem;background:#2a3140; }
  .story-beam { position:absolute;z-index:-2;bottom:4%;left:50%;width:170%;height:180%;translate:-50% 0;background:linear-gradient(to bottom,rgba(255,244,214,.62),rgba(255,244,214,.26) 65%,rgba(255,244,214,.08));clip-path:polygon(41% 0,59% 0,100% 100%,0 100%);opacity:0;transition:opacity .3s ease;pointer-events:none; }
  .story-cast figure.active .story-beam { opacity:1; }
  .story-cast figure.dimmed { filter:brightness(.48) saturate(.7); }
  .story-cast figure.dimmed figcaption { opacity:.8; }
  /* Little hearts float up over Lilith when she is happy */
  .story-hearts { position:absolute;z-index:3;top:2%;left:50%;width:0;height:0;pointer-events:none; }
  .story-hearts svg { position:absolute;left:calc((var(--heart) - 1) * .95rem - .42rem);width:.84rem;height:.78rem;fill:#e0475b;stroke:#fffdf7;stroke-width:1.6;opacity:0;animation:story-heart 1.9s cubic-bezier(.23,1,.32,1) calc(var(--heart) * .22s) both; }
  .story-hearts svg:nth-child(2) { top:-.45rem;width:1rem;height:.92rem; }
  /* Bello's red ball sails in from the side, lands and bounces next to him */
  .story-ball { position:absolute;z-index:3;right:-34%;bottom:4%;width:1.05rem;height:1.05rem;animation:story-ball-x 1.15s cubic-bezier(.25,.6,.35,1) both;pointer-events:none; }
  .story-ball span { display:block;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 34% 30%,#ff9d8f,#d64b45 52%,#9c2a25);box-shadow:inset -2px -2px 0 rgba(23,42,69,.18),0 0 0 1.5px #172a45;animation:story-ball-y 1.15s linear both,story-ball-spin 1.15s cubic-bezier(.25,.6,.35,1) both; }
  .story-cast figcaption { position:absolute;bottom:.3rem;padding:.08rem .45rem;border-radius:999px;background:rgba(255,253,247,.92);color:#172a45;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:900;letter-spacing:.04em;white-space:nowrap; }
  .story-cast figure.active figcaption { background:#172a45;color:#fffdf7;box-shadow:2px 2px 0 #e6a527; }

  .story-transcript { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.55rem;margin:0;padding:.2rem .1rem .4rem;overflow-y:auto;list-style:none;font-family:'DM Sans',sans-serif; }
  .story-transcript > li { animation:story-in .28s cubic-bezier(.23,1,.32,1); }
  .story-narration { display:flex;align-items:flex-start;gap:.4rem;padding:.6rem .75rem;border-left:3px solid #e6a527;background:rgba(255,253,247,.6); }
  .story-narration p { flex:1;margin:0;color:#596477;font-size:.78rem;font-style:italic;font-weight:600;line-height:1.45; }
  /* Station announcements carry a loudspeaker and the station's blue */
  .story-narration.story-announcement { border-left-color:#4b78c2;background:rgba(75,120,194,.08); }
  .story-narration :global(.story-announcement-icon) { flex:none;width:1.1rem;height:1.1rem;margin-top:.05rem;color:#4b78c2; }
  /* the eagle sails in from the left and circles to and fro high above the stage */
  .story-eagle { position:absolute;z-index:1;top:8%;left:-14%;width:3.4rem;pointer-events:none;animation:story-eagle 18s ease-in-out infinite alternate; }
  .story-eagle svg { display:block;width:100%;transform-origin:center 45%;animation:story-eagle-flap 2.6s ease-in-out infinite; }
  @keyframes story-eagle { 0% { left:-14%;top:14%;rotate:-6deg; } 35% { left:40%;top:5%;rotate:4deg; } 70% { left:72%;top:11%;rotate:-3deg; } 100% { left:94%;top:4%;rotate:5deg; } }
  @keyframes story-eagle-flap { 0%,60%,100% { transform:scaleY(1); } 75% { transform:scaleY(.7); } 88% { transform:scaleY(1.08); } }
  @media (prefers-reduced-motion:reduce) { .story-eagle { animation:none;left:62%; } .story-eagle svg { animation:none; } }
  /* Lilith's ball of wool bounces across the floor and out of the room */
  .story-wool { position:absolute;z-index:3;left:30%;bottom:6%;width:1.3rem;height:1.3rem;pointer-events:none;animation:story-wool-x 1.4s cubic-bezier(.3,.5,.4,1) both; }
  .story-wool svg { display:block;width:100%;height:100%;animation:story-ball-spin 1.4s linear reverse both; }
  .story-line { display:flex;align-items:flex-end;gap:.45rem;max-width:92%; }
  .story-avatar { flex:none;width:2.1rem;height:2.6rem;overflow:hidden;border:1px solid rgba(23,42,69,.2);border-radius:50%;background:#fffdf7; }
  .story-avatar :global(.story-character) { width:2.1rem;height:2.6rem;transform:scale(1.6) translateY(12%); }
  .story-bubble { min-width:0;padding:.5rem .75rem;border:1px solid rgba(23,42,69,.16);border-radius:1rem 1rem 1rem .3rem;background:#fffdf7;box-shadow:0 4px 12px rgba(23,42,69,.06); }
  .story-bubble b { display:block;color:#a45e38;font-size:.56rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .story-bubble p { margin:.12rem 0 0;color:#172a45;font-size:.84rem;font-weight:700;line-height:1.4; }
  .story-drowned { filter:blur(3.5px);opacity:.55;user-select:none; }
  .story-line .story-bubble,.story-line .story-avatar { transition:border-color .2s ease,box-shadow .2s ease,translate .2s cubic-bezier(.34,1.4,.64,1); }
  .story-line.current:not(.story-line--you) .story-bubble { border-color:rgba(230,165,39,.7); }
  .story-line.speaking .story-bubble { border:2px solid #172a45;box-shadow:3px 3px 0 #e6a527; }
  .story-line.speaking .story-avatar { border:2px solid #e6a527;translate:0 -2px; }
  .story-line--you { align-self:flex-end;justify-content:flex-end; }
  .story-line--you .story-bubble { border-color:#172a45;border-radius:1rem 1rem .3rem 1rem;background:#172a45; }
  .story-line--you .story-bubble b { color:#e6a527; }
  .story-line--you .story-bubble p { color:#fffdf7; }
  .story-question { display:flex;align-items:flex-start;gap:.5rem;padding:.55rem .75rem;border:1px dashed rgba(164,94,56,.55);border-radius:.8rem;background:rgba(230,165,39,.08); }
  .story-question > div { display:grid;gap:.2rem;min-width:0; }
  .story-question p { margin:0;color:#172a45;font-size:.82rem;font-weight:800;line-height:1.35; }
  .story-question.solved { border-style:solid;border-color:rgba(52,130,77,.45);background:rgba(52,130,77,.07); }
  .story-answer { display:inline-flex;align-items:center;gap:.25rem;color:#34824d;font-size:.76rem;font-weight:800; }
  .story-answer :global(svg) { width:1rem;height:1rem;flex:none; }
  .story-listen { flex:none;align-self:center;box-shadow:2px 2px 0 #172a45;color:#a45e38; }

  .story-footer { flex:none;display:grid;gap:.45rem; }
  .story-prompt { display:flex;flex-wrap:wrap;justify-content:space-between;gap:.3rem;margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .story-prompt .story-try-again { color:#c0392b;letter-spacing:.02em;text-transform:none; }
  /* An open question stands apart from the dialogue: a bold card with a question badge */
  .story-prompt--question { flex-wrap:nowrap;align-items:center;gap:.6rem;padding:.65rem .8rem;border:2px solid #172a45;border-radius:.9rem;background:#fff4d6;box-shadow:3px 3px 0 #e6a527;color:#172a45;font-size:.92rem;font-weight:800;letter-spacing:0;line-height:1.35;text-transform:none;animation:story-in .28s cubic-bezier(.23,1,.32,1); }
  .story-prompt-text { flex:1;min-width:0; }
  .story-question-badge { flex:none;display:grid;place-items:center;width:1.75rem;height:1.75rem;border-radius:50%;background:#172a45;color:#e6a527; }
  .story-question-badge :global(svg) { width:1.15rem;height:1.15rem; }
  .story-question .story-question-badge { width:1.35rem;height:1.35rem;background:#34824d;color:#fffdf7; }
  .story-question .story-question-badge :global(svg) { width:.9rem;height:.9rem; }
  .story-prompt--question .story-try-again { font-size:.62rem;font-weight:900; }
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
  @keyframes story-heart { 0% { opacity:0;transform:translateY(.5rem) scale(.4); } 18% { opacity:1;transform:translateY(0) scale(1.1); } 30% { transform:translateY(-.3rem) scale(1); } 60% { transform:translate(.2rem,-1.3rem) rotate(8deg); } 100% { opacity:0;transform:translate(-.15rem,-2.6rem) rotate(-6deg) scale(.85); } }
  @keyframes story-ball-x { 0% { transform:translateX(13rem); } 72% { transform:translateX(0); } 86% { transform:translateX(-.45rem); } 100% { transform:translateX(-.6rem); } }
  @keyframes story-ball-y { 0% { translate:0 -3.5rem;animation-timing-function:ease-out; } 30% { translate:0 -6.2rem;animation-timing-function:ease-in; } 72% { translate:0 0;animation-timing-function:ease-out; } 82% { translate:0 -1.1rem;animation-timing-function:ease-in; } 91% { translate:0 0;animation-timing-function:ease-out; } 96% { translate:0 -.3rem;animation-timing-function:ease-in; } 100% { translate:0 0; } }
  @keyframes story-ball-spin { from { rotate:0deg; } to { rotate:-760deg; } }
  @keyframes story-wool-x { 0% { transform:translate(0,0); } 25% { transform:translate(4rem,-1rem); } 45% { transform:translate(8rem,0); } 65% { transform:translate(11rem,-.4rem); } 100% { transform:translate(20rem,0); } }
  @media (prefers-reduced-motion:reduce) { .story-wool { display:none; } .story-transcript > li,.story-prompt--question,.story-options button.missed,.story-cast figure.speaking::before,.story-ball,.story-ball span { animation:none; } .story-hearts svg { animation:none;opacity:1; } .story-cast figure,.story-cast figure::before,.story-dark,.story-gloom,.story-beam { transition:none; } }

  :global(html.dark) .story-header h1 { color:#fffdf7; }
  :global(html.dark) .story-stage { border-color:rgba(255,253,247,.3); }
  :global(html.dark) .story-narration { background:rgba(255,253,247,.08); }
  :global(html.dark) .story-narration p { color:rgba(255,253,247,.78); }
  :global(html.dark) .story-bubble,:global(html.dark) .story-finished { border-color:rgba(255,253,247,.36);background:#213a5d;color:#fffdf7; }
  :global(html.dark) .story-bubble p,:global(html.dark) .story-question p,:global(html.dark) .story-prompt--question { color:#fffdf7; }
  :global(html.dark) .story-line.speaking .story-bubble { border-color:#e6a527;box-shadow:3px 3px 0 #0b1626; }
  :global(html.dark) .story-line--you .story-bubble { border-color:#e6a527;background:#e6a527; }
  :global(html.dark) .story-line--you .story-bubble b,:global(html.dark) .story-line--you .story-bubble p { color:#172a45; }
  :global(html.dark) .story-question { border-color:rgba(230,165,39,.5);background:rgba(230,165,39,.1); }
  :global(html.dark) .story-prompt--question { border-color:#e6a527;background:#2b4a70;box-shadow:3px 3px 0 #0b1626; }
  :global(html.dark) .story-prompt--question .story-question-badge { background:#e6a527;color:#172a45; }
  :global(html.dark) .story-answer,:global(html.dark) .story-finished strong { color:#8ed8a2; }
  :global(html.dark) .story-finished span { color:rgba(255,253,247,.72); }
  :global(html.dark) .story-options button.missed { border-color:#f08a7e;background:rgba(192,57,43,.2);color:#ffc2b8; }
  :global(html.dark) .story-listen { box-shadow:2px 2px 0 #0b1626;color:#e6a527; }
</style>
