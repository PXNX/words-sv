<!--
  A small flag in a card's corner: "something is wrong with this". It opens a sheet with a note
  field and keeps the flag on the device (content/flags.ts); the insights page lists all flags as
  text to send to the developers.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import BottomSheet from '#lib/app/BottomSheet.svelte';
  import { addFlag, readFlags, removeFlag, writeFlags, type ContentFlag } from './flags.js';
  import IconFlag from '~icons/material-symbols/flag-rounded';

  let { item, kind, text }: { item: string; kind: ContentFlag['kind']; text: string } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  let open = $state(false);
  let note = $state('');
  let flagged = $state(false);
  $effect(() => {
    flagged = readFlags().some((flag) => flag.item === item);
  });

  function openSheet() {
    note = readFlags().find((flag) => flag.item === item)?.note ?? '';
    open = true;
  }
  function save(event: Event) {
    event.preventDefault();
    writeFlags(addFlag(readFlags(), { item, kind, language: settings.lang, text, note, ts: Date.now() }));
    flagged = true;
    open = false;
  }
  function clear() {
    writeFlags(removeFlag(readFlags(), item));
    flagged = false;
    open = false;
  }
</script>

<button type="button" class="flag-button" class:flagged onclick={openSheet} aria-label={m.flag_open({}, locale)} title={m.flag_open({}, locale)}><IconFlag aria-hidden="true" /></button>

<BottomSheet bind:open title={m.flag_title({}, locale)}>
  <form class="flag-form" onsubmit={save}>
    <p class="flag-item" lang={settings.lang}>{text}</p>
    <label for="flag-note">{m.flag_note({}, locale)}</label>
    <textarea id="flag-note" class="field-play" rows="3" maxlength="500" bind:value={note} placeholder={m.flag_placeholder({}, locale)}></textarea>
    <p class="flag-hint">{m.flag_hint({}, locale)}</p>
    <div class="flag-actions">
      {#if flagged}<button type="button" class="btn-play btn-play-soft" onclick={clear}>{m.flag_remove({}, locale)}</button>{/if}
      <button type="submit" class="btn-play btn-play-ink">{m.flag_save({}, locale)}</button>
    </div>
  </form>
</BottomSheet>

<style>
  .flag-button { display:grid;place-items:center;width:2rem;height:2rem;padding:0;border:0;border-radius:50%;background:transparent;color:var(--text-soft);opacity:.55;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity var(--dur-quick) ease,color var(--dur-quick) ease; }
  .flag-button :global(svg) { width:1.05rem;height:1.05rem; }
  .flag-button:hover,.flag-button:focus-visible { opacity:1; }
  .flag-button:focus-visible { outline:2px dashed var(--sun);outline-offset:1px; }
  .flag-button.flagged { color:var(--no);opacity:1; }
  .flag-form { display:grid;gap:.55rem;font-family:var(--font-body); }
  .flag-item { margin:0;padding:.55rem .7rem;border-radius:10px;background:color-mix(in oklch,currentColor 7%,transparent);font-size:var(--text-md);font-weight:700;line-height:1.4; }
  .flag-form label { font-size:var(--text-sm);font-weight:800; }
  .flag-form textarea { width:100%;padding:.55rem .7rem;color:var(--ink);font:inherit;font-size:var(--text-md);resize:vertical; }
  .flag-hint { margin:0;font-size:var(--text-xs);font-weight:600;line-height:1.45;opacity:.72; }
  .flag-actions { display:flex;justify-content:flex-end;gap:.5rem; }
</style>
