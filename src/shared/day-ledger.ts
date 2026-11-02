/**
 * ThreeKingdoms-AgentEngine: Per-system day ledger (src/shared/day-ledger.ts)
 *
 * Every subsystem that advances on a campaign day must be idempotent for that
 * day. `world_day_ledger` is the single marker: `(system, game_date)` is unique,
 * so replaying a day is a no-op instead of a second sale, spoilage roll or
 * consumption draw.
 */

import type { DatabaseService } from '../core/database';

export function hasProcessedDay(db: DatabaseService, system: string, gameDate: string): boolean {
  const row = db.queryOne<{ ok: number }>(
    'SELECT 1 AS ok FROM world_day_ledger WHERE system = ? AND game_date = ? LIMIT 1;',
    [system, gameDate]
  );
  return Boolean(row);
}

export function markProcessedDay(
  db: DatabaseService,
  system: string,
  gameDate: string,
  result: unknown = null
): void {
  db.execute(
    `INSERT INTO world_day_ledger (system, game_date, result_json)
     VALUES (?, ?, ?)
     ON CONFLICT(system, game_date) DO NOTHING;`,
    [system, gameDate, result === null ? null : JSON.stringify(result)]
  );
}
