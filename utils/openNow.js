/**
 * Open-now utility — pure business-hours logic with no external dependencies.
 *
 * Extracted from discovery.service.js so it can be unit-tested without
 * requiring a database connection or dotenv.
 *
 * The SQL subquery in discovery.service.js mirrors this exact logic,
 * keeping database-side and application-side behaviour consistent.
 */

/**
 * Determines whether a business is currently open based on its hours records.
 *
 * Handles:
 *   - Normal hours  (opens_at < closes_at): e.g. 08:00–18:00
 *   - Overnight hours (opens_at >= closes_at): e.g. 18:00–02:00
 *   - Explicitly closed days (is_closed = 1 / true)
 *   - Days with no hours record (treated as closed/unknown)
 *   - Days with null times (treated as closed)
 *
 * Time comparisons use lexicographic string comparison which is correct for
 * "HH:MM:SS" formatted strings (the format MySQL returns for TIME columns).
 *
 * @param {Array<{day_of_week: number, opens_at: string|null, closes_at: string|null, is_closed: number|boolean}>} hoursRows
 *   All business_hours rows for this business (may span multiple days).
 * @param {number} dayOfWeek
 *   Current day (0=Sunday … 6=Saturday, matching JS Date.getDay() and the schema).
 * @param {string} currentTime
 *   Current time as "HH:MM:SS" string.
 * @returns {boolean}
 */
export function isOpenNow(hoursRows, dayOfWeek, currentTime) {
  const todayRow = hoursRows.find(
    (r) => Number(r.day_of_week) === dayOfWeek
  );

  // No record for today — hours not set, treat as closed
  if (!todayRow) return false;

  // Explicitly closed day
  if (Number(todayRow.is_closed) === 1 || todayRow.is_closed === true) {
    return false;
  }

  const opens = todayRow.opens_at;
  const closes = todayRow.closes_at;

  // Hours not configured for this day
  if (!opens || !closes) return false;

  const now = currentTime;

  if (opens < closes) {
    // Normal hours: open when opens ≤ now ≤ closes
    return now >= opens && now <= closes;
  } else {
    // Overnight hours (e.g. 18:00–02:00): open when now ≥ opens OR now ≤ closes
    return now >= opens || now <= closes;
  }
}
