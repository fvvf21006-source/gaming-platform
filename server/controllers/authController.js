// Auth controller — HTTP request/response handling only. No
// business logic and no SQL; both delegate to authService.

import * as authService from '../services/authService.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const { token, user } = await authService.login(username, password);

    res.status(200).json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
