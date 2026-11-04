<!--
  A word as the learner should remember it: nouns carry their article in their gender's colour
  (blue masculine, red feminine, green neuter; see .gender-* in app.css), the same in every mode.
-->
<script lang="ts">
  import { articleFor, wordMetadata, type Language } from '#lib/data/vocabulary.js';

  let { word, language }: { word: string; language: Language } = $props();

  const entry = $derived(wordMetadata[language]?.[word]);
  const article = $derived(articleFor(language, word));
  const spelling = $derived(entry?.spelling ?? word);
  const gender = $derived(entry?.type === 'noun' ? entry.gender : undefined);
</script>

<span class={gender ? `gender-${gender}` : ''} lang={language}>{#if article}<span class="gender-article">{article}</span> {/if}<span class:gender-word={Boolean(gender)}>{spelling}</span></span>
