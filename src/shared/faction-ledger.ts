/**
 * Faction/world treasury ledger (src/shared/faction-ledger.ts).
 *
 * The player has a double-entry ledger; the world did not. Every faction
 * treasury change now goes through this helper, which updates
 * `session_factions.treasury_cash` and appends a `faction_ledger` row in one
 * transaction. The auditor can then prove the opening balance plus every flow
 * equals the current treasury.
 */

import { DatabaseService } from '../core/database';
import { nextSequentialId } from './id-generator';

export interface FactionEntryInput {
  factionId: string;
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
      "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='faction_ledger';"
    ));
  } catch {
    return false;
  }
}

/**
 * Ensures a faction has an OPENING row. A faction created at runtime (rebel
 * warlord) has no ledger yet; the first read or write seeds its opening at the
 * treasury value at that moment.
 */
export function ensureFactionOpening(
  db: DatabaseService,
  factionId: string,
  gameDate?: string
): void {
  if (!tableExists(db)) return;
  const existing = db.queryOne<{ ok: number }>(
    'SELECT 1 AS ok FROM faction_ledger WHERE faction_id = ? LIMIT 1;',
    [factionId]
  );
  if (existing) return;
  const treasury = Number(db.queryOne<{ treasury_cash: number }>(
    'SELECT treasury_cash FROM session_factions WHERE faction_id = ? LIMIT 1;',
    [factionId]
  )?.treasury_cash || 0);
  const date = gameDate || currentDate(db);
  db.execute(
    `INSERT OR IGNORE INTO faction_ledger
      (entry_id, faction_id, game_date, category, counterparty, inflow, outflow, balance_after, memo)
     VALUES (?, ?, ?, 'OPENING', 'Khởi tạo', ?, 0, ?, 'Số dư ngân khố đầu kỳ');`,
    [`FLE-OPEN-${factionId}`, factionId, date, treasury, treasury]
  );
}

export function postFactionEntry(
  db: DatabaseService,
  input: FactionEntryInput
): { entryId: string; balance: number; inflow: number; outflow: number } {
  const inflow = Math.max(0, Math.round(Number(input.inflow || 0)));
  const requestedOutflow = Math.max(0, Math.round(Number(input.outflow || 0)));
  const date = input.gameDate || currentDate(db);

  return db.transaction(() => {
    ensureFactionOpening(db, input.factionId, date);
    const current = Number(db.queryOne<{ treasury_cash: number }>(
      'SELECT treasury_cash FROM session_factions WHERE faction_id = ? LIMIT 1;',
      [input.factionId]
    )?.treasury_cash || 0);
    // Never let a treasury go negative; log the amount actually paid.
    const outflow = Math.min(requestedOutflow, current + inflow);
    const balance = current + inflow - outflow;
    const entryId = nextSequentialId(db, 'faction_ledger', 'FLE', date);
    db.execute(
      `INSERT INTO faction_ledger
        (entry_id, faction_id, game_date, category, counterparty, inflow, outflow, balance_after, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [entryId, input.factionId, date, input.category, input.counterparty || null, inflow, outflow, balance, input.memo]
    );
    db.execute(
      'UPDATE session_factions SET treasury_cash = ?, updated_at = CURRENT_TIMESTAMP WHERE faction_id = ?;',
      [balance, input.factionId]
    );
    return { entryId, balance, inflow, outflow };
  });
}

/** Opening + inflow - outflow for a faction, for the auditor. */
export function factionLedgerBalance(
  db: DatabaseService,
  factionId: string
): { opening: number; net: number; expected: number } | null {
  if (!tableExists(db)) return null;
  const row = db.queryOne<{ opening: number; inflow: number; outflow: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN category = 'OPENING' THEN inflow ELSE 0 END), 0) AS opening,
       COALESCE(SUM(CASE WHEN category <> 'OPENING' THEN inflow ELSE 0 END), 0) AS inflow,
       COALESCE(SUM(outflow), 0) AS outflow
     FROM faction_ledger WHERE faction_id = ?;`,
    [factionId]
  );
  if (!row) return null;
  const opening = Number(row.opening || 0);
  const net = Number(row.inflow || 0) - Number(row.outflow || 0);
  return { opening, net, expected: opening + net };
}
