<script lang="ts">
  import type { SceneId, Weather } from './stories';

  let { scene, weather = 'sunny' }: { scene: SceneId; weather?: Weather } = $props();

  // Clip-path ids must be unique per instance.
  const uid = $props.id();

  const palettes: Record<SceneId, { back: string; floor: string }> = {
    cafe: { back: '#f3dcc0', floor: '#a45e38' },
    park: { back: '#cfe6f2', floor: '#8fc27a' },
    station: { back: '#dfe5ea', floor: '#9aa3ad' },
    home: { back: '#f6e3d3', floor: '#c08a5c' },
    office: { back: '#e7ecef', floor: '#c4cbd3' },
    flat: { back: '#f2eee6', floor: '#c9a27e' },
    square: { back: '#d7e8f0', floor: '#b8aa98' },
    attic: { back: '#c9a27e', floor: '#7a5536' },
    beergarden: { back: '#cfe6f2', floor: '#c9b48a' },
    farm: { back: '#cfe6f2', floor: '#b89a5e' },
    zoo: { back: '#cfe6f2', floor: '#c9b48a' },
    butcher: { back: '#dfeae6', floor: '#b9c2c6' },
    bakery: { back: '#f6e3d3', floor: '#c08a5c' },
    boutique: { back: '#f2e4ea', floor: '#d9c2a6' },
    perfumery: { back: '#f1e7f2', floor: '#cdb8c9' },
    workshop: { back: '#e7ecef', floor: '#9aa3ad' },
    beach: { back: '#f6b06a', floor: '#ecd3a0' },
    airport: { back: '#cfe6f2', floor: '#7d8794' },
    forest: { back: '#cfe6f2', floor: '#7a6a4a' },
    alps: { back: '#cfe6f2', floor: '#7fae57' },
    castle: { back: '#cfe6f2', floor: '#8fae6a' },
    lindau: { back: '#cfe6f2', floor: '#b8aa98' },
    mainau: { back: '#cfe6f2', floor: '#8fc27a' }
  };
  const palette = $derived(palettes[scene]);

  // Where the weather shows: through the window indoors, across the whole sky outdoors.
  type Sky = { x: number; y: number; w: number; h: number; round?: boolean };
  const skies: Record<SceneId, Sky> = {
    cafe: { x: 40, y: 34, w: 120, h: 86 },
    park: { x: 0, y: 0, w: 400, h: 172 },
    station: { x: 0, y: 0, w: 400, h: 172 },
    home: { x: 270, y: 36, w: 96, h: 80 },
    office: { x: 30, y: 26, w: 160, h: 96 },
    flat: { x: 130, y: 24, w: 140, h: 110 },
    square: { x: 0, y: 0, w: 400, h: 172 },
    attic: { x: 174, y: 60, w: 52, h: 52, round: true },
    beergarden: { x: 0, y: 0, w: 400, h: 172 },
    farm: { x: 0, y: 0, w: 400, h: 172 },
    zoo: { x: 0, y: 0, w: 400, h: 172 },
    butcher: { x: 24, y: 22, w: 92, h: 62 },
    bakery: { x: 296, y: 22, w: 84, h: 62 },
    boutique: { x: 150, y: 18, w: 100, h: 58 },
    perfumery: { x: 28, y: 24, w: 80, h: 64 },
    workshop: { x: 150, y: 18, w: 100, h: 54 },
    beach: { x: 0, y: 0, w: 400, h: 172 },
    airport: { x: 0, y: 0, w: 400, h: 172 },
    forest: { x: 0, y: 0, w: 400, h: 172 },
    alps: { x: 0, y: 0, w: 400, h: 172 },
    castle: { x: 0, y: 0, w: 400, h: 172 },
    lindau: { x: 0, y: 0, w: 400, h: 172 },
    mainau: { x: 0, y: 0, w: 400, h: 172 }
  };
  const sky = $derived(skies[scene]);
  const outdoor = $derived(sky.w === 400);
  const skyColours: Record<Weather, string> = { sunny: '#cfe6f2', cloudy: '#c5cfd8', rainy: '#9fb0c2', snowy: '#dde5ee' };

  // The same scattered drops and flakes every time; they fall in a loop through the sky.
  function scatter(count: number, seed: number) {
    let state = seed;
    const next = () => ((state = (state * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: count }, () => ({ x: next(), y: next(), size: next() }));
  }
  const drops = $derived(scatter(outdoor ? 46 : 14, 7));
  const flakes = $derived(scatter(outdoor ? 40 : 12, 3));
  const unit = $derived(Math.min(sky.w, sky.h));
  const clouds = $derived(outdoor
    ? [{ x: 70, y: 30, s: 1.1 }, { x: 220, y: 18, s: 0.9 }, { x: 330, y: 40, s: 1.2 }]
    : [{ x: sky.x + sky.w * 0.3, y: sky.y + sky.h * 0.3, s: unit / 110 }, { x: sky.x + sky.w * 0.75, y: sky.y + sky.h * 0.45, s: unit / 140 }]);
  // The beach is always at sunset: a warm gradient and a big low sun in place of the usual sky.
  const sunset = $derived(scene === 'beach');
  const cloudColour = $derived(weather === 'rainy' ? '#7d8b9b' : weather === 'snowy' ? '#eef2f6' : weather === 'cloudy' ? '#f3f5f7' : sunset ? '#fcd9d0' : '#ffffff');
  const pastels = ['#f3b6cf', '#b9d4ef', '#bfe3c4', '#f6dc95', '#d6c1ec'];
</script>

{#snippet bottle(x: number, y: number, colour: string, kind: number)}
  <g stroke="#7a6a8a" stroke-width="1">
    {#if kind === 0}<rect x={x - 6} y={y - 14} width="12" height="14" rx="2" fill={colour} />{:else if kind === 1}<circle cx={x} cy={y - 7} r="7" fill={colour} />{:else}<path d="M{x - 4} {y}v-14l4-4 4 4v14Z" fill={colour} />{/if}
    <rect x={x - 2} y={y - (kind === 2 ? 22 : 18)} width="4" height="4" fill="#e6a527" />
    <rect x={x - 3} y={y - 11} width="2" height="6" fill="#ffffff" stroke="none" opacity=".6" />
  </g>
{/snippet}

{#snippet cloud(x: number, y: number, s: number)}
  <g class="story-cloud" transform="translate({x} {y}) scale({s})" fill={cloudColour}><circle cx="-16" cy="4" r="12" /><circle cx="2" cy="-4" r="16" /><circle cx="20" cy="5" r="11" /><rect x="-28" y="4" width="58" height="12" rx="6" /></g>
{/snippet}

<svg class="story-scene" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <clipPath id="{uid}-sky">
      {#if sky.round}<circle cx={sky.x + sky.w / 2} cy={sky.y + sky.h / 2} r={sky.w / 2} />{:else}<rect x={sky.x} y={sky.y} width={sky.w} height={sky.h} rx={outdoor ? 0 : 6} />{/if}
    </clipPath>
  </defs>
  <rect width="400" height="220" fill={palette.back} />
  <!-- the weather, behind the window frames -->
  <g class="story-weather" clip-path="url(#{uid}-sky)" style:--fall="{sky.h}px">
    <rect x={sky.x} y={sky.y} width={sky.w} height={sky.h} fill={skyColours[weather]} />
    {#if weather === 'sunny'}
      <circle class="story-sun" cx={outdoor ? 340 : sky.x + sky.w * 0.7} cy={outdoor ? 44 : sky.y + sky.h * 0.36} r={outdoor ? 24 : unit * 0.2} fill="#f4c84a" />
      {@render cloud(clouds[0].x, clouds[0].y, clouds[0].s * 0.8)}
    {:else}
      {#each clouds as c, index (index)}{@render cloud(c.x, c.y, c.s)}{/each}
    {/if}
    {#if weather === 'rainy'}
      {#each [0, 1] as copy (copy)}
        <g class="story-rain">
          {#each drops as drop, index (index)}<path d="M{sky.x + drop.x * sky.w} {sky.y + drop.y * sky.h - copy * sky.h}l-2 {6 + drop.size * 5}" stroke="#eaf3fb" stroke-width="1.4" stroke-linecap="round" opacity={0.55 + drop.size * 0.4} />{/each}
        </g>
      {/each}
    {:else if weather === 'snowy'}
      {#each [0, 1] as copy (copy)}
        <g class="story-snow">
          {#each flakes as flake, index (index)}<circle cx={sky.x + flake.x * sky.w} cy={sky.y + flake.y * sky.h - copy * sky.h} r={1.3 + flake.size * 1.6} fill="#ffffff" />{/each}
        </g>
      {/each}
    {/if}
  </g>
  {#if scene === 'cafe'}
    <rect x="40" y="34" width="120" height="86" rx="6" fill="none" stroke="#8c5b3d" stroke-width="5" /><path d="M100 34v86M40 77h120" stroke="#8c5b3d" stroke-width="4" />
    <path d="M250 0v38M330 0v52" stroke="#172a45" stroke-width="2" /><path d="M234 52q16-22 32 0Z" fill="#e6a527" /><path d="M314 66q16-22 32 0Z" fill="#e6a527" />
    <circle cx="290" cy="112" r="20" fill="#fffdf7" stroke="#a45e38" stroke-width="3" /><path d="M282 108h14v8q0 6-7 6t-7-6Z M296 110q6 0 4 5" fill="#a45e38" stroke="#a45e38" stroke-width="1.5" />
  {:else if scene === 'park'}
    <g fill="#55a66a"><circle cx="70" cy="96" r="38" /><circle cx="110" cy="112" r="28" /></g><rect x="78" y="118" width="12" height="60" fill="#8c5b3d" />
    <g fill="#4d8f5c"><circle cx="300" cy="122" r="28" /></g><rect x="295" y="140" width="10" height="38" fill="#8c5b3d" />
    {#if weather === 'snowy'}<g fill="#ffffff" opacity=".9"><path d="M40 76q30-16 60 0q-30-6-60 0Z" /><path d="M280 106q20-12 40 0q-20-5-40 0Z" /></g>{/if}
  {:else if scene === 'station'}
    <rect x="0" y="40" width="400" height="18" fill="#172a45" />
    <circle cx="200" cy="96" r="26" fill="#fffdf7" stroke="#172a45" stroke-width="4" /><path d="M200 96V80M200 96l11 6" stroke="#172a45" stroke-width="3.5" stroke-linecap="round" />
    <rect x="44" y="76" width="70" height="30" rx="4" fill="#4b78c2" /><rect x="52" y="86" width="54" height="10" rx="2" fill="#fffdf7" opacity=".85" />
    <rect x="290" y="76" width="70" height="30" rx="4" fill="#4b78c2" /><rect x="298" y="86" width="54" height="10" rx="2" fill="#fffdf7" opacity=".85" />
  {:else if scene === 'home'}
    <rect x="270" y="36" width="96" height="80" rx="6" fill="none" stroke="#fffdf7" stroke-width="7" />
    <path d="M40 0q30 30 60 0 30 30 60 0" fill="none" stroke="#e6a527" stroke-width="3" />
    <g><circle cx="196" cy="54" r="15" fill="#d64b45" /><circle cx="224" cy="46" r="15" fill="#4b78c2" /><circle cx="210" cy="72" r="13" fill="#e6b52e" /><path d="M196 69q4 30 12 60M224 61q-4 30-12 68M210 85v44" fill="none" stroke="#596477" stroke-width="1.2" /></g>
    <rect x="34" y="60" width="62" height="48" rx="4" fill="#fffdf7" stroke="#8c5b3d" stroke-width="4" /><circle cx="65" cy="84" r="12" fill="#df8eb1" opacity=".7" />
  {:else if scene === 'office'}
    <rect x="30" y="26" width="160" height="96" fill="none" stroke="#596477" stroke-width="5" /><path d="M110 26v96M30 74h160" stroke="#596477" stroke-width="4" />
    <rect x="300" y="110" width="34" height="40" rx="4" fill="#a45e38" /><g fill="#55a66a"><ellipse cx="306" cy="98" rx="10" ry="20" transform="rotate(-20 306 98)" /><ellipse cx="328" cy="96" rx="10" ry="22" transform="rotate(20 328 96)" /><ellipse cx="317" cy="88" rx="9" ry="22" /></g>
    <rect x="230" y="40" width="44" height="30" fill="#fffdf7" stroke="#172a45" stroke-width="2" /><path d="M238 62l8-10 7 6 9-12" fill="none" stroke="#e6a527" stroke-width="3" />
  {:else if scene === 'flat'}
    <rect x="130" y="24" width="140" height="110" fill="none" stroke="#fffdf7" stroke-width="9" /><path d="M200 24v110" stroke="#fffdf7" stroke-width="6" />
    <g fill="#c9925e" stroke="#8c5b3d" stroke-width="2"><rect x="30" y="140" width="56" height="40" /><rect x="42" y="108" width="40" height="32" /><rect x="320" y="146" width="58" height="34" /></g><path d="M30 160h56M320 162h58" stroke="#8c5b3d" stroke-width="2" />
  {:else if scene === 'square'}
    <g stroke="#172a45" stroke-width="2.5">
      <path d="M0 180V80l35-36 35 36v100Z" fill="#e6a527" /><path d="M70 180V70l40-40 40 40v110Z" fill="#df8eb1" /><path d="M150 180V86l30-30 30 30v94Z" fill="#fffdf7" />
      <path d="M210 180V66l45-44 45 44v114Z" fill="#8ab4d9" /><path d="M300 180V82l50-38 50 38v98Z" fill="#9ccf9f" />
    </g>
    {#if weather === 'snowy'}<g fill="#ffffff" stroke="#172a45" stroke-width="1.2"><path d="M35 44l-35 36v6l35-34 35 34v-6Z" /><path d="M110 30l-40 40v6l40-38 40 38v-6Z" /><path d="M180 56l-30 30v6l30-28 30 28v-6Z" /><path d="M255 22l-45 44v6l45-42 45 42v-6Z" /><path d="M350 44l-50 38v6l50-36 50 36v-6Z" /></g>{/if}
    <g fill="#172a45" opacity=".7"><rect x="20" y="96" width="12" height="18" /><rect x="40" y="96" width="12" height="18" /><rect x="96" y="86" width="12" height="18" /><rect x="114" y="86" width="12" height="18" /><rect x="172" y="100" width="14" height="18" /><rect x="236" y="82" width="12" height="18" /><rect x="262" y="82" width="12" height="18" /><rect x="330" y="98" width="12" height="18" /><rect x="358" y="98" width="12" height="18" /></g>
  {:else if scene === 'attic'}
    <path d="M0 0h400L200 0Z M0 0l200 80L400 0" fill="none" stroke="#8c5b3d" stroke-width="16" />
    <circle cx="200" cy="86" r="26" fill="none" stroke="#8c5b3d" stroke-width="6" /><path d="M200 60v52M174 86h52" stroke="#8c5b3d" stroke-width="4" />
    <path d="M200 112 140 220h120Z" fill="#fff6c8" opacity={weather === 'sunny' ? 0.35 : 0.18} />
    <g fill="#a87850" stroke="#5a3d25" stroke-width="2"><rect x="24" y="130" width="64" height="44" /><rect x="320" y="120" width="54" height="54" /></g><rect x="332" y="110" width="30" height="10" fill="#fffdf7" stroke="#5a3d25" stroke-width="1.5" />
  {:else if scene === 'beergarden'}
    <!-- chestnut trees, a blue-and-white maypole and bunting, a long table with two litre mugs -->
    <g fill="#4d8f5c"><circle cx="40" cy="70" r="40" /><circle cx="86" cy="56" r="30" /><circle cx="350" cy="64" r="38" /><circle cx="306" cy="52" r="26" /></g>
    <rect x="52" y="96" width="12" height="80" fill="#8c5b3d" /><rect x="340" y="94" width="12" height="80" fill="#8c5b3d" />
    {#if weather === 'snowy'}<g fill="#ffffff" opacity=".9"><path d="M4 50q36-22 72 0q-36-8-72 0Z" /><path d="M316 44q34-20 68 0q-34-7-68 0Z" /></g>{/if}
    <rect x="196" y="18" width="8" height="156" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" />
    <g fill="#4b78c2">{#each [0, 1, 2, 3, 4, 5, 6] as i (i)}<path d="M196 {26 + i * 21}l8-6v8l-8 6Z" />{/each}</g>
    <path d="M70 16q65 22 130 4 65 18 130-4" fill="none" stroke="#172a45" stroke-width="1.5" />
    <g stroke="#172a45" stroke-width=".8">{#each Array.from({ length: 12 }, (_, i) => i) as i (i)}<path d="M{82 + i * 22} {i < 6 ? 20 + i * 0.6 : 23 - (i - 6) * 0.6}l5 10 5-10Z" fill={i % 2 ? '#4b78c2' : '#fffdf7'} />{/each}</g>
    <g fill="#a87850" stroke="#5a3d25" stroke-width="2"><rect x="96" y="140" width="100" height="8" /><rect x="104" y="148" width="7" height="26" /><rect x="180" y="148" width="7" height="26" /></g>
    <g stroke="#a45e38" stroke-width="1.5"><rect x="118" y="120" width="16" height="20" rx="2" fill="#e6b52e" /><rect x="116" y="116" width="20" height="7" rx="3.5" fill="#fffdf7" /><path d="M134 125q7 0 7 6t-7 6" fill="none" /><rect x="158" y="120" width="16" height="20" rx="2" fill="#e6b52e" /><rect x="156" y="116" width="20" height="7" rx="3.5" fill="#fffdf7" /><path d="M174 125q7 0 7 6t-7 6" fill="none" /></g>
  {:else if scene === 'forest'}
    <!-- a forest in the early morning: firs and tall beech trunks, shafts of sunlight, ferns and red toadstools -->
    <g fill="#3c7350"><path d="M-14 172l40-136 40 136Z" /><path d="M326 172l38-128 38 128Z" /></g>
    <!-- morning mist drifting between the trees, and a low veil of it over the forest floor -->
    <g class="story-fog" fill="#ffffff" opacity=".45"><ellipse cx="60" cy="118" rx="110" ry="14" /><ellipse cx="330" cy="104" rx="120" ry="12" /><ellipse cx="200" cy="134" rx="96" ry="10" /></g>
    <g fill="#4d8f5c"><path d="M48 172l30-104 30 104Z" /><path d="M276 172l28-96 28 96Z" /></g>
    <g fill="#7a6a5a"><rect x="128" y="0" width="16" height="172" /><rect x="236" y="0" width="13" height="172" /></g>
    <g fill="#55a66a" opacity=".92"><circle cx="136" cy="-4" r="46" /><circle cx="176" cy="-10" r="30" /><circle cx="244" cy="-2" r="40" /></g>
    <g fill="#fff6c8" opacity={weather === 'sunny' ? 0.3 : 0.12}><path d="M150 0h22l62 172h-40Z" /><path d="M196 0h12l52 172h-26Z" /></g>
    {#if weather === 'snowy'}<g fill="#ffffff" opacity=".9"><path d="M14 64l12-28 12 28q-12-6-24 0Z" /><path d="M352 70l12-26 12 26q-12-6-24 0Z" /></g>{/if}
    <g fill="#5a9a40"><path d="M14 172q4-22 20-26-8 10-10 26Z" /><path d="M30 172q8-18 22-20-10 8-12 20Z" /><path d="M352 172q-4-22-20-26 8 10 10 26Z" /><path d="M372 172q8-18 22-20-10 8-12 20Z" /></g>
    <rect x="108" y="162" width="4" height="10" fill="#fffdf7" /><path d="M102 164q8-12 16 0Z" fill="#d64b45" /><circle cx="107" cy="160" r="1.2" fill="#fffdf7" />
    <rect x="300" y="164" width="3" height="8" fill="#fffdf7" /><path d="M296 165q5-8 11 0Z" fill="#d64b45" />
    <g class="story-fog story-fog-low" fill="#ffffff" opacity=".4"><ellipse cx="90" cy="166" rx="130" ry="9" /><ellipse cx="320" cy="164" rx="120" ry="8" /></g>
  {:else if scene === 'alps'}
    <!-- snow-capped peaks above an alpine pasture, a wooden Alm hut with red geraniums, and a few firs -->
    <path d="M-10 172 70 60l50 60 60-90 80 100 50-50 110 152Z" fill="#8a9bb0" /><path d="M120 120l60-90 40 50-36 92Z" fill="#7a8ba0" />
    <g fill="#fffdf7"><path d="M70 60l-18 25 8-3 7 5 7-6 11 2Z" /><path d="M180 30l-24 36 10-4 9 7 10-8 10 5 9-6Z" /><path d="M310 80l-20 20 8-3 7 5 8-5 11 3Z" /></g>
    <path d="M-10 172q60-44 140-30t140-16 140 12v34Z" fill="#8fc27a" />
    <g fill="#3c7350"><path d="M24 172l16-46 16 46Z" /><path d="M52 172l13-36 13 36Z" /><path d="M250 172l12-32 12 32Z" /></g>
    <rect x="300" y="124" width="78" height="48" fill="#8c5b3d" stroke="#5a3d25" stroke-width="2" /><path d="M300 136h78M300 148h78M300 160h78" stroke="#6b4a2e" stroke-width="1" />
    <path d="M290 128l49-28 49 28Z" fill="#6b4a2e" stroke="#5a3d25" stroke-width="2" />
    {#if weather === 'snowy'}<path d="M290 128l49-28 49 28-4 2-45-25-45 25Z" fill="#ffffff" />{/if}
    <rect x="312" y="134" width="18" height="14" fill="#cfe6f2" stroke="#fffdf7" stroke-width="2" /><rect x="310" y="148" width="22" height="5" fill="#a87850" />
    <g fill="#d64b45"><circle cx="314" cy="147" r="2.6" /><circle cx="321" cy="146" r="2.6" /><circle cx="328" cy="147" r="2.6" /></g>
    <rect x="348" y="140" width="16" height="32" fill="#5a3d25" /><rect x="296" y="160" width="10" height="12" fill="#a87850" />
  {:else if scene === 'castle'}
    <!-- Neuschwanstein: a white castle with slate-blue turrets on a wooded crag, mountains behind and the forest below -->
    <path d="M-10 172 60 70l60 70 70-100 90 110 60-60 90 82Z" fill="#a9b7c6" />
    <g fill="#fffdf7" opacity=".9"><path d="M60 70l-14 20 7-2 7 4 7-5 8 2Z" /><path d="M190 40l-20 28 9-3 8 5 9-6 12 3Z" /></g>
    <path d="M224 172q18-54 86-62 68 8 86 62Z" fill="#7a8a6a" />
    <g fill="#fffdf7" stroke="#8a939e" stroke-width="1.5"><rect x="244" y="86" width="22" height="34" /><rect x="262" y="70" width="70" height="50" /><rect x="296" y="56" width="12" height="20" /><rect x="330" y="40" width="16" height="80" /></g>
    <g fill="#5a6f8a"><path d="M242 86l13-16 13 16Z" /><path d="M262 70l35-22 35 22Z" /><path d="M294 56l8-16 8 16Z" /><path d="M327 40l11-26 11 26Z" /></g>
    <g fill="#5a6f8a">{#each [0, 1, 2, 3] as i (i)}<rect x={270 + i * 16} y="80" width="6" height="10" rx="3" /><rect x={270 + i * 16} y="100" width="6" height="10" rx="3" />{/each}<rect x="335" y="56" width="6" height="10" rx="3" /><rect x="251" y="96" width="6" height="10" rx="3" /></g>
    {#if weather === 'snowy'}<g fill="#ffffff"><path d="M262 70l35-22 35 22-4 1-31-19-31 19Z" /><path d="M327 40l11-26 11 26-3 1-8-20-8 20Z" /></g>{/if}
    <g fill="#3c7350"><path d="M210 172l12-34 12 34Z" /><path d="M376 172l12-30 12 30Z" /></g>
    <g fill="#3c7350"><path d="M10 172l16-48 16 48Z" /><path d="M38 172l14-38 14 38Z" /><path d="M64 172l12-30 12 30Z" /></g>
  {:else if scene === 'lindau'}
    <!-- Lindau harbour: the Alps across Lake Constance, the Bavarian lion on its pedestal, the lighthouse with its clock and a white passenger ship -->
    <path d="M0 120l40-30 30 18 40-36 50 40 40-26 60 34 50-30 50 22 40-14v34H0Z" fill="#b9c7d6" />
    <g fill="#fffdf7" opacity=".85"><path d="M110 72l-13 12 6-1 6 3 6-4 8 2Z" /><path d="M310 90l-13 8h6l6 2 6-3 8 1Z" /></g>
    <rect y="122" width="400" height="50" fill="#5b9bc9" />
    <g fill="none" stroke="#9cc6e4" stroke-width="2" stroke-linecap="round"><path d="M110 150q8-4 16 0M190 160q8-4 16 0M250 146q8-4 16 0M276 162q8-4 16 0" /></g>
    <g transform="translate(130 116)">
      <path d="M0 14h96l-10 12H8Z" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" /><path d="M4 21h86" stroke="#4b78c2" stroke-width="3" />
      <rect x="16" y="2" width="58" height="12" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" /><rect x="30" y="-10" width="26" height="12" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" />
      <rect x="38" y="-20" width="8" height="10" fill="#d64b45" stroke="#172a45" stroke-width="1.2" />
      <g fill="#8ab4d9">{#each [0, 1, 2, 3, 4] as i (i)}<rect x={22 + i * 10} y="5" width="6" height="5" rx="1" />{/each}</g>
    </g>
    <rect x="0" y="150" width="100" height="22" fill="#a89a86" /><rect x="300" y="150" width="100" height="22" fill="#a89a86" />
    <rect x="34" y="96" width="34" height="54" fill="#d9cdb8" stroke="#8a7a68" stroke-width="2" /><rect x="30" y="92" width="42" height="6" fill="#c9bca5" stroke="#8a7a68" stroke-width="1.5" />
    <path d="M70 86q11-3 9-17-2 4-5 4" fill="none" stroke="#8a6a2a" stroke-width="2.2" stroke-linecap="round" /><path d="M64 92q7-4 7-13 0-12-13-14H48l-6 27Z" fill="#c9a24a" stroke="#8a6a2a" stroke-width="1.5" />
    <path d="M40 92V72h9v20Z" fill="#c9a24a" stroke="#8a6a2a" stroke-width="1.5" /><path d="M38 92h12" stroke="#8a6a2a" stroke-width="1.5" />
    <path d="M44 46l5 3 5-1 2 5 5 2-2 5 3 4-4 3 1 5-5 1-2 5-5-2-4 3-3-4h-5v-5l-4-3 3-4-2-5 5-1 1-5 5 1Z" fill="#a8762a" stroke="#8a6a2a" stroke-width="1" />
    <circle cx="41" cy="63" r="7.5" fill="#d4ad55" /><ellipse cx="35.5" cy="67" rx="4" ry="3.2" fill="#e8c983" /><circle cx="39" cy="61" r="1.3" fill="#172a45" /><circle cx="33" cy="66" r="1.2" fill="#5a3d25" />
    <path d="M336 150l6-94h20l6 94Z" fill="#fffdf7" stroke="#8a939e" stroke-width="1.5" /><rect x="340" y="42" width="24" height="14" fill="#e6b52e" stroke="#8a939e" stroke-width="1.5" />
    <path d="M337 42l15-14 15 14Z" fill="#c4473f" stroke="#8a939e" stroke-width="1" /><path d="M336 58h32" stroke="#8a939e" stroke-width="2" />
    <circle cx="352" cy="74" r="5" fill="#fffdf7" stroke="#172a45" stroke-width="1.2" /><path d="M352 74v-3M352 74l2 1" stroke="#172a45" stroke-width="1" />
    <g fill="#5a6f8a"><rect x="349" y="96" width="6" height="9" rx="3" /><rect x="349" y="124" width="6" height="9" rx="3" /></g>
  {:else if scene === 'mainau'}
    <!-- the flower island of Mainau: the yellow baroque palace above the lake, palms, and beds of roses, dahlias and lavender -->
    <path d="M0 118l40-24 30 14 40-28 50 32 40-20 60 26 50-24 50 18 40-10v30H0Z" fill="#b9c7d6" />
    <rect y="114" width="400" height="58" fill="#5b9bc9" />
    <path d="M-10 172q80-62 200-58t220 30v28Z" fill="#8fc27a" />
    <rect x="20" y="82" width="130" height="54" fill="#e8c27a" stroke="#a8862f" stroke-width="1.5" /><path d="M14 84l16-20h110l16 20Z" fill="#6b4a3a" />
    <path d="M68 82l17-18 17 18Z" fill="#e8c27a" stroke="#a8862f" stroke-width="1.5" />
    <g fill="#fffdf7" stroke="#a8862f" stroke-width=".8">{#each [0, 1, 2, 3, 4, 5, 6] as i (i)}<rect x={28 + i * 17} y="92" width="8" height="12" rx="2" /><rect x={28 + i * 17} y="114" width="8" height="12" rx="2" />{/each}</g>
    {#if weather === 'snowy'}<path d="M14 84l16-20h110l16 20-3 1-14-17H31L17 85Z" fill="#ffffff" />{/if}
    <path d="M356 172q-6-50 2-84" fill="none" stroke="#8c5b3d" stroke-width="6" /><g fill="#55a66a"><path d="M358 88q-30-6-44 10 22-8 44-10Z" /><path d="M358 88q28-12 46 0-24-4-46 0Z" /><path d="M358 88q-12-24-34-26 20 10 34 26Z" /><path d="M358 88q12-24 34-24-20 8-34 24Z" /></g>
    <path d="M0 172q100-22 200-14t200-4v18Z" fill="#55a66a" />
    <g>{#each Array.from({ length: 15 }, (_, i) => i) as i (i)}<circle cx={12 + i * 27} cy={166 - (i % 2) * 6} r="5.5" fill={['#d64b45', '#e8843a', '#8a62b6', '#df8eb1', '#e6b52e'][i % 5]} /><circle cx={25 + i * 27} cy={168 - (i % 3) * 3} r="3.5" fill={['#8a62b6', '#d64b45', '#e6b52e', '#e8843a', '#df8eb1'][i % 5]} />{/each}</g>
  {/if}
  <rect y="172" width="400" height="48" fill={palette.floor} />
  <rect y="172" width="400" height="4" fill="rgba(23,42,69,.14)" />
  {#if outdoor && weather === 'snowy'}<path d="M0 172h400v7q-50 5-100 0t-100 0-100 0-100 0Z" fill="#ffffff" />{/if}
  {#if outdoor && weather === 'rainy'}<g fill="rgba(234,243,251,.5)"><ellipse cx="120" cy="196" rx="34" ry="4" /><ellipse cx="300" cy="206" rx="26" ry="3.5" /></g>{/if}
  {#if scene === 'station'}<path d="M0 196h400M0 210h400" stroke="#596477" stroke-width="3" /><rect y="172" width="400" height="6" fill="#e6b52e" />{/if}
  {#if scene === 'square'}<g fill="rgba(23,42,69,.12)">{#each Array.from({ length: 20 }, (_, i) => i) as i}<rect x={i * 20 + (i % 2) * 6} y="186" width="14" height="8" rx="3" /><rect x={i * 20 + 10} y="202" width="14" height="8" rx="3" />{/each}</g>{/if}
</svg>

<style>
  .story-scene { position:absolute;inset:0;width:100%;height:100%; }
  /* the forest mist drifts slowly to and fro, the low veil against the bands above it */
  .story-fog { animation:story-fog 16s ease-in-out infinite alternate; }
  .story-fog-low { animation-duration:11s;animation-direction:alternate-reverse; }
  @keyframes story-fog { from { translate:-24px 0; } to { translate:24px 0; } }
  @media (prefers-reduced-motion:reduce) { .story-fog { animation:none; } }
  /* Two copies of the rain or snow, one sky-height apart, fall together so the loop has no seam */
  .story-rain { animation:story-fall .9s linear infinite; }
  .story-snow { animation:story-fall 7s linear infinite; }
  .story-cloud { animation:story-drift 9s ease-in-out infinite alternate; }
  .story-cloud:nth-of-type(2n) { animation-duration:12s;animation-direction:alternate-reverse; }
  @keyframes story-fall { from { transform:translateY(0); } to { transform:translateY(var(--fall)); } }
  @keyframes story-drift { from { translate:-6px 0; } to { translate:6px 0; } }
  @media (prefers-reduced-motion:reduce) { .story-rain,.story-snow,.story-cloud { animation:none; } }
</style>
