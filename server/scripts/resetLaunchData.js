// One-time "launch reset": zero every wallet and clear the point ledger, game
// history, notifications and audit log, keeping all user accounts.
//
// Ledger, audit log and game sessions are protected against deletion by
// database triggers (migrations 014 / 020). This script lifts that protection
// only inside a single transaction and restores it before committing, so the
// protection is never left off, and a failure rolls everything back untouched.
//
// It runs at most once per token: the token is recorded in schema_migrations,
// so a redeploy with the same RESET_LAUNCH_DATA value does nothing.

const PROTECTED_TABLES = ['wallet_transactions', 'audit_logs', 'game_sessions'];

async function count(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return rows[0].n;
}

/**
 * @param {import('pg').Client} client a connected client
 * @param {string} token the RESET_LAUNCH_DATA value; the reset runs once per distinct token
 * @returns {Promise<boolean>} true if the reset ran, false if this token was already applied
 */
export async function resetLaunchData(client, token) {
  const marker = `reset/${token}`;
  const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [marker]);

  if (rowCount) {
    console.log(`launch reset "${token}" was already applied — skipping`);
    return false;
  }

  await client.query('BEGIN');

  try {
    const before = {
      wallet_transactions: await count(client, 'wallet_transactions'),
      audit_logs: await count(client, 'audit_logs'),
      game_sessions: await count(client, 'game_sessions'),
      notifications: await count(client, 'notifications'),
      player_next_outcomes: await count(client, 'player_next_outcomes'),
    };
    const { rows: points } = await client.query('SELECT COALESCE(SUM(balance), 0)::bigint AS total FROM wallets');

    for (const table of PROTECTED_TABLES) {
      await client.query(`ALTER TABLE ${table} DISABLE TRIGGER USER`);
    }

    await client.query('DELETE FROM wallet_transactions');
    await client.query('DELETE FROM game_sessions');
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM player_next_outcomes');
    await client.query('UPDATE wallets SET balance = 0, updated_at = now()');
    await client.query('UPDATE users SET last_seen_at = NULL');

    // Protection back on before anything can commit.
    for (const table of PROTECTED_TABLES) {
      await client.query(`ALTER TABLE ${table} ENABLE TRIGGER USER`);
    }

    // One audit entry so the empty log still says why it starts here.
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES (NULL, 'launch_data_reset', 'system', NULL, $1::jsonb)`,
      [JSON.stringify({ token, removed: before, pointsRemoved: Number(points[0].total) })]
    );

    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [marker]);
    await client.query('COMMIT');

    console.log(`launch reset "${token}" applied: removed ${JSON.stringify(before)} and ${points[0].total} points; accounts kept`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`launch reset failed and was rolled back: ${err.message}`);
  }
}
