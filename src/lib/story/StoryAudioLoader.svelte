<script lang="ts">
  import type { Story } from './stories';
  import type { VocabularyLevel } from '#lib/data/vocabulary.js';
  import StoryCharacter from './StoryCharacter.svelte';
  import StoryScene from './StoryScene.svelte';

  let { story, title, level, label, progress }: { story: Story; title: string; level: VocabularyLevel; label: string; progress: number } = $props();
  const cast = $derived(story.cast.slice(0, 6));
  const percent = $derived(Math.round(Math.min(1, Math.max(0, progress)) * 100));
</script>

<section class="story-audio-loader" aria-label={label} aria-busy="true">
  <StoryScene scene={story.scene} weather={story.weather} />
  <span class="story-loader-wash" aria-hidden="true"></span>
  <div class="story-loader-copy">
    <span class="story-loader-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
    <p class="story-loader-title" dir="auto">{title}</p>
    <p class="story-loader-level">Level {level.toUpperCase()}</p>
    <p class="story-loader-label" dir="auto">{label}</p>
    <span class="story-loader-track" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
      <span style:width={`${percent}%`}></span>
    </span>
    <p class="story-loader-percent">{percent}%</p>
  </div>
  <div class="story-loader-cast" aria-hidden="true">
    {#each cast as member, index (member)}
      <span class="story-loader-walker" class:reverse={index % 2 === 1} style:--i={index}>
        <span class="story-loader-bob"><StoryCharacter id={member} mood="happy" /></span>
      </span>
    {/each}
  </div>
</section>

<style>
  .story-audio-loader { position:relative;isolation:isolate;flex:1 1 auto;min-height:0;width:100%;display:flex;justify-content:center;overflow:hidden; }
  .story-loader-wash { position:absolute;z-index:1;inset:0;background:linear-gradient(180deg,rgba(237,228,213,.95) 0%,rgba(237,228,213,.55) 28%,rgba(237,228,213,.08) 55%,rgba(237,228,213,0) 72%,rgba(23,42,69,.14) 100%);pointer-events:none; }
  .story-loader-copy { position:relative;z-index:3;align-self:flex-start;display:grid;justify-items:center;gap:.65rem;width:min(82%,19rem);margin-top:clamp(3.8rem,13vh,6rem);padding:.95rem 1.1rem 1.05rem;border:1px solid rgba(23,42,69,.18);border-radius:1.15rem;background:rgba(255,253,247,.9);box-shadow:0 14px 38px rgba(23,42,69,.14);text-align:center;backdrop-filter:blur(7px);animation:story-loader-in .35s cubic-bezier(.23,1,.32,1); }
  .story-loader-copy p { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.15rem,5vw,1.45rem);line-height:1.15; }
  .story-loader-title { font-size:clamp(1rem,4.4vw,1.25rem) !important; font-weight:700; }
  .story-loader-level { font-size:clamp(.65rem,2.8vw,.78rem) !important; color:#a45e38 !important; font-family:'DM Sans',sans-serif !important; font-weight:900 !important; letter-spacing:.12em !important; text-transform:uppercase; }
  .story-loader-label { font-size:clamp(.72rem,3.2vw,.85rem) !important; color:#596477 !important; font-style:italic !important; font-weight:600 !important; }
  .story-loader-percent { font-size:clamp(.72rem,3.2vw,.85rem) !important; color:#a45e38 !important; font-family:'DM Sans',sans-serif !important; font-weight:900 !important; }
  .story-loader-eq { display:flex;align-items:flex-end;gap:.18rem;height:1.45rem; }
  .story-loader-eq i { width:.22rem;height:100%;border-radius:999px;background:#e6a527;transform-origin:bottom;animation:story-loader-eq .9s ease-in-out infinite alternate; }
  .story-loader-eq i:nth-child(2) { animation-delay:-.65s;animation-duration:1.05s; }
  .story-loader-eq i:nth-child(3) { animation-delay:-.3s;animation-duration:.75s; }
  .story-loader-eq i:nth-child(4) { animation-delay:-.82s;animation-duration:.95s; }
  .story-loader-eq i:nth-child(5) { animation-delay:-.45s;animation-duration:1.15s; }
  .story-loader-track { display:block;width:min(100%,11rem);height:.38rem;overflow:hidden;border-radius:999px;background:rgba(23,42,69,.14); }
  .story-loader-track > span { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#d8941c,#e6a527,#f5ce6b);transition:width .25s ease; }
  .story-loader-cast { position:absolute;z-index:2;inset:auto 0 8%;height:46%;pointer-events:none; }
  .story-loader-walker { position:absolute;left:-24%;bottom:0;width:clamp(3rem,16vw,4.8rem);animation:story-loader-walk 14s linear infinite;animation-delay:calc(var(--i) * -3.1s); }
  .story-loader-walker:nth-child(2) { bottom:15%;width:clamp(3.3rem,18vw,5.2rem); }
  .story-loader-walker:nth-child(3) { bottom:4%;width:clamp(2.6rem,14vw,4.1rem); }
  .story-loader-walker:nth-child(4) { bottom:19%;width:clamp(3rem,16vw,4.6rem); }
  .story-loader-walker:nth-child(5) { bottom:8%;width:clamp(3.4rem,19vw,5.4rem); }
  .story-loader-walker:nth-child(6) { bottom:17%;width:clamp(2.7rem,15vw,4.2rem); }
  .story-loader-walker.reverse { animation-name:story-loader-walk-back; }
  .story-loader-walker::after { content:'';position:absolute;z-index:-1;left:14%;right:14%;bottom:-.2rem;height:.32rem;border-radius:50%;background:rgba(23,42,69,.2);filter:blur(2px); }
  .story-loader-bob { display:block;aspect-ratio:4/5;filter:drop-shadow(0 .3rem .3rem rgba(23,42,69,.18));animation:story-loader-bob .54s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -.11s);transform-origin:50% 100%; }
  .story-loader-bob :global(.story-character) { display:block;width:100%;height:100%; }

  @keyframes story-loader-walk { from { left:-24%; } to { left:110%; } }
  @keyframes story-loader-walk-back { from { left:110%; } to { left:-24%; } }
  @keyframes story-loader-bob { from { transform:translateY(0) rotate(-1.6deg); } to { transform:translateY(-.36rem) rotate(1.6deg); } }
  @keyframes story-loader-eq { from { transform:scaleY(.28); } to { transform:scaleY(1); } }
  @keyframes story-loader-in { from { opacity:0;transform:translateY(8px) scale(.97); } to { opacity:1;transform:none; } }
  @media (prefers-reduced-motion:reduce) {
    .story-loader-walker { animation:none;left:calc(8% + var(--i) * 16%);bottom:8%; }
    .story-loader-bob { animation:none; }
    .story-loader-eq i { animation:none;transform:scaleY(.5); }
  }

  :global(html.dark) .story-loader-wash { background:linear-gradient(180deg,rgba(18,34,55,.96) 0%,rgba(18,34,55,.66) 28%,rgba(18,34,55,.14) 55%,transparent 72%,rgba(0,0,0,.22) 100%); }
  :global(html.dark) .story-loader-copy { border-color:rgba(255,253,247,.3);background:rgba(15,30,50,.9);box-shadow:0 14px 38px rgba(0,0,0,.35); }
  :global(html.dark) .story-loader-copy p { color:#fffdf7; }
  :global(html.dark) .story-loader-track { background:rgba(255,253,247,.18); }
</style>
