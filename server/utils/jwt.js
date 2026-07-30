// JWT utility. All token creation/verification in the codebase must
// go through these two functions, so the payload shape and secret
// handling stay in one place.

import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Signs a JWT for an authenticated user.
 * Payload is intentionally minimal: userId, username, role.
 * @param {{ userId: string, username: string, role: string }} payload
 * @returns {string}
 */
export function signToken(payload) {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

/**
 * Verifies a JWT and returns its decoded payload.
 * Throws if the token is missing, malformed, expired, or has an
 * invalid signature — callers (middleware) are expected to catch this.
 * @param {string} token
 * @returns {{ userId: string, username: string, role: string, iat: number, exp: number }}
 */
export function verifyToken(token) {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.verify(token, env.jwtSecret);
}
