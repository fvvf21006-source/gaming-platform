// Wallet service — all wallet business logic lives here. No SQL
// (that's the repository's job), no req/res objects (that's the
// controller's job).

import * as walletRepository from '../repositories/walletRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { forbidden, notFound, conflict } from '../utils/httpErrors.js';
import { createNotification } from './notificationService.js';
import { logAction } from './auditService.js';

function toPublicWallet(row) {
  return {
    id: row.id,
    userId: row.user_id,
    balance: row.balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublicTransaction(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    amount: row.amount,
    senderBalanceAfter: row.sender_balance_after,
    recipientBalanceAfter: row.recipient_balance_after,
    transactionType: row.transaction_type,
    createdAt: row.created_at,
  };
}

/**
 * Returns the caller's own wallet. Super Admin has none (FR-3.1) —
 * that's a 404, not an empty/zero wallet, so it isn't mistaken for
 * a real zero balance.
 * @param {string} userId
 */
export async function getWallet(userId) {
  const wallet = await walletRepository.findWalletByUserId(userId);

  if (!wallet) {
    throw notFound('This account does not have a wallet');
  }

  return toPublicWallet(wallet);
}

/**
 * Transfers points from the caller to a direct child account
 * (rules 2–13 in this milestone; BR-10 to BR-14 and BR-18 in
 * 05_BUSINESS_RULES.md). Sender and recipient are both re-fetched
 * from the database rather than trusted from the JWT, since status
 * (frozen) and hierarchy (created_by) can only be known fresh.
 * @param {{senderId: string, recipientId: string, amount: number}} input
 */
export async function transferPoints({ senderId, recipientId, amount }) {
  const sender = await userRepository.findUserById(senderId);

  if (!sender) {
    throw notFound('Sender not found');
  }

  if (sender.role === 'player') {
    throw forbidden('Players cannot transfer points');
  }

  if (sender.status === 'frozen') {
    throw forbidden('A frozen account cannot transfer points');
  }

  if (senderId === recipientId) {
    throw forbidden('Cannot transfer points to yourself');
  }

  const recipient = await userRepository.findUserById(recipientId);

  if (!recipient) {
    throw notFound('Recipient not found');
  }

  if (recipient.status === 'frozen') {
    throw forbidden('Cannot transfer points to a frozen account');
  }

  // Points move exactly one tier down, to an account the sender
  // directly created — the same created_by relationship P04 uses
  // for hierarchy checks. This alone enforces "direct child",
  // "exactly one level down", and "within the sender's hierarchy"
  // (rules 2–5, 8) in a single check.
  if (recipient.created_by !== senderId) {
    throw forbidden('Recipient is not in your direct hierarchy');
  }

  let transaction;

  // Super Admin has no wallet and no balance limit (FR-3.1, P08
  // Part 1) — everyone else goes through the exact same
  // balance-checked path as before this change, unmodified.
  if (sender.role === 'super_admin') {
    try {
      transaction = await walletRepository.transferFromUnlimitedSender({ senderId, recipientId, amount });
    } catch (err) {
      if (err.code === 'RECIPIENT_WALLET_NOT_FOUND') {
        throw notFound('Recipient wallet not found');
      }
      throw err;
    }
  } else {
    try {
      transaction = await walletRepository.transferPoints({ senderId, recipientId, amount });
    } catch (err) {
      if (err.code === 'INSUFFICIENT_BALANCE') {
        throw conflict('Insufficient balance');
      }
      if (err.code === 'RECIPIENT_WALLET_NOT_FOUND') {
        throw notFound('Recipient wallet not found');
      }
      throw err;
    }
  }

  await createNotification({
    userId: senderId,
    type: 'wallet_transfer',
    message: `You sent ${amount} points to ${recipient.username}.`,
  });

  await createNotification({
    userId: recipientId,
    type: 'wallet_transfer',
    message: `You received ${amount} points from ${sender.username}.`,
  });

  await logAction({
    actorId: senderId,
    action: 'wallet_transfer',
    entityType: 'wallet_transaction',
    entityId: transaction.id,
    metadata: { sender: sender.username, recipient: recipient.username, amount },
  });

  return toPublicTransaction(transaction);
}

/**
 * Returns the caller's transaction history (sent or received),
 * newest first.
 * @param {string} userId
 */
export async function getTransactionHistory(userId) {
  const rows = await walletRepository.getTransactions(userId);
  const items = rows.map(toPublicTransaction);

  return { items, total: items.length };
}

const OPERATION_VERBS = { add: 'added to', remove: 'removed from', set: 'set on' };

/**
 * Administratively adds, removes, or sets a user's balance (P08
 * Part 2). Super Admin may adjust anyone; a hierarchy admin
 * (Level 1–3) may only adjust someone in their own hierarchy — the
 * same self-or-descendant visibility rule BR-8 already uses
 * elsewhere (broader than transferPoints' direct-child-only rule,
 * since this is an administrative action, not a peer-to-peer
 * transfer).
 * @param {{adminId: string, adminRole: string, targetUserId: string, operation: 'add'|'remove'|'set', amount: number, reason: string}} input
 */
export async function adjustBalance({ adminId, adminRole, targetUserId, operation, amount, reason }) {
  const target = await userRepository.findUserById(targetUserId);

  if (!target) {
    throw notFound('User not found');
  }

  if (target.role === 'super_admin') {
    throw forbidden('Super Admin has no wallet to adjust');
  }

  if (adminRole !== 'super_admin') {
    const inHierarchy = await userRepository.isSelfOrDescendant(adminId, targetUserId);

    if (!inHierarchy) {
      throw forbidden('User is outside your hierarchy');
    }
  }

  let result;

  try {
    result = await walletRepository.adjustBalance({ adminId, targetUserId, operation, amount });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_BALANCE') {
      throw conflict('This adjustment would make the balance negative');
    }
    if (err.code === 'WALLET_NOT_FOUND') {
      throw notFound('User has no wallet');
    }
    throw err;
  }

  await createNotification({
    userId: targetUserId,
    type: 'points_adjusted',
    message: `${amount} points were ${OPERATION_VERBS[operation]} your balance. Reason: ${reason}`,
  });

  await logAction({
    actorId: adminId,
    action: 'points_adjusted',
    entityType: 'wallet_transaction',
    entityId: result.transaction?.id ?? targetUserId,
    metadata: { targetUserId, operation, amount, reason, oldBalance: result.oldBalance, newBalance: result.newBalance },
  });

  return {
    transaction: result.transaction ? toPublicTransaction(result.transaction) : null,
    oldBalance: result.oldBalance,
    newBalance: result.newBalance,
  };
}
