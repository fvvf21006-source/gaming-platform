// Account status rules — a frozen account blocks itself and everyone
// beneath it in the hierarchy, but never the accounts above it.

import * as userRepository from '../repositories/userRepository.js';

/**
 * True if the user is frozen themselves or any ancestor is frozen.
 * @param {{id: string, status: string}} user
 */
export async function isEffectivelyFrozen(user) {
  if (user.status === 'frozen') {
    return true;
  }

  return userRepository.hasFrozenAncestor(user.id);
}
