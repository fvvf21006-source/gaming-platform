// Single source of truth for the casino games' maths. Keep in sync with
// MAX_SCORE_MULTIPLIER in server/services/gameService.js, which rejects any
// score above buy-in × multiplier.

/** Fraction of wagered points returned on average (house edge = 1 - RTP). */
export const TARGET_RTP = 0.96;

export const MAX_MULTIPLIER = {
  wheel: 100,
  slots: 20,
  mines: 100,
  crash: 100,
} as const;
