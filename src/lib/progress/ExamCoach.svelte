<!--
  The exam half of /progress, built to keep a learner preparing: a hero with readiness for the
  target exam (or the current level) as a ring, the forecast and the next checkpoint; "today for
  your goal" with up to three concrete steps; the six skills as tiles that lead to practice; and
  the level ladder with the checkpoint history. Only the selected learning language counts.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatDate, formatNumber, formatPercent } from '#lib/format/format.js';
  import { checkpointDue, checkpointTrend, nextCheckpointAt, readCheckpoints, type CheckpointResult } from '#lib/assessment/checkpoints.js';
  import { SKILLS, LEVELS, type Skill } from '#lib/domain/types.js';
  import { labelKeys, type FeatureKey } from '#lib/grammar/taxonomy.js';
  import { dueReviewCount } from '#lib/review/ledger.js';
  import { readDueVocabulary, readLevelStates } from '#lib/vocab/spacedRepetition.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { readEvents } from './eventLog.js';
  import { featureStats, type LearningEvent } from './events.js';
  import { buildOverview } from './overview.js';
  import { forecastWeeks, readinessPercent, type ReadinessRange } from './skillState.js';
  import { storeSnapshot, weeklySeries, type MasterySnapshot } from './masteryHistory.js';
  import IconArrow from '~icons/material-symbols/arrow-forward-rounded';
  import IconQuiz from '~icons/material-symbols/fact-check-rounded';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const FORECAST_TARGET = 0.8;
  // Where each skill is practised.
  const PRACTICE: Record<Skill, string> = { vocab: '/vocab', grammar: '/grammar', reading: '/reading', listening: '/listen', speaking: '/pronunciation', writing: '/sentence' };

  let events = $state<LearningEvent[]>([]);
  let checkpoints = $state<CheckpointResult[]>([]);
  let history = $state<MasterySnapshot[]>([]);
  let dueWords = $state(0);
  onMount(() => {
    checkpoints = readCheckpoints();
    dueWords = readDueVocabulary(settings.lang, settings.vocabularyLevel) + dueReviewCount(settings.lang);
    void readEvents(Date.now() - 31 * DAY_MS).then((loaded) => (events = loaded.filter((event) => event.lang === settings.lang)));
  });

  const locale = $derived({ locale: settings.interfaceLocale });
  const overview = $derived(buildOverview({
    levels: Object.fromEntries(LEVELS.map((level) => [level, readLevelStates(settings.lang, level)])),
    events,
    level: settings.vocabularyLevel,
    now: Date.now()
  }));
  // Readiness for the current level, all six skills weighed equally.
  const headline = $derived<ReadinessRange>(overview.readiness);
  const percent = $derived(readinessPercent(headline));
  const practised = $derived(SKILLS.some((skill) => overview.skills[skill].attempts > 0));

  const due = $derived(checkpointDue(checkpoints, settings.lang, Date.now(), settings.dailyGoal()));
  const nextAt = $derived(nextCheckpointAt(checkpoints, settings.lang, settings.dailyGoal()));
  const trend = $derived(checkpointTrend(checkpoints, settings.lang));

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
  const number = (value: number) => formatNumber(settings.formatContext, value);
  function rangeLabel(range: ReadinessRange) {
    const { low, high } = readinessPercent(range);
    return m.readiness_range({ low: number(low), high: number(high) }, locale);
  }
  type MessageFn = (inputs: object, options: { locale: string }) => string;
  const messages = m as unknown as Record<string, MessageFn | undefined>;
  const featureLabel = (key: FeatureKey) => {
    const keys = labelKeys(key);
    const category = messages[keys.category]?.({}, locale);
    const value = messages[keys.value]?.({}, locale);
    return category && value ? `${category} · ${value}` : key;
  };

  // Up to three concrete next steps: the weakest practised skill, the weakest grammar feature and due words.
  const weakestSkill = $derived(SKILLS.filter((skill) => overview.skills[skill].attempts >= 5).sort((a, b) => overview.skills[a].point - overview.skills[b].point)[0]);
  const weakFeature = $derived(featureStats(events, Date.now() - 30 * DAY_MS).find((stat) => stat.accuracy < 0.7));
</script>

<!-- Hero: how ready, for what, and the next step to find out for sure -->
<section class="coach-hero panel-play" aria-labelledby="coach-title">
  <div class="coach-hero-top">
    <div class="coach-ring" style={`--low:${headline.low};--high:${headline.high}`} role="img" aria-label={rangeLabel(headline)}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle class="track" cx="18" cy="18" r="15.5" pathLength="100" />
        <circle class="range" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray={`${(headline.high - headline.low) * 100} 100`} stroke-dashoffset={-headline.low * 100} />
        <circle class="value" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray={`${headline.point * 100} 100`} />
      </svg>
      <span class="coach-ring-text">{#if practised}<strong>{number(percent.low)}–{number(percent.high)}</strong><small>%</small>{:else}<strong>–</strong>{/if}</span>
    </div>
    <div class="coach-hero-text">
      <p class="coach-kicker">{m.coach_title({}, locale)}</p>
      <h2 id="coach-title">{m.coach_ready_level({ level: settings.vocabularyLevel.toUpperCase() }, locale)}</h2>
      <p class="coach-sub">{practised ? m.readiness_known_words({ count: number(overview.knownWords) }, locale) : m.coach_no_data({}, locale)}</p>
    </div>
    <span class="coach-mia" aria-hidden="true"><StoryCharacter id="mia" mood={practised && headline.point >= 0.6 ? 'happy' : 'curious'} still /></span>
  </div>
  {#if forecast && forecast.weeks > 0}
    <p class="coach-forecast">{m.readiness_forecast({ weeks: number(forecast.weeks), low: number(forecast.low), high: number(forecast.high), level: settings.vocabularyLevel.toUpperCase() }, locale)}</p>
  {/if}
  <a class="btn-play {due ? 'btn-play-ink' : 'btn-play-soft'} coach-test" href="/placement"><IconQuiz aria-hidden="true" />{due ? m.coach_test_now({}, locale) : m.coach_test_again({}, locale)}</a>
  {#if !due && nextAt}<p class="coach-next">{m.checkpoint_next({ date: formatDate(settings.formatContext, nextAt, 'dayMonthShort') }, locale)}</p>{/if}
</section>

<!-- Today for the goal: concrete steps instead of a wall of numbers -->
{#if weakestSkill || weakFeature || dueWords > 0}
  <section class="coach-focus" aria-labelledby="coach-focus-title">
    <h2 id="coach-focus-title" class="coach-heading">{m.coach_focus({}, locale)}</h2>
    <ul>
      {#if dueWords > 0}
        <li><a class="card-play coach-step" href="/repeat"><span><strong>{m.coach_focus_due({ count: number(dueWords) }, locale)}</strong><small>{m.coach_focus_due_hint({}, locale)}</small></span><IconArrow aria-hidden="true" /></a></li>
      {/if}
      {#if weakestSkill}
        <li><a class="card-play coach-step" href={PRACTICE[weakestSkill]}><span><strong>{m.coach_focus_skill({ skill: skillName[weakestSkill] }, locale)}</strong><small>{m.coach_focus_skill_hint({ range: rangeLabel(overview.skills[weakestSkill]) }, locale)}</small></span><IconArrow aria-hidden="true" /></a></li>
      {/if}
      {#if weakFeature}
        <li><a class="card-play coach-step" href="/grammar"><span><strong>{m.coach_focus_feature({ feature: featureLabel(weakFeature.feature) }, locale)}</strong><small>{m.coach_focus_feature_hint({ percent: formatPercent(settings.formatContext, weakFeature.accuracy) }, locale)}</small></span><IconArrow aria-hidden="true" /></a></li>
      {/if}
    </ul>
  </section>
{/if}

<!-- Skills: each tile shows its range and leads straight to practice -->
<section class="panel-play coach-card" aria-labelledby="coach-skills-title">
  <h2 id="coach-skills-title" class="coach-heading">{m.coach_skills({}, locale)}</h2>
  <ul class="coach-skills">
    {#each SKILLS as skill (skill)}
      {@const range = overview.skills[skill]}
      <li>
        <a href={PRACTICE[skill]} class="coach-skill" class:empty={!range.attempts}>
          <span class="coach-skill-name">{skillName[skill]}</span>
          <span class="coach-skill-value">{range.attempts ? rangeLabel(range) : m.readiness_no_data({}, locale)}</span>
          <span class="coach-skill-bar" aria-hidden="true"><i style={`inset-inline-start:${range.low * 100}%;width:${Math.max(3, (range.high - range.low) * 100)}%`}></i><b style={`inset-inline-start:${range.point * 100}%`}></b></span>
        </a>
      </li>
    {/each}
  </ul>
  <p class="coach-hint">{m.readiness_hint({}, locale)}</p>
</section>

<!-- Levels and tests: where the words stand per level, and how the last checkpoints went -->
<section class="panel-play coach-card" aria-labelledby="coach-levels-title">
  <h2 id="coach-levels-title" class="coach-heading">{m.coach_levels({}, locale)}</h2>
  <ol class="coach-ladder">
    {#each overview.ladder as rung (rung.level)}
      <li class:current={rung.level === settings.vocabularyLevel}>
        <span class="coach-level">{rung.level.toUpperCase()}</span>
        <span class="coach-rung" role="img" aria-label={`${m.readiness_started({}, locale)} ${formatPercent(settings.formatContext, rung.coverage)}, ${m.readiness_known({}, locale)} ${formatPercent(settings.formatContext, rung.mastery)}`}><i style={`width:${rung.coverage * 100}%`}></i><b style={`width:${rung.mastery * 100}%`}></b></span>
        <span class="coach-rung-value">{formatPercent(settings.formatContext, rung.mastery)}</span>
      </li>
    {/each}
  </ol>
  <p class="coach-legend"><span class="started"></span>{m.readiness_started({}, locale)}<span class="known"></span>{m.readiness_known({}, locale)}</p>
  {#if trend.length}
    <h3 class="coach-subheading">{m.checkpoint_trend({}, locale)}</h3>
    <ol class="coach-trend">
      {#each trend as entry (entry.at)}
        <li class:up={entry.change > 0} class:down={entry.change < 0}><strong>{entry.level.toUpperCase()}{#if entry.change > 0} ↑{:else if entry.change < 0} ↓{/if}</strong><small>{formatDate(settings.formatContext, entry.at, 'dayMonthShort')}</small></li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .coach-heading { margin:0;color:var(--color-accent);font-size:.56rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .coach-subheading { margin:.9rem 0 0;color:var(--color-accent);font-size:.52rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .coach-card { margin-top:1rem;padding:.9rem 1rem 1rem; }
  .coach-hint,.coach-legend { margin:.55rem 0 0;font-size:.58rem;font-weight:700;line-height:1.35;opacity:.6; }

  .coach-hero { margin-top:1.1rem;display:grid;gap:.7rem;padding:1rem;background:radial-gradient(circle at 15% 0%,rgba(230,165,39,.22),transparent 55%),var(--color-base-100,#fffdf7); }
  .coach-hero-top { display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.8rem; }
  .coach-ring { position:relative;width:6.2rem;height:6.2rem; }
  .coach-ring svg { width:100%;height:100%;rotate:-90deg; }
  .coach-ring circle { fill:none;stroke-width:3.4;stroke-linecap:round; }
  .coach-ring .track { stroke:color-mix(in oklch,currentColor 12%,transparent); }
  .coach-ring .range { stroke:color-mix(in oklch,#34824d 32%,transparent);stroke-width:5; }
  .coach-ring .value { stroke:#34824d;transition:stroke-dasharray .8s cubic-bezier(.23,1,.32,1); }
  .coach-ring-text { position:absolute;inset:0;display:flex;align-items:baseline;justify-content:center;padding-top:2.15rem;gap:.05rem; }
  .coach-ring-text strong { font-family:'DM Serif Display',serif;font-size:1.25rem;font-weight:400;line-height:1;font-variant-numeric:tabular-nums; }
  .coach-ring-text small { font-size:.7rem;font-weight:900; }
  .coach-kicker { margin:0;color:var(--color-accent);font-size:.56rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .coach-hero h2 { margin:.15rem 0 0;font-family:'DM Serif Display',serif;font-size:1.35rem;font-weight:400;line-height:1.05; }
  .coach-sub { margin:.25rem 0 0;font-size:.66rem;font-weight:800;opacity:.7; }
  .coach-mia { display:block;width:3.4rem;height:4.4rem;align-self:end; }
  .coach-forecast { margin:0;padding:.5rem .7rem;border-radius:.7rem;background:color-mix(in oklch,#34824d 12%,transparent);font-size:.68rem;font-weight:800;line-height:1.4; }
  .coach-test { justify-content:center;min-height:2.8rem;text-decoration:none; }
  .coach-test :global(svg) { width:1.1rem;height:1.1rem; }
  .coach-next { margin:-.3rem 0 0;text-align:center;font-size:.6rem;font-weight:700;opacity:.65; }

  .coach-focus { margin-top:1.2rem; }
  .coach-focus ul { display:grid;gap:.5rem;margin:.5rem 0 0;padding:0;list-style:none; }
  .coach-step { display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.7rem .85rem;color:inherit;text-decoration:none;border-inline-start:5px solid #e6a527; }
  .coach-step span { display:grid;gap:.15rem;min-width:0; }
  .coach-step strong { font-size:.78rem;font-weight:900;line-height:1.3; }
  .coach-step small { font-size:.62rem;font-weight:700;opacity:.65; }
  .coach-step :global(svg) { flex:none;width:1.2rem;height:1.2rem;color:var(--color-accent); }

  .coach-skills { display:grid;grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr));gap:.5rem;margin:.6rem 0 0;padding:0;list-style:none; }
  .coach-skill { display:grid;gap:.3rem;padding:.6rem .65rem;border:1.5px solid color-mix(in oklch,currentColor 16%,transparent);border-radius:.8rem;color:inherit;text-decoration:none;transition:border-color .2s,translate .2s; }
  .coach-skill:hover { border-color:#e6a527;translate:0 -1px; }
  .coach-skill.empty { opacity:.6; }
  .coach-skill-name { font-size:.7rem;font-weight:900; }
  .coach-skill-value { font-size:.62rem;font-weight:800;opacity:.7;font-variant-numeric:tabular-nums; }
  .coach-skill-bar { position:relative;height:.45rem;border-radius:999px;background:color-mix(in oklch,currentColor 12%,transparent);overflow:hidden; }
  .coach-skill-bar i { position:absolute;inset-block:0;border-radius:999px;background:color-mix(in oklch,#34824d 40%,transparent); }
  .coach-skill-bar b { position:absolute;inset-block:0;width:.2rem;margin-inline-start:-.1rem;background:#34824d; }

  .coach-ladder { display:grid;gap:.45rem;margin:.6rem 0 0;padding:0;list-style:none; }
  .coach-ladder li { display:grid;grid-template-columns:2rem 1fr 3rem;align-items:center;gap:.55rem;font-size:.7rem;font-weight:800; }
  .coach-ladder li.current .coach-level { color:var(--color-accent); }
  .coach-rung { position:relative;height:.55rem;border-radius:999px;background:color-mix(in oklch,currentColor 12%,transparent);overflow:hidden; }
  .coach-rung i,.coach-rung b { position:absolute;inset-block:0;inset-inline-start:0;border-radius:999px; }
  .coach-rung i { background:color-mix(in oklch,var(--color-primary) 35%,transparent); }
  .coach-rung b { background:#34824d; }
  .coach-rung-value { text-align:end;font-variant-numeric:tabular-nums;opacity:.75; }
  .coach-legend { display:flex;align-items:center;gap:.3rem; }
  .coach-legend span { display:inline-block;width:.6rem;height:.6rem;border-radius:999px;margin-inline-start:.5rem; }
  .coach-legend .started { margin-inline-start:0;background:color-mix(in oklch,var(--color-primary) 35%,transparent); }
  .coach-legend .known { background:#34824d; }
  .coach-trend { display:flex;gap:.5rem;margin:.45rem 0 0;padding:0;list-style:none; }
  .coach-trend li { display:grid;gap:.1rem;padding:.35rem .65rem;border-radius:.6rem;background:color-mix(in oklch,currentColor 8%,transparent);text-align:center; }
  .coach-trend li.up { background:color-mix(in oklch,#34824d 16%,transparent); }
  .coach-trend li.down { background:color-mix(in oklch,#c0392b 14%,transparent); }
  .coach-trend strong { font-size:.78rem;font-weight:900; }
  .coach-trend small { font-size:.56rem;font-weight:700;opacity:.65; }
  @media (prefers-reduced-motion:reduce) { .coach-ring .value,.coach-skill { transition:none; } }
  :global(html.dark) .coach-hero { background:radial-gradient(circle at 15% 0%,rgba(230,165,39,.18),transparent 55%),#213a5d; }
</style>
