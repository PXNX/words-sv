<script lang="ts">
  import type { Language } from '#lib/data/vocabulary.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { characterNames, type Story } from './stories';
  import type { VocabularyLevel } from '#lib/data/vocabulary.js';
  import StoryCharacter from './StoryCharacter.svelte';
  import StoryScene from './StoryScene.svelte';

  let { story, title, level, label, lang, part, total, voice }: {
    story: Story;
    title: string;
    level: VocabularyLevel;
    label: string;
    lang: Language;
    part: number;
    total: number;
    voice: string;
  } = $props();
  const questions = $derived(story.beats.filter((beat) => beat.kind === 'question' || beat.kind === 'reply').length);
  const castNames = $derived.by(() => {
    const names = story.cast.map((member) => characterNames[member][lang]);
    try {
      return new Intl.ListFormat(settings.interfaceLocale, { style: 'long', type: 'conjunction' }).format(names);
    } catch {
      return names.join(', ');
    }
  });
  const partLabel = $derived(part > 0 && total > 0 ? m.story_loader_parts({ done: String(part), total: String(total) }, { locale: settings.interfaceLocale }) : '');
  const questionLabel = $derived(questions ? m.story_loader_questions({ count: String(questions) }, { locale: settings.interfaceLocale }) : '');
  const castLabel = $derived(castNames ? m.story_loader_cast({ names: castNames }, { locale: settings.interfaceLocale }) : '');
  const voiceLabel = $derived(voice ? m.story_loader_voice({ voice }, { locale: settings.interfaceLocale }) : '');
</script>

<section class="story-audio-loader" aria-label={label} aria-busy="true">
  <div class="story-loader-card">
    <span class="story-loader-bg" aria-hidden="true"><StoryScene scene={story.scene} weather={story.weather} /></span>
    <div class="story-loader-content">
      <span class="story-loader-walk" aria-hidden="true"><span class="story-loader-walker"><StoryCharacter id="lilith" mood="happy" /></span></span>
      <p class="story-loader-status" dir="auto">{label}</p>
      <p class="story-loader-title" dir="auto">{title}</p>
      <p class="story-loader-level">Level {level.toUpperCase()}</p>
      {#if partLabel || questionLabel || castLabel}
        <ul class="story-loader-facts" dir="auto">
          {#if partLabel}<li>{partLabel}</li>{/if}
          {#if questionLabel}<li>{questionLabel}</li>{/if}
          {#if castLabel}<li>{castLabel}</li>{/if}
        </ul>
      {/if}
      {#if voiceLabel}
        <p class="story-loader-meta" dir="auto"><span>{voiceLabel}</span></p>
      {/if}
      <span class="story-loader-wave" aria-hidden="true">{#each [0, 1, 2, 3, 4] as bar (bar)}<i style={`--bar:${bar}`}></i>{/each}</span>
    </div>
  </div>
</section>

<style>
  .story-audio-loader { position:relative;isolation:isolate;flex:1 1 auto;min-height:0;width:100%;display:grid;place-items:center;padding:clamp(.7rem,3.4vw,1.2rem);overflow-y:auto;background:radial-gradient(circle at 50% 18%,rgba(247,226,176,.5),transparent 62%); }
  .story-loader-card { position:relative;overflow:hidden;width:min(100%,26rem);padding:clamp(1.1rem,5.4vw,1.7rem) clamp(1rem,5vw,1.6rem) clamp(1.15rem,5.4vw,1.8rem);border:1px solid rgba(23,42,69,.22);border-radius:1.15rem;background:#cfe6f2;box-shadow:0 8px 20px rgba(23,42,69,.08);text-align:center;animation:story-loader-in .35s cubic-bezier(.23,1,.32,1); }
  .story-loader-bg { position:absolute;inset:0; }
  .story-loader-bg :global(.story-scene) { position:absolute;inset:0;width:100%;height:100%; }
  .story-loader-bg :global(.story-scene *) { animation-play-state:paused; }
  .story-loader-card::after { content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,253,247,.6),rgba(255,253,247,.84)); }
  .story-loader-content { position:relative;z-index:1;display:grid;justify-items:center;gap:.5rem;width:100%; }
  .story-loader-content p { margin:0; }
  .story-loader-status { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;line-height:1.35; }
  .story-loader-title { color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.1rem,4.8vw,1.35rem);font-weight:400;line-height:1.15; }
  .story-loader-level { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .story-loader-facts { display:flex;flex-wrap:wrap;justify-content:center;gap:.22rem .55rem;margin:.05rem 0 0;padding:0;list-style:none;color:#596477;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;line-height:1.3; }
  .story-loader-facts li { display:flex;align-items:center;gap:.32rem;min-width:0; }
  .story-loader-facts li + li::before { content:'';flex:none;width:.22rem;height:.22rem;border-radius:50%;background:#e6a527; }
  .story-loader-meta { display:flex;flex-wrap:wrap;justify-content:center;gap:.15rem .6rem;color:#7a6a58;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:700;line-height:1.3; }
  .story-loader-walk { position:relative;display:block;width:100%;height:4.6rem;overflow:hidden; }
  .story-loader-walker { position:absolute;bottom:0;left:0;width:3.2rem;height:4.5rem;transform-origin:50% 100%;animation:story-loader-walk 8s ease-in-out infinite; }
  .story-loader-walker :global(.story-character) { display:block;width:100%;height:100%;transform-origin:50% 100%;animation:story-loader-bob .34s ease-in-out infinite alternate; }
  .story-loader-wave { display:flex;align-items:flex-end;justify-content:center;gap:.18rem;height:1.3rem;margin-top:.1rem; }
  .story-loader-wave i { width:.22rem;height:100%;border-radius:999px;background:#a45e38;transform:scaleY(.38);transform-origin:bottom;animation:story-loader-level 1s ease-in-out infinite alternate;animation-delay:calc(var(--bar) * -.17s); }
  .story-loader-wave i:nth-child(2) { height:72%; }
  .story-loader-wave i:nth-child(3) { height:94%; }
  .story-loader-wave i:nth-child(4) { height:64%; }

  @keyframes story-loader-walk { 0%,100% { left:2%; } 50% { left:calc(100% - 3.2rem); } }
  @keyframes story-loader-bob { from { transform:rotate(-1.4deg); } to { transform:rotate(1.4deg); } }
  @keyframes story-loader-level { from { transform:scaleY(.28); } to { transform:scaleY(1); } }
  @keyframes story-loader-in { from { opacity:0;transform:translateY(8px) scale(.97); } to { opacity:1;transform:none; } }
  @media (prefers-reduced-motion:reduce) {
    .story-loader-walker { animation:none;left:calc(50% - 1.6rem); }
    .story-loader-walker :global(.story-character) { animation:none; }
    .story-loader-wave i { animation:none;transform:scaleY(.5); }
  }
  /* A short viewport (phone in landscape) still needs the title and the facts without clipping. */
  @media (max-height:520px) {
    .story-loader-card { padding:.85rem 1rem .95rem; }
    .story-loader-content { gap:.35rem; }
    .story-loader-walk { height:3.2rem; }
    .story-loader-walker { width:2.4rem;height:3.3rem; }
    .story-loader-wave { display:none; }
  }

  :global(html.dark) .story-audio-loader { background:radial-gradient(circle at 50% 18%,rgba(230,165,39,.16),transparent 62%); }
  :global(html.dark) .story-loader-card { border-color:rgba(255,253,247,.3);background:#172a45;box-shadow:0 14px 38px rgba(0,0,0,.35); }
  :global(html.dark) .story-loader-card::after { background:linear-gradient(180deg,rgba(15,30,50,.66),rgba(15,30,50,.9)); }
  :global(html.dark) .story-loader-status,
  :global(html.dark) .story-loader-title { color:#fffdf7; }
  :global(html.dark) .story-loader-facts { color:rgba(255,253,247,.72); }
  :global(html.dark) .story-loader-meta { color:rgba(255,253,247,.6); }
  :global(html.dark) .story-loader-wave i { background:#e6a527; }
</style>
