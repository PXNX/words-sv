import { describe, expect, it, vi } from 'vitest';
import { createDonateEndpoint } from '../server/donate/index.js';
import { donationPayload, validDonation } from '../server/_lib/donate.js';
import { responseCapture } from './support/api';

const deviceId = 'device_0123456789abcdef';

describe('donations', () => {
  it('accepts whole amounts from 500 to 10000 Stars', () => {
    expect(validDonation(500)).toBe(true);
    expect(validDonation(10_000)).toBe(true);
    expect(validDonation(499)).toBe(false);
    expect(validDonation(10_001)).toBe(false);
    expect(validDonation(750.5)).toBe(false);
    expect(validDonation('600')).toBe(false);
  });

  it('builds the bot payload, with user 0 when not signed in', () => {
    expect(donationPayload(600, 42)).toBe('donation:600:42');
    expect(donationPayload(600, null)).toBe('donation:600:0');
  });

  it('makes an invoice link for the signed-in account and refuses small amounts', async () => {
    const telegram = vi.fn(async () => 'https://t.me/$invoice');
    const execute = vi.fn(async (sql: string) => (sql.startsWith('SELECT') ? [[{ telegram_user_id: 42 }]] : [[]]));
    const endpoint = createDonateEndpoint({ databaseProvider: () => ({ execute }), telegram: telegram as never });
    const res = responseCapture();
    await endpoint({ method: 'POST', body: { deviceId, amount: 800, locale: 'de' } }, res);
    expect(res.result).toMatchObject({ statusCode: 200, body: { ok: true, url: 'https://t.me/$invoice' } });
    expect(telegram).toHaveBeenCalledWith('createInvoiceLink', expect.objectContaining({ payload: 'donation:800:42', currency: 'XTR', prices: [{ label: 'Spende', amount: 800 }] }));
    const small = responseCapture();
    await endpoint({ method: 'POST', body: { deviceId, amount: 100 } }, small);
    expect(small.result).toMatchObject({ statusCode: 400, body: { error: 'invalid_amount', min: 500 } });
  });
});
