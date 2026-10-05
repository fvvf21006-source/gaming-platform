// Unbiased random helpers backed by the Web Crypto API (Math.random is not
// suitable for outcomes that decide a player's score).

/** Uniform float in [0, 1). */
export function randomFloat(): number {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  // 53 bits of entropy, same construction as a double mantissa.
  return (buf[0] * 2 ** 21 + (buf[1] >>> 11)) / 2 ** 53;
}

/** Uniform integer in [0, max). */
export function randomInt(max: number): number {
  return Math.floor(randomFloat() * max);
}

/** Picks an index from a list of positive weights. */
export function weightedIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = randomFloat() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}
