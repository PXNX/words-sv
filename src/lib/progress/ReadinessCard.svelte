<!--
  Learning progress on /progress: readiness per skill as a range, the CEFR level ladder with
  started/known bars, known words, the target exam and the most frequent grammar mistakes.
  Kept apart from the streak card, because showing up and learning are measured differently.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatDate, formatNumber, formatPercent } from '#lib/format/format.js';
  import { checkpointDue, checkpointTrend, readCheckpoints, type CheckpointResult } from '#lib/assessment/checkpoints.js';
  import { SKILLS, LEVELS, type Skill } from '#lib/domain/types.js';
  import { labelKeys, type FeatureKey } from '#lib/grammar/taxonomy.js';
  import { readEvents } from './eventLog.js';
  import type { LearningEvent } from './events.js';
  import { buildOverview } from './overview.js';
  import { EXAM_NAMES, forecastWeeks, readinessPercent, type ReadinessRange } from './skillState.js';
  import { storeSnapshot, weeklySeries, type MasterySnapshot } from './masteryHistory.js';
  import { readLevelStates } from '#lib/vocab/spacedRepetition.js';

  const DAY_MS = 24 * 60 * 60 * 1000;
  let events = $state<LearningEvent[]>([]);
  let checkpoints = $state<CheckpointResult[]>([]);
  const due = $derived(checkpointDue(checkpoints, settings.lang, Date.now()));
  const trend = $derived(checkpointTrend(checkpoints, settings.lang));
  onMount(() => {
    checkpoints = readCheckpoints();
    void readEvents(Date.now() - 31 * DAY_MS).then((loaded) => (events = loaded.filter((event) => event.lang === settings.lang)));
  });

  const locale = $derived({ locale: settings.interfaceLocale });
  const overview = $derived(buildOverview({
    levels: Object.fromEntries(LEVELS.map((level) => [level, readLevelStates(settings.lang, level)])),
    events,
    level: settings.vocabularyLevel,
    exam: settings.targetExam,
    now: Date.now()
  }));
  // This week's share of the current level, and how long the recent pace needs to reach 80 %.
  const FORECAST_TARGET = 0.8;
  let history = $state<MasterySnapshot[]>([]);
  const currentRung = $derived(overview.ladder.find((rung) => rung.level === settings.vocabularyLevel));
  $effect(() => {
    if (currentRung) history = storeSnapshot(settings.lang, settings.vocabularyLevel, currentRung.mastery);
  });
  const forecast = $derived(forecastWeeks(weeklySeries(history, settings.lang, settings.vocabularyLevel), FORECAST_TARGET));
  const skillName = $derived<Record<Skill, string>>({
    vocab: m.skill_vocab({}, locale),
    grammar: m.skill_grammar({}, locale),
    reading: m.skill_reading({}, locale),
    listening: m.skill_listening({}, locale),
    speaking: m.skill_speaking({}, locale),
    writing: m.skill_writing({}, locale)
  });
  function rangeLabel(range: ReadinessRange) {
    const { low, high } = readinessPercent(range);
    return m.readiness_range({ low: formatNumber(settings.formatContext, low), high: formatNumber(settings.formatContext, high) }, locale);
  }
  type MessageFn = (inputs: object, options: { locale: string }) => string;
  const messages = m as unknown as Record<string, MessageFn | undefined>;
  // "Kasus · Dativ" from the message files; the raw id only if a label is missing.
  const featureLabel = (key: FeatureKey) => {
    const keys = labelKeys(key);
    const category = messages[keys.category]?.({}, locale);
    const value = messages[keys.value]?.({}, locale);
    return category && value ? `${category} · ${value}` : key;
  };
</script>

<section class="panel-play mt-4 px-4 pt-[.9rem] pb-4 readiness" aria-labelledby="progress-readiness-heading">
  <h2 id="progress-readiness-heading" class="m-0 text-accent text-[.56rem] font-extrabold tracking-[.12em] uppercase">{m.readiness_title({}, locale)} · {settings.vocabularyLevel.toUpperCase()}</h2>
  <p class="readiness-known">{m.readiness_known_words({ count: formatNumber(settings.formatContext, overview.knownWords) }, locale)}</p>
  <a class="readiness-placement" href="/placement">{m.placement_link({}, locale)}{#if due}<span class="readiness-due">{m.checkpoint_due({}, locale)}</span>{/if}</a>
  {#if trend.length}
    <h3>{m.checkpoint_trend({}, locale)}</h3>
    <ol class="readiness-trend">
      {#each trend as entry (entry.at)}
        <li><span class="readiness-level">{entry.level.toUpperCase()}{#if entry.change > 0} ↑{:else if entry.change < 0} ↓{/if}</span><small>{formatDate(settings.formatContext, entry.at, 'dayMonthShort')}</small></li>
      {/each}
    </ol>
  {/if}

  {#if overview.exam}
    <div class="readiness-exam">
      <span>{m.readiness_exam({ exam: EXAM_NAMES[overview.exam.id] }, locale)}</span>
      <strong>{rangeLabel(overview.exam)}</strong>
    </div>
  {/if}

  <ul class="readiness-skills">
    {#each SKILLS as skill}
      {@const range = overview.skills[skill]}
      <li>
        <span class="readiness-skill">{skillName[skill]}</span>
        <span class="readiness-bar" aria-hidden="true"><i style={`inset-inline-start:${range.low * 100}%;width:${Math.max(2, (range.high - range.low) * 100)}%`}></i><b style={`inset-inline-start:${range.point * 100}%`}></b></span>
        <span class="readiness-value">{range.attempts ? rangeLabel(range) : m.readiness_no_data({}, locale)}</span>
      </li>
    {/each}
  </ul>
  <p class="readiness-hint">{m.readiness_hint({}, locale)}</p>
  {#if forecast && forecast.weeks > 0}
    <p class="readiness-forecast">{m.readiness_forecast({ weeks: formatNumber(settings.formatContext, forecast.weeks), low: formatNumber(settings.formatContext, forecast.low), high: formatNumber(settings.formatContext, forecast.high), level: settings.vocabularyLevel.toUpperCase() }, locale)}</p>
  {/if}

  <h3>{m.readiness_ladder({}, locale)}</h3>
  <ol class="readiness-ladder">
    {#each overview.ladder as rung (rung.level)}
      <li class:current={rung.level === settings.vocabularyLevel}>
        <span class="readiness-level">{rung.level.toUpperCase()}</span>
        <span class="readiness-rung" role="img" aria-label={`${m.readiness_started({}, locale)} ${formatPercent(settings.formatContext, rung.coverage)}, ${m.readiness_known({}, locale)} ${formatPercent(settings.formatContext, rung.mastery)}`}>
          <i style={`width:${rung.coverage * 100}%`}></i><b style={`width:${rung.mastery * 100}%`}></b>
        </span>
        <span class="readiness-value">{formatPercent(settings.formatContext, rung.mastery)}</span>
      </li>
    {/each}
  </ol>
  <p class="readiness-legend"><span class="started"></span>{m.readiness_started({}, locale)}<span class="known"></span>{m.readiness_known({}, locale)}</p>

  {#if overview.errors.length}
    <h3>{m.readiness_errors({}, locale)}</h3>
    <ul class="readiness-errors">
      {#each overview.errors as error (error.feature)}<li><span>{featureLabel(error.feature)}</span><strong>{formatNumber(settings.formatContext, error.count)}</strong></li>{/each}
    </ul>
  {/if}
</section>

<style>
  .readiness-known { margin: .35rem 0 0; font-size: 1.05rem; font-weight: 900; }
  .readiness-due { margin-inline-start: .4rem; padding: .05rem .4rem; border-radius: 999px; background: #e6a527; color: #172a45; font-size: .55rem; }
  .readiness-forecast { margin: .55rem 0 0; padding: .5rem .65rem; border-radius: .6rem; background: color-mix(in oklch, var(--color-success, #2f8f5b) 12%, transparent); font-size: .68rem; font-weight: 800; line-height: 1.4; }
  .readiness-trend { display: flex; gap: .5rem; margin: .5rem 0 0; padding: 0; list-style: none; }
  .readiness-trend li { display: grid; gap: .1rem; padding: .35rem .6rem; border-radius: .6rem; background: color-mix(in oklch, currentColor 8%, transparent); font-size: .74rem; font-weight: 900; text-align: center; }
  .readiness-trend small { font-size: .56rem; font-weight: 700; opacity: .65; }
  .readiness-placement { display: inline-block; margin-top: .3rem; color: #a45e38; font-size: .64rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
  :global(html.dark) .readiness-placement { color: #e6a527; }
  .readiness-exam { display: flex; justify-content: space-between; gap: .5rem; margin-top: .6rem; padding: .55rem .7rem; border-radius: .7rem; background: color-mix(in oklch, var(--color-primary) 14%, transparent); font-size: .72rem; font-weight: 800; }
  .readiness-skills, .readiness-ladder, .readiness-errors { display: grid; gap: .45rem; margin: .7rem 0 0; padding: 0; list-style: none; }
  .readiness-skills li, .readiness-ladder li { display: grid; grid-template-columns: 5.6rem 1fr 4.4rem; align-items: center; gap: .55rem; font-size: .7rem; font-weight: 800; }
  .readiness-ladder li { grid-template-columns: 2rem 1fr 3rem; }
  .readiness-ladder li.current .readiness-level { color: var(--color-accent); }
  .readiness-bar, .readiness-rung { position: relative; height: .55rem; border-radius: 999px; background: color-mix(in oklch, currentColor 12%, transparent); overflow: hidden; }
  .readiness-bar i { position: absolute; inset-block: 0; border-radius: 999px; background: color-mix(in oklch, var(--color-success, #2f8f5b) 45%, transparent); }
  .readiness-bar b { position: absolute; inset-block: 0; width: .2rem; margin-inline-start: -.1rem; background: var(--color-success, #2f8f5b); }
  .readiness-rung i, .readiness-rung b { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 999px; }
  .readiness-rung i { background: color-mix(in oklch, var(--color-primary) 35%, transparent); }
  .readiness-rung b { background: var(--color-success, #2f8f5b); }
  .readiness-value { text-align: end; font-variant-numeric: tabular-nums; opacity: .75; }
  .readiness-hint, .readiness-legend { margin: .55rem 0 0; font-size: .58rem; font-weight: 700; line-height: 1.35; opacity: .6; }
  .readiness-legend { display: flex; align-items: center; gap: .3rem; }
  .readiness-legend span { display: inline-block; width: .6rem; height: .6rem; border-radius: 999px; margin-inline-start: .5rem; }
  .readiness-legend .started { margin-inline-start: 0; background: color-mix(in oklch, var(--color-primary) 35%, transparent); }
  .readiness-legend .known { background: var(--color-success, #2f8f5b); }
  h3 { margin: 1rem 0 0; color: var(--color-accent); font-size: .56rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
  .readiness-errors li { display: flex; justify-content: space-between; font-size: .7rem; font-weight: 800; }
  @media (prefers-reduced-motion: no-preference) {
    .readiness-bar i, .readiness-rung i, .readiness-rung b { transition: width .4s cubic-bezier(.23, 1, .32, 1), inset-inline-start .4s cubic-bezier(.23, 1, .32, 1); }
  }
</style>
