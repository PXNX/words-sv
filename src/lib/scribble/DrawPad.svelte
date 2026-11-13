<!--
  The drawing surface: draw with finger, pen or mouse in a few colours and two pen sizes, undo the
  last line or start over. The parent reads the picture with `exportImage()` (a JPEG data URL on
  white, at most 640 px) and whether anything was drawn with `onchange`.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import IconUndo from '~icons/material-symbols/undo-rounded';
  import IconDelete from '~icons/material-symbols/delete-outline-rounded';

  let { onchange }: { onchange?: (lines: number) => void } = $props();

  type Line = { color: string; size: number; points: Array<[number, number]> };
  const COLORS = ['#172a45', '#c4522e', '#e6a527', '#34824d', '#2a6fa8', '#8a4fb0'];
  const SIZES = [4, 10];
  const SIZE = 640;

  const locale = $derived({ locale: settings.interfaceLocale });
  let canvas = $state<HTMLCanvasElement>();
  let lines = $state.raw<Line[]>([]);
  let color = $state(COLORS[0]!);
  let size = $state(SIZES[0]!);
  let current: Line | null = null;

  function paint() {
    const context = canvas?.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, SIZE, SIZE);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const line of current ? [...lines, current] : lines) {
      context.strokeStyle = line.color;
      context.lineWidth = line.size;
      context.beginPath();
      const [first, ...rest] = line.points;
      if (!first) continue;
      context.moveTo(first[0], first[1]);
      // A single tap still leaves a dot.
      if (rest.length === 0) context.lineTo(first[0] + 0.1, first[1]);
      for (const [x, y] of rest) context.lineTo(x, y);
      context.stroke();
    }
  }

  function point(event: PointerEvent): [number, number] {
    const box = canvas!.getBoundingClientRect();
    return [((event.clientX - box.left) / box.width) * SIZE, ((event.clientY - box.top) / box.height) * SIZE];
  }

  function down(event: PointerEvent) {
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    current = { color, size, points: [point(event)] };
    paint();
  }
  function move(event: PointerEvent) {
    if (!current) return;
    for (const sample of event.getCoalescedEvents?.() ?? [event]) current.points.push(point(sample));
    paint();
  }
  function up() {
    if (!current) return;
    lines = [...lines, current];
    current = null;
    paint();
    onchange?.(lines.length);
  }
  function undo() {
    lines = lines.slice(0, -1);
    paint();
    onchange?.(lines.length);
  }
  export function clear() {
    lines = [];
    paint();
    onchange?.(0);
  }
  /** The drawing as a JPEG data URL on white. */
  export function exportImage(): string {
    paint();
    return canvas?.toDataURL('image/jpeg', 0.85) ?? '';
  }

  $effect(() => {
    if (canvas) paint();
  });
</script>

<div class="draw-pad">
  <canvas bind:this={canvas} width={SIZE} height={SIZE} aria-label={m.scribble_canvas_label({}, locale)} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}></canvas>
  <div class="draw-tools">
    <div class="draw-colors" role="radiogroup" aria-label={m.scribble_color({}, locale)}>
      {#each COLORS as swatch (swatch)}
        <button type="button" role="radio" aria-checked={color === swatch} aria-label={swatch} class="draw-swatch" style:--swatch={swatch} onclick={() => (color = swatch)}></button>
      {/each}
    </div>
    <div class="draw-sizes" role="radiogroup" aria-label={m.scribble_size({}, locale)}>
      {#each SIZES as pen (pen)}
        <button type="button" role="radio" aria-checked={size === pen} aria-label={pen === SIZES[0] ? m.scribble_size_thin({}, locale) : m.scribble_size_thick({}, locale)} class="draw-size" onclick={() => (size = pen)}><i style:--pen="{pen / 1.6}px"></i></button>
      {/each}
    </div>
    <button type="button" class="draw-action" disabled={lines.length === 0} onclick={undo} aria-label={m.scribble_undo({}, locale)}><IconUndo aria-hidden="true" /></button>
    <button type="button" class="draw-action" disabled={lines.length === 0} onclick={clear} aria-label={m.scribble_clear({}, locale)}><IconDelete aria-hidden="true" /></button>
  </div>
</div>

<style>
  .draw-pad { display:grid;gap:.6rem; }
  canvas { width:100%;max-width:28rem;aspect-ratio:1;justify-self:center;border:2px solid #172a45;border-radius:1rem;background:#fff;box-shadow:4px 4px 0 #172a45;touch-action:none;cursor:crosshair; }
  :global(html.dark) canvas { border-color:#fffdf7;box-shadow:4px 4px 0 #0a1626; }
  .draw-tools { display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.6rem; }
  .draw-colors, .draw-sizes { display:flex;gap:.3rem; }
  .draw-swatch { width:1.9rem;height:1.9rem;border:2px solid #172a45;border-radius:50%;background:var(--swatch);cursor:pointer; }
  .draw-swatch[aria-checked='true'] { outline:3px solid #e6a527;outline-offset:2px; }
  .draw-size, .draw-action { display:grid;place-items:center;width:2.2rem;height:2.2rem;border:2px solid currentColor;border-radius:.7rem;background:none;color:inherit;cursor:pointer; }
  .draw-size[aria-checked='true'] { background:#e6a527;color:#172a45;border-color:#172a45; }
  .draw-size i { display:block;width:var(--pen);height:var(--pen);border-radius:50%;background:currentColor; }
  .draw-action:disabled { opacity:.35;cursor:default; }
  .draw-action :global(svg) { width:1.2rem;height:1.2rem; }
</style>
