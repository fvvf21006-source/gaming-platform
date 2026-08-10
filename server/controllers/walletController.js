// Wallet controller — HTTP request/response handling only. No
// business logic and no SQL; both delegate to walletService.

import * as walletService from '../services/walletService.js';

export async function getWallet(req, res, next) {
  try {
    const wallet = await walletService.getWallet(req.user.userId);

    res.status(200).json({ wallet });
  } catch (err) {
    next(err);
  }
}

export async function transfer(req, res, next) {
  try {
    const { recipientId, amount } = req.body;

    const transaction = await walletService.transferPoints({
      senderId: req.user.userId,
      recipientId,
      amount,
    });

    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
}

export async function transactions(req, res, next) {
  try {
    const result = await walletService.getTransactionHistory(req.user.userId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function adjustBalance(req, res, next) {
  try {
    const { userId, operation, amount, reason } = req.body;

    const result = await walletService.adjustBalance({
      adminId: req.user.userId,
      adminRole: req.user.role,
      targetUserId: userId,
      operation,
      amount,
      reason,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
