import mysql from 'mysql2/promise';

/**
 * A row as MySQL returns it. SQL strings carry the columns, so the endpoints narrow each field where
 * they read it; `execute` is generic so a call site can name the shape it expects.
 * @typedef {Record<string, any>} Row
 */

/**
 * The part of the MySQL pool the endpoints use. `execute` keeps mysql2's own loose typing: an UPDATE
 * answers a result header, a SELECT an array of rows, and the SQL string decides which.
 * @typedef {{ execute: (...args: any[]) => Promise<any> }} Database
 */

/** @type {import('mysql2/promise').Pool | undefined} */
let pool;

/** @returns {import('mysql2/promise').Pool} */
export function getDatabase() {
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
