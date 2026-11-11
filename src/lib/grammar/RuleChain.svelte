<!--
  Why the answer is what it is, as a short chain that builds itself: the word or question that
  asks for the case, the case, and the form it gives ("mit" → Dativ → "dem"). Shown after every
  answer in the case drills, right or wrong, because the reason is what carries over to the next
  sentence. With `animate` off (or reduced motion) the chain simply stands there.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import type { CaseReason } from './cases.js';

  let { why, form, animate = true }: { why: CaseReason; form: string; animate?: boolean } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  // German names for the cases (what a course book calls them), with the interface's word beside it.
  const german = { nominative: 'Nominativ', accusative: 'Akkusativ', dative: 'Dativ' } as const;
  const local = $derived({
    nominative: m.grammar_value_de_nominativ({}, locale), accusative: m.grammar_value_de_akkusativ({}, locale), dative: m.grammar_value_de_dativ({}, locale)
  });
  const showLocal = $derived(local[why.case].toLocaleLowerCase() !== german[why.case].toLocaleLowerCase());
</script>

<p class="rule-chain case-{why.case}" class:animate aria-label={`${why.cue} → ${german[why.case]} → ${form}`}>
  <span class="cue" lang="de">{why.cue}</span>
  <i aria-hidden="true"></i>
  <span class="case"><b lang="de">{german[why.case]}</b>{#if showLocal}<small>{local[why.case]}</small>{/if}</span>
  <i aria-hidden="true"></i>
  <span class="form" lang="de">{form}</span>
</p>

<style>
  .rule-chain { --hue:var(--skill-grammar);display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.3rem;margin:0;font-family:var(--font-body);font-size:var(--text-sm);font-weight:800;line-height:1.15; }
  /* Each case keeps one colour throughout the app's drills. */
  .case-nominative { --hue:var(--skill-hear); }
  .case-accusative { --hue:var(--skill-speak); }
  .case-dative { --hue:var(--skill-write); }
  .rule-chain span { display:inline-grid;justify-items:center;padding:.3rem .6rem;border:2px solid var(--ink);border-radius:10px 7px 10px 8px;background:var(--surface);color:var(--text); }
  .rule-chain .case { border-color:var(--hue);background:color-mix(in oklch,var(--hue) 18%,var(--surface)); }
  .rule-chain .case small { font-size:.6875rem;font-weight:700;opacity:.75; }
  .rule-chain .form { background:var(--go);border-color:var(--go);color:var(--paper); }
  .rule-chain i { position:relative;width:1.3rem;height:2px;background:currentColor;opacity:.55;transform-origin:left center; }
  .rule-chain i::after { content:'';position:absolute;inset-inline-end:-1px;top:-3px;width:6px;height:6px;border-top:2px solid currentColor;border-right:2px solid currentColor;rotate:45deg; }
  :global([dir='rtl']) .rule-chain { direction:ltr; }
  .animate span { animation:chain-pop var(--dur-show) var(--ease-spring) both; }
  .animate i { animation:chain-draw var(--dur-move) var(--ease-out) both; }
  .animate > :nth-child(2) { animation-delay:.25s; } .animate > :nth-child(3) { animation-delay:.45s; }
  .animate > :nth-child(4) { animation-delay:.8s; } .animate > :nth-child(5) { animation-delay:1s; }
  @keyframes chain-pop { from { opacity:0;scale:.6;translate:-.4rem 0; } }
  @keyframes chain-draw { from { opacity:0;scale:0 1; } }
  :global(html.dark) .rule-chain span { border-color:var(--ink-deep); }
  :global(html.dark) .rule-chain .case { border-color:var(--hue); }
  :global(html.dark) .rule-chain .form { border-color:var(--go);color:#fffdf7; }
  @media (prefers-reduced-motion:reduce) { .animate span,.animate i { animation:none; } }
</style>
