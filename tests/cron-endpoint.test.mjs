import { describe, expect, it } from 'vitest';
import { createRemindersEndpoint } from '../api/cron/reminders.mjs';

function responseCapture() {
	const result = { statusCode: 200, body: null };
	return {
		result,
		status(code) { result.statusCode = code; return this; },
		json(body) { result.body = body; return this; }
	};
}

describe('cron reminder endpoint', () => {
	it('accepts a request authenticated with the configured cron secret', async () => {
		const secret = process.env.CRON_SECRET;
		expect(secret).toMatch(/.{32,}/);
		expect(process.env.VAPID_PUBLIC_KEY).toMatch(/^B[A-Za-z0-9_-]{40,}$/);
		const res = responseCapture();
		await createRemindersEndpoint({ databaseProvider: () => ({ execute: async () => [[]] }) })({ method: 'POST', headers: { authorization: `Bearer ${secret}` } }, res);
		expect(res.result).toMatchObject({ statusCode: 200, body: { ok: true, attempted: 0, delivered: 0 } });
	});

	it('rejects an unauthenticated request', async () => {
		const res = responseCapture();
		await createRemindersEndpoint({ databaseProvider: () => ({ execute: async () => [[]] }) })({ method: 'GET', headers: {} }, res);
		expect(res.result).toMatchObject({ statusCode: 401, body: { error: 'unauthorized' } });
	});
});
