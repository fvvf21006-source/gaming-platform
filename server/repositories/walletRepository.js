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
export const WALLET_NOT_FOUND = 'WALLET_NOT_FOUND';

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
       RETURNING id, sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, transaction_type, created_at`,
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
 * Credits the recipient and records the transaction, for a sender
 * with no wallet and no balance limit (Super Admin only — FR-3.1,
 * P08 Part 1). No debit happens because there is nothing to debit;
 * sender_balance_after is recorded as NULL rather than a number,
 * since there is no real balance to report. Still one atomic
 * transaction, same as transferPoints, in case the recipient credit
 * or the transaction insert fails partway.
 * @param {{senderId: string, recipientId: string, amount: number}} input
 * @returns the newly created wallet_transactions row
 */
export async function transferFromUnlimitedSender({ senderId, recipientId, amount }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const creditResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1, updated_at = now()
       WHERE user_id = $2
       RETURNING balance`,
      [amount, recipientId]
    );

    if (creditResult.rowCount === 0) {
      const err = new Error('Recipient wallet not found');
      err.code = RECIPIENT_WALLET_NOT_FOUND;
      throw err;
    }

    const recipientBalanceAfter = creditResult.rows[0].balance;

    const transactionResult = await client.query(
      `INSERT INTO wallet_transactions (sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, transaction_type)
       VALUES ($1, $2, $3, NULL, $4, 'transfer')
       RETURNING id, sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, transaction_type, created_at`,
      [senderId, recipientId, amount, recipientBalanceAfter]
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
 * Administratively adds, removes, or sets a user's balance (P08
 * Part 2). Unlike transferPoints, this isn't a peer-to-peer
 * hierarchy transfer, so it uses SELECT ... FOR UPDATE to lock the
 * row and compute the new balance in application code rather than
 * the conditional-UPDATE-as-guard idiom transferPoints uses — 'set'
 * can't be expressed as a simple "WHERE balance >= x" guard the way
 * a debit can, so all three operations go through one consistent,
 * still-atomic path. No business rules here (hierarchy, reason
 * validation) — those live in walletService.
 *
 * If the operation would leave the balance negative, throws with
 * code INSUFFICIENT_BALANCE (same sentinel transferPoints uses) and
 * rolls back. If the delta is zero (e.g. a 'set' to the current
 * balance), no wallet_transactions row is written — amount there
 * must be positive (chk_wallet_transactions_amount_positive) and a
 * true no-op has nothing to record — but the caller still gets the
 * unchanged balance back so it can still notify/audit-log if desired.
 * @param {{adminId: string, targetUserId: string, operation: 'add'|'remove'|'set', amount: number}} input
 * @returns {{transaction: object|null, oldBalance: number, newBalance: number}}
 */
export async function adjustBalance({ adminId, targetUserId, operation, amount }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query('SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE', [
      targetUserId,
    ]);

    if (current.rowCount === 0) {
      const err = new Error('Wallet not found');
      err.code = WALLET_NOT_FOUND;
      throw err;
    }

    const oldBalance = Number(current.rows[0].balance);
    let newBalance;

    if (operation === 'add') {
      newBalance = oldBalance + amount;
    } else if (operation === 'remove') {
      newBalance = oldBalance - amount;
    } else {
      newBalance = amount;
    }

    if (newBalance < 0) {
      const err = new Error('Insufficient balance');
      err.code = INSUFFICIENT_BALANCE;
      throw err;
    }

    await client.query('UPDATE wallets SET balance = $1, updated_at = now() WHERE user_id = $2', [
      newBalance,
      targetUserId,
    ]);

    const delta = newBalance - oldBalance;
    let transaction = null;

    if (delta !== 0) {
      const transactionType = `admin_${operation}`;

      const transactionResult = await client.query(
        `INSERT INTO wallet_transactions (sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, transaction_type)
         VALUES ($1, $2, $3, NULL, $4, $5)
         RETURNING id, sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, transaction_type, created_at`,
        [adminId, targetUserId, Math.abs(delta), newBalance, transactionType]
      );

      transaction = transactionResult.rows[0];
    }

    await client.query('COMMIT');
    return { transaction, oldBalance, newBalance };
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
    `SELECT id, sender_id, recipient_id, amount, sender_balance_after, recipient_balance_after, transaction_type, created_at
     FROM wallet_transactions
     WHERE sender_id = $1 OR recipient_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}
