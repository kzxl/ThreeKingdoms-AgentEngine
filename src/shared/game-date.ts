/**
 * ThreeKingdoms-AgentEngine: Game Calendar Arithmetic (src/shared/game-date.ts)
 *
 * Campaign dates use the 30-day month / 12-month year calendar in
 * `config/game-constants.json`. `Date` arithmetic must follow that calendar,
 * not the Gregorian one, or day 30 spills into a non-existent day 31.
 */

import { CALENDAR } from './constants';

const DAYS_PER_MONTH = Number(CALENDAR.daysPerMonth || 30);
const MONTHS_PER_YEAR = Number(CALENDAR.monthsPerYear || 12);
const FALLBACK_DATE = String(CALENDAR.fallbackDate || '184-05-02');
const FALLBACK_PARTS = FALLBACK_DATE.split('-').map(Number);

export interface GameDateParts {
  year: number;
  month: number;
  day: number;
}

export function parseGameDate(date?: string | null): GameDateParts {
  const parts = String(date || FALLBACK_DATE).trim().replace(/[/.]/g, '-').split('-').map(Number);
  const year = Number.isFinite(parts[0]) && parts[0] > 0 ? Math.round(parts[0]) : FALLBACK_PARTS[0];
  const month = Number.isFinite(parts[1]) && parts[1] >= 1 && parts[1] <= MONTHS_PER_YEAR
    ? Math.round(parts[1])
    : FALLBACK_PARTS[1];
  const day = Number.isFinite(parts[2]) && parts[2] >= 1 && parts[2] <= DAYS_PER_MONTH
    ? Math.round(parts[2])
    : FALLBACK_PARTS[2];
  return { year, month, day };
}

export function formatGameDate(year: number, month: number, day: number): string {
  const y = Math.max(1, Math.round(year));
  const m = String(Math.max(1, Math.min(MONTHS_PER_YEAR, Math.round(month)))).padStart(2, '0');
  const d = String(Math.max(1, Math.min(DAYS_PER_MONTH, Math.round(day)))).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function gameDayOrdinal(date?: string | null): number {
  const parsed = parseGameDate(date);
  return ((parsed.year * MONTHS_PER_YEAR) + (parsed.month - 1)) * DAYS_PER_MONTH + (parsed.day - 1);
}

export function addGameDays(date: string | null | undefined, days: number): string {
  const total = Math.max(0, gameDayOrdinal(date) + Math.round(Number(days) || 0));
  const year = Math.floor(total / (MONTHS_PER_YEAR * DAYS_PER_MONTH));
  const remainder = total % (MONTHS_PER_YEAR * DAYS_PER_MONTH);
  const month = Math.floor(remainder / DAYS_PER_MONTH) + 1;
  const day = (remainder % DAYS_PER_MONTH) + 1;
  return formatGameDate(year, month, day);
}
