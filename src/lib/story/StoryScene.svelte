<script lang="ts">
  import type { SceneId } from './stories';

  let { scene }: { scene: SceneId } = $props();

  const palettes: Record<SceneId, { back: string; floor: string }> = {
    cafe: { back: '#f3dcc0', floor: '#a45e38' },
    park: { back: '#cfe6f2', floor: '#8fc27a' },
    station: { back: '#dfe5ea', floor: '#9aa3ad' },
    home: { back: '#f6e3d3', floor: '#c08a5c' },
    office: { back: '#e7ecef', floor: '#c4cbd3' },
    flat: { back: '#f2eee6', floor: '#c9a27e' },
    square: { back: '#d7e8f0', floor: '#b8aa98' },
    attic: { back: '#c9a27e', floor: '#7a5536' }
  };
  const palette = $derived(palettes[scene]);
</script>

<svg class="story-scene" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect width="400" height="220" fill={palette.back} />
  {#if scene === 'cafe'}
    <rect x="40" y="34" width="120" height="86" rx="6" fill="#fffdf7" stroke="#8c5b3d" stroke-width="5" /><path d="M100 34v86M40 77h120" stroke="#8c5b3d" stroke-width="4" />
    <path d="M250 0v38M330 0v52" stroke="#172a45" stroke-width="2" /><path d="M234 52q16-22 32 0Z" fill="#e6a527" /><path d="M314 66q16-22 32 0Z" fill="#e6a527" />
    <circle cx="290" cy="112" r="20" fill="#fffdf7" stroke="#a45e38" stroke-width="3" /><path d="M282 108h14v8q0 6-7 6t-7-6Z M296 110q6 0 4 5" fill="#a45e38" stroke="#a45e38" stroke-width="1.5" />
  {:else if scene === 'park'}
    <circle cx="340" cy="44" r="24" fill="#f4c84a" />
    <g fill="#55a66a"><circle cx="70" cy="96" r="38" /><circle cx="110" cy="112" r="28" /></g><rect x="78" y="118" width="12" height="60" fill="#8c5b3d" />
    <g fill="#4d8f5c"><circle cx="300" cy="122" r="28" /></g><rect x="295" y="140" width="10" height="38" fill="#8c5b3d" />
    <path d="M150 0q30 18 60 6" fill="none" stroke="#fffdf7" stroke-width="10" stroke-linecap="round" opacity=".7" />
  {:else if scene === 'station'}
    <rect x="0" y="40" width="400" height="18" fill="#172a45" />
    <circle cx="200" cy="96" r="26" fill="#fffdf7" stroke="#172a45" stroke-width="4" /><path d="M200 96V80M200 96l11 6" stroke="#172a45" stroke-width="3.5" stroke-linecap="round" />
    <rect x="44" y="76" width="70" height="30" rx="4" fill="#4b78c2" /><rect x="52" y="86" width="54" height="10" rx="2" fill="#fffdf7" opacity=".85" />
    <rect x="290" y="76" width="70" height="30" rx="4" fill="#4b78c2" /><rect x="298" y="86" width="54" height="10" rx="2" fill="#fffdf7" opacity=".85" />
  {:else if scene === 'home'}
    <rect x="270" y="36" width="96" height="80" rx="6" fill="#cfe6f2" stroke="#fffdf7" stroke-width="7" />
    <path d="M40 0q30 30 60 0 30 30 60 0" fill="none" stroke="#e6a527" stroke-width="3" />
    <g><circle cx="196" cy="54" r="15" fill="#d64b45" /><circle cx="224" cy="46" r="15" fill="#4b78c2" /><circle cx="210" cy="72" r="13" fill="#e6b52e" /><path d="M196 69q4 30 12 60M224 61q-4 30-12 68M210 85v44" fill="none" stroke="#596477" stroke-width="1.2" /></g>
    <rect x="34" y="60" width="62" height="48" rx="4" fill="#fffdf7" stroke="#8c5b3d" stroke-width="4" /><circle cx="65" cy="84" r="12" fill="#df8eb1" opacity=".7" />
  {:else if scene === 'office'}
    <rect x="30" y="26" width="160" height="96" fill="#cfe6f2" stroke="#596477" stroke-width="5" /><path d="M110 26v96M30 74h160" stroke="#596477" stroke-width="4" />
    <rect x="300" y="110" width="34" height="40" rx="4" fill="#a45e38" /><g fill="#55a66a"><ellipse cx="306" cy="98" rx="10" ry="20" transform="rotate(-20 306 98)" /><ellipse cx="328" cy="96" rx="10" ry="22" transform="rotate(20 328 96)" /><ellipse cx="317" cy="88" rx="9" ry="22" /></g>
    <rect x="230" y="40" width="44" height="30" fill="#fffdf7" stroke="#172a45" stroke-width="2" /><path d="M238 62l8-10 7 6 9-12" fill="none" stroke="#e6a527" stroke-width="3" />
  {:else if scene === 'flat'}
    <rect x="130" y="24" width="140" height="110" fill="#cfe6f2" stroke="#fffdf7" stroke-width="9" /><path d="M200 24v110" stroke="#fffdf7" stroke-width="6" />
    <g fill="#c9925e" stroke="#8c5b3d" stroke-width="2"><rect x="30" y="140" width="56" height="40" /><rect x="42" y="108" width="40" height="32" /><rect x="320" y="146" width="58" height="34" /></g><path d="M30 160h56M320 162h58" stroke="#8c5b3d" stroke-width="2" />
  {:else if scene === 'square'}
    <g stroke="#172a45" stroke-width="2.5">
      <path d="M0 180V80l35-36 35 36v100Z" fill="#e6a527" /><path d="M70 180V70l40-40 40 40v110Z" fill="#df8eb1" /><path d="M150 180V86l30-30 30 30v94Z" fill="#fffdf7" />
      <path d="M210 180V66l45-44 45 44v114Z" fill="#8ab4d9" /><path d="M300 180V82l50-38 50 38v98Z" fill="#9ccf9f" />
    </g>
    <g fill="#172a45" opacity=".7"><rect x="20" y="96" width="12" height="18" /><rect x="40" y="96" width="12" height="18" /><rect x="96" y="86" width="12" height="18" /><rect x="114" y="86" width="12" height="18" /><rect x="172" y="100" width="14" height="18" /><rect x="236" y="82" width="12" height="18" /><rect x="262" y="82" width="12" height="18" /><rect x="330" y="98" width="12" height="18" /><rect x="358" y="98" width="12" height="18" /></g>
  {:else if scene === 'attic'}
    <path d="M0 0h400L200 0Z M0 0l200 80L400 0" fill="none" stroke="#8c5b3d" stroke-width="16" />
    <circle cx="200" cy="86" r="26" fill="#f4e3a6" stroke="#8c5b3d" stroke-width="6" /><path d="M200 60v52M174 86h52" stroke="#8c5b3d" stroke-width="4" />
    <path d="M200 112 140 220h120Z" fill="#fff6c8" opacity=".35" />
    <g fill="#a87850" stroke="#5a3d25" stroke-width="2"><rect x="24" y="130" width="64" height="44" /><rect x="320" y="120" width="54" height="54" /></g><rect x="332" y="110" width="30" height="10" fill="#fffdf7" stroke="#5a3d25" stroke-width="1.5" />
  {/if}
  <rect y="172" width="400" height="48" fill={palette.floor} />
  <rect y="172" width="400" height="4" fill="rgba(23,42,69,.14)" />
  {#if scene === 'station'}<path d="M0 196h400M0 210h400" stroke="#596477" stroke-width="3" /><rect y="172" width="400" height="6" fill="#e6b52e" />{/if}
  {#if scene === 'square'}<g fill="rgba(23,42,69,.12)">{#each Array.from({ length: 20 }, (_, i) => i) as i}<rect x={i * 20 + (i % 2) * 6} y="186" width="14" height="8" rx="3" /><rect x={i * 20 + 10} y="202" width="14" height="8" rx="3" />{/each}</g>{/if}
</svg>

<style>
  .story-scene { position:absolute;inset:0;width:100%;height:100%; }
</style>
