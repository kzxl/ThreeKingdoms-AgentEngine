/**
 * Settlement treasury ledger (src/shared/settlement-ledger.ts).
 *
 * Mirrors the faction ledger: every settlement treasury change updates
 * `session_settlements.treasury_cash` and appends one `settlement_ledger` row in
 * a transaction, so `opening + inflow - outflow = treasury_cash` is auditable.
 */

import { DatabaseService } from '../core/database';
import { nextSequentialId } from './id-generator';

export interface SettlementEntryInput {
  settlementId: string;
  gameDate?: string;
  category: string;
  counterparty?: string;
  inflow?: number;
  outflow?: number;
  memo: string;
}

function currentDate(db: DatabaseService): string {
  return db.queryOne<{ d: string }>(
    'SELECT "current_date" AS d FROM campaign_meta LIMIT 1;'
  )?.d || '184-05-02';
}

function tableExists(db: DatabaseService): boolean {
  try {
    return Boolean(db.queryOne<{ ok: number }>(
      "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='settlement_ledger';"
    ));
  } catch {
    return false;
  }
}

export function ensureSettlementOpening(
  db: DatabaseService,
  settlementId: string,
  gameDate?: string
): void {
  if (!tableExists(db)) return;
  const existing = db.queryOne<{ ok: number }>(
    'SELECT 1 AS ok FROM settlement_ledger WHERE settlement_id = ? LIMIT 1;',
    [settlementId]
  );
  if (existing) return;
  const treasury = Number(db.queryOne<{ treasury_cash: number }>(
    'SELECT treasury_cash FROM session_settlements WHERE settlement_id = ? LIMIT 1;',
    [settlementId]
  )?.treasury_cash || 0);
  const date = gameDate || currentDate(db);
  db.execute(
    `INSERT OR IGNORE INTO settlement_ledger
      (entry_id, settlement_id, game_date, category, counterparty, inflow, outflow, balance_after, memo)
     VALUES (?, ?, ?, 'OPENING', 'Khởi tạo', ?, 0, ?, 'Số dư ngân khố thành trì đầu kỳ');`,
    [`SLE-OPEN-${settlementId}`, settlementId, date, treasury, treasury]
  );
}

export function postSettlementEntry(
  db: DatabaseService,
  input: SettlementEntryInput
): { entryId: string; balance: number; inflow: number; outflow: number } {
  const inflow = Math.max(0, Math.round(Number(input.inflow || 0)));
  const requestedOutflow = Math.max(0, Math.round(Number(input.outflow || 0)));
  const date = input.gameDate || currentDate(db);

  return db.transaction(() => {
    ensureSettlementOpening(db, input.settlementId, date);
    const current = Number(db.queryOne<{ treasury_cash: number }>(
      'SELECT treasury_cash FROM session_settlements WHERE settlement_id = ? LIMIT 1;',
      [input.settlementId]
    )?.treasury_cash || 0);
    const outflow = Math.min(requestedOutflow, current + inflow);
    const balance = current + inflow - outflow;
    const entryId = nextSequentialId(db, 'settlement_ledger', 'SLE', date);
    db.execute(
      `INSERT INTO settlement_ledger
        (entry_id, settlement_id, game_date, category, counterparty, inflow, outflow, balance_after, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [entryId, input.settlementId, date, input.category, input.counterparty || null, inflow, outflow, balance, input.memo]
    );
    db.execute(
      'UPDATE session_settlements SET treasury_cash = ?, updated_at = CURRENT_TIMESTAMP WHERE settlement_id = ?;',
      [balance, input.settlementId]
    );
    return { entryId, balance, inflow, outflow };
  });
}
