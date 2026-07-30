// Password hashing utility. All password work in the codebase must
// go through these two functions — nothing else should call bcrypt
// directly, so the hashing strategy (cost factor, algorithm) stays
// in one place.

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password. Used only at registration/account
 * creation time — never at login.
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * Used only at login — never re-hash the login attempt.
 * @param {string} plainPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
