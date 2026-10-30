/**
 * Market-price single-source guard.
 *
 * `master_items` is the only market price. This suite proves that the engine
 * accessor, the TypeScript accessor, the contextual action catalog and the
 * trade executor all agree, and that a spoofed client price is ignored.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { loadMarketCatalog, requireMarketPrice } from '../src/shared/market-price-book';
import { quoteFromReference } from '../src/shared/market-quote';
import { worldPriceMultiplier } from '../src/shared/world-price';
import { SettlementMarketService } from '../src/modules/economy/settlement-market.service';

const { SimulationCore } = require('../engine/sim-core');
const cjsBook = require('../engine/market-price-book');

const ROOT = path.resolve(__dirname, '..');
const LIVE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-market-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== Market price single source ===');

  fs.copyFileSync(LIVE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${LIVE_DB}${suffix}`)) fs.copyFileSync(`${LIVE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }

  const db = DatabaseService.getInstance(TEST_DB);
  try {
    // 1. Both accessors read the same rows and prices.
    const tsCatalog = loadMarketCatalog(db);
    const jsCatalog = cjsBook.loadMarketCatalog(TEST_DB);
    assert(tsCatalog.size > 0, 'market catalog must not be empty');
    assert.strictEqual(jsCatalog.size, tsCatalog.size, 'engine and TS catalogs must expose the same items');
    for (const [code, item] of tsCatalog) {
      const engineItem = jsCatalog.get(code);
      assert(engineItem, `engine catalog is missing ${code}`);
      assert.strictEqual(engineItem.price, item.price, `price drift for ${code}`);
      assert.strictEqual(engineItem.nameVi, item.nameVi, `name drift for ${code}`);
    }

    // 2. Every item a contextual action can trade must be priced.
    const engineSource = fs.readFileSync(
      path.join(ROOT, 'src', 'modules', 'contextual-actions', 'context-action.engine.ts'),
      'utf8'
    );
    const actionCodes = [...engineSource.matchAll(/item_code:\s*'([^']+)'/g)].map(m => m[1]);
    assert(actionCodes.length > 0, 'contextual action catalog must define trade items');
    for (const code of new Set(actionCodes)) {
      assert(tsCatalog.has(code), `contextual action quotes ${code}, which has no master_items price`);
    }

    // 3. The trade executor settles at the catalog price, not the payload price.
    const core = new SimulationCore(TEST_DB);
    const grainPrice = requireMarketPrice(db, 'COM-GRAIN');
    const fame = Number(db.queryOne<any>('SELECT fame FROM player_state WHERE player_id = ?;', ['PLY-0001'])?.fame || 0);
    const campaignDate = db.queryOne<{ current_date: string }>(
      'SELECT "current_date" AS current_date FROM campaign_meta LIMIT 1;'
    )?.current_date || '184-05-02';
    const grainWorld = worldPriceMultiplier(db, 'COM-GRAIN', campaignDate);
    const grainQuote = quoteFromReference(grainPrice, fame, 'COM-GRAIN', grainWorld);
    const buy = core.executeAction({
      type: 'TRADE_BUY',
      item_code: 'COM-GRAIN',
      quantity: 1,
      unit_price: 1,
      counterparty: 'Price guard test',
      game_date: '184-05-02'
    });
    assert.strictEqual(buy.success, true, `buy failed: ${buy.error}`);
    assert.strictEqual(buy.data.totalCost, grainQuote.buyPrice, 'TRADE_BUY must charge the buy quote');

    const sell = core.executeAction({
      type: 'TRADE_SELL',
      item_code: 'COM-GRAIN',
      quantity: 1,
      unit_price: 999999,
      counterparty: 'Price guard test',
      game_date: '184-05-02'
    });
    assert.strictEqual(sell.success, true, `sell failed: ${sell.error}`);
    assert.strictEqual(sell.data.totalRevenue, grainQuote.sellPrice, 'TRADE_SELL must pay the sell quote');
    assert(buy.data.totalCost > sell.data.totalRevenue, 'buy price must stay above the sell price');

    // 3b. The CommonJS and TypeScript quote implementations must agree.
    const cjsQuote = require('../engine/market-quote');
    for (const sampleFame of [0, 500, 5000, 10000]) {
      assert.deepStrictEqual(
        cjsQuote.quoteFromReference(175, sampleFame, 'COM-GRAIN'),
        quoteFromReference(175, sampleFame, 'COM-GRAIN'),
        `quote drift at fame ${sampleFame}`
      );
    }
    const cjsWorld = require('../engine/world-price');
    for (const date of ['184-02-01', '184-05-02', '184-09-01']) {
      assert.strictEqual(
        cjsWorld.worldPriceMultiplier(TEST_DB, 'COM-GRAIN', date),
        worldPriceMultiplier(db, 'COM-GRAIN', date),
        `world multiplier drift on ${date}`
      );
    }

    // 4. An unpriced item is rejected instead of falling back to a local number.
    const unknown = core.executeAction({
      type: 'TRADE_BUY',
      item_code: 'ITEM-NOT-IN-CATALOG',
      quantity: 1,
      unit_price: 10,
      counterparty: 'Price guard test',
      game_date: '184-05-02'
    });
    assert.strictEqual(unknown.success, false, 'unknown items must be rejected');
    assert.strictEqual(unknown.code, 'ITEM_NOT_FOUND', 'unknown items must return ITEM_NOT_FOUND');

    // 5. The retired rule table must not come back.
    const rulesSource = fs.readFileSync(path.join(ROOT, 'engine', 'rules.js'), 'utf8');
    assert(!rulesSource.includes('COMMODITY_PRICE_INDEX'), 'engine/rules.js must not own a price table');
    const controllerSource = fs.readFileSync(
      path.join(ROOT, 'src', 'modules', 'economy', 'economy.controller.ts'),
      'utf8'
    );
    assert(!controllerSource.includes('unitPrice,'), 'the trade controller must not accept a client price');

    // 6. Every contextual action quotes the catalog price it will be settled at.
    const previousDbPath = process.env.SIM_DB_PATH;
    process.env.SIM_DB_PATH = TEST_DB;
    try {
      const { ContextActionEngine } = require('../src/modules/contextual-actions/context-action.engine.ts');
      const engine = ContextActionEngine.getInstance();
      const locations = [
        'Vườn Đào', 'Chợ Đông Môn', 'Xưởng Lương Thị', 'Quảng Tông Quân Doanh',
        'Bình Nguyên Trọng Trấn', 'Hứa Xương Tướng Phủ', 'Kinh Đô Lạc Dương',
        'Bắc Bình Soái Phủ', 'Nghiệp Thành Đại Phủ', 'Hạ Phì Thành Lũy',
        'Trường An Cung Phủ', 'Tương Dương Châu Phủ', 'Giang Lăng Thủy Doanh',
        'Kiến Nghiệp Đô Thành', 'Hán Trung Thiên Sư Phủ', 'Thành Đô Ích Châu Phủ',
        'Một Địa Điểm Không Có Trong Danh Sách'
      ];
      for (const location of locations) {
        const choices = engine.generateChoices(
          location,
          { liquid_cash: 200000, fatigue: 10, morale: 80, fame },
          [],
          { current_date: '184-05-02' }
        );
        assert(choices.length > 0, `no choices for ${location}`);
        for (const choice of choices) {
          if (!String(choice.action?.type || '').startsWith('TRADE_')) continue;
          const catalogPrice = tsCatalog.get(choice.action.item_code)?.price;
          assert(catalogPrice, `${location} quotes unpriced ${choice.action.item_code}`);
          const expected = quoteFromReference(
            catalogPrice,
            fame,
            choice.action.item_code,
            worldPriceMultiplier(db, choice.action.item_code, '184-05-02'),
            SettlementMarketService.forDatabase(db).getLocalMultiplier('zhuo_xian', choice.action.item_code)
          )[choice.action.type === 'TRADE_BUY' ? 'buyPrice' : 'sellPrice'];
          assert.strictEqual(choice.action.unit_price, expected, `${location} quotes a stale price`);
        }
      }
    } finally {
      if (previousDbPath === undefined) delete process.env.SIM_DB_PATH;
      else process.env.SIM_DB_PATH = previousDbPath;
    }
  } finally {
    db.close();
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
    }
  }

  console.log('   ✅ master_items is the only price source for engine, actions and trade');
}

run();
