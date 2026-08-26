<script lang="ts">
	  import { onMount, untrack } from 'svelte';
	  import IconCheck from '~icons/material-symbols/check-rounded';
	  import IconClose from '~icons/material-symbols/close-rounded';
	  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import { definitionChoiceWords, insertLearningRepeat, pickLearningSection } from '$lib/modes.js';
  import { prioritizeLearningWords, updateReviewProgress } from '$lib/spacedRepetition.js';

	  type PromptKind = 'word' | 'audio';
	  type AnswerStatus = 'correct' | 'wrong' | null;
	  type VocabularyMetadata = { type: string; gender?: 'masculine' | 'feminine' | 'neuter'; article?: string };
	  type Labels = { title: string; listen: string; section: string; unavailable: string; speechUnavailable: string; chooseDefinition: string; correct: string; tryAgain: string; continue: string; chooseWord: string; audioPrompt: string };
	  let { words, definitions, metadata, language, level, labels, onCorrect = () => {} }: { words: string[]; definitions: Record<string, string>; metadata: Record<string, VocabularyMetadata>; language: string; level: string; labels: Labels; onCorrect?: () => void } = $props();
  const REVIEW_STORAGE_KEY = 'wordcircle-vocabulary-review-v2';
  let section = $state<string[]>([]);
  let queue = $state<string[]>([]);
  let position = $state(0);
  let speechSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let speechStatus = $state('');
  let choiceWords = $state<string[]>([]);
  let promptKind = $state<PromptKind>('word');
  let answerStatus = $state<AnswerStatus>(null);
  let selectedChoice = $state<string | null>(null);
  let sourceKey = $state('');
  let choiceKey = $state('');
  let reviewProgress = $state<Record<string, { repetitions: number; dueAt: number }>>({});

  const currentWord = $derived(queue[position] ?? '');
  const currentDefinition = $derived(definitions[currentWord] ?? '');
		const currentArticle = $derived(articleFor(currentWord));
	const currentDisplayWord = $derived(currentArticle ? `${currentArticle} ${currentWord}` : currentWord);
  const definitionWords = $derived(words.map((word) => word.trim().toUpperCase()).filter((word) => Boolean(definitions[word])));
  const isDefinitionPrompt = $derived(promptKind === 'word');

  function random() { return Math.random(); }
	function speechLocale() { return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[language] ?? language; }
		function articleFor(word: string) { const entry = metadata[word]; if (!entry || entry.type !== 'Substantiv') return ''; if (entry.article) return entry.article; const articlesByGender: Record<string, Record<string, string>> = { de: { masculine: 'der', feminine: 'die', neuter: 'das' } }; return entry.gender ? articlesByGender[language]?.[entry.gender] ?? '' : ''; }
		function displayWord(word: string) { const article = articleFor(word); return article ? `${article} ${word}` : word; }
  function cancelSpeech() { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }
  function speak() {
	    if (!speechSupported || !currentWord) { speechStatus = labels.speechUnavailable; return; }
    speechStatus = '';
    window.speechSynthesis.cancel();
		    const utterance = new SpeechSynthesisUtterance(currentWord);
	    utterance.lang = speechLocale();
    utterance.rate = .84;
	    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(language)) ?? voices.find((voice) => voice.default) ?? null;
    utterance.onerror = () => { speechStatus = labels.speechUnavailable; };
    window.speechSynthesis.speak(utterance);
  }
  function persistProgress() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${REVIEW_STORAGE_KEY}:${language}:${level}`, JSON.stringify(reviewProgress));
  }
  function loadProgress() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(`${REVIEW_STORAGE_KEY}:${language}:${level}`) ?? '{}');
      return parsed && typeof parsed === 'object' ? parsed as Record<string, { repetitions: number; dueAt: number }> : {};
    } catch { return {}; }
  }
  function startSection() {
    cancelSpeech();
    reviewProgress = loadProgress();
    const prioritized = prioritizeLearningWords(definitionWords, reviewProgress);
    section = pickLearningSection(prioritized, random, 6);
    queue = [...section, ...section].sort(() => random() - .5);
    position = 0;
  }
  function resetPrompt() {
    answerStatus = null;
    selectedChoice = null;
    if (!currentWord || !currentDefinition) { choiceWords = []; return; }
    promptKind = position % 2 === 0 ? 'word' : 'audio';
    choiceWords = definitionChoiceWords(currentWord, [...section, ...definitionWords], definitions, random);
  }
  function chooseAnswer(event: MouseEvent) {
    if (answerStatus || !currentWord) return;
    const chosenWord = (event.currentTarget as HTMLButtonElement).value;
    if (!chosenWord) return;
    const correct = chosenWord === currentWord;
    selectedChoice = chosenWord;
    answerStatus = correct ? 'correct' : 'wrong';
    reviewProgress = updateReviewProgress(reviewProgress, currentWord, correct);
    persistProgress();
    if (correct) onCorrect();
    if (!correct) queue = insertLearningRepeat(queue, position, currentWord);
  }
  function continueLearning() {
    cancelSpeech();
    position = position >= queue.length - 1 ? 0 : position + 1;
  }
	  function optionText(word: string) { return isDefinitionPrompt ? definitions[word] : displayWord(word); }

  onMount(() => {
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (!speechSupported) { speechStatus = labels.speechUnavailable; return; }
    const refreshVoices = () => {
      voices = window.speechSynthesis.getVoices();
	      speechStatus = '';
    };
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices); cancelSpeech(); };
  });

  $effect(() => {
    const nextSourceKey = `${language}|${level}|${words.join('|')}`;
    if (nextSourceKey === sourceKey) return;
    sourceKey = nextSourceKey;
    untrack(() => startSection());
  });
  $effect(() => {
    const nextChoiceKey = `${currentWord}|${section.join('|')}|${position}`;
    if (nextChoiceKey === choiceKey) return;
    choiceKey = nextChoiceKey;
    untrack(() => resetPrompt());
  });
</script>

<section class="learning-view" aria-label={labels.title}>
  <header class="learning-header"><span>{labels.section} · {level.toUpperCase()}</span><h1>{labels.title}</h1><p>{Math.min(position + 1, queue.length)} / {queue.length || 6}</p></header>
  {#if !currentWord}
    <div class="learning-empty">{labels.unavailable}</div>
  {:else}
    <article class="learning-card" class:audio-card={promptKind === 'audio'}>
	      {#if promptKind === 'word'}
	        <p class="learning-word" lang={language}>{currentDisplayWord}</p>
	      {:else}
	        <button class="listen-button loud-listen" onclick={speak} disabled={!speechSupported}><IconVolume aria-hidden="true" />{labels.listen}</button>
        <p class="audio-prompt">{labels.audioPrompt}</p>
      {/if}
      {#if speechStatus && promptKind === 'audio'}<p class="speech-fallback">{speechStatus}</p>{/if}
    </article>
    {#if choiceWords.length >= 3}
      <section class="definition-choice" aria-label={isDefinitionPrompt ? labels.chooseDefinition : labels.chooseWord}>
        <p>{isDefinitionPrompt ? labels.chooseDefinition : labels.chooseWord}</p>
	        <div class="definition-options">
	          {#each choiceWords as word}
	            <button type="button" value={word} onclick={chooseAnswer} disabled={answerStatus !== null} class:correct-option={answerStatus !== null && word === currentWord} class:wrong-option={answerStatus === 'wrong' && word === selectedChoice}><span>{optionText(word)}</span>{#if answerStatus !== null && word === currentWord}<IconCheck class="answer-icon answer-icon-correct" aria-label={labels.correct} />{:else if answerStatus === 'wrong' && word === selectedChoice}<IconClose class="answer-icon answer-icon-wrong" aria-label={labels.tryAgain} />{/if}</button>
	          {/each}
	        </div>
	        {#if answerStatus}<button class="continue-learning" onclick={continueLearning}>{labels.continue}</button>{/if}
      </section>
    {:else}<p class="learning-definition">{currentDefinition || labels.unavailable}</p>{/if}
  {/if}
</section>

<style>
  .learning-view { flex:1 1 auto;min-height:0;display:grid;align-content:center;justify-items:center;gap:1rem;padding:clamp(1rem,4vw,2rem);overflow:auto;background:radial-gradient(circle at 50% 15%,rgba(230,165,39,.18),transparent 34%),#ede4d5;border-top:3px double #172a45; }.learning-header { text-align:center; }.learning-header span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase; }.learning-header h1 { margin:.16rem 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,7vw,2.65rem);font-weight:400;line-height:1; }.learning-header p { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.65rem;font-weight:800; }
	  .learning-card { width:min(100%,28rem);min-height:8.2rem;display:grid;align-content:center;justify-items:center;gap:1rem;padding:clamp(1.2rem,6vw,2rem);border:1px solid #172a45;border-top:4px double #172a45;background:#fffdf7;box-shadow:8px 8px 0 rgba(164,94,56,.16);text-align:center; }.learning-word { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(2.35rem,11vw,4rem);font-weight:400;letter-spacing:.06em;line-height:1; }.audio-card { min-height:8.2rem;background:linear-gradient(145deg,#fffdf7,#fff4d9); }.listen-button { display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:2.4rem;padding:0 .95rem;border:1px solid #172a45;border-radius:999px;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }.loud-listen :global(svg) { width:1.1rem;height:1.1rem; }.listen-button:disabled { opacity:.5; }.audio-prompt,.speech-fallback { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;line-height:1.35; }.speech-fallback { color:#a45e38; }
	  .definition-choice { width:min(100%,28rem);display:grid;gap:.55rem; }.definition-choice>p:first-child { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.1em;text-align:center;text-transform:uppercase; }.definition-options { display:grid;gap:.45rem; }.definition-options button { min-height:2.8rem;padding:.55rem .75rem;display:flex;align-items:center;justify-content:space-between;gap:.65rem;border:1px solid rgba(23,42,69,.55);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:700;line-height:1.3;text-align:left;touch-action:manipulation; }.definition-options button>span { flex:1; }.definition-options button:active { transform:scale(.985); }.definition-options button:disabled { opacity:1; }.definition-options button.correct-option { border-color:#34824d;background:#34824d;color:#fffdf7; }.definition-options button.wrong-option { border-color:#a45e38;background:#fff2e8;color:#8e4322; }:global(.answer-icon) { width:1.25rem;height:1.25rem;flex:none; }:global(.answer-icon-correct) { color:#fffdf7; }:global(.answer-icon-wrong) { color:#a45e38; }.continue-learning { justify-self:center;min-height:2.45rem;padding:0 1rem;border:1px solid #172a45;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;box-shadow:3px 3px 0 #e6a527; }.learning-definition,.learning-empty { max-width:24rem;margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:700;line-height:1.45;text-align:center; }.learning-empty { padding:1.2rem;border:1px solid rgba(164,94,56,.42);background:rgba(255,253,247,.8);color:#a45e38; }
	  :global(html.dark) .learning-view { background:radial-gradient(circle at 50% 15%,rgba(230,165,39,.18),transparent 34%),#213a5d; }:global(html.dark) .learning-header h1 { color:#fffdf7; }:global(html.dark) .learning-header p { color:rgba(255,253,247,.68); }:global(html.dark) .learning-card { border-color:#fffdf7;background:#172a45; }:global(html.dark) .audio-card { background:linear-gradient(145deg,#172a45,#294666); }:global(html.dark) .learning-word { color:#fffdf7; }:global(html.dark) .definition-options button { border-color:rgba(255,253,247,.6);background:#172a45;color:#fffdf7; }:global(html.dark) .definition-options button.correct-option { background:#34824d;color:#fffdf7; }:global(html.dark) .definition-options button.wrong-option { background:#69332f;color:#fff7ed; }
</style>
