<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import type { GradeFactor, GradeResult } from './grading.js';

  let { result }: { result: GradeResult } = $props();

  const verdictLabel = $derived(
    result.verdict === 'high'
      ? m.sentence_verdict_high({}, { locale: settings.interfaceLocale })
      : result.verdict === 'ok'
        ? m.sentence_verdict_ok({}, { locale: settings.interfaceLocale })
        : m.sentence_verdict_low({}, { locale: settings.interfaceLocale })
  );

  function factorLabel(factor: GradeFactor): string {
    const locale = settings.interfaceLocale;
    const params = { value: String(factor.value ?? 0), expected: String(factor.expected ?? 0) };
    switch (factor.key) {
      case 'lengthTooShort': return m.factor_lengthTooShort(params, { locale });
      case 'lengthGood': return m.factor_lengthGood(params, { locale });
      case 'lengthTooLong': return m.factor_lengthTooLong(params, { locale });
      case 'noSentenceEnd': return m.factor_noSentenceEnd({}, { locale });
      case 'sentenceCountLow': return m.factor_sentenceCountLow(params, { locale });
      case 'sentenceCountGood': return m.factor_sentenceCountGood(params, { locale });
      case 'startNotCapitalized': return m.factor_startNotCapitalized(params, { locale });
      case 'nounsNotCapitalized': return m.factor_nounsNotCapitalized(params, { locale });
      case 'commasMissing': return m.factor_commasMissing(params, { locale });
      case 'varietyLow': return m.factor_varietyLow(params, { locale });
      case 'varietyGood': return m.factor_varietyGood(params, { locale });
      case 'paragraphSingle': return m.factor_paragraphSingle({}, { locale });
      case 'paragraphGood': return m.factor_paragraphGood(params, { locale });
      case 'spacingOdd': return m.factor_spacingOdd({}, { locale });
      case 'allGood': return m.factor_allGood({}, { locale });
    }
  }
</script>

<section class="grade-card" aria-live="polite">
  <div class="grade-score" data-verdict={result.verdict}>
    <span class="grade-number">{Math.round(result.score * 100)}<small>%</small></span>
    <span class="grade-verdict">{verdictLabel}</span>
  </div>
  <p class="grade-stats">
    {m.sentence_words({ count: String(result.words) }, { locale: settings.interfaceLocale })}
    {#if result.paragraphs > 1}
      · {m.fullText_paragraphs({ count: String(result.paragraphs) }, { locale: settings.interfaceLocale })}
    {/if}
  </p>
  <ul class="grade-factors">
    {#each result.factors as factor (factor.key + (factor.value ?? ''))}
      <li class="grade-factor" data-key={factor.key}>{factorLabel(factor)}</li>
    {/each}
  </ul>
</section>

<style>
  .grade-card { display: grid; gap: 0.65rem; padding: 1rem 1.1rem; border: 1px solid rgba(23, 42, 69, 0.16); border-radius: 1rem; background: #fffdf7; box-shadow: 0 8px 22px rgba(23, 42, 69, 0.07); }
  .grade-score { display: flex; align-items: baseline; gap: 0.6rem; }
  .grade-number { color: #172a45; font-family: 'DM Serif Display', serif; font-size: 2.4rem; line-height: 1; }
  .grade-number small { font-size: 1rem; }
  .grade-score[data-verdict='high'] .grade-number { color: #34824d; }
  .grade-score[data-verdict='ok'] .grade-number { color: #c9862b; }
  .grade-score[data-verdict='low'] .grade-number { color: #c9604e; }
  .grade-verdict { color: #596477; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; }
  .grade-stats { margin: 0; color: #7b8494; font-family: 'DM Sans', sans-serif; font-size: 0.66rem; font-weight: 700; }
  .grade-factors { display: grid; gap: 0.3rem; margin: 0; padding: 0; list-style: none; }
  .grade-factor { padding: 0.4rem 0.6rem; border-radius: 0.55rem; background: #fbf7ee; color: #243449; font-family: 'DM Sans', sans-serif; font-size: 0.74rem; font-weight: 600; line-height: 1.4; }
  .grade-factor[data-key='lengthGood'],
  .grade-factor[data-key='sentenceCountGood'],
  .grade-factor[data-key='varietyGood'],
  .grade-factor[data-key='paragraphGood'],
  .grade-factor[data-key='allGood'] { background: #e9f3ec; color: #2f6f45; }
  :global(html.dark) .grade-card { border-color: rgba(255, 253, 247, 0.24); background: #152b47; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3); }
  :global(html.dark) .grade-number { color: #fffdf7; }
  :global(html.dark) .grade-factor { background: rgba(255, 253, 247, 0.06); color: rgba(255, 253, 247, 0.9); }
  :global(html.dark) .grade-factor[data-key='lengthGood'],
  :global(html.dark) .grade-factor[data-key='sentenceCountGood'],
  :global(html.dark) .grade-factor[data-key='varietyGood'],
  :global(html.dark) .grade-factor[data-key='paragraphGood'],
  :global(html.dark) .grade-factor[data-key='allGood'] { background: rgba(52, 130, 77, 0.28); color: #b6e3c4; }
</style>
