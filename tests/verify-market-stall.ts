/**
 * Two-sided market: the player's stall sells to named NPC buyers each elapsed
 * day, and the player can buy NPC offers. Cash moves through the player ledger,
 * NPC personal cash and the settlement market stock.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-market-stall-'));
const TEST_DB = path.join(TMP, 'session.db');
const SETTLEMENT = 'zhuo_xian';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = COALESCE((SELECT MAX(game_date) FROM cashflow_ledger), '185-06-01'), active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 10000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('COM-GRAIN', 'FOOD_STUFF', 'Grain', 200, 100, 'Kho zhuo_xian')
    ON CONFLICT(item_code) DO UPDATE SET quantity = 200;
  `).run();
  db.prepare("DELETE FROM player_stalls WHERE owner_id = 'PLY-0001';").run();
  db.prepare("DELETE FROM stall_listings;").run();
  db.prepare("DELETE FROM stall_sales;").run();
  db.prepare("DELETE FROM npc_market_offers;").run();
  db.prepare("DELETE FROM npc_market_sales;").run();
  db.prepare('DELETE FROM world_day_ledger;').run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-STALL%';").run();
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

function scalar(db: any, sql: string, params: any[] = []): any {
  return db.prepare(sql).get(...params);
}

async function run(): Promise<void> {
  console.log('=== Market stall & NPC offers ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  const timeManager = require('../engine/time-manager');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Open a stall, pay the fee and list grain below the NPC willingness cap.
  const open = await request(router, 'POST', '/api/stall/open', {
    idempotencyKey: 'TEST-STALL-OPEN'
  });
  assert.strictEqual(open.status, 200, JSON.stringify(open.data));
  assert(open.data.stall.stallId);
  assert.strictEqual(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash), 9980);

  raw.prepare(
    'INSERT OR IGNORE INTO settlement_market_state (settlement_id, item_code, stock, demand) VALUES (?, ?, 100, 100);'
  ).run(SETTLEMENT, 'COM-GRAIN');
  const stockBeforeListing = Number(scalar(raw, "SELECT stock FROM settlement_market_state WHERE settlement_id = ? AND item_code = 'COM-GRAIN';", [SETTLEMENT]).stock);

  const listed = await request(router, 'POST', '/api/stall/list', {
    itemCode: 'COM-GRAIN',
    quantity: 20,
    unitPrice: 50,
    idempotencyKey: 'TEST-STALL-LIST'
  });
  assert.strictEqual(listed.status, 200, JSON.stringify(listed.data));
  const listing = listed.data.stall.listings.find((row: any) => row.itemCode === 'COM-GRAIN');
  assert(listing && listing.quantity === 20);
  assert.strictEqual(Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';").quantity), 180);
  assert.strictEqual(
    Number(scalar(raw, "SELECT stock FROM settlement_market_state WHERE settlement_id = ? AND item_code = 'COM-GRAIN';", [SETTLEMENT]).stock),
    stockBeforeListing + 20,
    'listing goods must enter local market stock'
  );

  // 2. Two elapsed days let NPCs buy. Cash and listing quantity move.
  const cashBeforeSales = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  timeManager.advanceCampaignDays(TEST_DB, 2, { clampToMonthEnd: false });
  const sales = raw.prepare('SELECT * FROM stall_sales;').all() as any[];
  assert(sales.length > 0, 'NPCs must buy listed goods');
  assert(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash) > cashBeforeSales);
  const remaining = Number(scalar(raw, "SELECT quantity FROM stall_listings WHERE stall_id = ? AND item_code = 'COM-GRAIN';", [open.data.stall.stallId]).quantity);
  assert(remaining < 20);
  const sold = sales.reduce((sum, row) => sum + Number(row.quantity), 0);
  assert.strictEqual(remaining, 20 - sold);
  assert.strictEqual(
    Number(scalar(raw, "SELECT stock FROM settlement_market_state WHERE settlement_id = ? AND item_code = 'COM-GRAIN';", [SETTLEMENT]).stock),
    stockBeforeListing + 20 - sold,
    'each stall sale must consume local market stock'
  );

  // 3. NPC offers exist and sit in a band around the local quote.
  const offers = await request(router, 'GET', `/api/market/npc-offers?settlementId=${SETTLEMENT}`);
  assert.strictEqual(offers.status, 200, JSON.stringify(offers.data));
  assert(offers.data.offers.length > 0, 'settlement must expose NPC offers');
  const offer = offers.data.offers.find((row: any) => row.quantity >= 1);
  assert(offer, 'offer with stock required');
  assert(offer.priceDeltaPct >= -20 && offer.priceDeltaPct <= 30);

  // 4. Player buys from an NPC: cash falls, inventory rises, NPC cash rises.
  const playerCashBefore = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const npcCashBefore = Number(scalar(raw, "SELECT personal_cash FROM npc_personal_progression WHERE npc_id = ?;", [offer.npcId]).personal_cash);
  const invBefore = Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = ?;", [offer.itemCode])?.quantity || 0);
  const buyPayload = { offerId: offer.offerId, quantity: 1, idempotencyKey: 'TEST-STALL-BUY' };
  const bought = await request(router, 'POST', '/api/market/npc-offers/buy', buyPayload);
  assert.strictEqual(bought.status, 200, JSON.stringify(bought.data));
  assert.strictEqual(bought.data.result.quantity, 1);
  assert.strictEqual(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash), playerCashBefore - offer.unitPrice);
  assert.strictEqual(Number(scalar(raw, "SELECT personal_cash FROM npc_personal_progression WHERE npc_id = ?;", [offer.npcId]).personal_cash), npcCashBefore + offer.unitPrice);
  assert.strictEqual(
    Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = ?;", [offer.itemCode]).quantity),
    invBefore + 1
  );
  assert(scalar(raw, "SELECT 1 AS ok FROM npc_market_sales WHERE offer_id = ?;", [offer.offerId]));

  const replay = await request(router, 'POST', '/api/market/npc-offers/buy', buyPayload);
  assert.strictEqual(replay.data.idempotent, true);
  assert.strictEqual(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash), playerCashBefore - offer.unitPrice);

  // 5. Two open stalls require an explicit stallId/settlementId.
  const secondStall = await request(router, 'POST', '/api/stall/open', {
    settlementId: 'luo_yang',
    idempotencyKey: 'TEST-STALL-OPEN-SECOND'
  });
  assert.strictEqual(secondStall.status, 200, JSON.stringify(secondStall.data));
  const ambiguous = await request(router, 'POST', '/api/stall/list', {
    itemCode: 'COM-GRAIN',
    quantity: 1,
    unitPrice: 10,
    idempotencyKey: 'TEST-STALL-AMBIGUOUS'
  });
  assert.strictEqual(ambiguous.status, 400);
  assert(/nhiều quầy/i.test(ambiguous.data.error));

  // 6. Closing returns unsold stock.
  const close = await request(router, 'POST', '/api/stall/close', {
    stallId: open.data.stall.stallId,
    idempotencyKey: 'TEST-STALL-CLOSE'
  });
  assert.strictEqual(close.status, 200, JSON.stringify(close.data));
  assert.strictEqual(close.data.result.closed, true);
  assert.strictEqual(scalar(raw, "SELECT status FROM player_stalls WHERE stall_id = ?;", [open.data.stall.stallId]).status, 'CLOSED');
  assert.strictEqual(
    Number(scalar(raw, "SELECT stock FROM settlement_market_state WHERE settlement_id = ? AND item_code = 'COM-GRAIN';", [SETTLEMENT]).stock),
    stockBeforeListing,
    'closing returns unsold goods and leaves only the consumed quantity'
  );

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: NPCs buy from stalls and the player buys NPC offers.');
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
