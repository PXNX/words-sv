<script lang="ts">
  import type { CharacterId, Mood } from './stories';

  // `mouth` (0–1) is driven by the lip sync while this character's line is read aloud; null otherwise.
  let { id, talking = false, label = '', mood = 'neutral', mouth = null }: { id: CharacterId; talking?: boolean; label?: string; mood?: Mood; mouth?: number | null } = $props();
  const lipSynced = $derived(mouth !== null);
  // A sliver of mouth stays visible between syllables, so the lips never vanish mid-sentence.
  const mouthScale = $derived(mouth === null ? undefined : `scaleY(${Math.max(0.12, mouth).toFixed(3)})`);

  // Gradient ids must be unique per instance: the same character can be on screen several times.
  const uid = $props.id();

  type Look = { skin: string; hair: string; hairStyle: 'bun' | 'short' | 'curly' | 'bob' | 'bald'; top: string; glasses?: boolean; beard?: boolean; moustache?: boolean; outfit: 'plain' | 'hoodie' | 'cardigan' | 'apron' | 'blazer' | 'tie' };
  const looks: Record<Exclude<CharacterId, 'bello' | 'lilith'>, Look> = {
    mia: { skin: '#f2c7a5', hair: '#c4522e', hairStyle: 'bun', top: '#e6a527', outfit: 'plain' },
    leo: { skin: '#d9a07a', hair: '#3b2a20', hairStyle: 'short', top: '#4b78c2', glasses: true, beard: true, outfit: 'hoodie' },
    oma: { skin: '#f0cfb5', hair: '#d8d4cc', hairStyle: 'bun', top: '#8a62b6', glasses: true, outfit: 'cardigan' },
    tom: { skin: '#8d5a3b', hair: '#1f1a17', hairStyle: 'curly', top: '#fffdf7', outfit: 'apron' },
    kim: { skin: '#f1d2b0', hair: '#1c1f26', hairStyle: 'bob', top: '#172a45', outfit: 'blazer' },
    paul: { skin: '#e8b994', hair: '#a7a49e', hairStyle: 'bald', top: '#8c5b3d', moustache: true, outfit: 'tie' }
  };
  const look = $derived(id === 'bello' || id === 'lilith' ? null : looks[id]);

  // Eyebrows carry most of a face's mood; mouths and eyes follow below.
  const brows: Record<Mood, string> = {
    neutral: 'M44 51q5-3 10 0M66 51q5-3 10 0',
    happy: 'M44 49q5-4 10 0M66 49q5-4 10 0',
    surprised: 'M44 45.5q5-4.5 10 0M66 45.5q5-4.5 10 0',
    sad: 'M44 52q5-1 10-4.5M76 52q-5-1-10-4.5',
    curious: 'M44 47q5-4.5 10 0M66 52q5-2 10 0'
  };
  const humanMouths: Record<Exclude<Mood, 'happy' | 'surprised'>, string> = {
    neutral: 'M52 76q8 6 16 0',
    sad: 'M52 79.5q8-6 16 0',
    curious: 'M54 77.5q6 1.5 12-1.5'
  };
  // Lilith tilts her head like in her portrait, a little more when curious.
  const lilithTilt = $derived(mood === 'curious' ? -14 : mood === 'sad' ? -3 : -7);
</script>

<svg class="story-character" class:talking class:lip-synced={lipSynced} viewBox="0 0 120 150" role="img" aria-label={label}>
  {#if look}
    <!-- hair behind the head -->
    {#if look.hairStyle === 'bun'}<circle cx="60" cy="54" r="33" fill={look.hair} /><circle cx="60" cy="19" r={id === 'oma' ? 10 : 13} fill={look.hair} />{/if}
    {#if look.hairStyle === 'bob'}<path d="M26 58C26 32 42 21 60 21s34 11 34 37v30q-34 7-68 0Z" fill={look.hair} />{/if}
    <!-- body -->
    <path d="M14 150c0-30 20-48 46-48s46 18 46 48Z" fill={look.top} stroke="rgba(23,42,69,.18)" stroke-width="1.5" />
    {#if look.outfit === 'hoodie'}<path d="M40 106q20 14 40 0" fill="none" stroke="rgba(23,42,69,.35)" stroke-width="3" stroke-linecap="round" /><path d="M52 112v14M68 112v14" stroke="#fffdf7" stroke-width="2" stroke-linecap="round" />{/if}
    {#if look.outfit === 'cardigan'}<path d="M60 104v46" stroke="rgba(23,42,69,.3)" stroke-width="2" /><g fill="#fffdf7"><circle cx="48" cy="108" r="2.4" /><circle cx="54" cy="112" r="2.4" /><circle cx="60" cy="113.5" r="2.4" /><circle cx="66" cy="112" r="2.4" /><circle cx="72" cy="108" r="2.4" /></g>{/if}
    {#if look.outfit === 'apron'}<path d="M38 150v-34h44v34Z" fill="#34824d" /><path d="M42 116 50 103M78 116l-8-13" stroke="#34824d" stroke-width="3.5" /><rect x="52" y="124" width="16" height="10" rx="2" fill="rgba(255,253,247,.3)" />{/if}
    {#if look.outfit === 'blazer'}<path d="m48 103 12 24 12-24Z" fill="#fffdf7" /><path d="m48 103 12 24-7 6M72 103l-12 24 7 6" fill="none" stroke="rgba(255,253,247,.4)" stroke-width="1.6" />{/if}
    {#if look.outfit === 'tie'}<path d="m49 103 11 20 11-20Z" fill="#fffdf7" /><path d="m57 106h6l2 22-5 6-5-6Z" fill="#d64b45" />{/if}
    {#if look.outfit === 'plain'}<path d="M47 104q13 12 26 0" fill="none" stroke="#fffdf7" stroke-width="3" stroke-linecap="round" />{/if}
    <!-- neck, ears, head -->
    <rect x="51" y="82" width="18" height="22" rx="6" fill={look.skin} />
    <circle cx="30" cy="60" r="6" fill={look.skin} /><circle cx="90" cy="60" r="6" fill={look.skin} />
    <circle cx="60" cy="58" r="30" fill={look.skin} />
    {#if look.beard}<path d="M31 62c1 22 14 32 29 32s28-10 29-32c-5 12-15 17-29 17s-24-5-29-17Z" fill={look.hair} />{/if}
    <!-- hair in front -->
    {#if look.hairStyle === 'bun'}<path d="M28 58c0-24 15-34 32-34s32 10 32 34c-7-12-20-18-34-17-13 1-24 7-30 17Z" fill={look.hair} />{/if}
    {#if look.hairStyle === 'short'}<path d="M30 54c-1-21 14-31 31-31 18 0 31 11 29 31-5-11-15-16-29-16s-25 5-31 16Z" fill={look.hair} />{/if}
    {#if look.hairStyle === 'curly'}<g fill={look.hair}><circle cx="37" cy="44" r="10" /><circle cx="46" cy="33" r="11" /><circle cx="60" cy="29" r="12" /><circle cx="74" cy="33" r="11" /><circle cx="83" cy="44" r="10" /></g>{/if}
    {#if look.hairStyle === 'bob'}<path d="M30 52c0-19 13-29 30-29s30 10 30 29q-30-9-60 0Z" fill={look.hair} />{/if}
    {#if look.hairStyle === 'bald'}<g fill={look.hair}><ellipse cx="32" cy="52" rx="5" ry="10" /><ellipse cx="88" cy="52" rx="5" ry="10" /></g>{/if}
    <!-- face -->
    <g fill="#f19a8a" opacity={mood === 'happy' ? 0.62 : 0.38}><circle cx="43" cy="70" r="4.5" /><circle cx="77" cy="70" r="4.5" /></g>
    {#if mood === 'happy'}
      <path class="story-eyes" d="M45 61.5q4-4.5 8 0M67 61.5q4-4.5 8 0" fill="none" stroke="#172a45" stroke-width="2.6" stroke-linecap="round" />
    {:else if mood === 'surprised'}
      <g class="story-eyes"><circle cx="49" cy="60" r="4.3" fill="#172a45" /><circle cx="71" cy="60" r="4.3" fill="#172a45" /><circle cx="50.3" cy="58.6" r="1.3" fill="#fffdf7" /><circle cx="72.3" cy="58.6" r="1.3" fill="#fffdf7" /></g>
    {:else}
      <g class="story-eyes" fill="#172a45"><circle cx={mood === 'curious' ? 50 : 49} cy={mood === 'sad' ? 61 : mood === 'curious' ? 59 : 60} r="3.3" /><circle cx={mood === 'curious' ? 72 : 71} cy={mood === 'sad' ? 61 : mood === 'curious' ? 59 : 60} r="3.3" /></g>
    {/if}
    <path class="story-brows" d={brows[mood]} fill="none" stroke={look.hairStyle === 'bald' || id === 'oma' ? '#8a857d' : look.hair} stroke-width="2.2" stroke-linecap="round" />
    {#if look.glasses}<g fill="none" stroke="#172a45" stroke-width="1.8"><circle cx="49" cy="60" r="7.5" /><circle cx="71" cy="60" r="7.5" /><path d="M56.5 60h7" /></g>{/if}
    <path d="M60 62q-3 5 0 7" fill="none" stroke="rgba(23,42,69,.4)" stroke-width="1.8" stroke-linecap="round" />
    {#if look.moustache}<path d="M47 73q6-6 13-2 7-4 13 2-13 3-26 0Z" fill={look.hair} />{/if}
    {#if mood === 'happy'}
      <path class="story-mouth-closed" d="M50 74.5q10 12 20 0q-10 3-20 0Z" fill="#7a2e2a" />
    {:else if mood === 'surprised'}
      <ellipse class="story-mouth-closed" cx="60" cy="78" rx="3.6" ry="4.4" fill="#7a2e2a" />
    {:else}
      <path class="story-mouth-closed" d={humanMouths[mood]} fill="none" stroke="#7a2e2a" stroke-width="2.4" stroke-linecap="round" />
    {/if}
    <ellipse class="story-mouth-open" style:transform={mouthScale} cx="60" cy="78" rx="6" ry="4.5" fill="#7a2e2a" />
  {:else if id === 'lilith'}
    <!-- Lilith, Mia and Tom's Siamese-Persian cat: fluffy cream coat shading to fawn, seal-brown mask,
         ears, legs and tail, big round blue eyes, a soft white ruff, head tilted to one side. -->
    <defs>
      <radialGradient id="{uid}-coat" cx=".5" cy=".2" r=".85"><stop offset="0" stop-color="#f8f0e4" /><stop offset=".45" stop-color="#ead9c2" /><stop offset=".8" stop-color="#c3a585" /><stop offset="1" stop-color="#8a6a52" /></radialGradient>
      <radialGradient id="{uid}-head" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#f7eee1" /><stop offset="1" stop-color="#dcc6aa" /></radialGradient>
      <radialGradient id="{uid}-mask" cx=".5" cy=".58" r=".5"><stop offset="0" stop-color="#2b1d15" /><stop offset=".45" stop-color="#46301f" stop-opacity=".9" /><stop offset=".78" stop-color="#7a5b45" stop-opacity=".4" /><stop offset="1" stop-color="#a08066" stop-opacity="0" /></radialGradient>
      <linearGradient id="{uid}-leg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcc5a9" /><stop offset=".45" stop-color="#a7866b" /><stop offset="1" stop-color="#4a3326" /></linearGradient>
      <linearGradient id="{uid}-tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#36251b" /><stop offset="1" stop-color="#8d6d55" /></linearGradient>
      <linearGradient id="{uid}-ear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a281e" /><stop offset="1" stop-color="#6e5140" /></linearGradient>
      <radialGradient id="{uid}-eye" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#d9f0fb" /><stop offset=".5" stop-color="#7cc0ea" /><stop offset="1" stop-color="#2c6aa3" /></radialGradient>
    </defs>
    <!-- fluffy body, legs and the white ruff -->
    <path d="M60 76c20 0 36 14 39 34l4 3-3 3c1 12-2 23-8 31H28c-6-8-9-19-8-31l-3-3 4-3c3-20 19-34 39-34Z" fill="url(#{uid}-coat)" />
    <path d="M46 116c-2 10-2 21-1 30h13c0-9 0-19-1-30Z" fill="url(#{uid}-leg)" /><path d="M74 116c2 10 2 21 1 30H62c0-9 0-19 1-30Z" fill="url(#{uid}-leg)" />
    <g fill="#f8efe3" opacity=".85"><ellipse cx="60" cy="94" rx="20" ry="13" /><circle cx="46" cy="101" r="7.5" /><circle cx="74" cy="101" r="7.5" /><circle cx="52" cy="108" r="7" /><circle cx="68" cy="108" r="7" /><circle cx="60" cy="112" r="6.5" /></g>
    <g fill="#3e2b20"><ellipse cx="51" cy="145.5" rx="8" ry="4.5" /><ellipse cx="69" cy="145.5" rx="8" ry="4.5" /></g>
    <!-- the bushy tail curls round the front paws -->
    <path class="story-tail story-tail-cat" d="M93 146c-15 7-60 8-78 0-9-4-8-16 2-15 4 1 6 4 10 5 18 5 43 5 63 2 6 0 8 6 3 8Z" fill="url(#{uid}-tail)" />
    <!-- the head sits a little smaller than life, like the round fluffy face in her portrait -->
    <g transform="rotate({lilithTilt} 60 64) translate(60 66) scale(.86) translate(-60 -62)">
      <!-- ears, drooping when she is sad -->
      <g transform={mood === 'sad' ? 'rotate(-24 42 40)' : undefined}><path d="M29 50Q24 30 28 15q14 7 27 18Z" fill="url(#{uid}-ear)" /><path d="M33 44q-3-13-1-22 9 5 16 12Z" fill="#7a5646" /><path d="M35 42l4-6M38 44l5-5" stroke="#f4e9da" stroke-width="1" opacity=".8" /></g>
      <g transform={mood === 'sad' ? 'rotate(24 78 40)' : undefined}><path d="M91 50Q96 30 92 15q-14 7-27 18Z" fill="url(#{uid}-ear)" /><path d="M87 44q3-13 1-22-9 5-16 12Z" fill="#7a5646" /><path d="M85 42l-4-6M82 44l-5-5" stroke="#f4e9da" stroke-width="1" opacity=".8" /></g>
      <!-- round fluffy head with cheek tufts -->
      <path d="M60 30c20 0 32 12 33 28l5 4-5 4 3 6-7 2c-5 12-17 18-29 18s-24-6-29-18l-7-2 3-6-5-4 5-4c1-16 13-28 33-28Z" fill="url(#{uid}-head)" />
      <ellipse cx="60" cy="42" rx="12" ry="6" fill="#cdb497" opacity=".45" />
      <!-- seal-brown mask, darkest around the eyes and muzzle -->
      <ellipse cx="60" cy="68" rx="26" ry="22" fill="url(#{uid}-mask)" />
      <g fill="#2e1f17" opacity=".4"><circle cx="47.5" cy="64" r="10" /><circle cx="72.5" cy="64" r="10" /></g>
      <!-- eyes -->
      {#if mood === 'happy'}
        <path class="story-eyes" d="M41.5 65q6-6 12 0M66.5 65q6-6 12 0" fill="none" stroke="#a9d6f2" stroke-width="2.6" stroke-linecap="round" />
      {:else}
        <g class="story-eyes">
          <circle cx="47.5" cy="64" r="7.6" fill="url(#{uid}-eye)" stroke="#140d0a" stroke-width="1.4" /><circle cx="72.5" cy="64" r="7.6" fill="url(#{uid}-eye)" stroke="#140d0a" stroke-width="1.4" />
          <circle cx={mood === 'curious' ? 48.5 : 47.5} cy={mood === 'curious' ? 62.5 : 64.3} r={mood === 'surprised' ? 5.4 : mood === 'sad' ? 3 : 3.8} fill="#0d0907" /><circle cx={mood === 'curious' ? 73.5 : 72.5} cy={mood === 'curious' ? 62.5 : 64.3} r={mood === 'surprised' ? 5.4 : mood === 'sad' ? 3 : 3.8} fill="#0d0907" />
          <circle cx="49.8" cy="61.5" r="1.8" fill="#fff" /><circle cx="74.8" cy="61.5" r="1.8" fill="#fff" /><circle cx="45.6" cy="66.6" r=".8" fill="#fff" /><circle cx="70.6" cy="66.6" r=".8" fill="#fff" />
        </g>
      {/if}
      <!-- nose, mouth, whiskers -->
      <path d="M55.5 74.5h9L60 79.5Z" fill="#22160f" />
      {#if mood === 'sad'}
        <path class="story-mouth-closed" d="M54.5 84q5.5-4 11 0" fill="none" stroke="rgba(240,225,205,.75)" stroke-width="1.5" stroke-linecap="round" />
      {:else if mood === 'surprised'}
        <ellipse class="story-mouth-closed" cx="60" cy="83" rx="2.2" ry="2.6" fill="#c86f7f" />
      {:else}
        <path class="story-mouth-closed" d={mood === 'happy' ? 'M60 79.5q-3 4.2-7.5 2M60 79.5q3 4.2 7.5 2' : 'M60 79.5q-2.5 3.2-6 1.6M60 79.5q2.5 3.2 6 1.6'} fill="none" stroke="rgba(240,225,205,.75)" stroke-width="1.5" stroke-linecap="round" />
      {/if}
      <g class="story-mouth-open" style:transform={mouthScale}><ellipse cx="60" cy="84.5" rx="5.4" ry="5" fill="#5a1f28" /><ellipse cx="60" cy="87.4" rx="3.4" ry="2.1" fill="#e58fa0" /></g>
      <path d="M44 78 18 73M44 81l-26 2M76 78l26-5M76 81l26 2" stroke="rgba(255,250,240,.85)" stroke-width="1" stroke-linecap="round" />
    </g>
  {:else}
    <!-- Bello the dog -->
    <path d="M90 118q18-14 14-30" fill="none" stroke="#b07a4a" stroke-width="7" stroke-linecap="round" class="story-tail" />
    <ellipse cx="62" cy="128" rx="36" ry="20" fill="#b07a4a" />
    <rect x="36" y="128" width="11" height="20" rx="5" fill="#9a6a3f" /><rect x="74" y="128" width="11" height="20" rx="5" fill="#9a6a3f" />
    <path d="M42 106h40" stroke="#d64b45" stroke-width="6" stroke-linecap="round" /><circle cx="62" cy="111" r="3.5" fill="#e6b52e" />
    <ellipse cx="34" cy="80" rx="10" ry="19" fill="#6d4a2c" transform={mood === 'sad' ? 'rotate(32 34 80)' : 'rotate(18 34 80)'} />
    <ellipse cx="90" cy="80" rx="10" ry="19" fill="#6d4a2c" transform={mood === 'sad' ? 'rotate(-32 90 80)' : 'rotate(-18 90 80)'} />
    <circle cx="62" cy="78" r="27" fill="#b07a4a" />
    <ellipse cx="62" cy="92" rx="14" ry="11" fill="#e8c9a0" />
    {#if mood === 'happy'}
      <path class="story-eyes" d="M47.5 74q3.5-4 7 0M69.5 74q3.5-4 7 0" fill="none" stroke="#172a45" stroke-width="2.4" stroke-linecap="round" />
    {:else}
      <g class="story-eyes" fill="#172a45"><circle cx="51" cy="73" r={mood === 'surprised' ? 4.3 : 3.4} /><circle cx="73" cy="73" r={mood === 'surprised' ? 4.3 : 3.4} /></g>
    {/if}
    {#if mood === 'sad' || mood === 'surprised' || mood === 'curious'}<path d={mood === 'sad' ? 'M46 66q5 0 9-3.5M78 66q-5 0-9-3.5' : mood === 'surprised' ? 'M46 64q5-4 10 0M68 64q5-4 10 0' : 'M46 64q5-4 10 0M68 67q5-2 10 0'} fill="none" stroke="#6d4a2c" stroke-width="2.2" stroke-linecap="round" />{/if}
    <ellipse cx="62" cy="86" rx="5" ry="3.6" fill="#172a45" />
    {#if mood === 'happy'}
      <path class="story-mouth-closed" d="M56 94q6 4 12 0v4q0 8-6 8t-6-8Z" fill="#df8eb1" />
    {:else}
      <path class="story-mouth-closed" d={mood === 'sad' ? 'M56 97q6-4 12 0' : 'M56 94q6 4 12 0'} fill="none" stroke="#172a45" stroke-width="2" stroke-linecap="round" />
    {/if}
    <g class="story-mouth-open" style:transform={mouthScale}><path d="M52.5 93q9.5 6 19 0v3q0 12-9.5 12t-9.5-12Z" fill="#5a1f28" /><path d="M56.5 100q5.5-3 11 0v3q0 7-5.5 7t-5.5-7Z" fill="#df8eb1" /></g>
  {/if}
</svg>

<style>
  .story-character { display:block;width:100%;height:100%;overflow:visible; }
  .story-eyes { transform-box:fill-box;transform-origin:center;animation:story-blink 4.2s infinite; }
  .story-mouth-open { opacity:0;transform-box:fill-box;transform-origin:center top; }
  .talking .story-mouth-closed,.lip-synced .story-mouth-closed { opacity:0; }
  .lip-synced .story-mouth-open { opacity:1; }
  .lip-synced .story-tail { transform-box:fill-box;transform-origin:left bottom;animation:story-wag .3s ease-in-out infinite alternate; }
  .lip-synced .story-tail-cat { transform-origin:right center; }
  .talking .story-mouth-open { opacity:1;animation:story-talk .26s ease-in-out infinite alternate; }
  .talking .story-tail { transform-box:fill-box;transform-origin:left bottom;animation:story-wag .3s ease-in-out infinite alternate; }
  .talking .story-tail-cat { transform-origin:right center; }
  @keyframes story-blink { 0%,94%,100% { transform:scaleY(1); } 97% { transform:scaleY(.1); } }
  @keyframes story-talk { from { transform:scaleY(.35); } to { transform:scaleY(1); } }
  @keyframes story-wag { from { transform:rotate(-6deg); } to { transform:rotate(7deg); } }
  @media (prefers-reduced-motion:reduce) { .story-eyes,.talking .story-mouth-open,.talking .story-tail,.lip-synced .story-tail { animation:none; } }
</style>
