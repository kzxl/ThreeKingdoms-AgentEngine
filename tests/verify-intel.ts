/**
 * Intel reports: monthly rumors with confidence, verification that costs days,
 * and a claim that can be false.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration047 = require('../tools/migrations/047-intel-reports');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-intel-'));
const TEST_DB = path.join(TMP, 'session.db');
const SETTLEMENT = 'zhuo_xian';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  migration047.up(db);
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare("UPDATE player_state SET current_location = ? WHERE player_id = 'PLY-0001';").run(SETTLEMENT);
  db.prepare('DELETE FROM intel_reports WHERE settlement_id = ?;').run(SETTLEMENT);
  db.close();
}

function run(): void {
  console.log('=== Intel reports ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { IntelService } = require('../src/modules/economy/intel.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const service = IntelService.forDatabase(db);

  // 1. Three monthly reports, deterministic and idempotent.
  const reports = service.list(SETTLEMENT, '185-06-01');
  assert.strictEqual(reports.length, 3, 'two price claims and one garrison claim');
  const ids = reports.map((report: any) => report.reportId).sort();
  assert.deepStrictEqual(
    service.list(SETTLEMENT, '185-06-01').map((report: any) => report.reportId).sort(),
    ids,
    'generating twice must not duplicate'
  );
  assert(reports.every((report: any) => report.confidence > 0 && report.confidence <= 1));
  assert(reports.every((report: any) => report.verificationDays === 2));

  // 2. Verifying a real report reveals the actual value and marks it verified.
  const priceReport = reports.find((report: any) => report.subjectType === 'PRICE');
  const verified = service.verify(priceReport.reportId, '185-06-05');
  assert.strictEqual(verified.report.status, 'VERIFIED');
  assert(Number(verified.report.actual.price) > 0, 'verification must reveal the real price');
  assert.strictEqual(typeof verified.report.isFalse, 'boolean');

  let repeated = false;
  try {
    service.verify(priceReport.reportId, '185-06-06');
  } catch (error: any) {
    repeated = /xác minh|verified/i.test(error.message);
  }
  assert.strictEqual(repeated, true, 'a report cannot be verified twice');

  // 3. A deliberately wrong claim is flagged false.
  db.execute(`
    INSERT INTO intel_reports
      (report_id, settlement_id, subject_type, subject_key, claim_json, confidence,
       is_false, source, observed_date, expires_date, status)
    VALUES ('INT-FAKE-1', ?, 'TROOP', ?, '{"troops": 999999}', 0.9, 0, 'RUMOR', '185-06-01', '185-06-30', 'OPEN');
  `, [SETTLEMENT, SETTLEMENT]);
  const fake = service.verify('INT-FAKE-1', '185-06-05');
  assert.strictEqual(fake.report.isFalse, true, 'a claim far from the truth must be false');
  assert(Number(fake.report.actual.troops) >= 0);

  // 4. A new month produces a new batch with new ids.
  const nextMonth = service.list(SETTLEMENT, '185-08-01');
  assert.strictEqual(nextMonth.length, 3);
  assert(!nextMonth.some((report: any) => ids.includes(report.reportId)), 'next month must use new report ids');

  console.log('  ✅ PASSED: monthly rumors, confidence, verification and false-claim detection.');
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
  console.log('✅ Intel reports verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
