<!-- The level rubric for a written text (levelRubric.ts): four criteria with 0–3 points each and a band. -->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { MAX_POINTS, type RubricCriterion, type RubricScore } from './levelRubric.js';

  let { rubric }: { rubric: RubricScore } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const level = $derived(rubric.level.toUpperCase());
  const band = $derived(rubric.band === 'above' ? m.rubric_band_above({ level }, locale) : rubric.band === 'at' ? m.rubric_band_at({ level }, locale) : m.rubric_band_below({ level }, locale));

  function label(key: RubricCriterion): string {
    switch (key) {
      case 'task': return m.rubric_task({}, locale);
      case 'range': return m.rubric_range({}, locale);
      case 'accuracy': return m.rubric_accuracy({}, locale);
      case 'coherence': return m.rubric_coherence({}, locale);
    }
  }
  function detail(criterion: RubricScore['criteria'][number]): string {
    const params = { value: num(criterion.value), expected: num(criterion.expected) };
    switch (criterion.key) {
      case 'task': return m.rubric_task_detail(params, locale);
      case 'range': return m.rubric_range_detail(params, locale);
      case 'accuracy': return criterion.value ? m.rubric_accuracy_detail(params, locale) : m.rubric_accuracy_clean({}, locale);
      case 'coherence': return m.rubric_coherence_detail(params, locale);
    }
  }
</script>

<section class="rubric-card" data-band={rubric.band} aria-label={m.rubric_title({ level }, locale)}>
  <header>
    <p class="rubric-kicker">{m.rubric_title({ level }, locale)}</p>
    <p class="rubric-band">{band}</p>
  </header>
  <ul>
    {#each rubric.criteria as criterion (criterion.key)}
      <li>
        <span class="rubric-name">{label(criterion.key)}</span>
        <span class="rubric-points" aria-label={m.rubric_points({ points: num(criterion.points), max: num(MAX_POINTS) }, locale)}>
          {#each Array.from({ length: MAX_POINTS }, (_, index) => index) as dot (dot)}
            <i class:on={dot < criterion.points}></i>
          {/each}
        </span>
        <span class="rubric-detail">{detail(criterion)}</span>
      </li>
    {/each}
  </ul>
  {#if rubric.connectorsUsed.length}
    <p class="rubric-connectors">{m.rubric_connectors_used({ words: rubric.connectorsUsed.join(', ') }, locale)}</p>
  {/if}
</section>

<style>
  .rubric-card { display: grid; gap: 0.6rem; padding: 0.9rem 1rem; border: 1px solid rgba(23, 42, 69, 0.16); border-radius: 1rem; background: #fffdf7; }
  header { display: grid; gap: 0.15rem; }
  .rubric-kicker { margin: 0; color: #a45e38; font-family: 'DM Sans', sans-serif; font-size: .8125rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
  .rubric-band { margin: 0; color: #172a45; font-family: 'DM Serif Display', serif; font-size: 1.25rem; line-height: 1.15; }
  .rubric-card[data-band='above'] .rubric-band { color: #34824d; }
  .rubric-card[data-band='below'] .rubric-band { color: #c9604e; }
  ul { display: grid; gap: 0.45rem; margin: 0; padding: 0; list-style: none; }
  li { display: grid; grid-template-columns: 1fr auto; gap: 0.1rem 0.6rem; align-items: center; }
  .rubric-name { color: #243449; font-family: 'DM Sans', sans-serif; font-size: .95rem; font-weight: 800; }
  .rubric-points { display: inline-flex; gap: 0.22rem; }
  .rubric-points i { width: 0.6rem; height: 0.6rem; border-radius: 999px; background: rgba(23, 42, 69, 0.14); }
  .rubric-points i.on { background: #e6a527; }
  .rubric-card[data-band='above'] .rubric-points i.on { background: #34824d; }
  .rubric-detail { grid-column: 1 / -1; color: #7b8494; font-family: 'DM Sans', sans-serif; font-size: .875rem; font-weight: 700; line-height: 1.35; }
  .rubric-connectors { margin: 0; color: #596477; font-family: 'DM Sans', sans-serif; font-size: .875rem; font-weight: 700; }
  :global(html.dark) .rubric-card { border-color: rgba(255, 253, 247, 0.24); background: #152b47; }
  :global(html.dark) .rubric-band, :global(html.dark) .rubric-name { color: #fffdf7; }
  :global(html.dark) .rubric-points i { background: rgba(255, 253, 247, 0.18); }
  :global(html.dark) .rubric-detail, :global(html.dark) .rubric-connectors { color: rgba(255, 253, 247, 0.65); }
</style>
