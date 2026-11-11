<!--
  Letter tiles with a little physics (app/physics.ts). Two uses:
  - `float`: tiles drift around their box and can be grabbed and flicked (the home screen's header);
  - `rain`: tiles drop in from above, bounce and settle (after a finished round).
  The loop only runs while something moves; with reduced motion the tiles simply sit in place.
  The layer itself ignores the pointer, only the tiles take it, so content underneath stays usable.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { atRest, step, type Body, type World } from './physics.js';
  import { haptic } from '#lib/feedback/haptics.js';

  let { letters, mode = 'float', size = 28 }: { letters: readonly string[]; mode?: 'float' | 'rain'; size?: number } = $props();

  let layer = $state<HTMLElement | null>(null);
  let tiles = $state<HTMLElement[]>([]);
  let bodies: Body[] = [];
  let world: World = { width: 0, height: 0, gravity: 0, drag: 0.5, bounce: 0.6 };
  let frame = 0;
  let last = 0;
  let visible = true;
  let drag: { index: number; pointer: number; lastX: number; lastY: number; lastTime: number } | null = null;

  // A stable pseudo-random spread, so tiles do not jump to new places on every visit.
  const spread = (index: number, salt: number) => {
    const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };

  function layout() {
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    world = mode === 'rain'
      ? { width: rect.width, height: rect.height, gravity: 1500, drag: 0.35, bounce: 0.42 }
      : { width: rect.width, height: rect.height, gravity: 0, drag: 0.55, bounce: 0.85 };
    const radius = size / 2;
    if (bodies.length !== letters.length) {
      bodies = letters.map((_, index) => mode === 'rain'
        ? { x: radius + spread(index, 1) * Math.max(1, rect.width - size), y: -radius - spread(index, 2) * rect.height * 0.8 - index * 6, vx: (spread(index, 3) - 0.5) * 160, vy: 0, r: radius, angle: (spread(index, 4) - 0.5) * 50, spin: (spread(index, 5) - 0.5) * 240 }
        : { x: radius + spread(index, 1) * Math.max(1, rect.width - size), y: radius + spread(index, 2) * Math.max(1, rect.height - size), vx: (spread(index, 3) - 0.5) * 26, vy: (spread(index, 4) - 0.5) * 26, r: radius, angle: (spread(index, 5) - 0.5) * 28, spin: 0 });
    }
    paint();
  }

  function paint() {
    for (let index = 0; index < bodies.length; index += 1) {
      const body = bodies[index]!;
      const tile = tiles[index];
      if (tile) tile.style.transform = `translate3d(${(body.x - body.r).toFixed(1)}px,${(body.y - body.r).toFixed(1)}px,0) rotate(${body.angle.toFixed(1)}deg)`;
    }
  }

  function tick(now: number) {
    frame = 0;
    const delta = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    step(bodies, world, delta);
    paint();
    if (visible && (drag || !atRest(bodies, mode === 'float' ? 3 : 6))) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() {
    if (frame || prefersReducedMotion.current || !visible) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  }

  function grab(event: PointerEvent, index: number) {
    if (prefersReducedMotion.current) return;
    const body = bodies[index];
    if (!body) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    body.held = true;
    body.vx = 0;
    body.vy = 0;
    drag = { index, pointer: event.pointerId, lastX: event.clientX, lastY: event.clientY, lastTime: event.timeStamp };
    haptic('tap');
    wake();
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer || !layer) return;
    const body = bodies[drag.index]!;
    const rect = layer.getBoundingClientRect();
    const seconds = Math.max(0.001, (event.timeStamp - drag.lastTime) / 1000);
    // The throw's speed is the finger's speed over the last moves, smoothed so a jitter does not fling it.
    body.vx = body.vx * 0.5 + ((event.clientX - drag.lastX) / seconds) * 0.5;
    body.vy = body.vy * 0.5 + ((event.clientY - drag.lastY) / seconds) * 0.5;
    body.x = Math.min(Math.max(event.clientX - rect.left, body.r), Math.max(body.r, world.width - body.r));
    body.y = Math.min(Math.max(event.clientY - rect.top, body.r), Math.max(body.r, world.height - body.r));
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
  }
  function release(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer) return;
    const body = bodies[drag.index]!;
    body.held = false;
    const speed = Math.hypot(body.vx, body.vy);
    const limit = 1400;
    if (speed > limit) { body.vx *= limit / speed; body.vy *= limit / speed; }
    body.spin = body.vx * 0.5;
    drag = null;
    wake();
  }

  onMount(() => {
    layout();
    const resize = new ResizeObserver(() => { layout(); wake(); });
    if (layer) resize.observe(layer);
    // Off screen (scrolled away, another tab) the loop stops and resumes when the tiles are back.
    const watch = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) wake();
    });
    if (layer) watch.observe(layer);
    wake();
    return () => {
      resize.disconnect();
      watch.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  });
</script>

<span class="physics-tiles {mode}" bind:this={layer} aria-hidden="true" style={`--tile:${size}px`}>
  {#each letters as letter, index (index)}
    <i
      role="presentation"
      bind:this={tiles[index]}
      onpointerdown={(event) => grab(event, index)}
      onpointermove={move}
      onpointerup={release}
      onpointercancel={release}
    ><b>{letter}</b></i>
  {/each}
</span>

<style>
  .physics-tiles { position:absolute;inset:0;overflow:hidden;pointer-events:none; }
  .physics-tiles i { position:absolute;top:0;left:0;display:grid;place-items:center;width:var(--tile);height:var(--tile);border:2px solid var(--ink);border-radius:22%;background:var(--paper);box-shadow:2px 2px 0 var(--ink);color:var(--ink);font-family:var(--font-display);font-size:calc(var(--tile) * .56);font-style:normal;line-height:1;will-change:transform;pointer-events:auto;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none; }
  .physics-tiles i:active { cursor:grabbing; }
  .physics-tiles b { font-weight:inherit; }
  /* Resting tiles keep bobbing a little; the physics moves the tile, the bob moves the letter's plate with it. */
  .physics-tiles.float i { animation:tile-bob 6s ease-in-out infinite; }
  .physics-tiles.float i:nth-child(2n) { animation-duration:7.5s;animation-delay:-2s; }
  .physics-tiles.float i:nth-child(3n) { animation-duration:9s;animation-delay:-4s; }
  @keyframes tile-bob { 0%,100% { translate:0 0; } 50% { translate:0 -.4rem; } }
  @media (prefers-reduced-motion:reduce) { .physics-tiles.float i { animation:none; } }
  .physics-tiles.float i { opacity:.72; }
  .physics-tiles.rain i:nth-child(3n) { background:var(--sun); }
  .physics-tiles.rain i:nth-child(3n+1) { background:var(--go);color:var(--paper); }
  :global(html.dark) .physics-tiles i { border-color:var(--ink-deep);box-shadow:2px 2px 0 var(--ink-deep); }
  :global(html.dark) .physics-tiles.float i { background:var(--surface);color:var(--paper); }
</style>
