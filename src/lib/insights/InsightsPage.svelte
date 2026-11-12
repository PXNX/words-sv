<!--
  Insights: what the learner's own event log says about their practice. Activity over the last
  eight weeks, how often a day of practice was followed by another, how the modes compare, what
  pictures and animated explanations did for recall (experiments.ts), and the content they
  flagged as wrong. Everything is computed here, on the device, from data that never leaves it.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatDate } from '#lib/format/format.js';
  import { readEvents } from '#lib/progress/eventLog.js';
  import type { EventMode, LearningEvent } from '#lib/progress/events.js';
  import { EXPERIMENTS, presentationReport, type ArmResult, type ExperimentKey } from '#lib/experiments/experiments.js';
  import { variant } from '#lib/experiments/experiments.svelte.js';
  import { flagsAsText, readFlags, removeFlag, writeFlags, type ContentFlag } from '#lib/content/flags.js';
  import { dailyActivity, modeAccuracy, returnRates } from './insights.js';
  import IconCopy from '~icons/material-symbols/content-copy-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  const DAYS = 56;
  const locale = $derived({ locale: settings.interfaceLocale });
  let events = $state<LearningEvent[]>([]);
  let loaded = $state(false);
  let flags = $state<ContentFlag[]>([]);
  let copied = $state(false);

  const mine = $derived(events.filter((event) => event.lang === settings.lang));
  const days = $derived(dailyActivity(mine, DAYS));
  const busiest = $derived(Math.max(1, ...days.map((day) => day.answers)));
  const weeks = $derived(Array.from({ length: DAYS / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7)));
  const totals = $derived({ answers: days.reduce((sum, day) => sum + day.answers, 0), activeDays: days.filter((day) => day.answers > 0).length });
  const rates = $derived(returnRates(mine));
  const modes = $derived(modeAccuracy(mine));
  const pictures = $derived(presentationReport(mine, 'image'));
  const animations = $derived(presentationReport(mine, 'animation'));
  const experimentKeys = Object.keys(EXPERIMENTS) as ExperimentKey[];

  const modeNames = $derived<Partial<Record<EventMode, string>>>({
    vocab: m.mode_word_quiz({}, locale), reading: m.reading_title({}, locale), listen: m.story_listen({}, locale), speak: m.mode_pronunciation({}, locale),
    write: m.group_sentence({}, locale), grammar: m.mode_grammar({}, locale), forms: m.grammar_forms({}, locale), story: m.story_title({}, locale),
    circle: m.mode_crossword({}, locale), wordle: m.mode_wordle({}, locale), hangman: m.mode_hangman({}, locale), taboo: m.mode_taboo({}, locale),
    alltag: m.mode_alltag({}, locale), conversation: m.mode_conversation({}, locale), dictionary: m.dictionary_title({}, locale)
  });
  const percent = (value: number | null) => (value === null ? '–' : `${num(Math.round(value * 100))} %`);
  const armText = (result: ArmResult) => (result.answers ? m.insights_arm({ percent: percent(result.accuracy), count: num(result.answers) }, locale) : m.insights_no_data({}, locale));
  const dayLabel = (day: { ts: number; answers: number }) => `${formatDate(settings.formatContext, new Date(day.ts), 'short')}: ${num(day.answers)}`;

  onMount(() => {
    flags = readFlags();
    void readEvents(Date.now() - 400 * 24 * 60 * 60 * 1000).then((all) => {
      events = all;
      loaded = true;
    });
  });

  function dropFlag(item: string) {
    flags = removeFlag(flags, item);
    writeFlags(flags);
  }
  async function copyFlags() {
    try {
      await navigator.clipboard.writeText(flagsAsText(flags));
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch { /* no clipboard: the list is on screen to select by hand */ }
  }
</script>

<main class="insights" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
  <header>
    <div>
      <p class="insights-kicker">{m.insights_kicker({}, locale)}</p>
      <h1>{m.insights_title({}, locale)}</h1>
    </div>
  </header>
  <p class="insights-lead">{m.insights_lead({}, locale)}</p>

  <section class="panel-play" aria-labelledby="insights-activity">
    <h2 id="insights-activity">{m.insights_activity({}, locale)}</h2>
    <div class="heat" role="img" aria-label={m.insights_activity_summary({ answers: num(totals.answers), days: num(totals.activeDays) }, locale)}>
      {#each weeks as week, index (index)}
        <div class="heat-week">
          {#each week as day (day.key)}
            <i class:empty={day.answers === 0} style={`--level:${day.answers ? 0.25 + 0.75 * (day.answers / busiest) : 0}`} title={dayLabel(day)}></i>
          {/each}
        </div>
      {/each}
    </div>
    <p class="insights-note">{m.insights_activity_summary({ answers: num(totals.answers), days: num(totals.activeDays) }, locale)}</p>
    <dl class="insights-facts">
      <div><dt>{m.insights_next_day({}, locale)}</dt><dd>{percent(rates.nextDay)}</dd></div>
      <div><dt>{m.insights_within_week({}, locale)}</dt><dd>{percent(rates.withinWeek)}</dd></div>
    </dl>
  </section>

  <section class="panel-play" aria-labelledby="insights-modes">
    <h2 id="insights-modes">{m.insights_modes({}, locale)}</h2>
    {#if modes.length}
      <table>
        <thead><tr><th scope="col">{m.insights_mode({}, locale)}</th><th scope="col">{m.insights_answers({}, locale)}</th><th scope="col">{m.insights_right({}, locale)}</th><th scope="col">{m.insights_time({}, locale)}</th></tr></thead>
        <tbody>
          {#each modes as row (row.mode)}
            <tr>
              <th scope="row">{modeNames[row.mode] ?? row.mode}</th>
              <td>{num(row.answers)}</td>
              <td><span class="bar" style={`--share:${row.accuracy}`}></span>{percent(row.accuracy)}</td>
              <td>{row.medianSeconds === null ? '–' : m.insights_seconds({ seconds: num(Math.round(row.medianSeconds * 10) / 10) }, locale)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="insights-note">{loaded ? m.insights_empty({}, locale) : m.insights_loading({}, locale)}</p>
    {/if}
  </section>

  <section class="panel-play" aria-labelledby="insights-experiments">
    <h2 id="insights-experiments">{m.insights_experiments({}, locale)}</h2>
    <p class="insights-note">{m.insights_experiments_hint({}, locale)}</p>
    <dl class="insights-compare">
      <div><dt>{m.insights_pictures({}, locale)}</dt><dd>{m.insights_with({}, locale)}: {armText(pictures.with)}</dd><dd>{m.insights_without({}, locale)}: {armText(pictures.without)}</dd></div>
      <div><dt>{m.insights_animations({}, locale)}</dt><dd>{m.insights_with({}, locale)}: {armText(animations.with)}</dd><dd>{m.insights_without({}, locale)}: {armText(animations.without)}</dd></div>
    </dl>
    <ul class="insights-variants">
      {#each experimentKeys as key (key)}
        <li><code>{key}</code><b>{variant(key)}</b></li>
      {/each}
    </ul>
  </section>

  <section class="panel-play" aria-labelledby="insights-flags">
    <h2 id="insights-flags">{m.insights_flags({}, locale)}</h2>
    {#if flags.length}
      <ul class="insights-flags">
        {#each flags as flag (flag.item)}
          <li>
            <div><strong lang={flag.language}>{flag.text || flag.item}</strong>{#if flag.note}<span>{flag.note}</span>{/if}</div>
            <button type="button" class="btn-play btn-play-round btn-play-sm btn-play-soft" onclick={() => dropFlag(flag.item)} aria-label={m.flag_remove({}, locale)}><IconClose aria-hidden="true" /></button>
          </li>
        {/each}
      </ul>
      <button type="button" class="btn-play btn-play-ink btn-play-sm" onclick={copyFlags}><IconCopy aria-hidden="true" />{copied ? m.insights_copied({}, locale) : m.insights_copy({}, locale)}</button>
    {:else}
      <p class="insights-note">{m.insights_flags_empty({}, locale)}</p>
    {/if}
  </section>
</main>

<style>
  .insights { flex:1;min-height:0;overflow-y:auto;display:grid;align-content:start;gap:1rem;padding:clamp(1rem,4vw,1.6rem) clamp(1rem,5vw,2rem) 1.6rem;color:var(--text);font-family:var(--font-body); }
  /* The layout's home button sits in the top corner; the heading starts beside it. */
  .insights header { padding-inline-start:2.4rem; }
  .insights h1 { margin:0;font-family:var(--font-display);font-size:clamp(1.6rem,7vw,2.2rem);font-weight:400;letter-spacing:-.03em;line-height:1; }
  .insights-kicker,.insights h2 { margin:0;color:var(--color-accent);font-size:var(--text-xs);font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .insights-lead,.insights-note { margin:0;color:var(--text-soft);font-size:var(--text-xs);font-weight:600;line-height:1.5; }
  .insights section { display:grid;gap:.7rem;padding:.9rem 1rem 1rem; }
  .heat { display:flex;gap:4px;direction:ltr; }
  .heat-week { flex:1;display:grid;gap:4px; }
  .heat i { display:block;aspect-ratio:1;border-radius:4px;background:color-mix(in oklch,var(--go) calc(var(--level) * 100%),var(--surface)); }
  .heat i.empty { background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-soft); }
  .insights-facts { display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:0; }
  .insights-facts div { padding:.6rem .7rem;border:2px solid var(--line-soft);border-radius:12px; }
  .insights dt { color:var(--text-soft);font-size:var(--text-xs);font-weight:700;line-height:1.35; }
  .insights-facts dd { margin:.15rem 0 0;font-family:var(--font-display);font-size:1.5rem;line-height:1.1;font-variant-numeric:tabular-nums; }
  .insights table { width:100%;border-collapse:collapse;font-size:var(--text-xs);font-variant-numeric:tabular-nums; }
  .insights th,.insights td { padding:.4rem .3rem;border-bottom:1.5px solid var(--line-soft);text-align:start;font-weight:700; }
  .insights thead th { color:var(--text-soft);font-weight:800; }
  .insights tbody tr:last-child th,.insights tbody tr:last-child td { border-bottom:0; }
  .bar { display:inline-block;width:2.4rem;height:.45rem;margin-inline-end:.4rem;border-radius:99px;background:linear-gradient(to right,var(--go) calc(var(--share) * 100%),var(--line-soft) 0);vertical-align:middle; }
  :global([dir='rtl']) .bar { background:linear-gradient(to left,var(--go) calc(var(--share) * 100%),var(--line-soft) 0); }
  .insights-compare { display:grid;gap:.6rem;margin:0; }
  .insights-compare dd { margin:.1rem 0 0;font-size:var(--text-sm);font-weight:700; }
  .insights-variants { display:grid;gap:.3rem;margin:0;padding:0;list-style:none;font-size:var(--text-xs); }
  .insights-variants li { display:flex;justify-content:space-between;gap:.6rem;padding:.35rem .6rem;border-radius:8px;background:color-mix(in oklch,currentColor 6%,transparent); }
  .insights-flags { display:grid;gap:.4rem;margin:0;padding:0;list-style:none; }
  .insights-flags li { display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.5rem .6rem;border:2px solid var(--line-soft);border-radius:12px; }
  .insights-flags div { display:grid;gap:.1rem;min-width:0; }
  .insights-flags strong { font-size:var(--text-sm);overflow-wrap:anywhere; }
  .insights-flags span { color:var(--text-soft);font-size:var(--text-xs);font-weight:600;overflow-wrap:anywhere; }
  .insights section > .btn-play { justify-self:start; }
</style>
