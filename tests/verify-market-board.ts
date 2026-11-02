/**
 * Market board: resolves the player's current settlement, returns every item
 * with local price, pressure, history, player stock and arbitrage, and the UI
 * renders the filterable board instead of the old five-column table.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-market-board-'));
const TEST_DB = path.join(TMP, 'session.db');

function request(router: any, method: string, url: string): Promise<{ status: number; data: any }> {
  return new Promise(resolve => {
    let sentStatus = 200;
    const req: any = {
      method,
      url,
      headers: { host: 'localhost:3300' },
      on: (event: string, callback: any) => {
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

async function run(): Promise<void> {
  console.log('=== Market board ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute(`
    UPDATE player_state SET current_location = 'Vườn Đào', current_sub_location = 'Tư Trạch Vườn Đào'
    WHERE player_id = 'PLY-0001';
  `);
  const router = createGrandStrategyRouter();

  const res = await request(router, 'GET', '/api/economy/market-board');
  assert.strictEqual(res.status, 200, JSON.stringify(res.data));
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.settlementId, 'zhuo_xian', 'current sub-location must resolve to the city node');
  assert.strictEqual(res.data.settlementNameVi, 'Trác Huyện');
  assert.strictEqual(res.data.items.length, 160, 'board must include every master item');
  assert(res.data.categories.length >= 5, 'board must expose category filters');
  assert.strictEqual(res.data.summary.total, 160);
  assert(res.data.summary.surplus > 0, 'specialisation surplus must count as a supply signal');
  assert(res.data.summary.opportunities > 0, 'board must include arbitrage opportunities');
  assert(res.data.summary.bestOpportunity?.marginPercent > 0);

  const item = res.data.items.find((row: any) => row.itemCode === 'PROD-MAT');
  assert(item, 'PROD-MAT must be on the board');
  assert(item.currentPrice > 0);
  assert(item.basePrice > 0);
  assert(typeof item.pressure === 'string');
  assert(item.opportunity?.bestDestination, 'item must carry its best selling market');
  assert(item.opportunity.marginPercent > 0);

  const foreign = await request(router, 'GET', '/api/economy/market-board?settlementId=luo_yang');
  assert.strictEqual(foreign.data.settlementId, 'luo_yang');
  assert.strictEqual(foreign.data.items.length, 160);

  const ui = fs.readFileSync(path.join(ROOT, 'public/js/spatial-poi-controller.js'), 'utf8');
  const modal = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'public/styles.css'), 'utf8');
  assert(ui.includes('/api/economy/market-board'), 'client must read the new board endpoint');
  assert(ui.includes('market-board-search'), 'board must have a search filter');
  assert(ui.includes('market-board-pressure'), 'board must filter by pressure');
  assert(ui.includes('market-detail-row'), 'rows must expand into a detail panel');
  assert(ui.includes("data-market-act=\"BUY\""), 'board must offer a buy action');
  assert(ui.includes("data-market-act=\"SELL\""), 'board must offer a sell action');
  assert(ui.includes('openQuickTrade'), 'buy/sell must reuse the single trade dialog');
  assert(modal.includes('market-pulse-modal'), 'market board must reuse the existing modal id');
  assert(css.includes('.market-board-table'), 'board table styles must exist');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: full catalog, settlement resolution, filters, actions and arbitrage.');
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
