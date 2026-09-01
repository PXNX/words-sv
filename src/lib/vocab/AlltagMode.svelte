<script lang="ts">
  import { settings } from '$lib/state/settings.svelte';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  type Item = { word: string; meaning: string; category: 'Präpositionen' | 'Zahlen' | 'Farben' };
  const items: Item[] = [
    { word: 'an', meaning: 'at / on', category: 'Präpositionen' }, { word: 'auf', meaning: 'on / onto', category: 'Präpositionen' }, { word: 'aus', meaning: 'from / out of', category: 'Präpositionen' }, { word: 'bei', meaning: 'at / near', category: 'Präpositionen' }, { word: 'durch', meaning: 'through', category: 'Präpositionen' }, { word: 'für', meaning: 'for', category: 'Präpositionen' }, { word: 'gegen', meaning: 'against / around', category: 'Präpositionen' }, { word: 'mit', meaning: 'with', category: 'Präpositionen' }, { word: 'nach', meaning: 'after / to', category: 'Präpositionen' }, { word: 'ohne', meaning: 'without', category: 'Präpositionen' }, { word: 'über', meaning: 'over / about', category: 'Präpositionen' }, { word: 'unter', meaning: 'under', category: 'Präpositionen' },
    { word: 'eins', meaning: 'one', category: 'Zahlen' }, { word: 'zwei', meaning: 'two', category: 'Zahlen' }, { word: 'drei', meaning: 'three', category: 'Zahlen' }, { word: 'vier', meaning: 'four', category: 'Zahlen' }, { word: 'fünf', meaning: 'five', category: 'Zahlen' }, { word: 'sechs', meaning: 'six', category: 'Zahlen' }, { word: 'sieben', meaning: 'seven', category: 'Zahlen' }, { word: 'acht', meaning: 'eight', category: 'Zahlen' }, { word: 'neun', meaning: 'nine', category: 'Zahlen' }, { word: 'zehn', meaning: 'ten', category: 'Zahlen' }, { word: 'zwanzig', meaning: 'twenty', category: 'Zahlen' }, { word: 'hundert', meaning: 'one hundred', category: 'Zahlen' },
    { word: 'rot', meaning: 'red', category: 'Farben' }, { word: 'blau', meaning: 'blue', category: 'Farben' }, { word: 'gelb', meaning: 'yellow', category: 'Farben' }, { word: 'grün', meaning: 'green', category: 'Farben' }, { word: 'orange', meaning: 'orange', category: 'Farben' }, { word: 'violett', meaning: 'purple', category: 'Farben' }, { word: 'rosa', meaning: 'pink', category: 'Farben' }, { word: 'braun', meaning: 'brown', category: 'Farben' }, { word: 'schwarz', meaning: 'black', category: 'Farben' }, { word: 'weiß', meaning: 'white', category: 'Farben' }
  ];

  let index = $state(0);
  let choices = $state<Item[]>([]);
  let answer = $state<string | null>(null);
  const current = $derived(items[index]);
  const correct = $derived(answer === current.meaning);
  const colorValues: Record<string, string> = { rot: '#d64b45', blau: '#4b78c2', gelb: '#e6b52e', grün: '#55a66a', orange: '#e27a35', violett: '#8a62b6', rosa: '#df8eb1', braun: '#8c5b3d', schwarz: '#222832', weiß: '#fffdf7' };
  const colorEmoji: Record<string, string> = { rot: '🔴', blau: '🔵', gelb: '🟡', grün: '🟢', orange: '🟠', violett: '🟣', rosa: '🩷', braun: '🟤', schwarz: '⚫', weiß: '⚪' };
  const numberEmoji: Record<string, string> = { eins: '1️⃣', zwei: '2️⃣', drei: '3️⃣', vier: '4️⃣', fünf: '5️⃣', sechs: '6️⃣', sieben: '7️⃣', acht: '8️⃣', neun: '9️⃣', zehn: '🔟' };
  const prepositionEmoji: Record<string, string> = { an: '📍', auf: '⬆️', aus: '🚪', bei: '📍', durch: '➡️', für: '🎁', gegen: '⚔️', mit: '🤝', nach: '🧭', ohne: '🚫', über: '⬆️', unter: '⬇️' };
  const currentEmoji = $derived(current.category === 'Farben' ? colorEmoji[current.word] : current.category === 'Zahlen' ? numberEmoji[current.word] ?? '🔢' : prepositionEmoji[current.word] ?? '🧩');

  function shuffle<T>(values: T[]) { return [...values].sort(() => Math.random() - .5); }
  function resetChoices() {
    const distractors = shuffle(items.filter((item) => item.category === current.category && item.word !== current.word)).slice(0, 2);
    choices = shuffle([current, ...distractors]);
  }
  function choose(meaning: string) { if (!answer) answer = meaning; }
  function next() { answer = null; index = (index + 1) % items.length; resetChoices(); }
  $effect(() => { current; resetChoices(); });
</script>

<section class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d] border-t-[3px] border-t-double border-t-[#172a45]" aria-label="Alltag vocabulary">
  <header class="text-center"><span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">Alltag · {current.category}</span><h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">Everyday German</h1><p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">Präpositionen, Zahlen und Farben.</p></header>
  <article class="w-[min(100%,28rem)] grid justify-items-center gap-4 p-[clamp(1.4rem,7vw,2.2rem)] border border-neutral border-t-[4px] border-t-double border-t-neutral bg-neutral-content shadow-[8px_8px_0_rgba(164,94,56,.16)]">{#if current.category === 'Farben'}<span class="text-[1.8rem]" aria-hidden="true">{currentEmoji}</span><span class="w-[5.2rem] h-[5.2rem] rounded-full border-4 border-base-content/20 shadow-inner" style={`background:${colorValues[current.word] ?? '#ccc'}`} aria-label="Color sample"></span><p class="m-0 text-accent text-[.62rem] font-extrabold">What is this color called?</p>{:else}<span class="text-[1.8rem]" aria-hidden="true">{currentEmoji}</span><p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]">{current.word}</p><p class="m-0 text-accent text-[.62rem] font-extrabold">Choose the meaning.</p>{/if}</article>
  <div class="w-[min(100%,28rem)] grid gap-[.45rem]">{#each choices as choice}<button type="button" value={choice.meaning} onclick={() => choose(choice.meaning)} disabled={answer !== null} class="min-h-[2.8rem] px-[.75rem] py-[.55rem] flex items-center justify-center gap-[.4rem] border text-[.8rem] font-extrabold disabled:opacity-100 {answer !== null && choice.meaning === current.meaning ? 'border-success bg-success text-[#fffdf7]' : answer === choice.meaning ? 'border-error bg-[#fff2e8] text-error' : 'border-neutral/55 bg-neutral-content text-base-content'}">{choice.meaning}{#if answer !== null && choice.meaning === current.meaning}<IconCheck class="w-[1.15rem] h-[1.15rem]" aria-hidden="true" />{:else if answer === choice.meaning}<IconClose class="w-[1.15rem] h-[1.15rem] text-error" aria-hidden="true" />{/if}</button>{/each}</div>
  {#if answer}<button class="min-h-[2.45rem] px-[1rem] border border-[#172a45] bg-[#172a45] text-[#fffdf7] text-[.64rem] font-black tracking-[.08em] uppercase shadow-[3px_3px_0_#e6a527]" onclick={next}>Continue</button>{/if}
</section>
