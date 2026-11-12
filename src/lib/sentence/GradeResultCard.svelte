<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
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
  const sourceLabel = $derived(
    result.source === 'llm'
      ? m.grade_source_llm({}, { locale: settings.interfaceLocale })
      : m.grade_source_rules({}, { locale: settings.interfaceLocale })
  );

  function factorLabel(factor: GradeFactor): string {
    const locale = settings.interfaceLocale;
    const params = { value: String(factor.value ?? 0), expected: String(factor.expected ?? 0) };
    switch (factor.key) {
      case 'lengthTooShort': return m.factor_length_too_short(params, { locale });
      case 'lengthGood': return m.factor_length_good(params, { locale });
      case 'lengthTooLong': return m.factor_length_too_long(params, { locale });
      case 'noSentenceEnd': return m.factor_no_sentence_end({}, { locale });
      case 'sentenceCountLow': return m.factor_sentence_count_low(params, { locale });
      case 'sentenceCountGood': return m.factor_sentence_count_good(params, { locale });
      case 'startNotCapitalized': return m.factor_start_not_capitalized(params, { locale });
      case 'nounsNotCapitalized': return m.factor_nouns_not_capitalized(params, { locale });
      case 'commasMissing': return m.factor_commas_missing(params, { locale });
      case 'varietyLow': return m.factor_variety_low(params, { locale });
      case 'varietyGood': return m.factor_variety_good(params, { locale });
      case 'paragraphSingle': return m.factor_paragraph_single({}, { locale });
      case 'paragraphGood': return m.factor_paragraph_good(params, { locale });
      case 'spacingOdd': return m.factor_spacing_odd({}, { locale });
      case 'allGood': return m.factor_all_good({}, { locale });
      case 'llmTooShort': return m.factor_llm_too_short({}, { locale });
      case 'llmTooLong': return m.factor_llm_too_long({}, { locale });
      case 'llmPunctuation': return m.factor_llm_punctuation({}, { locale });
      case 'llmCapitalisation': return m.factor_llm_capitalisation({}, { locale });
      case 'llmNouns': return m.factor_llm_nouns({}, { locale });
      case 'llmCommas': return m.factor_llm_commas({}, { locale });
      case 'llmVariety': return m.factor_llm_variety({}, { locale });
      case 'llmStructure': return m.factor_llm_structure({}, { locale });
      case 'llmSpacing': return m.factor_llm_spacing({}, { locale });
      case 'llmGrammar': return m.factor_llm_grammar({}, { locale });
      case 'llmNoIssues': return m.factor_llm_no_issues({}, { locale });
      default: return '';
    }
  }
</script>

<section class="grade-card" aria-live="polite">
  <div class="grade-score" data-verdict={result.verdict}>
    <span class="grade-number">{Math.round(result.score * 100)}<small>%</small></span>
    <span class="grade-verdict">{verdictLabel}</span>
  </div>
  <p class="grade-stats">
    {m.sentence_words({ count: num(result.words) }, { locale: settings.interfaceLocale })}
    {#if result.paragraphs > 1}
      · {m.full_text_paragraphs({ count: num(result.paragraphs) }, { locale: settings.interfaceLocale })}
    {/if}
    · <span class="grade-source">{sourceLabel}</span>
  </p>
  {#if result.comment}
    <p class="grade-comment">{result.comment}</p>
  {/if}
  {#if result.factors.length}
    <ul class="grade-factors">
      {#each result.factors as factor (factor.key + (factor.value ?? ''))}
        <li class="grade-factor" data-key={factor.key}>{factorLabel(factor)}</li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .grade-card { display: grid; gap: 0.65rem; padding: 1rem 1.1rem; border: 1px solid rgba(23, 42, 69, 0.16); border-radius: 1rem; background: #fffdf7; box-shadow: 0 8px 22px rgba(23, 42, 69, 0.07); }
  .grade-score { display: flex; align-items: baseline; gap: 0.6rem; }
  .grade-number { color: #172a45; font-family: 'DM Serif Display', serif; font-size: 2.4rem; line-height: 1; }
  .grade-number small { font-size: 1rem; }
  .grade-score[data-verdict='high'] .grade-number { color: #34824d; }
  .grade-score[data-verdict='ok'] .grade-number { color: #c9862b; }
  .grade-score[data-verdict='low'] .grade-number { color: #c9604e; }
  .grade-verdict { color: #596477; font-family: 'DM Sans', sans-serif; font-size: .9rem; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; }
  .grade-stats { margin: 0; color: #7b8494; font-family: 'DM Sans', sans-serif; font-size: .875rem; font-weight: 700; }
  .grade-source { color: #a45e38; }
  .grade-comment { margin: 0; padding: 0.5rem 0.65rem; border-radius: 0.55rem; background: rgba(247, 226, 176, 0.45); color: #243449; font-family: 'DM Sans', sans-serif; font-size: .95rem; font-weight: 600; line-height: 1.5; }
  .grade-factors { display: grid; gap: 0.3rem; margin: 0; padding: 0; list-style: none; }
  .grade-factor { padding: 0.4rem 0.6rem; border-radius: 0.55rem; background: #fbf7ee; color: #243449; font-family: 'DM Sans', sans-serif; font-size: .9rem; font-weight: 600; line-height: 1.4; }
  .grade-factor[data-key='lengthGood'],
  .grade-factor[data-key='sentenceCountGood'],
  .grade-factor[data-key='varietyGood'],
  .grade-factor[data-key='paragraphGood'],
  .grade-factor[data-key='allGood'],
  .grade-factor[data-key='llmNoIssues'] { background: #e9f3ec; color: #2f6f45; }
  :global(html.dark) .grade-card { border-color: rgba(255, 253, 247, 0.24); background: #152b47; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3); }
  :global(html.dark) .grade-number { color: #fffdf7; }
  :global(html.dark) .grade-comment { background: rgba(230, 165, 39, 0.16); color: rgba(255, 253, 247, 0.9); }
  :global(html.dark) .grade-factor { background: rgba(255, 253, 247, 0.06); color: rgba(255, 253, 247, 0.9); }
  :global(html.dark) .grade-factor[data-key='lengthGood'],
  :global(html.dark) .grade-factor[data-key='sentenceCountGood'],
  :global(html.dark) .grade-factor[data-key='varietyGood'],
  :global(html.dark) .grade-factor[data-key='paragraphGood'],
  :global(html.dark) .grade-factor[data-key='allGood'],
  :global(html.dark) .grade-factor[data-key='llmNoIssues'] { background: rgba(52, 130, 77, 0.28); color: #b6e3c4; }
</style>
