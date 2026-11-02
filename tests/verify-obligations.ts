/**
 * Periodic obligations: issue, list, pay, overdue penalty and insufficiency.
 *
 * A tax bill is issued for the month being entered, the player pays it as a
 * decision, and an unpaid bill becomes OVERDUE with a late fee and a
 * credibility loss at the next close.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration044 = require('../tools/migrations/044-obligations');
const { processMonthClose, close: closeBridge } = require('../engine/obligation-bridge');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-obligations-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  migration044.up(db);
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0,
        "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 10000, safe_cash = 0, strategic_grain = 50, credibility = 80
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM obligations WHERE character_id = 'PLY-0001';").run();
  db.close();
}

function run(): void {
  console.log('=== Periodic obligations ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObligationService } = require('../src/modules/economy/obligation.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const service = ObligationService.forDatabase(db);

  // 1. Issue once per month, idempotently.
  const issued = service.ensureMonthly('PLY-0001', '185-07-01');
  assert.strictEqual(issued.length, 1, 'one tax obligation must be issued');
  const tax = issued[0];
  assert.strictEqual(tax.dueDate, '185-07-15');
  assert(tax.amountCash >= 20, 'tax must have a positive amount');
  assert.strictEqual(tax.status, 'DUE');
  assert.strictEqual(service.ensureMonthly('PLY-0001', '185-07-01').length, 0, 'issuing twice is a no-op');

  // 2. Paying deducts cash, writes the tax ledger entry and marks PAID.
  const cashBefore = Number(db.queryOne(
    "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"
  )?.liquid_cash);
  const paid = service.pay(tax.obligationId, 'PLY-0001', '185-07-10');
  assert.strictEqual(paid.status, 'PAID');
  const cashAfter = Number(db.queryOne(
    "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"
  )?.liquid_cash);
  assert.strictEqual(cashAfter, cashBefore - tax.amountCash, 'payment must deduct the tax');
  const ledger = db.queryOne(
    "SELECT COUNT(*) AS c FROM cashflow_ledger WHERE category = 'TAX_PAYMENT';"
  );
  assert(Number(ledger?.c) >= 1, 'payment must write a TAX_PAYMENT ledger row');

  // 3. An unpaid bill becomes OVERDUE with a late fee and a credibility loss.
  const august = service.ensureMonthly('PLY-0001', '185-08-01')[0];
  const overdue = service.processDue('PLY-0001', '185-08-20');
  const overdueAugust = overdue.find((row: any) => row.obligationId === august.obligationId);
  assert(overdueAugust, 'the August bill must become overdue');
  assert.strictEqual(overdueAugust.status, 'OVERDUE');
  assert(overdueAugust.amountCash > august.amountCash, 'late fee must increase the amount');
  const credibility = Number(db.queryOne(
    "SELECT credibility FROM player_state WHERE player_id = 'PLY-0001';"
  )?.credibility);
  assert.strictEqual(credibility, 75, 'overdue bill costs 5 credibility');

  // 4. Insufficient cash is rejected without changing the bill.
  db.execute("UPDATE player_state SET liquid_cash = 0 WHERE player_id = 'PLY-0001';");
  const september = service.ensureMonthly('PLY-0001', '185-09-01')[0];
  let rejected = false;
  try {
    service.pay(september.obligationId, 'PLY-0001', '185-09-10');
  } catch (error: any) {
    rejected = error.code === 'INSUFFICIENT_FUNDS';
  }
  assert.strictEqual(rejected, true, 'payment without cash must raise INSUFFICIENT_FUNDS');
  assert.strictEqual(
    service.list('PLY-0001', '185-09-10').find((row: any) => row.obligationId === september.obligationId)?.status,
    'DUE'
  );

  // 5. The month-close bridge processes overdue bills and issues the next month.
  const closeResult = processMonthClose(TEST_DB, 'PLY-0001', '185-09-30', '185-10-01');
  assert(closeResult, 'month-close bridge must run');
  assert(closeResult.issued.length === 1, 'next month tax must be issued');
  assert(closeResult.overdue.length >= 1, 'the September bill must be marked overdue');
  assert(closeResult.summary.overdueCount >= 2, 'summary must count both overdue bills');

  console.log('  ✅ PASSED: issue, pay, overdue penalty, insufficiency and month-close hook.');
}

function cleanup(): void {
  try { closeBridge(); } catch { /* bridge not loaded */ }
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
  console.log('✅ Obligations verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
