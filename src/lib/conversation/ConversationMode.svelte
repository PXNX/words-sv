<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { loadLevel, vocabularyLevels, wordMetadata, type VocabularyLevel } from '#lib/data/vocabulary.js';
  import { pronounceable } from '#lib/story/speech.js';
  import { naturalReady, naturalSupported, playNatural, prepareNatural, synthesizeNatural } from '#lib/story/naturalVoices.svelte.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { chatMessages, cleanReply, pickTargetWords, usedWords, type Turn } from './conversation.js';
  import { checkLocalModel, generateReply, interruptReply, loadLocalModel, localModel, MODEL_MEGABYTES } from './localModel.svelte.js';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';
  import IconStop from '~icons/material-symbols/stop-rounded';
  import IconSend from '~icons/material-symbols/send-rounded';
  import IconRefresh from '~icons/material-symbols/refresh-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
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
    level: m.conversation_level({}, { locale }),
    download: m.conversation_download({ mb: String(MODEL_MEGABYTES) }, { locale }),
    start: m.conversation_start({}, { locale }),
    loading: m.conversation_loading({}, { locale }),
    unsupported: m.conversation_unsupported({}, { locale }),
    failed: m.conversation_failed({}, { locale }),
    words: m.conversation_words({}, { locale }),
    listening: m.conversation_listening({}, { locale }),
    thinking: m.conversation_thinking({}, { locale }),
    speaking: m.conversation_speaking({}, { locale }),
    tapToTalk: m.conversation_tap_to_talk({}, { locale }),
    stop: m.conversation_stop({}, { locale }),
    typePlaceholder: m.conversation_type_placeholder({}, { locale }),
    send: m.conversation_send({}, { locale }),
    replay: m.conversation_replay({}, { locale }),
    newRound: m.conversation_new_round({}, { locale }),
    handsFree: m.conversation_hands_free({}, { locale }),
    you: m.conversation_you({}, { locale }),
    partner: m.conversation_partner({}, { locale }),
    noRecognition: m.conversation_no_recognition({}, { locale }),
    cloudRecognition: m.conversation_cloud_recognition({}, { locale })
  });

  let level = $state<VocabularyLevel>(settings.vocabularyLevel);
  let targetWords = $state<string[]>([]);
  let turns = $state<Turn[]>([]);
  let phase = $state<Phase>('setup');
  let draftReply = $state('');
  let liveHeard = $state('');
  let typed = $state('');
  let handsFree = $state(true);
  let playingTurn = $state<number | null>(null);
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
  const used = $derived(usedWords(turns, targetWords, spellingOf, lang));
  const loadingPercent = $derived(Math.round(localModel.progress * 100));

  function spellingOf(word: string) {
    return wordMetadata[lang][word]?.spelling ?? word;
  }
  function speechLocale() {
    return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[lang] ?? lang;
  }
  // Only voices rendered on the device: the Edge quality setting uses Microsoft's service.
  function naturalVoiceUsable() {
    return settings.clipVoices && settings.voiceQuality !== 'edge' && naturalSupported();
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

  /** Speaks `text`; resolves when it is over (or was stopped). */
  async function speak(text: string, turnIndex: number | null, rate = 1): Promise<void> {
    stopAudio();
    const token = audioToken;
    playingTurn = turnIndex;
    if (naturalVoiceUsable()) {
      await prepareNatural(lang);
      if (token !== audioToken) return;
      if (naturalReady(lang)) {
        const clip = await synthesizeNatural(pronounceable(text, lang).text, 'lilith', 'neutral', ['lilith'], lang, rate).catch(() => null);
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
      utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang) && voice.localService) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(lang)) ?? null;
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
    try {
      reply = cleanReply(await generateReply(chatMessages(lang, level, targetWords.map(spellingOf), turns, settings.firstName), (text) => {
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
    if (handsFree && recognitionSupported) startListening();
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

  async function startRound() {
    roundToken += 1;
    stopListening();
    stopAudio();
    interruptReply();
    await loadLocalModel();
    if (localModel.status !== 'ready') return;
    const entries = await loadLevel(lang, level);
    const pool = Object.keys(entries).map((word) => word.toLocaleUpperCase()).filter((word) => /\p{L}{3,}/u.test(word));
    targetWords = pickTargetWords(pool);
    turns = [];
    await partnerTurn();
  }

  function endRound() {
    roundToken += 1;
    interruptReply();
    stopListening();
    stopAudio();
    draftReply = '';
    phase = 'setup';
  }

  function speakWord(word: string) {
    stopListening();
    void speak(spellingOf(word), null, .85);
  }

  async function detectRecognition() {
    const globalWindow = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    recognitionCtor = globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null;
    recognitionSupported = Boolean(recognitionCtor);
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

<section class="conversation" aria-label={labels.title}>
  {#if phase === 'setup'}
    <article class="conversation-card conversation-setup">
      <span class="conversation-avatar" aria-hidden="true"><StoryCharacter id="lilith" mood="happy" /></span>
      <h1>{labels.title}</h1>
      <p>{labels.intro}</p>
      <p class="conversation-privacy"><IconLock aria-hidden="true" /> {labels.privacy}</p>
      <label class="conversation-level">
        <span>{labels.level}</span>
        <select bind:value={level}>
          {#each vocabularyLevels as option (option)}<option value={option}>{option.toUpperCase()}</option>{/each}
        </select>
      </label>
      {#if localModel.status === 'unsupported'}
        <p class="conversation-error">{labels.unsupported}</p>
      {:else if localModel.status === 'loading'}
        <div class="conversation-progress" role="progressbar" aria-label={labels.loading} aria-valuemin="0" aria-valuemax="100" aria-valuenow={loadingPercent}><span style:width={`${loadingPercent}%`}></span></div>
        <p class="conversation-hint">{labels.loading} {loadingPercent}%</p>
      {:else}
        {#if localModel.status === 'failed'}<p class="conversation-error">{labels.failed}</p>{/if}
        <button type="button" class="btn-play btn-play-go" onclick={startRound} disabled={localModel.status === 'checking'}>{localModel.cached || localModel.status === 'ready' ? labels.start : labels.download}</button>
      {/if}
      {#if !recognitionSupported}<p class="conversation-hint">{labels.noRecognition}</p>{/if}
    </article>
  {:else}
    <header class="conversation-words" aria-label={labels.words}>
      <span class="conversation-words-label">{labels.words} · {level.toUpperCase()}</span>
      <ul>
        {#each targetWords as word (word)}
          <li><button type="button" class="conversation-word" class:used={used.includes(word)} onclick={() => speakWord(word)} lang={lang}>{#if used.includes(word)}<IconCheck aria-hidden="true" />{/if}{spellingOf(word)}</button></li>
        {/each}
      </ul>
    </header>

    <ol class="conversation-transcript" aria-live="polite">
      {#each turns as turn, index (index)}
        <li class="conversation-turn" class:learner={turn.speaker === 'learner'}>
          <span class="conversation-speaker">{turn.speaker === 'learner' ? labels.you : labels.partner}</span>
          <div class="conversation-bubble">
            <p lang={lang} dir="auto">{turn.text}</p>
            <button type="button" class="btn-play btn-play-round btn-play-sm conversation-replay" class:btn-play-sun={playingTurn === index} onclick={() => (playingTurn === index ? stopAudio() : replay(index))} aria-label={labels.replay}><IconVolume aria-hidden="true" /></button>
          </div>
        </li>
      {/each}
      {#if phase === 'thinking'}
        <li class="conversation-turn"><span class="conversation-speaker">{labels.partner}</span><div class="conversation-bubble"><p lang={lang} dir="auto">{draftReply || '…'}</p></div></li>
      {/if}
      {#if liveHeard}
        <li class="conversation-turn learner"><span class="conversation-speaker">{labels.you}</span><div class="conversation-bubble live"><p lang={lang} dir="auto">{liveHeard}</p></div></li>
      {/if}
      <li class="conversation-end" bind:this={transcriptEnd} aria-hidden="true"></li>
    </ol>

    <footer class="conversation-controls">
      <p class="conversation-status" aria-live="polite">
        {#if phase === 'thinking'}{labels.thinking}{:else if phase === 'speaking'}{labels.speaking}{:else if phase === 'listening'}<span class="listening-dot" aria-hidden="true"></span>{labels.listening}{:else if recognitionSupported}{labels.tapToTalk}{/if}
      </p>
      {#if recognitionSupported && !recognitionLocal}<p class="conversation-hint">{labels.cloudRecognition}</p>{/if}
      <div class="conversation-buttons">
        <button type="button" class="btn-play btn-play-soft btn-play-round" onclick={endRound} aria-label={labels.newRound} title={labels.newRound}><IconRefresh aria-hidden="true" /></button>
        {#if recognitionSupported}
          <button type="button" class="btn-play conversation-mic" class:btn-play-sun={phase === 'listening'} class:btn-play-ink={phase !== 'listening'} disabled={phase === 'thinking'} onclick={() => {
            if (phase === 'listening') stopListening();
            else if (phase === 'speaking') { stopAudio(); phase = 'waiting'; startListening(); }
            else startListening();
          }} aria-label={phase === 'listening' ? labels.stop : labels.tapToTalk}>{#if phase === 'listening'}<IconStop aria-hidden="true" />{:else}<IconMic aria-hidden="true" />{/if}</button>
        {/if}
        <label class="conversation-hands-free"><input type="checkbox" bind:checked={handsFree} /> {labels.handsFree}</label>
      </div>
      <form class="conversation-type" onsubmit={(event) => { event.preventDefault(); void submit(typed); }}>
        <input type="text" bind:value={typed} placeholder={labels.typePlaceholder} lang={lang} autocomplete="off" disabled={phase === 'thinking'} />
        <button type="submit" class="btn-play btn-play-round" disabled={!typed.trim() || phase === 'thinking'} aria-label={labels.send}><IconSend aria-hidden="true" /></button>
      </form>
    </footer>
  {/if}
</section>

<style>
  .conversation { flex:1;min-height:0;display:flex;flex-direction:column;gap:.75rem;padding:clamp(1rem,4vw,2rem);overflow-y:auto;background:#ede4d5; }
  :global(html.dark) .conversation { background:#213a5d; }
  .conversation-card { width:min(100%,28rem);margin:auto;display:grid;justify-items:center;gap:.85rem;padding:clamp(1.4rem,7vw,2.2rem);border-radius:1rem;border:1px solid var(--color-neutral);background:var(--color-neutral-content);box-shadow:0 12px 30px rgba(23,42,69,.12);text-align:center; }
  .conversation-card h1 { margin:0;font-family:'DM Serif Display',serif;font-weight:400;font-size:clamp(1.6rem,7vw,2.2rem);line-height:1; }
  .conversation-card p { margin:0;font-size:.85rem;line-height:1.45; }
  .conversation-avatar { width:5rem;height:5rem;display:block; }
  .conversation-privacy { display:flex;align-items:center;gap:.35rem;font-weight:700;opacity:.75; }
  .conversation-level { display:flex;align-items:center;gap:.5rem;font-weight:800;font-size:.8rem; }
  .conversation-level select { padding:.3rem .6rem;border-radius:.5rem;border:1px solid rgba(23,42,69,.3);background:transparent;font-weight:800; }
  .conversation-error { color:#b54442;font-weight:700; }
  .conversation-hint { font-size:.72rem !important;opacity:.7;text-align:center;margin:0; }
  .conversation-progress { width:100%;height:.55rem;border-radius:999px;background:rgba(23,42,69,.12);overflow:hidden; }
  .conversation-progress span { display:block;height:100%;background:#34824d;transition:width .2s ease; }

  .conversation-words { width:min(100%,40rem);margin:0 auto;display:grid;gap:.4rem; }
  .conversation-words-label { font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.7; }
  .conversation-words ul { display:flex;flex-wrap:wrap;gap:.4rem;margin:0;padding:0;list-style:none; }
  .conversation-word { display:inline-flex;align-items:center;gap:.2rem;padding:.25rem .65rem;border-radius:999px;border:1px solid rgba(23,42,69,.3);background:var(--color-neutral-content);font-weight:800;font-size:.8rem; }
  .conversation-word.used { border-color:#34824d;background:rgba(52,130,77,.15);color:#34824d; }

  .conversation-transcript { width:min(100%,40rem);margin:0 auto;flex:1;display:flex;flex-direction:column;gap:.7rem;padding:0;list-style:none; }
  .conversation-turn { display:grid;gap:.2rem;justify-items:start;max-width:85%; }
  .conversation-turn.learner { align-self:flex-end;justify-items:end; }
  .conversation-speaker { font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;opacity:.6; }
  .conversation-bubble { display:flex;align-items:flex-start;gap:.5rem;padding:.6rem .75rem;border-radius:1rem 1rem 1rem .3rem;border:1px solid var(--color-neutral);background:var(--color-neutral-content);box-shadow:0 4px 12px rgba(23,42,69,.08); }
  .learner .conversation-bubble { border-radius:1rem 1rem .3rem 1rem;background:#fbe9c4;color:#172a45; }
  .conversation-bubble.live { opacity:.65;border-style:dashed; }
  .conversation-bubble p { margin:0;font-size:.95rem;line-height:1.45; }
  .conversation-replay { flex:none; }
  .conversation-end { height:1px; }

  .conversation-controls { position:sticky;bottom:0;width:min(100%,40rem);margin:0 auto;display:grid;gap:.5rem;justify-items:center;padding-top:.5rem;background:inherit; }
  .conversation-status { margin:0;min-height:1.2rem;display:flex;align-items:center;gap:.4rem;font-size:.8rem;font-weight:800; }
  .conversation-buttons { display:flex;align-items:center;gap:.9rem; }
  .conversation-mic { width:4rem;height:4rem;min-height:0;padding:0;border-radius:50%; }
  .conversation-mic :global(svg) { width:1.8rem;height:1.8rem; }
  .conversation-hands-free { display:flex;align-items:center;gap:.3rem;font-size:.72rem;font-weight:800; }
  .conversation-type { width:100%;display:flex;gap:.5rem; }
  .conversation-type input { flex:1;min-width:0;padding:.55rem .8rem;border-radius:999px;border:1px solid rgba(23,42,69,.3);background:var(--color-neutral-content);font-size:.9rem; }
  .listening-dot { width:.5rem;height:.5rem;border-radius:50%;background:#4a72c9;animation:listening-pulse 1.1s ease-in-out infinite; }
  @keyframes listening-pulse { 0%,100% { opacity:.35;scale:.8; } 50% { opacity:1;scale:1.15; } }
</style>
