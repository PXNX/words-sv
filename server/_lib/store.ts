import type { Database } from './database.js';

// The store's prices and what each product is, for the invoice and the payment check. The app's copy
// (src/lib/store/catalog.ts) only displays them; tests/store.test.ts keeps both in step.

export type StoreProduct = { id: string; stars: number; kind: 'item' | 'set' | 'pro' };

export const PRO_PERIOD_SECONDS = 30 * 24 * 60 * 60;

export const STORE_PRODUCTS: readonly StoreProduct[] = [
	{ id: 'pro', stars: 75, kind: 'pro' },
	{ id: 'set_neon', stars: 40, kind: 'set' },
	{ id: 'set_dusk', stars: 40, kind: 'set' },
	{ id: 'set_rose', stars: 40, kind: 'set' },
	...['shop_neon_hair', 'shop_mint_top', 'shop_sunset_hair', 'shop_midnight_top', 'shop_rose_top', 'shop_turquoise_hair'].map((id): StoreProduct => ({ id, stars: 25, kind: 'item' }))
];

export function storeProduct(id: unknown): StoreProduct | undefined {
	return typeof id === 'string' ? STORE_PRODUCTS.find((entry) => entry.id === id) : undefined;
}

/** `shop:<product>:<telegram user id>`; Telegram limits payloads to 128 bytes. */
export function storePayload(productId: string, userId: number): string {
	return `shop:${productId}:${userId}`;
}

export function parseStorePayload(payload: unknown): { product: StoreProduct; userId: number } | null {
	const match = typeof payload === 'string' ? /^shop:([a-z_]+):(\d{1,20})$/u.exec(payload) : null;
	const found = match ? storeProduct(match[1]) : undefined;
	const userId = match ? Number(match[2]) : 0;
	return found && Number.isSafeInteger(userId) && userId > 0 ? { product: found, userId } : null;
}

/** Why a checkout must be refused, or null when it is fine. */
export function checkoutProblem(payload: unknown, currency: unknown, amount: unknown, fromUserId: unknown): string | null {
	const parsed = parseStorePayload(payload);
	if (!parsed) return 'unknown_product';
	if (currency !== 'XTR') return 'wrong_currency';
	if (amount !== parsed.product.stars) return 'wrong_amount';
	if (fromUserId !== parsed.userId) return 'wrong_user';
	return null;
}

export const STORE_TABLES = [
	`CREATE TABLE IF NOT EXISTS wordcircle_purchases (
		charge_id VARCHAR(255) NOT NULL PRIMARY KEY,
		telegram_user_id BIGINT NOT NULL,
		product VARCHAR(32) NOT NULL,
		stars INTEGER NOT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	'CREATE INDEX IF NOT EXISTS wordcircle_purchases_user_idx ON wordcircle_purchases (telegram_user_id)',
	`CREATE TABLE IF NOT EXISTS wordcircle_pro (
		telegram_user_id BIGINT NOT NULL PRIMARY KEY,
		pro_until TIMESTAMPTZ NOT NULL
	)`
];

let tablesReady: Promise<unknown> | undefined;
export function ensureStoreTables(db: Database) {
	tablesReady ??= (async () => {
		for (const sql of STORE_TABLES) await db.execute(sql);
	})().catch((error: unknown) => {
		tablesReady = undefined;
		throw error;
	});
	return tablesReady;
}
