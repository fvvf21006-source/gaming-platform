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

export async function verifyConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection verified.');
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return false;
  }
}

export default pool;
