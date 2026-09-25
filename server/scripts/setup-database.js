// Production-safe database setup: applies pending migrations and one-time seeds,
// then bootstraps the single Super Admin from environment variables.
// Safe to run on every deploy — each file is recorded in schema_migrations and
// applied at most once. Never seeds the development default password.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { hashPassword } from '../utils/password.js';

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(here, '..', 'database');
const SEEDS = ['001_seed_roles.sql', '003_seed_system_settings.sql', '004_seed_game_categories.sql', '005_seed_games.sql'];

const { DATABASE_URL, SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function applyFile(kind, name) {
  const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [`${kind}/${name}`]);
  if (rowCount) return;
  const sql = await fs.readFile(path.join(dbDir, kind === 'migration' ? 'migrations' : 'seeds', name), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [`${kind}/${name}`]);
    await client.query('COMMIT');
    console.log(`applied ${kind}/${name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`${kind}/${name} failed: ${err.message}`);
  }
}

async function bootstrapSuperAdmin() {
  const { rows: existing } = await client.query(
    "SELECT 1 FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'super_admin' LIMIT 1"
  );
  if (existing.length) return console.log('super admin already exists — skipping bootstrap');

  if (!SUPER_ADMIN_USERNAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
    throw new Error('SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set for first-time setup.');
  }
  if (SUPER_ADMIN_PASSWORD.length < 8) throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters.');

  const hash = await hashPassword(SUPER_ADMIN_PASSWORD);
  await client.query(
    `INSERT INTO users (role_id, created_by, username, email, password_hash, status)
     SELECT r.id, NULL, $1, $2, $3, 'active' FROM roles r WHERE r.name = 'super_admin'`,
    [SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, hash]
  );
  console.log(`super admin "${SUPER_ADMIN_USERNAME}" created`);
}

try {
  await client.connect();
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');

  const migrations = (await fs.readdir(path.join(dbDir, 'migrations'))).filter((f) => f.endsWith('.sql')).sort();
  for (const m of migrations) await applyFile('migration', m);
  for (const s of SEEDS) await applyFile('seed', s);
  await bootstrapSuperAdmin();
  console.log('database ready');
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
