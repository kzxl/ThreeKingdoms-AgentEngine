/**
 * ThreeKingdoms-AgentEngine: Game Clock Helper (src/shared/game-clock.ts)
 *
 * `current_date` is a SQLite keyword, so it must be quoted on every read.
 * Centralised here so services cannot reintroduce the wall-clock bug.
 */

import { DatabaseService } from '../core/database';
import { CALENDAR } from './constants';

export function getGameDate(db: DatabaseService, fallback = CALENDAR.fallbackDate): string {
  try {
    const row = db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;');
    if (row?.d) return row.d;
  } catch {
    // Campaign metadata missing (fresh sandbox).
  }
  return fallback;
}
