import { describe, expect, it } from 'vitest';
import { createRemindersEndpoint, cronAuthorized } from '../server/cron/reminders.js';
import { responseCapture } from './support/api';

process.env.CRON_SECRET ??= 'cron-secret-for-tests-0123456789abcdef';
process.env.VAPID_PUBLIC_KEY ??= `B${'a'.repeat(64)}`;
process.env.VAPID_PRIVATE_KEY ??= 'test_private_key';

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

	it('checks the bearer token without exposing it', () => {
		expect(cronAuthorized(`Bearer ${process.env.CRON_SECRET}`)).toBe(true);
		expect(cronAuthorized('Bearer not-the-secret')).toBe(false);
		expect(cronAuthorized(undefined)).toBe(false);
	});
});