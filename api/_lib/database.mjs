import mysql from 'mysql2/promise';

let pool;

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
