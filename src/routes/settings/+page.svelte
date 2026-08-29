<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { getTextDirection } from '$lib/paraglide/runtime';
  import { settings, interfaceLocales } from '$lib/state/settings.svelte';
  import { playableLanguages, vocabularyLevels, isLanguage, type VocabularyLevel } from '$lib/data/vocabulary';
  import { disablePush, enablePush, pushEnabled, pushSupported } from '$lib/pushClient';
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
    includeLower: m.include_lower({}, { locale: settings.interfaceLocale }),
    backwards: m.backwards({}, { locale: settings.interfaceLocale }),
    interfaceLanguage: m.interface_language({}, { locale: settings.interfaceLocale }),
    appearance: m.appearance({}, { locale: settings.interfaceLocale }),
    light: m.light({}, { locale: settings.interfaceLocale }),
    dark: m.dark({}, { locale: settings.interfaceLocale }),
    vibration: m.vibration({}, { locale: settings.interfaceLocale }),
    sound: m.sound({}, { locale: settings.interfaceLocale }),
    notifications: m.notifications({}, { locale: settings.interfaceLocale }),
    notificationsEnable: m.notifications_enable({}, { locale: settings.interfaceLocale }),
    notificationsDisable: m.notifications_disable({}, { locale: settings.interfaceLocale }),
    notificationsEnabled: m.notifications_enabled({}, { locale: settings.interfaceLocale }),
    notificationsDenied: m.notifications_denied({}, { locale: settings.interfaceLocale }),
    notificationsUnavailable: m.notifications_unavailable({}, { locale: settings.interfaceLocale }),
    completed: m.completed({}, { locale: settings.interfaceLocale }),
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
  async function toggleNotifications() {
    notificationBusy = true;
    notificationMessage = '';
    try {
      if (notificationsEnabled) {
        await disablePush();
        notificationsEnabled = false;
      } else {
        if (!pushSupported()) throw new Error('unsupported');
        await enablePush();
        notificationsEnabled = true;
        notificationMessage = labels.notificationsEnabled;
      }
    } catch (error) {
      notificationMessage = error instanceof Error && error.message === 'permission_denied' ? labels.notificationsDenied : labels.notificationsUnavailable;
    } finally {
      notificationBusy = false;
    }
  }

  onMount(() => {
    void pushEnabled().then((enabled) => (notificationsEnabled = enabled));
  });
</script>

<aside class="settings-page" aria-label={labels.settingsHint} dir={interfaceDirection} lang={settings.interfaceLocale}>
  <div class="settings-intro"><span class="brand-mark" aria-hidden="true"><i></i><b></b></span><div><strong>WordCircle</strong><p>{labels.settingsHint}</p></div></div>

  <section class="settings-group" aria-labelledby="content-settings-heading">
    <h2 id="content-settings-heading">{labels.contentGroup}</h2>
    <label class="setting-row interface-locale-row"><span>{labels.gameLanguage}</span><select aria-label={labels.gameLanguage} value={settings.lang} onchange={selectLanguageFromEvent}>{#each playableLanguages as language}<option value={language.code}>{language.label}</option>{/each}</select></label>
    <div class="setting-row vocabulary-row"><span>{labels.vocabulary}</span><div class="segmented level-segmented">{#each vocabularyLevels as level}<button class:chosen={settings.vocabularyLevel === level} onclick={() => selectVocabularyLevel(level)}>{level.toUpperCase()}</button>{/each}</div></div>
    {#if settings.vocabularyLevel !== 'a1'}<div class="setting-row vibration-row include-lower-row"><span>{labels.includeLower}</span><input aria-label={labels.includeLower} type="checkbox" class="toggle toggle-sm" checked={settings.includeLowerVocabulary} onchange={(event) => settings.setIncludeLowerVocabulary((event.currentTarget as HTMLInputElement).checked)} /></div>{/if}
    <div class="setting-row vibration-row"><span>{labels.backwards}</span><input aria-label={labels.backwards} type="checkbox" class="toggle toggle-sm" checked={settings.allowBackwardWords} onchange={(event) => settings.setAllowBackwardWords((event.currentTarget as HTMLInputElement).checked)} /></div>
  </section>

  <section class="settings-group" aria-labelledby="behavior-settings-heading">
    <h2 id="behavior-settings-heading">{labels.behaviorGroup}</h2>
    <label class="setting-row interface-locale-row"><span class="setting-label"><IconLanguage aria-hidden="true" />{labels.interfaceLanguage}</span><select aria-label={labels.interfaceLanguage} value={settings.interfaceLocale} onchange={selectInterfaceLocaleFromEvent}>{#each interfaceLocales as locale}<option value={locale.code}>{locale.label}</option>{/each}</select></label>
    <div class="setting-row"><span>{labels.appearance}</span><div class="segmented"><button class:chosen={settings.theme === 'light'} onclick={() => settings.setTheme('light')}><IconLight />{labels.light}</button><button class:chosen={settings.theme === 'dark'} onclick={() => settings.setTheme('dark')}><IconDark />{labels.dark}</button></div></div>
    <div class="setting-row vibration-row"><span><IconVibrate />{labels.vibration}</span><input aria-label={labels.vibration} type="checkbox" class="toggle toggle-sm" checked={settings.vibration} onchange={(event) => settings.setVibration((event.currentTarget as HTMLInputElement).checked)} /></div>
    <div class="setting-row vibration-row"><span>{#if settings.sound}<IconVolume />{:else}<IconVolumeOff />{/if}{labels.sound}</span><input aria-label={labels.sound} type="checkbox" class="toggle toggle-sm" checked={settings.sound} onchange={(event) => settings.setSound((event.currentTarget as HTMLInputElement).checked)} /></div>
    <div class="setting-row notification-row"><span>{labels.notifications}</span><button type="button" onclick={toggleNotifications} disabled={notificationBusy}>{notificationsEnabled ? labels.notificationsDisable : labels.notificationsEnable}</button></div>
    {#if notificationMessage}<p class="notification-message">{notificationMessage}</p>{/if}
    <div class="setting-row completion-total"><span>{labels.completed}</span><strong>{settings.completedRounds}</strong></div>
  </section>

  {#if telegramHref}<a class="settings-telegram" href={telegramHref} target="_blank" rel="noreferrer" lang={settings.interfaceLocale} dir={interfaceDirection}><IconTelegram aria-hidden="true" /><span>{labels.telegramShare}</span></a>{/if}
  <a class="settings-github" href="https://github.com/PXNX/words-sv" target="_blank" rel="noreferrer"><IconGithub aria-hidden="true" /><span>GitHub · PXNX/words-sv</span></a>
</aside>

<style>
  .settings-page { flex:1 1 auto;min-height:0;margin:0;padding:clamp(1rem,5vw,2rem) clamp(1rem,5vw,2rem) clamp(1rem,5vw,2rem);overflow-y:auto;border:0;background:rgba(255,253,247,.98);box-shadow:0 18px 55px rgba(23,42,69,.2);animation:drop-in .2s cubic-bezier(.23,1,.32,1); }
  .settings-intro { display:flex;align-items:center;gap:.75rem;color:#172a45; }.settings-intro strong { display:block;font-family:'DM Serif Display',serif;font-size:clamp(1.45rem,6vw,2rem);font-weight:400;letter-spacing:-.04em;line-height:.9; }.settings-intro p { margin:.35rem 0 0;color:#a45e38;font-family:'DM Serif Display',serif;font-size:.94rem; }
  .brand-mark { position:relative;width:34px;height:34px;display:block;flex:none; }.brand-mark i,.brand-mark b { position:absolute;display:block;width:21px;height:21px;border:2px solid #172a45;border-radius:50%; }.brand-mark i { top:1px;left:1px; }.brand-mark b { right:1px;bottom:1px;border-color:#e6a527; }
  .settings-group { margin-top:1.35rem;padding:.7rem .8rem .85rem;border:1px solid rgba(23,42,69,.17);background:rgba(255,253,247,.55); }.settings-group h2 { margin:0 0 .1rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase; }
  .setting-row { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.72rem;margin-top:.72rem;border-top:1px solid rgba(23,42,69,.14);color:#172a45;font-size:.67rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase; }.include-lower-row { margin-top:.25rem;padding-top:.35rem;border-top:0; }
  .segmented { display:flex;padding:2px;border:1px solid rgba(23,42,69,.22);border-radius:99px; }.segmented button { min-height:1.65rem;padding:0 .55rem;display:inline-flex;align-items:center;gap:.25rem;border:0;border-radius:99px;background:transparent;color:rgba(23,42,69,.62);font-size:.62rem;font-weight:800; }.segmented button :global(svg) { width:.78rem;height:.78rem; }.segmented button.chosen { background:#172a45;color:#fffdf7; }
  .vibration-row>span,.setting-label { display:inline-flex;align-items:center;gap:.35rem; }.vibration-row :global(svg),.setting-label :global(svg) { width:.9rem;height:.9rem; }
  .interface-locale-row select { max-width:9.6rem;border:1px solid rgba(23,42,69,.28);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;outline:0; }.interface-locale-row select:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .level-segmented button { min-width:1.65rem;padding:0 .32rem; }.vocabulary-row { align-items:flex-start; }
  .completion-total strong { color:#34824d;font-family:'DM Serif Display',serif;font-size:1.45rem;line-height:1; }
  .notification-row button { min-height:1.8rem;padding:0 .55rem;border:1px solid #a45e38;background:transparent;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase; }.notification-row button:disabled { opacity:.55; }.notification-row button:active { transform:scale(.97); }
  .notification-message { margin:.45rem 0 0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:700;line-height:1.35; }
  .settings-github { display:flex;align-items:center;justify-content:center;gap:.42rem;margin-top:1rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.66rem;font-weight:800;letter-spacing:.05em;text-align:center;text-decoration:none;text-transform:uppercase; }.settings-github:focus-visible { outline:2px solid #e6a527;outline-offset:3px; }.settings-github :global(svg) { width:1rem;height:1rem; }
  .settings-telegram { display:flex;align-items:center;justify-content:center;gap:.48rem;margin-top:1rem;padding:.54rem .7rem;border:1px solid #2aab2e;background:rgba(42,171,46,.08);color:#237a26;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:700;line-height:1.45;text-align:right;text-decoration:none; }.settings-telegram :global(svg) { width:1.12rem;height:1.12rem;flex:none; }.settings-telegram:hover,.settings-telegram:focus-visible { background:#2aab2e;color:#fffdf7;outline:0; }.settings-telegram:focus-visible { outline:2px solid #e6a527;outline-offset:3px; }
  @keyframes drop-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  :global(html.dark) .settings-page { background:rgba(23,42,69,.99); }
  :global(html.dark) .settings-intro { color:#fffdf7; }
  :global(html.dark) .brand-mark i { border-color:#fffdf7; }
  :global(html.dark) .setting-row { color:#fffdf7;border-color:rgba(255,253,247,.22); }
  :global(html.dark) .segmented { border-color:rgba(255,253,247,.25); }:global(html.dark) .segmented button { color:rgba(255,253,247,.64); }
  :global(html.dark) .settings-telegram { border-color:#56c85a;background:rgba(86,200,90,.13);color:#a9e8ab; }
</style>
