<!--
  A story character keeping the learner company in a game mode: their face follows the round
  (`mood`) and an optional speech bubble carries a short line. Both pop again whenever they change,
  so a right or wrong answer gets a visible reaction.
-->
<script lang="ts">
  import StoryCharacter from './StoryCharacter.svelte';
  import type { CharacterId, Mood } from './stories';

  let { id, mood = 'neutral', line = '', size = 'md' }: { id: CharacterId; mood?: Mood; line?: string; size?: 'sm' | 'md' } = $props();
</script>

<div class="companion companion-{size}" aria-live="polite">
  {#key mood}<span class="companion-character" aria-hidden="true"><StoryCharacter {id} {mood} /></span>{/key}
  {#if line}{#key line}<p class="companion-bubble">{line}</p>{/key}{/if}
</div>

<style>
  .companion { display:flex;align-items:flex-end;gap:.35rem; }
  .companion-character { display:block;flex:none;width:3.3rem;height:4.1rem;transform-origin:50% 100%;animation:companion-hop .42s cubic-bezier(.34,1.56,.64,1); }
  .companion-sm .companion-character { width:2.5rem;height:3.1rem; }
  .companion-character :global(.story-character) { width:100%;height:100%; }
  .companion-bubble { position:relative;max-width:12rem;margin:0 0 1.6rem;padding:.38rem .6rem;border:2px solid #172a45;border-radius:.9rem .9rem .9rem .25rem;background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;line-height:1.3;animation:companion-pop .24s cubic-bezier(.23,1,.32,1) both; }
  .companion-sm .companion-bubble { margin-bottom:1.15rem;font-size:.6rem; }
  :global(html.dark) .companion-bubble { border-color:#0b1626;background:#2b4a70;color:#fffdf7; }
  @keyframes companion-hop { 0% { scale:1; } 40% { scale:1.06 .94; translate:0 0; } 70% { translate:0 -.25rem; } 100% { scale:1;translate:0 0; } }
  @keyframes companion-pop { from { opacity:0;transform:translateY(.25rem) scale(.92); } }
  @media (prefers-reduced-motion:reduce) { .companion-character,.companion-bubble { animation:none; } }
</style>
