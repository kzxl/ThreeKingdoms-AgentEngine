/**
 * ThreeKingdoms-AgentEngine: Financial Transaction & Double-Entry Ledger Engine
 * (src/shared/financial-transaction.ts)
 *
 * Atomically records cashflow transactions, dual-entry accounting journals (Dr == Cr),
 * player liquid cash updates, and synchronizes game/PROGRESS.md to preserve 100% audit integrity.
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../core/database';
import { syncProgressProjection } from './projection-sync';
import { nextId } from './id-generator';
import { ACCOUNT_CODES } from './account-codes';

export interface FinancialTxInput {
  category: string;
  counterparty: string;
  memo: string;
  inflow?: number;
  outflow?: number;
  gameDate?: string;
  debitAccount?: string;
  creditAccount?: string;
}

export interface FinancialTxResult {
  txnId: string;
  oldBalance: number;
  newBalance: number;
  inflow: number;
  outflow: number;
}

export function recordFinancialTransaction(
  db: DatabaseService,
  input: FinancialTxInput
): FinancialTxResult {
  const inflow = Math.max(0, Math.round(Number(input.inflow || 0)));
  const outflow = Math.max(0, Math.round(Number(input.outflow || 0)));

  if (inflow === 0 && outflow === 0) {
    const player = db.queryOne<{ liquid_cash: number }>('SELECT liquid_cash FROM player_state WHERE player_id = \'PLY-0001\';');
    const balance = Number(player?.liquid_cash || 0);
    return { txnId: 'TXN-NOOP', oldBalance: balance, newBalance: balance, inflow: 0, outflow: 0 };
  }

  // 1. Fetch current player cash & campaign meta
  const player = db.queryOne<{ liquid_cash: number; safe_cash: number; fixed_capital: number }>(
    'SELECT liquid_cash, safe_cash, fixed_capital FROM player_state WHERE player_id = \'PLY-0001\';'
  );
  if (!player) throw new Error('Player state PLY-0001 not found.');

  const oldLiquidCash = Number(player.liquid_cash || 0);
  const safeCash = Number(player.safe_cash || 0);
  if (outflow > oldLiquidCash) {
    throw new Error(`Insufficient funds: requires ${outflow} quan, available ${oldLiquidCash} quan.`);
  }

  const newLiquidCash = oldLiquidCash + inflow - outflow;
  const newLedgerBalance = newLiquidCash + safeCash;

  let gameDate = input.gameDate;
  // Read the campaign identity once: the date must be quoted (`current_date` is a
  // SQLite keyword) and the campaign id must not be hardcoded per playthrough.
  const meta = db.queryOne<{ campaign_id: string; current_date: string }>(
    'SELECT campaign_id, "current_date" AS current_date FROM campaign_meta LIMIT 1;'
  );
  if (!gameDate) {
    gameDate = meta?.current_date || '184-06-01';
  }

  const txnId = nextId(db, 'cashflow', 'TXN', gameDate);
  const campaignId = meta?.campaign_id || 'CMP-184-ZHOU-01';

  // 2. Insert into cashflow_ledger
  db.execute(
    `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'POSTED');`,
    [
      txnId,
      gameDate,
      input.counterparty,
      input.category,
      inflow,
      outflow,
      newLedgerBalance,
      input.memo
    ]
  );

  // 3. Insert balanced double-entry journal entries
  const amount = inflow > 0 ? inflow : outflow;
  if (inflow > 0) {
    // Inflow: Dr Cash, Cr Revenue
    const debAccount = input.debitAccount || ACCOUNT_CODES.cashMobile;
    const crAccount = input.creditAccount || ACCOUNT_CODES.salesRevenue;

    db.execute(
      `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'));`,
      [txnId, campaignId, gameDate, debAccount, amount, input.memo]
    );

    db.execute(
      `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'));`,
      [txnId, campaignId, gameDate, crAccount, amount, input.memo]
    );
  } else {
    // Outflow: Dr Expense, Cr Cash
    const debAccount = input.debitAccount || ACCOUNT_CODES.operatingExpense;
    const crAccount = input.creditAccount || ACCOUNT_CODES.cashMobile;

    db.execute(
      `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'));`,
      [txnId, campaignId, gameDate, debAccount, amount, input.memo]
    );

    db.execute(
      `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'));`,
      [txnId, campaignId, gameDate, crAccount, amount, input.memo]
    );
  }

  // 4. Update player_state liquid_cash
  db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = \'PLY-0001\';', [newLiquidCash]);

  // 5. Refresh the game/PROGRESS.md projection in-process.
  syncProgressProjection(db);

  return {
    txnId,
    oldBalance: oldLiquidCash,
    newBalance: newLiquidCash,
    inflow,
    outflow
  };
}
