/**
 * Local settlement market: stock is the single write/read source for prices.
 *
 * Buying drains local stock (price rises), selling adds to it (price falls),
 * and the monthly drift/history still work. The bridge is now keyed per
 * database path so a sandbox campaign cannot read the live market.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const { SimulationCore } = require('../engine/sim-core');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-local-market-'));
const TEST_DB = path.join(TMP, 'session.db');
const SETTLEMENT = 'zhuo_xian';
const ITEM = 'COM-GRAIN';

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
        "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET current_location = ?, liquid_cash = 1000000, safe_cash = 0,
        fatigue = 0, strategic_grain = 100
    WHERE player_id = 'PLY-0001';
  `).run(SETTLEMENT);
  // Deterministic starting stock for this pair.
  db.prepare('DELETE FROM settlement_market_state WHERE settlement_id = ? AND item_code = ?;').run(SETTLEMENT, ITEM);
  db.prepare('DELETE FROM settlement_market_history WHERE settlement_id = ? AND item_code = ?;').run(SETTLEMENT, ITEM);
  const inv = db.prepare('SELECT quantity FROM inventory_items WHERE item_code = ?;').get(ITEM) as any;
  if (inv) {
    db.prepare('UPDATE inventory_items SET quantity = 100 WHERE item_code = ?;').run(ITEM);
  } else {
    db.prepare(`
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES (?, 'FOOD_STUFF', 'Test grain', 100, 100, 'Warehouse');
    `).run(ITEM);
  }
  db.close();
}

function run(): void {
  console.log('=== Local settlement market ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SettlementMarketService } = require('../src/modules/economy/settlement-market.service');
  DatabaseService.resetInstance();
  const market = SettlementMarketService.forDatabase(DatabaseService.getInstance(TEST_DB));
  const core = new SimulationCore(TEST_DB);

  const start = market.getState(SETTLEMENT, ITEM);
  const startMultiplier = market.getStockMultiplier(SETTLEMENT, ITEM);

  // 1. A buy removes real stock from the local market.
  const buy = core.executeAction({
    type: 'TRADE_BUY',
    item_code: ITEM,
    quantity: 10,
    unit_price: 1,
    counterparty: 'Test Market',
    game_date: '185-06-01',
    idempotency_key: 'market-buy-1'
  });
  assert.strictEqual(buy.success, true, `buy must succeed: ${JSON.stringify(buy)}`);
  const afterBuy = market.getState(SETTLEMENT, ITEM);
  assert.strictEqual(afterBuy.stock, start.stock - 10, 'buying drains local stock');
  assert(buy.data.market, 'trade response must expose the new market state');

  // 2. A sell adds stock back.
  const sell = core.executeAction({
    type: 'TRADE_SELL',
    item_code: ITEM,
    quantity: 4,
    unit_price: 1,
    counterparty: 'Test Market',
    game_date: '185-06-03',
    idempotency_key: 'market-sell-1'
  });
  assert.strictEqual(sell.success, true, `sell must succeed: ${JSON.stringify(sell)}`);
  const afterSell = market.getState(SETTLEMENT, ITEM);
  assert.strictEqual(afterSell.stock, afterBuy.stock + 4, 'selling adds to local stock');

  // 3. A large drain raises the multiplier; a large delivery lowers it.
  market.applyTrade(SETTLEMENT, ITEM, -Math.max(1, afterSell.stock - 5));
  const scarceMultiplier = market.getStockMultiplier(SETTLEMENT, ITEM);
  assert(scarceMultiplier > startMultiplier, 'scarcity must raise the local multiplier');

  market.applyTrade(SETTLEMENT, ITEM, 500);
  const glutMultiplier = market.getStockMultiplier(SETTLEMENT, ITEM);
  assert(glutMultiplier < scarceMultiplier, 'a glut must lower the multiplier');

  // 4. Monthly drift records history; the daily variant can skip it.
  const countHistory = (): number => {
    const db = new Database(TEST_DB);
    const row = db.prepare(
      'SELECT COUNT(*) AS c FROM settlement_market_history WHERE settlement_id = ? AND item_code = ?;'
    ).get(SETTLEMENT, ITEM) as { c: number };
    db.close();
    return Number(row.c);
  };

  const historyBefore = countHistory();
  market.driftSettlement(SETTLEMENT, '184-06-01', { recordHistory: false });
  assert.strictEqual(countHistory(), historyBefore, 'daily drift must not write pulse history');

  market.driftSettlement(SETTLEMENT, '184-06-01', { recordHistory: true });
  assert.strictEqual(countHistory(), historyBefore + 1, 'monthly drift writes one history row per item');

  console.log('  ✅ PASSED: trade fills move local stock, prices respond, drift/history work.');
}

function cleanup(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../engine/settlement-market-bridge').close();
  } catch { /* bridge not loaded */ }
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
  console.log('✅ Local market verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
