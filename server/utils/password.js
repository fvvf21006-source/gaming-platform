// Password hashing utility. All password work in the codebase must
// go through these two functions — nothing else should call bcrypt
// directly, so the hashing strategy (cost factor, algorithm) stays
// in one place.

import bcrypt from 'bcrypt';
import crypto from 'crypto';

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

// Characters chosen to avoid visually ambiguous ones (0/O, 1/l/I)
// since a human has to read and retype this once.
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/**
 * Generates a strong random temporary password for an administrative
 * password reset (P08 Part 4). Never accepts an admin-chosen value —
 * callers cannot pass a password in; this always generates one.
 * @param {number} length
 * @returns {string} plaintext temporary password — caller must hash
 *   it before storing and must not persist the plaintext anywhere
 */
export function generateTemporaryPassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }

  return password;
}
