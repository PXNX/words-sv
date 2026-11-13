import pg from 'pg';

/**
 * A row as Postgres returns it. SQL strings carry the columns, so the endpoints narrow each field where
 * they read it; `execute` is generic so a call site can name the shape it expects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

/**
 * The part of the database the endpoints use. `execute(sql, params)` takes `?` placeholders and
 * answers `[rows]`, where `rows.affectedRows` counts the rows an INSERT, UPDATE or DELETE touched.
 */
export interface Database {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	execute: (...args: any[]) => Promise<any>;
}

// BIGINT (Telegram ids, COUNT(*)) and NUMERIC come back as numbers, as the endpoints compare them so.
// Telegram ids stay well below 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

/** `?` → `$1, $2, …`, skipping quoted strings so a literal question mark stays one. */
export function numberPlaceholders(sql: string): string {
	let index = 0;
	let quoted = false;
	let out = '';
	for (const char of sql) {
		if (char === "'") quoted = !quoted;
		out += char === '?' && !quoted ? `$${++index}` : char;
	}
	return out;
}

let pool: pg.Pool | undefined;

export function getDatabase(): Database {
	if (!process.env.DATABASE_URL) throw new Error('database_not_configured');
	pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30_000 });
	const db = pool;
	return {
		async execute(sql: string, params: unknown[] = []) {
			const result = await db.query(numberPlaceholders(sql), params);
			return [Object.assign(result.rows ?? [], { affectedRows: result.rowCount ?? 0 })];
		}
	};
}
