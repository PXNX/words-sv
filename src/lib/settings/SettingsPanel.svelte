<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings, interfaceLocales, type WordleLength } from '#lib/state/settings.svelte.js';
  import { playableLanguages, vocabularyLevels, isLanguage, type VocabularyLevel } from '#lib/data/vocabulary.js';
  import { disablePush, enablePush, pushEnabled, pushSupported } from './pushClient';
  import { openTelegramLink, telegramDevice, type TelegramStatus } from './telegramClient';
  import { naturalMegabytes, naturalReady, naturalState, naturalSupported, playNatural, prepareNatural, synthesizeNatural } from '#lib/story/naturalVoices.svelte.js';
  import { onMount } from 'svelte';
  import SelectMenu from './SelectMenu.svelte';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { defaultAvatar } from '#lib/profile/avatar.js';
  import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconDark from '~icons/material-symbols/dark-mode-rounded';
  import IconGithub from '~icons/fa6-brands/github';
  import IconHelp from '~icons/material-symbols/question-mark-rounded';
  import IconLanguage from '~icons/material-symbols/language-rounded';
  import IconShare from '~icons/material-symbols/share-rounded';
  import IconTelegram from '~icons/fa6-brands/telegram';
  import IconLight from '~icons/material-symbols/light-mode-rounded';
  import IconVibrate from '~icons/material-symbols/vibration-rounded';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconVolumeOff from '~icons/material-symbols/volume-off-rounded';

  let notificationsEnabled = $state(false);
  let notificationMessage = $state('');
  let notificationBusy = $state(false);

  const labels = $derived({
    settingsHint: m.settings_hint({}, { locale: settings.interfaceLocale }),
    contentGroup: m.content_group({}, { locale: settings.interfaceLocale }),
    behaviorGroup: m.behavior_group({}, { locale: settings.interfaceLocale }),
    gameLanguage: m.game_language({}, { locale: settings.interfaceLocale }),
    vocabulary: m.vocabulary({}, { locale: settings.interfaceLocale }),
    wordleLength: 'Wordle length',
    includeLower: m.include_lower({}, { locale: settings.interfaceLocale }),
    backwards: m.backwards({}, { locale: settings.interfaceLocale }),
    interfaceLanguage: m.interface_language({}, { locale: settings.interfaceLocale }),
    appearance: m.appearance({}, { locale: settings.interfaceLocale }),
    light: m.light({}, { locale: settings.interfaceLocale }),
    dark: m.dark({}, { locale: settings.interfaceLocale }),
    vibration: m.vibration({}, { locale: settings.interfaceLocale }),
    sound: 'Sound effects',
    voiceQuality: m.voice_quality({}, { locale: settings.interfaceLocale }),
    storiesGroup: m.stories_group({}, { locale: settings.interfaceLocale }),
    storiesGroupHint: m.stories_group_hint({}, { locale: settings.interfaceLocale }),
    voiceStandard: m.voice_quality_standard({}, { locale: settings.interfaceLocale }),
    voiceNatural: m.voice_quality_natural({}, { locale: settings.interfaceLocale }),
    voiceRecorded: 'Recorded',
    voiceRecordedHint: "Pre-recorded Piper clips for each character's reference sentence; every other line is generated on your device like Natural.",
    voiceEdge: 'Edge',
    voiceEdgeHint: 'Microsoft Edge neural voices. Free and no download, but needs internet; if the service refuses, stories fall back to the standard voice.',
    voiceTest: 'Test voice',
    voiceTesting: 'Playing…',
    voiceTestFailed: 'This voice could not speak right now; stories would use the standard voice instead.',
    voiceStandardHint: m.voice_quality_standard_hint({}, { locale: settings.interfaceLocale }),
    voiceFailed: m.voice_quality_failed({}, { locale: settings.interfaceLocale }),
    voiceModel: 'Voice model',
    voiceModelStandard: 'Standard',
    voiceModelHigh: 'High',
    voiceModelHint: 'Higher quality voices are larger and can take more time to load. All voices run on your device.',
    dialects: m.dialects({}, { locale: settings.interfaceLocale }),
    dialectsHint: m.dialects_hint({}, { locale: settings.interfaceLocale }),
    notifications: m.notifications({}, { locale: settings.interfaceLocale }),
    notificationsEnabled: m.notifications_enabled({}, { locale: settings.interfaceLocale }),
    notificationsDenied: m.notifications_denied({}, { locale: settings.interfaceLocale }),
    notificationsUnavailable: m.notifications_unavailable({}, { locale: settings.interfaceLocale }),
    notificationsHint: m.streak_reminder_hint({}, { locale: settings.interfaceLocale }),
    telegramShare: m.telegram_share({}, { locale: settings.interfaceLocale }),
    profileTitle: m.profile_title({}, { locale: settings.interfaceLocale }),
    profileEdit: m.profile_edit({}, { locale: settings.interfaceLocale }),
    profileNameEmpty: m.profile_name_empty({}, { locale: settings.interfaceLocale }),
    telegramReminders: m.telegram_reminders({}, { locale: settings.interfaceLocale }),
    telegramRemindersHint: m.telegram_reminders_hint({}, { locale: settings.interfaceLocale }),
    telegramRemindersWaiting: m.telegram_reminders_waiting({}, { locale: settings.interfaceLocale }),
    inviteTitle: m.invite_title({}, { locale: settings.interfaceLocale }),
    inviteHint: (embers: number) => m.invite_hint({ embers }, { locale: settings.interfaceLocale }),
    inviteShare: m.invite_share({}, { locale: settings.interfaceLocale }),
    inviteCopied: m.invite_copied({}, { locale: settings.interfaceLocale }),
    inviteCount: (count: number) => m.invite_count({ count }, { locale: settings.interfaceLocale }),
    inviteShareText: m.invite_share_text({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const voiceStatus = $derived(naturalState.status[settings.lang] ?? 'idle');
  const voicePercent = $derived(Math.round((naturalState.progress[settings.lang] ?? 0) * 100));
  const voiceDownloaded = $derived(Math.round(naturalState.downloaded[settings.lang] ?? 0));
  const voiceTotal = $derived(Math.round(naturalState.total[settings.lang] ?? naturalMegabytes(settings.lang)));
  function formatRemaining(seconds: number) {
    const value = seconds < 60 ? Math.max(5, Math.ceil(seconds / 5) * 5) : Math.ceil(seconds / 60);
    const unit = seconds < 60 ? 'second' : 'minute';
    try {
      return new Intl.NumberFormat(settings.interfaceLocale, { style: 'unit', unit, unitDisplay: 'short' }).format(value);
    } catch {
      return `${value} ${unit}`;
    }
  }
  const voiceEta = $derived.by(() => {
    const remaining = naturalState.remaining[settings.lang];
    return typeof remaining === 'number' && remaining > 0
      ? m.voice_quality_remaining({ time: formatRemaining(remaining) }, { locale: settings.interfaceLocale })
      : '';
  });
  // Under the voice choice: how big the natural voices are, how far they have downloaded, or that they failed.
  const voiceNote = $derived(
    settings.voiceQuality === 'standard' ? labels.voiceStandardHint
      : settings.voiceQuality === 'edge' ? labels.voiceEdgeHint
      : voiceStatus === 'loading' ? `${m.voice_quality_loading({ percent: String(voicePercent) }, { locale: settings.interfaceLocale })} · ${voiceDownloaded} / ${voiceTotal} MB${voiceEta ? ` · ${voiceEta}` : ''}`
      : voiceStatus === 'failed' ? labels.voiceFailed
      : settings.voiceQuality === 'recorded' ? labels.voiceRecordedHint
      : m.voice_quality_natural_hint({ size: String(naturalMegabytes(settings.lang)) }, { locale: settings.interfaceLocale })
  );
  // Whether the chosen voice runs on Piper, which has a model choice and a download to show.
  const piperVoices = $derived(settings.voiceQuality === 'natural' || settings.voiceQuality === 'recorded');
  let voicesSupported = $state(false);
  $effect(() => () => stopVoiceTest());
  function selectVoiceQuality(next: typeof settings.voiceQuality) {
    stopVoiceTest();
    settings.setVoiceQuality(next);
    if (next !== 'standard') void prepareNatural(settings.lang);
  }
  function selectNaturalModel(next: typeof settings.naturalModel) {
    stopVoiceTest();
    settings.setNaturalModel(next);
    if (piperVoices) void prepareNatural(settings.lang);
  }
  // A short sample in the chosen voice, so the voices can be compared without opening a story.
  const voiceSamples: Record<typeof settings.lang, string> = {
    de: 'Guten Morgen! Heute gehen wir zusammen auf den Markt und kaufen frisches Brot.',
    en: 'Good morning! Today we are going to the market together to buy fresh bread.',
    fr: "Bonjour ! Aujourd'hui, nous allons ensemble au marché pour acheter du pain frais.",
    it: 'Buongiorno! Oggi andiamo insieme al mercato a comprare il pane fresco.',
    es: '¡Buenos días! Hoy vamos juntos al mercado a comprar pan fresco.',
    pt: 'Bom dia! Hoje vamos juntos ao mercado comprar pão fresco.',
    uk: 'Доброго ранку! Сьогодні ми разом підемо на ринок по свіжий хліб.'
  };
  let voiceTesting = $state(false);
  let voiceTestFailed = $state(false);
  let voiceTestToken = 0;
  let stopVoiceSample: () => void = () => {};
  function stopVoiceTest() {
    voiceTestToken += 1;
    stopVoiceSample();
    stopVoiceSample = () => {};
    voiceTesting = false;
  }
  async function testVoice() {
    stopVoiceTest();
    const token = voiceTestToken;
    const language = settings.lang;
    const sample = voiceSamples[language];
    voiceTesting = true;
    voiceTestFailed = false;
    try {
      if (!settings.clipVoices) {
        const utterance = new SpeechSynthesisUtterance(sample);
        utterance.lang = language;
        stopVoiceSample = () => window.speechSynthesis.cancel();
        await new Promise<void>((resolve, reject) => {
          utterance.onend = () => resolve();
          utterance.onerror = (event) => (event.error === 'canceled' || event.error === 'interrupted' ? resolve() : reject(new Error(event.error)));
          window.speechSynthesis.speak(utterance);
        });
      } else {
        await prepareNatural(language);
        if (token !== voiceTestToken) return;
        if (!naturalReady(language)) throw new Error('voices not ready');
        const clip = await synthesizeNatural(sample, 'narrator', 'neutral', ['narrator'], language, 1);
        if (token !== voiceTestToken) return;
        const playing = playNatural(clip);
        stopVoiceSample = playing.stop;
        await Promise.race([playing.done, new Promise((resolve) => setTimeout(resolve, playing.seconds * 1000 + 250))]);
      }
    } catch {
      if (token === voiceTestToken) voiceTestFailed = true;
    } finally {
      if (token === voiceTestToken) voiceTesting = false;
    }
  }
  const telegramHref = $derived(
    settings.interfaceLocale === 'fa' ? 'https://t.me/yasamanabedin' : settings.interfaceLocale === 'de' || settings.interfaceLocale === 'en' ? 'https://t.me/deutschstunde1' : null
  );
  const languageOptions = playableLanguages.map((language) => ({ value: language.code as string, label: language.label }));
  const interfaceOptions = interfaceLocales.map((locale) => ({ value: locale.code as string, label: locale.label }));
  const wordleOptions = [3, 4, 5, 6, 7].map((length) => ({ value: String(length), label: String(length) }));

  function selectLanguage(value: string) {
    if (isLanguage(value)) settings.setLang(value);
  }
  function selectInterfaceLocale(value: string) {
    if (interfaceLocales.some((locale) => locale.code === value)) settings.setInterfaceLocale(value as typeof settings.interfaceLocale);
  }
  function selectVocabularyLevel(level: VocabularyLevel) {
    settings.setVocabularyLevel(level);
  }
  function selectWordleLength(next: string) {
    const value = Number(next);
    if (value >= 3 && value <= 7) settings.setWordleLength(value as WordleLength);
  }
  async function toggleNotifications(next: boolean) {
    notificationBusy = true;
    notificationMessage = '';
    try {
      if (next) {
        if (!pushSupported()) throw new Error('unsupported');
        await enablePush();
        notificationsEnabled = true;
        notificationMessage = labels.notificationsEnabled;
      } else {
        await disablePush();
        notificationsEnabled = false;
      }
    } catch (error) {
      notificationsEnabled = !next;
      notificationMessage = error instanceof Error && error.message === 'permission_denied' ? labels.notificationsDenied : labels.notificationsUnavailable;
    } finally {
      notificationBusy = false;
    }
  }

  // Telegram reminders and the invite link only show once the server answered (not under `vite dev`).
  let telegram = $state<TelegramStatus | null>(null);
  let telegramBusy = $state(false);
  // Between opening the bot and pressing Start there; coming back to the app checks again.
  let telegramWaiting = $state(false);
  let inviteCopied = $state(false);
  function refreshTelegram() {
    void telegramDevice('status').then((status) => {
      telegram = status;
      if (status.reminders) telegramWaiting = false;
    }).catch(() => undefined);
  }
  async function toggleTelegram(toggle: HTMLInputElement) {
    const next = toggle.checked;
    telegramBusy = true;
    try {
      const status = await telegramDevice(next ? 'connect' : 'disconnect');
      telegram = status;
      telegramWaiting = next && !status.reminders;
      if (telegramWaiting && status.connectUrl) openTelegramLink(status.connectUrl);
    } catch {
      toggle.checked = !next;
    } finally {
      telegramBusy = false;
    }
  }
  async function shareInvite() {
    const url = telegram?.inviteUrl;
    if (!url) return;
    if (navigator.share) {
      navigator.share({ text: labels.inviteShareText, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(`${labels.inviteShareText} ${url}`).catch(() => undefined);
    inviteCopied = true;
    setTimeout(() => (inviteCopied = false), 2000);
  }

  const explanations: Record<'wordleLength' | 'backwards', string> = {
    wordleLength:
      'Wordle length sets how many letters the target word has. Shorter words are quicker to solve, longer words give you more combinations to think through.',
    backwards:
      'When this is on, the game also accepts words spelled in reverse. For example, “STOP” counts the same as “POTS”.'
  };
  let explanationType = $state<'wordleLength' | 'backwards' | null>(null);
  const explanationTitle = $derived(explanationType === 'wordleLength' ? labels.wordleLength : labels.backwards);
  const explanationText = $derived(explanationType ? explanations[explanationType] : '');
  let closeButton = $state<HTMLButtonElement | null>(null);

  function openExplanation(type: 'wordleLength' | 'backwards') {
    explanationType = type;
  }

  function closeExplanation() {
    explanationType = null;
  }
  function shareApp() {
    const url = typeof location !== 'undefined' ? location.origin + '/' : 'https://words-sv.vercel.app/';
    const title = 'Words-SV - Learn German';
    const text = 'Practice German vocabulary, grammar and stories with interactive exercises.';
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({ title, text, url }).catch(() => {});
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  $effect(() => {
    if (!explanationType) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });

  onMount(() => {
    void pushEnabled().then((enabled) => (notificationsEnabled = enabled));
    voicesSupported = naturalSupported();
    refreshTelegram();
  });
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') closeExplanation(); }} onfocus={() => { if (telegramWaiting) refreshTelegram(); }} />

<aside class="flex-1 min-h-0 m-0 px-[clamp(1rem,5vw,2rem)] pb-[clamp(1rem,5vw,2rem)] pt-[clamp(2.9rem,10vw,3.6rem)] overflow-y-auto border-0 bg-transparent animate-[drop-in_.2s_cubic-bezier(.23,1,.32,1)]" aria-label={labels.settingsHint} dir={interfaceDirection} lang={settings.interfaceLocale}>
  <div class="flex items-center justify-center gap-3 text-base-content">
    <span class="relative w-[34px] h-[34px] block flex-none" aria-hidden="true">
      <i class="absolute block w-[21px] h-[21px] rounded-full border-2 border-neutral top-[1px] left-[1px]"></i>
      <b class="absolute block w-[21px] h-[21px] rounded-full border-2 border-primary right-[1px] bottom-[1px]"></b>
    </span>
    <strong class="block font-['DM_Serif_Display',serif] text-[clamp(1.45rem,6vw,2rem)] font-normal tracking-[-.04em] leading-[.9]">WordCircle</strong>
  </div>

  <!-- The learner themselves: their own story character and name, edited on the progress page -->
  <a class="settings-me mt-[1.35rem] px-[.8rem] py-[.6rem] panel-play flex items-center gap-3 text-base-content no-underline" href="/progress">
    <span class="settings-me-avatar" aria-hidden="true"><StoryCharacter id="kumar" avatar={settings.avatar ?? defaultAvatar} mood="happy" /></span>
    <span class="min-w-0 flex-1">
      <span class="block text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.profileTitle}</span>
      <strong class="block truncate font-['DM_Serif_Display',serif] text-[1.35rem] font-normal tracking-[-.02em] leading-[1.1]">{settings.firstName || labels.profileNameEmpty}</strong>
      <span class="block text-base-content/60 text-[.6rem] font-bold">{labels.profileEdit}</span>
    </span>
    <IconChevronRight aria-hidden="true" class="w-[1.2rem] h-[1.2rem] flex-none rtl:rotate-180" />
  </a>

  <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play" aria-labelledby="content-settings-heading">
    <h2 id="content-settings-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.contentGroup}</h2>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.gameLanguage}</span><SelectMenu class="w-[9.6rem] max-w-[48%]" value={settings.lang} options={languageOptions} label={labels.gameLanguage} onchange={selectLanguage} /></div>
    <div class="flex items-start justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.vocabulary}</span><div class="seg-play">{#each vocabularyLevels as level}<button class={`min-h-[1.65rem] min-w-[1.65rem] px-[.32rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.vocabularyLevel === level ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => selectVocabularyLevel(level)}>{level.toUpperCase()}</button>{/each}</div></div>
    {#if settings.vocabularyLevel !== 'a1'}<div class="flex items-center justify-between gap-4 mt-[.25rem] pt-[.35rem] border-t-0 text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.includeLower}</span><input aria-label={labels.includeLower} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.includeLowerVocabulary} onchange={(event) => settings.setIncludeLowerVocabulary((event.currentTarget as HTMLInputElement).checked)} /></div>{/if}
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.4rem]">{labels.wordleLength}<button type="button" class="btn-play btn-play-round btn-play-sm btn-play-soft flex-none" aria-label="Show explanation for wordle length" aria-haspopup="dialog" onclick={() => openExplanation('wordleLength')}><IconHelp aria-hidden="true" /></button></span><SelectMenu class="w-[9.6rem] max-w-[48%]" value={String(settings.wordleLength)} options={wordleOptions} label={labels.wordleLength} onchange={selectWordleLength} /></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.4rem]">{labels.backwards}<button type="button" class="btn-play btn-play-round btn-play-sm btn-play-soft flex-none" aria-label="Show explanation for reverse spelling" aria-haspopup="dialog" onclick={() => openExplanation('backwards')}><IconHelp aria-hidden="true" /></button></span><input aria-label={labels.backwards} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.allowBackwardWords} onchange={(event) => settings.setAllowBackwardWords((event.currentTarget as HTMLInputElement).checked)} /></div>
  </section>
  <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play" aria-labelledby="behavior-settings-heading">
    <h2 id="behavior-settings-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.behaviorGroup}</h2>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]"><IconLanguage aria-hidden="true" class="w-[.9rem] h-[.9rem]" />{labels.interfaceLanguage}</span><SelectMenu class="w-[9.6rem] max-w-[48%]" value={settings.interfaceLocale} options={interfaceOptions} label={labels.interfaceLanguage} onchange={selectInterfaceLocale} /></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.appearance}</span><div class="seg-play"><button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.theme === 'light' ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => settings.setTheme('light')}><IconLight class="w-[.78rem] h-[.78rem]" />{labels.light}</button><button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.theme === 'dark' ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => settings.setTheme('dark')}><IconDark class="w-[.78rem] h-[.78rem]" />{labels.dark}</button></div></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]"><IconVibrate class="w-[.9rem] h-[.9rem]" />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.vibration} onchange={(event) => settings.setVibration((event.currentTarget as HTMLInputElement).checked)} /></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]">{#if settings.sound}<IconVolume class="w-[.9rem] h-[.9rem]" />{:else}<IconVolumeOff class="w-[.9rem] h-[.9rem]" />{/if}{labels.sound}</span><input aria-label={labels.sound} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.sound} onchange={(event) => settings.setSound((event.currentTarget as HTMLInputElement).checked)} /></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.notifications}</span><input aria-label={labels.notifications} type="checkbox" class="toggle toggle-sm toggle-primary" checked={notificationsEnabled} disabled={notificationBusy} onchange={(event) => toggleNotifications((event.currentTarget as HTMLInputElement).checked)} /></div>
    <p class="m-0 mt-[.35rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{labels.notificationsHint}</p>
    {#if notificationMessage}<p class="m-0 mt-[.45rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{notificationMessage}</p>{/if}
    {#if telegram}
      <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]"><IconTelegram aria-hidden="true" class="w-[.9rem] h-[.9rem]" />{labels.telegramReminders}</span><input aria-label={labels.telegramReminders} type="checkbox" class="toggle toggle-sm toggle-primary" checked={telegram.reminders} disabled={telegramBusy} onchange={(event) => toggleTelegram(event.currentTarget as HTMLInputElement)} /></div>
      <p class="m-0 mt-[.35rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]" aria-live="polite">{telegramWaiting ? labels.telegramRemindersWaiting : labels.telegramRemindersHint}</p>
    {/if}
  </section>
  {#if telegram?.inviteUrl}
    <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play" aria-labelledby="invite-heading">
      <h2 id="invite-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.inviteTitle}</h2>
      <p class="m-0 mt-[.35rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{labels.inviteHint(telegram.inviteEmbers)}</p>
      <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>🔥 {labels.inviteCount(telegram.invited)}</span><button type="button" class="btn-play btn-play-sm flex-none gap-[.35rem] normal-case tracking-normal" onclick={shareInvite}><IconShare aria-hidden="true" class="w-[.85rem] h-[.85rem]" />{inviteCopied ? labels.inviteCopied : labels.inviteShare}</button></div>
    </section>
  {/if}
  <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play" aria-labelledby="voice-settings-heading">
    <h2 id="voice-settings-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.storiesGroup}</h2>
    <p class="m-0 mt-[.35rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{labels.storiesGroupHint}</p>
    {#if voicesSupported}
      <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.voiceQuality}</span><div class="seg-play">{#each [['standard', labels.voiceStandard], ['natural', labels.voiceNatural], ['recorded', labels.voiceRecorded], ['edge', labels.voiceEdge]] as const as [quality, label]}<button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.voiceQuality === quality ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} aria-pressed={settings.voiceQuality === quality} onclick={() => selectVoiceQuality(quality)}>{label}</button>{/each}</div></div>
      {#if piperVoices}
        <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.voiceModel}</span><div class="seg-play">{#each [['standard', labels.voiceModelStandard], ['high', labels.voiceModelHigh]] as const as [model, label]}<button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.naturalModel === model ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} aria-pressed={settings.naturalModel === model} onclick={() => selectNaturalModel(model)}>{label}</button>{/each}</div></div>
        <p class="m-0 mt-[.45rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{labels.voiceModelHint}</p>
      {/if}
      {#if piperVoices && voiceStatus === 'loading'}
        <div class="mt-[.55rem]" aria-live="polite">
          <div class="flex items-center gap-[.45rem] text-base-content/70 text-[.58rem] font-bold leading-[1.35]">
            <span class="voice-pulse" aria-hidden="true">{#each [0, 1, 2, 3] as bar}<i style={`--i: ${bar}`}></i>{/each}</span>
            <span>{voiceNote}</span>
          </div>
          <div class="voice-track mt-[.35rem]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={voicePercent} aria-label={voiceNote}>
            <span class="voice-fill" style={`width: ${Math.max(voicePercent, 4)}%`}></span>
          </div>
        </div>
      {:else}
        <p class="m-0 mt-[.45rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]" aria-live="polite">{voiceNote}</p>
      {/if}
      <div class="flex items-center justify-between gap-4 mt-[.55rem]"><button class="min-h-[1.65rem] px-[.7rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold tracking-[.06em] uppercase bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45] disabled:opacity-60" disabled={piperVoices && voiceStatus === 'loading'} onclick={() => (voiceTesting ? stopVoiceTest() : testVoice())}><IconVolume class="w-[.78rem] h-[.78rem]" />{voiceTesting ? labels.voiceTesting : labels.voiceTest}</button>{#if voiceTestFailed}<span class="text-base-content/60 text-[.58rem] font-bold leading-[1.35]" aria-live="polite">{labels.voiceTestFailed}</span>{/if}</div>
      <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.dialects}</span><input aria-label={labels.dialects} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.dialects} onchange={(event) => settings.setDialects((event.currentTarget as HTMLInputElement).checked)} /></div>
      <p class="m-0 mt-[.45rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{labels.dialectsHint}</p>
    {/if}
  </section>

  {#if telegramHref}<a class="btn-play w-full mt-4 gap-[.48rem] normal-case tracking-normal text-[#237a26] dark:text-[#a9e8ab] text-[.72rem] font-bold leading-[1.45] text-center no-underline hover:bg-[#2aab2e] hover:text-[#fffdf7] focus-visible:bg-[#2aab2e] focus-visible:text-[#fffdf7] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]" href={telegramHref} target="_blank" rel="noreferrer" lang={settings.interfaceLocale} dir={interfaceDirection}><IconTelegram aria-hidden="true" class="w-[1.12rem] h-[1.12rem] flex-none" /><span>{labels.telegramShare}</span></a>{/if}
  <button type="button" class="btn-play w-full mt-2 gap-[.48rem] normal-case tracking-normal text-[#172a45] dark:text-[#fffdf7] text-[.72rem] font-bold leading-[1.45] text-center" onclick={shareApp}><IconShare aria-hidden="true" class="w-[1.12rem] h-[1.12rem] flex-none" /><span>Share app</span></button>
  <a class="flex items-center justify-center gap-[.42rem] mt-4 text-accent text-[.66rem] font-extrabold tracking-[.05em] text-center no-underline uppercase focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer"><IconGithub aria-hidden="true" class="w-4 h-4" /><span>GitHub · PXNX/words-sv</span></a>
</aside>

{#if explanationType}
  <div
    class="fixed inset-0 z-[150] flex items-end justify-center bg-[rgba(23,42,69,.42)] dark:bg-[rgba(11,22,38,.6)]"
    role="presentation"
    dir={interfaceDirection}
    lang={settings.interfaceLocale}
    onclick={(event) => { if (event.target === event.currentTarget) closeExplanation(); }}
    onkeydown={(event) => { if (event.key === 'Escape') closeExplanation(); }}
  >
    <div
      class="sheet-in w-full max-w-[34rem] max-h-[min(80vh,34rem)] overflow-y-auto rounded-t-[1.6rem] border-2 border-b-0 border-[var(--play-line)] bg-[#fffdf7] px-[clamp(1rem,5vw,1.6rem)] pt-[.6rem] pb-[calc(1.1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(23,42,69,.22)] dark:bg-[#213a5d]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-explanation-title"
      tabindex="-1"
    >
      <div class="mx-auto mb-[.85rem] h-[.3rem] w-[2.7rem] rounded-full bg-base-content/25" aria-hidden="true"></div>
      <div class="flex items-start justify-between gap-3">
        <h2 id="settings-explanation-title" class="m-0 text-[.58rem] font-black tracking-[.12em] text-accent uppercase">{explanationTitle}</h2>
        <button
          bind:this={closeButton}
          type="button"
          class="-mt-[.35rem] -mr-[.35rem] grid h-[2rem] w-[2rem] flex-none place-items-center rounded-full border-0 bg-transparent text-base-content/60 hover:bg-base-content/10 hover:text-base-content focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Close"
          onclick={closeExplanation}
        >
          <IconClose aria-hidden="true" class="h-[1.15rem] w-[1.15rem]" />
        </button>
      </div>
      <p class="m-0 mt-[.55rem] text-[.88rem] font-semibold leading-[1.5] text-base-content">{explanationText}</p>
    </div>
  </div>
{/if}

<style>
  .settings-me { transition:transform .15s cubic-bezier(.34,1.56,.64,1); }
  .settings-me:hover { transform:translateY(-2px) rotate(-.4deg); }
  .settings-me:active { transform:scale(.98); }
  .settings-me-avatar { display:block;flex:none;width:3.6rem;height:4.5rem;margin-block:-.2rem -.6rem; }
  .settings-me-avatar :global(.story-character) { width:100%;height:100%; }
  @media (prefers-reduced-motion:reduce) { .settings-me { transition:none; } }
  @keyframes sheet-up {
    from {
      opacity: 0;
      transform: translateY(26px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .sheet-in {
    animation: sheet-up 0.28s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .voice-pulse {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: .75rem;
    flex: none;
    color: #e6a527;
  }
  .voice-pulse i {
    width: 2px;
    height: 100%;
    border-radius: 999px;
    background: currentColor;
    transform-origin: bottom;
    animation: voice-bounce 0.9s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.15s);
  }
  .voice-track {
    height: .45rem;
    overflow: hidden;
    border: 2px solid rgba(23, 42, 69, 0.35);
    border-radius: 999px;
    background: rgba(23, 42, 69, 0.08);
  }
  .voice-fill {
    position: relative;
    display: block;
    height: 100%;
    overflow: hidden;
    border-radius: 999px;
    background: linear-gradient(90deg, #e6a527, #34824d);
    transition: width 0.35s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .voice-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.55) 45%, transparent 70%);
    transform: translateX(-100%);
    animation: voice-shine 1.4s ease-in-out infinite;
  }
  :global(html.dark) .voice-pulse {
    color: #e6a527;
  }
  :global(html.dark) .voice-track {
    border-color: rgba(255, 253, 247, 0.3);
    background: rgba(255, 253, 247, 0.12);
  }
  @keyframes voice-bounce {
    0%, 100% { transform: scaleY(0.3); }
    50% { transform: scaleY(1); }
  }
  @keyframes voice-shine {
    to { transform: translateX(100%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .voice-pulse i,
    .voice-fill::after {
      animation: none;
    }
    .voice-fill {
      transition: none;
    }
  }
</style>
