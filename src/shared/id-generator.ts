/**
 * ThreeKingdoms-AgentEngine: Deterministic Identifier Generator
 * (src/shared/id-generator.ts)
 *
 * Persisted identifiers must not depend on the wall clock: two actions in the
 * same millisecond collided, and replays produced different keys. IDs derive
 * from the row count of the owning table instead, which is deterministic for
 * the single-writer model.
 */

import { DatabaseService } from '../core/database';

/**
 * @param table   internal table name (constant, never user input)
 * @param prefix  e.g. 'TXN', 'MOV', 'DUEL'
 * @param gameDate in-game date used as the middle segment
 */
export function nextSequentialId(
  db: DatabaseService,
  table: string,
  prefix: string,
  gameDate: string
): string {
  const compact = String(gameDate || '184-05-02').replace(/-/g, '');
  // arch-guard:allow-sql-interpolation — `table` is an internal constant, never user input.
  const row = db.queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM ${table};`);
  const seq = String(Number(row?.c || 0) + 1).padStart(6, '0');
  return `${prefix}-${compact}-${seq}`;
}

/**
 * Bare counter for ids whose format is composed elsewhere.
 * Same persistence guarantees as nextId, without the prefix/date wrapper.
 */
export function nextSequenceValue(db: DatabaseService, scope: string): number {
  return db.transaction(() => {
    db.execute('INSERT INTO id_sequence (scope, next_value) VALUES (?, 0) ON CONFLICT(scope) DO NOTHING;', [scope]);
    db.execute('UPDATE id_sequence SET next_value = next_value + 1 WHERE scope = ?;', [scope]);
    const row = db.queryOne<{ v: number }>('SELECT next_value AS v FROM id_sequence WHERE scope = ?;', [scope]);
    return Number(row?.v || 1);
  });
}

/**
 * Persistent per-scope counter. Use for identifiers whose owning table is not
 * obvious (chronicles, hooks, instance folders) or that must not collide across
 * restarts. The scope is an internal constant.
 */
export function nextId(
  db: DatabaseService,
  scope: string,
  prefix: string,
  gameDate: string
): string {
  const compact = String(gameDate || '184-05-02').replace(/-/g, '');
  const value = nextSequenceValue(db, scope);
  return `${prefix}-${compact}-${String(value).padStart(6, '0')}`;
}
