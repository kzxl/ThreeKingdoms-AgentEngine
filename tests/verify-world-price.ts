/**
 * World price multipliers: season and active crises, TS/CJS parity.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { worldPriceMultiplier, seasonMultiplier } from '../src/shared/world-price';
import { quoteFromReference } from '../src/shared/market-quote';
import { RegionalMarketService } from '../src/modules/economy/regional-market.service';

const ROOT = path.resolve(__dirname, '..');
const LIVE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-world-price-'));
const TEST_DB = path.join(TMP, 'session.db');
const cjsWorld = require('../engine/world-price');

function run(): void {
  console.log('=== World price multipliers ===');

  fs.copyFileSync(LIVE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${LIVE_DB}${suffix}`)) fs.copyFileSync(`${LIVE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }

  const db = DatabaseService.getInstance(TEST_DB);
  try {
    assert.strictEqual(seasonMultiplier('COM-GRAIN', '184-05-02'), 1.15, 'May grain is lean-season');
    assert.strictEqual(seasonMultiplier('COM-GRAIN', '184-09-01'), 0.85, 'September grain is harvest-season');
    assert.strictEqual(seasonMultiplier('COM-GRAIN', '184-01-01'), 1, 'January grain has no seasonal modifier');
    assert.strictEqual(seasonMultiplier('COM-IRON', '184-05-02'), 1, 'iron is not seasonal');

    for (const date of ['184-01-01', '184-05-02', '184-09-01']) {
      assert.strictEqual(
        cjsWorld.worldPriceMultiplier(TEST_DB, 'COM-GRAIN', date),
        worldPriceMultiplier(db, 'COM-GRAIN', date),
        `world multiplier drift on ${date}`
      );
    }

    // Activate the historical Yecheng drought; grain must spike.
    db.execute(`UPDATE regional_ecological_crises SET is_active = 1 WHERE crisis_id = 'CRISIS-184-YE';`);
    const crisis = worldPriceMultiplier(db, 'COM-GRAIN', '184-05-02', 'ye_cheng');
    assert(crisis >= 2.5, `drought grain multiplier too low: ${crisis}`);

    const reference = 175;
    const quote = quoteFromReference(reference, 500, 'COM-GRAIN', crisis);
    assert(quote.effectiveReference > reference, 'crisis must raise the effective reference');
    assert(quote.buyPrice > quote.sellPrice, 'crisis quote must keep buy above sell');

    const regional = new RegionalMarketService(db);
    assert.strictEqual(regional.getSpecializationMultiplier('zhuo_xian', 'COM-BAMBOO'), 0.7, 'Zhuo bamboo is a local surplus');
    assert.strictEqual(regional.getSpecializationMultiplier('zhuo_xian', 'COM-SALT'), 1.5, 'Zhuo salt is a local deficit');
    const localQuote = quoteFromReference(100, 500, 'COM-BAMBOO', 1, 0.7);
    assert(localQuote.effectiveReference < 100, 'local surplus must lower the effective reference');

    db.execute(`UPDATE regional_ecological_crises SET is_active = 0;`);
  } finally {
    db.close();
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
    }
  }

  console.log('   ✅ season and crisis multipliers match across TS and the engine');
}

run();
