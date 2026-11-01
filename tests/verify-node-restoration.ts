/**
 * Node restoration: buy fry/saplings, spend a day and refill a depleted node.
 * Failure paths must not mutate stock, items or cash.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-node-restore-'));
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
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 1000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'ping_yuan'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM player_skills WHERE skill_code = 'SKL-FISH-NET';").run();
  db.prepare(`
    INSERT INTO player_skills (skill_code, skill_name, tier, current_exp, max_exp)
    VALUES ('SKL-FISH-NET', 'Giăng Lưới & Đặt Lờ', 1, 0, 40);
  `).run();
  db.prepare(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('STOCK-FISH-FRY', 'STOCK', 'Fish fry', 2, 15, 'Kho test')
    ON CONFLICT(item_code) DO UPDATE SET quantity = 2;
  `).run();
  db.prepare("UPDATE gathering_node_state SET stock = 0, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-PINGYUAN-FISH';").run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-RESTORE%';").run();
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
  console.log('=== Node restoration ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  const payload = { nodeId: 'NODE-PINGYUAN-FISH', idempotencyKey: 'TEST-RESTORE-FISH' };
  const first = await request(router, 'POST', '/api/professions/nodes/restore', payload);
  assert.strictEqual(first.status, 200, JSON.stringify(first.data));
  assert.strictEqual(first.data.idempotent, false);
  assert.strictEqual(first.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02');
  assert(first.data.result.stockAfter > first.data.result.stockBefore);
  assert.strictEqual(first.data.result.stockBefore, 3, 'one elapsed day regrows 3 fish before restoration');
  assert.strictEqual(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash), 990);
  assert.strictEqual(Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'STOCK-FISH-FRY';").quantity), 1);
  const restoreTxn = scalar(raw, "SELECT txn_id FROM cashflow_ledger WHERE category = 'Livelihood/NodeRestore' ORDER BY rowid DESC LIMIT 1;");
  assert(restoreTxn?.txn_id, 'restoration must write a cashflow row');
  const journal = raw.prepare('SELECT debit, credit FROM account_journal WHERE txn_id = ?;').all(restoreTxn.txn_id) as any[];
  assert.strictEqual(journal.length, 2);
  assert.strictEqual(
    journal.reduce((sum, row) => sum + Number(row.debit), 0),
    journal.reduce((sum, row) => sum + Number(row.credit), 0)
  );
  assert(scalar(raw, "SELECT 1 AS ok FROM player_skills WHERE skill_code = 'SKL-FISH-NET';"));

  const second = await request(router, 'POST', '/api/professions/nodes/restore', payload);
  assert.strictEqual(second.status, 200);
  assert.strictEqual(second.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02', 'replay must not spend another day');
  assert.strictEqual(Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'STOCK-FISH-FRY';").quantity), 1);

  // Full node is rejected before consuming the item.
  raw.prepare("UPDATE gathering_node_state SET stock = 60, last_respawn_date = '185-06-02' WHERE node_id = 'NODE-PINGYUAN-FISH';").run();
  const full = await request(router, 'POST', '/api/professions/nodes/restore', {
    nodeId: 'NODE-PINGYUAN-FISH', idempotencyKey: 'TEST-RESTORE-FULL'
  });
  assert.strictEqual(full.status, 400);
  assert(/đầy tài nguyên/i.test(full.data.error));

  // Skill gate: a tier-0 character cannot restore.
  raw.prepare("DELETE FROM player_skills WHERE skill_code = 'SKL-FISH-NET';").run();
  raw.prepare("UPDATE gathering_node_state SET stock = 0, last_respawn_date = '185-06-02' WHERE node_id = 'NODE-PINGYUAN-FISH';").run();
  raw.prepare("UPDATE inventory_items SET quantity = 2 WHERE item_code = 'STOCK-FISH-FRY';").run();
  const blocked = await request(router, 'POST', '/api/professions/nodes/restore', {
    nodeId: 'NODE-PINGYUAN-FISH', idempotencyKey: 'TEST-RESTORE-SKILL'
  });
  assert.strictEqual(blocked.status, 400);
  assert(/bậc 1/i.test(blocked.data.error));

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: restore spends time/cash/item, refills stock and replays cleanly.');
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
