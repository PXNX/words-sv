import { neon } from '@neondatabase/serverless';
import { isCoopRound, type CoopEvent, type CoopRound, type CoopSnapshot } from '$lib/coop';

const ROOM_TTL_HOURS = 24;
const EVENT_LIMIT = 6;
let schemaReady: Promise<void> | null = null;

export class CoopRoomError extends Error {
  constructor(public readonly code: 'room_not_found' | 'database_unavailable' | 'rate_limited') {
    super(code);
  }
}

type RoomRow = {
  token: string;
  round: unknown;
  solvedWords: unknown;
  version: number;
  expiresAt: string | Date;
};

type EventRow = {
  version: number;
  kind: 'solved';
  word: string;
  actorId: string;
  createdAt: string | Date;
};

function sqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new CoopRoomError('database_unavailable');
  try {
    return neon(databaseUrl);
  } catch {
    throw new CoopRoomError('database_unavailable');
  }
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return asStringArray(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

function asRound(value: unknown): CoopRound | null {
  if (isCoopRound(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return isCoopRound(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function isoDate(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

async function provisionSchema() {
  const sql = sqlClient();
  await sql`CREATE TABLE IF NOT EXISTS wordcircle_rooms (
    token VARCHAR(64) PRIMARY KEY,
    round JSONB NOT NULL,
    solved_words JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS wordcircle_room_members (
    room_token VARCHAR(64) NOT NULL REFERENCES wordcircle_rooms(token) ON DELETE CASCADE,
    participant_id VARCHAR(80) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_guess_at TIMESTAMPTZ,
    PRIMARY KEY (room_token, participant_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS wordcircle_room_events (
    room_token VARCHAR(64) NOT NULL REFERENCES wordcircle_rooms(token) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    actor_id VARCHAR(80) NOT NULL,
    kind VARCHAR(24) NOT NULL,
    word VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_token, version)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS wordcircle_room_events_cursor_idx ON wordcircle_room_events (room_token, version)`;
}

function ensureSchema() {
  schemaReady ??= provisionSchema().catch((cause) => {
    schemaReady = null;
    throw cause;
  });
  return schemaReady;
}

async function touchMember(token: string, participantId: string) {
  const sql = sqlClient();
  await sql`INSERT INTO wordcircle_room_members (room_token, participant_id)
    VALUES (${token}, ${participantId})
    ON CONFLICT (room_token, participant_id)
    DO UPDATE SET last_seen_at = NOW()`;
}

async function roomRow(token: string): Promise<RoomRow> {
  const sql = sqlClient();
  const rows = (await sql`SELECT token, round, solved_words AS "solvedWords", version, expires_at AS "expiresAt"
    FROM wordcircle_rooms
    WHERE token = ${token} AND expires_at > NOW()`) as unknown as RoomRow[];
  const row = rows[0];
  if (!row) throw new CoopRoomError('room_not_found');
  return row;
}

async function roomEvents(token: string, after = -1, limit = EVENT_LIMIT): Promise<CoopEvent[]> {
  const sql = sqlClient();
  const rows = (await sql`SELECT version, kind, word, actor_id AS "actorId", created_at AS "createdAt"
    FROM wordcircle_room_events
    WHERE room_token = ${token} AND version > ${after}
    ORDER BY version ASC
    LIMIT ${limit}`) as unknown as EventRow[];
  return rows.map((row) => ({ ...row, createdAt: isoDate(row.createdAt) }));
}

async function snapshot(token: string): Promise<CoopSnapshot> {
  const sql = sqlClient();
  const row = await roomRow(token);
  const round = asRound(row.round);
  if (!round) throw new CoopRoomError('room_not_found');
  const counts = (await sql`SELECT COUNT(*)::int AS count FROM wordcircle_room_members
    WHERE room_token = ${token} AND last_seen_at > NOW() - INTERVAL '5 minutes'`) as unknown as Array<{ count: number }>;
  const events = await roomEvents(token, Math.max(-1, row.version - EVENT_LIMIT));
  return {
    token: row.token,
    round,
    solvedWords: asStringArray(row.solvedWords),
    version: Number(row.version),
    memberCount: Number(counts[0]?.count ?? 0),
    expiresAt: isoDate(row.expiresAt),
    events
  };
}

function newRoomToken() {
  return crypto.randomUUID().replaceAll('-', '');
}

export async function createCoopRoom(round: CoopRound, participantId: string): Promise<CoopSnapshot> {
  await ensureSchema();
  const sql = sqlClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = newRoomToken();
    try {
      await sql`INSERT INTO wordcircle_rooms (token, round, expires_at)
        VALUES (${token}, ${JSON.stringify(round)}::jsonb, NOW() + (${ROOM_TTL_HOURS} * INTERVAL '1 hour'))`;
      await touchMember(token, participantId);
      return snapshot(token);
    } catch (cause) {
      if (attempt === 2) throw cause;
    }
  }
  throw new CoopRoomError('database_unavailable');
}

export async function getCoopSnapshot(token: string, participantId: string): Promise<CoopSnapshot> {
  await ensureSchema();
  await roomRow(token);
  await touchMember(token, participantId);
  return snapshot(token);
}

export async function submitCoopGuess(token: string, participantId: string, word: string) {
  await ensureSchema();
  await roomRow(token);
  await touchMember(token, participantId);
  const sql = sqlClient();
  const permitted = await sql`UPDATE wordcircle_room_members
    SET last_guess_at = NOW(), last_seen_at = NOW()
    WHERE room_token = ${token}
      AND participant_id = ${participantId}
      AND (last_guess_at IS NULL OR last_guess_at < NOW() - INTERVAL '250 milliseconds')
    RETURNING participant_id`;
  if (permitted.length === 0) throw new CoopRoomError('rate_limited');
  const changed = (await sql`WITH candidate AS (
      SELECT token, version, solved_words
      FROM wordcircle_rooms
      WHERE token = ${token}
        AND expires_at > NOW()
        AND round -> 'words' ? ${word}
      FOR UPDATE
    ), updated AS (
      UPDATE wordcircle_rooms AS room
      SET solved_words = room.solved_words || to_jsonb(${word}::text),
          version = room.version + 1,
          updated_at = NOW()
      FROM candidate
      WHERE room.token = candidate.token AND NOT (candidate.solved_words ? ${word})
      RETURNING room.token, room.version
    ), event AS (
      INSERT INTO wordcircle_room_events (room_token, version, actor_id, kind, word)
      SELECT token, version, ${participantId}, 'solved', ${word} FROM updated
    )
    SELECT version FROM updated`) as unknown as Array<{ version: number }>;
  return { accepted: changed.length > 0, snapshot: await snapshot(token) };
}

export async function getCoopEventsAfter(token: string, after: number) {
  await ensureSchema();
  await roomRow(token);
  return roomEvents(token, Math.max(-1, after), 40);
}
