<!--
  A word as the learner should remember it: nouns carry their article in their gender's colour
  (blue masculine, red feminine, green neuter; see .gender-* in app.css) with a shape in front of it
  (square, circle, triangle), so the gender is never told by colour alone. The same in every mode.
  A language written in another script adds its Latin reading in small type under the word.
-->
<script lang="ts">
  import { articleFor, wordMetadata, type Language } from '#lib/data/vocabulary.js';
  import { scriptFor, transliterate } from '#lib/script/script.js';

  let { word, language, withTransliteration = false }: { word: string; language: Language; withTransliteration?: boolean } = $props();

  const entry = $derived(wordMetadata[language]?.[word]);
  const article = $derived(articleFor(language, word));
  const spelling = $derived(entry?.spelling ?? word);
  const gender = $derived(entry?.type === 'noun' ? entry.gender : undefined);
  const reading = $derived(withTransliteration ? transliterate(language, spelling) : '');
</script>

<span class={gender ? `gender-${gender}` : ''} class:has-transliteration={Boolean(reading)} lang={language} dir={scriptFor(language)?.direction ?? 'auto'}><span class="word-row">{#if gender && article}<span class="gender-shape" aria-hidden="true"></span>{/if}{#if article}<span class="gender-article">{article}</span>{' '}{/if}<span class:gender-word={Boolean(gender)}>{spelling}</span></span>{#if reading}<span class="word-transliteration" lang={language}>{reading}</span>{/if}</span>
