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
