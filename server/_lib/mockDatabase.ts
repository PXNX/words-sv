// An in-memory stand-in for the PostgreSQL tables the Telegram endpoints touch. Used by the tests
// and, when TELEGRAM_MOCK is set, by the server itself, so the login/link flow can run without a
// database or a bot.

export type MockDevice = {
	embers?: number;
	freezes?: number;
	invite_freezes?: number;
	qualified_days?: number;
	locale?: string;
	timezone?: string;
	day_key?: string;
	last_qualified_day?: string;
	current_qualified?: number;
	streak_count?: number;
};
export type MockLink = {
	device_id: string;
	invite_code?: string;
	link_code?: string | null;
	chat_id?: number | null;
	telegram_user_id?: number | null;
	reminders?: number;
	last_reminded_day?: string | null;
};
export type MockInvite = { telegram_user_id: number; inviter_device_id: string };
export type MockSnapshot = { telegram_user_id: number; revision: number; snapshot: string };
export type MockSentMessage = [chatId: number, text: string, buttonUrl: string];

export type MockDatabase = {
	devices: Record<string, MockDevice>;
	links: MockLink[];
	invites: MockInvite[];
	snapshots: Record<number, MockSnapshot>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	execute: (sql: string, params?: any[]) => Promise<unknown[]>;
};

/** A tiny in-memory stand-in for the few statements the Telegram endpoints run. */
export function mockDatabase({ devices = {}, links = [], invites = [], snapshots = {} }: {
	devices?: Record<string, MockDevice>;
	links?: MockLink[];
	invites?: MockInvite[];
	snapshots?: Record<number, MockSnapshot>;
} = {}): MockDatabase {
	const db: MockDatabase = {
		devices,
		links,
		invites,
		snapshots,
		async execute(sql: string, params: any[] = []) {
			if (/^(CREATE|ALTER)/.test(sql)) return [{}];
			if (sql.startsWith('INSERT INTO wordcircle_streak_devices')) {
				const device = devices[params[0] as string];
				if (device) Object.assign(device, { timezone: params[1], locale: params[2] });
				else devices[params[0] as string] = { timezone: params[1] as string, locale: params[2] as string, day_key: params[3] as string };
				return [{}];
			}
			if (sql.startsWith('INSERT INTO wordcircle_telegram_links')) {
				if (!links.some((entry) => entry.device_id === params[0])) links.push({ device_id: params[0] as string, invite_code: params[1] as string });
				return [{}];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET chat_id = CASE WHEN')) {
				// miniapp: chat_id is set for the user, kept when already theirs, cleared otherwise
				const link = links.find((entry) => entry.device_id === params[4]);
				if (link) {
					link.telegram_user_id = params[3];
					link.chat_id = params[0] === 1 || link.telegram_user_id === params[2] ? params[1] : null;
				}
				return [{ affectedRows: link ? 1 : 0 }];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET chat_id') && sql.includes('WHERE device_id')) {
				// mock mode signin/connect: the chat is linked straight away, no one-time code
				const link = links.find((entry) => entry.device_id === params[2]);
				if (link) Object.assign(link, { chat_id: params[0], telegram_user_id: params[1], link_code: null }, sql.includes('reminders = 1') ? { reminders: 1 } : {});
				return [{ affectedRows: link ? 1 : 0 }];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET chat_id')) {
				const link = links.find((entry) => entry.link_code === params[2]);
				if (link) Object.assign(link, { chat_id: params[0], telegram_user_id: params[1], link_code: null }, sql.includes('reminders = 1') ? { reminders: 1 } : {});
				return [{ affectedRows: link ? 1 : 0 }];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET link_code')) {
				const link = links.find((entry) => entry.device_id === params[1]);
				if (link) link.link_code = params[0] as string | null;
				return [{ affectedRows: link ? 1 : 0 }];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET reminders = 1')) {
				const link = links.find((entry) => entry.device_id === params[0] && entry.chat_id != null);
				if (link) { link.reminders = 1; link.link_code = null; }
				return [{ affectedRows: link ? 1 : 0 }];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET reminders = 0')) {
				const link = links.find((entry) => entry.device_id === params[0]);
				if (link) link.reminders = 0;
				return [{}];
			}
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET telegram_user_id = NULL')) {
				const link = links.find((entry) => entry.device_id === params[0]);
				if (link) Object.assign(link, { telegram_user_id: null, chat_id: null, reminders: 0, link_code: null });
				return [{ affectedRows: link ? 1 : 0 }];
			}
			if (sql.includes('FROM wordcircle_telegram_links WHERE invite_code')) return [links.filter((entry) => entry.invite_code === params[0])];
			if (sql.includes('FROM wordcircle_telegram_links WHERE telegram_user_id')) return [links.filter((entry) => entry.telegram_user_id === params[0])];
			if (sql.startsWith('SELECT telegram_user_id FROM wordcircle_telegram_links WHERE device_id')) return [links.filter((entry) => entry.device_id === params[0])];
			if (sql.startsWith('SELECT invite_code, chat_id, telegram_user_id, reminders FROM wordcircle_telegram_links WHERE device_id')) return [links.filter((entry) => entry.device_id === params[0])];
			if (sql.startsWith('INSERT INTO wordcircle_telegram_invites')) {
				if (invites.some((entry) => entry.telegram_user_id === params[0])) throw Object.assign(new Error('dup'), { code: '23505' });
				invites.push({ telegram_user_id: params[0] as number, inviter_device_id: params[1] as string });
				return [{}];
			}
			if (sql.startsWith('SELECT embers, freezes')) return [devices[params[0] as string] ? [devices[params[0] as string]] : []];
			if (sql.startsWith('SELECT * FROM wordcircle_streak_devices WHERE device_id')) return [devices[params[0] as string] ? [devices[params[0] as string]] : []];
			if (sql.startsWith('UPDATE wordcircle_streak_devices SET embers')) {
				const device = devices[params[3] as string];
				if (!device) throw new Error('unknown device');
				Object.assign(device, { embers: params[0], freezes: params[1], invite_freezes: Math.min(2, (device.invite_freezes ?? 0) + params[2]) });
				return [{ affectedRows: 1 }];
			}
			if (sql.startsWith('SELECT d.*, t.chat_id')) return [links.filter((entry) => entry.reminders && entry.chat_id).map((entry) => ({ ...devices[entry.device_id], device_id: entry.device_id, chat_id: entry.chat_id }))];
			if (sql.startsWith('UPDATE wordcircle_telegram_links SET last_reminded_day')) {
				const link = links.find((entry) => entry.device_id === params[1]);
				const claimed = Boolean(link && link.last_reminded_day !== params[0]);
				if (claimed && link) link.last_reminded_day = params[0] as string;
				return [{ affectedRows: claimed ? 1 : 0 }];
			}
			if (sql.startsWith('SELECT COUNT(*) AS count FROM wordcircle_telegram_invites')) return [[{ count: invites.filter((entry) => entry.inviter_device_id === params[0]).length }]];
			if (sql.startsWith('SELECT revision, snapshot FROM wordcircle_progress_snapshots WHERE telegram_user_id')) {
				const snap = snapshots[params[0] as number];
				return [snap ? [snap] : []];
			}
			if (sql.startsWith('UPDATE wordcircle_progress_snapshots SET revision')) {
				const snap = snapshots[params[3] as number];
				if (!snap) throw new Error('unknown snapshot');
				snap.revision += 1;
				snap.snapshot = params[0] as string;
				return [{ affectedRows: 1 }];
			}
			if (sql.startsWith('INSERT INTO wordcircle_progress_snapshots')) {
				const userId = params[0] as number;
				if (snapshots[userId]) throw Object.assign(new Error('dup'), { code: '23505' });
				snapshots[userId] = { telegram_user_id: userId, revision: 1, snapshot: params[1] as string };
				return [{ affectedRows: 1 }];
			}
			if (sql.includes('wordcircle_push_subscriptions')) return [[]];
			throw new Error(`unexpected statement: ${sql}`);
		}
	};
	return db;
}

let sharedMockDB: MockDatabase | undefined;
/** One shared fake database for the whole mock-mode server, so state survives across requests. */
export function getMockDatabase(): MockDatabase {
	sharedMockDB ??= mockDatabase({
		devices: {
			'dev-device-0000000000000000': { embers: 5, freezes: 1, qualified_days: 3, locale: 'en', timezone: 'UTC', day_key: '2026-10-17', streak_count: 1 }
		},
		links: [
			{ device_id: 'dev-device-0000000000000000', invite_code: 'inviteDefault123', link_code: null, chat_id: 11111, telegram_user_id: 4242, reminders: 0, last_reminded_day: null }
		],
		invites: [],
		snapshots: {}
	});
	return sharedMockDB;
}