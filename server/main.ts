/*
 * WordCircle's API server: runs the endpoints in this folder next to their PostgreSQL database, as one
 * long-running Bun process (`bun server/main.ts`). The web app's /api/* requests reach it through the
 * proxy in api/[...path].ts. On start it applies database-schema.sql (idempotent), and every hour it
 * runs the reminder job itself, so no outside scheduler is needed.
 *
 * Environment: DATABASE_URL, PORT (default 3791), TELEGRAM_BOT_TOKEN, TELEGRAM_BRIDGE_SECRET,
 * VAPID_SUBJECT / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (optional, for web push), APP_URL (optional).
 */
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDatabase } from './_lib/database.js';
import type { ApiRequest, ApiResponse } from './_lib/http.js';
import cronReminders from './cron/reminders.js';
import donate from './donate/index.js';
import gamesScore from './games/score.js';
import gamesScribble from './games/scribble.js';
import progressSync from './progress/sync.js';
import push from './push/index.js';
import store from './store/index.js';
import streakProgress from './streak/progress.js';
import streakStatus from './streak/status.js';
import telegramDevice from './telegram/device.js';
import telegramGame from './telegram/game.js';
import telegramPurchase from './telegram/purchase.js';
import telegramStart from './telegram/start.js';

type Handler = (req: ApiRequest, res: ApiResponse) => unknown;

export const ROUTES: Record<string, Handler> = {
	'cron/reminders': cronReminders,
	donate,
	'games/score': gamesScore,
	'games/scribble': gamesScribble,
	'progress/sync': progressSync,
	push,
	store,
	'streak/progress': streakProgress,
	'streak/status': streakStatus,
	'telegram/device': telegramDevice,
	'telegram/game': telegramGame,
	'telegram/purchase': telegramPurchase,
	'telegram/start': telegramStart
};

// Request bodies above this are refused; progress snapshots stay below 2 MB (progress/sync.ts).
const MAX_BODY_BYTES = 4_500_000;
const HOUR_MS = 60 * 60 * 1000;

/** The endpoint for a path: whatever follows the last `/api/`, so a path prefix in front does not matter. */
export function routeFor(pathname: string): Handler | undefined {
	const at = pathname.lastIndexOf('/api/');
	if (at < 0) return undefined;
	return ROUTES[pathname.slice(at + 5).replace(/\/+$/u, '')];
}

/** Runs one endpoint on a fetch Request, through the small Node-style req/res the endpoints expect. */
export async function handle(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const handler = routeFor(url.pathname);
	if (!handler) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
	let body: unknown;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		const raw = await request.text();
		if (raw.length > MAX_BODY_BYTES) return Response.json({ ok: false, error: 'too_large' }, { status: 413 });
		try {
			body = raw ? JSON.parse(raw) : {};
		} catch {
			return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
		}
	}
	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => { headers[key] = value; });
	const query: Record<string, string> = {};
	url.searchParams.forEach((value, key) => { query[key] = value; });

	let status = 200;
	let payload: string | undefined;
	const responseHeaders = new Headers({ 'cache-control': 'no-store' });
	const res: ApiResponse = {
		statusCode: 200,
		status(code) { status = code; this.statusCode = code; return this; },
		json(value) { payload = JSON.stringify(value); responseHeaders.set('content-type', 'application/json; charset=utf-8'); return this; },
		setHeader(name, value) { responseHeaders.set(name, value); return this; },
		end(text) { if (text !== undefined) payload = text; return this; }
	};
	try {
		await handler({ method: request.method, headers, query, body }, res);
	} catch (error) {
		console.error('Endpoint failed', url.pathname, error);
		return Response.json({ ok: false, error: 'server_error' }, { status: 500 });
	}
	return new Response(payload ?? null, { status: res.statusCode || status, headers: responseHeaders });
}

async function applySchema() {
	const sql = await readFile(new URL('../database-schema.sql', import.meta.url), 'utf8');
	// Statements are separated by `;` at a line end; the file has no functions or quoted semicolons.
	for (const statement of sql.split(/;\s*$/mu).map((part) => part.replace(/^\s*--.*$/gmu, '').trim()).filter(Boolean)) {
		await getDatabase().execute(statement);
	}
}

/** The hourly reminder job, run in-process through the same protected endpoint. */
async function runReminders() {
	const response = await handle(new Request('http://localhost/api/cron/reminders', { method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
	if (!response.ok) console.warn('Reminder run failed', response.status, await response.text());
}

// Bun's own globals, typed here so the project needs no Bun type package.
type BunRuntime = { serve: (options: { port: number; hostname: string; fetch: (request: Request) => Promise<Response> }) => unknown };

if ((import.meta as { main?: boolean }).main) {
	// Without a configured secret, the in-process job still authorizes itself; outside calls cannot.
	process.env.CRON_SECRET ||= randomBytes(32).toString('hex');
	await applySchema();
	const port = Number(process.env.PORT) || 3791;
	(globalThis as unknown as { Bun: BunRuntime }).Bun.serve({ port, hostname: process.env.HOST || '0.0.0.0', fetch: handle });
	console.log(`WordCircle API listening on :${port}`);
	// First run a few minutes after the next full hour, then hourly.
	const untilNextHour = HOUR_MS - (Date.now() % HOUR_MS) + 2 * 60 * 1000;
	setTimeout(() => {
		void runReminders();
		setInterval(() => void runReminders(), HOUR_MS);
	}, untilNextHour);
}
