<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { getTextDirection } from '$lib/paraglide/runtime';
  import { settings, interfaceLocales, type WordleLength } from '$lib/state/settings.svelte';
  import { playableLanguages, vocabularyLevels, isLanguage, type VocabularyLevel } from '$lib/data/vocabulary';
  import { disablePush, enablePush, pushEnabled, pushSupported } from './pushClient';
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
    notifications: m.notifications({}, { locale: settings.interfaceLocale }),
    notificationsEnabled: m.notifications_enabled({}, { locale: settings.interfaceLocale }),
    notificationsDenied: m.notifications_denied({}, { locale: settings.interfaceLocale }),
    notificationsUnavailable: m.notifications_unavailable({}, { locale: settings.interfaceLocale }),
    telegramShare: m.telegram_share({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
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

  onMount(() => {
    void pushEnabled().then((enabled) => (notificationsEnabled = enabled));
  });
</script>

<aside class="flex-1 min-h-0 m-0 p-[clamp(1rem,5vw,2rem)] overflow-y-auto border-0 bg-[rgba(255,253,247,.98)] dark:bg-[rgba(23,42,69,.99)] shadow-[0_18px_55px_rgba(23,42,69,.2)] animate-[drop-in_.2s_cubic-bezier(.23,1,.32,1)]" aria-label={labels.settingsHint} dir={interfaceDirection} lang={settings.interfaceLocale}>
  <div class="flex items-center gap-3 text-base-content">
    <span class="relative w-[34px] h-[34px] block flex-none" aria-hidden="true">
      <i class="absolute block w-[21px] h-[21px] rounded-full border-2 border-neutral top-[1px] left-[1px]"></i>
      <b class="absolute block w-[21px] h-[21px] rounded-full border-2 border-primary right-[1px] bottom-[1px]"></b>
    </span>
    <strong class="block font-['DM_Serif_Display',serif] text-[clamp(1.45rem,6vw,2rem)] font-normal tracking-[-.04em] leading-[.9]">WordCircle</strong>
  </div>

  <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] border border-[rgba(23,42,69,.17)] bg-[rgba(255,253,247,.55)]" aria-labelledby="content-settings-heading">
    <h2 id="content-settings-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.contentGroup}</h2>
    <label class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.gameLanguage}</span><select class="max-w-[9.6rem] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[#172a45] text-[.64rem] font-extrabold outline-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2" aria-label={labels.gameLanguage} value={settings.lang} onchange={selectLanguageFromEvent}>{#each playableLanguages as language}<option value={language.code}>{language.label}</option>{/each}</select></label>
    <div class="flex items-start justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.vocabulary}</span><div class="flex p-[2px] rounded-full border border-base-content/[.22] dark:border-base-content/[.25]">{#each vocabularyLevels as level}<button class={`min-h-[1.65rem] min-w-[1.65rem] px-[.32rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.vocabularyLevel === level ? 'bg-[#172a45] text-[#fffdf7]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => selectVocabularyLevel(level)}>{level.toUpperCase()}</button>{/each}</div></div>
    {#if settings.vocabularyLevel !== 'a1'}<div class="flex items-center justify-between gap-4 mt-[.25rem] pt-[.35rem] border-t-0 text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.includeLower}</span><input aria-label={labels.includeLower} type="checkbox" class="toggle toggle-sm" checked={settings.includeLowerVocabulary} onchange={(event) => settings.setIncludeLowerVocabulary((event.currentTarget as HTMLInputElement).checked)} /></div>{/if}
    <label class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.wordleLength}</span><select class="max-w-[9.6rem] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[#172a45] text-[.64rem] font-extrabold outline-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2" aria-label={labels.wordleLength} value={settings.wordleLength} onchange={selectWordleLength}>{#each [3, 4, 5, 6, 7] as length}<option value={length}>{length}</option>{/each}</select></label>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.backwards}</span><input aria-label={labels.backwards} type="checkbox" class="toggle toggle-sm" checked={settings.allowBackwardWords} onchange={(event) => settings.setAllowBackwardWords((event.currentTarget as HTMLInputElement).checked)} /></div>
  </section>

  <section class="mt-[1.35rem] px-[.8rem] pt-[.7rem] pb-[.85rem] border border-[rgba(23,42,69,.17)] bg-[rgba(255,253,247,.55)]" aria-labelledby="behavior-settings-heading">
    <h2 id="behavior-settings-heading" class="m-0 mb-[.1rem] text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{labels.behaviorGroup}</h2>
    <label class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]"><IconLanguage aria-hidden="true" class="w-[.9rem] h-[.9rem]" />{labels.interfaceLanguage}</span><select class="max-w-[9.6rem] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[#172a45] text-[.64rem] font-extrabold outline-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2" aria-label={labels.interfaceLanguage} value={settings.interfaceLocale} onchange={selectInterfaceLocaleFromEvent}>{#each interfaceLocales as locale}<option value={locale.code}>{locale.label}</option>{/each}</select></label>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.appearance}</span><div class="flex p-[2px] rounded-full border border-base-content/[.22] dark:border-base-content/[.25]"><button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.theme === 'light' ? 'bg-[#172a45] text-[#fffdf7]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => settings.setTheme('light')}><IconLight class="w-[.78rem] h-[.78rem]" />{labels.light}</button><button class={`min-h-[1.65rem] px-[.55rem] inline-flex items-center gap-[.25rem] border-0 rounded-full text-[.62rem] font-extrabold ${settings.theme === 'dark' ? 'bg-[#172a45] text-[#fffdf7]' : 'bg-transparent text-base-content/[.62] dark:text-base-content/[.64]'}`} onclick={() => settings.setTheme('dark')}><IconDark class="w-[.78rem] h-[.78rem]" />{labels.dark}</button></div></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]"><IconVibrate class="w-[.9rem] h-[.9rem]" />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm" checked={settings.vibration} onchange={(event) => settings.setVibration((event.currentTarget as HTMLInputElement).checked)} /></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span class="inline-flex items-center gap-[.35rem]">{#if settings.sound}<IconVolume class="w-[.9rem] h-[.9rem]" />{:else}<IconVolumeOff class="w-[.9rem] h-[.9rem]" />{/if}{labels.sound}</span><input aria-label={labels.sound} type="checkbox" class="toggle toggle-sm" checked={settings.sound} onchange={(event) => settings.setSound((event.currentTarget as HTMLInputElement).checked)} /></div>
    <div class="flex items-center justify-between gap-4 pt-[.72rem] mt-[.72rem] border-t border-base-content/[.14] dark:border-base-content/[.22] text-base-content text-[.67rem] font-extrabold tracking-[.06em] uppercase"><span>{labels.notifications}</span><input aria-label={labels.notifications} type="checkbox" class="toggle toggle-sm" checked={notificationsEnabled} disabled={notificationBusy} onchange={(event) => toggleNotifications((event.currentTarget as HTMLInputElement).checked)} /></div>
    {#if notificationMessage}<p class="m-0 mt-[.45rem] text-base-content/60 text-[.58rem] font-bold leading-[1.35]">{notificationMessage}</p>{/if}
  </section>

  {#if telegramHref}<a class="flex items-center justify-center gap-[.48rem] mt-4 py-[.54rem] px-[.7rem] border border-[#2aab2e] dark:border-[#56c85a] bg-[rgba(42,171,46,.08)] dark:bg-[rgba(86,200,90,.13)] text-[#237a26] dark:text-[#a9e8ab] text-[.72rem] font-bold leading-[1.45] text-right no-underline hover:bg-[#2aab2e] hover:text-[#fffdf7] focus-visible:bg-[#2aab2e] focus-visible:text-[#fffdf7] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]" href={telegramHref} target="_blank" rel="noreferrer" lang={settings.interfaceLocale} dir={interfaceDirection}><IconTelegram aria-hidden="true" class="w-[1.12rem] h-[1.12rem] flex-none" /><span>{labels.telegramShare}</span></a>{/if}
  <a class="flex items-center justify-center gap-[.42rem] mt-4 text-accent text-[.66rem] font-extrabold tracking-[.05em] text-center no-underline uppercase focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer"><IconGithub aria-hidden="true" class="w-4 h-4" /><span>GitHub · PXNX/words-sv</span></a>
</aside>
