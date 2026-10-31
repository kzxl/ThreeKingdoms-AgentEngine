/**
 * Ledger completeness: every cashflow row has a balanced journal pair.
 *
 * Covers the migration backfill for historical orphan rows and the
 * `postDoubleEntry` helper used by wage/dividend/capital paths.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration049 = require('../tools/migrations/049-ledger-completeness');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-ledger-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  // A deliberate orphan row: cashflow without a journal pair.
  db.prepare(`
    INSERT OR REPLACE INTO cashflow_ledger
      (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
    VALUES ('TXN-ORPHAN-TEST', '185-06-01', 'Test', 'LABOR_WAGE', 50, 0, 1000, 'orphan test', 'Confirmed');
  `).run();
  db.close();
}

function run(): void {
  console.log('=== Ledger completeness ===');
  seed();

  // 1. Migration backfills the orphan with a balanced pair.
  const raw = new Database(TEST_DB);
  migration049.up(raw);
  const pairs = raw.prepare(
    "SELECT account_code, debit, credit FROM account_journal WHERE txn_id = 'TXN-ORPHAN-TEST' ORDER BY debit DESC;"
  ).all() as Array<{ account_code: string; debit: number; credit: number }>;
  assert.strictEqual(pairs.length, 2, 'an orphan must get exactly one Dr and one Cr row');
  assert.strictEqual(Number(pairs[0].debit), 50);
  assert.strictEqual(Number(pairs[1].credit), 50);
  const orphans = Number((raw.prepare(`
    SELECT COUNT(*) AS c FROM cashflow_ledger c
    LEFT JOIN account_journal j ON c.txn_id = j.txn_id
    WHERE j.txn_id IS NULL;
  `).get() as any).c);
  assert.strictEqual(orphans, 0, 'no cashflow row may remain without a journal pair');
  raw.close();

  // 2. postDoubleEntry writes both sides in one call.
  process.env.SIM_DB_PATH = TEST_DB;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { postDoubleEntry } = require('../src/shared/ledger');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ACCOUNT_CODES } = require('../src/shared/account-codes');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute("UPDATE player_state SET liquid_cash = 5000, safe_cash = 0 WHERE player_id = 'PLY-0001';");
  postDoubleEntry(db, {
    txnId: 'TXN-PAIR-TEST',
    gameDate: '185-06-02',
    counterparty: 'Test Employer',
    category: 'LABOR_WAGE',
    inflow: 100,
    balance: 5100,
    memo: 'pair test',
    debitAccount: ACCOUNT_CODES.cashMobile,
    creditAccount: ACCOUNT_CODES.laborIncome
  });

  const check = new Database(TEST_DB);
  const rows = check.prepare(
    "SELECT account_code, debit, credit FROM account_journal WHERE txn_id = 'TXN-PAIR-TEST';"
  ).all() as Array<{ account_code: string; debit: number; credit: number }>;
  assert.strictEqual(rows.length, 2, 'postDoubleEntry must write two rows');
  assert.strictEqual(rows.reduce((sum, row) => sum + Number(row.debit), 0), 100);
  assert.strictEqual(rows.reduce((sum, row) => sum + Number(row.credit), 0), 100);
  assert(rows.some(row => row.account_code === ACCOUNT_CODES.laborIncome));
  check.close();

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: orphan backfill and postDoubleEntry produce balanced pairs.');
}

function cleanup(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
  console.log('✅ Ledger completeness verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
