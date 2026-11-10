import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { dateKeyFor, isSupportedTimeZone } from '../_lib/streak.js';
import { AvatarSchema, ensureGroupTables, groupCode, GroupCodeSchema, GroupNameSchema, MAX_GROUPS_PER_DEVICE, MAX_MEMBERS, MemberNameSchema, rankMembers, weekKey } from '../_lib/groups.js';
import type { Database, Row } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// Group leagues. `list` returns the device's groups with this week's ranking, `create` starts a
// group (the creator joins it), `join` enters one by its code, `leave` steps out (the last member
// leaving deletes the group), `profile` updates the name and character shown in every group.
// Points come from api/streak/progress.ts; nothing here can change them.

const DeviceId = v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]{16,64}$/u));
const Request = v.variant('action', [
	v.object({ action: v.literal('list'), deviceId: DeviceId, timeZone: v.string() }),
	v.object({ action: v.literal('create'), deviceId: DeviceId, timeZone: v.string(), name: GroupNameSchema, member: MemberNameSchema, avatar: v.optional(AvatarSchema, null) }),
	v.object({ action: v.literal('join'), deviceId: DeviceId, timeZone: v.string(), code: GroupCodeSchema, member: MemberNameSchema, avatar: v.optional(AvatarSchema, null) }),
	v.object({ action: v.literal('leave'), deviceId: DeviceId, timeZone: v.string(), code: GroupCodeSchema }),
	v.object({ action: v.literal('profile'), deviceId: DeviceId, timeZone: v.string(), member: MemberNameSchema, avatar: v.optional(AvatarSchema, null) })
]);

export type GroupStanding = { name: string; avatar: string | null; points: number; rank: number; you: boolean };
export type GroupView = { code: string; name: string; week: string; members: GroupStanding[] };

async function listGroups(db: Database, deviceId: string, week: string): Promise<GroupView[]> {
	const [groups] = await db.execute('SELECT g.id, g.code, g.name FROM wordcircle_groups g INNER JOIN wordcircle_group_members m ON m.group_id = g.id WHERE m.device_id = ? ORDER BY m.joined_at', [deviceId]);
	const views: GroupView[] = [];
	for (const group of groups as Row[]) {
		const [members] = await db.execute('SELECT m.device_id, m.display_name, m.avatar, COALESCE(p.points, 0) AS points FROM wordcircle_group_members m LEFT JOIN wordcircle_weekly_points p ON p.device_id = m.device_id AND p.week_key = ? WHERE m.group_id = ?', [week, group.id]);
		const ranked = rankMembers((members as Row[]).map((member) => ({ name: String(member.display_name), avatar: member.avatar ?? null, points: Number(member.points) || 0, you: member.device_id === deviceId })));
		views.push({ code: String(group.code), name: String(group.name), week, members: ranked });
	}
	return views;
}

export function createGroupsEndpoint({ databaseProvider = getDatabase }: { databaseProvider?: () => Database } = {}) {
	return async function groups(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success || !isSupportedTimeZone(parsed.output.timeZone)) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const input = parsed.output;
			const { deviceId } = input;
			const db = databaseProvider();
			await ensureGroupTables(db);
			const week = weekKey(dateKeyFor(input.timeZone));

			if (input.action === 'create' || input.action === 'join') {
				const [[count]] = await db.execute('SELECT COUNT(*) AS count FROM wordcircle_group_members WHERE device_id = ?', [deviceId]);
				if (Number(count?.count ?? 0) >= MAX_GROUPS_PER_DEVICE) return respond(res, 409, { ok: false, error: 'too_many_groups' });
			}
			if (input.action === 'create') {
				let groupId: number | null = null;
				for (let attempt = 0; attempt < 5 && groupId === null; attempt += 1) {
					try {
						const [result] = await db.execute('INSERT INTO wordcircle_groups (code, name, created_by_device) VALUES (?, ?, ?)', [groupCode(), input.name, deviceId]);
						groupId = Number(result.insertId);
					} catch (error) {
						if ((error as { code?: string } | null)?.code !== 'ER_DUP_ENTRY') throw error;
					}
				}
				if (groupId === null) throw new Error('group_code_exhausted');
				await db.execute('INSERT INTO wordcircle_group_members (group_id, device_id, display_name, avatar) VALUES (?, ?, ?, ?)', [groupId, deviceId, input.member, input.avatar]);
			} else if (input.action === 'join') {
				const [[group]] = await db.execute('SELECT id FROM wordcircle_groups WHERE code = ? LIMIT 1', [input.code]);
				if (!group) return respond(res, 404, { ok: false, error: 'unknown_group' });
				const [[members]] = await db.execute('SELECT COUNT(*) AS count FROM wordcircle_group_members WHERE group_id = ?', [group.id]);
				if (Number(members?.count ?? 0) >= MAX_MEMBERS) return respond(res, 409, { ok: false, error: 'group_full' });
				await db.execute('INSERT INTO wordcircle_group_members (group_id, device_id, display_name, avatar) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), avatar = VALUES(avatar)', [group.id, deviceId, input.member, input.avatar]);
			} else if (input.action === 'leave') {
				const [[group]] = await db.execute('SELECT id FROM wordcircle_groups WHERE code = ? LIMIT 1', [input.code]);
				if (group) {
					await db.execute('DELETE FROM wordcircle_group_members WHERE group_id = ? AND device_id = ?', [group.id, deviceId]);
					await db.execute('DELETE FROM wordcircle_groups WHERE id = ? AND NOT EXISTS (SELECT 1 FROM wordcircle_group_members WHERE group_id = ?)', [group.id, group.id]);
				}
			} else if (input.action === 'profile') {
				await db.execute('UPDATE wordcircle_group_members SET display_name = ?, avatar = ? WHERE device_id = ?', [input.member, input.avatar, deviceId]);
			}
			return respond(res, 200, { ok: true, groups: await listGroups(db, deviceId, week) });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'groups_unavailable' });
		}
	};
}

export default createGroupsEndpoint();
