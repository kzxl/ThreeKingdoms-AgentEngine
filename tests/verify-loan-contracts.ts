/**
 * Loan mutations follow the core contracts: one administrative phase per
 * borrow/repay, a replayed idempotency key returns the original result without
 * moving cash or the clock, and every cashflow row has a balanced journal pair.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-loan-contracts-'));
const TEST_DB = path.join(TMP, 'session.db');
const { getClock } = require('../engine/time-manager');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0,
        "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 10000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'zhuo_xian'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-LOAN%';").run();
  db.prepare("DELETE FROM financial_loans WHERE lender_name = 'Test Lender';").run();
  db.close();
}

function request(router: any, method: string, url: string, body: any = null): Promise<{ status: number; data: any }> {
  return new Promise(resolve => {
    let sentStatus = 200;
    const req: any = {
      method,
      url,
      headers: { host: 'localhost:3300' },
      on: (event: string, callback: any) => {
        if (event === 'data' && body) callback(Buffer.from(JSON.stringify(body)));
        if (event === 'end') callback();
      }
    };
    const res: any = {
      writeHead: (status: number) => { sentStatus = status; },
      end: (data: string) => {
        let payload: any = data;
        try { payload = JSON.parse(data); } catch { /* keep raw */ }
        resolve({ status: sentStatus, data: payload });
      }
    };
    router.handle(req, res);
  });
}

function scalar(db: Database.Database, sql: string, params: any[] = []): any {
  return db.prepare(sql).get(...params) as any;
}

async function run(): Promise<void> {
  console.log('=== Loan contracts ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  const cash0 = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);

  // 1. Borrow spends one phase and books a balanced pair.
  const borrowPayload = {
    action: 'BORROW',
    amount: 1000,
    lenderName: 'Test Lender',
    idempotencyKey: 'TEST-IDEM-LOAN-BORROW'
  };
  const b1 = await request(router, 'POST', '/api/loans', borrowPayload);
  assert.strictEqual(b1.status, 200, JSON.stringify(b1.data));
  assert.strictEqual(b1.data.idempotent, false);
  assert.strictEqual(b1.data.time.phasesSpent, 1);
  assert.strictEqual(getClock(TEST_DB).phase, 1);
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cash0 + 1000
  );
  const loanRow = scalar(raw, "SELECT loan_id, outstanding_balance FROM financial_loans WHERE lender_name = 'Test Lender';");
  assert(loanRow && loanRow.loan_id, 'loan row must exist');
  assert.strictEqual(Number(loanRow.outstanding_balance), 1050);

  const loanTxn = scalar(raw, "SELECT txn_id FROM cashflow_ledger WHERE category = 'Financing/Loan' ORDER BY rowid DESC LIMIT 1;");
  const journal = raw.prepare('SELECT debit, credit FROM account_journal WHERE txn_id = ?;').all(loanTxn.txn_id) as any[];
  assert.strictEqual(journal.length, 2, 'journal must have a Dr/Cr pair');
  assert.strictEqual(
    journal.reduce((sum, row) => sum + Number(row.debit), 0),
    journal.reduce((sum, row) => sum + Number(row.credit), 0)
  );

  // 2. Replay returns the stored result without cash, loan or clock changes.
  const b2 = await request(router, 'POST', '/api/loans', borrowPayload);
  assert.strictEqual(b2.status, 200);
  assert.strictEqual(b2.data.idempotent, true);
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cash0 + 1000
  );
  assert.strictEqual(Number(scalar(raw, "SELECT COUNT(*) AS c FROM financial_loans WHERE lender_name = 'Test Lender';").c), 1);
  assert.strictEqual(getClock(TEST_DB).phase, 1, 'replay must not spend another phase');
  assert.strictEqual(Number(scalar(raw, "SELECT COUNT(*) AS c FROM action_log WHERE idempotency_key = 'TEST-IDEM-LOAN-BORROW';").c), 1);

  // 3. Repay spends one phase; replay is inert.
  const repayPayload = {
    action: 'REPAY',
    amount: 1050,
    loanId: loanRow.loan_id,
    idempotencyKey: 'TEST-IDEM-LOAN-REPAY'
  };
  const r1 = await request(router, 'POST', '/api/loans', repayPayload);
  assert.strictEqual(r1.status, 200, JSON.stringify(r1.data));
  assert.strictEqual(r1.data.time.phasesSpent, 1);
  assert.strictEqual(getClock(TEST_DB).phase, 2);
  assert.strictEqual(r1.data.remainingDebt, 0);
  const cashAfterRepay = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  assert.strictEqual(cashAfterRepay, cash0 - 50);

  const r2 = await request(router, 'POST', '/api/loans', repayPayload);
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).phase, 2);
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cashAfterRepay
  );

  // 4. Invalid action is rejected before charging time.
  const phaseBefore = getClock(TEST_DB).phase;
  const invalid = await request(router, 'POST', '/api/loans', { action: 'STEAL', amount: 10 });
  assert.strictEqual(invalid.status, 400);
  assert.strictEqual(getClock(TEST_DB).phase, phaseBefore, 'rejected loan must not charge a phase');

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: loan borrow/repay charge one phase, replay cleanly and journal balances.');
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
  run().then(() => cleanup()).catch(error => {
    console.error(error);
    cleanup();
    process.exit(1);
  });
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
