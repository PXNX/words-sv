<!--
  The conversation mode: the learner talks out loud with a member of the story cast, met in one of
  their stories, while an on-device model (localModel.svelte.ts) plays the character. Every round
  brings someone new and five words of the learner's level (from the settings) to use. Speech in
  is the browser's recogniser (on the device where it can), speech out the voices chosen in the
  settings (naturalVoices.svelte.ts), and every line can be heard again from the transcript.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { onMount, tick } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { loadLevel, wordMetadata } from '#lib/data/vocabulary.js';
  import { pronounceable } from '#lib/story/speech.js';
  import { naturalReady, naturalSupported, playNatural, prepareNatural, synthesizeNatural } from '#lib/story/naturalVoices.svelte.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import StoryScene from '#lib/story/StoryScene.svelte';
  import type { Mood } from '#lib/story/stories.js';
  import { unlockCosmetic } from '#lib/profile/cosmetics.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import DownloadProgress from '#lib/offline/DownloadProgress.svelte';
  import ModelStatus from '#lib/offline/ModelStatus.svelte';
  import { confirmDownload } from '#lib/offline/downloadConsent.svelte.js';
  import { modelProgressPhase } from '#lib/offline/progressPhase.js';
  import { voiceEngines } from '#lib/voice/engines.js';
  import { chatMessages, cleanReply, LEVEL_WORD_SAMPLE, pickTargetWords, usedWords, type Turn } from './conversation.js';
  import { pickPartner, type Partner } from './partners.js';
  import { checkLocalModel, chosenModel, generateReply, interruptReply, loadLocalModel, localModel, modelGpuMB } from './localModel.svelte.js';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';
  import IconStop from '~icons/material-symbols/stop-rounded';
  import IconSend from '~icons/material-symbols/send-rounded';
  import IconCasino from '~icons/material-symbols/casino-rounded';
  import IconKeyboard from '~icons/material-symbols/keyboard-rounded';
  import IconHandsFree from '~icons/material-symbols/all-inclusive-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';
  import IconLock from '~icons/material-symbols/lock-rounded';

  type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
  type Recognition = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    processLocally?: boolean;
    start: () => void;
    abort: () => void;
    onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
  };
  type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable';
  type RecognitionCtor = (new () => Recognition) & {
    available?: (options: { langs: string[]; processLocally: boolean }) => Promise<Availability>;
    install?: (options: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
  };

  type Phase = 'setup' | 'thinking' | 'speaking' | 'listening' | 'waiting';

  const locale = $derived(settings.interfaceLocale);
  const labels = $derived({
    title: m.conversation_title({}, { locale }),
    intro: m.conversation_intro({}, { locale }),
    privacy: m.conversation_privacy({}, { locale }),
    meet: m.conversation_meet({}, { locale }),
    fromStory: (title: string) => m.conversation_from_story({ title }, { locale }),
    download: m.conversation_download({ mb: String(chosenModel().downloadMB) }, { locale }),
    model: (name: string) => m.conversation_model({ name }, { locale }),
    changeModel: m.conversation_change_model({}, { locale }),
    start: m.conversation_start({}, { locale }),
    loading: m.conversation_loading({}, { locale }),
    unsupported: m.conversation_unsupported({}, { locale }),
    failed: m.conversation_failed({}, { locale }),
    words: m.conversation_words({}, { locale }),
    wordsUsed: (count: number, total: number) => m.conversation_words_used({ count: num(count), total: num(total) }, { locale }),
    listening: m.conversation_listening({}, { locale }),
    thinking: (name: string) => m.conversation_thinking({ name }, { locale }),
    speaking: (name: string) => m.conversation_speaking({ name }, { locale }),
    tapToTalk: m.conversation_tap_to_talk({}, { locale }),
    stop: m.conversation_stop({}, { locale }),
    typePlaceholder: m.conversation_type_placeholder({}, { locale }),
    type: m.conversation_type({}, { locale }),
    send: m.conversation_send({}, { locale }),
    replay: m.conversation_replay({}, { locale }),
    newPartner: m.conversation_new_partner({}, { locale }),
    handsFree: m.conversation_hands_free({}, { locale }),
    you: m.conversation_you({}, { locale }),
    noRecognition: m.conversation_no_recognition({}, { locale }),
    cloudRecognition: m.conversation_cloud_recognition({}, { locale })
  });

  let partner = $state<Partner | null>(null);
  let targetWords = $state<string[]>([]);
  let levelWords: string[] = [];
  let turns = $state<Turn[]>([]);
  let phase = $state<Phase>('setup');
  let draftReply = $state('');
  let liveHeard = $state('');
  let typed = $state('');
  let typing = $state(false);
  let handsFree = $state(true);
  let playingTurn = $state<number | null>(null);
  // A short burst of joy on the partner's face when the learner uses one of the words.
  let cheer = $state(false);
  let recognitionCtor: RecognitionCtor | null = null;
  let recognitionSupported = $state(false);
  // Chrome can recognise speech on the device; elsewhere the browser's recogniser may use a server.
  let recognitionLocal = $state(false);
  let recognition: Recognition | null = null;
  let voices: SpeechSynthesisVoice[] = [];
  let transcriptEnd = $state<HTMLElement | null>(null);
  // Bumped whenever audio is stopped, so a clip that finishes loading late does not start playing.
  let audioToken = 0;
  let stopClip: () => void = () => {};
  let roundToken = 0;

  const lang = $derived(settings.lang);
  // Always the level from the settings: the conversation practises what the learner is learning.
  const level = $derived(settings.vocabularyLevel);
  const used = $derived(usedWords(turns, targetWords, spellingOf, lang));
  const partnerMood = $derived<Mood>(cheer ? 'laughing' : phase === 'speaking' ? 'happy' : phase === 'listening' ? 'curious' : phase === 'thinking' ? 'sleepy' : 'neutral');

  // Every word the learner uses gets a cheer; all of them earn the conversation reward.
  let cheeredFor = 0;
  $effect(() => {
    const count = used.length;
    if (count <= cheeredFor) { cheeredFor = count; return; }
    cheeredFor = count;
    cheer = true;
    haptic('success');
    const timer = window.setTimeout(() => (cheer = false), 1400);
    if (targetWords.length > 0 && count === targetWords.length) unlockCosmetic('conversation');
    return () => window.clearTimeout(timer);
  });

  function spellingOf(word: string) {
    return wordMetadata[lang][word]?.spelling ?? word;
  }
  function speechLocale() {
    return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[lang] ?? lang;
  }
  // Only voices rendered on the device: the Edge setting uses Microsoft's service (see voice/engines.ts).
  function naturalVoiceUsable() {
    return settings.clipVoices && voiceEngines[settings.voiceQuality].onDevice && naturalSupported();
  }

  async function scrollToEnd() {
    await tick();
    transcriptEnd?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function stopAudio() {
    audioToken += 1;
    stopClip();
    stopClip = () => {};
    playingTurn = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  /** Speaks `text` in the partner's voice; resolves when it is over (or was stopped). */
  async function speak(text: string, turnIndex: number | null, rate = 1): Promise<void> {
    stopAudio();
    const token = audioToken;
    playingTurn = turnIndex;
    const voice = partner?.id ?? 'lilith';
    if (naturalVoiceUsable()) {
      await prepareNatural(lang);
      if (token !== audioToken) return;
      if (naturalReady(lang)) {
        const clip = await synthesizeNatural(pronounceable(text, lang).text, voice, 'neutral', [voice], lang, rate).catch(() => null);
        if (token !== audioToken) return;
        if (clip) {
          const playing = playNatural(clip);
          stopClip = playing.stop;
          await Promise.race([playing.done, new Promise<void>((resolve) => window.setTimeout(resolve, playing.seconds * 1000 + 800))]);
          if (token === audioToken) playingTurn = null;
          return;
        }
      }
    }
    if (!('speechSynthesis' in window)) { playingTurn = null; return; }
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLocale();
      utterance.rate = rate * .95;
      utterance.voice = voices.find((entry) => entry.lang.toLowerCase().startsWith(lang) && entry.localService) ?? voices.find((entry) => entry.lang.toLowerCase().startsWith(lang)) ?? null;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
    if (token === audioToken) playingTurn = null;
  }

  function replay(index: number) {
    stopListening();
    const turn = turns[index];
    if (!turn) return;
    // Replaying while the partner still speaks takes over: the pending reply must not reopen the mic.
    if (phase === 'speaking') phase = 'waiting';
    // The learner's own line is read back by the voice, so they hear how it should sound.
    void speak(turn.text, index, turn.speaker === 'learner' ? .85 : 1).then(() => {
      if (phase === 'waiting' && handsFree && playingTurn === null) startListening();
    });
  }

  function stopListening() {
    const instance = recognition;
    recognition = null;
    liveHeard = '';
    try { instance?.abort(); } catch { /* already stopped */ }
    if (phase === 'listening') phase = 'waiting';
  }

  function startListening() {
    if (!recognitionCtor || phase === 'thinking' || phase === 'speaking') return;
    stopAudio();
    stopListening();
    const instance = new recognitionCtor();
    recognition = instance;
    instance.lang = speechLocale();
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    if (recognitionLocal) instance.processLocally = true;
    let finalText = '';
    instance.onresult = (event) => {
      if (recognition !== instance) return;
      const result = event.results[event.results.length - 1];
      const text = result?.[0]?.transcript?.trim() ?? '';
      liveHeard = text;
      if (result?.isFinal && text) finalText = text;
    };
    instance.onerror = (event) => {
      if (recognition !== instance) return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') recognitionSupported = false;
    };
    instance.onend = () => {
      if (recognition !== instance) return;
      recognition = null;
      liveHeard = '';
      phase = 'waiting';
      if (finalText) void submit(finalText);
    };
    phase = 'listening';
    try { instance.start(); } catch { phase = 'waiting'; }
  }

  async function partnerTurn() {
    const token = roundToken;
    phase = 'thinking';
    draftReply = '';
    void scrollToEnd();
    let reply = '';
    const setup = { language: lang, level, targetWords: targetWords.map(spellingOf), levelWords, learnerName: settings.firstName, partner };
    try {
      reply = cleanReply(await generateReply(chatMessages(setup, turns), (text) => {
        if (token === roundToken) { draftReply = cleanReply(text); void scrollToEnd(); }
      }));
    } catch (error) {
      console.error('Conversation reply failed', error);
    }
    if (token !== roundToken) return;
    draftReply = '';
    if (!reply) { phase = 'waiting'; return; }
    turns = [...turns, { speaker: 'partner', text: reply }];
    void scrollToEnd();
    phase = 'speaking';
    await speak(reply, turns.length - 1);
    // The learner may have interrupted the reply by tapping the mic: then they are already talking.
    if (token !== roundToken || phase !== 'speaking') return;
    phase = 'waiting';
    if (handsFree && recognitionSupported && !typing) startListening();
  }

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || phase === 'thinking' || phase === 'speaking') return;
    stopListening();
    stopAudio();
    typed = '';
    turns = [...turns, { speaker: 'learner', text: clean }];
    await partnerTurn();
  }

  // The next partner is drawn ahead of time, so the start screen can introduce them.
  function drawPartner() {
    partner = pickPartner(lang, level, settings.includeLowerVocabulary, settings.firstName, partner?.id ?? null) ?? partner;
  }

  async function startRound() {
    roundToken += 1;
    stopListening();
    stopAudio();
    interruptReply();
    if (!partner) drawPartner();
    // A first download on mobile data asks before fetching gigabytes.
    if (!localModel.cached && localModel.status !== 'ready' && !(await confirmDownload(chosenModel().downloadMB, chosenModel().label))) return;
    await loadLocalModel();
    if (localModel.status !== 'ready') return;
    const entries = await loadLevel(lang, level);
    const pool = Object.keys(entries).map((word) => word.toLocaleUpperCase()).filter((word) => /\p{L}{3,}/u.test(word));
    targetWords = pickTargetWords(pool);
    // A sample of the level's own word list, which the model is asked to prefer in general.
    levelWords = pickTargetWords(pool.filter((word) => !targetWords.includes(word)), LEVEL_WORD_SAMPLE).map(spellingOf);
    turns = [];
    cheeredFor = 0;
    await partnerTurn();
  }

  // Someone new, with new words: straight into the next conversation.
  function newPartner() {
    roundToken += 1;
    interruptReply();
    stopListening();
    stopAudio();
    draftReply = '';
    drawPartner();
    void startRound();
  }

  function speakWord(word: string) {
    stopListening();
    void speak(spellingOf(word), null, .85);
  }

  function toggleMic() {
    if (phase === 'listening') stopListening();
    else if (phase === 'speaking') { stopAudio(); phase = 'waiting'; startListening(); }
    else startListening();
  }

  async function detectRecognition() {
    const globalWindow = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    recognitionCtor = globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null;
    recognitionSupported = Boolean(recognitionCtor);
    typing = !recognitionSupported;
    if (!recognitionCtor?.available) return;
    const options = { langs: [speechLocale()], processLocally: true };
    try {
      let availability = await recognitionCtor.available(options);
      if (availability === 'downloadable' && recognitionCtor.install) availability = (await recognitionCtor.install(options)) ? 'available' : availability;
      recognitionLocal = availability === 'available';
    } catch {
      recognitionLocal = false;
    }
  }

  onMount(() => {
    drawPartner();
    void checkLocalModel();
    void detectRecognition();
    const refreshVoices = () => (voices = window.speechSynthesis.getVoices());
    if ('speechSynthesis' in window) { refreshVoices(); window.speechSynthesis.addEventListener('voiceschanged', refreshVoices); }
    return () => {
      roundToken += 1;
      interruptReply();
      stopListening();
      stopAudio();
      if ('speechSynthesis' in window) window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
    };
  });
  $effect(() => {
    if (naturalVoiceUsable()) void prepareNatural(settings.lang);
  });
</script>

<section class="talk" aria-label={labels.title}>
  {#if phase === 'setup'}
    <article class="talk-intro">
      {#if partner}
        <div class="talk-stage" aria-hidden="true">
          <span class="talk-stage-scene"><StoryScene scene={partner.scene} /></span>
          <span class="talk-stage-character bob"><StoryCharacter id={partner.id} mood="happy" /></span>
        </div>
        <p class="talk-kicker">{labels.meet}</p>
        <h1>{partner.name}</h1>
        <p class="talk-story">{labels.fromStory(partner.storyTitle)}</p>
      {:else}
        <h1>{labels.title}</h1>
      {/if}
      <p class="talk-text">{labels.intro}</p>
      <span class="talk-level">Level {level.toUpperCase()}</span>
      <p class="talk-model">{labels.model(chosenModel().label)} · <a href="/settings">{labels.changeModel}</a></p>
      <ModelStatus downloaded={localModel.cached} inMemory={localModel.status === 'ready'} downloadMB={chosenModel().downloadMB} memoryMB={modelGpuMB(chosenModel())} />
      {#if localModel.status === 'unsupported'}
        <p class="talk-error">{labels.unsupported}</p>
      {:else if localModel.status === 'loading'}
        <DownloadProgress progress={localModel.progress} phase={modelProgressPhase(localModel.text)} bytesPerSecond={localModel.bytesPerSecond} detail={chosenModel().label} />
      {:else}
        {#if localModel.status === 'failed'}<p class="talk-error">{labels.failed}</p>{/if}
        <div class="talk-intro-actions">
          <button type="button" class="btn-play btn-play-soft btn-play-round" onclick={drawPartner} aria-label={labels.newPartner} title={labels.newPartner}><IconCasino aria-hidden="true" /></button>
          <button type="button" class="btn-play btn-play-go" onclick={startRound} disabled={localModel.status === 'checking'}>{localModel.cached || localModel.status === 'ready' ? labels.start : labels.download}</button>
        </div>
      {/if}
      <p class="talk-privacy"><IconLock aria-hidden="true" /> {labels.privacy}</p>
      {#if !recognitionSupported}<p class="talk-hint">{labels.noRecognition}</p>{/if}
    </article>
  {:else}
    <header class="talk-header">
      {#if partner}
        <span class="talk-header-scene" aria-hidden="true"><StoryScene scene={partner.scene} /></span>
        <span class="talk-header-character" class:cheer aria-hidden="true"><StoryCharacter id={partner.id} mood={partnerMood} /></span>
        <div class="talk-header-text">
          <strong>{partner.name}</strong>
          <span>{phase === 'thinking' ? labels.thinking(partner.name) : phase === 'speaking' ? labels.speaking(partner.name) : phase === 'listening' ? labels.listening : labels.tapToTalk}</span>
          {#if localModel.tokensPerSecond}<span class="talk-speed" title={chosenModel().label}>{Math.round(localModel.tokensPerSecond)} tok/s</span>{/if}
        </div>
      {/if}
      <button type="button" class="btn-play btn-play-round talk-new" onclick={newPartner} aria-label={labels.newPartner} title={labels.newPartner}><IconCasino aria-hidden="true" /></button>
    </header>

    <section class="talk-words" aria-label={labels.words}>
      <div class="talk-words-head">
        <span>{labels.words} · {level.toUpperCase()}</span>
        <span class="talk-words-count">{labels.wordsUsed(used.length, targetWords.length)}</span>
      </div>
      <ul>
        {#each targetWords as word (word)}
          <li><button type="button" class="talk-word" class:used={used.includes(word)} onclick={() => speakWord(word)} lang={lang}>{#if used.includes(word)}<IconStar aria-hidden="true" />{/if}{spellingOf(word)}</button></li>
        {/each}
      </ul>
    </section>

    <ol class="talk-transcript" aria-live="polite">
      {#each turns as turn, index (index)}
        <li class="talk-turn" class:mine={turn.speaker === 'learner'}>
          {#if turn.speaker === 'partner' && partner}<span class="talk-face" aria-hidden="true"><StoryCharacter id={partner.id} mood="happy" still /></span>{/if}
          <div class="talk-bubble" class:playing={playingTurn === index}>
            <span class="talk-who">{turn.speaker === 'learner' ? labels.you : partner?.name}</span>
            <p lang={lang} dir="auto">{turn.text}</p>
          </div>
          <button type="button" class="talk-replay" class:playing={playingTurn === index} onclick={() => (playingTurn === index ? stopAudio() : replay(index))} aria-label={labels.replay}><IconVolume aria-hidden="true" /></button>
        </li>
      {/each}
      {#if phase === 'thinking'}
        <li class="talk-turn">
          {#if partner}<span class="talk-face" aria-hidden="true"><StoryCharacter id={partner.id} mood="curious" still /></span>{/if}
          <div class="talk-bubble"><span class="talk-who">{partner?.name}</span>{#if draftReply}<p lang={lang} dir="auto">{draftReply}</p>{:else}<p class="talk-dots" aria-hidden="true"><span></span><span></span><span></span></p>{/if}</div>
        </li>
      {/if}
      {#if liveHeard}
        <li class="talk-turn mine"><div class="talk-bubble live"><span class="talk-who">{labels.you}</span><p lang={lang} dir="auto">{liveHeard}</p></div></li>
      {/if}
      <li class="talk-end" bind:this={transcriptEnd} aria-hidden="true"></li>
    </ol>

    <footer class="talk-controls">
      {#if recognitionSupported && !recognitionLocal}<p class="talk-hint">{labels.cloudRecognition}</p>{/if}
      {#if typing}
        <form class="talk-type" onsubmit={(event) => { event.preventDefault(); void submit(typed); }}>
          <input type="text" bind:value={typed} placeholder={labels.typePlaceholder} lang={lang} autocomplete="off" disabled={phase === 'thinking'} />
          <button type="submit" class="btn-play btn-play-round btn-play-go" disabled={!typed.trim() || phase === 'thinking'} aria-label={labels.send}><IconSend aria-hidden="true" /></button>
        </form>
      {/if}
      <div class="talk-buttons">
        <button type="button" class="talk-toggle" class:on={handsFree} aria-pressed={handsFree} onclick={() => (handsFree = !handsFree)} title={labels.handsFree}><IconHandsFree aria-hidden="true" /><span>{labels.handsFree}</span></button>
        {#if recognitionSupported}
          <button type="button" class="talk-mic" class:listening={phase === 'listening'} disabled={phase === 'thinking'} onclick={toggleMic} aria-label={phase === 'listening' ? labels.stop : labels.tapToTalk}>{#if phase === 'listening'}<IconStop aria-hidden="true" />{:else}<IconMic aria-hidden="true" />{/if}</button>
        {/if}
        <button type="button" class="talk-toggle" class:on={typing} aria-pressed={typing} onclick={() => { typing = !typing; if (typing) stopListening(); }} title={labels.type}><IconKeyboard aria-hidden="true" /><span>{labels.type}</span></button>
      </div>
    </footer>
  {/if}
</section>

<style>
  .talk { flex:1;min-height:0;display:flex;flex-direction:column;gap:.7rem;padding:clamp(.9rem,4vw,1.6rem);overflow-y:auto;background:linear-gradient(180deg,#f3ead9,#ede4d5);color:#172a45; }
  :global(html.dark) .talk { background:linear-gradient(180deg,#213a5d,#172a45);color:#fffdf7; }

  /* Start screen: meet today's partner. */
  .talk-intro { width:min(100%,26rem);margin:auto;display:grid;justify-items:center;gap:.6rem;padding:1.2rem 1.2rem 1.4rem;border:2px solid #172a45;border-radius:22px 16px 20px 17px / 17px 20px 16px 22px;background:#fffdf7;box-shadow:4px 4px 0 #172a45;text-align:center; }
  :global(html.dark) .talk-intro { background:#2b4a70;border-color:#0b1626;box-shadow:4px 4px 0 #0b1626; }
  .talk-stage { position:relative;width:100%;height:10rem;overflow:hidden;border-radius:16px; }
  .talk-stage-scene,.talk-header-scene { position:absolute;inset:0; }
  .talk-stage-scene :global(svg),.talk-header-scene :global(svg) { width:100%;height:100%; }
  .talk-stage-character { position:absolute;left:50%;bottom:-.4rem;width:6.4rem;height:8rem;translate:-50% 0; }
  .talk-stage-character :global(.story-character),.talk-header-character :global(.story-character),.talk-face :global(.story-character) { width:100%;height:100%; }
  .bob { animation:talk-bob 2.4s ease-in-out infinite; }
  .talk-kicker { margin:0;font-size:.62rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#a45e38; }
  .talk-intro h1 { margin:0;font-family:'DM Serif Display',serif;font-weight:400;font-size:clamp(1.9rem,8vw,2.5rem);line-height:1; }
  .talk-story { margin:0;font-size:.78rem;font-style:italic;opacity:.75; }
  .talk-text { margin:0;font-size:.82rem;line-height:1.45; }
  .talk-level { padding:.2rem .65rem;border-radius:999px;background:#172a45;color:#fffdf7;font-size:.62rem;font-weight:900;letter-spacing:.1em; }
  :global(html.dark) .talk-level { background:#e6a527;color:#172a45; }
  .talk-model { margin:0;font-size:.68rem;font-weight:800;opacity:.7; }
  .talk-model a { color:#a45e38;text-decoration:underline;text-underline-offset:2px; }
  .talk-speed { font-size:.58rem !important;font-weight:900;letter-spacing:.04em;opacity:.45 !important;font-variant-numeric:tabular-nums; }
  .talk-intro-actions { display:flex;align-items:center;gap:.6rem; }
  .talk-privacy { display:flex;align-items:center;gap:.3rem;margin:0;font-size:.68rem;font-weight:800;opacity:.65; }
  .talk-privacy :global(svg) { width:.85rem;height:.85rem; }
  .talk-error { margin:0;color:#b54442;font-size:.8rem;font-weight:800; }
  .talk-hint { margin:0;font-size:.7rem;font-weight:700;opacity:.7;text-align:center; }

  /* In conversation: the partner on stage, the words to use, the transcript. */
  .talk-header { position:relative;width:min(100%,40rem);margin:0 auto;display:flex;align-items:flex-end;gap:.7rem;min-height:6.2rem;padding:.6rem .7rem 0;overflow:hidden;border:2px solid #172a45;border-radius:18px;box-shadow:3px 3px 0 #172a45; }
  :global(html.dark) .talk-header { border-color:#0b1626;box-shadow:3px 3px 0 #0b1626; }
  .talk-header-character { position:relative;flex:none;width:4.6rem;height:5.8rem;transition:scale .3s cubic-bezier(.34,1.56,.64,1); }
  .talk-header-character.cheer { scale:1.12;animation:talk-hop .5s cubic-bezier(.34,1.56,.64,1); }
  .talk-header-text { position:relative;flex:1;min-width:0;display:grid;gap:.1rem;align-self:center;padding:.4rem .65rem;border-radius:12px;background:rgba(255,253,247,.88);color:#172a45; }
  .talk-header-text strong { font-family:'DM Serif Display',serif;font-size:1.15rem;font-weight:400; }
  .talk-header-text span { font-size:.7rem;font-weight:800;opacity:.75; }
  .talk-new { position:relative;align-self:center; }

  .talk-words { width:min(100%,40rem);margin:0 auto;display:grid;gap:.4rem; }
  .talk-words-head { display:flex;justify-content:space-between;gap:.5rem;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.75; }
  .talk-words-count { color:#34824d; }
  .talk-words ul { display:flex;flex-wrap:wrap;gap:.4rem;margin:0;padding:0;list-style:none; }
  .talk-word { display:inline-flex;align-items:center;gap:.2rem;padding:.3rem .7rem;border:2px dashed rgba(23,42,69,.35);border-radius:999px;background:#fffdf7;color:#172a45;font-size:.82rem;font-weight:800;cursor:pointer;transition:transform .2s cubic-bezier(.34,1.56,.64,1); }
  .talk-word:active { transform:scale(.94); }
  .talk-word.used { border:2px solid #34824d;background:#e3f3e7;color:#23663a;animation:talk-pop .45s cubic-bezier(.34,1.56,.64,1); }
  .talk-word :global(svg) { width:.95rem;height:.95rem;color:#e6a527; }

  .talk-transcript { width:min(100%,40rem);margin:0 auto;flex:1;display:flex;flex-direction:column;gap:.75rem;padding:0;list-style:none; }
  .talk-turn { display:flex;align-items:flex-end;gap:.4rem;max-width:88%;animation:talk-in .3s ease-out; }
  .talk-turn.mine { align-self:flex-end;flex-direction:row-reverse; }
  .talk-face { flex:none;width:2.2rem;height:2.6rem;overflow:hidden; }
  .talk-bubble { display:grid;gap:.15rem;padding:.55rem .8rem;border:2px solid #172a45;border-radius:16px 16px 16px 4px;background:#fffdf7;color:#172a45;box-shadow:2px 2px 0 #172a45;transition:background .2s ease; }
  .mine .talk-bubble { border-radius:16px 16px 4px 16px;background:#fbe6b5; }
  .talk-bubble.playing { background:#e3f3e7; }
  .talk-bubble.live { opacity:.7;border-style:dashed;box-shadow:none; }
  .talk-who { font-size:.58rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.55; }
  .talk-bubble p { margin:0;font-size:.95rem;line-height:1.45; }
  .talk-replay { flex:none;display:grid;place-items:center;width:1.9rem;height:1.9rem;padding:0;border:2px solid #172a45;border-radius:50%;background:#fffdf7;color:#172a45;cursor:pointer;transition:transform .15s ease; }
  .talk-replay:active { transform:scale(.9); }
  .talk-replay.playing { background:#e6a527; }
  .talk-replay :global(svg) { width:.95rem;height:.95rem; }
  .talk-dots { display:flex;gap:.25rem;padding:.3rem 0; }
  .talk-dots span { width:.45rem;height:.45rem;border-radius:50%;background:#172a45;opacity:.4;animation:talk-dot 1s ease-in-out infinite; }
  .talk-dots span:nth-child(2) { animation-delay:.15s; }
  .talk-dots span:nth-child(3) { animation-delay:.3s; }
  .talk-end { height:1px; }

  .talk-controls { position:sticky;bottom:0;width:min(100%,40rem);margin:0 auto;display:grid;gap:.55rem;justify-items:center;padding:.5rem 0 .2rem;background:inherit; }
  .talk-buttons { display:flex;align-items:center;justify-content:center;gap:1rem; }
  .talk-mic { position:relative;display:grid;place-items:center;width:4.4rem;height:4.4rem;padding:0;border:3px solid #172a45;border-radius:50%;background:#e6a527;color:#172a45;box-shadow:3px 3px 0 #172a45;cursor:pointer;transition:transform .15s ease,background .2s ease; }
  .talk-mic :global(svg) { width:2rem;height:2rem; }
  .talk-mic:active { transform:scale(.93); }
  .talk-mic:disabled { opacity:.5;cursor:wait; }
  .talk-mic.listening { background:#d64b45;color:#fffdf7; }
  .talk-mic.listening::after { content:'';position:absolute;inset:-9px;border:3px solid #d64b45;border-radius:50%;animation:talk-ring 1.2s ease-out infinite; }
  .talk-toggle { display:grid;justify-items:center;gap:.1rem;width:4rem;padding:.35rem 0;border:2px solid transparent;border-radius:14px;background:transparent;color:inherit;font-size:.56rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;opacity:.55;cursor:pointer; }
  .talk-toggle :global(svg) { width:1.25rem;height:1.25rem; }
  .talk-toggle.on { opacity:1;border-color:#172a45;background:#fffdf7;color:#172a45; }
  .talk-type { width:100%;display:flex;gap:.5rem; }
  .talk-type input { flex:1;min-width:0;padding:.6rem .9rem;border:2px solid #172a45;border-radius:999px;background:#fffdf7;color:#172a45;font-size:.92rem; }

  :global(html.dark) .talk-word,:global(html.dark) .talk-bubble,:global(html.dark) .talk-replay,:global(html.dark) .talk-type input,:global(html.dark) .talk-toggle.on { border-color:#0b1626; }

  @keyframes talk-bob { 0%,100% { translate:-50% 0; } 50% { translate:-50% -.35rem; } }
  @keyframes talk-hop { 0% { translate:0 0; } 40% { translate:0 -.6rem; } 100% { translate:0 0; } }
  @keyframes talk-pop { 0% { scale:1; } 45% { scale:1.18; } 100% { scale:1; } }
  @keyframes talk-in { from { opacity:0;translate:0 .4rem; } to { opacity:1;translate:0 0; } }
  @keyframes talk-dot { 0%,100% { translate:0 0;opacity:.35; } 50% { translate:0 -.25rem;opacity:.9; } }
  @keyframes talk-ring { from { opacity:.8;scale:.9; } to { opacity:0;scale:1.35; } }
  @media (prefers-reduced-motion:reduce) { .bob,.talk-header-character.cheer,.talk-word.used,.talk-turn,.talk-dots span,.talk-mic.listening::after { animation:none; } }
</style>
