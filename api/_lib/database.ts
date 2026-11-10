import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

/**
 * A row as MySQL returns it. SQL strings carry the columns, so the endpoints narrow each field where
 * they read it; `execute` is generic so a call site can name the shape it expects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

/**
 * The part of the MySQL pool the endpoints use. `execute` keeps mysql2's own loose typing: an UPDATE
 * answers a result header, a SELECT an array of rows, and the SQL string decides which.
 */
export interface Database {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	execute: (...args: any[]) => Promise<any>;
}

let pool: Pool | undefined;

export function getDatabase(): Database {
	if (!process.env.DATABASE_URL) throw new Error('database_not_configured');
	if (!pool) {
		pool = mysql.createPool({
			uri: process.env.DATABASE_URL,
			connectionLimit: 3,
			waitForConnections: true,
			enableKeepAlive: true
		});
	}
	return pool;
}
