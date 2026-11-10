<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatDate, isolateLtr } from '#lib/format/format.js';
  import { CHANGE_TYPES, highlightKey, releaseAnchor, unseenReleases, type ChangeType, type ChangelogRelease } from './changelog.js';
  import { lastSeenVersion, markVersionSeen } from './changelogSeen.js';
  import { releases } from './releases.js';
  import { appVersion } from './version.js';
  import IconBack from '~icons/material-symbols/arrow-back-rounded';
  import IconOpen from '~icons/material-symbols/open-in-new-rounded';

  const current = appVersion(__APP_VERSION__);
  const locale = $derived({ locale: settings.interfaceLocale });
  const direction = $derived(getTextDirection(settings.interfaceLocale));
  // Read once, before opening the page marks everything as seen, so the badges stay for this visit.
  const unseen = new Set(unseenReleases(releases, lastSeenVersion()).map((release) => release.version));

  const sectionTitle = $derived<Record<ChangeType, string>>({
    new: m.changelog_new({}, locale),
    improved: m.changelog_improved({}, locale),
    fixed: m.changelog_fixed({}, locale),
    migration: m.changelog_migration({}, locale),
    known: m.changelog_known({}, locale)
  });

  // Localised one-liner from the message files when it exists, else the English summary.
  function highlight(release: ChangelogRelease): string {
    const message = (m as unknown as Record<string, ((inputs: object, options: { locale: string }) => string) | undefined>)[highlightKey(release.version)];
    return message ? message({}, locale) : release.summary;
  }
  function releaseDate(release: ChangelogRelease) {
    const text = formatDate(settings.formatContext, Date.parse(`${release.date}T12:00:00Z`), 'long', 'UTC');
    return settings.formatContext.learning && direction === 'rtl' ? isolateLtr(text) : text;
  }

  onMount(async () => {
    const newest = releases[0];
    if (newest) markVersionSeen(newest.version);
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    await tick();
    target?.scrollIntoView({ block: 'start' });
  });
</script>

<main class="changelog" dir={direction} lang={settings.interfaceLocale}>
  <header class="changelog-header">
    <a class="btn-play btn-play-round btn-play-sm btn-play-soft" href="/settings" aria-label={m.changelog_back({}, locale)}><IconBack aria-hidden="true" class="rtl:rotate-180" /></a>
    <div>
      <h1>{m.changelog_title({}, locale)}</h1>
      <p>{m.changelog_version({ version: current }, locale)}</p>
    </div>
  </header>

  {#each releases as release, index (release.version)}
    <details class="panel-play changelog-release" id={releaseAnchor(release.version)} open={index < 2 || unseen.has(release.version) || release.version === current}>
      <summary>
        <span class="changelog-version" dir="ltr">{release.version}</span>
        {#if unseen.has(release.version)}<span class="changelog-badge">{m.changelog_unseen({}, locale)}</span>{/if}
        <span class="changelog-date">{releaseDate(release)}</span>
      </summary>
      <p class="changelog-highlight">{highlight(release)}</p>
      <div class="changelog-details" dir="ltr" lang="en">
        {#each CHANGE_TYPES as type}
          {#if release.entries[type]?.length}
            <h2 lang={settings.interfaceLocale} dir={direction}>{sectionTitle[type]}</h2>
            <ul>{#each release.entries[type] ?? [] as entry}<li>{entry}</li>{/each}</ul>
          {/if}
        {/each}
      </div>
      <p class="changelog-footer">
        <span>{m.changelog_technical({}, locale)}</span>
        <a href={`https://github.com/PXNX/words-sv/releases/tag/${releaseAnchor(release.version)}`} target="_blank" rel="noreferrer">{m.changelog_github({}, locale)}<IconOpen aria-hidden="true" /></a>
      </p>
    </details>
  {/each}
</main>

<style>
  .changelog { flex: 1; min-height: 0; overflow-y: auto; padding: clamp(2.9rem, 10vw, 3.6rem) clamp(1rem, 5vw, 2rem) clamp(1rem, 5vw, 2rem); display: grid; align-content: start; gap: 0.9rem; max-width: 40rem; margin-inline: auto; width: 100%; }
  .changelog-header { display: flex; align-items: center; gap: 0.75rem; }
  .changelog-header h1 { margin: 0; font-size: 1.25rem; font-weight: 900; }
  .changelog-header p { margin: 0; font-size: 0.7rem; font-weight: 800; opacity: 0.6; }
  .changelog-release { padding: 0.75rem 0.9rem; scroll-margin-top: 1rem; }
  .changelog-release summary { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; cursor: pointer; list-style: none; }
  .changelog-release summary::-webkit-details-marker { display: none; }
  .changelog-version { font-weight: 900; font-size: 0.95rem; }
  .changelog-badge { padding: 0.1rem 0.45rem; border-radius: 999px; background: var(--color-primary); color: var(--color-primary-content); font-size: 0.58rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
  .changelog-date { margin-inline-start: auto; font-size: 0.68rem; font-weight: 800; opacity: 0.6; }
  .changelog-highlight { margin: 0.55rem 0 0; font-weight: 800; font-size: 0.85rem; line-height: 1.4; }
  .changelog-details h2 { margin: 0.7rem 0 0.2rem; color: var(--color-accent); font-size: 0.58rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
  .changelog-details ul { margin: 0; padding-inline-start: 1.1rem; font-size: 0.78rem; line-height: 1.45; }
  .changelog-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; margin: 0.7rem 0 0; font-size: 0.62rem; font-weight: 800; opacity: 0.7; }
  .changelog-footer a { display: inline-flex; align-items: center; gap: 0.25rem; color: inherit; }
  @media (prefers-reduced-motion: no-preference) {
    .changelog-release[open] .changelog-highlight { animation: drop-in 0.2s cubic-bezier(0.23, 1, 0.32, 1); }
  }
</style>
