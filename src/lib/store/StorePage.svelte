<!--
  The store: the learner's character with its editor on top, then WordCircle Pro and the colours for
  sale (sets first, then single items), each one tried on the character before buying with Telegram
  Stars. Buying needs a Telegram account; without one the sign-in card takes the buttons' place.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatDate } from '#lib/format/format.js';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { defaultAvatar, type Avatar } from '#lib/profile/avatar.js';
  import { cosmeticState } from '#lib/profile/cosmetics.svelte.js';
  import AvatarEditor from '#lib/profile/AvatarEditor.svelte';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import TelegramAccount from '#lib/settings/TelegramAccount.svelte';
  import { cloudSync } from '#lib/sync/cloudSync.svelte.js';
  import { PRODUCTS, SHOP_ITEMS, stillUseful, ownedItems, type Product, type ShopItemId } from './catalog.js';
  import { buy, refreshStore, storeState } from './storeClient.svelte.js';
  import IconPro from '~icons/material-symbols/workspace-premium-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const direction = $derived(getTextDirection(settings.interfaceLocale));
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);
  const avatar = $derived(settings.avatar ?? defaultAvatar);
  const owned = $derived(ownedItems(storeState.bought).concat(SHOP_ITEMS.filter((item) => cosmeticState.unlocked.includes(item.id)).map((item) => item.id)));
  const linked = $derived(cloudSync.linked === true || storeState.linked === true);
  let trying = $state<Product | null>(null);
  let notice = $state('');

  const preview = $derived.by((): Avatar => {
    if (!trying) return avatar;
    const next = { ...avatar } as Record<string, string>;
    for (const id of trying.unlocks) {
      const item = SHOP_ITEMS.find((entry) => entry.id === id)!;
      next[item.part] = item.choice;
    }
    return next as Avatar;
  });

  onMount(() => void refreshStore());
  $effect(() => {
    if (cloudSync.linked) void refreshStore();
  });

  const name = (product: Product) =>
    product.kind === 'pro' ? m.store_pro_title({}, locale)
    : product.kind === 'set' ? ({ set_neon: m.store_set_neon, set_dusk: m.store_set_dusk, set_rose: m.store_set_rose } as Record<string, (i: object, o: { locale: string }) => string>)[product.id]?.({}, locale) ?? product.id
    : SHOP_ITEMS.find((item) => item.id === product.id)?.part === 'hair' ? m.store_item_hair({}, locale) : m.store_item_top({}, locale);
  const swatches = (product: Product) => product.unlocks.map((id) => SHOP_ITEMS.find((item) => item.id === id)!);
  const isOwned = (product: Product) => product.kind !== 'pro' && product.unlocks.every((id) => owned.includes(id as ShopItemId));
  const sets = $derived(PRODUCTS.filter((product) => product.kind === 'set' && stillUseful(product, owned)));
  const items = $derived(PRODUCTS.filter((product) => product.kind === 'item'));
  const pro = PRODUCTS.find((product) => product.kind === 'pro')!;
  const proActive = $derived(Boolean(storeState.proUntil && storeState.proUntil > Date.now()));

  function tryOn(product: Product) {
    haptic('tap');
    trying = trying?.id === product.id ? null : product;
  }
  function wear() {
    settings.setAvatar(preview);
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

<main class="store" dir={direction} lang={settings.interfaceLocale}>
  <header class="store-hero panel-play">
    <div class="store-stage" aria-hidden="true">
      {#key preview}<span class="store-character" in:scale={{ start: 0.92, duration: ms(260), easing: backOut }}><StoryCharacter id="kumar" avatar={preview} mood="happy" /></span>{/key}
      <span class="store-spark one">✦</span><span class="store-spark two">✧</span><span class="store-spark three">✦</span>
    </div>
    <div class="store-hero-text">
      <p class="store-kicker">{m.store_kicker({}, locale)}</p>
      <h1>{settings.firstName || m.store_title({}, locale)}</h1>
      <p>{m.store_intro({}, locale)}</p>
    </div>
  </header>

  {#if notice}<p class="store-notice" role="status" transition:fly={{ y: -8, duration: ms(180) }}>{notice}</p>{/if}

  <details class="panel-play store-editor" open>
    <summary>{m.store_customize({}, locale)}</summary>
    <AvatarEditor value={avatar} onchange={(next) => settings.setAvatar(next)} />
  </details>

  <section class="panel-play store-pro" class:active={proActive} aria-labelledby="store-pro-title">
    <span class="store-pro-badge" aria-hidden="true"><IconPro /></span>
    <div>
      <h2 id="store-pro-title">{m.store_pro_title({}, locale)}</h2>
      <p>{m.store_pro_benefit({}, locale)}</p>
      <small>{proActive ? m.store_pro_active({ date: formatDate(settings.formatContext, storeState.proUntil!, 'dayMonth') }, locale) : m.store_pro_terms({ stars: num(pro.stars) }, locale)}</small>
    </div>
    {#if linked && !proActive}
      <button type="button" class="btn-play btn-play-ink store-buy" disabled={storeState.buying !== null} onclick={() => purchase(pro)}><IconStar aria-hidden="true" />{m.store_buy({ stars: num(pro.stars) }, locale)}</button>
    {/if}
  </section>

  {#if !linked}
    <section class="panel-play store-sign-in">
      <p>{m.store_sign_in({}, locale)}</p>
      <TelegramAccount />
    </section>
  {/if}

  {#each [{ title: m.store_sets({}, locale), list: sets }, { title: m.store_items({}, locale), list: items }] as group (group.title)}
    {#if group.list.length}
      <h2 class="store-heading">{group.title}</h2>
      <ul class="store-grid">
        {#each group.list as product, index (product.id)}
          {@const mine = isOwned(product)}
          <li class="panel-play store-card" class:chosen={trying?.id === product.id} class:mine style:--i={index}>
            <button type="button" class="store-try" aria-pressed={trying?.id === product.id} onclick={() => tryOn(product)}>
              <span class="store-swatches" aria-hidden="true">{#each swatches(product) as item}<i class={item.part} style:--c={item.choice}></i>{/each}</span>
              <strong>{name(product)}</strong>
              <small>{trying?.id === product.id ? m.store_wear({}, locale) : m.store_try({}, locale)}</small>
            </button>
            {#if mine}
              {#if trying?.id === product.id}<button type="button" class="btn-play btn-play-sm btn-play-soft" onclick={wear}><IconCheck aria-hidden="true" />{m.store_wear({}, locale)}</button>
              {:else}<span class="store-owned"><IconCheck aria-hidden="true" />{m.store_owned({}, locale)}</span>{/if}
            {:else if linked}
              <button type="button" class="btn-play btn-play-sm store-buy" disabled={storeState.buying !== null} onclick={() => purchase(product)}><IconStar aria-hidden="true" />{m.store_buy({ stars: num(product.stars) }, locale)}</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/each}
</main>

<style>
  .store { flex:1;min-height:0;overflow-y:auto;width:100%;max-width:44rem;margin-inline:auto;padding:clamp(3.2rem,10vw,3.8rem) clamp(1rem,5vw,2rem) 2rem;display:grid;align-content:start;gap:.9rem;font-family:'DM Sans',sans-serif; }
  .store-hero { display:flex;align-items:center;gap:1rem;padding:.9rem 1rem;overflow:hidden; }
  .store-stage { position:relative;flex:none;width:6.5rem;height:8rem;border-radius:3rem 3rem .6rem .6rem;background:radial-gradient(circle at 50% 85%,#f7e2b0,#fbf1da 70%); }
  :global(html.dark) .store-stage { background:radial-gradient(circle at 50% 85%,#3a5a85,#213a5d 70%); }
  .store-character { position:absolute;inset:.4rem .4rem 0;display:block; }
  .store-spark { position:absolute;color:#e6a527;font-size:.9rem;animation:store-twinkle 2.4s ease-in-out infinite; }
  .store-spark.one { top:.5rem;left:.3rem; } .store-spark.two { top:1.6rem;right:.2rem;animation-delay:.8s; } .store-spark.three { bottom:1.6rem;left:.1rem;animation-delay:1.6s; }
  @keyframes store-twinkle { 0%,100% { opacity:.2;scale:.7; } 50% { opacity:1;scale:1.15; } }
  .store-hero-text { display:grid;gap:.25rem;min-width:0; }
  .store-kicker { margin:0;color:#a45e38;font-size:.58rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  :global(html.dark) .store-kicker,:global(html.dark) .store-heading { color:#e6a527; }
  .store-hero h1 { margin:0;font-family:'DM Serif Display',serif;font-size:1.7rem;font-weight:400;line-height:1.05; }
  .store-hero p:last-child { margin:0;font-size:.66rem;font-weight:700;line-height:1.45;opacity:.7; }
  .store-notice { margin:0;padding:.55rem .75rem;border-radius:.8rem;background:#dcebf7;color:#1d4f7a;font-size:.68rem;font-weight:800; }
  :global(html.dark) .store-notice { background:#213a5d;color:#cfe4f5; }
  .store-editor { padding:.75rem .85rem; }
  .store-editor summary { cursor:pointer;font-size:.8rem;font-weight:900; }
  .store-editor[open] summary { margin-bottom:.6rem; }
  .store-pro { display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.4rem .8rem;padding:.85rem;background:linear-gradient(135deg,#fff4d9,#fffdf7 60%); }
  :global(html.dark) .store-pro { background:linear-gradient(135deg,#4a3a1a,#213a5d 60%); }
  .store-pro-badge { display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:#e6a527;color:#172a45;animation:store-badge 3s ease-in-out infinite; }
  .store-pro-badge :global(svg) { width:1.5rem;height:1.5rem; }
  @keyframes store-badge { 0%,100% { rotate:0deg; } 50% { rotate:-8deg;scale:1.06; } }
  .store-pro h2 { margin:0;font-size:.9rem;font-weight:900; }
  .store-pro p { margin:.15rem 0;font-size:.66rem;font-weight:700;line-height:1.45; }
  .store-pro small { font-size:.6rem;font-weight:800;opacity:.65; }
  .store-pro.active small { color:#34824d;opacity:1; }
  .store-pro .store-buy { grid-column:1 / -1;justify-self:start; }
  .store-buy { gap:.3rem; }
  .store-buy :global(svg),.store-owned :global(svg),.store-card :global(.btn-play svg) { width:.85rem;height:.85rem; }
  .store-sign-in { display:grid;gap:.6rem;padding:.85rem; }
  .store-sign-in p { margin:0;font-size:.68rem;font-weight:800; }
  .store-heading { margin:.4rem 0 -.3rem;color:#a45e38;font-size:.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .store-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:.6rem;margin:0;padding:0;list-style:none; }
  .store-card { display:grid;gap:.5rem;justify-items:start;padding:.7rem;animation:store-card-in .4s cubic-bezier(.34,1.56,.64,1) both;animation-delay:calc(var(--i) * 50ms);transition:translate .2s,box-shadow .2s; }
  .store-card.chosen { translate:0 -3px;box-shadow:5px 7px 0 var(--play-line,#172a45); }
  @keyframes store-card-in { from { opacity:0;scale:.9;translate:0 .6rem; } }
  .store-try { display:grid;gap:.3rem;justify-items:start;width:100%;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:start;cursor:pointer; }
  .store-try strong { font-size:.76rem;font-weight:900; }
  .store-try small { font-size:.6rem;font-weight:700;opacity:.6; }
  .store-swatches { display:flex;gap:.25rem; }
  .store-swatches i { display:block;width:1.6rem;height:1.6rem;border:2px solid #172a45;background:var(--c); }
  .store-swatches i.hair { border-radius:50% 50% 35% 35%; }
  .store-swatches i.top { border-radius:.35rem .35rem .6rem .6rem; }
  .store-owned { display:inline-flex;align-items:center;gap:.25rem;color:#34824d;font-size:.64rem;font-weight:900; }
  @media (prefers-reduced-motion:reduce) { .store-spark,.store-pro-badge,.store-card { animation:none; } .store-card { transition:none; } }
</style>
