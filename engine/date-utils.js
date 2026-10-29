/**
 * ThreeKingdoms-AgentEngine: Simulation Calendar & Date Utilities (engine/date-utils.js)
 *
 * Implements standardized historical date arithmetic across turns, caravans, and transit:
 * - Deterministic month and day progressions based on the 184 AD Han Dynasty calendar
 * - Season inference (Xuân / Hạ / Thu / Đông)
 * - Bilingual date formatting for chronicle logs and UI displays
 */

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const GAME_CONSTANTS = require('../config/game-constants.json');
const DAYS_PER_MONTH = GAME_CONSTANTS.calendar.daysPerMonth;
const MONTHS_PER_YEAR = GAME_CONSTANTS.calendar.monthsPerYear;
const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const FALLBACK_DATE = GAME_CONSTANTS.calendar.fallbackDate;
const FALLBACK_PARTS = FALLBACK_DATE.split('-').map(Number);

/**
 * Parses a game date string into numeric year, month, and day components.
 * Defaults to 184-05-01 if invalid or empty.
 *
 * @param {string|null|undefined} dateStr
 * @returns {{ year: number, month: number, day: number }}
 */
function parseGameDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { year: FALLBACK_PARTS[0], month: FALLBACK_PARTS[1], day: FALLBACK_PARTS[2] };
  }
  const clean = dateStr.trim().replace(/[/.]/g, '-');
  const parts = clean.split('-').map(p => parseInt(p, 10));
  const year = isNaN(parts[0]) ? FALLBACK_PARTS[0] : parts[0];
  const month = isNaN(parts[1]) || parts[1] < 1 || parts[1] > MONTHS_PER_YEAR ? FALLBACK_PARTS[1] : parts[1];
  const day = isNaN(parts[2]) || parts[2] < 1 || parts[2] > DAYS_PER_MONTH ? FALLBACK_PARTS[2] : parts[2];
  return { year, month, day };
}

/**
 * Formats numeric components into canonical YYYY-MM-DD representation.
 *
 * @param {number} year
 * @param {number} month
 * @param {number} [day=1]
 * @returns {string}
 */
function formatGameDate(year, month, day = 1) {
  const y = Math.max(1, Math.round(year));
  const m = String(Math.max(1, Math.min(MONTHS_PER_YEAR, Math.round(month)))).padStart(2, '0');
  const d = String(Math.max(1, Math.min(DAYS_PER_MONTH, Math.round(day)))).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Advances a game date by a specified number of months.
 *
 * @param {string} dateStr - Starting date string (e.g. '184-05-02')
 * @param {number} [monthsToAdd=1] - Number of months to advance
 * @param {boolean} [resetDayToOne=true] - Whether to reset day to 01 (standard turn transition)
 * @returns {string} - Resulting date string (e.g. '184-06-01')
 */
function advanceCalendarMonth(dateStr, monthsToAdd = 1, resetDayToOne = true) {
  const parsed = parseGameDate(dateStr);
  const totalMonths = parsed.year * MONTHS_PER_YEAR + (parsed.month - 1) + Math.round(monthsToAdd);
  const nextYear = Math.floor(totalMonths / MONTHS_PER_YEAR);
  const nextMonth = (totalMonths % MONTHS_PER_YEAR) + 1;
  const nextDay = resetDayToOne ? 1 : Math.min(parsed.day, DAYS_PER_MONTH);
  return formatGameDate(nextYear, nextMonth, nextDay);
}

/**
 * Advances a game date by a specified number of days (assuming standard 30-day campaign months).
 *
 * @param {string} dateStr - Starting date string
 * @param {number} [daysToAdd=1] - Number of days to add
 * @returns {string} - Resulting date string
 */
function addDaysToDate(dateStr, daysToAdd = 1) {
  const parsed = parseGameDate(dateStr);
  let totalDays = (parsed.year * DAYS_PER_YEAR) + ((parsed.month - 1) * DAYS_PER_MONTH) + (parsed.day - 1) + Math.round(daysToAdd);
  if (totalDays < 0) totalDays = 0;

  const nextYear = Math.floor(totalDays / DAYS_PER_YEAR);
  const remainderDays = totalDays % DAYS_PER_YEAR;
  const nextMonth = Math.floor(remainderDays / DAYS_PER_MONTH) + 1;
  const nextDay = (remainderDays % DAYS_PER_MONTH) + 1;

  return formatGameDate(nextYear, nextMonth, nextDay);
}

/**
 * Resolves season info based on month component.
 *
 * @param {string} dateStr
 * @returns {{ seasonVi: string, seasonEn: string, quarter: number }}
 */
function getSeasonInfo(dateStr) {
  const { month } = parseGameDate(dateStr);
  if (month >= 1 && month <= 3) {
    return { seasonVi: 'Xuân (Đầu Năm)', seasonEn: 'Spring', quarter: 1 };
  } else if (month >= 4 && month <= 6) {
    return { seasonVi: 'Hạ Khởi (Giữa Năm)', seasonEn: 'Summer', quarter: 2 };
  } else if (month >= 7 && month <= 9) {
    return { seasonVi: 'Thu Trầm (Mùa Gặt)', seasonEn: 'Autumn', quarter: 3 };
  } else {
    return { seasonVi: 'Đông Hàn (Cuối Năm)', seasonEn: 'Winter', quarter: 4 };
  }
}

/**
 * Formats a game date into a human-readable Vietnamese string.
 *
 * @param {string} dateStr - e.g. '184-06-01'
 * @returns {string} - e.g. 'Ngày 01 tháng 06 năm 184'
 */
function formatDateVi(dateStr) {
  const { year, month, day } = parseGameDate(dateStr);
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `Ngày ${d} tháng ${m} năm ${year}`;
}

/**
 * Formats a game date into an English string.
 *
 * @param {string} dateStr - e.g. '184-06-01'
 * @returns {string} - e.g. 'June 1, 184 AD'
 */
function formatDateEn(dateStr) {
  const { year, month, day } = parseGameDate(dateStr);
  const mName = MONTH_NAMES_EN[month - 1] || 'Unknown';
  return `${mName} ${day}, ${year} AD`;
}

/**
 * Calculates elapsed months between two date strings (toDate - fromDate).
 *
 * @param {string} fromDateStr
 * @param {string} toDateStr
 * @returns {number}
 */
function calculateMonthDiff(fromDateStr, toDateStr) {
  const from = parseGameDate(fromDateStr);
  const to = parseGameDate(toDateStr);
  return (to.year * MONTHS_PER_YEAR + to.month) - (from.year * MONTHS_PER_YEAR + from.month);
}

module.exports = {
  parseGameDate,
  formatGameDate,
  advanceCalendarMonth,
  addDaysToDate,
  getSeasonInfo,
  formatDateVi,
  formatDateEn,
  calculateMonthDiff
};
