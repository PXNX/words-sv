<script lang="ts">
  import ModelManager from './ModelManager.svelte';
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings, interfaceLocales } from '#lib/state/settings.svelte.js';
  import { playableLanguages, vocabularyLevels, isLanguage, type VocabularyLevel } from '#lib/data/vocabulary.js';
  import { disablePush, enablePush, pushEnabled, pushSupported } from './pushClient';
  import { openTelegramLink, telegramDevice, type TelegramStatus } from './telegramClient';
  import { noteLinked } from '#lib/sync/cloudSync.svelte.js';
  import TelegramAccount from './TelegramAccount.svelte';
  import WebGpuStatus from './WebGpuStatus.svelte';
  import SettingsSection from './ui/SettingsSection.svelte';
  import SettingRow from './ui/SettingRow.svelte';
  import Segmented from './ui/Segmented.svelte';
  import { webgpu } from '#lib/app/webgpuCheck.svelte.js';
  import IconSchool from '~icons/material-symbols/school-rounded';
  import IconTune from '~icons/material-symbols/tune-rounded';
  import IconVoices from '~icons/material-symbols/graphic-eq-rounded';
  import IconGroup from '~icons/material-symbols/group-rounded';
  import IconUpdate from '~icons/material-symbols/update-rounded';
  import { checkInviteRewards } from '#lib/profile/cosmetics.svelte.js';
  import { INVITE_REWARD_TARGET } from '#lib/profile/cosmetics.js';
  import { naturalReady, naturalState, naturalSupported, playNatural, prepareNatural, synthesizeNatural } from '#lib/story/naturalVoices.svelte.js';
  import { onMount } from 'svelte';
  import SelectMenu from './SelectMenu.svelte';
  import { unseenReleases } from '#lib/app/changelog.js';
  import { lastSeenVersion } from '#lib/app/changelogSeen.js';
  import { releases } from '#lib/app/releases.js';
  import { nativeDigitsFor, offersCalendarChoice, type FormatCalendar, type FormatDigits, type FormatSource } from '#lib/format/format.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { defaultAvatar } from '#lib/profile/avatar.js';
  import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
  import IconDark from '~icons/material-symbols/dark-mode-rounded';
  import IconGithub from '~icons/fa6-brands/github';
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
    includeLower: m.include_lower({}, { locale: settings.interfaceLocale }),
    interfaceLanguage: m.interface_language({}, { locale: settings.interfaceLocale }),
    appearance: m.appearance({}, { locale: settings.interfaceLocale }),
    light: m.light({}, { locale: settings.interfaceLocale }),
    dark: m.dark({}, { locale: settings.interfaceLocale }),
    vibration: m.vibration({}, { locale: settings.interfaceLocale }),
    sound: m.sound({}, { locale: settings.interfaceLocale }),
    voiceTest: m.voice_test({}, { locale: settings.interfaceLocale }),
    voiceTesting: m.voice_testing({}, { locale: settings.interfaceLocale }),
    voiceTestFailed: m.voice_test_failed({}, { locale: settings.interfaceLocale }),
    voiceModel: m.voice_model({}, { locale: settings.interfaceLocale }),
    voiceModelStandard: m.voice_model_standard({}, { locale: settings.interfaceLocale }),
    voiceModelHigh: m.voice_model_high({}, { locale: settings.interfaceLocale }),
    voiceModelHint: m.voice_model_hint({}, { locale: settings.interfaceLocale }),
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
    inviteShareText: m.invite_share_text({}, { locale: settings.interfaceLocale }),
    shareApp: m.share_app({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const voiceStatus = $derived(naturalState.status[settings.lang] ?? 'idle');
  // Whether the chosen voice runs on Piper, which has a model choice and a download to show.
  const piperVoices = $derived(settings.voiceQuality === 'natural' || settings.voiceQuality === 'recorded');
  let voicesSupported = $state(false);
  $effect(() => () => stopVoiceTest());
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
  const formatLabels = $derived({
    formatAs: m.format_as({}, { locale: settings.interfaceLocale }),
    hint: m.format_hint({}, { locale: settings.interfaceLocale }),
    calendar: m.format_calendar({}, { locale: settings.interfaceLocale }),
    digits: m.format_digits({}, { locale: settings.interfaceLocale })
  });
  const formatSourceOptions = $derived([
    { value: 'learning', label: m.format_learning({}, { locale: settings.interfaceLocale }) },
    { value: 'interface', label: m.format_interface({}, { locale: settings.interfaceLocale }) }
  ]);
  const calendarOptions = $derived([
    { value: 'gregory', label: m.format_calendar_gregory({}, { locale: settings.interfaceLocale }) },
    { value: 'persian', label: m.format_calendar_persian({}, { locale: settings.interfaceLocale }) }
  ]);
  const digitOptions = $derived([
    { value: 'latn', label: m.format_digits_latn({}, { locale: settings.interfaceLocale }) },
    { value: 'native', label: m.format_digits_native({}, { locale: settings.interfaceLocale }) }
  ]);
  const interfaceOptions = interfaceLocales.map((locale) => ({ value: locale.code as string, label: locale.label }));

  const levelOptions = vocabularyLevels.map((level) => ({ value: level, label: level.toUpperCase() }));
  const themeOptions = $derived([{ value: 'light' as const, label: labels.light }, { value: 'dark' as const, label: labels.dark }]);
  const voiceModelOptions = $derived([{ value: 'standard' as const, label: labels.voiceModelStandard }, { value: 'high' as const, label: labels.voiceModelHigh }]);
  const sectionTitles = $derived({
    learning: m.settings_section_learning({}, { locale: settings.interfaceLocale }),
    app: m.settings_section_app({}, { locale: settings.interfaceLocale }),
    formats: m.settings_section_formats({}, { locale: settings.interfaceLocale }),
    reminders: m.settings_section_reminders({}, { locale: settings.interfaceLocale }),
    voices: m.settings_section_voices({}, { locale: settings.interfaceLocale }),
    more: m.settings_section_friends({}, { locale: settings.interfaceLocale }),
    models: m.models_title({}, { locale: settings.interfaceLocale }),
    about: m.settings_section_about({}, { locale: settings.interfaceLocale })
  });
  // What a folded section shows, so most settings can be read without opening anything.
  const summaries = $derived.by(() => {
    const locale = { locale: settings.interfaceLocale };
    const on = m.settings_on({}, locale);
    const off = m.settings_off({}, locale);
    const optionLabel = (options: ReadonlyArray<{ value: string; label: string }>, value: string) => options.find((option) => option.value === value)?.label ?? value;
    return {
      learning: `${optionLabel(languageOptions, settings.lang)} · ${settings.vocabularyLevel.toUpperCase()}`,
      app: `${optionLabel(interfaceOptions, settings.interfaceLocale)} · ${settings.theme === 'dark' ? labels.dark : labels.light} · ${labels.notifications}: ${notificationsEnabled ? on : off}`,
      voices: webgpu.result ? (webgpu.result.status === 'ok' ? m.webgpu_short_ok({}, locale) : m.webgpu_short_failed({}, locale)) : m.webgpu_not_run({}, locale),
      more: `${telegram ? `${labels.inviteCount(telegram.invited)} · ` : ''}${m.changelog_version({ version: __APP_VERSION__ }, locale)}`
    };
  });

  function selectLanguage(value: string) {
    if (isLanguage(value)) settings.setLang(value);
  }
  function selectInterfaceLocale(value: string) {
    if (interfaceLocales.some((locale) => locale.code === value)) settings.setInterfaceLocale(value as typeof settings.interfaceLocale);
  }
  function selectVocabularyLevel(level: VocabularyLevel) {
    settings.setVocabularyLevel(level);
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
      checkInviteRewards(status.invited);
      noteLinked(status.linked);
      if (status.reminders) telegramWaiting = false;
    }).catch(() => undefined);
  }
  async function toggleTelegram(toggle: HTMLInputElement) {
    const next = toggle.checked;
    telegramBusy = true;
    try {
      const status = await telegramDevice(next ? 'connect' : 'disconnect');
      telegram = status;
      noteLinked(status.linked);
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

  function shareApp() {
    const url = typeof location !== 'undefined' ? location.origin + '/' : 'https://words-sv.vercel.app/';
    const title = m.home_title({}, { locale: settings.interfaceLocale });
    const text = m.share_app_text({}, { locale: settings.interfaceLocale });
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator.share({ title, text, url }).catch(() => {});
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  // A dot on the version row until the learner has opened /changelog for the newest release.
  let hasUnseenRelease = $state(false);
  onMount(() => {
    hasUnseenRelease = unseenReleases(releases, lastSeenVersion()).length > 0;
    void pushEnabled().then((enabled) => (notificationsEnabled = enabled));
    voicesSupported = naturalSupported();
    refreshTelegram();
  });
</script>

<svelte:window onfocus={() => { if (telegramWaiting) refreshTelegram(); }} />

<aside class="settings" aria-label={labels.settingsHint} dir={interfaceDirection} lang={settings.interfaceLocale}>
  <header class="settings-brand">
    <span class="settings-logo" aria-hidden="true"><i></i><b></b></span>
    <strong>WordCircle</strong>
  </header>

  <div class="settings-columns">
    <!-- The learner and their account first: who they are and whether their progress is saved -->
    <section class="settings-me-card panel-play" aria-label={labels.profileTitle}>
      <a class="settings-me" href="/progress">
        <span class="settings-me-avatar" aria-hidden="true"><StoryCharacter id="kumar" avatar={settings.avatar ?? defaultAvatar} mood="happy" /></span>
        <span class="settings-me-text">
          <span class="settings-kicker">{labels.profileTitle}</span>
          <strong>{settings.firstName || labels.profileNameEmpty}</strong>
          <small>{labels.profileEdit}</small>
        </span>
        <IconChevronRight aria-hidden="true" class="settings-me-arrow rtl:rotate-180" />
      </a>
      <div class="settings-me-account"><TelegramAccount /></div>
    </section>

    <SettingsSection id="learning" index={1} defaultOpen accent="#34824d" title={sectionTitles.learning} summary={summaries.learning}>
      {#snippet icon()}<IconSchool />{/snippet}
      <SettingRow label={labels.gameLanguage}><SelectMenu class="w-[9.6rem]" value={settings.lang} options={languageOptions} label={labels.gameLanguage} onchange={selectLanguage} /></SettingRow>
      <SettingRow label={labels.vocabulary} stacked>
        <Segmented value={settings.vocabularyLevel} options={levelOptions} label={labels.vocabulary} onchange={selectVocabularyLevel} />
        <a class="settings-link" href="/placement">{m.placement_link({}, { locale: settings.interfaceLocale })}<IconChevronRight aria-hidden="true" class="rtl:rotate-180" /></a>
      </SettingRow>
      {#if settings.vocabularyLevel !== 'a1'}
        <SettingRow label={labels.includeLower} labelFor="setting-include-lower"><input id="setting-include-lower" type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.includeLowerVocabulary} onchange={(event) => settings.setIncludeLowerVocabulary((event.currentTarget as HTMLInputElement).checked)} /></SettingRow>
      {/if}
    </SettingsSection>

    <SettingsSection id="app" index={2} accent="#4b78c2" title={sectionTitles.app} summary={summaries.app}>
      {#snippet icon()}<IconTune />{/snippet}
      <SettingRow label={labels.interfaceLanguage}>{#snippet icon()}<IconLanguage />{/snippet}<SelectMenu class="w-[9.6rem]" value={settings.interfaceLocale} options={interfaceOptions} label={labels.interfaceLanguage} onchange={selectInterfaceLocale} /></SettingRow>
      <SettingRow label={labels.appearance}>
        <Segmented value={settings.theme} options={themeOptions} label={labels.appearance} onchange={(value) => settings.setTheme(value)}>
          {#snippet optionIcon(value)}{#if value === 'light'}<IconLight />{:else}<IconDark />{/if}{/snippet}
        </Segmented>
      </SettingRow>
      <SettingRow label={labels.sound} labelFor="setting-sound">{#snippet icon()}{#if settings.sound}<IconVolume />{:else}<IconVolumeOff />{/if}{/snippet}<input id="setting-sound" type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.sound} onchange={(event) => settings.setSound((event.currentTarget as HTMLInputElement).checked)} /></SettingRow>
      <SettingRow label={labels.vibration} labelFor="setting-vibration">{#snippet icon()}<IconVibrate />{/snippet}<input id="setting-vibration" type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.vibration} onchange={(event) => settings.setVibration((event.currentTarget as HTMLInputElement).checked)} /></SettingRow>
      <h3 class="settings-sub">{sectionTitles.formats}</h3>
      <SettingRow label={formatLabels.formatAs} hint={formatLabels.hint}><SelectMenu class="w-[9.6rem]" value={settings.formatSource} options={formatSourceOptions} label={formatLabels.formatAs} onchange={(value) => settings.setFormatSource(value as FormatSource)} /></SettingRow>
      {#if settings.formatSource === 'interface' && offersCalendarChoice(settings.interfaceLocale)}
        <SettingRow label={formatLabels.calendar}><SelectMenu class="w-[9.6rem]" value={settings.interfaceCalendar} options={calendarOptions} label={formatLabels.calendar} onchange={(value) => settings.setInterfaceCalendar(value as FormatCalendar)} /></SettingRow>
      {/if}
      {#if settings.formatSource === 'interface' && nativeDigitsFor(settings.interfaceLocale)}
        <SettingRow label={formatLabels.digits}><SelectMenu class="w-[9.6rem]" value={settings.interfaceDigits} options={digitOptions} label={formatLabels.digits} onchange={(value) => settings.setInterfaceDigits(value as FormatDigits)} /></SettingRow>
      {/if}
      <h3 class="settings-sub">{sectionTitles.reminders}</h3>
      <SettingRow label={labels.notifications} hint={notificationMessage || labels.notificationsHint} labelFor="setting-notifications"><input id="setting-notifications" type="checkbox" class="toggle toggle-sm toggle-primary" checked={notificationsEnabled} disabled={notificationBusy} onchange={(event) => toggleNotifications((event.currentTarget as HTMLInputElement).checked)} /></SettingRow>
      {#if telegram}
        <SettingRow label={labels.telegramReminders} hint={telegramWaiting ? labels.telegramRemindersWaiting : labels.telegramRemindersHint} labelFor="setting-telegram">{#snippet icon()}<IconTelegram />{/snippet}<input id="setting-telegram" type="checkbox" class="toggle toggle-sm toggle-primary" checked={telegram.reminders} disabled={telegramBusy} onchange={(event) => toggleTelegram(event.currentTarget as HTMLInputElement)} /></SettingRow>
      {/if}
    </SettingsSection>

    <SettingsSection id="voices" index={3} accent="#e6a527" title={sectionTitles.voices} summary={summaries.voices}>
      {#snippet icon()}<IconVoices />{/snippet}
      <WebGpuStatus />
      <h3 class="settings-sub">{sectionTitles.models}</h3>
      <ModelManager bare onvoicechange={stopVoiceTest}>
        {#snippet voiceOptions()}
          {#if voicesSupported}
            {#if piperVoices}
              <SettingRow label={labels.voiceModel} hint={labels.voiceModelHint}><Segmented value={settings.naturalModel} options={voiceModelOptions} label={labels.voiceModel} onchange={selectNaturalModel} /></SettingRow>
            {/if}
            <div class="settings-voice-test">
              <button type="button" class="btn-play btn-play-sm" disabled={piperVoices && voiceStatus === 'loading'} onclick={() => (voiceTesting ? stopVoiceTest() : testVoice())}><IconVolume aria-hidden="true" />{voiceTesting ? labels.voiceTesting : labels.voiceTest}</button>
              {#if voiceTestFailed}<small aria-live="polite">{labels.voiceTestFailed}</small>{/if}
            </div>
          {/if}
        {/snippet}
      </ModelManager>
    </SettingsSection>

    <SettingsSection id="more" index={4} accent="#e86a9a" title={sectionTitles.more} summary={summaries.more}>
      {#snippet icon()}<IconGroup />{/snippet}
      {#if telegram?.inviteUrl}
        <SettingRow label={labels.inviteTitle} hint={labels.inviteHint(telegram.inviteEmbers)} stacked>
          <div class="settings-invite">
            <span>🔥 {labels.inviteCount(telegram.invited)}</span>
            <button type="button" class="btn-play btn-play-sm" onclick={shareInvite}><IconShare aria-hidden="true" />{inviteCopied ? labels.inviteCopied : labels.inviteShare}</button>
          </div>
          {#if telegram.invited < INVITE_REWARD_TARGET}
            <div class="settings-invite-goal" style:--share={telegram.invited / INVITE_REWARD_TARGET}><span aria-hidden="true"></span><small>{m.invite_goal({ count: num(telegram.invited), target: num(INVITE_REWARD_TARGET) }, { locale: settings.interfaceLocale })}</small></div>
          {/if}
        </SettingRow>
      {/if}
      <button type="button" class="settings-nav" onclick={shareApp}><IconShare aria-hidden="true" /><span>{labels.shareApp}</span><IconChevronRight aria-hidden="true" class="rtl:rotate-180" /></button>
      {#if telegramHref}<a class="settings-nav" href={telegramHref} target="_blank" rel="noreferrer"><IconTelegram aria-hidden="true" /><span>{labels.telegramShare}</span><IconChevronRight aria-hidden="true" class="rtl:rotate-180" /></a>{/if}
      <h3 class="settings-sub">{sectionTitles.about}</h3>
      <a class="settings-nav" href="/changelog">
        <IconUpdate aria-hidden="true" />
        <span>{m.changelog_settings({}, { locale: settings.interfaceLocale })}{#if hasUnseenRelease}<i class="settings-dot" aria-label={m.changelog_unseen({}, { locale: settings.interfaceLocale })}></i>{/if}<small dir="ltr">{m.changelog_version({ version: __APP_VERSION__ }, { locale: settings.interfaceLocale })}</small></span>
        <IconChevronRight aria-hidden="true" class="rtl:rotate-180" />
      </a>
      <a class="settings-nav" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer"><IconGithub aria-hidden="true" /><span>GitHub · PXNX/words-sv</span><IconChevronRight aria-hidden="true" class="rtl:rotate-180" /></a>
    </SettingsSection>
  </div>
</aside>

<style>
  .settings { flex:1;min-height:0;overflow-y:auto;margin:0;padding:clamp(2.9rem,10vw,3.6rem) clamp(1rem,5vw,2rem) clamp(1.2rem,5vw,2rem);color:var(--color-base-content,#172a45);font-family:'DM Sans',sans-serif; }
  .settings-brand { display:flex;align-items:center;justify-content:center;gap:.75rem;animation:settings-brand-in .5s cubic-bezier(.34,1.56,.64,1) both; }
  .settings-brand strong { font-family:'DM Serif Display',serif;font-size:clamp(1.45rem,6vw,2rem);font-weight:400;letter-spacing:-.04em;line-height:.9; }
  .settings-logo { position:relative;display:block;flex:none;width:34px;height:34px; }
  .settings-logo i,.settings-logo b { position:absolute;display:block;width:21px;height:21px;border:2px solid;border-radius:50%; }
  .settings-logo i { top:1px;left:1px;border-color:var(--color-neutral,#172a45);animation:settings-orbit 6s ease-in-out infinite; }
  .settings-logo b { right:1px;bottom:1px;border-color:var(--color-primary,#e6a527);animation:settings-orbit 6s ease-in-out infinite reverse; }
  .settings-columns { display:grid;gap:.85rem;margin-top:1.2rem; }
  @media (min-width:900px) {
    .settings-columns { display:block;columns:20rem 3;column-gap:clamp(1.5rem,3vw,2.5rem); }
    .settings-columns > :global(*) { break-inside:avoid;margin-bottom:.85rem; }
  }
  .settings-me-card { display:grid;gap:.7rem;padding:.7rem .85rem .85rem;animation:settings-me-in .45s cubic-bezier(.2,.9,.3,1.15) both; }
  .settings-me { display:flex;align-items:center;gap:.8rem;color:inherit;text-decoration:none;transition:transform .2s cubic-bezier(.34,1.56,.64,1); }
  .settings-me:hover { transform:translateY(-2px) rotate(-.4deg); }
  .settings-me:active { transform:scale(.98); }
  .settings-me-avatar { display:block;flex:none;width:3.6rem;height:4.5rem;margin-block:-.2rem -.6rem; }
  .settings-me:hover .settings-me-avatar { animation:settings-wave .6s ease-in-out; }
  .settings-me-text { display:grid;flex:1;min-width:0; }
  .settings-me-text strong { overflow:hidden;font-family:'DM Serif Display',serif;font-size:1.35rem;font-weight:400;letter-spacing:-.02em;line-height:1.1;white-space:nowrap;text-overflow:ellipsis; }
  .settings-me-text small { font-size:.6rem;font-weight:700;opacity:.6; }
  .settings-kicker { color:#a45e38;font-size:.56rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  :global(html.dark) .settings-kicker { color:#e6a527; }
  :global(.settings-me-arrow) { flex:none;width:1.2rem;height:1.2rem; }
  .settings-me-account { padding-top:.7rem;border-top:1.5px dashed color-mix(in srgb,currentColor 18%,transparent); }
  .settings-sub { margin:.9rem 0 .1rem;padding-top:.7rem;border-top:1.5px dashed color-mix(in srgb,currentColor 18%,transparent);color:#a45e38;font-size:.56rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  :global(html.dark) .settings-sub { color:#e6a527; }
  .settings-link { display:inline-flex;align-items:center;justify-content:flex-end;gap:.2rem;align-self:flex-end;color:#a45e38;font-size:.62rem;font-weight:900;text-decoration:none; }
  :global(html.dark) .settings-link { color:#e6a527; }
  .settings-link :global(svg) { width:.9rem;height:.9rem; }
  .settings-nav { display:flex;align-items:center;gap:.6rem;width:100%;padding:.65rem 0;border:0;border-top:1px solid color-mix(in srgb,currentColor 12%,transparent);background:none;color:inherit;font:inherit;font-size:.72rem;font-weight:800;text-align:start;text-decoration:none;cursor:pointer;transition:padding .2s; }
  .settings-nav:first-child { border-top:0; }
  .settings-nav:hover { padding-inline-start:.25rem; }
  .settings-nav > :global(svg) { flex:none;width:1rem;height:1rem;opacity:.75; }
  .settings-nav > span { display:grid;flex:1;gap:.1rem; }
  .settings-nav small { font-size:.58rem;font-weight:700;opacity:.6; }
  .settings-dot { display:inline-block;width:.45rem;height:.45rem;margin-inline-start:.35rem;border-radius:50%;background:var(--color-primary,#e6a527);vertical-align:middle;animation:settings-pulse 1.6s ease-in-out infinite; }
  .settings-invite { display:flex;align-items:center;justify-content:space-between;gap:.6rem;font-size:.7rem;font-weight:900; }
  .settings-invite :global(svg) { width:.85rem;height:.85rem; }
  .settings-invite-goal { display:grid;gap:.3rem; }
  .settings-invite-goal span { height:.35rem;border-radius:999px;background:linear-gradient(90deg,#2aabee calc(var(--share) * 100%),color-mix(in srgb,currentColor 12%,transparent) 0); }
  .settings-invite-goal small { font-size:.6rem;font-weight:800;color:#2a6fa8; }
  :global(html.dark) .settings-invite-goal small { color:#9cc8ec; }
  .settings-voice-test { display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin-top:.55rem; }
  .settings-voice-test :global(svg) { width:.85rem;height:.85rem; }
  .settings-voice-test small { font-size:.6rem;font-weight:700;opacity:.65; }
  @keyframes settings-brand-in { from { opacity:0;scale:.8; } }
  @keyframes settings-me-in { from { opacity:0;translate:0 14px; } }
  @keyframes settings-orbit { 0%,100% { translate:0 0; } 50% { translate:2px -2px; } }
  @keyframes settings-wave { 0%,100% { rotate:0deg; } 30% { rotate:-6deg; } 60% { rotate:5deg; } }
  @keyframes settings-pulse { 50% { scale:1.35;opacity:.6; } }
  @media (prefers-reduced-motion:reduce) {
    .settings-brand,.settings-me-card,.settings-logo i,.settings-logo b,.settings-dot,.settings-me:hover .settings-me-avatar { animation:none; }
    .settings-me,.settings-nav { transition:none; }
  }
</style>
