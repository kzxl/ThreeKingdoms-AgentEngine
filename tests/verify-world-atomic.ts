/**
 * Per-module atomicity in the month close: a world module that writes and then
 * throws must roll back its own writes, and the close must abort before the
 * campaign clock advances.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-world-atomic-'));
const TEST_DB = path.join(TMP, 'session.db');
const { getClock } = require('../engine/time-manager');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec('CREATE TABLE IF NOT EXISTS atomic_probe (id INTEGER PRIMARY KEY, note TEXT);');
  db.prepare('DELETE FROM atomic_probe;').run();
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0,
        "current_date" = '185-06-30', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.close();
}

function run(): void {
  console.log('=== World month-close atomicity ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GameplayManager } = require('../engine/gameplay-manager');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);

  // A module that writes and then throws must roll back its own write.
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = {
    npcLifecycle: {
      simulateAllActiveNpcs: () => {
        db.execute("INSERT INTO atomic_probe (note) VALUES ('npc');");
        throw new Error('npc module failed');
      }
    },
    factionPolitics: {
      simulatePoliticalCycle: () => []
    },
    ecologyLogistics: {
      simulateEcologyAndLogisticsTurn: () => ({ season: 'Hạ', events: [] })
    }
  } as any;

  const before = getClock(TEST_DB).currentDate;
  let failed = false;
  try {
    GameplayManager.closeMonthFor(TEST_DB, {
      endedDate: '185-06-30',
      nextDate: '185-07-01',
      turnOverride: 99
    });
  } catch (error: any) {
    failed = /World simulation failed/.test(error.message);
  }
  assert.strictEqual(failed, true, 'a world module failure must abort the close');
  assert.strictEqual(getClock(TEST_DB).currentDate, before, 'the clock must not advance');

  const raw = new Database(TEST_DB);
  const probes = Number((raw.prepare('SELECT COUNT(*) AS c FROM atomic_probe;').get() as any).c);
  raw.close();
  assert.strictEqual(probes, 0, 'the failed module write must be rolled back');

  // A successful module commits.
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = {
    npcLifecycle: {
      simulateAllActiveNpcs: () => {
        db.execute("INSERT INTO atomic_probe (note) VALUES ('ok');");
        return [];
      }
    },
    factionPolitics: { simulatePoliticalCycle: () => [] },
    ecologyLogistics: { simulateEcologyAndLogisticsTurn: () => ({ season: 'Hạ', events: [] }) }
  } as any;

  GameplayManager.closeMonthFor(TEST_DB, {
    endedDate: '185-06-30',
    nextDate: '185-07-01',
    turnOverride: 99
  });
  const check = new Database(TEST_DB);
  const committed = Number((check.prepare('SELECT COUNT(*) AS c FROM atomic_probe;').get() as any).c);
  check.close();
  assert.strictEqual(committed, 1, 'a successful module must commit');

  delete (globalThis as any).__GRAND_STRATEGY_MODULES__;
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: failed module rolls back, close aborts, successful module commits.');
}

function cleanup(): void {
  try { delete (globalThis as any).__GRAND_STRATEGY_MODULES__; } catch { /* noop */ }
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
  console.log('✅ World month-close atomicity verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
