// Small, dependency-free CSV serialization helper. Shared, stateless
// — fits the existing utils/ convention alongside jwt.js/password.js.
// No business logic: callers decide what goes in each row.

/**
 * Escapes a single CSV field per RFC 4180: wraps in quotes if it
 * contains a comma, quote, or newline, doubling any interior quotes.
 * @param {*} value
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) {
    return '';
  }

  // pg returns timestamptz columns as JS Date objects. String(date)
  // uses the verbose, locale-dependent toString() format — use the
  // same ISO 8601 format the JSON response already gets for free
  // via JSON.stringify's automatic toJSON() call, so CSV and JSON
  // stay consistent.
  const str = value instanceof Date ? value.toISOString() : String(value);

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of flat objects into a CSV string, using the
 * keys of the first object as the header row. Returns an empty
 * string (no header) if the array is empty.
 * @param {object[]} items
 */
export function toCsv(items) {
  if (!items || items.length === 0) {
    return '';
  }

  const columns = Object.keys(items[0]);
  const headerRow = columns.map(escapeCsvField).join(',');

  const dataRows = items.map((item) => columns.map((col) => escapeCsvField(item[col])).join(','));

  return [headerRow, ...dataRows].join('\r\n');
}
