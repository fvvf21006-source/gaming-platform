// Game repository — the only layer permitted to contain SQL for
// game-catalog and game-session data access. No business logic here
// (no balance/ownership/status decisions) — those live in gameService.

import pool from '../database/connection.js';

/**
 * Returns every active game, joined with its category name.
 */
export async function findActiveGames() {
  const result = await pool.query(
    `SELECT
       g.id,
       g.name,
       g.description,
       g.point_cost,
       c.name AS category
     FROM games g
     LEFT JOIN game_categories c ON c.id = g.category_id
     WHERE g.is_active = true
     ORDER BY g.name ASC`
  );

  return result.rows;
}

/**
 * Finds a single game by id, regardless of active status — the
 * caller (gameService) decides what an inactive game means.
 * @param {string} id
 */
export async function findGameById(id) {
  const result = await pool.query(
    `SELECT id, name, description, point_cost, is_active, category_id
     FROM games
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

// Same sentinel-error convention as walletRepository.transferPoints:
// the repository signals *why* the atomic update affected zero rows,
// and the service translates that into the right HTTP error.
export const INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE';

// Game points flow through the Super Admin's "house" wallet: a buy-in moves
// from the player to the house, and the score is paid back out of it when
// the round ends. Whatever a player loses therefore stays with the house.

async function findHouseUserId(client) {
  const result = await client.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'super_admin'
     ORDER BY u.created_at ASC
     LIMIT 1`
  );

  return result.rows[0]?.id ?? null;
}

async function recordGameTransaction(client, tx) {
  await client.query(
    `INSERT INTO wallet_transactions
       (sender_id, recipient_id, amount,
        sender_balance_before, sender_balance_after,
        recipient_balance_before, recipient_balance_after,
        performed_by, transaction_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      tx.senderId, tx.recipientId, tx.amount,
      tx.senderBefore, tx.senderAfter,
      tx.recipientBefore, tx.recipientAfter,
      tx.performedBy, tx.type,
    ]
  );
}

/**
 * Pays a finished session's score to the player out of the house wallet.
 * Super Admin is an unlimited issuer (see transferFromUnlimitedSender), so a
 * win larger than the house balance is still paid in full; the house wallet
 * is simply floored at zero rather than going negative. Runs inside the
 * caller's transaction.
 */
async function payOutScore(client, { userId, gameId, score, performedBy }) {
  if (!(score > 0)) return;

  // Only casino games report points won; an arcade score is just a score.
  const game = await client.query(`SELECT pays_out FROM games WHERE id = $1`, [gameId]);
  if (!game.rows[0]?.pays_out) return;

  const credit = await client.query(
    `UPDATE wallets
     SET balance = balance + $1, updated_at = now()
     WHERE user_id = $2
     RETURNING balance`,
    [score, userId]
  );

  if (credit.rowCount === 0) return;

  const playerAfter = Number(credit.rows[0].balance);
  const houseId = await findHouseUserId(client);
  if (!houseId) return;

  const house = await client.query(`SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [houseId]);
  const houseBefore = house.rows[0] ? Number(house.rows[0].balance) : 0;
  const houseAfter = Math.max(houseBefore - score, 0);

  if (house.rows[0]) {
    await client.query(`UPDATE wallets SET balance = $1, updated_at = now() WHERE user_id = $2`, [houseAfter, houseId]);
  }

  await recordGameTransaction(client, {
    type: 'game_payout',
    senderId: houseId,
    recipientId: userId,
    amount: score,
    senderBefore: houseBefore,
    senderAfter: houseAfter,
    recipientBefore: playerAfter - score,
    recipientAfter: playerAfter,
    performedBy,
  });
}

/**
 * Debits the player's wallet by the game's point cost and creates
 * the game session, in a single database transaction — the same
 * atomic-conditional-UPDATE pattern walletRepository.transferPoints
 * uses, so the sufficient-balance check is race-safe without
 * explicit row locking. If the debit affects zero rows, the player
 * didn't have enough balance and the whole transaction rolls back.
 *
 * No business rules here (frozen checks, game-active checks) — the
 * caller (gameService) is expected to have already validated those.
 * @param {{userId: string, gameId: string, pointCost: number}} input
 * @returns {{session: object, walletBalance: number}}
 */
export async function startGameSession({ userId, gameId, pointCost }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const debitResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1, updated_at = now()
       WHERE user_id = $2 AND balance >= $1
       RETURNING balance`,
      [pointCost, userId]
    );

    if (debitResult.rowCount === 0) {
      const err = new Error('Insufficient balance');
      err.code = INSUFFICIENT_BALANCE;
      throw err;
    }

    const walletBalance = debitResult.rows[0].balance;

    const sessionResult = await client.query(
      `INSERT INTO game_sessions (user_id, game_id, points_spent, status)
       VALUES ($1, $2, $3, 'in_progress')
       RETURNING id, user_id, game_id, points_spent, score, status, started_at, completed_at`,
      [userId, gameId, pointCost]
    );

    // The buy-in goes to the Super Admin house wallet (created on first use).
    const houseId = await findHouseUserId(client);

    if (houseId) {
      const house = await client.query(
        `INSERT INTO wallets (user_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE
           SET balance = wallets.balance + EXCLUDED.balance, updated_at = now()
         RETURNING balance`,
        [houseId, pointCost]
      );
      const houseAfter = Number(house.rows[0].balance);

      await recordGameTransaction(client, {
        type: 'game_buy_in',
        senderId: userId,
        recipientId: houseId,
        amount: pointCost,
        senderBefore: Number(walletBalance) + pointCost,
        senderAfter: Number(walletBalance),
        recipientBefore: houseAfter - pointCost,
        recipientAfter: houseAfter,
        performedBy: userId,
      });
    }

    await client.query('COMMIT');
    return { session: sessionResult.rows[0], walletBalance };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Finds a single game session by id.
 * @param {string} id
 */
export async function findSessionById(id) {
  const result = await pool.query(
    `SELECT id, user_id, game_id, points_spent, score, status, started_at, completed_at, is_altered, altered_by, alteration_reason, forced_score
     FROM game_sessions
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Marks a session completed and records its score — but only if it
 * is still in_progress. The WHERE status = 'in_progress' clause is
 * a conditional update used as a guard (same idiom as the wallet
 * debit): if it affects zero rows, the session was already
 * completed or abandoned, and the caller (gameService) turns that
 * into the appropriate error.
 * @param {string} id
 * @param {number} score
 */
export async function completeSession(id, score) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE game_sessions
       SET status = 'completed', score = $1, completed_at = now()
       WHERE id = $2 AND status = 'in_progress'
       RETURNING id, user_id, game_id, points_spent, score, status, started_at, completed_at, is_altered, altered_by, alteration_reason`,
      [score, id]
    );
    const session = result.rows[0];

    if (!session) {
      await client.query('ROLLBACK');
      return null;
    }

    await payOutScore(client, { userId: session.user_id, gameId: session.game_id, score: Number(session.score), performedBy: session.user_id });

    await client.query('COMMIT');
    return session;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Returns a user's own game sessions, newest first, joined with the
 * game's name.
 * @param {string} userId
 */
export async function findSessionsByUserId(userId) {
  const result = await pool.query(
    `SELECT
       s.id,
       s.user_id,
       s.game_id,
       g.name AS game_name,
       s.points_spent,
       s.score,
       s.status,
       s.started_at,
       s.completed_at,
       s.is_altered,
       s.altered_by,
       s.alteration_reason
     FROM game_sessions s
     JOIN games g ON g.id = s.game_id
     WHERE s.user_id = $1
     ORDER BY s.started_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Returns all active (in_progress) game sessions for players in the requester's hierarchy.
 * @param {string} requesterId
 * @param {string} requesterRole
 */
export async function findActiveSessionsForAncestors(requesterId, requesterRole) {
  const result = await pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM users WHERE created_by = $1
       UNION ALL
       SELECT u.id FROM users u
       JOIN descendants d ON u.created_by = d.id
     )
     SELECT
       s.id,
       s.user_id,
       u.username AS player_username,
       s.game_id,
       g.name AS game_name,
       s.points_spent,
       s.score,
       s.status,
       s.started_at,
       s.completed_at,
       s.is_altered,
       s.altered_by,
       s.alteration_reason,
       s.forced_score
     FROM game_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN games g ON g.id = s.game_id
     WHERE s.status = 'in_progress'
       AND ($2 = 'super_admin' OR s.user_id IN (SELECT id FROM descendants))
     ORDER BY s.started_at DESC`,
    [requesterId, requesterRole]
  );

  return result.rows;
}

/**
 * Forcibly alters an in_progress session (e.g. setting score to 0 / forced loss).
 * @param {{sessionId: string, alteredBy: string, score?: number, reason?: string}} input
 */
export async function alterGameSession({ sessionId, alteredBy, score = 0, reason }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE game_sessions
       SET status = 'completed',
           score = $1,
           is_altered = true,
           altered_by = $2,
           alteration_reason = $3,
           completed_at = now()
       WHERE id = $4 AND status = 'in_progress'
       RETURNING id, user_id, game_id, points_spent, score, status, started_at, completed_at, is_altered, altered_by, alteration_reason`,
      [score, alteredBy, reason || 'Altered by Level 3 agent', sessionId]
    );
    const session = result.rows[0];

    if (!session) {
      await client.query('ROLLBACK');
      return null;
    }

    await payOutScore(client, { userId: session.user_id, gameId: session.game_id, score: Number(session.score), performedBy: alteredBy });

    await client.query('COMMIT');
    return session;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


/**
 * Presets the final score of an in_progress session. Returns null if the
 * session is no longer in progress.
 * @param {{sessionId: string, forcedBy: string, score: number}} input
 */
export async function setForcedScore({ sessionId, forcedBy, score }) {
  const result = await pool.query(
    `UPDATE game_sessions
     SET forced_score = $1, forced_by = $2
     WHERE id = $3 AND status = 'in_progress'
     RETURNING id, user_id, game_id, points_spent, score, status, started_at, completed_at, is_altered, altered_by, alteration_reason, forced_score`,
    [score, forcedBy, sessionId]
  );

  return result.rows[0] || null;
}
