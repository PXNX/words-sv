<!--
  The drawing as the watchers see it: the drawer's lines (640 × 640 coordinates), repainted
  whenever new ones arrive, so the picture grows while it is being drawn.
-->
<script lang="ts">
  import type { LiveLine } from './scribble';

  let { lines, label }: { lines: LiveLine[]; label: string } = $props();
  const SIZE = 640;
  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    const context = canvas?.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, SIZE, SIZE);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const line of lines) {
      if (line.p.length < 2) continue;
      context.strokeStyle = line.c;
      context.lineWidth = line.s;
      context.beginPath();
      context.moveTo(line.p[0]!, line.p[1]!);
      if (line.p.length === 2) context.lineTo(line.p[0]! + 0.1, line.p[1]!);
      for (let index = 2; index < line.p.length; index += 2) context.lineTo(line.p[index]!, line.p[index + 1]!);
      context.stroke();
    }
  });
</script>

<div class="live" role="img" aria-label={label}><canvas bind:this={canvas} width={SIZE} height={SIZE} aria-hidden="true"></canvas></div>

<style>
  .live { display:grid;justify-items:center; }
  canvas { width:100%;max-width:28rem;aspect-ratio:1;border:2px solid #172a45;border-radius:1rem;background:#fff;box-shadow:4px 4px 0 #172a45; }
  :global(html.dark) canvas { border-color:#fffdf7;box-shadow:4px 4px 0 #0a1626; }
</style>
