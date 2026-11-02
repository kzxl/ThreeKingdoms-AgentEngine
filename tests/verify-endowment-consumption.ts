/**
 * Regional endowment and essential consumption: fish is cheaper where fishing
 * nodes exist, and a monthly shortage reduces public order.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-endowment-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare("DELETE FROM settlement_consumption_log;").run();
  db.prepare("DELETE FROM world_day_ledger;").run();
  db.close();
}

async function run(): Promise<void> {
  console.log('=== Endowment & essential consumption ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { RegionalMarketService } = require('../src/modules/economy/regional-market.service');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SettlementMarketService } = require('../src/modules/economy/settlement-market.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const regional = new RegionalMarketService(db);
  const market = SettlementMarketService.forDatabase(db);

  const rich = db.queryOne(
    "SELECT settlement_id, supply_score FROM settlement_item_endowment WHERE item_code = 'COM-FISH-FRESH' AND supply_score > 0 ORDER BY supply_score DESC LIMIT 1;"
  );
  const poor = db.queryOne(
    "SELECT settlement_id, supply_score FROM settlement_item_endowment WHERE item_code = 'COM-FISH-FRESH' AND supply_score = 0 LIMIT 1;"
  );
  assert(rich && poor, 'endowment must include fish-rich and fish-poor settlements');
  const richPrice = regional.calculateSettlementPrice(rich.settlement_id, 'COM-FISH-FRESH', '185-06-01');
  const poorPrice = regional.calculateSettlementPrice(poor.settlement_id, 'COM-FISH-FRESH', '185-06-01');
  assert(richPrice < poorPrice, `fish must be cheaper in ${rich.settlement_id} (${richPrice}) than ${poor.settlement_id} (${poorPrice})`);

  const consumption = db.queryOne(
    'SELECT settlement_id, item_code, monthly_demand FROM settlement_consumption WHERE monthly_demand > 0 LIMIT 1;'
  );
  assert(consumption, 'a consumption row must exist');
  db.execute(
    `INSERT INTO settlement_market_state (settlement_id, item_code, stock, demand)
     VALUES (?, ?, 0, 10)
     ON CONFLICT(settlement_id, item_code) DO UPDATE SET stock = 0, demand = 10;`,
    [consumption.settlement_id, consumption.item_code]
  );
  const orderBefore = Number(db.queryOne(
    'SELECT public_order FROM session_settlements WHERE settlement_id = ?;',
    [consumption.settlement_id]
  )?.public_order || 0);
  const events = market.consumeEssentials('185-06-30');
  const event = events.find((row: any) => row.settlementId === consumption.settlement_id && row.itemCode === consumption.item_code);
  assert(event && event.shortage > 0, 'zero stock must create a shortage');
  const orderAfter = Number(db.queryOne(
    'SELECT public_order FROM session_settlements WHERE settlement_id = ?;',
    [consumption.settlement_id]
  )?.public_order || 0);
  assert(orderAfter < orderBefore, 'shortage must reduce public order');
  assert(db.queryOne('SELECT 1 AS ok FROM settlement_consumption_log LIMIT 1;'));

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: fish endowment prices and shortage consumption are wired.');
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
