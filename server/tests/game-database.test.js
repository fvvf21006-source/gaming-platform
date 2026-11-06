import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pool from '../database/connection.js';
import * as games from '../repositories/gameRepository.js';
import * as service from '../services/gameService.js';

// Execute production SQL against an isolated PostgreSQL engine, never DATABASE_URL.
test('database migrations and wallet settlement integration', async (t) => {
  const db = new PGlite();
  const migrations = new URL('../database/migrations/', import.meta.url);
  const files = (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort();
  // PGlite has gen_random_uuid built in; pgcrypto is a native PostgreSQL extension.
  for (const name of files.filter((name) => !name.startsWith('000_'))) {
    await db.exec(await readFile(new URL(name, migrations), 'utf8'));
  }
  for (const name of ['001_seed_roles.sql', '004_seed_game_categories.sql', '005_seed_games.sql', '006_seed_casino_games.sql', '007_mark_paying_games.sql', '008_lower_game_minimums.sql']) {
    await db.exec(await readFile(new URL('../database/seeds/' + name, import.meta.url), 'utf8'));
  }
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  const query = async (sql, args = []) => {
    const result = await db.query(sql, args);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  };
  pool.connect = async () => ({ query, release() {} });
  pool.query = query;
  t.after(async () => { pool.connect = originalConnect; pool.query = originalQuery; await db.close(); });
  const user = async (name, role) => (await query(
    `INSERT INTO users (username, password_hash, role_id) SELECT $1, 'test-hash', id FROM roles WHERE name = $2 RETURNING id`, [name, role]
  )).rows[0].id;
  const house = await user('test-house', 'super_admin');
  const player = await user('test-player', 'player');
  await user('test-player-no-email', 'player');
  await query('INSERT INTO wallets (user_id, balance) VALUES ($1, 10)', [player]);
  const catalog = (await query('SELECT * FROM games')).rows;
  const wheel = catalog.find((g) => g.name === 'Lucky Wheel');
  assert.ok(catalog.length >= 7);
  assert.ok(catalog.every((g) => Number(g.point_cost) === 0.5));
  const balance = async () => Number((await query('SELECT balance FROM wallets WHERE user_id = $1', [player])).rows[0].balance);

  await t.test('half-point buy-in and fractional win preserve exact balances and immutable ledger', async () => {
    const started = await games.startGameSession({ userId: player, gameId: wheel.id, pointCost: 0.5 });
    assert.equal(await balance(), 9.5);
    await service.completeSession({ userId: player, sessionId: started.session.id, score: 0.25 });
    assert.equal(await balance(), 9.75);
    // A retry must return the original recorded result without paying twice.
    const retried = await service.completeSession({ userId: player, sessionId: started.session.id, score: 50 });
    assert.equal(retried.score, 0.25);
    assert.equal(await balance(), 9.75);
    const ledger = (await query('SELECT * FROM wallet_transactions ORDER BY created_at')).rows;
    assert.equal(ledger.length, 2);
    assert.equal(Number(ledger[1].amount), 0.25);
    await assert.rejects(query('DELETE FROM wallet_transactions'), /immutable ledger/);
  });

  await t.test('larger stake and a win exceeding house balance still credit in full', async () => {
    const started = await service.playGame({ userId: player, gameId: wheel.id, stake: 1 });
    await service.completeSession({ userId: player, sessionId: started.id, score: 100 });
    assert.equal(await balance(), 108.75);
    assert.equal(Number((await query('SELECT balance FROM wallets WHERE user_id = $1', [house])).rows[0].balance), 0);
  });

  await t.test('losses do not credit points and insufficient funds do not create a session', async () => {
    const started = await games.startGameSession({ userId: player, gameId: wheel.id, pointCost: 0.5 });
    await service.completeSession({ userId: player, sessionId: started.session.id, score: 0 });
    const before = await balance();
    const count = Number((await query('SELECT count(*) FROM game_sessions')).rows[0].count);
    await assert.rejects(games.startGameSession({ userId: player, gameId: wheel.id, pointCost: before + 1 }), /Insufficient balance/);
    assert.equal(await balance(), before);
    assert.equal(Number((await query('SELECT count(*) FROM game_sessions')).rows[0].count), count);
  });

  await t.test('another player cannot complete a session', async () => {
    const started = await games.startGameSession({ userId: player, gameId: wheel.id, pointCost: 0.5 });
    await assert.rejects(service.completeSession({ userId: house, sessionId: started.session.id, score: 50 }), /not your session/);
    await service.completeSession({ userId: player, sessionId: started.session.id, score: 0 });
  });

  await t.test('fractional supervisor outcomes stay numeric and credit the recorded amount', async () => {
    const started = await service.playGame({ userId: player, gameId: wheel.id, stake: 0.5 });
    const before = await balance();
    const preset = await service.presetSessionOutcome({ requesterId: house, requesterRole: 'super_admin', sessionId: started.id, score: 0.25 });
    assert.equal(preset.forcedScore, 0.25);
    const outcome = await service.getSessionOutcome({ userId: player, sessionId: started.id });
    assert.equal(outcome.forcedScore, 0.25);
    const completed = await service.completeSession({ userId: player, sessionId: started.id, score: 0 });
    assert.equal(completed.score, 0.25);
    assert.equal(await balance(), before + 0.25);
  });

  await t.test('invalid stakes, impossible scores, and frozen accounts cannot bypass service validation', async () => {
    for (const stake of [0, 0.25, 0.75, Infinity, 1000001]) {
      await assert.rejects(service.playGame({ userId: player, gameId: wheel.id, stake }), /Stake/);
    }
    const started = await service.playGame({ userId: player, gameId: wheel.id, stake: 0.5 });
    await assert.rejects(service.completeSession({ userId: player, sessionId: started.id, score: 0.4 }), /possible result/);
    await service.completeSession({ userId: player, sessionId: started.id, score: 0 });
    await query("UPDATE users SET status = 'frozen' WHERE id = $1", [player]);
    await assert.rejects(service.playGame({ userId: player, gameId: wheel.id, stake: 0.5 }), /frozen account/);
    await query("UPDATE users SET status = 'active' WHERE id = $1", [player]);
  });

  await t.test('ledger failure rolls back both completion and payout, allowing a safe retry', async () => {
    const started = await games.startGameSession({ userId: player, gameId: wheel.id, pointCost: 0.5 });
    const before = await balance();
    await db.exec(`CREATE FUNCTION fail_test_payout() RETURNS trigger AS $$ BEGIN IF NEW.transaction_type = 'game_payout' THEN RAISE EXCEPTION 'test ledger failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_payout_failure BEFORE INSERT ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION fail_test_payout();`);
    await assert.rejects(games.completeSession(started.session.id, 0.25), /test ledger failure/);
    assert.equal(await balance(), before);
    assert.equal((await games.findSessionById(started.session.id)).status, 'in_progress');
    await db.exec('DROP TRIGGER test_payout_failure ON wallet_transactions');
    await service.completeSession({ userId: player, sessionId: started.session.id, score: 0.25 });
    assert.equal(await balance(), before + 0.25);
  });
});

test('upgrade preserves existing integer balances, ledger rows, and unfinished sessions', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const dir = new URL('../database/migrations/', import.meta.url);
  for (const name of (await readdir(dir)).filter((n) => n.endsWith('.sql') && !n.startsWith('000_') && !n.startsWith('023_')).sort()) {
    await db.exec(await readFile(new URL(name, dir), 'utf8'));
  }
  await db.exec(await readFile(new URL('../database/seeds/001_seed_roles.sql', import.meta.url), 'utf8'));
  const player = (await db.query(`INSERT INTO users (username, password_hash, role_id) SELECT 'existing-player', 'hash', id FROM roles WHERE name = 'player' RETURNING id`)).rows[0].id;
  const house = (await db.query(`INSERT INTO users (username, password_hash, role_id) SELECT 'existing-house', 'hash', id FROM roles WHERE name = 'super_admin' RETURNING id`)).rows[0].id;
  const gameId = (await db.query(`INSERT INTO games (name, point_cost, pays_out) VALUES ('Lucky Wheel', 10, true) RETURNING id`)).rows[0].id;
  // Include a valid old BIGINT value above NUMERIC(18,2)'s whole-number range.
  await db.query(`INSERT INTO wallets (user_id, balance) VALUES ($1, 10000000000000000)`, [player]);
  await db.query(`INSERT INTO game_sessions (user_id, game_id, points_spent) VALUES ($1, $2, 10)`, [player, gameId]);
  await db.query(`INSERT INTO wallet_transactions (sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, transaction_type) VALUES ($1, $2, 5, 0, 5, 'game_payout')`, [house, player]);
  await db.exec(await readFile(new URL('023_fractional_game_points.sql', dir), 'utf8'));
  assert.equal((await db.query('SELECT balance::text AS balance FROM wallets')).rows[0].balance, '10000000000000000.00');
  assert.equal(Number((await db.query('SELECT amount FROM wallet_transactions')).rows[0].amount), 5);
  assert.equal(Number((await db.query('SELECT points_spent FROM game_sessions')).rows[0].points_spent), 10);
  assert.equal(Number((await db.query('SELECT point_cost FROM games')).rows[0].point_cost), 0.5);
});
