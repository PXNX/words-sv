// What the store sells for Telegram Stars: single character items, sets of them at a lower price,
// and WordCircle Pro (a monthly subscription that forgives one missed day a week). The server keeps
// the same prices in api/_lib/store.ts (a test keeps the two in step) and decides what was bought;
// this file only tells the page what to show and which cosmetic rewards a product unlocks.
import type { AvatarPart } from '#lib/profile/avatar.js';

export type ShopItemId = 'shop_neon_hair' | 'shop_mint_top' | 'shop_sunset_hair' | 'shop_midnight_top' | 'shop_rose_top' | 'shop_turquoise_hair';
export type ProductId = ShopItemId | 'set_neon' | 'set_dusk' | 'set_rose' | 'pro';

export type ShopItem = { id: ShopItemId; part: AvatarPart; choice: string };
export type Product = { id: ProductId; stars: number; kind: 'item' | 'set' | 'pro'; unlocks: ShopItemId[] };

export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'shop_neon_hair', part: 'hair', choice: '#39ff14' },
  { id: 'shop_mint_top', part: 'top', choice: '#98ff98' },
  { id: 'shop_sunset_hair', part: 'hair', choice: '#ff5e62' },
  { id: 'shop_midnight_top', part: 'top', choice: '#191970' },
  { id: 'shop_rose_top', part: 'top', choice: '#b76e79' },
  { id: 'shop_turquoise_hair', part: 'hair', choice: '#00ced1' }
];

export const ITEM_STARS = 25;
export const SET_STARS = 40;
export const PRO_STARS = 75;
/** Telegram's only subscription period: 30 days. */
export const PRO_PERIOD_DAYS = 30;

export const PRODUCTS: readonly Product[] = [
  { id: 'pro', stars: PRO_STARS, kind: 'pro', unlocks: [] },
  { id: 'set_neon', stars: SET_STARS, kind: 'set', unlocks: ['shop_neon_hair', 'shop_mint_top'] },
  { id: 'set_dusk', stars: SET_STARS, kind: 'set', unlocks: ['shop_sunset_hair', 'shop_midnight_top'] },
  { id: 'set_rose', stars: SET_STARS, kind: 'set', unlocks: ['shop_rose_top', 'shop_turquoise_hair'] },
  ...SHOP_ITEMS.map((item): Product => ({ id: item.id, stars: ITEM_STARS, kind: 'item', unlocks: [item.id] }))
];

export function product(id: string): Product | undefined {
  return PRODUCTS.find((entry) => entry.id === id);
}

/** Every item the bought products unlock. */
export function ownedItems(bought: readonly string[]): ShopItemId[] {
  return [...new Set(bought.flatMap((id) => product(id)?.unlocks ?? []))];
}

/** A set is only worth offering while it still adds something. */
export function stillUseful(entry: Product, owned: readonly ShopItemId[]): boolean {
  return entry.kind === 'pro' || entry.unlocks.some((item) => !owned.includes(item));
}
