<script lang="ts">
  import type { CharacterId } from './stories';

  let { id, talking = false, label = '' }: { id: CharacterId; talking?: boolean; label?: string } = $props();

  type Look = { skin: string; hair: string; hairStyle: 'bun' | 'short' | 'curly' | 'bob' | 'bald'; top: string; glasses?: boolean; beard?: boolean; moustache?: boolean; outfit: 'plain' | 'hoodie' | 'cardigan' | 'apron' | 'blazer' | 'tie' };
  const looks: Record<Exclude<CharacterId, 'bello'>, Look> = {
    mia: { skin: '#f2c7a5', hair: '#c4522e', hairStyle: 'bun', top: '#e6a527', outfit: 'plain' },
    leo: { skin: '#d9a07a', hair: '#3b2a20', hairStyle: 'short', top: '#4b78c2', glasses: true, beard: true, outfit: 'hoodie' },
    oma: { skin: '#f0cfb5', hair: '#d8d4cc', hairStyle: 'bun', top: '#8a62b6', glasses: true, outfit: 'cardigan' },
    tom: { skin: '#8d5a3b', hair: '#1f1a17', hairStyle: 'curly', top: '#fffdf7', outfit: 'apron' },
    kim: { skin: '#f1d2b0', hair: '#1c1f26', hairStyle: 'bob', top: '#172a45', outfit: 'blazer' },
    paul: { skin: '#e8b994', hair: '#a7a49e', hairStyle: 'bald', top: '#8c5b3d', moustache: true, outfit: 'tie' }
  };
  const look = $derived(id === 'bello' ? null : looks[id]);
</script>

<svg class="story-character" class:talking viewBox="0 0 120 150" role="img" aria-label={label}>
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
    <g fill="#f19a8a" opacity=".38"><circle cx="43" cy="70" r="4.5" /><circle cx="77" cy="70" r="4.5" /></g>
    <g class="story-eyes" fill="#172a45"><circle cx="49" cy="60" r="3.3" /><circle cx="71" cy="60" r="3.3" /></g>
    <path d="M44 51q5-3 10 0M66 51q5-3 10 0" fill="none" stroke={look.hairStyle === 'bald' || id === 'oma' ? '#8a857d' : look.hair} stroke-width="2.2" stroke-linecap="round" />
    {#if look.glasses}<g fill="none" stroke="#172a45" stroke-width="1.8"><circle cx="49" cy="60" r="7.5" /><circle cx="71" cy="60" r="7.5" /><path d="M56.5 60h7" /></g>{/if}
    <path d="M60 62q-3 5 0 7" fill="none" stroke="rgba(23,42,69,.4)" stroke-width="1.8" stroke-linecap="round" />
    {#if look.moustache}<path d="M47 73q6-6 13-2 7-4 13 2-13 3-26 0Z" fill={look.hair} />{/if}
    <path class="story-mouth-closed" d="M52 76q8 6 16 0" fill="none" stroke="#7a2e2a" stroke-width="2.4" stroke-linecap="round" />
    <ellipse class="story-mouth-open" cx="60" cy="78" rx="6" ry="4.5" fill="#7a2e2a" />
  {:else}
    <!-- Bello the dog -->
    <path d="M90 118q18-14 14-30" fill="none" stroke="#b07a4a" stroke-width="7" stroke-linecap="round" class="story-tail" />
    <ellipse cx="62" cy="128" rx="36" ry="20" fill="#b07a4a" />
    <rect x="36" y="128" width="11" height="20" rx="5" fill="#9a6a3f" /><rect x="74" y="128" width="11" height="20" rx="5" fill="#9a6a3f" />
    <path d="M42 106h40" stroke="#d64b45" stroke-width="6" stroke-linecap="round" /><circle cx="62" cy="111" r="3.5" fill="#e6b52e" />
    <ellipse cx="34" cy="80" rx="10" ry="19" fill="#6d4a2c" transform="rotate(18 34 80)" />
    <ellipse cx="90" cy="80" rx="10" ry="19" fill="#6d4a2c" transform="rotate(-18 90 80)" />
    <circle cx="62" cy="78" r="27" fill="#b07a4a" />
    <ellipse cx="62" cy="92" rx="14" ry="11" fill="#e8c9a0" />
    <g class="story-eyes" fill="#172a45"><circle cx="51" cy="73" r="3.4" /><circle cx="73" cy="73" r="3.4" /></g>
    <ellipse cx="62" cy="86" rx="5" ry="3.6" fill="#172a45" />
    <path class="story-mouth-closed" d="M56 94q6 4 12 0" fill="none" stroke="#172a45" stroke-width="2" stroke-linecap="round" />
    <path class="story-mouth-open" d="M56 94q6 4 12 0v4q0 8-6 8t-6-8Z" fill="#df8eb1" />
  {/if}
</svg>

<style>
  .story-character { display:block;width:100%;height:100%;overflow:visible; }
  .story-eyes { transform-box:fill-box;transform-origin:center;animation:story-blink 4.2s infinite; }
  .story-mouth-open { opacity:0;transform-box:fill-box;transform-origin:center top; }
  .talking .story-mouth-closed { opacity:0; }
  .talking .story-mouth-open { opacity:1;animation:story-talk .26s ease-in-out infinite alternate; }
  .talking .story-tail { transform-box:fill-box;transform-origin:left bottom;animation:story-wag .3s ease-in-out infinite alternate; }
  @keyframes story-blink { 0%,94%,100% { transform:scaleY(1); } 97% { transform:scaleY(.1); } }
  @keyframes story-talk { from { transform:scaleY(.35); } to { transform:scaleY(1); } }
  @keyframes story-wag { from { transform:rotate(-8deg); } to { transform:rotate(10deg); } }
  @media (prefers-reduced-motion:reduce) { .story-eyes,.talking .story-mouth-open,.talking .story-tail { animation:none; } }
</style>
