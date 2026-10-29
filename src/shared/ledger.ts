/**
 * ThreeKingdoms-AgentEngine: Player Ledger Balance
 * (src/shared/ledger.ts)
 *
 * The cashflow ledger's `balance` column has exactly one meaning:
 *
 *     player_state.liquid_cash + player_state.safe_cash
 *
 * Business working capital (`businesses.safe_cash`) is NOT player cash: it only
 * becomes a player inflow when withdrawn as a dividend. Writers must derive the
 * balance from this function instead of the previous row (which silently
 * double-counts the vault) or from liquid cash alone (which drops it).
 */

import { DatabaseService } from '../core/database';

export interface PlayerCapital {
  liquid: number;
  safe: number;
  /** Total player capital, the canonical ledger `balance`. */
  total: number;
}

export function getPlayerCapital(db: DatabaseService, playerId = 'PLY-0001'): PlayerCapital {
  const row = db.queryOne<{ liquid_cash: number; safe_cash: number }>(
    'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?;',
    [playerId]
  );
  const liquid = Number(row?.liquid_cash || 0);
  const safe = Number(row?.safe_cash || 0);
  return { liquid, safe, total: liquid + safe };
}

export interface CashflowEntryInput {
  txnId: string;
  gameDate: string;
  counterparty: string;
  category: string;
  inflow?: number;
  outflow?: number;
  memo: string;
  status?: string;
  /**
   * Closing balance for this transaction. Pass it when the player cash update
   * already ran; omit to compute
   * `current capital + inflow - outflow` (call before the cash update).
   */
  balance?: number;
}

/** Minimal raw better-sqlite3 surface, for callers outside DatabaseService. */
export interface RawStatementDb {
  prepare(sql: string): { run(...params: unknown[]): unknown };
}

const CASHFLOW_INSERT_SQL = `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;

function normalizeFlow(value: unknown): number {
  return Math.max(0, Math.round(Number(value || 0)));
}

/**
 * Single writer for the player cashflow ledger.
 *
 * The `balance` column means player capital (liquid + personal vault) after the
 * transaction. Centralising the INSERT keeps every caller on one definition;
 * the arch guard freezes the remaining direct INSERTs until they migrate.
 */
export function postCashflowEntry(db: DatabaseService, input: CashflowEntryInput): number {
  const inflow = normalizeFlow(input.inflow);
  const outflow = normalizeFlow(input.outflow);
  const balance = input.balance !== undefined
    ? Math.round(Number(input.balance))
    : Math.round(getPlayerCapital(db).total + inflow - outflow);

  db.execute(CASHFLOW_INSERT_SQL, [
    input.txnId,
    input.gameDate,
    input.counterparty,
    input.category,
    inflow,
    outflow,
    balance,
    input.memo,
    input.status || 'Confirmed'
  ]);

  return balance;
}

/**
 * Same writer for raw better-sqlite3 connections (instance bootstrap, engine
 * tools). The caller supplies the explicit closing balance.
 */
export function postCashflowEntryRaw(rawDb: RawStatementDb, input: CashflowEntryInput & { balance: number }): number {
  const balance = Math.round(Number(input.balance));
  rawDb.prepare(CASHFLOW_INSERT_SQL).run(
    input.txnId,
    input.gameDate,
    input.counterparty,
    input.category,
    normalizeFlow(input.inflow),
    normalizeFlow(input.outflow),
    balance,
    input.memo,
    input.status || 'Confirmed'
  );
  return balance;
}
