<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';
  import { dueReviewEntries, groupReviewEntries, type ReviewSource } from '#lib/review/ledger.js';
  import IconChevronRight from '~icons/material-symbols/chevron-right-rounded';
  import IconReplay from '~icons/material-symbols/replay-rounded';

  type DueEntry = ReturnType<typeof dueReviewEntries>[number];

  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const labels = $derived({
    title: m.repeat_title({}, { locale: settings.interfaceLocale }),
    kicker: m.repeat_kicker({}, { locale: settings.interfaceLocale }),
    due: (count: number) => m.repeat_due({ count }, { locale: settings.interfaceLocale }),
    mixed: (count: number) => m.repeat_mixed({ count }, { locale: settings.interfaceLocale }),
    empty: m.repeat_empty({}, { locale: settings.interfaceLocale }),
    noWords: m.repeat_no_words({}, { locale: settings.interfaceLocale }),
    groupCount: (count: number) => m.repeat_group_count({ count }, { locale: settings.interfaceLocale }),
    vocab: m.repeat_group_vocab({}, { locale: settings.interfaceLocale }),
    reading: m.repeat_group_reading({}, { locale: settings.interfaceLocale }),
    grammar: m.repeat_group_grammar({}, { locale: settings.interfaceLocale }),
    pronunciation: m.repeat_group_pronunciation({}, { locale: settings.interfaceLocale }),
    story: m.repeat_group_story({}, { locale: settings.interfaceLocale }),
    listening: m.repeat_group_listening({}, { locale: settings.interfaceLocale })
  });

  let entries = $state<DueEntry[]>([]);
  let ready = $state(false);

  const levelWords = $derived(new Set(wordPools[settings.lang][settings.vocabularyLevel]));
  const wordEntries = $derived(entries.filter(({ item }) => levelWords.has(item)));
  const groups = $derived(groupReviewEntries(entries));

  function sourceLabel(source: ReviewSource): string {
    if (source === 'reading') return labels.reading;
    if (source === 'grammar') return labels.grammar;
    if (source === 'pronunciation') return labels.pronunciation;
    if (source === 'story') return labels.story;
    if (source === 'listening') return labels.listening;
    return labels.vocab;
  }
  // Every group opens the mode that owns those items; vocabulary and reading both continue in the
  // word quiz, which is the one session that can show a definition for every word.
  function sourceHref(source: ReviewSource): string {
    if (source === 'reading') return '/reading';
    if (source === 'grammar') return '/grammar';
    if (source === 'pronunciation') return '/pronunciation';
    if (source === 'story') return '/stories';
    if (source === 'listening') return '/listen';
    return '/vocab?due=1';
  }
  function itemLabel(item: string): string {
    const separator = item.indexOf(':');
    return separator >= 0 ? item.slice(separator + 1) : item;
  }
  function refresh() {
    entries = dueReviewEntries(settings.lang);
    ready = true;
  }

  onMount(refresh);
  $effect(() => {
    settings.lang;
    settings.vocabularyLevel;
    untrack(refresh);
  });
</script>

<svelte:head>
  <title>{labels.title} · WordCircle</title>
</svelte:head>

<section class="flex-1 min-h-0 m-0 px-[clamp(1rem,5vw,2rem)] pb-[clamp(1rem,5vw,2rem)] pt-[clamp(2.9rem,10vw,3.6rem)] overflow-x-hidden overflow-y-auto bg-transparent" dir={interfaceDirection} lang={settings.interfaceLocale} aria-label={labels.title}>
  <p class="m-0 text-center text-accent text-[.58rem] font-black tracking-[.14em] uppercase">{labels.kicker}</p>
  <h1 class="m-0 mt-[.2rem] text-center text-base-content font-['DM_Serif_Display',serif] text-[clamp(1.7rem,7vw,2.4rem)] font-normal tracking-[-.03em] leading-none">{labels.title}</h1>

  {#if ready && entries.length === 0}
    <div class="panel-play mt-[1.2rem] px-[.9rem] py-[.8rem]">
      <p class="m-0 text-base-content/65 text-[.7rem] font-bold leading-[1.45]">{labels.empty}</p>
    </div>
  {:else}
    <div class="panel-play mt-[1.2rem] px-4 pt-[.9rem] pb-4">
      <div class="flex items-center justify-between gap-3">
        <strong class="text-base-content font-['DM_Serif_Display',serif] text-[1.9rem] font-normal leading-none">{entries.length}</strong>
        <span class="text-base-content/60 text-[.62rem] font-extrabold">{labels.due(entries.length)}</span>
      </div>
      {#if wordEntries.length > 0}
        <a class="btn-play btn-play-ink mt-[.8rem] w-full justify-center" href="/vocab?due=1"><IconReplay class="w-[1rem] h-[1rem]" aria-hidden="true" />{labels.mixed(wordEntries.length)}</a>
      {:else}
        <p class="m-0 mt-[.8rem] text-base-content/60 text-[.64rem] font-bold leading-[1.4]">{labels.noWords}</p>
      {/if}
    </div>

    <ul class="m-0 mt-3 p-0 grid gap-[.45rem] list-none">
      {#each groups as group (group.source)}
        {@const groupEntries = entries.filter(({ entry }) => entry.source === group.source)}
        <li>
          <a class="card-play flex w-full items-center justify-between gap-3 px-[.8rem] py-[.65rem]" href={sourceHref(group.source)}>
            <span class="min-w-0">
              <strong class="block text-base-content text-[.78rem] font-extrabold">{sourceLabel(group.source)}</strong>
              <small class="block mt-[.1rem] text-base-content/55 text-[.6rem] font-bold">{labels.groupCount(group.count)}</small>
            </span>
            <IconChevronRight class="w-[1.1rem] h-[1.1rem] flex-none text-accent" aria-hidden="true" />
          </a>
          <ul class="m-0 mt-[.3rem] px-[.2rem] flex flex-wrap gap-[.25rem] list-none">
            {#each groupEntries.slice(0, 8) as { item } (item)}
              <li class="px-[.45rem] py-[.14rem] border border-base-content/15 rounded-full bg-base-200/50 text-base-content/70 text-[.56rem] font-bold">{itemLabel(item)}</li>
            {/each}
            {#if groupEntries.length > 8}<li class="px-[.45rem] py-[.14rem] text-base-content/50 text-[.56rem] font-bold">+{groupEntries.length - 8}</li>{/if}
          </ul>
        </li>
      {/each}
    </ul>
  {/if}
</section>
