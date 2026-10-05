// Single source of truth for the casino games' maths. Keep in sync with
// server/services/gameService.js (MAX_SCORE_MULTIPLIER) and
// server/utils/casinoOutcomes.js, which validate scores and presets.

/** Fraction of wagered points returned on average (house edge = 1 - RTP). */
export const TARGET_RTP = 0.96;

export const MAX_MULTIPLIER = {
  wheel: 100,
  slots: 20,
  mines: 100,
  crash: 100,
} as const;

export const WHEEL_MULTIPLIERS = [0, 0.5, 1, 1.5, 2, 3, 5, 10, 100];
export const SLOT_MULTIPLIERS = [0, 1.5, 2, 3, 5, 8, 10, 20];

export const MINES_GRID = 25;
export const MINES_COUNT = 4;
export const MINES_SAFE_TILES = MINES_GRID - MINES_COUNT;

/**
 * Fair multiplier after `safeRevealed` safe tiles: the inverse of the
 * probability of surviving that many picks, scaled by the target RTP, so
 * cashing out at any point has the same expected return (~96%).
 */
export function minesMultiplier(safeRevealed: number): number {
  if (safeRevealed <= 0) return 1;
  let survive = 1;
  for (let i = 0; i < safeRevealed; i++) survive *= (MINES_SAFE_TILES - i) / (MINES_GRID - i);
  return Math.min(Number((TARGET_RTP / survive).toFixed(2)), MAX_MULTIPLIER.mines);
}

/** Every payout multiplier Mines can end on; index n = n safe tiles, 0 = lost. */
export const MINES_MULTIPLIERS = [0, ...Array.from({ length: MINES_SAFE_TILES }, (_, i) => minesMultiplier(i + 1))];

export type OutcomeKind = "wheel" | "slots" | "mines" | "crash" | "free";

export function outcomeKindFor(gameName?: string): OutcomeKind {
  const n = (gameName ?? "").toLowerCase();
  if (n.includes("wheel")) return "wheel";
  if (n.includes("slot")) return "slots";
  if (n.includes("mine")) return "mines";
  if (n.includes("crash") || n.includes("rocket")) return "crash";
  return "free";
}

/** The fixed set of multipliers a game can end on, or null if it accepts any. */
export function discreteMultipliers(kind: OutcomeKind): number[] | null {
  if (kind === "wheel") return WHEEL_MULTIPLIERS;
  if (kind === "slots") return SLOT_MULTIPLIERS;
  if (kind === "mines") return MINES_MULTIPLIERS;
  return null;
}

/** Points paid for a buy-in at a multiplier. Server and client must round identically. */
export function payoutFor(pointCost: number, multiplier: number): number {
  return Math.round(pointCost * multiplier);
}
