<!--
  The whole version history as a bottom sheet over the settings (Settings → version history). The
  releases come bundled from CHANGELOG.md, so it works offline. The newest release is marked as seen
  as soon as the sheet opens; releases the learner has not looked at yet carry a badge, read before
  the marking. It replaced the /changelog page, and the sheet after an update opens it too.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatDate, isolateLtr } from '#lib/format/format.js';
  import BottomSheet from './BottomSheet.svelte';
  import { releaseHighlight } from './highlight.js';
  import { CHANGE_TYPES, unseenReleases, type ChangeType, type ChangelogRelease } from './changelog.js';
  import { lastSeenVersion, markVersionSeen } from './changelogSeen.js';
  import { releases } from './releases.js';
  import { appVersion } from './version.js';
  import { changelogSheet } from './changelogSheet.svelte.js';

  const current = appVersion(__APP_VERSION__);
  const locale = $derived({ locale: settings.interfaceLocale });
  const direction = $derived(getTextDirection(settings.interfaceLocale));
  let unseen = $state<Set<string>>(new Set());

  const sectionTitle = $derived<Record<ChangeType, string>>({
    new: m.changelog_new({}, locale),
    improved: m.changelog_improved({}, locale),
    fixed: m.changelog_fixed({}, locale),
    migration: m.changelog_migration({}, locale),
    known: m.changelog_known({}, locale)
  });

  // Read on every opening, before the newest release counts as seen, so the badges last this visit.
  $effect(() => {
    if (!changelogSheet.open) return;
    unseen = new Set(unseenReleases(releases, lastSeenVersion()).map((release) => release.version));
    const newest = releases[0];
    if (newest) markVersionSeen(newest.version);
  });

  function releaseDate(release: ChangelogRelease) {
    const text = formatDate(settings.formatContext, Date.parse(`${release.date}T12:00:00Z`), 'long', 'UTC');
    return settings.formatContext.learning && direction === 'rtl' ? isolateLtr(text) : text;
  }
</script>

<BottomSheet bind:open={changelogSheet.open} title={m.changelog_title({}, locale)}>
  <p class="changelog-version">{m.changelog_version({ version: current }, locale)}<span>{m.changelog_technical({}, locale)}</span></p>
  {#each releases as release, index (release.version)}
    <details class="panel-play changelog-release" open={index < 2 || unseen.has(release.version) || release.version === current}>
      <summary>
        <span class="changelog-number" dir="ltr">{release.version}</span>
        {#if unseen.has(release.version)}<span class="changelog-badge">{m.changelog_unseen({}, locale)}</span>{/if}
        <span class="changelog-date">{releaseDate(release)}</span>
      </summary>
      <p class="changelog-highlight">{releaseHighlight(release, settings.interfaceLocale)}</p>
      <div class="changelog-details" dir="ltr" lang="en">
        {#each CHANGE_TYPES as type}
          {#if release.entries[type]?.length}
            <h3 class={type} lang={settings.interfaceLocale} dir={direction}>{sectionTitle[type]}</h3>
            <ul>{#each release.entries[type] ?? [] as entry}<li>{entry}</li>{/each}</ul>
          {/if}
        {/each}
      </div>
    </details>
  {/each}
</BottomSheet>

<style>
  .changelog-version { display:flex;flex-wrap:wrap;justify-content:space-between;gap:.2rem .6rem;margin:0;color:#596477;font-size:.8125rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase; }
  .changelog-release { padding:.65rem .8rem; scroll-margin-top:1rem; }
  .changelog-release summary { display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;cursor:pointer;list-style:none; }
  .changelog-release summary::-webkit-details-marker { display:none; }
  .changelog-number { font-size:.95rem;font-weight:900; }
  .changelog-badge { padding:.05rem .4rem;border-radius:999px;background:#e6a527;color:#172a45;font-size:.6875rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  .changelog-date { margin-inline-start:auto;font-size:.8125rem;font-weight:800;opacity:.6; }
  .changelog-highlight { margin:.5rem 0 0;font-size:.9rem;font-weight:800;line-height:1.4; }
  .changelog-details h3 { margin:.65rem 0 .2rem;color:#a45e38;font-size:.6875rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .changelog-details ul { margin:0;padding-inline-start:1.05rem;list-style:disc;font-size:.875rem;line-height:1.45; }
  .changelog-details li { margin-block:.15rem; }
  .changelog-details li::marker { color:#e6a527; }
  .changelog-details h3.fixed { color:#34824d; }
  :global(html.dark) .changelog-version { color:rgba(255,253,247,.68); }
  :global(html.dark) .changelog-details h3 { color:#e6a527; }
  :global(html.dark) .changelog-details h3.fixed { color:#7fc29b; }
  @media (prefers-reduced-motion: no-preference) {
    .changelog-release[open] .changelog-highlight { animation:drop-in .2s cubic-bezier(.23,1,.32,1); }
  }
</style>
