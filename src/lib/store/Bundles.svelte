<!--
  The colour bundles for the learner's character, part of the customisation on the progress page:
  sets first, then single items. Tapping one tries it on the character above (`trying`); owned ones
  can be put on, the others bought with Telegram Stars once signed in with Telegram.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { defaultAvatar } from '#lib/profile/avatar.js';
  import { cosmeticState } from '#lib/profile/cosmetics.svelte.js';
  import { cloudSync } from '#lib/sync/cloudSync.svelte.js';
  import { network } from '#lib/offline/network.svelte.js';
  import { PRODUCTS, SHOP_ITEMS, ownedItems, stillUseful, withProduct, type Product, type ShopItemId } from './catalog.js';
  import { buy, storeState } from './storeClient.svelte.js';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';

  let { trying = $bindable(null) }: { trying?: Product | null } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const owned = $derived(ownedItems(storeState.bought).concat(SHOP_ITEMS.filter((item) => cosmeticState.unlocked.includes(item.id)).map((item) => item.id)));
  const linked = $derived(cloudSync.linked === true || storeState.linked === true);
  const sets = $derived(PRODUCTS.filter((product) => product.kind === 'set' && stillUseful(product, owned)));
  const items = $derived(PRODUCTS.filter((product) => product.kind === 'item'));
  let notice = $state('');

  const setNames: Record<string, () => string> = { set_neon: () => m.store_set_neon({}, locale), set_dusk: () => m.store_set_dusk({}, locale), set_rose: () => m.store_set_rose({}, locale) };
  const name = (product: Product) =>
    product.kind === 'set' ? setNames[product.id]?.() ?? product.id
    : SHOP_ITEMS.find((item) => item.id === product.id)?.part === 'hair' ? m.store_item_hair({}, locale) : m.store_item_top({}, locale);
  const swatches = (product: Product) => product.unlocks.map((id) => SHOP_ITEMS.find((item) => item.id === id)!);
  const isOwned = (product: Product) => product.unlocks.every((id) => owned.includes(id as ShopItemId));

  function tryOn(product: Product) {
    haptic('tap');
    trying = trying?.id === product.id ? null : product;
  }
  function wear(product: Product) {
    settings.setAvatar(withProduct(settings.avatar ?? defaultAvatar, product));
    trying = null;
    haptic('success');
  }
  async function purchase(product: Product) {
    notice = m.store_waiting({}, locale);
    const done = await buy(product.id);
    notice = done ? m.store_thanks({}, locale) : storeState.failed ? m.store_failed({}, locale) : '';
    if (done) haptic('win');
  }
</script>

<div class="bundles">
  <h3>{m.store_bundles({}, locale)}</h3>
  <p class="bundles-hint">{linked ? m.store_bundles_hint({}, locale) : m.store_sign_in({}, locale)}</p>
  {#if !network.online}<p class="bundles-hint">{m.offline_needs_network({}, locale)}</p>{/if}
  {#each [{ title: m.store_sets({}, locale), list: sets }, { title: m.store_items({}, locale), list: items }] as group (group.title)}
    {#if group.list.length}
      <h4>{group.title}</h4>
      <ul class="bundles-grid">
        {#each group.list as product (product.id)}
          {@const mine = isOwned(product)}
          {@const chosen = trying?.id === product.id}
          <li class="bundle" class:chosen>
            <button type="button" class="bundle-try" aria-pressed={chosen} onclick={() => tryOn(product)}>
              <span class="bundle-swatches" aria-hidden="true">{#each swatches(product) as item (item.id)}<i class={item.part} style:--c={item.choice}></i>{/each}</span>
              <strong>{name(product)}</strong>
              <small>{chosen ? m.store_trying({}, locale) : m.store_try({}, locale)}</small>
            </button>
            {#if mine}
              {#if chosen}<button type="button" class="btn-play btn-play-sm btn-play-soft" onclick={() => wear(product)}><IconCheck aria-hidden="true" />{m.store_wear({}, locale)}</button>
              {:else}<span class="bundle-owned"><IconCheck aria-hidden="true" />{m.store_owned({}, locale)}</span>{/if}
            {:else if linked}
              <button type="button" class="btn-play btn-play-sm bundle-buy" disabled={storeState.buying !== null || !network.online} onclick={() => purchase(product)}><IconStar aria-hidden="true" />{m.store_buy({ stars: num(product.stars) }, locale)}</button>
            {:else}
              <span class="bundle-price">{m.store_buy({ stars: num(product.stars) }, locale)}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/each}
  {#if notice}<p class="bundles-notice" role="status">{notice}</p>{/if}
</div>

<style>
  .bundles { display:grid;gap:.4rem;margin-top:.9rem;padding-top:.8rem;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent); }
  .bundles h3 { margin:0;color:var(--color-accent);font-size:.56rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .bundles h4 { margin:.3rem 0 0;font-size:.62rem;font-weight:900;opacity:.7; }
  .bundles-hint { margin:0;font-size:.6rem;font-weight:700;line-height:1.4;opacity:.65; }
  .bundles-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr));gap:.45rem;margin:0;padding:0;list-style:none; }
  .bundle { display:grid;gap:.4rem;justify-items:start;padding:.55rem .6rem;border:1.5px solid var(--play-line);border-radius:.7rem;transition:translate .2s,box-shadow .2s,border-color .2s; }
  .bundle.chosen { translate:0 -2px;border-color:#e6a527;box-shadow:3px 4px 0 var(--play-line,#172a45); }
  .bundle-try { display:grid;gap:.25rem;justify-items:start;width:100%;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:start;cursor:pointer; }
  .bundle-try strong { font-size:.7rem;font-weight:900; }
  .bundle-try small { font-size:.56rem;font-weight:700;opacity:.6; }
  .bundle-swatches { display:flex;gap:.25rem; }
  .bundle-swatches i { display:block;width:1.4rem;height:1.4rem;border:2px solid #172a45;background:var(--c); }
  .bundle-swatches i.hair { border-radius:50% 50% 35% 35%; }
  .bundle-swatches i.top { border-radius:.3rem .3rem .55rem .55rem; }
  .bundle-owned { display:inline-flex;align-items:center;gap:.25rem;color:#34824d;font-size:.6rem;font-weight:900; }
  .bundle-price { font-size:.6rem;font-weight:900;opacity:.6; }
  .bundle-buy { gap:.3rem; }
  .bundle :global(svg) { width:.85rem;height:.85rem; }
  .bundles-notice { margin:0;font-size:.62rem;font-weight:800;color:#1d4f7a; }
  :global(html.dark) .bundles-notice { color:#cfe4f5; }
  @media (prefers-reduced-motion:reduce) { .bundle { transition:none; } }
</style>
