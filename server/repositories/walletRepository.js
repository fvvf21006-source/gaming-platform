// Wallet repository — the only layer permitted to contain SQL for
// wallet data access. No business logic here (no hierarchy rules,
// no authorization decisions) — those live in walletService.

import pool from '../database/connection.js';

/**
 * Finds a wallet by its owner's user id. Returns null if the user
 * has no wallet (Super Admin has none, per FR-3.1).
 * @param {string} userId
 */
export async function findWalletByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, balance, created_at, updated_at
     FROM wallets
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

// Postgres error code / sentinel used to signal "the debit couldn't
// happen because the sender doesn't have enough balance" up to the
// service layer, the same way P04's repository lets a Postgres
// unique_violation bubble up for the service to translate into a 409.
export const INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE';
export const RECIPIENT_WALLET_NOT_FOUND = 'RECIPIENT_WALLET_NOT_FOUND';

/**
 * Debits the sender, credits the recipient, and records the
 * transaction, all in one database transaction (BR-12 to BR-14 in
 * this milestone's task, BR-10 to BR-14 in 05_BUSINESS_RULES.md).
 *
 * The debit is a single conditional UPDATE (`WHERE balance >= amount`)
 * rather than a separate SELECT + check, so the sufficient-balance
 * check is atomic against concurrent transfers — no explicit row
 * locking needed. If it affects zero rows, the sender didn't have
 * enough balance, and the whole transaction is rolled back.
 *
 * No hierarchy/permission checks here — the caller (walletService)
 * is expected to have already validated those.
 * @param {{senderId: string, recipientId: string, amount: number}} input
 * @returns the newly created wallet_transactions row
 */
export async function transferPoints({ senderId, recipientId, amount }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const debitResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1, updated_at = now()
       WHERE user_id = $2 AND balance >= $1
       RETURNING balance`,
      [amount, senderId]
    );

    if (debitResult.rowCount === 0) {
      const err = new Error('Insufficient balance');
      err.code = INSUFFICIENT_BALANCE;
      throw err;
    }

    const senderBalanceAfter = debitResult.rows[0].balance;

    const creditResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1, updated_at = now()
       WHERE user_id = $2
       RETURNING balance`,
      [amount, recipientId]
    );

    if (creditResult.rowCount === 0) {
      // Every non-Super-Admin user gets a wallet at creation (P04),
      // so this should be unreachable — guarded anyway rather than
      // silently debiting the sender with nowhere for the points to go.
      const err = new Error('Recipient wallet not found');
      err.code = RECIPIENT_WALLET_NOT_FOUND;
      throw err;
    }

    const recipientBalanceAfter = creditResult.rows[0].balance;

    const transactionResult = await client.query(
      `INSERT INTO wallet_transactions (sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, created_at`,
      [senderId, recipientId, amount, senderBalanceAfter, recipientBalanceAfter]
    );

    await client.query('COMMIT');
    return transactionResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Returns every transaction where the user was sender or recipient,
 * newest first.
 * @param {string} userId
 */
export async function getTransactions(userId) {
  const result = await pool.query(
    `SELECT id, sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, created_at
     FROM wallet_transactions
     WHERE sender_id = $1 OR recipient_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}
