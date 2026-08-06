// Auth service — all authentication business logic lives here.
// No SQL (that's the repository's job), no req/res objects (that's
// the controller's job).

import { findUserByUsername, findUserById } from '../repositories/authRepository.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { createLogEntry } from '../repositories/auditRepository.js';

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

// Records a login attempt for the reporting module's login report
// (BR-26). Deliberately swallows its own errors — a failure to write
// the audit trail must never turn a real login (success or failure)
// into an unrelated 500, so this is best-effort, not transactional
// with the login itself.
async function recordLoginAttempt({ actorId, success, reason, attemptedUsername }) {
  try {
    await createLogEntry({
      actorId: actorId ?? null,
      action: success ? 'login_success' : 'login_failed',
      entityType: 'user',
      entityId: actorId ?? null,
      metadata: success ? null : { reason, attemptedUsername: attemptedUsername ?? null },
    });
  } catch (err) {
    console.error('Failed to record login audit log entry:', err.message);
  }
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
    await recordLoginAttempt({ actorId: null, success: false, reason: 'invalid_credentials', attemptedUsername: username });
    throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.status === 'frozen') {
    await recordLoginAttempt({ actorId: user.id, success: false, reason: 'account_frozen' });
    throw forbidden('This account is frozen');
  }

  const passwordMatches = await comparePassword(password, user.password_hash);

  if (!passwordMatches) {
    await recordLoginAttempt({ actorId: user.id, success: false, reason: 'invalid_credentials' });
    throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  await recordLoginAttempt({ actorId: user.id, success: true });

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
