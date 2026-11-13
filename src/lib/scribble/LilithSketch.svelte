<!--
  Lilith draws a word's picture: the emoji is rendered off screen, traced into its outline and
  drawn back stroke by stroke with a pencil line over `duration` ms. `onprogress` reports 0…1;
  `reveal` paints the finished drawing and the emoji itself at once.
-->
<script lang="ts">
  import { orderStrokes, outlinePoints, type Stroke } from './scribble';

  let { emoji, duration = 10_000, reveal = false, label, onprogress }: { emoji: string; duration?: number; reveal?: boolean; label: string; onprogress?: (progress: number) => void } = $props();

  const SIZE = 320;
  const TRACE = 160;
  let canvas = $state<HTMLCanvasElement>();
  let strokes: Stroke[] = [];
  let frame = 0;

  function trace(picture: string): Stroke[] {
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
    return orderStrokes(outlinePoints(data, TRACE, TRACE, 2, 70), 5);
  }

  function draw(progress: number) {
    const context = canvas?.getContext('2d');
    if (!context) return;
    context.fillStyle = '#fffdf7';
    context.fillRect(0, 0, SIZE, SIZE);
    const scale = SIZE / TRACE;
    const total = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    let budget = Math.round(total * progress);
    context.strokeStyle = '#172a45';
    context.lineWidth = 2.6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const stroke of strokes) {
      if (budget <= 0) break;
      const part = stroke.slice(0, budget);
      budget -= part.length;
      context.beginPath();
      part.forEach(([x, y], index) => (index === 0 ? context.moveTo(x * scale, y * scale) : context.lineTo(x * scale, y * scale)));
      context.stroke();
    }
    if (progress >= 1 && reveal) {
      context.globalAlpha = 0.9;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `${SIZE * 0.22}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      context.fillText(emoji, SIZE * 0.86, SIZE * 0.86);
      context.globalAlpha = 1;
    }
  }

  $effect(() => {
    if (!canvas) return;
    strokes = trace(emoji);
    const instant = reveal || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (instant) {
      draw(1);
      onprogress?.(1);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      draw(progress);
      onprogress?.(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });
</script>

<div class="sketch" role="img" aria-label={label}><canvas bind:this={canvas} width={SIZE} height={SIZE} aria-hidden="true"></canvas></div>

<style>
  .sketch { display:grid;justify-items:center; }
  canvas { width:100%;max-width:22rem;aspect-ratio:1;border:2px solid #172a45;border-radius:1rem;background:#fffdf7;box-shadow:4px 4px 0 #172a45; }
  :global(html.dark) canvas { border-color:#fffdf7;box-shadow:4px 4px 0 #0a1626; }
</style>
