// Presence service — who is currently signed in with the app open.

import * as userRepository from '../repositories/userRepository.js';
import { forbidden } from '../utils/httpErrors.js';

const ONLINE_WINDOW_SECONDS = 90;
const CAN_VIEW_ONLINE = ['super_admin', 'level_3'];

/**
 * @param {string} userId
 */
export async function recordHeartbeat(userId) {
  await userRepository.touchLastSeen(userId);
}

/**
 * Online players under the requester (everyone for Super Admin).
 * @param {{requesterId: string, requesterRole: string}} input
 */
export async function listOnlinePlayers({ requesterId, requesterRole }) {
  if (!CAN_VIEW_ONLINE.includes(requesterRole)) {
    throw forbidden('Only Level 3 users and administrators can view online players');
  }

  const rows = await userRepository.findOnlinePlayers({
    requesterId,
    isGlobal: requesterRole === 'super_admin',
    withinSeconds: ONLINE_WINDOW_SECONDS,
  });

  const items = rows.map((row) => ({ id: row.id, username: row.username, lastSeenAt: row.last_seen_at }));

  return { items, total: items.length };
}
