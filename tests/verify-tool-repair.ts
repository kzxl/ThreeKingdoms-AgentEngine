/**
 * Durable tool repair: cash + skill gate restores uses; consumables cannot be
 * repaired and replays are inert.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-tool-repair-'));
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
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state SET liquid_cash = 1000, safe_cash = 0, fatigue = 0
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM player_skills WHERE skill_code = 'SKL-CRA-SMITH';").run();
  db.prepare(`
    INSERT INTO player_skills (skill_code, skill_name, tier, current_exp, max_exp)
    VALUES ('SKL-CRA-SMITH', 'Rèn Đúc', 1, 0, 40);
  `).run();
  db.prepare(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('TOOL-AXE', 'TOOL', 'Axe', 1, 50, 'Kho test'),
           ('TOOL-NET', 'TOOL', 'Net', 1, 45, 'Kho test')
    ON CONFLICT(item_code) DO UPDATE SET quantity = 1;
  `).run();
  db.prepare(`
    INSERT INTO character_tool_uses (character_id, item_code, uses_left)
    VALUES ('PLY-0001', 'TOOL-AXE', 5)
    ON CONFLICT(character_id, item_code) DO UPDATE SET uses_left = 5;
  `).run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-REPAIR%';").run();
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

async function run(): Promise<void> {
  console.log('=== Tool repair ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  const payload = { itemCode: 'TOOL-AXE', idempotencyKey: 'TEST-REPAIR-AXE' };
  const first = await request(router, 'POST', '/api/professions/tools/repair', payload);
  assert.strictEqual(first.status, 200, JSON.stringify(first.data));
  assert.strictEqual(first.data.result.usesBefore, 5);
  assert.strictEqual(first.data.result.usesAfter, 20);
  assert.strictEqual(Number((raw.prepare("SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").get() as any).liquid_cash), 985);
  assert.strictEqual(Number((raw.prepare("SELECT uses_left FROM character_tool_uses WHERE character_id = 'PLY-0001' AND item_code = 'TOOL-AXE';").get() as any).uses_left), 20);
  assert(raw.prepare("SELECT 1 AS ok FROM cashflow_ledger WHERE category = 'Livelihood/ToolRepair';").get());

  const replay = await request(router, 'POST', '/api/professions/tools/repair', payload);
  assert.strictEqual(replay.data.idempotent, true);
  assert.strictEqual(Number((raw.prepare("SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").get() as any).liquid_cash), 985);

  const full = await request(router, 'POST', '/api/professions/tools/repair', {
    itemCode: 'TOOL-AXE', idempotencyKey: 'TEST-REPAIR-FULL'
  });
  assert.strictEqual(full.status, 400);
  assert(/tối đa/i.test(full.data.error));

  const consumable = await request(router, 'POST', '/api/professions/tools/repair', {
    itemCode: 'TOOL-NET', idempotencyKey: 'TEST-REPAIR-NET'
  });
  assert.strictEqual(consumable.status, 400);
  assert(/tiêu hao/i.test(consumable.data.error));

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: durable tools repair, consumables do not, replay is inert.');
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
