/**
 * Parses human-readable duration strings to hours (float).
 *
 * Examples:
 *   "1h30m"  → 1.5
 *   "1h30"   → 1.5
 *   "90min"  → 1.5
 *   "90m"    → 1.5
 *   "1.5h"   → 1.5
 *   "1.5"    → 1.5
 *   "90"     → 90  (treated as hours)
 *
 * Returns null if unparseable.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern: Xh Ym or XhYm or Xh Y or Xh (with optional minutes)
  // e.g. "1h30m", "1h 30m", "1h30", "1h 30", "2h"
  const hoursMinutes = trimmed.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+(?:\.\d+)?)\s*m?$/i);
  if (hoursMinutes) {
    const hours = parseFloat(hoursMinutes[1]);
    const minutes = parseFloat(hoursMinutes[2]);
    return round4(hours + minutes / 60);
  }

  // Pattern: Xh only (e.g. "2h", "1.5h")
  const hoursOnly = trimmed.match(/^(\d+(?:\.\d+)?)\s*h$/i);
  if (hoursOnly) {
    return round4(parseFloat(hoursOnly[1]));
  }

  // Pattern: Xmin or Xm (e.g. "90min", "90m", "45m")
  const minutesOnly = trimmed.match(/^(\d+(?:\.\d+)?)\s*min$/i);
  if (minutesOnly) {
    return round4(parseFloat(minutesOnly[1]) / 60);
  }

  const minutesShort = trimmed.match(/^(\d+(?:\.\d+)?)\s*m$/i);
  if (minutesShort) {
    return round4(parseFloat(minutesShort[1]) / 60);
  }

  // Pattern: plain number (treated as hours)
  const plain = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) {
    return round4(parseFloat(plain[1]));
  }

  return null;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
