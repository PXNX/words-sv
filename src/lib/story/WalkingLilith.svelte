<!--
  Lilith strolling around inside her container: she walks to a spot (legs, body and tail moving,
  facing where she goes), sits for a moment, then picks the next spot. She enters from `from`
  (an edge) on her first walk. Tapping her makes her purr and float a few hearts. With reduced
  motion she simply sits in the middle.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import StoryCharacter from './StoryCharacter.svelte';
  import type { Mood } from './stories.js';

  let { mood = 'happy', from = 'right', label = '', onpet }: { mood?: Mood; from?: 'left' | 'right'; label?: string; onpet?: () => void } = $props();

  const SPEED_PX_PER_S = 70;
  let area = $state<HTMLDivElement | null>(null);
  let cat = $state<HTMLButtonElement | null>(null);
  let x = $state(0);
  let duration = $state(0);
  let walking = $state(false);
  let facingLeft = $state(false);
  let petted = $state(0);
  let timer = 0;

  function bounds() {
    const width = area?.clientWidth ?? 0;
    const size = cat?.offsetWidth ?? 0;
    return Math.max(0, width - size);
  }
  function walkTo(target: number) {
    const distance = Math.abs(target - x);
    if (distance < 8) return rest();
    facingLeft = target < x;
    duration = distance / SPEED_PX_PER_S;
    walking = true;
    x = target;
  }
  function rest() {
    walking = false;
    window.clearTimeout(timer);
    // Sit and look around for a moment before the next stroll.
    timer = window.setTimeout(() => walkTo(Math.random() * bounds()), 1600 + Math.random() * 2800);
  }
  function pet() {
    petted += 1;
    onpet?.();
  }

  onMount(() => {
    const max = bounds();
    if (prefersReducedMotion.current) {
      x = max / 2;
      return;
    }
    // Start just outside the chosen edge, then walk to the middle.
    duration = 0;
    x = from === 'right' ? max + (cat?.offsetWidth ?? 0) : -(cat?.offsetWidth ?? 0);
    requestAnimationFrame(() => requestAnimationFrame(() => walkTo(max / 2)));
    return () => window.clearTimeout(timer);
  });
</script>

<div class="walk-area" bind:this={area}>
  <button type="button" class="walk-cat" bind:this={cat} aria-label={label} onclick={pet}
    style={`transform:translateX(${x}px);transition-duration:${duration}s`}
    ontransitionend={(event) => { if (event.propertyName === 'transform' && event.target === cat && walking) rest(); }}>
    <span class="walk-flip" class:left={facingLeft}>
      {#key petted}<span class="walk-body" class:petted={petted > 0}><StoryCharacter id="lilith" mood={walking ? 'happy' : mood} {walking} /></span>{/key}
    </span>
    {#if petted}{#key petted}<span class="walk-hearts" aria-hidden="true"><b>♥</b><b>♥</b></span>{/key}{/if}
  </button>
</div>

<style>
  .walk-area { position:relative;width:100%;height:100%; }
  .walk-cat { position:absolute;bottom:0;left:0;height:100%;aspect-ratio:120 / 150;padding:0;border:0;background:none;cursor:pointer;transition-property:transform;transition-timing-function:linear; }
  .walk-flip { display:block;height:100%;transition:transform .25s ease; }
  .walk-flip.left { transform:scaleX(-1); }
  .walk-body { display:block;height:100%;transform-origin:50% 100%; }
  .walk-body.petted { animation:walk-squish .5s ease-out; }
  .walk-hearts { position:absolute;inset:0;pointer-events:none; }
  .walk-hearts b { position:absolute;top:20%;left:50%;color:#e86a9a;font-size:1rem;opacity:0;animation:walk-heart 1.3s ease-out forwards; }
  .walk-hearts b:nth-child(2) { --hx:1.6rem;animation-delay:.18s; }
  .walk-hearts b:nth-child(1) { --hx:-1.6rem; }
  @keyframes walk-squish { 30% { transform:scale(1.1,.86); } 60% { transform:scale(.95,1.06); } }
  @keyframes walk-heart { 0% { opacity:0;transform:translate(-50%,0) scale(.4); } 25% { opacity:1; } 100% { opacity:0;transform:translate(calc(-50% + var(--hx)),-2.8rem) scale(1.2); } }
  @media (prefers-reduced-motion:reduce) { .walk-cat,.walk-flip { transition:none; } .walk-hearts { display:none; } }
</style>
