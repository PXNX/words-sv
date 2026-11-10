import { describe, expect, it } from 'vitest';
import { COMPLETION_POINTS, COUNTER_CAP, dayScore, groupCode, GroupCodeSchema, pointsEarned, rankMembers, weekKey } from '../api/_lib/groups.js';
import * as v from 'valibot';

const empty = { vocabCorrect: 0, grammarCorrect: 0, alltagCorrect: 0, pronunciationAttempts: 0, circleCompleted: false, definitionsCompleted: false, wordleCompleted: false, readingCompleted: false, storyCompleted: false, listenCompleted: false, hangmanCompleted: false, sentenceCompleted: false };

describe('group league scoring', () => {
  it('counts answers up to a cap and each finished mode once', () => {
    expect(dayScore({ ...empty, vocabCorrect: 12, grammarCorrect: 3 })).toBe(15);
    expect(dayScore({ ...empty, vocabCorrect: 10_000 })).toBe(COUNTER_CAP);
    expect(dayScore({ ...empty, wordleCompleted: true, storyCompleted: true })).toBe(2 * COMPLETION_POINTS);
  });

  it('only ever adds points', () => {
    expect(pointsEarned({ ...empty, vocabCorrect: 4 }, { ...empty, vocabCorrect: 9 })).toBe(5);
    expect(pointsEarned({ ...empty, wordleCompleted: true }, { ...empty, wordleCompleted: true })).toBe(0);
    expect(pointsEarned({ ...empty, vocabCorrect: 9 }, { ...empty, vocabCorrect: 4 })).toBe(0);
  });

  it('keys ISO weeks starting on Monday', () => {
    expect(weekKey('2026-11-09')).toBe('2026-W46');
    expect(weekKey('2026-11-15')).toBe('2026-W46');
    expect(weekKey('2026-11-16')).toBe('2026-W47');
    expect(weekKey('2021-01-03')).toBe('2020-W53');
    expect(weekKey('2024-12-30')).toBe('2025-W01');
  });

  it('ranks with shared places for ties', () => {
    expect(rankMembers([{ id: 'a', points: 5 }, { id: 'b', points: 9 }, { id: 'c', points: 5 }, { id: 'd', points: 1 }]).map((member) => [member.id, member.rank])).toEqual([['b', 1], ['a', 2], ['c', 2], ['d', 4]]);
  });

  it('makes readable codes and accepts them typed in lower case', () => {
    const code = groupCode();
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{6}$/u);
    expect(v.parse(GroupCodeSchema, code.toLowerCase())).toBe(code);
    expect(v.safeParse(GroupCodeSchema, 'ABC10O').success).toBe(false);
  });
});

// A small in-memory stand-in for the statements the groups endpoint runs.
function fakeDatabase() {
  const groups: Array<{ id: number; code: string; name: string }> = [];
  const members: Array<{ group_id: number; device_id: string; display_name: string; avatar: string | null; joined_at: number }> = [];
  const points = new Map<string, number>();
  let clock = 0;
  return {
    points,
    async execute(sql: string, params: any[] = []): Promise<any> {
      if (sql.startsWith('CREATE')) return [{}];
      if (sql.startsWith('SELECT COUNT(*) AS count FROM wordcircle_group_members WHERE device_id')) return [[{ count: members.filter((m) => m.device_id === params[0]).length }]];
      if (sql.startsWith('SELECT COUNT(*) AS count FROM wordcircle_group_members WHERE group_id')) return [[{ count: members.filter((m) => m.group_id === params[0]).length }]];
      if (sql.startsWith('INSERT INTO wordcircle_groups')) {
        if (groups.some((g) => g.code === params[0])) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
        const id = groups.length + 1;
        groups.push({ id, code: params[0], name: params[1] });
        return [{ insertId: id }];
      }
      if (sql.startsWith('INSERT INTO wordcircle_group_members')) {
        const existing = members.find((m) => m.group_id === params[0] && m.device_id === params[1]);
        if (existing) Object.assign(existing, { display_name: params[2], avatar: params[3] });
        else members.push({ group_id: params[0], device_id: params[1], display_name: params[2], avatar: params[3], joined_at: clock++ });
        return [{}];
      }
      if (sql.startsWith('SELECT id FROM wordcircle_groups WHERE code')) return [groups.filter((g) => g.code === params[0])];
      if (sql.startsWith('DELETE FROM wordcircle_group_members')) {
        const index = members.findIndex((m) => m.group_id === params[0] && m.device_id === params[1]);
        if (index >= 0) members.splice(index, 1);
        return [{}];
      }
      if (sql.startsWith('DELETE FROM wordcircle_groups')) {
        if (!members.some((m) => m.group_id === params[0])) groups.splice(groups.findIndex((g) => g.id === params[0]), 1);
        return [{}];
      }
      if (sql.startsWith('UPDATE wordcircle_group_members SET display_name')) {
        for (const m of members) if (m.device_id === params[2]) Object.assign(m, { display_name: params[0], avatar: params[1] });
        return [{}];
      }
      if (sql.startsWith('SELECT g.id, g.code, g.name')) return [members.filter((m) => m.device_id === params[0]).sort((a, b) => a.joined_at - b.joined_at).map((m) => groups.find((g) => g.id === m.group_id)!)];
      if (sql.startsWith('SELECT m.device_id')) return [members.filter((m) => m.group_id === params[1]).map((m) => ({ ...m, points: points.get(`${m.device_id}|${params[0]}`) ?? 0 }))];
      throw new Error(`unexpected statement: ${sql}`);
    }
  };
}

describe('groups endpoint', async () => {
  const { createGroupsEndpoint } = await import('../api/groups/index.js');
  const { responseCapture } = await import('./support/api');
  const db = fakeDatabase();
  const call = async (body: Record<string, unknown>) => {
    const res = responseCapture();
    await createGroupsEndpoint({ databaseProvider: () => db })({ method: 'POST', body: { timeZone: 'UTC', ...body } }, res);
    return res.result;
  };
  const anna = 'device_anna_0123456789';
  const ben = 'device_ben_01234567890';

  it('creates, joins, ranks by this week and leaves', async () => {
    const created = await call({ action: 'create', deviceId: anna, name: ' Klasse 7b ', member: 'Anna' });
    expect(created.statusCode).toBe(200);
    const group = created.body.groups[0];
    expect(group).toMatchObject({ name: 'Klasse 7b', members: [{ name: 'Anna', you: true, rank: 1 }] });

    expect((await call({ action: 'join', deviceId: ben, code: group.code.toLowerCase(), member: 'Ben' })).statusCode).toBe(200);
    db.points.set(`${ben}|${group.week}`, 30);
    db.points.set(`${anna}|${group.week}`, 12);
    const listed = await call({ action: 'list', deviceId: anna });
    expect(listed.body.groups[0].members.map((m: { name: string; rank: number; you: boolean }) => [m.name, m.rank, m.you])).toEqual([['Ben', 1, false], ['Anna', 2, true]]);

    await call({ action: 'leave', deviceId: ben, code: group.code });
    await call({ action: 'leave', deviceId: anna, code: group.code });
    expect((await call({ action: 'join', deviceId: ben, code: group.code, member: 'Ben' })).statusCode).toBe(404);
  });

  it('rejects bad input', async () => {
    expect((await call({ action: 'create', deviceId: anna, name: '', member: 'Anna' })).statusCode).toBe(400);
    expect((await call({ action: 'join', deviceId: 'short', code: 'ABCDEF', member: 'Anna' })).statusCode).toBe(400);
    expect((await call({ action: 'hack', deviceId: anna })).statusCode).toBe(400);
  });
});
