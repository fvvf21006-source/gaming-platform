// Auth service — all authentication business logic lives here.
// No SQL (that's the repository's job), no req/res objects (that's
// the controller's job).

import { findUserByUsername, findUserById } from '../repositories/authRepository.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password';

function unauthorized(message) {
  const err = new Error(message);
  err.status = 401;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

/**
 * Validates credentials and returns a signed JWT plus the public
 * user record. Frozen accounts cannot log in (BR-17).
 * @param {string} username
 * @param {string} password
 */
export async function login(username, password) {
  const user = await findUserByUsername(username);

  // Same generic message whether the username doesn't exist or the
  // password is wrong, so a caller can't enumerate valid usernames.
  if (!user) {
    throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.status === 'frozen') {
    throw forbidden('This account is frozen');
  }

  const passwordMatches = await comparePassword(password, user.password_hash);

  if (!passwordMatches) {
    throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return { token, user: toPublicUser(user) };
}

/**
 * Retrieves the current authenticated user's public record by id
 * (from the verified JWT payload), re-checked against the database
 * rather than trusting the token payload alone.
 * @param {string} userId
 */
export async function getCurrentUser(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw notFound('User not found');
  }

  return toPublicUser(user);
}
