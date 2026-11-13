<!--
  Lilith draws a word's picture: the emoji is rendered off screen, traced into its outline and
  drawn back stroke by stroke over `duration` ms - always, also with reduced motion, since the slow
  drawing is the game. Easy and medium rounds draw each line in the picture's own colour, hard ones
  in pencil, jumbled and with parts left out (`rule`, see scribble.ts). `onprogress` reports 0…1;
  `reveal` finishes the drawing at once and shows the emoji itself.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { orderStrokes, outlinePoints, planStrokes, strokeColor, type DifficultyRule, type Stroke } from './scribble';

  let { emoji, rule, duration = 10_000, reveal = false, label, onprogress }: { emoji: string; rule: Pick<DifficultyRule, 'colored' | 'shuffled' | 'detail'>; duration?: number; reveal?: boolean; label: string; onprogress?: (progress: number) => void } = $props();

  const SIZE = 320;
  const TRACE = 160;
  const PENCIL = '#172a45';
  let canvas = $state<HTMLCanvasElement>();
  let strokes: Array<{ points: Stroke; color: string }> = [];
  let progress = 0;
  let frame = 0;

  function trace(picture: string) {
    const scratch = document.createElement('canvas');
    scratch.width = TRACE;
    scratch.height = TRACE;
    const context = scratch.getContext('2d', { willReadFrequently: true });
    if (!context) return [];
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${TRACE * 0.78}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    context.fillText(picture, TRACE / 2, TRACE / 2 + TRACE * 0.04);
    const data = context.getImageData(0, 0, TRACE, TRACE).data;
    return planStrokes(orderStrokes(outlinePoints(data, TRACE, TRACE, 2, 70), 5), rule).map((points) => ({ points, color: (rule.colored && strokeColor(data, TRACE, TRACE, points)) || PENCIL }));
  }

  function draw(share: number) {
    const context = canvas?.getContext('2d');
    if (!context) return;
    context.fillStyle = '#fffdf7';
    context.fillRect(0, 0, SIZE, SIZE);
    const scale = SIZE / TRACE;
    const total = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
    let budget = Math.round(total * share);
    context.lineWidth = rule.colored ? 3.4 : 2.6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const stroke of strokes) {
      if (budget <= 0) break;
      const part = stroke.points.slice(0, budget);
      budget -= part.length;
      context.strokeStyle = stroke.color;
      context.beginPath();
      part.forEach(([x, y], index) => (index === 0 ? context.moveTo(x * scale, y * scale) : context.lineTo(x * scale, y * scale)));
      context.stroke();
    }
    if (share >= 1 && reveal) {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `${SIZE * 0.2}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      context.fillText(emoji, SIZE * 0.87, SIZE * 0.87);
    }
  }

  // A new word: trace it and start drawing. `reveal` is read untracked so revealing does not restart.
  $effect(() => {
    if (!canvas) return;
    strokes = trace(emoji);
    progress = 0;
    const started = performance.now();
    const tick = (now: number) => {
      if (untrack(() => reveal)) return;
      progress = Math.min(1, (now - started) / duration);
      draw(progress);
      onprogress?.(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    draw(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  // Guessed or out of time: the rest of the drawing at once, with the emoji in the corner.
  $effect(() => {
    if (!reveal || !canvas) return;
    cancelAnimationFrame(frame);
    draw(1);
  });
</script>

<div class="sketch" role="img" aria-label={label}><canvas bind:this={canvas} width={SIZE} height={SIZE} aria-hidden="true"></canvas></div>

<style>
  .sketch { display:grid;justify-items:center; }
  canvas { width:100%;max-width:22rem;aspect-ratio:1;border:2px solid #172a45;border-radius:1rem;background:#fffdf7;box-shadow:4px 4px 0 #172a45; }
  :global(html.dark) canvas { border-color:#fffdf7;box-shadow:4px 4px 0 #0a1626; }
</style>
