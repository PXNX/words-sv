import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { addEmbers, bridgeAuthorized, parseStartPayload, verifyInitData } from '../api/_lib/telegram.mjs';
import { createStartEndpoint } from '../api/telegram/start.mjs';
import { createRemindersEndpoint } from '../api/cron/reminders.mjs';

function responseCapture() {
	const result = { statusCode: 200, body: null };
	return {
		result,
		status(code) { result.statusCode = code; return this; },
		json(body) { result.body = body; return this; }
	};
}

// A tiny in-memory stand-in for the few statements the Telegram endpoints run.
function fakeDatabase({ devices = {}, links = [], invites = [] } = {}) {
	const db = {
		devices, links, invites,
		async execute(sql, params = []) {
			if (/^(CREATE|ALTER)/.test(sql)) return [{}];
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET chat_id')) {
				const link = links.find((entry) => entry.link_code === params[2]);
				if (link) Object.assign(link, { chat_id: params[0], telegram_user_id: params[1], reminders: 1, link_code: null });
				return [{ affectedRows: link ? 1 : 0 }];
			}
			if (sql.includes('FROM wordcircle_telegram_links WHERE invite_code')) return [links.filter((entry) => entry.invite_code === params[0])];
			if (sql.includes('FROM wordcircle_telegram_links WHERE telegram_user_id')) return [links.filter((entry) => entry.telegram_user_id === params[0])];
			if (sql.startsWith('INSERT INTO wordcircle_telegram_invites')) {
				if (invites.some((entry) => entry.telegram_user_id === params[0])) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
				invites.push({ telegram_user_id: params[0], inviter_device_id: params[1] });
				return [{}];
			}
			if (sql.startsWith('SELECT embers, freezes')) return [devices[params[0]] ? [devices[params[0]]] : []];
			if (sql.startsWith('UPDATE wordcircle_streak_devices SET embers')) {
				const device = devices[params[3]];
				Object.assign(device, { embers: params[0], freezes: params[1], invite_freezes: Math.min(2, (device.invite_freezes ?? 0) + params[2]) });
				return [{ affectedRows: 1 }];
			}
			if (sql.startsWith('SELECT d.*, t.chat_id')) return [links.filter((entry) => entry.reminders && entry.chat_id).map((entry) => ({ ...devices[entry.device_id], device_id: entry.device_id, chat_id: entry.chat_id }))];
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET last_reminded_day')) {
				const link = links.find((entry) => entry.device_id === params[1]);
				const claimed = link && link.last_reminded_day !== params[0];
				if (claimed) link.last_reminded_day = params[0];
				return [{ affectedRows: claimed ? 1 : 0 }];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET reminders = 0')) {
				links.find((entry) => entry.device_id === params[0]).reminders = 0;
				return [{}];
			}
			if (sql.includes('wordcircle_push_subscriptions')) return [[]];
			throw new Error(`unexpected statement: ${sql}`);
		}
	};
	return db;
}

const secret = 'bridge-secret-for-tests-0123456789';
async function start(db, body, sent = []) {
	process.env.TELEGRAM_BRIDGE_SECRET = secret;
	const res = responseCapture();
	await createStartEndpoint({ databaseProvider: () => db, telegramSender: async (...args) => { sent.push(args); } })({ method: 'POST', headers: { authorization: `Bearer ${secret}` }, body }, res);
	return res.result;
}

describe('telegram helpers', () => {
	it('reads reminder and invite start payloads only', () => {
		expect(parseStartPayload('r_abcdefgh1234')).toEqual({ kind: 'reminders', code: 'abcdefgh1234' });
		expect(parseStartPayload('i_abcdefgh1234')).toEqual({ kind: 'invite', code: 'abcdefgh1234' });
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
		await createStartEndpoint({ databaseProvider: () => fakeDatabase() })({ method: 'POST', headers: {}, body: {} }, res);
		expect(res.result.statusCode).toBe(401);
	});

	it('turns on reminders with a one-time code', async () => {
		const db = fakeDatabase({ links: [{ device_id: 'device-a', invite_code: 'inviteA', link_code: 'linkcode1234' }] });
		expect((await start(db, { payload: 'r_linkcode1234', userId: 11, chatId: 11 })).body.result).toBe('reminders_on');
		expect(db.links[0]).toMatchObject({ chat_id: 11, telegram_user_id: 11, reminders: 1, link_code: null });
		expect((await start(db, { payload: 'r_linkcode1234', userId: 11, chatId: 11 })).body.result).toBe('expired');
	});

	it('pays embers for every new player, once per player, without a limit', async () => {
		const db = fakeDatabase({
			devices: { 'device-a': { embers: 5, freezes: 0, qualified_days: 5, locale: 'de' } },
			links: [{ device_id: 'device-a', invite_code: 'inviteCodeA1', chat_id: 11, telegram_user_id: 11 }]
		});
		const sent = [];
		for (const userId of [21, 22, 23, 24, 25]) expect((await start(db, { payload: 'i_inviteCodeA1', userId, chatId: userId }, sent)).body.result).toBe('invited');
		// 5 + 5 × 2 = 15 embers: two freezes forged, the last ember stays.
		expect(db.devices['device-a']).toMatchObject({ embers: 1, freezes: 2, invite_freezes: 2 });
		expect(sent).toHaveLength(5);
		expect(sent[0][0]).toBe(11);
		expect((await start(db, { payload: 'i_inviteCodeA1', userId: 21, chatId: 21 })).body.result).toBe('known');
		expect((await start(db, { payload: 'i_inviteCodeA1', userId: 11, chatId: 11 })).body.result).toBe('own_invite');
		expect((await start(db, { payload: 'i_unknownCode1', userId: 30, chatId: 30 })).body.result).toBe('unknown');
	});
});

describe('telegram streak reminders', () => {
	it('messages a linked player once, two hours before their streak expires', async () => {
		process.env.CRON_SECRET ??= 'cron-secret-for-tests-0123456789abcdef';
		const db = fakeDatabase({
			devices: { 'device-a': { timezone: 'UTC', locale: 'en', day_key: '2026-10-27', last_qualified_day: '2026-10-26', current_qualified: 0, streak_count: 4 } },
			links: [{ device_id: 'device-a', invite_code: 'inviteCodeA1', chat_id: 11, reminders: 1 }]
		});
		const sent = [];
		const run = async (iso) => {
			const res = responseCapture();
			await createRemindersEndpoint({ databaseProvider: () => db, telegramSender: async (...args) => { sent.push(args); }, now: () => new Date(iso) })({ method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, res);
			return res.result.body;
		};
		expect((await run('2026-10-27T20:30:00Z')).telegram).toEqual({ attempted: 0, delivered: 0 });
		expect((await run('2026-10-27T22:30:00Z')).telegram).toEqual({ attempted: 1, delivered: 1 });
		expect(sent[0][0]).toBe(11);
		expect(sent[0][1]).toContain('91 minutes remain');
		expect((await run('2026-10-27T23:30:00Z')).telegram).toEqual({ attempted: 0, delivered: 0 });
	});
});

describe('telegram mini app', () => {
	const token = '123456:test-bot-token';
	function signed(fields, botToken = token) {
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
