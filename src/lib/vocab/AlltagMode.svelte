<script lang="ts">
  import { recordAnswer } from '#lib/profile/cosmetics.svelte.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import { m } from '#lib/paraglide/messages.js';
  import { logAnswer } from '#lib/progress/eventLog.js';
  import { everydayRound, type EverydayItem } from './everyday.js';

  type Item = { word: string; meaning: string; category: 'Präpositionen' | 'Zahlen' | 'Farben' | 'Tiere' };
  const items: Item[] = [
    { word: 'an', meaning: 'at / on', category: 'Präpositionen' }, { word: 'auf', meaning: 'on / onto', category: 'Präpositionen' }, { word: 'aus', meaning: 'from / out of', category: 'Präpositionen' }, { word: 'bei', meaning: 'at / near', category: 'Präpositionen' }, { word: 'durch', meaning: 'through', category: 'Präpositionen' }, { word: 'für', meaning: 'for', category: 'Präpositionen' }, { word: 'gegen', meaning: 'against / around', category: 'Präpositionen' }, { word: 'mit', meaning: 'with', category: 'Präpositionen' }, { word: 'nach', meaning: 'after / to', category: 'Präpositionen' }, { word: 'ohne', meaning: 'without', category: 'Präpositionen' }, { word: 'über', meaning: 'over / about', category: 'Präpositionen' }, { word: 'unter', meaning: 'under', category: 'Präpositionen' },
    { word: '7', meaning: 'sieben', category: 'Zahlen' },
    { word: 'rot', meaning: 'red', category: 'Farben' }, { word: 'blau', meaning: 'blue', category: 'Farben' }, { word: 'gelb', meaning: 'yellow', category: 'Farben' }, { word: 'grün', meaning: 'green', category: 'Farben' }, { word: 'orange', meaning: 'orange', category: 'Farben' }, { word: 'violett', meaning: 'purple', category: 'Farben' }, { word: 'rosa', meaning: 'pink', category: 'Farben' }, { word: 'braun', meaning: 'brown', category: 'Farben' }, { word: 'schwarz', meaning: 'black', category: 'Farben' }, { word: 'weiß', meaning: 'white', category: 'Farben' },
    { word: 'der Hund', meaning: 'dog', category: 'Tiere' }, { word: 'die Katze', meaning: 'cat', category: 'Tiere' }, { word: 'die Maus', meaning: 'mouse', category: 'Tiere' }, { word: 'das Pferd', meaning: 'horse', category: 'Tiere' }, { word: 'die Kuh', meaning: 'cow', category: 'Tiere' }, { word: 'das Schwein', meaning: 'pig', category: 'Tiere' }, { word: 'das Schaf', meaning: 'sheep', category: 'Tiere' }, { word: 'der Vogel', meaning: 'bird', category: 'Tiere' }, { word: 'der Fisch', meaning: 'fish', category: 'Tiere' }, { word: 'der Hase', meaning: 'rabbit', category: 'Tiere' }, { word: 'der Bär', meaning: 'bear', category: 'Tiere' }, { word: 'die Ente', meaning: 'duck', category: 'Tiere' }
  ];

  let index = $state(0);
  let choices = $state<string[]>([]);
  let answer = $state<string | null>(null);
  let numberReverse = $state(false);
  // `index` only ever advances with `% items.length`, so it always names a real item.
  const current = $derived(items[index] as Item);
  const colorEmoji: Record<string, string> = { rot: '🔴', blau: '🔵', gelb: '🟡', grün: '🟢', orange: '🟠', violett: '🟣', rosa: '🩷', braun: '🟤', schwarz: '⚫', weiß: '⚪' };
  const animalEmoji: Record<string, string> = { 'der Hund': '🐕', 'die Katze': '🐈', 'die Maus': '🐁', 'das Pferd': '🐎', 'die Kuh': '🐄', 'das Schwein': '🐖', 'das Schaf': '🐑', 'der Vogel': '🐦', 'der Fisch': '🐟', 'der Hase': '🐇', 'der Bär': '🐻', 'die Ente': '🦆' };
  const numberEmoji: Record<string, string> = { '7': '7️⃣' };
  const prepositionEmoji: Record<string, string> = { an: '📍', auf: '⬆️', aus: '🚪', bei: '📍', durch: '➡️', für: '🎁', gegen: '⚔️', mit: '🤝', nach: '🧭', ohne: '🚫', über: '⬆️', unter: '⬇️' };
  const currentEmoji = $derived(current.category === 'Farben' ? colorEmoji[current.word] : current.category === 'Tiere' ? animalEmoji[current.word] : current.category === 'Zahlen' ? numberEmoji[current.word] ?? '🔢' : prepositionEmoji[current.word] ?? '🧩');

  function shuffle<T>(values: T[]) { return [...values].sort(() => Math.random() - .5); }
  function resetChoices() {
    if (current.category === 'Zahlen') {
      numberReverse = Math.random() < 0.5;
      const expected = numberReverse ? current.word : current.meaning;
      const distractors = numberReverse ? ['1', '2', '3', '4', '5', '6', '8', '9', '10'] : ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'acht', 'neun', 'zehn'];
      choices = shuffle([expected, ...shuffle(distractors).slice(0, 3)]);
      return;
    }
    numberReverse = false;
    const distractors = shuffle(items.filter((item) => item.category === current.category && item.word !== current.word)).slice(0, 2);
    choices = shuffle([current.meaning, ...distractors.map((item) => item.meaning)]);
  }
  // In German and English every other card is an everyday drill: a time, date, number or price.
  const spoken = $derived(settings.lang === 'de' || settings.lang === 'en' ? settings.lang : null);
  let drill = $state<EverydayItem | null>(null);
  let step = 0;
  let drillsShown = 0;
  const expected = $derived(drill ? drill.correct : numberReverse ? current.word : current.meaning);
  const options = $derived(drill ? drill.options : choices);
  const drillQuestion = $derived(drill ? { time: m.alltag_time, date: m.alltag_date, number: m.alltag_number, price: m.alltag_price }[drill.kind]({}, { locale: settings.interfaceLocale }) : '');
  function choose(value: string) {
    if (answer) return;
    answer = value;
    const right = value === expected;
    recordAnswer('alltag', right);
    if (drill) logAnswer(settings.lang, 'alltag', `EVERYDAY:${drill.kind}:${drill.prompt}`, right);
    if (right) void settings.recordStreak('alltag_correct');
  }
  function next() {
    answer = null;
    step += 1;
    if (spoken && step % 2 === 1) {
      // The four kinds take turns: time, date, number, price.
      drill = everydayRound(spoken, 4, Math.random)[drillsShown++ % 4] ?? null;
      return;
    }
    drill = null;
    index = (index + 1) % items.length;
    resetChoices();
  }
  $effect(() => { current; resetChoices(); });
</script>

<section class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d]" aria-label="Emoji vocabulary">
  <header class="text-center"><span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">Emoji · {current.category}</span><h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">Everyday German</h1><p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">Präpositionen, Zahlen, Farben und Tiere.</p></header>
  {#if drill}
    <article class="w-[min(100%,28rem)] grid justify-items-center gap-4 p-[clamp(1.4rem,7vw,2.2rem)] panel-play">
      <span class="text-[1.8rem]" aria-hidden="true">{({ time: '🕒', date: '📅', number: '🔢', price: '🏷️' })[drill.kind]}</span>
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]" lang={settings.lang}>{drill.prompt}</p>
      <p class="m-0 text-accent text-[.62rem] font-extrabold">{drillQuestion}</p>
    </article>
  {:else}
  <article class="w-[min(100%,28rem)] grid justify-items-center gap-4 p-[clamp(1.4rem,7vw,2.2rem)] panel-play">{#if current.category === 'Farben' || current.category === 'Tiere'}<span class="text-[clamp(4rem,18vw,5.5rem)] leading-none" aria-hidden="true">{currentEmoji}</span><p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]">{current.word}</p><p class="m-0 text-accent text-[.62rem] font-extrabold">Choose the meaning.</p>{:else if current.category === 'Zahlen'}<span class="text-[1.8rem]" aria-hidden="true">{currentEmoji}</span><p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]">{numberReverse ? current.meaning : current.word}</p><p class="m-0 text-accent text-[.62rem] font-extrabold">{numberReverse ? 'Which number is this?' : 'How is this number spelled?'}</p>{:else}<span class="text-[1.8rem]" aria-hidden="true">{currentEmoji}</span><p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]">{current.word}</p><p class="m-0 text-accent text-[.62rem] font-extrabold">Choose the meaning.</p>{/if}</article>
  {/if}
  <div class="w-[min(100%,28rem)] grid gap-[.45rem]" lang={drill ? settings.lang : undefined}>{#each options as choice}<button type="button" value={choice} onclick={() => choose(choice)} disabled={answer !== null} class="btn-play btn-play-choice w-full gap-[.4rem] disabled:opacity-100 {answer !== null && choice === expected ? 'bg-success text-[#fffdf7]' : answer === choice ? 'border-error bg-[#fff2e8] text-error shadow-none' : ''}">{choice}{#if answer !== null && choice === expected}<IconCheck class="w-[1.15rem] h-[1.15rem]" aria-hidden="true" />{:else if answer === choice}<IconClose class="w-[1.15rem] h-[1.15rem] text-error" aria-hidden="true" />{/if}</button>{/each}</div>
  <!-- Always in place, so the choices do not move when it appears. -->
  <button class="btn-play btn-play-ink {answer ? '' : 'invisible'}" onclick={next} tabindex={answer ? 0 : -1} aria-hidden={!answer}>{m.alltag_continue({}, { locale: settings.interfaceLocale })}</button>
</section>
