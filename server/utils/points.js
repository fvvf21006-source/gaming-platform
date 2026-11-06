/** Validates point amounts before PostgreSQL can round them silently. */
export function isPointAmount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    && Number.isSafeInteger(Math.round(value * 100))
    && Math.round(value * 100) / 100 === value;
}
