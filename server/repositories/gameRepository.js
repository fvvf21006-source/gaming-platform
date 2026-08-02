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
    `SELECT id, user_id, game_id, points_spent, score, status, started_at, completed_at
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
  const result = await pool.query(
    `UPDATE game_sessions
     SET status = 'completed', score = $1, completed_at = now()
     WHERE id = $2 AND status = 'in_progress'
     RETURNING id, user_id, game_id, points_spent, score, status, started_at, completed_at`,
    [score, id]
  );

  return result.rows[0] || null;
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
       s.completed_at
     FROM game_sessions s
     JOIN games g ON g.id = s.game_id
     WHERE s.user_id = $1
     ORDER BY s.started_at DESC`,
    [userId]
  );

  return result.rows;
}
