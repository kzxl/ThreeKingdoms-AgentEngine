/**
 * Freight contracts: a deficit settlement hires the player to move NPC-owned
 * cargo. The player pays the escort fee and receives the reward on delivery.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-freight-'));
const TEST_DB = path.join(TMP, 'session.db');

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
    UPDATE player_state SET liquid_cash = 10000, safe_cash = 0, fatigue = 0, health = 100,
      current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare('DELETE FROM freight_contracts;').run();
  db.prepare('DELETE FROM freight_shipments;').run();
  // Happy-path flow: lair/guard/insurance scenarios live in verify-logistics-risk.
  db.prepare('DELETE FROM bandit_strongholds;').run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-FREIGHT%';").run();
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

function num(db: any, sql: string, params: any[] = []): number {
  const row = db.prepare(sql).get(...params) as any;
  return Number(row ? Object.values(row)[0] : 0);
}

async function run(): Promise<void> {
  console.log('=== Freight contracts ===');
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

  const board = await request(router, 'GET', '/api/freight/contracts?settlementId=zhuo_xian');
  assert.strictEqual(board.status, 200, JSON.stringify(board.data));
  assert(board.data.contracts.length > 0, 'deficit settlement must post freight contracts');
  const contract = board.data.contracts[0];
  assert(contract.rewardCash > 0);

  const cashBefore = num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';");
  const accepted = await request(router, 'POST', '/api/freight/accept', {
    contractId: contract.contractId,
    guardTier: 'MILITIA',
    idempotencyKey: 'TEST-FREIGHT-ACCEPT'
  });
  assert.strictEqual(accepted.status, 200, JSON.stringify(accepted.data));
  const shipment = accepted.data.result;
  assert(shipment.daysRemaining >= 1);
  assert(num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';") < cashBefore);

  timeManager.advanceCampaignDays(TEST_DB, shipment.daysRemaining, { clampToMonthEnd: false });
  const shipments = await request(router, 'GET', '/api/freight/shipments');
  assert.strictEqual(shipments.status, 200, JSON.stringify(shipments.data));
  const arrived = shipments.data.shipments.find((row: any) => row.shipmentId === shipment.shipmentId);
  assert(arrived && arrived.status === 'ARRIVED');

  const cashBeforeDelivery = num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';");
  const delivered = await request(router, 'POST', '/api/freight/deliver', {
    shipmentId: shipment.shipmentId,
    idempotencyKey: 'TEST-FREIGHT-DELIVER'
  });
  assert.strictEqual(delivered.status, 200, JSON.stringify(delivered.data));
  assert.strictEqual(delivered.data.result.rewardCash, contract.rewardCash);
  assert(num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';") >= cashBeforeDelivery + contract.rewardCash);
  assert.strictEqual(
    (raw.prepare('SELECT status FROM freight_contracts WHERE contract_id = ?;').get(contract.contractId) as any).status,
    'DELIVERED'
  );
  assert(raw.prepare("SELECT 1 AS ok FROM cashflow_ledger WHERE category = 'Logistics/FreightFee';").get());

  const replay = await request(router, 'POST', '/api/freight/deliver', {
    shipmentId: shipment.shipmentId,
    idempotencyKey: 'TEST-FREIGHT-DELIVER'
  });
  assert.strictEqual(replay.data.idempotent, true);
  assert.strictEqual(num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"), cashBeforeDelivery + contract.rewardCash);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: NPC freight contract accept, travel and delivery fee.');
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
