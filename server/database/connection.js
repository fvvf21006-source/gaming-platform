// PostgreSQL connection pool.
// This module only establishes and exports the connection pool.
// No tables are created and no SQL is executed here — schema and
// queries belong in migrations and repositories respectively.

import pg from 'pg';
import env from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Verifies the pool can actually reach PostgreSQL. Resolves silently
// on success; rejects with the original error on failure. Deliberately
// does not log or exit here — that belongs to whatever calls this
// (server.js on startup), so this module stays limited to connection
// setup and stays reusable from anywhere (health checks, scripts, etc.).
export async function verifyConnection() {
  await pool.query('SELECT 1');
}

export default pool;