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
    mainau: { back: '#cfe6f2', floor: '#8fc27a' },
    cliffs: { back: '#cfe6f2', floor: '#d8d2c4' },
    berlin: { back: '#cfe6f2', floor: '#b8aa98' },
    hamburg: { back: '#cfe6f2', floor: '#9aa3ad' },
    munich: { back: '#cfe6f2', floor: '#b8aa98' },
    cologne: { back: '#cfe6f2', floor: '#b8aa98' },
    frankfurt: { back: '#cfe6f2', floor: '#c4cbd3' },
    library: { back: '#e8e2d9', floor: '#b8a07e' }
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
    mainau: { x: 0, y: 0, w: 400, h: 172 },
    cliffs: { x: 0, y: 0, w: 400, h: 172 },
    berlin: { x: 0, y: 0, w: 400, h: 172 },
    hamburg: { x: 0, y: 0, w: 400, h: 172 },
    munich: { x: 0, y: 0, w: 400, h: 172 },
    cologne: { x: 0, y: 0, w: 400, h: 172 },
    frankfurt: { x: 0, y: 0, w: 400, h: 172 },
    library: { x: 200, y: 40, w: 140, h: 110 }
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
    <linearGradient id="{uid}-sunset" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b4a8a" /><stop offset=".45" stop-color="#e5728a" /><stop offset=".8" stop-color="#f6a35c" /><stop offset="1" stop-color="#ffd08a" /></linearGradient>
  </defs>
  <rect width="400" height="220" fill={palette.back} />
  <!-- the weather, behind the window frames -->
  <g class="story-weather" clip-path="url(#{uid}-sky)" style:--fall="{sky.h}px">
    <rect x={sky.x} y={sky.y} width={sky.w} height={sky.h} fill={sunset ? `url(#${uid}-sunset)` : skyColours[weather]} />
    {#if sunset}
      <circle cx="270" cy="150" r="34" fill="#ffd36b" opacity=".95" /><circle cx="270" cy="150" r="48" fill="#ffd36b" opacity=".25" />
      {@render cloud(clouds[0].x, clouds[0].y, clouds[0].s * 0.8)}
     {:else if weather === 'sunny'}
       <circle class="story-sun" cx={outdoor ? 340 : sky.x + sky.w * 0.7} cy={outdoor ? 44 : sky.y + sky.h * 0.36} r={outdoor ? 24 : unit * 0.2} fill="#f4c84a" />
       {@render cloud(clouds[0].x, clouds[0].y, clouds[0].s * 0.8)}
       <g class="story-birds" fill="none" stroke="#172a45" stroke-width="1.6" stroke-linecap="round">
         <path d="M40 30q6-4 12 0q6-4 12 0" />
         <path d="M120 55q5-3 10 0q5-3 10 0" />
       </g>
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
  {:else if scene === 'farm'}
    <!-- a red barn with a hayloft, a wooden fence across the field and round hay bales -->
    <path d="M300 172V92l40-30 40 30v80Z" fill="#c4473f" stroke="#172a45" stroke-width="2" /><path d="M300 92l40-30 40 30" fill="none" stroke="#fffdf7" stroke-width="4" />
    <rect x="324" y="128" width="32" height="44" fill="#8c2f2a" stroke="#fffdf7" stroke-width="3" /><path d="M324 128l32 44M356 128l-32 44" stroke="#fffdf7" stroke-width="2" /><rect x="331" y="96" width="18" height="16" fill="#e6b52e" stroke="#fffdf7" stroke-width="2" />
    {#if weather === 'snowy'}<path d="M296 94l44-34 44 34-6 3-38-29-38 29Z" fill="#ffffff" />{/if}
    <g stroke="#8c5b3d" stroke-width="4"><path d="M0 146h120M0 160h120M14 138v34M54 138v34M94 138v34" /></g>
    <g fill="#e6c25e" stroke="#a8862f" stroke-width="2"><circle cx="40" cy="120" r="16" /><circle cx="78" cy="126" r="12" /></g><path d="M30 116q10-5 20 0M70 124q8-4 16 0" fill="none" stroke="#a8862f" stroke-width="1.5" />
  {:else if scene === 'zoo'}
    <!-- an arched zoo entrance with a sign, acacia and palm trees, and the enclosure fence -->
    <path d="M18 172V60q46-40 92 0v112h-14V68q-32-28-64 0v104Z" fill="#8c5b3d" stroke="#172a45" stroke-width="2" />
    <rect x="30" y="32" width="68" height="20" rx="4" fill="#e6a527" stroke="#172a45" stroke-width="2" /><text x="64" y="47" text-anchor="middle" font-family="'DM Sans',sans-serif" font-size="13" font-weight="900" fill="#172a45">ZOO</text>
    <path d="M330 172V96" stroke="#8c5b3d" stroke-width="8" /><ellipse cx="330" cy="88" rx="56" ry="16" fill="#6e9b4a" /><ellipse cx="318" cy="76" rx="34" ry="10" fill="#7fae57" />
    <path d="M268 172q-4-50 6-86" fill="none" stroke="#a87850" stroke-width="6" /><g fill="#55a66a"><path d="M274 86q-30-6-44 10 22-8 44-10Z" /><path d="M274 86q28-12 46 0-24-4-46 0Z" /><path d="M274 86q-12-24-34-26 20 10 34 26Z" /><path d="M274 86q12-24 34-24-20 8-34 24Z" /></g>
    <g stroke="#596477" stroke-width="2.5"><path d="M110 150h290" /><path d="M110 164h290" />{#each Array.from({ length: 15 }, (_, i) => i) as i (i)}<path d="M{118 + i * 20} 144v28" />{/each}</g>
  {:else if scene === 'butcher'}
    <!-- white tiles, hanging hams and sausages, and a glass counter full of cuts -->
    <rect x="24" y="22" width="92" height="62" rx="6" fill="none" stroke="#fffdf7" stroke-width="6" /><path d="M70 22v62" stroke="#fffdf7" stroke-width="4" />
    <g stroke="rgba(23,42,69,.08)" stroke-width="1">{#each Array.from({ length: 9 }, (_, i) => i) as i (i)}<path d="M{140 + i * 28} 0v120" /><path d="M140 {i * 14}h260" />{/each}</g>
    <path d="M150 14h230" stroke="#596477" stroke-width="3" />
    <g fill="#b5523f" stroke="#7a2e2a" stroke-width="1.5"><path d="M168 14v6q-12 10-8 30 6 14 16 0 4-20-8-30Z" /><path d="M352 14v6q-12 10-8 30 6 14 16 0 4-20-8-30Z" /></g>
    <g stroke="#7a2e2a" stroke-width="1.2" fill="#c96a4e">{#each [0, 1, 2, 3] as i (i)}<path d="M{214 + i * 30} 14v4q-4 2-4 8v26q0 5 4 5t4-5V26q0-6-4-8Z" />{/each}</g>
    <rect x="18" y="122" width="102" height="50" fill="#e7ecef" stroke="#172a45" stroke-width="2" /><rect x="22" y="104" width="94" height="18" fill="rgba(207,230,242,.6)" stroke="#172a45" stroke-width="2" />
    <g fill="#c96a4e" stroke="#7a2e2a" stroke-width="1"><ellipse cx="38" cy="118" rx="10" ry="4" /><ellipse cx="62" cy="118" rx="10" ry="4" fill="#e8a59a" /><path d="M78 120q12-8 26 0" stroke-width="5" stroke="#b5523f" fill="none" /></g>
    <rect x="282" y="122" width="102" height="50" fill="#e7ecef" stroke="#172a45" stroke-width="2" /><rect x="286" y="104" width="94" height="18" fill="rgba(207,230,242,.6)" stroke="#172a45" stroke-width="2" />
    <g fill="#e8a59a" stroke="#7a2e2a" stroke-width="1"><ellipse cx="304" cy="118" rx="11" ry="4" /><ellipse cx="330" cy="118" rx="9" ry="4" fill="#c96a4e" /><ellipse cx="358" cy="118" rx="12" ry="4" /></g>
  {:else if scene === 'bakery'}
    <!-- wooden shelves with loaves and pretzels, and a glass counter with cakes and rolls -->
    <rect x="296" y="22" width="84" height="62" rx="6" fill="none" stroke="#fffdf7" stroke-width="6" /><path d="M338 22v62" stroke="#fffdf7" stroke-width="4" />
    <g fill="#a87850"><rect x="20" y="40" width="110" height="6" /><rect x="20" y="80" width="110" height="6" /><rect x="20" y="40" width="5" height="90" /><rect x="125" y="40" width="5" height="90" /><rect x="20" y="120" width="110" height="6" /></g>
    <g fill="#c98a45" stroke="#8c5b3d" stroke-width="1.5"><ellipse cx="42" cy="32" rx="16" ry="8" /><ellipse cx="78" cy="32" rx="16" ry="8" /><ellipse cx="112" cy="33" rx="12" ry="7" fill="#9a6a3f" /><ellipse cx="44" cy="113" rx="12" ry="7" fill="#9a6a3f" /><ellipse cx="74" cy="112" rx="14" ry="8" /><ellipse cx="106" cy="113" rx="12" ry="7" /></g>
    <g fill="none" stroke="#9a5a2a" stroke-width="4">{#each [0, 1, 2] as i (i)}<path d="M{38 + i * 32} 76q-10-14 0-16t8 8q-8 8-14 8m14-8q8 8 14 8 10-2 0-16t-8 8" />{/each}</g>
    <rect x="270" y="118" width="114" height="54" fill="#fffdf7" stroke="#172a45" stroke-width="2" /><rect x="274" y="100" width="106" height="18" fill="rgba(207,230,242,.6)" stroke="#172a45" stroke-width="2" />
    <g stroke="#8c5b3d" stroke-width="1"><path d="M282 116h22v-8h-22Z" fill="#f2c7a5" /><path d="M282 108h22" stroke="#df8eb1" stroke-width="3" /><path d="M314 116h22v-10h-22Z" fill="#8c5b3d" /><path d="M314 106h22" stroke="#fffdf7" stroke-width="2" /><circle cx="352" cy="111" r="5" fill="#d9a56a" /><circle cx="366" cy="111" r="5" fill="#d9a56a" /></g>
  {:else if scene === 'boutique'}
    <!-- a rack of shirts on hangers, a tall mirror and a mannequin in a dress -->
    <rect x="150" y="18" width="100" height="58" rx="6" fill="none" stroke="#fffdf7" stroke-width="6" />
    <path d="M14 34h120M20 34v138M128 34v138" stroke="#596477" stroke-width="3" />
    {#each [0, 1, 2, 3, 4] as i (i)}
      <path d="M{30 + i * 22} 34v4l-8 6h16l-8-6" fill="none" stroke="#596477" stroke-width="1.5" />
      <path d="M{20 + i * 22} 44h20l4 8-5 2v40h-18v-40l-5-2Z" fill={['#e6a527', '#4b78c2', '#df8eb1', '#34824d', '#d64b45'][i]} stroke="#172a45" stroke-width="1.2" />
    {/each}
    <rect x="300" y="30" width="44" height="130" rx="20" fill="#cfe6f2" stroke="#a87850" stroke-width="5" /><path d="M312 46l20 30M310 64l14 20" stroke="#fffdf7" stroke-width="3" opacity=".7" />
    <circle cx="372" cy="54" r="9" fill="#e9d6c3" /><path d="M372 63v6M358 74h28l6 60h-40Z" fill="#8a62b6" stroke="#172a45" stroke-width="1.5" /><path d="M372 134v34M362 168h20" stroke="#596477" stroke-width="3" />
  {:else if scene === 'perfumery'}
    <!-- glass shelves of pastel perfume bottles and a mirrored counter -->
    <rect x="28" y="24" width="80" height="64" rx="6" fill="none" stroke="#fffdf7" stroke-width="6" />
    <g fill="rgba(255,253,247,.7)" stroke="#b9a6c4" stroke-width="1.5"><rect x="250" y="56" width="136" height="5" /><rect x="250" y="100" width="136" height="5" /><rect x="16" y="120" width="104" height="5" /></g>
    {#each [0, 1, 2, 3, 4] as i (i)}{@render bottle(262 + i * 28, 56, pastels[i], i % 3)}{@render bottle(266 + i * 26, 100, pastels[(i + 2) % 5], (i + 1) % 3)}{/each}
    {#each [0, 1, 2] as i (i)}{@render bottle(34 + i * 34, 120, pastels[(i + 3) % 5], (i + 2) % 3)}{/each}
    <rect x="270" y="128" width="116" height="44" fill="#e9dcef" stroke="#7a6a8a" stroke-width="2" /><rect x="276" y="134" width="104" height="10" fill="#fffdf7" opacity=".6" />
    <g fill="#e6a527"><circle cx="300" cy="18" r="3" /><circle cx="330" cy="12" r="2" /><circle cx="360" cy="20" r="2.5" /></g>
  {:else if scene === 'workshop'}
    <!-- screens with technical drawings, gears on the wall and a robot arm on a workbench -->
    <rect x="150" y="18" width="100" height="54" rx="6" fill="none" stroke="#fffdf7" stroke-width="6" />
    <g stroke="#172a45" stroke-width="2"><rect x="16" y="30" width="58" height="40" rx="3" fill="#2b4a70" /><rect x="80" y="30" width="58" height="40" rx="3" fill="#2b4a70" /></g>
    <g fill="none" stroke="#8ab4d9" stroke-width="1.2"><path d="M24 60h40M24 60V40M30 54l8-8 8 4 10-10" /><circle cx="98" cy="50" r="10" /><path d="M88 50h20M98 40v20M116 38h14v24h-14Z" /></g>
    <path d="M44 70v10M108 70v10M30 82h92" stroke="#596477" stroke-width="3" />
    <g fill="#9aa3ad" stroke="#596477" stroke-width="2"><circle cx="310" cy="40" r="16" /><circle cx="342" cy="58" r="11" /></g><g fill="#e7ecef"><circle cx="310" cy="40" r="6" /><circle cx="342" cy="58" r="4" /></g>
    <g stroke="#596477" stroke-width="4" stroke-dasharray="4 5" fill="none"><circle cx="310" cy="40" r="19" /><circle cx="342" cy="58" r="13.5" /></g>
    <rect x="274" y="128" width="116" height="10" fill="#8c5b3d" /><path d="M282 138v34M382 138v34" stroke="#8c5b3d" stroke-width="5" />
    <rect x="300" y="116" width="26" height="12" rx="2" fill="#e6a527" stroke="#172a45" stroke-width="1.5" /><path d="M313 116l14-30 22 10" fill="none" stroke="#e6a527" stroke-width="6" stroke-linecap="round" /><circle cx="327" cy="86" r="4" fill="#172a45" /><path d="M349 96l6 6m-6-6 8-2" stroke="#172a45" stroke-width="2.5" stroke-linecap="round" />
  {:else if scene === 'beach'}
    <!-- the sea glowing under the setting sun, a beach bar with a parasol and two loungers -->
    <rect y="132" width="400" height="40" fill="#3f6fa8" /><path d="M200 136h140M226 146h88M244 156h52" stroke="#ffd08a" stroke-width="3" stroke-linecap="round" opacity=".8" />
    <path d="M0 140q20-5 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#8ab4d9" stroke-width="2" />
    <path d="M30 172V92" stroke="#8c5b3d" stroke-width="4" /><path d="M-4 96q34-30 68 0Z" fill="#d64b45" /><path d="M-4 96q34-30 68 0" fill="none" stroke="#fffdf7" stroke-width="2" stroke-dasharray="8 8" />
    <rect x="44" y="140" width="62" height="32" fill="#c98a45" stroke="#8c5b3d" stroke-width="2" /><path d="M44 140h62" stroke="#e6a527" stroke-width="4" />
    <g fill="#fffdf7" stroke="#8c5b3d" stroke-width="2"><path d="M330 166l40-10 10 4-40 10Z" /><path d="M300 170l30-4" /></g>
  {:else if scene === 'airport'}
    <!-- the terminal's glass front, the control tower, the runway and a plane taking off -->
    <rect x="0" y="96" width="140" height="76" fill="#dfe5ea" stroke="#596477" stroke-width="2" />
    <g fill="#8ab4d9" stroke="#596477" stroke-width="1.5">{#each [0, 1, 2, 3, 4, 5] as i (i)}<rect x={6 + i * 22} y="104" width="18" height="40" />{/each}</g>
    <rect x="344" y="62" width="16" height="110" fill="#dfe5ea" stroke="#596477" stroke-width="2" /><path d="M332 48h40l-6 16h-28Z" fill="#8ab4d9" stroke="#596477" stroke-width="2" /><path d="M330 46h44" stroke="#596477" stroke-width="3" />
    <g class="story-plane" transform="translate(210 46) rotate(-12)">
      <path d="M-44 0q0-6 8-6h70q12 0 16 6-4 6-16 6h-70q-8 0-8-6Z" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" />
      <path d="M-4 0-22 22h10L14 0ZM-4 0-18-16h8L12 0Z" fill="#4b78c2" stroke="#172a45" stroke-width="1" /><path d="M-40-4-48-18h8l8 12Z" fill="#d64b45" />
      <g fill="#8ab4d9">{#each [0, 1, 2, 3, 4] as i (i)}<circle cx={-26 + i * 10} cy="-2" r="1.6" />{/each}</g>
    </g>
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
  {:else if scene === 'cliffs'}
    <!-- Rügen: white chalk cliffs topped with beech forest above the turquoise Baltic, and a Fischbrötchen kiosk on the beach -->
    <rect y="116" width="400" height="56" fill="#4fb3b9" />
    <g fill="none" stroke="#a6e0e0" stroke-width="2" stroke-linecap="round"><path d="M180 132q8-4 16 0M226 150q8-4 16 0M262 128q8-4 16 0M200 162q8-4 16 0" /></g>
    <path d="M250 118l18-26 28-6 18 32Z" fill="#f4f1e8" opacity=".85" /><g fill="#4d8f5c" opacity=".85"><circle cx="270" cy="90" r="8" /><circle cx="286" cy="86" r="9" /></g>
    <path d="M0 40l60 4 20 26 20-12 30 52 20 10 10 52H0Z" fill="#f4f1e8" stroke="#cfc8b8" stroke-width="2" />
    <path d="M28 60l6 44M66 76l-4 50M106 96l5 40M136 128l3 30" fill="none" stroke="#ddd6c4" stroke-width="2" />
    <g fill="#4d8f5c"><circle cx="8" cy="34" r="15" /><circle cx="32" cy="32" r="17" /><circle cx="58" cy="38" r="13" /><circle cx="80" cy="62" r="10" /><circle cx="98" cy="54" r="9" /></g>
    {#if weather === 'snowy'}<g fill="#ffffff"><path d="M-6 30q14-14 28-4 12-12 28-2 10-4 16 6-36-6-72 0Z" /></g>{/if}
    <g stroke="#172a45" stroke-width="2"><rect x="300" y="112" width="84" height="60" fill="#4b78c2" /><rect x="306" y="124" width="72" height="24" fill="#cfe6f2" /><rect x="300" y="148" width="84" height="6" fill="#a87850" /></g>
    <g stroke="#172a45" stroke-width="1.5">{#each [0, 1, 2, 3, 4, 5] as i (i)}<path d="M{294 + i * 16} 112l2-14h16l-2 14Z" fill={i % 2 ? '#fffdf7' : '#d64b45'} />{/each}</g>
    <rect x="304" y="82" width="76" height="14" rx="3" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" /><text x="342" y="92.5" text-anchor="middle" font-family="'DM Sans',sans-serif" font-size="8.5" font-weight="900" fill="#172a45">FISCHBRÖTCHEN</text>
    <g fill="#e8c27a" stroke="#a87850" stroke-width="1"><ellipse cx="322" cy="146" rx="8" ry="3" /><ellipse cx="342" cy="146" rx="8" ry="3" /><ellipse cx="362" cy="146" rx="8" ry="3" /></g>
  {:else if scene === 'berlin'}
    <!-- Berlin: the Brandenburg Gate with its green copper quadriga, the city behind it and the TV tower rising above everything -->
    <g fill="#b8c2cc"><rect x="160" y="112" width="40" height="60" /><rect x="206" y="96" width="30" height="76" /><rect x="242" y="120" width="44" height="52" /><rect x="292" y="104" width="30" height="68" /><rect x="362" y="118" width="40" height="54" /></g>
    <g fill="#9aa3ad" opacity=".5">{#each [0, 1, 2, 3, 4] as i (i)}<rect x={212} y={104 + i * 12} width="18" height="5" /><rect x={248} y={128 + i * 8} width="32" height="3" />{/each}</g>
    <path d="M330 172l6-110h6l6 110Z" fill="#c4cbd3" stroke="#596477" stroke-width="1.5" />
    <circle cx="339" cy="58" r="16" fill="#c4cbd3" stroke="#596477" stroke-width="1.5" /><path d="M323 58h32" stroke="#596477" stroke-width="2" /><g fill="#596477">{#each [0, 1, 2, 3, 4] as i (i)}<circle cx={329 + i * 5} cy="53" r="1.2" />{/each}</g>
    <path d="M339 42V12" stroke="#596477" stroke-width="2.5" /><path d="M339 12V4" stroke="#d64b45" stroke-width="2.5" /><path d="M339 22v4" stroke="#fffdf7" stroke-width="2.5" />
    <g fill="#e6d3a8" stroke="#a8862f" stroke-width="1.5">
      <rect x="20" y="80" width="132" height="16" /><rect x="16" y="96" width="140" height="6" /><path d="M58 80V68h56v12Z" />
      {#each [0, 1, 2, 3, 4, 5] as i (i)}<rect x={22 + i * 24} y="102" width="8" height="70" />{/each}
    </g>
    <g fill="#4f8a7a"><path d="M70 68l4-10h24l4 10Z" /><path d="M76 60q-4-8 2-12l3 6 3-6q6 4 2 12ZM92 60q-4-8 2-12l3 6 3-6q6 4 2 12Z" /><circle cx="86" cy="44" r="4" /><path d="M86 40l1-12" stroke="#4f8a7a" stroke-width="1.5" /><path d="M83 30h8" stroke="#4f8a7a" stroke-width="1.5" /></g>
    {#if weather === 'snowy'}<g fill="#ffffff"><rect x="18" y="78" width="136" height="3" /><rect x="58" y="66" width="56" height="3" /></g>{/if}
  {:else if scene === 'hamburg'}
    <!-- Hamburg harbour: cranes and a container ship on the Elbe, and the Elbphilharmonie's glass waves on its brick warehouse -->
    <rect y="128" width="400" height="44" fill="#5d7f9a" />
    <g fill="none" stroke="#8fb0c8" stroke-width="2" stroke-linecap="round"><path d="M160 150q8-4 16 0M200 162q8-4 16 0M226 140q8-4 16 0" /></g>
    <g fill="none" stroke="#d64b45" stroke-width="4"><path d="M30 128V40h56M40 40 30 54M30 60h10" /><path d="M100 128V58h48M108 58l-8 12" /></g>
    <path d="M78 40v34M140 58v28" stroke="#172a45" stroke-width="1.5" />
    <path d="M14 128h132l-10 14H24Z" fill="#172a45" /><path d="M120 128v-14h20v14Z" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" />
    <g stroke="#172a45" stroke-width="1">{#each [0, 1, 2, 3] as i (i)}<rect x={28 + i * 22} y="114" width="20" height="14" fill={['#d64b45', '#4b78c2', '#e6b52e', '#55a66a'][i]} /><rect x={36 + i * 22} y="100" width="20" height="14" fill={['#4b78c2', '#e6b52e', '#d64b45', '#55a66a'][i]} />{/each}</g>
    <rect x="250" y="96" width="140" height="76" fill="#9a5a3a" stroke="#5a3d25" stroke-width="2" />
    <g stroke="#7a442a" stroke-width="1">{#each [0, 1, 2, 3, 4] as i (i)}<path d="M250 {106 + i * 14}h140" />{/each}</g>
    <g fill="#5a3d25">{#each [0, 1, 2, 3, 4, 5] as i (i)}<rect x={260 + i * 22} y="110" width="6" height="8" /><rect x={260 + i * 22} y="138" width="6" height="8" />{/each}</g>
    <path d="M250 96V50q20-16 36 0q18-26 40-6q22-20 36 0q14-10 28 4V96Z" fill="#a9c8e8" stroke="#596477" stroke-width="2" /><path d="M254 58q16-12 30-2M290 50q16-20 34-6M330 46q16-14 30-2" fill="none" stroke="#fffdf7" stroke-width="2" opacity=".8" />
    <g stroke="#8ab4d9" stroke-width="1">{#each [0, 1, 2, 3, 4, 5, 6] as i (i)}<path d="M{258 + i * 20} 56V96" />{/each}<path d="M250 72h140" /></g>
    {#if weather === 'snowy'}<path d="M250 50q20-16 36 0q18-26 40-6q22-20 36 0q14-10 28 4v4q-14-10-28-4q-14-14-36 0q-22-16-40 6q-16-12-36 0Z" fill="#ffffff" />{/if}
  {:else if scene === 'munich'}
    <!-- Munich's Marienplatz: the twin onion domes of the Frauenkirche, a blue-and-white flag, and the New Town Hall with its Glockenspiel -->
    <g fill="#b5523f" stroke="#7a2e2a" stroke-width="1.5"><rect x="20" y="110" width="82" height="62" /><rect x="30" y="50" width="26" height="122" /><rect x="66" y="50" width="26" height="122" /></g>
    <g fill="#7a2e2a">{#each [0, 1] as i (i)}<rect x={39 + i * 36} y="66" width="8" height="14" rx="4" /><rect x={39 + i * 36} y="94" width="8" height="14" rx="4" />{/each}</g>
    <g fill="#5a9a6a" stroke="#2f6b40" stroke-width="1.5"><path d="M30 50q0-22 13-26 13 4 13 26Z" /><path d="M66 50q0-22 13-26 13 4 13 26Z" /></g><path d="M43 24v-8M79 24v-8" stroke="#2f6b40" stroke-width="2" />
    {#if weather === 'snowy'}<g fill="#ffffff"><path d="M31 44q2-16 12-19 10 3 12 19-12-8-24 0Z" /><path d="M67 44q2-16 12-19 10 3 12 19-12-8-24 0Z" /></g>{/if}
    <path d="M190 172V24" stroke="#596477" stroke-width="2" /><rect x="190" y="24" width="30" height="20" fill="#fffdf7" stroke="#596477" stroke-width="1" />
    <g fill="#4b78c2">{#each [0, 1, 2, 3, 4] as i (i)}<path d="M{190 + i * 6} 24h3l3 4v4l-3-4h-3ZM{190 + i * 6} 34h3l3 4v4l-3-4h-3Z" />{/each}</g>
    <g fill="#a8a29a" stroke="#596477" stroke-width="1.5"><rect x="240" y="90" width="150" height="82" /><rect x="298" y="30" width="34" height="142" /></g>
    <path d="M298 30l17-26 17 26Z" fill="#5a6f8a" stroke="#596477" stroke-width="1.5" /><g fill="#596477"><path d="M240 90l8-10 8 10ZM262 90l8-10 8 10ZM352 90l8-10 8 10ZM374 90l8-10 8 10Z" /></g>
    <g fill="#5a6f8a">{#each [0, 1, 2, 3, 4, 5] as i (i)}{#if i !== 2 && i !== 3}<path d="M{248 + i * 24} 134v-16q5-7 10 0v16Z" /><path d="M{248 + i * 24} 162v-14q5-7 10 0v14Z" />{/if}{/each}</g>
    <circle cx="315" cy="48" r="8" fill="#fffdf7" stroke="#172a45" stroke-width="1.5" /><path d="M315 48v-5M315 48l3 2" stroke="#172a45" stroke-width="1.2" />
    <rect x="301" y="68" width="28" height="22" fill="#e6b52e" stroke="#596477" stroke-width="1.2" /><g fill="#d64b45"><circle cx="308" cy="78" r="3" /><circle cx="322" cy="78" r="3" /></g><g fill="#4b78c2"><rect x="305" y="81" width="6" height="7" /><rect x="319" y="81" width="6" height="7" /></g>
    <rect x="301" y="104" width="28" height="22" fill="#e6b52e" stroke="#596477" stroke-width="1.2" /><g fill="#fffdf7"><circle cx="308" cy="113" r="3" /><circle cx="322" cy="113" r="3" /></g><g fill="#d64b45"><rect x="305" y="116" width="6" height="8" /><rect x="319" y="116" width="6" height="8" /></g>
  {:else if scene === 'cologne'}
    <!-- Cologne: the arches of the Hohenzollern Bridge hung with love locks over the Rhine, and the cathedral's two dark spires -->
    <rect y="130" width="400" height="42" fill="#6d8fa8" />
    <g fill="none" stroke="#9cb8cc" stroke-width="2" stroke-linecap="round"><path d="M40 150q8-4 16 0M120 160q8-4 16 0M200 146q8-4 16 0" /></g>
    <g fill="none" stroke="#4f6a5a" stroke-width="3"><path d="M0 126q35-44 70 0q35-44 70 0q35-44 70 0" /><path d="M0 126h210" /><path d="M17 105v21M35 92v34M53 105v21M87 105v21M105 92v34M123 105v21M157 105v21M175 92v34M193 105v21" stroke-width="1.5" /></g>
    <g fill="#8a7a68"><rect x="66" y="126" width="8" height="22" /><rect x="136" y="126" width="8" height="22" /><rect x="206" y="126" width="8" height="22" /></g>
    <g>{#each Array.from({ length: 13 }, (_, i) => i) as i (i)}<circle cx={8 + i * 16} cy="123" r="2.2" fill={['#d64b45', '#e6b52e', '#4b78c2', '#df8eb1'][i % 4]} />{/each}</g>
    <g fill="#5a5650" stroke="#2e2b28" stroke-width="1.5"><rect x="292" y="90" width="54" height="82" /><path d="M262 172V62l16-54 16 54v110Z" /><path d="M344 172V62l16-54 16 54v110Z" /></g>
    <g fill="#8ab4d9" opacity=".55"><path d="M306 160v-44q6-12 12-12t12 12v44Z" /><path d="M270 150v-40q8-10 16 0v40Z" /><path d="M352 150v-40q8-10 16 0v40Z" /></g>
    <g fill="none" stroke="#2e2b28" stroke-width="1.5"><path d="M266 70h24M348 70h24M266 100h24M348 100h24" /><circle cx="319" cy="104" r="9" /></g>
    <path d="M278 8V0M360 8V0M274 3h8M356 3h8" stroke="#2e2b28" stroke-width="2" />
    {#if weather === 'snowy'}<g fill="#ffffff"><path d="M262 62l16-54 16 54-3 1-13-46-13 46Z" /><path d="M344 62l16-54 16 54-3 1-13-46-13 46Z" /></g>{/if}
  {:else if scene === 'frankfurt'}
    <!-- Frankfurt: the bank towers of "Mainhattan" rising behind the stepped half-timbered gables of the Römer -->
    <g stroke="#596477" stroke-width="1.5"><rect x="214" y="92" width="28" height="80" fill="#dfe5ea" /><rect x="248" y="42" width="30" height="130" fill="#8ab4d9" /><path d="M286 172V22l14-14 14 14v150Z" fill="#c4cbd3" /><rect x="322" y="62" width="26" height="110" fill="#6b7686" /><rect x="354" y="30" width="36" height="142" fill="#a9c8e8" /></g>
    <path d="M300 8V-4" stroke="#596477" stroke-width="2" />
    <g stroke="rgba(255,255,255,.5)" stroke-width="1">{#each Array.from({ length: 13 }, (_, i) => i) as i (i)}<path d="M214 {98 + i * 6}h28M248 {50 + i * 9}h30M286 {32 + i * 10}h28M322 {70 + i * 8}h26M354 {40 + i * 10}h36" />{/each}</g>
    <g fill="#e6b52e" opacity=".8"><rect x="360" y="60" width="6" height="4" /><rect x="374" y="90" width="6" height="4" /><rect x="292" y="70" width="6" height="4" /><rect x="254" y="110" width="6" height="4" /></g>
    <path d="M10 172V90h6v-10h6v-10h6v-10h6v10h6v10h6v10h6v82Z" fill="#e8b4a0" stroke="#7a2e2a" stroke-width="1.5" /><path d="M54 172V90h6v-10h6v-10h6v-10h6v10h6v10h6v10h6v82Z" fill="#f2dcc0" stroke="#7a2e2a" stroke-width="1.5" /><path d="M98 172V90h6v-10h6v-10h6v-10h6v10h6v10h6v10h6v82Z" fill="#d9a07a" stroke="#7a2e2a" stroke-width="1.5" />
    <g fill="none" stroke="#7a2e2a" stroke-width="1.2">{#each [0, 1, 2] as i (i)}<path d="M{14 + i * 44} 110h34M{14 + i * 44} 134h34M{31 + i * 44} 90v82M{14 + i * 44} 110l17 24M{48 + i * 44} 110l-17 24" />{/each}</g>
    <g fill="#5a6f8a">{#each [0, 1, 2] as i (i)}<rect x={18 + i * 44} y="94" width="8" height="12" /><rect x={36 + i * 44} y="94" width="8" height="12" /><rect x={18 + i * 44} y="140" width="8" height="12" /><rect x={36 + i * 44} y="140" width="8" height="12" />{/each}</g>
    <path d="M10 160h132" stroke="#7a2e2a" stroke-width="1.5" />
    {#if weather === 'snowy'}<g fill="#ffffff">{#each [0, 1, 2] as i (i)}<path d="M{28 + i * 44} 60h6v3h-6Z M{22 + i * 44} 70h18v3H{22 + i * 44}Z" />{/each}</g>{/if}
  {:else if scene === 'library'}
    <!-- tall bookshelves filled with books, a reading desk with a lamp and a small window -->
    <rect x="300" y="60" width="40" height="110" fill="#8c5b3d" stroke="#5a3d25" stroke-width="2" />
    {#each [0, 1, 2] as i (i)}
      <rect x={10 + i * 90} y="90" width="70" height="90" fill="#d9c7b3" stroke="#8c5b3d" stroke-width="2" />
      <rect x={10 + i * 90} y="90" width="70" height="10" fill="#8c5b3d" opacity=".6" />
      <rect x={10 + i * 90} y="150" width="70" height="10" fill="#8c5b3d" opacity=".6" />
      <rect x={10 + i * 90} y="120" width="70" height="10" fill="#8c5b3d" opacity=".4" />
    {/each}
    {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as i (i)}
      <rect x={14 + (i % 3) * 90 + (Math.floor(i / 3) * 18)} y={102 + (i % 3) * 26} width="12" height="4" fill={['#d64b45','#4b78c2','#34824d','#e6b52e','#8a62b6','#df8eb1'][i % 6]} />
    {/each}
    <rect x="200" y="100" width="60" height="30" fill="#fffdf7" stroke="#172a45" stroke-width="2" />
    <rect x="215" y="94" width="30" height="8" fill="#e6a527" stroke="#8c5b3d" stroke-width="2" />
    <rect x="220" y="104" width="20" height="12" fill="#cfe6f2" />
    <rect x="260" y="104" width="10" height="4" fill="#a45e38" />
    <rect x="150" y="30" width="50" height="50" rx="4" fill="none" stroke="#8c5b3d" stroke-width="4" /><path d="M175 30v50M150 55h50" stroke="#8c5b3d" stroke-width="3" />
  {/if}
  <rect y="172" width="400" height="48" fill={palette.floor} />
  <rect y="172" width="400" height="4" fill="rgba(23,42,69,.14)" />
  {#if outdoor && weather === 'snowy'}<path d="M0 172h400v7q-50 5-100 0t-100 0-100 0-100 0Z" fill="#ffffff" />{/if}
  {#if outdoor && weather === 'rainy'}<g fill="rgba(234,243,251,.5)"><ellipse cx="120" cy="196" rx="34" ry="4" /><ellipse cx="300" cy="206" rx="26" ry="3.5" /></g>{/if}
  {#if scene === 'station'}<path d="M0 196h400M0 210h400" stroke="#596477" stroke-width="3" /><rect y="172" width="400" height="6" fill="#e6b52e" />{/if}
  {#if scene === 'airport'}<path d="M0 200h400" stroke="#fffdf7" stroke-width="3" stroke-dasharray="22 14" />{/if}
  {#if scene === 'beach'}<path d="M0 172q50 6 100 0t100 0 100 0 100 0v6H0Z" fill="#fffdf7" opacity=".55" />{/if}
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
   .story-birds { animation:story-drift 6s ease-in-out infinite alternate; }
  @keyframes story-fall { from { transform:translateY(0); } to { transform:translateY(var(--fall)); } }
  @keyframes story-drift { from { translate:-6px 0; } to { translate:6px 0; } }
  /* the plane climbs slowly away and comes round again */
  .story-plane { animation:story-climb 14s linear infinite; }
  @keyframes story-climb { from { translate:-260px 70px; } to { translate:260px -70px; } }
  @media (prefers-reduced-motion:reduce) { .story-rain,.story-snow,.story-cloud,.story-plane { animation:none; } }
</style>
