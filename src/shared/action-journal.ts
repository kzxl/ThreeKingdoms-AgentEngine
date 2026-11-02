/**
 * Idempotency + action journal for service-level mutations.
 *
 * SimCore already logs and deduplicates with `action_log`. Newer controllers
 * (trade, military, farm, obligations, contracts, intel) did not, so a retried
 * request could double-pay. This helper gives them the same contract without a
 * framework: read an optional `idempotencyKey` from the request, replay the
 * stored result when present, otherwise run the mutation and record it.
 */

import { DatabaseService } from '../core/database';
import { nextSequentialId } from './id-generator';

export function requestIdempotencyKey(ctx: any): string | null {
  const body = ctx?.body || {};
  const header = ctx?.req?.headers?.['idempotency-key']
    || ctx?.req?.headers?.['Idempotency-Key'];
  const raw = body.idempotencyKey || body.idempotency_key || header;
  if (!raw) return null;
  const key = String(raw).trim();
  return key ? key.slice(0, 120) : null;
}

function parseResult(value: unknown): any {
  if (value === null || value === undefined) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

/** Returns the stored result for a key, or null when this is a fresh action. */
export function findIdempotentResult(db: DatabaseService, key: string | null): any | null {
  if (!key) return null;
  const row = db.queryOne<{ result: string }>(
    'SELECT result FROM action_log WHERE idempotency_key = ? LIMIT 1;',
    [key]
  );
  return row ? parseResult(row.result) : null;
}

/**
 * Records the action after a successful mutation. `key` may be null for
 * intentional repeatable actions; those are still visible in the journal.
 */
export function recordAction(
  db: DatabaseService,
  input: {
    key: string | null;
    actionType: string;
    payload?: unknown;
    result?: unknown;
    status?: string;
    errorMessage?: string | null;
  }
): string {
  const meta = db.queryOne<{ campaign_id: string; active_turn: number; d: string }>(
    'SELECT campaign_id, active_turn, "current_date" AS d FROM campaign_meta LIMIT 1;'
  ) || {} as any;
  const gameDate = meta.d || '184-05-02';
  const actionId = nextSequentialId(db, 'action_log', 'ACT', gameDate);
  let resultJson = '{"ok":true}';
  let payloadJson = '{}';
  try {
    resultJson = JSON.stringify(input.result ?? { ok: true });
  } catch {
    resultJson = '{"ok":true}';
  }
  try {
    payloadJson = JSON.stringify(input.payload ?? {});
  } catch {
    payloadJson = '{}';
  }
  db.execute(
    `INSERT INTO action_log
      (action_id, idempotency_key, campaign_id, turn_number, game_date, action_type, payload, result, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      actionId,
      input.key,
      meta.campaign_id || 'CMP-UNKNOWN',
      Number(meta.active_turn || 1),
      gameDate,
      input.actionType,
      payloadJson,
      resultJson,
      input.status || 'SUCCESS',
      input.errorMessage || null
    ]
  );
  return actionId;
}

/** Convenience wrapper for a mutation that can be replayed verbatim. */
export function runIdempotentAction<T>(
  db: DatabaseService,
  input: {
    key: string | null;
    actionType: string;
    payload?: unknown;
    run: () => T;
  }
): { result: T; replayed: boolean } {
  const prior = findIdempotentResult(db, input.key);
  if (prior !== null) return { result: prior as T, replayed: true };

  return db.transaction(() => {
    const recheck = findIdempotentResult(db, input.key);
    if (recheck !== null) return { result: recheck as T, replayed: true };
    const result = input.run();
    recordAction(db, {
      key: input.key,
      actionType: input.actionType,
      payload: input.payload,
      result
    });
    return { result, replayed: false };
  });
}
