/**
 * Ecology/logistics mutations follow the core contracts: relief spends one
 * administrative phase, a stronghold assault spends one day and books loot
 * through the ledger, and caravan dispatch uses the single caravan writer.
 * Replaying any of them with the same idempotency key changes nothing.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-ecology-contracts-'));
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
    SET liquid_cash = 10000, safe_cash = 0, strategic_grain = 20, fatigue = 0,
        health = 100, current_location = 'zhuo_xian'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare(`
    UPDATE inventory_items SET quantity = 100, unit_cost_basis = 160
    WHERE item_code = 'COM-GRAIN';
  `).run();
  db.prepare(`
    UPDATE regional_ecological_crises
    SET is_active = 1, duration_turns_left = 4
    WHERE crisis_id = 'CRISIS-184-YE';
  `).run();
  db.prepare(`
    UPDATE bandit_strongholds
    SET status = 'ACTIVE', bandit_power = 1, plundered_wealth = 800, bounty_reward = 800
    WHERE stronghold_id = 'STRONGHOLD-TONGGUAN';
  `).run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-ECO%';").run();
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
  console.log('=== Ecology/logistics contracts ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter, bootstrapGrandStrategy } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const modules = await bootstrapGrandStrategy();
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = modules;
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Grain relief: one phase, one grain deduction, replay is inert.
  const reliefPayload = {
    settlementId: 'ye_cheng',
    grainAmount: 5,
    idempotencyKey: 'TEST-IDEM-ECO-RELIEF'
  };
  const g1 = await request(router, 'POST', '/api/ecology/relief', reliefPayload);
  assert.strictEqual(g1.status, 200, JSON.stringify(g1.data));
  assert.strictEqual(g1.data.idempotent, false);
  assert.strictEqual(g1.data.time.phasesSpent, 1);
  assert.strictEqual(getClock(TEST_DB).phase, 1);
  assert.strictEqual(Number(scalar(raw, "SELECT strategic_grain FROM player_state WHERE player_id = 'PLY-0001';").strategic_grain), 15);

  const g2 = await request(router, 'POST', '/api/ecology/relief', reliefPayload);
  assert.strictEqual(g2.status, 200);
  assert.strictEqual(g2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).phase, 1, 'replay must not spend another phase');
  assert.strictEqual(Number(scalar(raw, "SELECT strategic_grain FROM player_state WHERE player_id = 'PLY-0001';").strategic_grain), 15);

  // 2. Stronghold assault: one day, ledger-booked reward, replay is inert.
  const cash0 = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const attackPayload = { strongholdId: 'STRONGHOLD-TONGGUAN', idempotencyKey: 'TEST-IDEM-ECO-ASSAULT' };
  const a1 = await request(router, 'POST', '/api/logistics/attack-stronghold', attackPayload);
  assert.strictEqual(a1.status, 200, JSON.stringify(a1.data));
  assert.strictEqual(a1.data.result.success, true, 'weak stronghold must be captured');
  assert.strictEqual(a1.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02');
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cash0 + 1600
  );
  const loot = scalar(raw, "SELECT txn_id FROM cashflow_ledger WHERE category = 'Combat/BanditLoot' ORDER BY rowid DESC LIMIT 1;");
  assert(loot?.txn_id, 'loot cashflow row must exist');
  const journal = raw.prepare('SELECT debit, credit FROM account_journal WHERE txn_id = ?;').all(loot.txn_id) as any[];
  assert.strictEqual(journal.length, 2, 'loot must have a Dr/Cr pair');
  assert.strictEqual(
    journal.reduce((sum, row) => sum + Number(row.debit), 0),
    journal.reduce((sum, row) => sum + Number(row.credit), 0)
  );

  const a2 = await request(router, 'POST', '/api/logistics/attack-stronghold', attackPayload);
  assert.strictEqual(a2.status, 200);
  assert.strictEqual(a2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02', 'replay must not spend another day');
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cash0 + 1600
  );

  // 3. Caravan transport: real stock deduction, one caravan row, replay is inert.
  const stockBefore = Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';").quantity);
  const caravansBefore = Number(scalar(raw, "SELECT COUNT(*) AS c FROM trade_caravans WHERE dispatched_by_player = 1;").c);
  const cashBefore = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const transportPayload = {
    fromSettlementId: 'zhuo_xian',
    toSettlementId: 'ji_cheng',
    cargoItemCode: 'COM-GRAIN',
    cargoQuantity: 10,
    guardTier: 'MILITIA',
    idempotencyKey: 'TEST-IDEM-ECO-TRANSPORT'
  };
  const t1 = await request(router, 'POST', '/api/ecology/transport', transportPayload);
  assert.strictEqual(t1.status, 200, JSON.stringify(t1.data));
  assert.strictEqual(t1.data.time.advancedDays, 2);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-04');
  assert.strictEqual(
    Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';").quantity),
    stockBefore - 10
  );
  assert.strictEqual(
    Number(scalar(raw, "SELECT COUNT(*) AS c FROM trade_caravans WHERE dispatched_by_player = 1;").c),
    caravansBefore + 1
  );
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cashBefore - 100
  );

  const t2 = await request(router, 'POST', '/api/ecology/transport', transportPayload);
  assert.strictEqual(t2.status, 200);
  assert.strictEqual(t2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-04');
  assert.strictEqual(
    Number(scalar(raw, "SELECT COUNT(*) AS c FROM trade_caravans WHERE dispatched_by_player = 1;").c),
    caravansBefore + 1
  );
  assert.strictEqual(
    Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';").quantity),
    stockBefore - 10
  );

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: relief, assault and transport charge once and replay cleanly.');
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
