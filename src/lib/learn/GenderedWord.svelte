<!--
  A word as the learner should remember it: nouns carry their article in their gender's colour
  (blue masculine, red feminine, green neuter; see .gender-* in app.css) with a shape in front of it
  (square, circle, triangle), so the gender is never told by colour alone. The same in every mode.
-->
<script lang="ts">
  import { articleFor, wordMetadata, type Language } from '#lib/data/vocabulary.js';

  let { word, language }: { word: string; language: Language } = $props();

  const entry = $derived(wordMetadata[language]?.[word]);
  const article = $derived(articleFor(language, word));
  const spelling = $derived(entry?.spelling ?? word);
  const gender = $derived(entry?.type === 'noun' ? entry.gender : undefined);
</script>

<span class={gender ? `gender-${gender}` : ''} lang={language} dir="auto">{#if gender && article}<span class="gender-shape" aria-hidden="true"></span>{/if}{#if article}<span class="gender-article">{article}</span>{' '}{/if}<span class:gender-word={Boolean(gender)}>{spelling}</span></span>
