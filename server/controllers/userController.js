// User controller — HTTP request/response handling only. No
// business logic and no SQL; both delegate to userService.

import * as userService from '../services/userService.js';
import { methodNotAllowed } from '../utils/httpErrors.js';

export async function create(req, res, next) {
  try {
    const { username, email, password, role, status, fullName, displayName } = req.body;

    const user = await userService.createUser({
      requesterId: req.user.userId,
      requesterRole: req.user.role,
      username,
      email,
      password,
      role,
      status,
      fullName,
      displayName,
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const result = await userService.getVisibleUsers(req.user.userId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.user.userId, req.params.id);

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { email, status, fullName, displayName, avatarUrl } = req.body;

    const user = await userService.updateUser(req.user.userId, req.params.id, {
      email,
      status,
      fullName,
      displayName,
      avatarUrl,
    });

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const user = await userService.updateUserStatus(req.user.userId, req.params.id, req.body.status);

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export function remove(req, res, next) {
  try {
    throw methodNotAllowed('User deletion is not supported');
  } catch (err) {
    next(err);
  }
}
