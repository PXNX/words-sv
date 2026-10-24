<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings, interfaceLocales, FIRST_NAME_MAX_LENGTH, type WordleLength } from '#lib/state/settings.svelte.js';
  import { playableLanguages, vocabularyLevels, isLanguage, type VocabularyLevel } from '#lib/data/vocabulary.js';
  import { disablePush, enablePush, pushEnabled, pushSupported } from './pushClient';
  import { naturalMegabytes, naturalState, naturalSupported, prepareNatural } from '#lib/story/naturalVoices.svelte.js';
  import { onMount } from 'svelte';
  import IconDark from '~icons/material-symbols/dark-mode-rounded';
  import IconGithub from '~icons/fa6-brands/github';
  import IconLanguage from '~icons/material-symbols/language-rounded';
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
    sound: m.sound({}, { locale: settings.interfaceLocale }),
    voiceQuality: m.voice_quality({}, { locale: settings.interfaceLocale }),
    voiceStandard: m.voice_quality_standard({}, { locale: settings.interfaceLocale }),
    voiceNatural: m.voice_quality_natural({}, { locale: settings.interfaceLocale }),
    voiceFailed: m.voice_quality_failed({}, { locale: settings.interfaceLocale }),
    notifications: m.notifications({}, { locale: settings.interfaceLocale }),
    notificationsEnabled: m.notifications_enabled({}, { locale: settings.interfaceLocale }),
    notificationsDenied: m.notifications_denied({}, { locale: settings.interfaceLocale }),
    notificationsUnavailable: m.notifications_unavailable({}, { locale: settings.interfaceLocale }),
    telegramShare: m.telegram_share({}, { locale: settings.interfaceLocale }),
    firstName: m.onboarding_name_label({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const voiceStatus = $derived(naturalState.status[settings.lang] ?? 'idle');
  // Under the voice choice: how big the natural voices are, how far they have downloaded, or that they failed.
  const voiceNote = $derived(
    settings.voiceQuality !== 'natural' ? ''
      : voiceStatus === 'loading' ? m.voice_quality_loading({ percent: String(Math.round(naturalState.progress * 100)) }, { locale: settings.interfaceLocale })
      : voiceStatus === 'failed' ? labels.voiceFailed
      : m.voice_quality_hint({ size: String(naturalMegabytes(settings.lang)) }, { locale: settings.interfaceLocale })
  );
  let voicesSupported = $state(false);
  function selectVoiceQuality(next: typeof settings.voiceQuality) {
    settings.setVoiceQuality(next);
    if (next === 'natural') void prepareNatural(settings.lang);
  }
  const telegramHref = $derived(
    settings.interfaceLocale === 'fa' ? 'https://t.me/yasamanabedin' : settings.interfaceLocale === 'de' || settings.interfaceLocale === 'en' ? 'https://t.me/deutschstunde1' : null
  );

  function selectLanguageFromEvent(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (isLanguage(value)) settings.setLang(value);
  }
  function selectInterfaceLocaleFromEvent(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (interfaceLocales.some((locale) => locale.code === value)) settings.setInterfaceLocale(value as typeof settings.interfaceLocale);
  }
  function selectVocabularyLevel(level: VocabularyLevel) {
    settings.setVocabularyLevel(level);
  }
  function saveFirstName(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    settings.setFirstName(input.value);
    input.value = settings.firstName;
  }
  function selectWordleLength(event: Event) {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
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

  let showExplanation = $state(false);
  let explanationType = $state<string | null>(null);

  function showExplanationFor(type: 'wordleLength' | 'backwards') {
    explanationType = type;
    showExplanation = true;
  }

  function hideExplanation() {
    showExplanation = false;
    explanationType = null;
  }
</script>

<aside class="flex-1 min-h-0 m-0 px-[clamp(1rem,5vw,2rem)] pb-[clamp(1rem,5vw,2rem)] pt-[clamp(2.9rem,10vw,3.6rem)] overflow-y-auto border-0 bg-transparent animate-[drop-in_.2s_cubic-bezier(.23,1,.32,1)]" aria-label={labels.settingsHint} dir={interfaceDirection} lang={settings.interfaceLocale}>
  <div class="flex items-center justify-center gap-3 text-base-content">
    <span class="relative w-[34px] h-[34px] block flex-none" aria-hidden="true">
      <i class="absolute block w-[21px] h-[21px] rounded-full border-2 border-neutral top-[1px] left-[1px]"></i>
      <b class="absolute block w-[21px] h-[21px] rounded-full border-2 border-primary right-[1px] bottom-[1px]"></b>
    </span>
    <strong class="block font-['DM_Serif_Display',serif] text-[clamp(1.45rem,6vw,2rem)] font-normal tracking-[-.04em] leading-[.9]">WordCircle</strong>
  </div>

  <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play" aria-labelledby="content-settings-heading">
    <h2 id="content-settings-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.contentGroup}</h2>
    <label class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.firstName}</span><input class="max-w-[9.6rem] min-h-[2rem] px-[.5rem] field-play text-[#172a45] text-[.7rem] font-extrabold normal-case tracking-normal outline-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2" type="text" autocomplete="given-name" autocapitalize="words" maxlength={FIRST_NAME_MAX_LENGTH} aria-label={labels.firstName} value={settings.firstName} onchange={saveFirstName} /></label>
    <label class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.gameLanguage}</span><select class="max-w-[9.6rem] min-h-[2rem] px-[.4rem] field-play text-[#172a45] text-[.68rem] font-extrabold outline-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2" aria-label={labels.gameLanguage} value={settings.lang} onchange={selectLanguageFromEvent}>{#each playableLanguages as language}<option value={language.code}>{language.label}</option>{/each}</select></label>
    <div class="flex items-start justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.vocabulary}</span><div class="seg-play">{#each vocabularyLevels as level}<button class={`min-h-[1.65rem] min-w-[1.65rem] px-[.32rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.vocabularyLevel === level ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => selectVocabularyLevel(level)}>{level.toUpperCase()}</button>{/each}</div></div>
    {#if settings.vocabularyLevel !== 'a1'}<div class="flex items-center justify-between gap-4 mt-[.25rem] pt-[.35rem] border-t-0 text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.includeLower}</span><input aria-label={labels.includeLower} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.includeLowerVocabulary} onchange={(event) => settings.setIncludeLowerVocabulary((event.currentTarget as HTMLInputElement).checked)} /></div>{/if}
    <label class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.wordleLength}</span><button class="text-base-content/60 hover:text-primary p-1 rounded-full" onclick={() => showExplanationFor('wordleLength')} aria-label="Show explanation for wordle length">?</button><select class="max-w-[9.6rem] min-h-[2rem] px-[.4rem] field-play text-[#172a45] text-[.68rem] font-extrabold outline-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2" aria-label={labels.wordleLength} value={settings.wordleLength} onchange={selectWordleLength}>{#each [3, 4, 5, 6, 7] as length}<option value={length}>{length}</option>{/each}</select></label>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.backwards}</span><button class="text-base-content/60 hover:text-primary p-1 rounded-full" onclick={() => showExplanationFor('backwards')} aria-label="Show explanation for reverse spelling">?</button><input aria-label={labels.backwards} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.allowBackwardWords} onchange={(event) => settings.setAllowBackwardWords((event.currentTarget as HTMLInputElement).checked)} /></div>
  </section>
  {#if showExplanation}<div class="mt-4 p-4 border border-primary/50 rounded-lg bg-base-content/50 text-base-content text-sm leading-relaxed dark:border-primary/70">{explanationType === 'wordleLength' ? 'Wordle length determines the number of letters in the target word. It can be set from 3 to 7. Shorter lengths offer faster play, while longer lengths increase the complexity.' : 'When enabled, the game accepts words spelled in reverse. For example, "STOP" is treated the same as "POTS". This setting is useful for testing word patterns from both directions.'} <button class="text-primary text-sm hover:text-primary/80 mt-2" onclick={hideExplanation}>Close</button></div>{/if}
  <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] panel-play" aria-labelledby="behavior-settings-heading">
    <h2 id="behavior-settings-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.behaviorGroup}</h2>
    <label class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]"><IconLanguage aria-hidden="true" class="w-[.9rem] h-[.9rem]" />{labels.interfaceLanguage}</span><select class="max-w-[9.6rem] min-h-[2rem] px-[.4rem] field-play text-[#172a45] text-[.68rem] font-extrabold outline-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2" aria-label={labels.interfaceLanguage} value={settings.interfaceLocale} onchange={selectInterfaceLocaleFromEvent}>{#each interfaceLocales as locale}<option value={locale.code}>{locale.label}</option>{/each}</select></label>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.appearance}</span><div class="seg-play"><button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.theme === 'light' ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => settings.setTheme('light')}><IconLight class="w-[.78rem] h-[.78rem]" />{labels.light}</button><button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.theme === 'dark' ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => settings.setTheme('dark')}><IconDark class="w-[.78rem] h-[.78rem]" />{labels.dark}</button></div></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]"><IconVibrate class="w-[.9rem] h-[.9rem]" />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.vibration} onchange={(event) => settings.setVibration((event.currentTarget as HTMLInputElement).checked)} /></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]">{#if settings.sound}<IconVolume class="w-[.9rem] h-[.9rem]" />{:else}<IconVolumeOff class="w-[.9rem] h-[.9rem]" />{/if}{labels.sound}</span><input aria-label={labels.sound} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.sound} onchange={(event) => settings.setSound((event.currentTarget as HTMLInputElement).checked)} /></div>
    {#if voicesSupported}
      <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.voiceQuality}</span><div class="seg-play">{#each [['standard', labels.voiceStandard], ['natural', labels.voiceNatural]] as const as [quality, label]}<button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.voiceQuality === quality ? 'bg-[#172a45] text-[#fffdf7] dark:bg-[#e6a527] dark:text-[#172a45]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} aria-pressed={settings.voiceQuality === quality} onclick={() => selectVoiceQuality(quality)}>{label}</button>{/each}</div></div>
      {#if voiceNote}<p class="m-0 mt-[.45rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]" aria-live="polite">{voiceNote}</p>{/if}
    {/if}
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.notifications}</span><input aria-label={labels.notifications} type="checkbox" class="toggle toggle-sm toggle-primary" checked={notificationsEnabled} disabled={notificationBusy} onchange={(event) => toggleNotifications((event.currentTarget as HTMLInputElement).checked)} /></div>
    {#if notificationMessage}<p class="m-0 mt-[.45rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{notificationMessage}</p>{/if}
  </section>

  {#if telegramHref}<a class="btn-play w-full mt-4 gap-[.48rem] normal-case tracking-normal text-[#237a26] dark:text-[#a9e8ab] text-[.72rem] font-bold leading-[1.45] text-center no-underline hover:bg-[#2aab2e] hover:text-[#fffdf7] focus-visible:bg-[#2aab2e] focus-visible:text-[#fffdf7] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]" href={telegramHref} target="_blank" rel="noreferrer" lang={settings.interfaceLocale} dir={interfaceDirection}><IconTelegram aria-hidden="true" class="w-[1.12rem] h-[1.12rem] flex-none" /><span>{labels.telegramShare}</span></a>{/if}
  <a class="flex items-center justify-center gap-[.42rem] mt-4 text-accent text-[.66rem] font-extrabold tracking-[.05em] text-center no-underline uppercase focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer"><IconGithub aria-hidden="true" class="w-4 h-4" /><span>GitHub · PXNX/words-sv</span></a>
</aside>
