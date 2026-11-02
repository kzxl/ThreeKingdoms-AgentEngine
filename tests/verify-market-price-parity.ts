/**
 * One price formula: the local multiplier used by every quote consumer must
 * include regional endowment, and `calculateSettlementPrice` must compose the
 * same multiplier so direct trade, stalls, contracts and intel agree.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { RegionalMarketService } from '../src/modules/economy/regional-market.service';
import { SettlementMarketService } from '../src/modules/economy/settlement-market.service';
import { worldPriceMultiplier } from '../src/shared/world-price';
import { quoteFromReference } from '../src/shared/market-quote';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-price-parity-'));
const TEST_DB = path.join(TMP, 'session.db');
const ITEM = 'COM-FISH-FRESH';
const DATE = '185-06-01';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = ?, active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run(DATE);
  db.close();
}

function run(): void {
  console.log('=== Market price parity ===');
  seed();
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const regional = new RegionalMarketService(db);
  const market = SettlementMarketService.forDatabase(db);

  const rich = db.queryOne<{ settlement_id: string }>(
    `SELECT settlement_id FROM settlement_item_endowment
     WHERE item_code = ? AND supply_score > 0
     ORDER BY supply_score DESC LIMIT 1;`,
    [ITEM]
  );
  const poor = db.queryOne<{ settlement_id: string }>(
    `SELECT settlement_id FROM settlement_item_endowment
     WHERE item_code = ? AND supply_score = 0
     ORDER BY settlement_id ASC LIMIT 1;`,
    [ITEM]
  );
  assert(rich && poor, 'endowment must contain fish-rich and fish-poor settlements');

  // Neutralise stock/specialisation so the only difference is endowment.
  for (const settlement of [rich.settlement_id, poor.settlement_id]) {
    market.getState(settlement, ITEM);
    db.execute(
      'UPDATE settlement_market_state SET stock = 100, demand = 100 WHERE settlement_id = ? AND item_code = ?;',
      [settlement, ITEM]
    );
  }

  const richLocal = market.getLocalMultiplier(rich.settlement_id, ITEM);
  const poorLocal = market.getLocalMultiplier(poor.settlement_id, ITEM);
  assert(
    richLocal < poorLocal,
    `fish endowment must lower the rich settlement multiplier (${richLocal} vs ${poorLocal})`
  );

  const item = db.queryOne<{ current_market_price: number; baseline_peace_price: number }>(
    'SELECT current_market_price, baseline_peace_price FROM master_items WHERE item_code = ?;',
    [ITEM]
  );
  assert(item, 'fish must exist in master_items');
  const base = Number(item.current_market_price || item.baseline_peace_price);

  for (const settlement of [rich.settlement_id, poor.settlement_id]) {
    const local = market.getLocalMultiplier(settlement, ITEM);
    const world = worldPriceMultiplier(db, ITEM, DATE, settlement);
    const expected = Math.max(1, Math.round(base * local * world));
    const actual = regional.calculateSettlementPrice(settlement, ITEM, DATE);
    assert.strictEqual(
      actual,
      expected,
      `${settlement}: calculateSettlementPrice ${actual} must equal base × local × world ${expected}`
    );
    const quote = quoteFromReference(base, 500, ITEM, world, local);
    assert(
      Math.abs(quote.effectiveReference - expected) <= 1,
      `${settlement}: trade quote ${quote.effectiveReference} must match the resolver ${expected}`
    );
  }

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: one endowment-aware local multiplier across price paths.');
}

function cleanup(): void {
  try {
    DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
