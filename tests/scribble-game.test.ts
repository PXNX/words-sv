import { describe, expect, it } from 'vitest';
import { bareWord, cleanAvatar, cleanLines, leavePlayer, MAX_LINE_POINTS, nextPlayer, revealPattern, scribblePoints, scoreTarget, tableKey } from '../server/_lib/scribbleGame.js';

describe('live Scribble rules', () => {
  it('pays the guesser more the faster, and the drawer half of it', () => {
    expect(scribblePoints(0)).toEqual({ guesser: 200, drawer: 100 });
    expect(scribblePoints(45)).toEqual({ guesser: 150, drawer: 75 });
    expect(scribblePoints(500)).toEqual({ guesser: 100, drawer: 50 });
  });

  it('counts letters without the article', () => {
    expect(bareWord('der Apfel')).toBe('Apfel');
    expect(bareWord('the dog')).toBe('dog');
    expect(bareWord('Haus')).toBe('Haus');
  });

  it('accepts only sane lines from the drawer', () => {
    expect(cleanLines([{ c: '#172a45', s: 4, p: [0, 0, 640, 640] }])).toEqual([{ c: '#172a45', s: 4, p: [0, 0, 640, 640] }]);
    expect(cleanLines([{ c: 'red', s: 4, p: [0, 0] }])).toBeNull();
    expect(cleanLines([{ c: '#172a45', s: 4, p: [0, 0, 700, 1] }])).toBeNull();
    expect(cleanLines([{ c: '#172a45', s: 4, p: [0] }])).toBeNull();
    expect(cleanLines([{ c: '#172a45', s: 4, p: Array.from({ length: (MAX_LINE_POINTS + 1) * 2 }, () => 1) }])).toBeNull();
    expect(cleanLines('nope')).toBeNull();
  });

  it('keys a group by its chat and an inline game by its message, far below any chat id', () => {
    expect(tableKey(-1001234567890, null)).toBe(-1001234567890);
    const inline = tableKey(null, 'BAAAAAbcdef');
    expect(inline).toBe(tableKey(undefined, 'BAAAAAbcdef'));
    expect(inline).not.toBe(tableKey(null, 'BAAAAAbcdeg'));
    expect(inline).toBeLessThan(-5e15);
    expect(Number.isSafeInteger(inline)).toBe(true);
  });

  it('reveals letters one by one when turned on, never more than half, the same for everyone', () => {
    const blank = revealPattern('der Apfelbaum', 7, 0, 90, true);
    expect(blank).toHaveLength(9);
    expect(blank.every((slot) => slot === null)).toBe(true);
    // Four of nine letters at most, one more every 90 / 5 seconds.
    const count = (elapsed: number) => revealPattern('der Apfelbaum', 7, elapsed, 90, true).filter((slot) => slot !== null).length;
    expect([count(17), count(18), count(36), count(89), count(500)]).toEqual([0, 1, 2, 4, 4]);
    const later = revealPattern('der Apfelbaum', 7, 89, 90, true);
    expect(revealPattern('der Apfelbaum', 7, 30, 90, true).every((slot, index) => slot === null || slot === later[index])).toBe(true);
    expect(later.every((slot, index) => slot === null || slot === 'Apfelbaum'[index])).toBe(true);
    expect(revealPattern('Apfelbaum', 7, 89, 90, false).every((slot) => slot === null)).toBe(true);
    expect(revealPattern('ice cream', 3, 0, 90, true)[3]).toBe(' ');
  });

  it('takes an avatar only as a short JSON object', () => {
    expect(cleanAvatar('{"skin":"#f0c9a8"}')).toBe('{"skin":"#f0c9a8"}');
    expect(cleanAvatar('[1]')).toBeNull();
    expect(cleanAvatar('nope')).toBeNull();
    expect(cleanAvatar(`{"a":"${'x'.repeat(400)}"}`)).toBeNull();
  });

  it('sends scores to the inline message when the table has one', () => {
    expect(scoreTarget({ inline_message_id: 'abc' }, -5, 7)).toEqual({ inline_message_id: 'abc' });
    expect(scoreTarget({ inline_message_id: null }, -5, 7)).toEqual({ chat_id: -5, message_id: 7 });
  });
});

describe('leaving a live Scribble table', () => {
  function fakeTable(players: Array<{ user_id: number; joined: number }>, drawerId: number | null, round: { drawer_id: number } | null = null) {
    const rows = players.map((player) => ({ user_id: player.user_id, first_name: `Player ${player.user_id}`, joined: player.joined }));
    const state = { chat_id: -100, drawer_id: drawerId, skips: 2, match_rounds: 3 };
    const rounds: Array<{ drawer_id: number; solved_by: number | null; solved_at: Date | null; guesser_name: string | null }> = round ? [{ ...round, solved_by: null, solved_at: null, guesser_name: 'somebody' }] : [];
    const db = {
      async execute(sql: string, params: unknown[] = []): Promise<any> {
        if (sql.startsWith('DELETE FROM wordcircle_scribble_players')) {
          const remaining = rows.filter((row) => !(row.user_id === params[1]));
          rows.splice(0, rows.length, ...remaining);
          return [{}];
        }
        if (sql.startsWith('SELECT * FROM wordcircle_scribble_state')) return [[{ ...state }]];
        if (sql.startsWith('SELECT COUNT(*)')) return [[{ n: rows.length }]];
        if (sql.startsWith('UPDATE wordcircle_scribble_rounds')) {
          for (const item of rounds) if (item.solved_by === null && (!params[1] || item.drawer_id === params[1])) item.solved_by = 0;
          return [{}];
        }
        if (sql.startsWith('SELECT user_id, first_name, last_seen')) {
          const sorted = [...rows].sort((a, b) => a.joined - b.joined || a.user_id - b.user_id);
          return [sorted];
        }
        if (sql.startsWith('UPDATE wordcircle_scribble_state SET drawer_id = NULL, skips = 0, match_rounds = 0')) {
          state.drawer_id = null;
          state.skips = 0;
          state.match_rounds = 0;
          return [{}];
        }
        if (sql.startsWith('UPDATE wordcircle_scribble_state SET drawer_id = NULL')) {
          state.drawer_id = null;
          state.skips = 0;
          return [{}];
        }
        if (sql.startsWith('UPDATE wordcircle_scribble_state SET drawer_id = ?')) {
          state.drawer_id = Number(params[0]);
          state.skips = 0;
          return [{}];
        }
        throw new Error(`unexpected statement: ${sql}`);
      }
    };
    return { db, rows, state, rounds };
  }

  it('removes the leaver and hands their turn to the next remaining player', async () => {
    const table = fakeTable([{ user_id: 1, joined: 1 }, { user_id: 2, joined: 2 }, { user_id: 3, joined: 3 }], 1);
    await leavePlayer(table.db as never, -100, 1);
    expect(table.rows.map((row) => row.user_id)).toEqual([2, 3]);
    expect(table.state.drawer_id).toBe(2);
    expect(table.state.skips).toBe(0);
  });

  it('closes a round the leaver was drawing so the others are not stuck', async () => {
    const table = fakeTable([{ user_id: 1, joined: 1 }, { user_id: 2, joined: 2 }, { user_id: 3, joined: 3 }], 1, { drawer_id: 1 });
    await leavePlayer(table.db as never, -100, 1);
    expect(table.rounds[0]!.solved_by).toBe(0);
    expect(table.state.drawer_id).toBe(2);
  });

  it('pauses with nobody to draw when only one player is left', async () => {
    const table = fakeTable([{ user_id: 1, joined: 1 }, { user_id: 2, joined: 2 }], 1, { drawer_id: 1 });
    await leavePlayer(table.db as never, -100, 2);
    expect(table.rounds[0]!.solved_by).toBe(0);
    expect(table.state.drawer_id).toBeNull();
  });

  it('resets the table when the last player leaves', async () => {
    const table = fakeTable([{ user_id: 1, joined: 1 }], 1, { drawer_id: 1 });
    await leavePlayer(table.db as never, -100, 1);
    expect(table.rows).toEqual([]);
    expect(table.state).toMatchObject({ drawer_id: null, skips: 0, match_rounds: 0 });
    expect(table.rounds[0]!.solved_by).toBe(0);
  });

  it('leaves the turn alone when somebody else leaves', async () => {
    const table = fakeTable([{ user_id: 1, joined: 1 }, { user_id: 2, joined: 2 }, { user_id: 3, joined: 3 }], 1);
    await leavePlayer(table.db as never, -100, 2);
    expect(table.state.drawer_id).toBe(1);
    expect(table.rounds).toEqual([]);
  });
});

describe('passing the turn', () => {
  const tableOf = (players: Array<{ user_id: number; active: boolean }>) => ({
    async execute(sql: string): Promise<any> {
      if (sql.startsWith('SELECT user_id, first_name, last_seen')) return [players.map((player) => ({ ...player, first_name: '' }))];
      throw new Error(`unexpected statement: ${sql}`);
    }
  });

  it('skips players whose page is closed and wraps around', async () => {
    const db = tableOf([{ user_id: 1, active: true }, { user_id: 2, active: false }, { user_id: 3, active: true }]);
    expect(Number((await nextPlayer(db as never, -100, 1))!.user_id)).toBe(3);
    expect(Number((await nextPlayer(db as never, -100, 3))!.user_id)).toBe(1);
    // A drawer who closed their page hands over to the next one who is there.
    expect(Number((await nextPlayer(db as never, -100, 2))!.user_id)).toBe(3);
  });

  it('finds nobody when everyone else is gone', async () => {
    const db = tableOf([{ user_id: 1, active: false }, { user_id: 2, active: false }]);
    expect(await nextPlayer(db as never, -100, 1)).toBeUndefined();
  });
});

describe('Scribble wins on the device', async () => {
  const { readScribbleWins, recordScribbleWins } = await import('../src/lib/scribble/scribbleWins');
  it('keeps the highest count and never lowers it', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    expect(readScribbleWins(storage)).toBe(0);
    recordScribbleWins(2, storage);
    recordScribbleWins(1, storage);
    expect(readScribbleWins(storage)).toBe(2);
  });
});
