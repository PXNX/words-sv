import { afterEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { addEmbers, bridgeAuthorized, parseStartPayload, verifyInitData, sendTelegram, telegramDatabaseProvider } from '../server/_lib/telegram.js';
import { getMockDatabase, mockDatabase, type MockDatabase, type MockSentMessage } from '../server/_lib/mockDatabase.js';
import { createStartEndpoint } from '../server/telegram/start.js';
import { createDeviceEndpoint } from '../server/telegram/device.js';
import { createRemindersEndpoint } from '../server/cron/reminders.js';
import { responseCapture } from './support/api';

const secret = 'bridge-secret-for-tests-0123456789';
async function start(db: MockDatabase, body: Record<string, unknown>, sent: MockSentMessage[] = []) {
	process.env.TELEGRAM_BRIDGE_SECRET = secret;
	const res = responseCapture();
	await createStartEndpoint({ databaseProvider: () => db, telegramSender: async (...args) => { sent.push(args); } })({ method: 'POST', headers: { authorization: `Bearer ${secret}` }, body }, res);
	return res.result;
}

describe('telegram helpers', () => {
	it('reads reminder and invite start payloads only', () => {
		expect(parseStartPayload('r_abcdefgh1234')).toEqual({ kind: 'reminders', code: 'abcdefgh1234' });
		expect(parseStartPayload('i_abcdefgh1234')).toEqual({ kind: 'invite', code: 'abcdefgh1234' });
		expect(parseStartPayload('l_abcdefgh1234')).toEqual({ kind: 'login', code: 'abcdefgh1234' });
		expect(parseStartPayload('donate')).toBeNull();
		expect(parseStartPayload('i_short')).toBeNull();
	});

	it('forges a freeze from a full set of embers and carries the rest', () => {
		expect(addEmbers(1, 0, 2)).toEqual({ embers: 3, freezes: 0 });
		expect(addEmbers(6, 0, 2)).toEqual({ embers: 1, freezes: 1 });
		expect(addEmbers(6, 2, 2)).toEqual({ embers: 7, freezes: 2 });
	});

	it('checks the bridge secret', () => {
		expect(bridgeAuthorized(`Bearer ${secret}`, secret)).toBe(true);
		expect(bridgeAuthorized('Bearer nope', secret)).toBe(false);
		expect(bridgeAuthorized(`Bearer ${secret}`, '')).toBe(false);
	});
});

describe('telegram start bridge', () => {
	it('rejects calls without the bridge secret', async () => {
		const res = responseCapture();
		await createStartEndpoint({ databaseProvider: () => mockDatabase() })({ method: 'POST', headers: {}, body: {} }, res);
		expect(res.result.statusCode).toBe(401);
	});

	it('turns on reminders with a one-time code', async () => {
		const db = mockDatabase({ links: [{ device_id: 'device-a', invite_code: 'inviteA', link_code: 'linkcode1234' }] });
		expect((await start(db, { payload: 'r_linkcode1234', userId: 11, chatId: 11 })).body.result).toBe('reminders_on');
		expect(db.links[0]).toMatchObject({ chat_id: 11, telegram_user_id: 11, reminders: 1, link_code: null });
		expect((await start(db, { payload: 'r_linkcode1234', userId: 11, chatId: 11 })).body.result).toBe('expired');
	});

	it('signs a device in with a one-time code, without turning reminders on', async () => {
		const db = mockDatabase({ links: [{ device_id: 'device-a', invite_code: 'inviteA', link_code: 'logincode123', reminders: 0 }] });
		expect((await start(db, { payload: 'l_logincode123', userId: 11, chatId: 11 })).body.result).toBe('signed_in');
		expect(db.links[0]).toMatchObject({ chat_id: 11, telegram_user_id: 11, reminders: 0, link_code: null });
		expect((await start(db, { payload: 'l_logincode123', userId: 11, chatId: 11 })).body.result).toBe('expired');
	});

	it('says so in Telegram when the tenth friend joins', async () => {
		const db = mockDatabase({
			devices: { 'device-a': { embers: 0, freezes: 2, qualified_days: 0, locale: 'en' } },
			links: [{ device_id: 'device-a', invite_code: 'inviteCodeB1', chat_id: 11, telegram_user_id: 11 }]
		});
		const sent: MockSentMessage[] = [];
		for (let userId = 100; userId < 111; userId += 1) await start(db, { payload: 'i_inviteCodeB1', userId, chatId: userId }, sent);
		// Eleven thanks plus one milestone message, sent right after the tenth.
		expect(sent).toHaveLength(12);
		expect(sent[10]![1]).toContain('10 friends');
	});

	it('pays embers for every new player, once per player, without a limit', async () => {
		const db = mockDatabase({
			devices: { 'device-a': { embers: 5, freezes: 0, qualified_days: 5, locale: 'de' } },
			links: [{ device_id: 'device-a', invite_code: 'inviteCodeA1', chat_id: 11, telegram_user_id: 11 }]
		});
		const sent: MockSentMessage[] = [];
		for (const userId of [21, 22, 23, 24, 25]) expect((await start(db, { payload: 'i_inviteCodeA1', userId, chatId: userId }, sent)).body.result).toBe('invited');
		// 5 + 5 × 2 = 15 embers: two freezes forged, the last ember stays.
		expect(db.devices['device-a']).toMatchObject({ embers: 1, freezes: 2, invite_freezes: 2 });
		expect(sent).toHaveLength(5);
		expect(sent[0]![0]).toBe(11);
		expect((await start(db, { payload: 'i_inviteCodeA1', userId: 21, chatId: 21 })).body.result).toBe('known');
		expect((await start(db, { payload: 'i_inviteCodeA1', userId: 11, chatId: 11 })).body.result).toBe('own_invite');
		expect((await start(db, { payload: 'i_unknownCode1', userId: 30, chatId: 30 })).body.result).toBe('unknown');
	});
});

describe('telegram streak reminders', () => {
	it('messages a linked player once, two hours before their streak expires', async () => {
		process.env.CRON_SECRET ??= 'cron-secret-for-tests-0123456789abcdef';
		const db = mockDatabase({
			devices: { 'device-a': { timezone: 'UTC', locale: 'en', day_key: '2026-10-27', last_qualified_day: '2026-10-26', current_qualified: 0, streak_count: 4 } },
			links: [{ device_id: 'device-a', invite_code: 'inviteCodeA1', chat_id: 11, reminders: 1 }]
		});
		const sent: MockSentMessage[] = [];
		const run = async (iso: string) => {
			const res = responseCapture();
			await createRemindersEndpoint({ databaseProvider: () => db, telegramSender: async (...args) => { sent.push(args); }, now: () => new Date(iso) })({ method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, res);
			return res.result.body;
		};
		expect((await run('2026-10-27T20:30:00Z')).telegram).toEqual({ attempted: 0, delivered: 0 });
		expect((await run('2026-10-27T22:30:00Z')).telegram).toEqual({ attempted: 1, delivered: 1 });
		expect(sent[0]![0]).toBe(11);
		expect(sent[0]![1]).toContain('91 minutes remain');
		expect((await run('2026-10-27T23:30:00Z')).telegram).toEqual({ attempted: 0, delivered: 0 });
	});
});

describe('telegram mini app', () => {
	const token = '123456:test-bot-token';
	function signed(fields: Record<string, string>, botToken = token) {
		const params = new URLSearchParams(fields);
		const checkString = [...params.entries()].map(([key, value]) => `${key}=${value}`).sort().join('\n');
		const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
		params.set('hash', createHmac('sha256', secret).update(checkString).digest('hex'));
		return params.toString();
	}
	const now = Date.UTC(2026, 9, 27, 12);
	const authDate = String(now / 1000 - 60);
	const user = JSON.stringify({ id: 42, first_name: 'Anna', language_code: 'de', allows_write_to_pm: true });

	it('accepts launch data signed with the bot token', () => {
		expect(verifyInitData(signed({ auth_date: authDate, user, query_id: 'AAA' }), token, now)).toMatchObject({ id: 42, first_name: 'Anna' });
	});

	it('rejects forged, tampered and stale launch data', () => {
		expect(verifyInitData(signed({ auth_date: authDate, user }, '999:other-bot'), token, now)).toBeNull();
		expect(verifyInitData(signed({ auth_date: authDate, user }).replace('Anna', 'Eve'), token, now)).toBeNull();
		expect(verifyInitData(signed({ auth_date: String(now / 1000 - 3 * 24 * 60 * 60), user }), token, now)).toBeNull();
		expect(verifyInitData('user=%7B%22id%22%3A42%7D', token, now)).toBeNull();
		expect(verifyInitData(signed({ auth_date: authDate, user }), '', now)).toBeNull();
	});
});

describe('telegram mock mode', () => {
	const mockDevice = 'dev-device-0000000000000000';
	afterEach(() => { delete process.env.TELEGRAM_MOCK; });

	it('trusts the user field without a signature when TELEGRAM_MOCK is set', () => {
		process.env.TELEGRAM_MOCK = '1';
		expect(verifyInitData('user=%7B%22id%22%3A42%2C%22first_name%22%3A%22Anna%22%7D')).toMatchObject({ id: 42, first_name: 'Anna' });
		expect(verifyInitData('user=%7B%22id%22%3A42%7D', '', 0)).toMatchObject({ id: 42 });
		expect(verifyInitData('auth_date=1')).toBeNull();
	});

	it('refuses unsigned launch data without TELEGRAM_MOCK', () => {
		expect(verifyInitData('user=%7B%22id%22%3A42%7D')).toBeNull();
	});

	it('serves the fake database from the telegram provider', () => {
		process.env.TELEGRAM_MOCK = '1';
		expect(telegramDatabaseProvider()).toBe(getMockDatabase());
		expect(mockDatabase().links).toEqual([]);
	});

	it('links the device straight away for signin and connect', async () => {
		process.env.TELEGRAM_MOCK = '1';
		const call = async (action: string) => {
			const res = responseCapture();
			await createDeviceEndpoint()({ method: 'POST', headers: {}, body: { deviceId: mockDevice, timeZone: 'UTC', locale: 'en', action } }, res);
			return res.result.body;
		};
		expect((await call('signin')).linked).toBe(true);
		expect((await call('connect')).reminders).toBe(true);
	});

	it('sends nothing through the bot in mock mode', async () => {
		process.env.TELEGRAM_MOCK = '1';
		const token = process.env.TELEGRAM_BOT_TOKEN;
		delete process.env.TELEGRAM_BOT_TOKEN;
		try {
			await expect(sendTelegram(11, 'mock')).resolves.toBeUndefined();
		} finally {
			if (token) process.env.TELEGRAM_BOT_TOKEN = token;
		}
	});
});
