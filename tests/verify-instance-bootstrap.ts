/**
 * New-instance isolation regression.
 *
 * A new game must not inherit the source session's turn history, warehouse,
 * caravans, tasks, businesses or world-turn markers, and must pass the same
 * clock/cash/inventory/journal audits as a long-running campaign.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { initializeInstanceDatabase } from '../src/modules/instances/instance-bootstrap';
import { ARCHETYPE_PRESETS } from '../src/modules/instances/instances.constants';

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const DIR = path.join(ROOT, 'tests', '.instance-bootstrap');
const adapter = require('../engine/db-adapter');

function bootstrap(id: string): string {
  adapter.closeConnections();
  fs.mkdirSync(DIR, { recursive: true });
  const dbPath = path.join(DIR, `${id}.db`);
  fs.copyFileSync(TEMPLATE, dbPath);
  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF');
  initializeInstanceDatabase(db, {
    preset: ARCHETYPE_PRESETS[id],
    playerName: 'Regression Player',
    playerStyle: 'Regression Style'
  });
  db.pragma('foreign_keys = ON');
  const violations = db.prepare('PRAGMA foreign_key_check').all();
  assert.strictEqual(violations.length, 0, `${id}: bootstrap must leave no foreign-key violations`);

  const count = (table: string): number => {
    try {
      return Number((db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as any)?.c || 0);
    } catch {
      return 0;
    }
  };
  assert.strictEqual(count('turn_log'), 1, `${id}: only the opening turn may remain`);
  assert.strictEqual(count('trade_caravans'), 0, `${id}: no inherited caravans`);
  assert.strictEqual(count('active_tasks'), 0, `${id}: no inherited tasks`);
  assert.strictEqual(count('world_turn_ledger'), 0, `${id}: no inherited world-turn markers`);
  assert.strictEqual(count('cashflow_ledger'), 1, `${id}: exactly one opening ledger row`);
  assert.strictEqual(count('businesses'), 1, `${id}: the starting workshop must exist`);
  assert.strictEqual(count('inventory_items'), id === 'ARCH-COMMONER-YOUTH' ? 2 : 4, `${id}: expected starting stock`);
  db.close();
  return dbPath;
}

function audit(dbPath: string): void {
  process.env.SIM_DB_PATH = dbPath;
  delete require.cache[require.resolve('../tools/sim-audit')];
  const { auditCampaignClock, auditSqliteCashflow, auditSqliteInventory, auditDoubleEntryJournal } = require('../tools/sim-audit');
  assert.deepStrictEqual(auditCampaignClock().errors, [], 'new instance must pass the campaign-clock audit');
  assert.deepStrictEqual(auditSqliteCashflow().errors, [], 'new instance must pass the cashflow audit');
  assert.deepStrictEqual(auditSqliteInventory().errors, [], 'new instance must pass the inventory audit');
  assert.deepStrictEqual(auditDoubleEntryJournal().errors, [], 'new instance must pass the journal audit');
  adapter.closeConnections();
}

function run(): void {
  console.log('=== New-instance isolation regression ===');
  fs.rmSync(DIR, { recursive: true, force: true });
  try {
    for (const id of ['ARCH-COMMONER-YOUTH', 'ARCH-SCHOLAR-ARTISAN']) {
      const dbPath = bootstrap(id);
      audit(dbPath);
    }

    // A database initialized from tools/schema.sql must already carry the
    // migration-owned column, dedupe trigger and world-turn ledger.
    const { initDb } = require('../tools/sim-db');
    const freshPath = path.join(DIR, 'fresh-schema.db');
    initDb(freshPath);
    const fresh = new Database(freshPath, { readonly: true });
    const caravanColumns = fresh.prepare('PRAGMA table_info(trade_caravans)').all().map((c: any) => c.name);
    assert(caravanColumns.includes('dispatched_by_player'), 'schema must declare trade_caravans.dispatched_by_player');
    const trigger = fresh.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='trg_chat_chronicle_dedupe'"
    ).get();
    assert(trigger, 'schema must install the chronicle dedupe trigger');
    const ledgerTable = fresh.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='world_turn_ledger'"
    ).get();
    assert(ledgerTable, 'schema must declare world_turn_ledger');
    const migrations = (fresh.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as any).c;
    assert.strictEqual(Number(migrations), 8, 'initDb must apply all 8 versioned migrations');
    fresh.close();
    adapter.closeConnections();

    console.log('   ✅ new instances are clean and audit-green; fresh schema is migration-complete');
  } finally {
    adapter.closeConnections();
    fs.rmSync(DIR, { recursive: true, force: true });
  }
}

run();
