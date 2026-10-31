/**
 * Settlement treasury ledger: opening + inflow - outflow equals treasury.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration052 = require('../tools/migrations/052-settlement-ledger');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-settlement-ledger-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  migration052.up(db);
  db.prepare(`
    UPDATE campaign_meta SET "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.close();
}

function equation(db: Database.Database, settlementId: string): { expected: number; actual: number } {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN category = 'OPENING' THEN inflow ELSE 0 END), 0) AS opening,
      COALESCE(SUM(CASE WHEN category <> 'OPENING' THEN inflow ELSE 0 END), 0) AS inflow,
      COALESCE(SUM(outflow), 0) AS outflow
    FROM settlement_ledger WHERE settlement_id = ?;
  `).get(settlementId) as any;
  const actual = Number((db.prepare(
    'SELECT treasury_cash FROM session_settlements WHERE settlement_id = ?;'
  ).get(settlementId) as any).treasury_cash);
  return {
    expected: Number(row.opening || 0) + Number(row.inflow || 0) - Number(row.outflow || 0),
    actual
  };
}

function run(): void {
  console.log('=== Settlement ledger ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  const raw = new Database(TEST_DB);
  const settlements = raw.prepare('SELECT settlement_id FROM session_settlements;').all() as Array<{ settlement_id: string }>;
  for (const settlement of settlements) {
    const { expected, actual } = equation(raw, settlement.settlement_id);
    assert.strictEqual(actual, expected, `${settlement.settlement_id} opening must equal treasury`);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { postSettlementEntry } = require('../src/shared/settlement-ledger');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);

  const target = settlements[0].settlement_id;
  const before = equation(raw, target);
  const entry = postSettlementEntry(db, {
    settlementId: target,
    gameDate: '185-06-01',
    category: 'WAR_LOOT',
    outflow: 100,
    memo: 'test loot'
  });
  assert(entry.outflow > 0);
  const after = equation(raw, target);
  assert.strictEqual(after.actual, after.expected, 'a real flow keeps the ledger balanced');
  assert.strictEqual(after.actual, before.actual - entry.outflow);

  // Direct treasury writes must show as drift.
  raw.prepare('UPDATE session_settlements SET treasury_cash = treasury_cash + 1 WHERE settlement_id = ?;').run(target);
  const drift = equation(raw, target);
  assert.notStrictEqual(drift.actual, drift.expected, 'direct write must show as drift');
  raw.prepare('UPDATE session_settlements SET treasury_cash = treasury_cash - 1 WHERE settlement_id = ?;').run(target);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: opening, real flow and drift detection.');
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
  console.log('✅ Settlement ledger verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
