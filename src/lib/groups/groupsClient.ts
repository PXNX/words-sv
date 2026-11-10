// The app's side of group leagues (api/groups/index.ts): the learner's groups with this week's
// ranking, and creating, joining and leaving them. Points are scored on the server from the streak.
import { ApiError, callApi } from '#lib/api/client.js';
import { GroupsReplySchema, type GroupView } from '#lib/api/schemas.js';
import { deviceId, timeZone } from '#lib/streak/clientStreak.js';

export type GroupAction =
  | { action: 'list' }
  | { action: 'create'; name: string }
  | { action: 'join'; code: string }
  | { action: 'leave'; code: string }
  | { action: 'profile' };

export type Member = { name: string; avatar: string | null };

/** Why a call failed, as a code the page has a message for. */
export type GroupError = 'unknown_group' | 'group_full' | 'too_many_groups' | 'invalid_request' | 'unavailable';

export async function groupsCall(request: GroupAction, member: Member): Promise<GroupView[]> {
  // The /api functions only exist on Vercel; under `vite dev` every call would just 404.
  if (import.meta.env?.DEV) throw new GroupsUnavailable('unavailable');
  const withMember = request.action === 'create' || request.action === 'join' || request.action === 'profile' ? { member: member.name, avatar: member.avatar } : {};
  try {
    const reply = await callApi('/api/groups', GroupsReplySchema, { body: { deviceId: deviceId(), timeZone: timeZone(), ...request, ...withMember } });
    return reply.groups;
  } catch (error) {
    const code = error instanceof ApiError ? error.code : 'unavailable';
    throw new GroupsUnavailable((['unknown_group', 'group_full', 'too_many_groups', 'invalid_request'] as const).find((known) => known === code) ?? 'unavailable');
  }
}

export class GroupsUnavailable extends Error {
  constructor(readonly code: GroupError) {
    super(code);
    this.name = 'GroupsUnavailable';
  }
}

/** The link that opens the app and offers to join `code`. */
export function joinLink(code: string, origin = typeof location === 'undefined' ? 'https://words-sv.vercel.app' : location.origin): string {
  return `${origin}/groups?join=${encodeURIComponent(code)}`;
}

/** A code typed by hand: upper case, without spaces or dashes; null when it cannot be one. */
export function normalizeCode(value: string): string | null {
  const code = value.toUpperCase().replace(/[\s-]/gu, '');
  return /^[2-9A-HJKMNP-Z]{6}$/u.test(code) ? code : null;
}
