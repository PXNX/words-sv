import { describe, expect, it } from 'vitest';
import { ownedItems, PRODUCTS, product, SHOP_ITEMS, stillUseful } from '../src/lib/store/catalog';
import { checkoutProblem, parseStorePayload, STORE_PRODUCTS, storePayload } from '../server/_lib/store.js';
import { createPurchaseEndpoint } from '../server/telegram/purchase.js';
import { createStoreEndpoint } from '../server/store/index.js';
import { responseCapture } from './support/api';

const secret = 'bridge-secret-for-tests-0123456789';

function fakeDatabase(linkedUser: number | null = 42) {
  const purchases: Array<{ charge_id: string; telegram_user_id: number; product: string }> = [];
  const pro = new Map<number, Date>();
  return {
    purchases, pro,
    async execute(sql: string, params: any[] = []): Promise<any> {
      if (/^(CREATE|ALTER)/u.test(sql)) return [{}];
      if (sql.startsWith('SELECT telegram_user_id FROM wordcircle_telegram_links')) return [linkedUser ? [{ telegram_user_id: linkedUser }] : []];
      if (sql.startsWith('INSERT INTO wordcircle_purchases')) {
        if (!purchases.some((row) => row.charge_id === params[0])) purchases.push({ charge_id: params[0], telegram_user_id: params[1], product: params[2] });
        return [{}];
      }
      if (sql.startsWith('INSERT INTO wordcircle_pro')) {
        const before = pro.get(params[0]);
        pro.set(params[0], before && before > params[1] ? before : params[1]);
        return [{}];
      }
      if (sql.startsWith('SELECT DISTINCT product')) return [[...new Set(purchases.filter((row) => row.telegram_user_id === params[0]).map((row) => row.product))].map((product) => ({ product }))];
      if (sql.startsWith('SELECT pro_until')) return [pro.has(params[0]) ? [{ pro_until: pro.get(params[0]) }] : []];
      throw new Error(`unexpected statement: ${sql}`);
    }
  };
}

describe('store catalog', () => {
  it('has the same products and prices in the app and on the server', () => {
    expect(PRODUCTS.map(({ id, stars, kind }) => ({ id, stars, kind })).sort((a, b) => a.id.localeCompare(b.id))).toEqual([...STORE_PRODUCTS].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it('unlocks items through sets and singles, and offers a set only while it adds something', () => {
    expect(ownedItems(['set_neon', 'shop_rose_top'])).toEqual(['shop_neon_hair', 'shop_mint_top', 'shop_rose_top']);
    expect(stillUseful(product('set_neon')!, ['shop_neon_hair', 'shop_mint_top'])).toBe(false);
    expect(stillUseful(product('set_dusk')!, ['shop_sunset_hair'])).toBe(true);
    expect(new Set(SHOP_ITEMS.map((item) => `${item.part}:${item.choice}`)).size).toBe(SHOP_ITEMS.length);
  });

  it('checks a checkout against product, price, currency and buyer', () => {
    const payload = storePayload('set_neon', 42);
    expect(parseStorePayload(payload)?.product.id).toBe('set_neon');
    expect(checkoutProblem(payload, 'XTR', 40, 42)).toBeNull();
    expect(checkoutProblem(payload, 'XTR', 1, 42)).toBe('wrong_amount');
    expect(checkoutProblem(payload, 'EUR', 40, 42)).toBe('wrong_currency');
    expect(checkoutProblem(payload, 'XTR', 40, 7)).toBe('wrong_user');
    expect(checkoutProblem('donation:50:42', 'XTR', 50, 42)).toBe('unknown_product');
  });
});

describe('store endpoints', () => {
  it('records a payment once and reports what the account owns', async () => {
    process.env.TELEGRAM_BRIDGE_SECRET = secret;
    const db = fakeDatabase();
    const paid = async (body: Record<string, unknown>) => {
      const res = responseCapture();
      await createPurchaseEndpoint({ databaseProvider: () => db, now: () => Date.UTC(2026, 10, 10) })({ method: 'POST', headers: { authorization: `Bearer ${secret}` }, body: { action: 'paid', currency: 'XTR', userId: 42, ...body } }, res);
      return res.result;
    };
    expect((await paid({ payload: storePayload('set_neon', 42), amount: 40, chargeId: 'c1' })).body.product).toBe('set_neon');
    await paid({ payload: storePayload('set_neon', 42), amount: 40, chargeId: 'c1' });
    expect(db.purchases).toHaveLength(1);
    expect((await paid({ payload: storePayload('pro', 42), amount: 75, chargeId: 'c2', subscriptionExpiration: 4_102_444_800 })).body.problem).toBeNull();
    expect((await paid({ payload: storePayload('pro', 42), amount: 1, chargeId: 'c3' })).body.problem).toBe('wrong_amount');

    const res = responseCapture();
    await createStoreEndpoint({ databaseProvider: () => db })({ method: 'POST', body: { deviceId: 'device_0123456789abcdef', action: 'status' } }, res);
    expect(res.result.body).toMatchObject({ linked: true, bought: ['set_neon'], proUntil: 4_102_444_800_000 });
  });

  it('makes a subscription invoice for Pro and needs a signed-in device', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const telegram = async <T,>(method: string, params: Record<string, unknown>): Promise<T> => { calls.push([method, params]); return 'https://t.me/$invoice' as T; };
    const res = responseCapture();
    await createStoreEndpoint({ databaseProvider: () => fakeDatabase(), telegram })({ method: 'POST', body: { deviceId: 'device_0123456789abcdef', action: 'invoice', product: 'pro', locale: 'de' } }, res);
    expect(res.result.body.url).toBe('https://t.me/$invoice');
    expect(calls[0]![1]).toMatchObject({ currency: 'XTR', payload: 'shop:pro:42', prices: [{ amount: 75 }], subscription_period: 2_592_000 });
    const anonymous = responseCapture();
    await createStoreEndpoint({ databaseProvider: () => fakeDatabase(null), telegram })({ method: 'POST', body: { deviceId: 'device_0123456789abcdef', action: 'invoice', product: 'pro' } }, anonymous);
    expect(anonymous.result.body).toMatchObject({ linked: false });
  });
});
