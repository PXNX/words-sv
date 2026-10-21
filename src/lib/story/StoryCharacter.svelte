<script lang="ts">
  import type { CharacterId, HeldItem, Mood } from './stories';

  // `mouth` (0–1) is driven by the lip sync while this character's line is read aloud; null otherwise.
  // `holding` puts an item in their hand (or, for Lilith, in a bowl at her paws); `still` stops the
  // blinking and wagging, for the small faces in the transcript.
  let { id, talking = false, label = '', mood: feeling = 'neutral', mouth = null, holding = null, still = false }: { id: CharacterId; talking?: boolean; label?: string; mood?: Mood; mouth?: number | null; holding?: HeldItem | null; still?: boolean } = $props();
  // The animals know the five basic moods; the finer ones map onto the closest of those.
  const animalMoods: Record<Mood, Mood> = { neutral: 'neutral', happy: 'happy', sad: 'sad', surprised: 'surprised', curious: 'curious', angry: 'sad', worried: 'sad', laughing: 'happy', sleepy: 'neutral' };
  const lipSynced = $derived(mouth !== null);
  // A sliver of mouth stays visible between syllables, so the lips never vanish mid-sentence.
  const mouthScale = $derived(mouth === null ? undefined : `scaleY(${Math.max(0.12, mouth).toFixed(3)})`);

  // Gradient ids must be unique per instance: the same character can be on screen several times.
  const uid = $props.id();

  // `build` widens the body (and, for 'wide', the face); `accent` colours an apron or a pair of
  // overalls; `checked` lays a check pattern over the top.
  type Look = { skin: string; hair: string; hairStyle: 'bun' | 'short' | 'curly' | 'bob' | 'bald' | 'messy'; top: string; glasses?: boolean; monocle?: boolean; beard?: boolean; stubble?: boolean; moustache?: boolean | 'kaiser'; hat?: 'tyrolean' | 'police' | 'toque' | 'straw'; headphones?: boolean; shades?: boolean; pencil?: boolean; build?: 'wide' | 'muscular'; accent?: string; checked?: boolean; outfit: 'plain' | 'hoodie' | 'cardigan' | 'apron' | 'blazer' | 'tie' | 'tracht' | 'waistcoat' | 'police' | 'chef' | 'overalls' | 'tanktop' | 'scrubs' | 'tshirt' | 'shirt' };
  // Animals are hand-drawn branches below rather than entries in `looks`.
  type Animal = 'bello' | 'lilith' | 'bird' | 'cow' | 'horse' | 'giraffe' | 'elephant' | 'snake';
  const animals: readonly CharacterId[] = ['bello', 'lilith', 'bird', 'cow', 'horse', 'giraffe', 'elephant', 'snake'];
  const looks: Record<Exclude<CharacterId, Animal>, Look> = {
    // Sabine, police officer: peaked cap and navy uniform with a star badge.
    sabine: { skin: '#f0c9a8', hair: '#c9a04a', hairStyle: 'bob', top: '#1f3a6b', hat: 'police', outfit: 'police' },
    // Enzo, pizza baker: chef's hat, white jacket, red neckerchief and a proper moustache.
    enzo: { skin: '#d9a47e', hair: '#1f1a17', hairStyle: 'short', top: '#fffdf7', moustache: true, hat: 'toque', outfit: 'chef' },
    // Jana, programmer: big headphones, glasses and a green hoodie.
    jana: { skin: '#f3d3b8', hair: '#5b3a8a', hairStyle: 'bob', top: '#34824d', glasses: true, headphones: true, outfit: 'hoodie' },
    // Herr Becker, teacher: glasses, a neat beard and a cardigan.
    becker: { skin: '#e9bf9d', hair: '#6b5a4a', hairStyle: 'short', top: '#a45e38', glasses: true, beard: true, outfit: 'cardigan' },
    // Hans from Bavaria: rosy cheeks, full beard, Tyrolean hat and lederhosen braces over a white shirt.
    hans: { skin: '#f1b996', hair: '#7a4a2a', hairStyle: 'short', top: '#fffdf7', beard: true, hat: 'tyrolean', outfit: 'tracht' },
    // Albert from Berlin: grey parting, upturned Kaiser moustache, monocle and a buttoned waistcoat.
    albert: { skin: '#ecc8ab', hair: '#9a968f', hairStyle: 'short', top: '#2a3140', moustache: 'kaiser', monocle: true, outfit: 'waistcoat' },
    mia: { skin: '#f2c7a5', hair: '#c4522e', hairStyle: 'bun', top: '#e6a527', outfit: 'plain' },
    leo: { skin: '#d9a07a', hair: '#3b2a20', hairStyle: 'short', top: '#4b78c2', glasses: true, beard: true, outfit: 'hoodie' },
    oma: { skin: '#f0cfb5', hair: '#d8d4cc', hairStyle: 'bun', top: '#8a62b6', glasses: true, outfit: 'cardigan' },
    tom: { skin: '#8d5a3b', hair: '#1f1a17', hairStyle: 'curly', top: '#fffdf7', outfit: 'apron' },
    kim: { skin: '#f1d2b0', hair: '#1c1f26', hairStyle: 'bob', top: '#172a45', outfit: 'blazer' },
    paul: { skin: '#e8b994', hair: '#a7a49e', hairStyle: 'bald', top: '#8c5b3d', moustache: true, outfit: 'tie' },
    // The German-only cast below has no stories yet; see the cast notes in germanStories.ts.
    // Ali, who runs the döner shop on the corner: thick black moustache, stubble, white T-shirt and a red apron.
    ali: { skin: '#c99068', hair: '#1a1512', hairStyle: 'short', top: '#fffdf7', moustache: true, stubble: true, accent: '#c0392b', outfit: 'apron' },
    // Robert the handyman: stubble, a pencil behind his ear, blue work overalls with a folding rule in the pocket.
    robert: { skin: '#e2b08c', hair: '#6b4a2e', hairStyle: 'short', top: '#8a939e', stubble: true, pencil: true, accent: '#2f5a8f', outfit: 'overalls' },
    // Bauer Fritz: big and round, bald under a straw hat, bushy moustache, checked shirt and green overalls.
    fritz: { skin: '#f0b392', hair: '#8a7a68', hairStyle: 'bald', top: '#c0392b', checked: true, moustache: true, hat: 'straw', build: 'wide', accent: '#3c7350', outfit: 'overalls' },
    // Tobias, lifeguard and gym bro: tanned, blond, sunglasses pushed up, huge shoulders, red tank top and a whistle.
    tobias: { skin: '#d99a6c', hair: '#e2c25a', hairStyle: 'short', top: '#d64b45', shades: true, build: 'muscular', outfit: 'tanktop' },
    // Selma the nurse: dark hair in a bun, teal scrubs, a stethoscope round her neck and a name badge.
    selma: { skin: '#d7a17c', hair: '#3b2a20', hairStyle: 'bun', top: '#3f9a9c', outfit: 'scrubs' },
    // Kumar, the new flatmate from India: wild uncombed hair, stubble and a stained, slept-in yellow T-shirt.
    kumar: { skin: '#9a6440', hair: '#15110e', hairStyle: 'messy', top: '#e0b13e', stubble: true, outfit: 'tshirt' },
    // Simon the engineer: tidy short hair, glasses, light blue shirt with a row of pens in the breast pocket.
    simon: { skin: '#f0c9a8', hair: '#8a5a2b', hairStyle: 'short', top: '#a9c8e8', glasses: true, outfit: 'shirt' }
  };
  const look = $derived(animals.includes(id) ? null : looks[id as Exclude<CharacterId, Animal>]);
  const wide = $derived(look?.build === 'wide');
  const mood = $derived(look ? feeling : animalMoods[feeling]);

  // Eyebrows carry most of a face's mood; mouths and eyes follow below. A question lifts one brow
  // high (curious); anger pulls both down to the nose, worry pushes their inner ends up.
  const brows: Record<Mood, string> = {
    neutral: 'M44 51q5-3 10 0M66 51q5-3 10 0',
    happy: 'M44 49q5-4 10 0M66 49q5-4 10 0',
    surprised: 'M44 44.5q5-5 10 0M66 44.5q5-5 10 0',
    sad: 'M44 52q5-1 10-4.5M76 52q-5-1-10-4.5',
    curious: 'M43 45q5-7 11-1.5M66 52.5q5-1.5 10 0',
    angry: 'M43 47.5q6 1 11 6M77 47.5q-6 1-11 6',
    worried: 'M44 50q5-1 10-6M76 50q-5-1-10-6',
    laughing: 'M44 47.5q5-5 10 0M66 47.5q5-5 10 0',
    sleepy: 'M44 53.5q5-2 10 0M66 53.5q5-2 10 0'
  };
  const humanMouths: Record<Exclude<Mood, 'happy' | 'surprised' | 'laughing'>, string> = {
    neutral: 'M52 76q8 6 16 0',
    sad: 'M52 79.5q8-6 16 0',
    curious: 'M54 77.5q6 1.5 12-2.5',
    angry: 'M50 80q1-4 5-4h10q4 0 5 4',
    worried: 'M51 78q3-2.5 6 0t6 0t6 0',
    sleepy: 'M56 77.5q4 2 8 0'
  };
  // Lilith tilts her head like in her portrait, a little more when curious.
  const lilithTilt = $derived(mood === 'curious' ? -14 : mood === 'sad' ? -3 : -7);
  // Bello-style brows for the other animals, around eyes at (lx, y) and (rx, y); none when neutral or happy.
  function animalBrows(lx: number, rx: number, y: number): string | null {
    const b = y - 7;
    if (mood === 'sad') return `M${lx - 5} ${b}q5 0 9-3.5M${rx + 5} ${b}q-5 0-9-3.5`;
    if (mood === 'surprised') return `M${lx - 5} ${b - 2}q5-4 10 0M${rx - 5} ${b - 2}q5-4 10 0`;
    if (mood === 'curious') return `M${lx - 5} ${b - 2}q5-4 10 0M${rx - 5} ${b + 1}q5-2 10 0`;
    return null;
  }
</script>

<svg class="story-character" class:talking class:lip-synced={lipSynced} class:still viewBox="0 0 120 150" role="img" aria-label={label}>
  <!-- Bello-style eyes and brows shared by the farm and zoo animals. -->
  {#snippet animalEyes(lx: number, rx: number, y: number, r: number, browColor: string)}
    {@const brow = animalBrows(lx, rx, y)}
    {#if mood === 'happy'}
      <path class="story-eyes" d="M{lx - r} {y + 1}q{r} {-r * 1.2} {r * 2} 0M{rx - r} {y + 1}q{r} {-r * 1.2} {r * 2} 0" fill="none" stroke="#172a45" stroke-width="2.4" stroke-linecap="round" />
    {:else}
      <g class="story-eyes" fill="#172a45"><circle cx={mood === 'curious' ? lx + 1 : lx} cy={mood === 'curious' ? y - 1 : y} r={mood === 'surprised' ? r * 1.25 : r} /><circle cx={mood === 'curious' ? rx + 1 : rx} cy={mood === 'curious' ? y - 1 : y} r={mood === 'surprised' ? r * 1.25 : r} /></g>
    {/if}
    {#if brow}<path d={brow} fill="none" stroke={browColor} stroke-width="2.2" stroke-linecap="round" />{/if}
  {/snippet}
  {#if look}
    <!-- hair behind the head -->
    {#if look.hairStyle === 'bun'}<circle cx="60" cy="54" r="33" fill={look.hair} /><circle cx="60" cy="19" r={id === 'oma' ? 10 : 13} fill={look.hair} />{/if}
    {#if look.hairStyle === 'bob'}<path d="M26 58C26 32 42 21 60 21s34 11 34 37v30q-34 7-68 0Z" fill={look.hair} />{/if}
    <!-- body: a muscular build shows bare shoulders and arms, the tank top goes over them -->
    {#if look.checked}<defs><pattern id="{uid}-check" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill={look.top} /><path d="M0 4.5h9M4.5 0v9" stroke="rgba(255,253,247,.4)" stroke-width="2.4" /></pattern></defs>{/if}
    {#if look.build === 'wide'}
      <path d="M2 150c0-34 24-52 58-52s58 18 58 52Z" fill={look.checked ? `url(#${uid}-check)` : look.top} stroke="rgba(23,42,69,.18)" stroke-width="1.5" />
    {:else if look.build === 'muscular'}
      <path d="M2 150c0-24 6-38 22-43q18-6 36-6t36 6c16 5 22 19 22 43Z" fill={look.outfit === 'tanktop' ? look.skin : look.top} stroke="rgba(23,42,69,.18)" stroke-width="1.5" />
      <path d="M8 138q4-16 16-18M112 138q-4-16-16-18M30 106q8 4 14-2M90 106q-8 4-14-2" fill="none" stroke="rgba(23,42,69,.2)" stroke-width="2" stroke-linecap="round" />
    {:else}
      <path d="M14 150c0-30 20-48 46-48s46 18 46 48Z" fill={look.checked ? `url(#${uid}-check)` : look.top} stroke="rgba(23,42,69,.18)" stroke-width="1.5" />
    {/if}
    {#if look.outfit === 'hoodie'}<path d="M40 106q20 14 40 0" fill="none" stroke="rgba(23,42,69,.35)" stroke-width="3" stroke-linecap="round" /><path d="M52 112v14M68 112v14" stroke="#fffdf7" stroke-width="2" stroke-linecap="round" />{/if}
    {#if look.outfit === 'cardigan'}<path d="M60 104v46" stroke="rgba(23,42,69,.3)" stroke-width="2" /><g fill="#fffdf7"><circle cx="48" cy="108" r="2.4" /><circle cx="54" cy="112" r="2.4" /><circle cx="60" cy="113.5" r="2.4" /><circle cx="66" cy="112" r="2.4" /><circle cx="72" cy="108" r="2.4" /></g>{/if}
    {#if look.outfit === 'apron'}<path d="M38 150v-34h44v34Z" fill={look.accent ?? '#34824d'} /><path d="M42 116 50 103M78 116l-8-13" stroke={look.accent ?? '#34824d'} stroke-width="3.5" /><rect x="52" y="124" width="16" height="10" rx="2" fill="rgba(255,253,247,.3)" />{/if}
    {#if look.outfit === 'blazer'}<path d="m48 103 12 24 12-24Z" fill="#fffdf7" /><path d="m48 103 12 24-7 6M72 103l-12 24 7 6" fill="none" stroke="rgba(255,253,247,.4)" stroke-width="1.6" />{/if}
    {#if look.outfit === 'tie'}<path d="m49 103 11 20 11-20Z" fill="#fffdf7" /><path d="m57 106h6l2 22-5 6-5-6Z" fill="#d64b45" />{/if}
    {#if look.outfit === 'plain'}<path d="M47 104q13 12 26 0" fill="none" stroke="#fffdf7" stroke-width="3" stroke-linecap="round" />{/if}
    {#if look.outfit === 'police'}<path d="m49 103 11 14 11-14Z" fill="#8ab4d9" /><path d="M26 116l14-7M94 116l-14-7" stroke="#e6b52e" stroke-width="3" stroke-linecap="round" /><path d="m44 116 2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8Z" fill="#e6b52e" /><rect x="64" y="126" width="22" height="7" rx="1.5" fill="#fffdf7" /><path d="M67 129.5h16" stroke="#1f3a6b" stroke-width="1.6" stroke-dasharray="2 1" />{/if}
    {#if look.outfit === 'chef'}<path d="M60 112v38" stroke="rgba(23,42,69,.15)" stroke-width="1.5" /><g fill="rgba(23,42,69,.35)"><circle cx="52" cy="122" r="2" /><circle cx="52" cy="134" r="2" /><circle cx="68" cy="122" r="2" /><circle cx="68" cy="134" r="2" /></g><path d="m48 102 12 12 12-12-12 4Z" fill="#d64b45" />{/if}
    {#if look.outfit === 'tracht'}<path d="M47 104q13 10 26 0" fill="none" stroke="#4b78c2" stroke-width="3" stroke-dasharray="3 2" /><path d="M41 106 49 150M79 106l-8 44" stroke="#6b4426" stroke-width="6" /><path d="M44 127h32" stroke="#6b4426" stroke-width="5" /><circle cx="60" cy="127" r="3.2" fill="#fffdf7" stroke="#34824d" stroke-width="1.5" />{/if}
    {#if look.outfit === 'waistcoat'}<path d="m49 103 11 20 11-20Z" fill="#fffdf7" /><path d="M42 106 60 126l18-20 -2 44H44Z" fill="#596477" /><path d="m55 104 5 5 5-5-5 3Z" fill="#172a45" /><g fill="#e6b52e"><circle cx="60" cy="133" r="1.8" /><circle cx="60" cy="142" r="1.8" /></g><path d="M48 135q6 6 12 0" fill="none" stroke="#e6b52e" stroke-width="1.4" />{/if}
    {#if look.outfit === 'overalls'}
      <!-- bib overalls with straps and brass buttons; Robert keeps a folding rule in the bib pocket -->
      {@const bib = wide ? 26 : 20}
      <path d="M{60 - bib} 150v-36q{bib} 4 {bib * 2} 0v36Z" fill={look.accent} stroke="rgba(23,42,69,.25)" stroke-width="1.2" />
      <path d="M{62 - bib} 116 {66 - bib} 102M{58 + bib} 116l-4-14" stroke={look.accent} stroke-width="5" stroke-linecap="round" />
      <g fill="#e6b52e"><circle cx={62 - bib} cy="117" r="2.2" /><circle cx={58 + bib} cy="117" r="2.2" /></g>
      {#if id === 'robert'}<rect x="63" y="114" width="5" height="16" rx="1" fill="#e6b52e" /><path d="M63 117h2.5M63 120h2.5M63 123h2.5" stroke="#172a45" stroke-width=".8" />{/if}
      <rect x="51" y="124" width="18" height="12" rx="2" fill="rgba(23,42,69,.18)" />
    {/if}
    {#if look.outfit === 'tanktop'}
      <!-- red lifeguard tank top over the bare shoulders, a whistle on a yellow cord -->
      <path d="M34 150v-38q0-7 6-9 8 12 20 12t20-12q6 2 6 9v38Z" fill={look.top} stroke="rgba(23,42,69,.2)" stroke-width="1.2" />
      <path d="M48 128q12 5 24 0" fill="none" stroke="rgba(23,42,69,.22)" stroke-width="1.8" stroke-linecap="round" />
      <path d="M46 103q14 26 28 0" fill="none" stroke="#e6b52e" stroke-width="1.8" />
      <rect x="55" y="119" width="10" height="6" rx="2.5" fill="#b8c0c8" stroke="#596477" stroke-width="1" />
    {/if}
    {#if look.outfit === 'scrubs'}
      <!-- V-neck scrubs, a name badge and a stethoscope hung round the neck -->
      <path d="m49 103 11 15 11-15" fill="none" stroke="rgba(23,42,69,.35)" stroke-width="2.4" stroke-linejoin="round" />
      <rect x="35" y="120" width="13" height="8" rx="1.5" fill="#fffdf7" /><path d="M38 124h7" stroke={look.top} stroke-width="1.4" />
      <path d="M45 102q-5 22 6 30M75 102q5 16-4 26" fill="none" stroke="#596477" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="51" cy="133" r="4" fill="#d4dae0" stroke="#596477" stroke-width="1.6" />
    {/if}
    {#if look.outfit === 'tshirt'}
      <!-- a stretched collar, a coffee stain, a splash of curry and slept-in creases -->
      <path d="M46 104q14 13 28-1" fill="none" stroke="rgba(23,42,69,.35)" stroke-width="2.6" stroke-linecap="round" />
      <path d="M68 124q5-3 9 1 4 1 2 6-2 5-7 3-6 1-6-4t2-6Z" fill="#8c5b3d" opacity=".55" />
      <g fill="#c86b1e" opacity=".7"><circle cx="46" cy="137" r="2.6" /><circle cx="50" cy="141" r="1.4" /><circle cx="43" cy="132" r="1.1" /></g>
      <path d="M30 128q4 8 2 22M90 128q-4 8-2 22" fill="none" stroke="rgba(23,42,69,.18)" stroke-width="1.6" stroke-linecap="round" />
    {/if}
    {#if look.outfit === 'shirt'}
      <!-- collared shirt, a button placket and a breast pocket full of pens -->
      <path d="m48 102 6 11 6-6 6 6 6-11" fill="#d5e5f4" stroke="rgba(23,42,69,.3)" stroke-width="1.4" stroke-linejoin="round" />
      <path d="M60 108v42" stroke="rgba(23,42,69,.25)" stroke-width="1.4" /><g fill="#fffdf7"><circle cx="60" cy="122" r="1.4" /><circle cx="60" cy="134" r="1.4" /><circle cx="60" cy="146" r="1.4" /></g>
      <g stroke-width="2.2" stroke-linecap="round"><path d="M68.5 118v-6" stroke="#172a45" /><path d="M72 118v-7" stroke="#d64b45" /><path d="M75.5 118v-5" stroke="#4b78c2" /></g>
      <rect x="66" y="117" width="13" height="12" rx="1.5" fill={look.top} stroke="rgba(23,42,69,.3)" stroke-width="1.2" />
    {/if}
    <!-- neck, ears, head; a wide build gets a fuller face and a double chin -->
    <rect x={wide ? 49 : 51} y="82" width={wide ? 22 : 18} height="22" rx="6" fill={look.skin} />
    <circle cx={wide ? 27 : 30} cy="60" r="6" fill={look.skin} /><circle cx={wide ? 93 : 90} cy="60" r="6" fill={look.skin} />
    <ellipse cx="60" cy={wide ? 59 : 58} rx={wide ? 33 : 30} ry={wide ? 31 : 30} fill={look.skin} />
    {#if wide}<path d="M47 87q13 6 26 0" fill="none" stroke="rgba(23,42,69,.2)" stroke-width="1.8" stroke-linecap="round" />{/if}
    {#if look.stubble}<path d="M32 64c2 18 14 27 28 27s26-9 28-27c-5 10-14 14-28 14s-23-4-28-14Z" fill={look.hair} opacity=".22" />{/if}
    {#if look.beard}<path d="M31 62c1 22 14 32 29 32s28-10 29-32c-5 12-15 17-29 17s-24-5-29-17Z" fill={look.hair} />{/if}
    <!-- hair in front -->
    {#if look.hairStyle === 'bun'}<path d="M28 58c0-24 15-34 32-34s32 10 32 34c-7-12-20-18-34-17-13 1-24 7-30 17Z" fill={look.hair} />{/if}
    {#if look.hairStyle === 'short'}<path d="M30 54c-1-21 14-31 31-31 18 0 31 11 29 31-5-11-15-16-29-16s-25 5-31 16Z" fill={look.hair} />{/if}
    {#if look.hairStyle === 'curly'}<g fill={look.hair}><circle cx="37" cy="44" r="10" /><circle cx="46" cy="33" r="11" /><circle cx="60" cy="29" r="12" /><circle cx="74" cy="33" r="11" /><circle cx="83" cy="44" r="10" /></g>{/if}
    {#if look.hairStyle === 'bob'}<path d="M30 52c0-19 13-29 30-29s30 10 30 29q-30-9-60 0Z" fill={look.hair} />{/if}
    {#if look.hairStyle === 'bald'}<g fill={look.hair}><ellipse cx="32" cy="52" rx="5" ry="10" /><ellipse cx="88" cy="52" rx="5" ry="10" /></g>{/if}
    {#if look.hairStyle === 'messy'}<path d="M30 55c-3-12 1-22 8-27l-3-10 9 6 2-12 8 9 6-11 4 11 9-8-1 11 10-4-4 10c6 6 7 15 5 25-3-7-7-11-12-12l2 7-8-8-1 8-6-9-4 8-4-8-4 7-2-6c-6 2-11 7-12 13Z" fill={look.hair} />{/if}
    {#if look.pencil}<path d="M84 50 99 41" stroke="#e6b52e" stroke-width="3.4" stroke-linecap="round" /><path d="m99 41 3.5-2" stroke="#4a3326" stroke-width="2" stroke-linecap="round" />{/if}
    {#if look.shades}<g fill="#172a45"><rect x="40" y="31" width="17" height="8" rx="3.5" /><rect x="63" y="31" width="17" height="8" rx="3.5" /></g><path d="M57 34h6" stroke="#172a45" stroke-width="1.8" /><path d="M43 33h6M66 33h6" stroke="rgba(255,253,247,.5)" stroke-width="1.4" stroke-linecap="round" />{/if}
    {#if look.hat === 'tyrolean'}
      <!-- green felt hat with a leather band, an edelweiss and a tuft of chamois hair -->
      <path d="M78 30q6-14 15-19-2 11-11 20Z" fill="#596477" />
      <path d="M38 34q0-22 22-22t22 22q-22 5-44 0Z" fill="#3c7350" />
      <path d="M38.5 29q21.5 5 43 0v5q-21.5 5-43 0Z" fill="#8c5b3d" />
      <path d="M22 37q38-11 76 0-38 7-76 0Z" fill="#2e5a3c" />
      <circle cx="46" cy="31.5" r="2.4" fill="#fffdf7" />
    {:else if look.hat === 'police'}
      <!-- peaked police cap with a white band, black visor and a gold star -->
      <path d="M27 35q3-22 33-23 30 1 33 23-33 8-66 0Z" fill="#1f3a6b" />
      <path d="M28 30q32 8 64 0v5q-32 8-64 0Z" fill="#fffdf7" />
      <path d="M34 37q26 8 52 0l3 5q-29 9-58 0Z" fill="#111a2b" />
      <circle cx="60" cy="24" r="3.4" fill="#e6b52e" />
    {:else if look.hat === 'straw'}
      <!-- battered straw hat with a red band and a wide, frayed brim -->
      <path d="M39 34q0-21 21-21t21 21q-21 5-42 0Z" fill="#e3c06a" />
      <path d="M39.5 28.5q20.5 5 41 0v5.5q-20.5 5-41 0Z" fill="#c0392b" />
      <path d="M48 18q5 6 4 10M62 15v12M72 18q-4 5-3 10" fill="none" stroke="#b8933f" stroke-width="1.2" />
      <path d="M14 38q46-14 92 0-46 9-92 0Z" fill="#e9c86f" stroke="#b8933f" stroke-width="1.2" />
      <path d="M18 39l-3 3M102 39l3 3M30 42l-1 3" stroke="#b8933f" stroke-width="1.2" stroke-linecap="round" />
    {:else if look.hat === 'toque'}
      <!-- tall white chef's hat -->
      <g fill="#fffdf7" stroke="rgba(23,42,69,.25)" stroke-width="1.2"><circle cx="45" cy="16" r="10" /><circle cx="60" cy="9" r="12" /><circle cx="75" cy="16" r="10" /></g>
      <rect x="38" y="18" width="44" height="18" rx="3" fill="#fffdf7" stroke="rgba(23,42,69,.25)" stroke-width="1.2" />
    {/if}
    {#if look.headphones}<path d="M27 58q0-36 33-36t33 36" fill="none" stroke="#172a45" stroke-width="4" /><rect x="21" y="51" width="11" height="17" rx="4.5" fill="#d64b45" /><rect x="88" y="51" width="11" height="17" rx="4.5" fill="#d64b45" />{/if}
    <!-- face -->
    <g fill={mood === 'angry' ? '#e0645a' : '#f19a8a'} opacity={mood === 'happy' || mood === 'laughing' || mood === 'angry' ? 0.65 : 0.38}><circle cx="43" cy="70" r="4.5" /><circle cx="77" cy="70" r="4.5" /></g>
    {#if mood === 'happy' || mood === 'laughing'}
      <path class="story-eyes" d={mood === 'laughing' ? 'M44.5 62q4.5-6 9 0M66.5 62q4.5-6 9 0' : 'M45 61.5q4-4.5 8 0M67 61.5q4-4.5 8 0'} fill="none" stroke="#172a45" stroke-width="2.6" stroke-linecap="round" />
    {:else if mood === 'sleepy'}
      <!-- heavy lids: the eyes are nearly shut -->
      <path class="story-eyes" d="M45 60.5q4 3.5 8 0M67 60.5q4 3.5 8 0" fill="none" stroke="#172a45" stroke-width="2.4" stroke-linecap="round" />
    {:else if mood === 'surprised'}
      <g class="story-eyes"><circle cx="49" cy="60" r="4.3" fill="#172a45" /><circle cx="71" cy="60" r="4.3" fill="#172a45" /><circle cx="50.3" cy="58.6" r="1.3" fill="#fffdf7" /><circle cx="72.3" cy="58.6" r="1.3" fill="#fffdf7" /></g>
    {:else}
      <g class="story-eyes" fill="#172a45"><circle cx={mood === 'curious' ? 50 : 49} cy={mood === 'sad' || mood === 'angry' ? 61 : mood === 'curious' ? 59 : 60} r={mood === 'worried' ? 3.6 : 3.3} /><circle cx={mood === 'curious' ? 72 : 71} cy={mood === 'sad' || mood === 'angry' ? 61 : mood === 'curious' ? 59.5 : 60} r={mood === 'worried' ? 3.6 : 3.3} /></g>
    {/if}
    <path class="story-brows" d={brows[mood]} fill="none" stroke={look.hairStyle === 'bald' || id === 'oma' ? '#8a857d' : look.hair} stroke-width="2.8" stroke-linecap="round" />
    {#if look.glasses}<g fill="none" stroke="#172a45" stroke-width="1.8"><circle cx="49" cy="60" r="7.5" /><circle cx="71" cy="60" r="7.5" /><path d="M56.5 60h7" /></g>{/if}
    {#if look.monocle}<circle cx="71" cy="60" r="7.5" fill="rgba(255,253,247,.18)" stroke="#c9a227" stroke-width="1.8" /><path d="M78.5 61q6 16 0 36" fill="none" stroke="#c9a227" stroke-width="1" />{/if}
    <path d="M60 62q-3 5 0 7" fill="none" stroke="rgba(23,42,69,.4)" stroke-width="1.8" stroke-linecap="round" />
    {#if look.moustache === 'kaiser'}<path d="M60 71c-5-3-11-3-15 0-3 2-5 0-6-4 0 5 3 8 7 8 6 0 10-2 14-3 4 1 8 3 14 3 4 0 7-3 7-8-1 4-3 6-6 4-4-3-10-3-15 0Z" fill={look.hair} />
    {:else if look.moustache}<path d="M47 73q6-6 13-2 7-4 13 2-13 3-26 0Z" fill={look.hair} />{/if}
    {#if mood === 'happy'}
      <path class="story-mouth-closed" d="M50 74.5q10 12 20 0q-10 3-20 0Z" fill="#7a2e2a" />
    {:else if mood === 'laughing'}
      <g class="story-mouth-closed"><path d="M48 73.5h24q-2 15-12 15t-12-15Z" fill="#7a2e2a" /><path d="M54 84q6-4 12 0-2 4.5-6 4.5t-6-4.5Z" fill="#e58fa0" /><path d="M50 74h20v2.5H50Z" fill="#fffdf7" /></g>
    {:else if mood === 'surprised'}
      <ellipse class="story-mouth-closed" cx="60" cy="78" rx="3.6" ry="4.4" fill="#7a2e2a" />
    {:else}
      <path class="story-mouth-closed" d={humanMouths[mood]} fill="none" stroke="#7a2e2a" stroke-width="2.4" stroke-linecap="round" />
    {/if}
    <ellipse class="story-mouth-open" style:transform={mouthScale} cx="60" cy="78" rx="6" ry="4.5" fill="#7a2e2a" />
    {#if holding === 'cake'}
      <!-- a slice of cream cake with a cherry on a small plate, held up in one hand -->
      <circle cx="88" cy="127" r="6" fill={look.skin} stroke="rgba(23,42,69,.2)" stroke-width="1" />
      <ellipse cx="88" cy="121.5" rx="15" ry="3.6" fill="#fffdf7" stroke="rgba(23,42,69,.3)" stroke-width="1.2" />
      <path d="M77 120v-8l21-4v12Z" fill="#f2d49b" /><path d="M77 116.2l21-4v2.4l-21 4Z" fill="#fffdf7" /><path d="M77 112l21-4v-2.6l-21 4Z" fill="#f4a9bf" />
      <circle cx="93" cy="104" r="2.6" fill="#d64b45" /><path d="M93 101.5q1-3 3.5-4" fill="none" stroke="#34824d" stroke-width="1" />
    {/if}
  {:else if id === 'lilith'}
    <!-- Lilith, Mia and Tom's Siamese-Persian cat: fluffy cream coat shading to fawn, seal-brown mask,
         ears, legs and tail, big round blue eyes, a soft white ruff, head tilted to one side. -->
    <defs>
      <radialGradient id="{uid}-coat" cx=".5" cy=".2" r=".85"><stop offset="0" stop-color="#f8f0e4" /><stop offset=".45" stop-color="#ead9c2" /><stop offset=".8" stop-color="#c3a585" /><stop offset="1" stop-color="#8a6a52" /></radialGradient>
      <radialGradient id="{uid}-head" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#f7eee1" /><stop offset="1" stop-color="#dcc6aa" /></radialGradient>
      <radialGradient id="{uid}-mask" cx=".5" cy=".58" r=".5"><stop offset="0" stop-color="#2b1d15" /><stop offset=".45" stop-color="#46301f" stop-opacity=".9" /><stop offset=".78" stop-color="#7a5b45" stop-opacity=".4" /><stop offset="1" stop-color="#a08066" stop-opacity="0" /></radialGradient>
      <linearGradient id="{uid}-leg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcc5a9" /><stop offset=".45" stop-color="#a7866b" /><stop offset="1" stop-color="#4a3326" /></linearGradient>
      <linearGradient id="{uid}-tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#36251b" /><stop offset="1" stop-color="#8d6d55" /></linearGradient>
      <linearGradient id="{uid}-ear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a281e" /><stop offset="1" stop-color="#6e5140" /></linearGradient>
      <radialGradient id="{uid}-eye" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#d9f0fb" /><stop offset=".5" stop-color="#7cc0ea" /><stop offset="1" stop-color="#2c6aa3" /></radialGradient>
    </defs>
    <!-- fluffy body, legs and the white ruff -->
    <path d="M60 76c20 0 36 14 39 34l4 3-3 3c1 12-2 23-8 31H28c-6-8-9-19-8-31l-3-3 4-3c3-20 19-34 39-34Z" fill="url(#{uid}-coat)" />
    <path d="M46 116c-2 10-2 21-1 30h13c0-9 0-19-1-30Z" fill="url(#{uid}-leg)" /><path d="M74 116c2 10 2 21 1 30H62c0-9 0-19 1-30Z" fill="url(#{uid}-leg)" />
    <g fill="#f8efe3" opacity=".85"><ellipse cx="60" cy="94" rx="20" ry="13" /><circle cx="46" cy="101" r="7.5" /><circle cx="74" cy="101" r="7.5" /><circle cx="52" cy="108" r="7" /><circle cx="68" cy="108" r="7" /><circle cx="60" cy="112" r="6.5" /></g>
    <g fill="#3e2b20"><ellipse cx="51" cy="145.5" rx="8" ry="4.5" /><ellipse cx="69" cy="145.5" rx="8" ry="4.5" /></g>
    <!-- the bushy tail curls round the front paws -->
    <path class="story-tail story-tail-cat" d="M93 146c-15 7-60 8-78 0-9-4-8-16 2-15 4 1 6 4 10 5 18 5 43 5 63 2 6 0 8 6 3 8Z" fill="url(#{uid}-tail)" />
    {#if holding === 'fish'}
      <!-- her dinner: a fish in a red bowl at her paws -->
      <path d="M-14 136q8-6 14-1l6-4v10l-6-4q-6 5-14-1Z" fill="#8ab4d9" stroke="#4b78c2" stroke-width="1" /><circle cx="-9" cy="135.5" r="1.1" fill="#172a45" />
      <path d="M-20 138h30q-2 11-15 11t-15-11Z" fill="#d64b45" /><path d="M-20 138h30" stroke="#9c2a25" stroke-width="1.6" />
    {/if}
    <!-- the head sits a little smaller than life, like the round fluffy face in her portrait -->
    <g transform="rotate({lilithTilt} 60 64) translate(60 66) scale(.86) translate(-60 -62)">
      <!-- ears, drooping when she is sad -->
      <g transform={mood === 'sad' ? 'rotate(-24 42 40)' : undefined}><path d="M29 50Q24 30 28 15q14 7 27 18Z" fill="url(#{uid}-ear)" /><path d="M33 44q-3-13-1-22 9 5 16 12Z" fill="#7a5646" /><path d="M35 42l4-6M38 44l5-5" stroke="#f4e9da" stroke-width="1" opacity=".8" /></g>
      <g transform={mood === 'sad' ? 'rotate(24 78 40)' : undefined}><path d="M91 50Q96 30 92 15q-14 7-27 18Z" fill="url(#{uid}-ear)" /><path d="M87 44q3-13 1-22-9 5-16 12Z" fill="#7a5646" /><path d="M85 42l-4-6M82 44l-5-5" stroke="#f4e9da" stroke-width="1" opacity=".8" /></g>
      <!-- round fluffy head with cheek tufts -->
      <path d="M60 30c20 0 32 12 33 28l5 4-5 4 3 6-7 2c-5 12-17 18-29 18s-24-6-29-18l-7-2 3-6-5-4 5-4c1-16 13-28 33-28Z" fill="url(#{uid}-head)" />
      <ellipse cx="60" cy="42" rx="12" ry="6" fill="#cdb497" opacity=".45" />
      <!-- seal-brown mask, darkest around the eyes and muzzle -->
      <ellipse cx="60" cy="68" rx="26" ry="22" fill="url(#{uid}-mask)" />
      <g fill="#2e1f17" opacity=".4"><circle cx="47.5" cy="64" r="10" /><circle cx="72.5" cy="64" r="10" /></g>
      <!-- eyes -->
      {#if mood === 'happy'}
        <path class="story-eyes" d="M41.5 65q6-6 12 0M66.5 65q6-6 12 0" fill="none" stroke="#a9d6f2" stroke-width="2.6" stroke-linecap="round" />
      {:else}
        <g class="story-eyes">
          <circle cx="47.5" cy="64" r="7.6" fill="url(#{uid}-eye)" stroke="#140d0a" stroke-width="1.4" /><circle cx="72.5" cy="64" r="7.6" fill="url(#{uid}-eye)" stroke="#140d0a" stroke-width="1.4" />
          <circle cx={mood === 'curious' ? 48.5 : 47.5} cy={mood === 'curious' ? 62.5 : 64.3} r={mood === 'surprised' ? 5.4 : mood === 'sad' ? 3 : 3.8} fill="#0d0907" /><circle cx={mood === 'curious' ? 73.5 : 72.5} cy={mood === 'curious' ? 62.5 : 64.3} r={mood === 'surprised' ? 5.4 : mood === 'sad' ? 3 : 3.8} fill="#0d0907" />
          <circle cx="49.8" cy="61.5" r="1.8" fill="#fff" /><circle cx="74.8" cy="61.5" r="1.8" fill="#fff" /><circle cx="45.6" cy="66.6" r=".8" fill="#fff" /><circle cx="70.6" cy="66.6" r=".8" fill="#fff" />
        </g>
      {/if}
      <!-- nose, mouth, whiskers -->
      <path d="M55.5 74.5h9L60 79.5Z" fill="#22160f" />
      {#if mood === 'sad'}
        <path class="story-mouth-closed" d="M54.5 84q5.5-4 11 0" fill="none" stroke="rgba(240,225,205,.75)" stroke-width="1.5" stroke-linecap="round" />
      {:else if mood === 'surprised'}
        <ellipse class="story-mouth-closed" cx="60" cy="83" rx="2.2" ry="2.6" fill="#c86f7f" />
      {:else}
        <path class="story-mouth-closed" d={mood === 'happy' ? 'M60 79.5q-3 4.2-7.5 2M60 79.5q3 4.2 7.5 2' : 'M60 79.5q-2.5 3.2-6 1.6M60 79.5q2.5 3.2 6 1.6'} fill="none" stroke="rgba(240,225,205,.75)" stroke-width="1.5" stroke-linecap="round" />
      {/if}
      <g class="story-mouth-open" style:transform={mouthScale}><ellipse cx="60" cy="84.5" rx="5.4" ry="5" fill="#5a1f28" /><ellipse cx="60" cy="87.4" rx="3.4" ry="2.1" fill="#e58fa0" /></g>
      <path d="M44 78 18 73M44 81l-26 2M76 78l26-5M76 81l26 2" stroke="rgba(255,250,240,.85)" stroke-width="1" stroke-linecap="round" />
    </g>
  {:else}
    <!-- Bello the dog -->
    <path d="M90 118q18-14 14-30" fill="none" stroke="#b07a4a" stroke-width="7" stroke-linecap="round" class="story-tail" />
    <ellipse cx="62" cy="128" rx="36" ry="20" fill="#b07a4a" />
    <rect x="36" y="128" width="11" height="20" rx="5" fill="#9a6a3f" /><rect x="74" y="128" width="11" height="20" rx="5" fill="#9a6a3f" />
    <path d="M42 106h40" stroke="#d64b45" stroke-width="6" stroke-linecap="round" /><circle cx="62" cy="111" r="3.5" fill="#e6b52e" />
    <ellipse cx="34" cy="80" rx="10" ry="19" fill="#6d4a2c" transform={mood === 'sad' ? 'rotate(32 34 80)' : 'rotate(18 34 80)'} />
    <ellipse cx="90" cy="80" rx="10" ry="19" fill="#6d4a2c" transform={mood === 'sad' ? 'rotate(-32 90 80)' : 'rotate(-18 90 80)'} />
    <circle cx="62" cy="78" r="27" fill="#b07a4a" />
    <ellipse cx="62" cy="92" rx="14" ry="11" fill="#e8c9a0" />
    {#if mood === 'happy'}
      <path class="story-eyes" d="M47.5 74q3.5-4 7 0M69.5 74q3.5-4 7 0" fill="none" stroke="#172a45" stroke-width="2.4" stroke-linecap="round" />
    {:else}
      <g class="story-eyes" fill="#172a45"><circle cx="51" cy="73" r={mood === 'surprised' ? 4.3 : 3.4} /><circle cx="73" cy="73" r={mood === 'surprised' ? 4.3 : 3.4} /></g>
    {/if}
    {#if mood === 'sad' || mood === 'surprised' || mood === 'curious'}<path d={mood === 'sad' ? 'M46 66q5 0 9-3.5M78 66q-5 0-9-3.5' : mood === 'surprised' ? 'M46 64q5-4 10 0M68 64q5-4 10 0' : 'M46 64q5-4 10 0M68 67q5-2 10 0'} fill="none" stroke="#6d4a2c" stroke-width="2.2" stroke-linecap="round" />{/if}
    <ellipse cx="62" cy="86" rx="5" ry="3.6" fill="#172a45" />
    {#if mood === 'happy'}
      <path class="story-mouth-closed" d="M56 94q6 4 12 0v4q0 8-6 8t-6-8Z" fill="#df8eb1" />
    {:else}
      <path class="story-mouth-closed" d={mood === 'sad' ? 'M56 97q6-4 12 0' : 'M56 94q6 4 12 0'} fill="none" stroke="#172a45" stroke-width="2" stroke-linecap="round" />
    {/if}
    <g class="story-mouth-open" style:transform={mouthScale}><path d="M52.5 93q9.5 6 19 0v3q0 12-9.5 12t-9.5-12Z" fill="#5a1f28" /><path d="M56.5 100q5.5-3 11 0v3q0 7-5.5 7t-5.5-7Z" fill="#df8eb1" /></g>
  {/if}
</svg>

<style>
  .story-character { display:block;width:100%;height:100%;overflow:visible; }
  .story-eyes { transform-box:fill-box;transform-origin:center;animation:story-blink 4.2s infinite; }
  .story-mouth-open { opacity:0;transform-box:fill-box;transform-origin:center top; }
  .talking .story-mouth-closed,.lip-synced .story-mouth-closed { opacity:0; }
  .lip-synced .story-mouth-open { opacity:1; }
  .lip-synced .story-tail { transform-box:fill-box;transform-origin:left bottom;animation:story-wag .3s ease-in-out infinite alternate; }
  .lip-synced .story-tail-cat { transform-origin:right center; }
  .talking .story-mouth-open { opacity:1;animation:story-talk .26s ease-in-out infinite alternate; }
  .talking .story-tail { transform-box:fill-box;transform-origin:left bottom;animation:story-wag .3s ease-in-out infinite alternate; }
  .talking .story-tail-cat { transform-origin:right center; }
  @keyframes story-blink { 0%,94%,100% { transform:scaleY(1); } 97% { transform:scaleY(.1); } }
  @keyframes story-talk { from { transform:scaleY(.35); } to { transform:scaleY(1); } }
  @keyframes story-wag { from { transform:rotate(-6deg); } to { transform:rotate(7deg); } }
  .still .story-eyes,.still .story-mouth-open,.still .story-tail { animation:none; }
  @media (prefers-reduced-motion:reduce) { .story-eyes,.talking .story-mouth-open,.talking .story-tail,.lip-synced .story-tail { animation:none; } }
</style>
