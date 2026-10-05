// Game controller — HTTP request/response handling only. No
// business logic and no SQL; both delegate to gameService.

import * as gameService from '../services/gameService.js';

export async function list(req, res, next) {
  try {
    const result = await gameService.listGames();

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function play(req, res, next) {
  try {
    const session = await gameService.playGame({
      userId: req.user.userId,
      gameId: req.params.id,
    });

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

export async function complete(req, res, next) {
  try {
    const session = await gameService.completeSession({
      userId: req.user.userId,
      sessionId: req.params.sessionId,
      score: req.body.score,
    });

    res.status(200).json({ session });
  } catch (err) {
    next(err);
  }
}

export async function history(req, res, next) {
  try {
    const result = await gameService.getHistory(req.user.userId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getActiveSessions(req, res, next) {
  try {
    const result = await gameService.getActiveSessions(req.user.userId, req.user.role);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function alter(req, res, next) {
  try {
    const session = await gameService.alterSession({
      requesterId: req.user.userId,
      requesterRole: req.user.role,
      sessionId: req.params.sessionId,
      score: req.body.score ?? 0,
      reason: req.body.reason,
    });

    res.status(200).json({ session });
  } catch (err) {
    next(err);
  }
}


export async function presetOutcome(req, res, next) {
  try {
    const session = await gameService.presetSessionOutcome({
      requesterId: req.user.userId,
      requesterRole: req.user.role,
      sessionId: req.params.sessionId,
      score: Number(req.body.score),
    });

    res.status(200).json({ session });
  } catch (err) {
    next(err);
  }
}

export async function getOutcome(req, res, next) {
  try {
    const result = await gameService.getSessionOutcome({
      userId: req.user.userId,
      sessionId: req.params.sessionId,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function presetNext(req, res, next) {
  try {
    const outcome = await gameService.presetNextOutcome({
      requesterId: req.user.userId,
      requesterRole: req.user.role,
      playerId: req.params.playerId,
      gameId: req.body.gameId ?? undefined,
      score: Number(req.body.score),
    });

    res.status(200).json({ outcome });
  } catch (err) {
    next(err);
  }
}

export async function clearNext(req, res, next) {
  try {
    await gameService.clearNextOutcome({
      requesterId: req.user.userId,
      requesterRole: req.user.role,
      playerId: req.params.playerId,
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function listNext(req, res, next) {
  try {
    const result = await gameService.listNextOutcomes({
      requesterId: req.user.userId,
      requesterRole: req.user.role,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
