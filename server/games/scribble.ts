import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { ensureGameTables, SessionIdSchema, SESSION_TTL_MS } from '../_lib/games.js';
import { escapeHtml } from '../_lib/telegram.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// Scribble in a Telegram group: the player whose turn it is sends their drawing with the word. It
// is posted to the group as a photo, and the round opens; the bot checks the guesses that reply to
// it (bot/bot/scribble.py). The session from the Play press is the credential, as for scores.
export const ROUND_SECONDS = 120;
const MAX_IMAGE_BYTES = 1_500_000;

const Text = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64));
const Request = v.object({
	session: SessionIdSchema,
	word: Text,
	answers: v.pipe(v.array(Text), v.minLength(1), v.maxLength(12)),
	image: v.pipe(v.string(), v.regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/u))
});

export type PhotoSender = (chatId: number, photo: Blob, caption: string, replyTo: number) => Promise<{ message_id: number }>;

/** Posts a photo through the Bot API (multipart, so the picture needs no public URL). */
export async function sendTelegramPhoto(chatId: number, photo: Blob, caption: string, replyTo: number): Promise<{ message_id: number }> {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	if (!token) throw new Error('telegram_not_configured');
	const form = new FormData();
	form.set('chat_id', String(chatId));
	form.set('caption', caption);
	form.set('parse_mode', 'HTML');
	form.set('reply_parameters', JSON.stringify({ message_id: replyTo, allow_sending_without_reply: true }));
	form.set('photo', photo, 'scribble.jpg');
	const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
	const body = (await response.json().catch(() => null)) as { ok?: boolean; result?: { message_id: number }; description?: string } | null;
	if (!body?.ok || !body.result) throw new Error(body?.description ?? 'telegram_sendPhoto_failed');
	return body.result;
}

export function scribbleCaption(drawer: string, letters: number): string {
	return `🎨 <b>${escapeHtml(drawer || '?')}</b> hat gezeichnet · drew something (${letters})\n↩️ Antwortet auf das Bild mit eurem Tipp · Reply to the picture with your guess`;
}

export function createScribbleEndpoint({ databaseProvider = getDatabase, sendPhoto = sendTelegramPhoto as PhotoSender, now = () => Date.now() }: { databaseProvider?: () => Database; sendPhoto?: PhotoSender; now?: () => number } = {}) {
	return async function scribble(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const { session, word, answers, image } = parsed.output;
			const bytes = Buffer.from(image.slice(image.indexOf(',') + 1), 'base64');
			if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return respond(res, 413, { ok: false, error: 'image_too_large' });
			const db = databaseProvider();
			await ensureGameTables(db);
			const [[row]] = await db.execute('SELECT telegram_user_id, first_name, game, chat_id, message_id, created_at FROM wordcircle_game_sessions WHERE id = ? LIMIT 1', [session]);
			if (!row || row.game !== 'scribble') return respond(res, 404, { ok: false, error: 'unknown_session' });
			if (now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) return respond(res, 410, { ok: false, error: 'session_expired' });
			// Games shared inline have no chat to post into.
			if (!row.chat_id || !row.message_id) return respond(res, 409, { ok: false, error: 'no_chat' });
			const chatId = Number(row.chat_id);
			const userId = Number(row.telegram_user_id);
			const [[state]] = await db.execute('SELECT drawer_id, game_message_id FROM wordcircle_scribble_state WHERE chat_id = ? LIMIT 1', [chatId]);
			if (!state || Number(state.drawer_id) !== userId) return respond(res, 409, { ok: false, error: 'not_your_turn' });
			const [[running]] = await db.execute('SELECT id FROM wordcircle_scribble_rounds WHERE chat_id = ? AND solved_by IS NULL AND created_at > ? LIMIT 1', [chatId, new Date(now() - ROUND_SECONDS * 1000)]);
			if (running) return respond(res, 409, { ok: false, error: 'round_running' });
			const letters = word.replace(/^(der|die|das|the)\s+/iu, '').length;
			const photo = await sendPhoto(chatId, new Blob([bytes], { type: 'image/jpeg' }), scribbleCaption(String(row.first_name ?? ''), letters), Number(state.game_message_id));
			await db.execute(
				'INSERT INTO wordcircle_scribble_rounds (chat_id, game_message_id, photo_message_id, drawer_id, drawer_name, word, answers) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[chatId, Number(state.game_message_id), photo.message_id, userId, String(row.first_name ?? ''), word, JSON.stringify(answers)]
			);
			return respond(res, 200, { ok: true });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'scribble_unavailable' });
		}
	};
}

export default createScribbleEndpoint();
