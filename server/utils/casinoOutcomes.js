// Which results each casino game can actually produce, so a supervisor can
// only preset an outcome the game is able to show. Keep in sync with
// client/src/components/game/casinoConfig.ts.

const TARGET_RTP = 0.96;
const MAX_MULTIPLIER = 100;

const WHEEL_MULTIPLIERS = [0, 0.5, 1, 1.5, 2, 3, 5, 10, 100];
const SLOT_MULTIPLIERS = [0, 1.5, 2, 3, 5, 8, 10, 20];

const MINES_GRID = 25;
const MINES_SAFE_TILES = 21;

/** Multiplier after n safe Mines tiles, index 0 meaning a loss on the first tile. */
function minesMultipliers() {
  const list = [0];
  let survive = 1;
  for (let n = 1; n <= MINES_SAFE_TILES; n++) {
    survive *= (MINES_SAFE_TILES - (n - 1)) / (MINES_GRID - (n - 1));
    list.push(Math.min(Number((TARGET_RTP / survive).toFixed(2)), MAX_MULTIPLIER));
  }
  return list;
}

const DISCRETE_OUTCOMES = {
  'Lucky Wheel': WHEEL_MULTIPLIERS,
  'Slot Machine': SLOT_MULTIPLIERS,
  'Mines Field': minesMultipliers(),
};

/**
 * True if score is a payout the game can show for a given buy-in.
 * Games with no entry here (the arcade games) accept any non-negative score.
 */
export function isPresettableScore(gameName, pointCost, score) {
  const discrete = DISCRETE_OUTCOMES[gameName];

  if (discrete) {
    return discrete.some((m) => Math.round(pointCost * m) === score);
  }

  if (gameName === 'Crash Rocket') {
    // Crashing at 1.00x pays nothing; any other result is a cash-out at 1.00x or higher.
    return score === 0 || (score >= pointCost && score <= pointCost * MAX_MULTIPLIER);
  }

  return true;
}
