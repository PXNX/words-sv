<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import type { VocabularyLevel } from '#lib/data/vocabulary.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';

  let { level, label, progress, done, total, voice, oncontinue }: {
    level: VocabularyLevel;
    label: string;
    progress: number;
    done: number;
    total: number;
    voice: string;
    oncontinue?: () => void;
  } = $props();
  const percent = $derived(Math.round(Math.min(1, Math.max(0, progress)) * 100));
  const progressLabel = $derived(total > 0 ? m.word_bank_progress({ done: String(done), total: String(total) }, { locale: settings.interfaceLocale }) : '');
  const voiceLabel = $derived(voice ? m.story_loader_voice({ voice }, { locale: settings.interfaceLocale }) : '');
  const continueLabel = $derived(m.word_bank_continue({}, { locale: settings.interfaceLocale }));
</script>

<section class="word-bank-loader" aria-label={label} aria-busy="true">
  <div class="word-bank-card">
    <div class="word-bank-content">
      <span class="word-bank-walk" aria-hidden="true"><span class="word-bank-walker"><StoryCharacter id="lilith" mood="happy" /></span></span>
      <p class="word-bank-status" dir="auto">{label}</p>
      <p class="word-bank-level">{m.vocabulary({}, { locale: settings.interfaceLocale })} {level.toUpperCase()}</p>
      <div class="word-bank-progress">
        <span class="word-bank-track" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
          <span style:width={`${percent}%`}></span>
        </span>
        <span class="word-bank-percent" aria-hidden="true">{percent}%</span>
      </div>
      {#if progressLabel}
        <p class="word-bank-count" dir="auto">{progressLabel}</p>
      {/if}
      <p class="word-bank-hint" dir="auto">{m.word_bank_hint({}, { locale: settings.interfaceLocale })}</p>
      {#if voiceLabel}
        <p class="word-bank-voice" dir="auto">{voiceLabel}</p>
      {/if}
      <span class="word-bank-wave" aria-hidden="true">{#each [0, 1, 2, 3, 4] as bar (bar)}<i style={`--bar:${bar}`}></i>{/each}</span>
      {#if oncontinue && total > 0 && done < total}
        <button type="button" class="word-bank-continue" onclick={oncontinue}>{continueLabel}</button>
      {/if}
    </div>
  </div>
</section>

<style>
  .word-bank-loader { position:relative;isolation:isolate;flex:1 1 auto;min-height:0;width:100%;display:grid;place-items:center;padding:clamp(.7rem,3.4vw,1.2rem);overflow-y:auto;background:radial-gradient(circle at 50% 18%,rgba(247,226,176,.5),transparent 62%); }
  .word-bank-card { position:relative;overflow:hidden;width:min(100%,26rem);padding:clamp(1.1rem,5.4vw,1.7rem) clamp(1rem,5vw,1.6rem) clamp(1.15rem,5.4vw,1.8rem);border:1px solid rgba(23,42,69,.22);border-radius:1.15rem;background:#cfe6f2;box-shadow:0 8px 20px rgba(23,42,69,.08);text-align:center;animation:word-bank-in .35s cubic-bezier(.23,1,.32,1); }
  .word-bank-card::after { content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,253,247,.72),rgba(255,253,247,.9)); }
  .word-bank-content { position:relative;z-index:1;display:grid;justify-items:center;gap:.5rem;width:100%; }
  .word-bank-content p { margin:0; }
  .word-bank-status { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;line-height:1.35; }
  .word-bank-level { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .word-bank-progress { display:flex;align-items:center;gap:.45rem;width:min(100%,13rem); }
  .word-bank-track { flex:1 1 auto;display:block;height:.36rem;overflow:hidden;border-radius:999px;background:rgba(23,42,69,.14); }
  .word-bank-track > span { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#d8941c,#e6a527,#f5ce6b);transition:width .25s ease; }
  .word-bank-percent { flex:0 0 auto;min-width:2.1rem;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.02em;text-align:end;font-variant-numeric:tabular-nums; }
  .word-bank-count { color:#596477;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;line-height:1.3;font-variant-numeric:tabular-nums; }
  .word-bank-hint { color:#596477;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:700;line-height:1.35; }
  .word-bank-voice { color:#7a6a58;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:700;line-height:1.3; }
  .word-bank-walk { position:relative;display:block;width:100%;height:4.6rem;overflow:hidden; }
  .word-bank-walker { position:absolute;bottom:0;left:0;width:3.2rem;height:4.5rem;transform-origin:50% 100%;animation:word-bank-walk 8s ease-in-out infinite; }
  .word-bank-walker :global(.story-character) { display:block;width:100%;height:100%;transform-origin:50% 100%;animation:word-bank-bob .34s ease-in-out infinite alternate; }
  .word-bank-wave { display:flex;align-items:flex-end;justify-content:center;gap:.18rem;height:1.3rem;margin-top:.1rem; }
  .word-bank-wave i { width:.22rem;height:100%;border-radius:999px;background:#a45e38;transform:scaleY(.38);transform-origin:bottom;animation:word-bank-level 1s ease-in-out infinite alternate;animation-delay:calc(var(--bar) * -.17s); }
  .word-bank-wave i:nth-child(2) { height:72%; }
  .word-bank-wave i:nth-child(3) { height:94%; }
  .word-bank-wave i:nth-child(4) { height:64%; }
  .word-bank-continue { margin-top:.15rem;min-height:1.8rem;padding:.25rem .8rem;border:1.5px solid rgba(23,42,69,.35);border-radius:999px;background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;cursor:pointer; }
  .word-bank-continue:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }

  @keyframes word-bank-walk { 0%,100% { left:2%; } 50% { left:calc(100% - 3.2rem); } }
  @keyframes word-bank-bob { from { transform:rotate(-1.4deg); } to { transform:rotate(1.4deg); } }
  @keyframes word-bank-level { from { transform:scaleY(.28); } to { transform:scaleY(1); } }
  @keyframes word-bank-in { from { opacity:0;transform:translateY(8px) scale(.97); } to { opacity:1;transform:none; } }
  @media (prefers-reduced-motion:reduce) {
    .word-bank-walker { animation:none;left:calc(50% - 1.6rem); }
    .word-bank-walker :global(.story-character) { animation:none; }
    .word-bank-wave i { animation:none;transform:scaleY(.5); }
  }
  @media (max-height:520px) {
    .word-bank-card { padding:.85rem 1rem .95rem; }
    .word-bank-content { gap:.35rem; }
    .word-bank-walk { height:3.2rem; }
    .word-bank-walker { width:2.4rem;height:3.3rem; }
    .word-bank-wave { display:none; }
  }

  :global(html.dark) .word-bank-loader { background:radial-gradient(circle at 50% 18%,rgba(230,165,39,.16),transparent 62%); }
  :global(html.dark) .word-bank-card { border-color:rgba(255,253,247,.3);background:#172a45;box-shadow:0 14px 38px rgba(0,0,0,.35); }
  :global(html.dark) .word-bank-card::after { background:linear-gradient(180deg,rgba(15,30,50,.66),rgba(15,30,50,.9)); }
  :global(html.dark) .word-bank-status { color:#fffdf7; }
  :global(html.dark) .word-bank-count,:global(html.dark) .word-bank-hint { color:rgba(255,253,247,.72); }
  :global(html.dark) .word-bank-track { background:rgba(255,253,247,.18); }
  :global(html.dark) .word-bank-percent { color:#e9b07d; }
  :global(html.dark) .word-bank-voice { color:rgba(255,253,247,.6); }
  :global(html.dark) .word-bank-wave i { background:#e6a527; }
  :global(html.dark) .word-bank-continue { border-color:rgba(255,253,247,.34);background:#213a5d;color:#fffdf7; }
</style>
