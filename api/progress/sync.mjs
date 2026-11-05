import { getDatabase } from '../_lib/database.mjs';
import { isMethod, readJson, respond } from '../_lib/http.mjs';
import { ensureTelegramTables } from '../_lib/telegram.mjs';

// Progress saved to the player's Telegram account. A device that is linked to a Telegram user (by
// opening the Mini App or through the bot's reminder link) can `pull` the account's snapshot and
// `push` a new one. The snapshot is an opaque JSON object of the app's own storage; merging happens
// on the device (src/lib/sync/progressMerge.ts). Pushes are compare-and-set on `revision`, so two
// devices never overwrite each other: a stale push gets the current snapshot back to merge first.

const validDeviceId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(value);
// Plenty for years of reviews and activity; MEDIUMTEXT holds 16 MB, Vercel bodies 4.5 MB.
export const MAX_SNAPSHOT_BYTES = 2_000_000;

const TABLE = `CREATE TABLE IF NOT EXISTS wordcircle_progress_snapshots (
	telegram_user_id BIGINT NOT NULL PRIMARY KEY,
	revision INT UNSIGNED NOT NULL DEFAULT 0,
	snapshot MEDIUMTEXT NOT NULL,
	updated_by_device VARCHAR(64) NULL,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

let tableReady;
function ensureProgressTable(db) {
	tableReady ??= db.execute(TABLE).catch((error) => { tableReady = undefined; throw error; });
	return tableReady;
}

function parseSnapshot(raw) {
	try {
		const value = JSON.parse(raw);
		return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
	} catch {
		return null;
	}
}

export function createSyncEndpoint({ databaseProvider = getDatabase } = {}) {
	return async function progressSync(req, res) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const { deviceId, action = 'pull', snapshot, baseRevision } = await readJson(req);
			if (!validDeviceId(deviceId) || (action !== 'pull' && action !== 'push')) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const db = databaseProvider();
			await ensureTelegramTables(db);
			await ensureProgressTable(db);
			const [[link]] = await db.execute('SELECT telegram_user_id FROM wordcircle_telegram_links WHERE device_id = ? LIMIT 1', [deviceId]);
			const userId = link?.telegram_user_id === null || link?.telegram_user_id === undefined ? null : Number(link.telegram_user_id);
			if (!userId) return respond(res, 200, { ok: true, linked: false });

			const [[row]] = await db.execute('SELECT revision, snapshot FROM wordcircle_progress_snapshots WHERE telegram_user_id = ? LIMIT 1', [userId]);
			const current = { revision: Number(row?.revision ?? 0), snapshot: row ? parseSnapshot(row.snapshot) : null };
			if (action === 'pull') return respond(res, 200, { ok: true, linked: true, ...current });

			if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return respond(res, 400, { ok: false, error: 'invalid_snapshot' });
			const body = JSON.stringify(snapshot);
			if (Buffer.byteLength(body) > MAX_SNAPSHOT_BYTES) return respond(res, 413, { ok: false, error: 'snapshot_too_large' });
			if (!Number.isSafeInteger(baseRevision) || baseRevision !== current.revision) return respond(res, 409, { ok: false, error: 'conflict', linked: true, ...current });
			const [result] = row
				? await db.execute('UPDATE wordcircle_progress_snapshots SET revision = revision + 1, snapshot = ?, updated_by_device = ? WHERE telegram_user_id = ? AND revision = ?', [body, deviceId, userId, current.revision])
				: await db.execute('INSERT IGNORE INTO wordcircle_progress_snapshots (telegram_user_id, revision, snapshot, updated_by_device) VALUES (?, 1, ?, ?)', [userId, body, deviceId]);
			if (result.affectedRows !== 1) {
				// Another device won the race between the read and the write.
				const [[latest]] = await db.execute('SELECT revision, snapshot FROM wordcircle_progress_snapshots WHERE telegram_user_id = ? LIMIT 1', [userId]);
				return respond(res, 409, { ok: false, error: 'conflict', linked: true, revision: Number(latest?.revision ?? 0), snapshot: latest ? parseSnapshot(latest.snapshot) : null });
			}
			return respond(res, 200, { ok: true, linked: true, revision: current.revision + 1 });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'sync_unavailable' });
		}
	};
}

export default createSyncEndpoint();
