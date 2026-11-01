/**
 * Tool durability: nets/traps are consumed per use; axes/picks/hoes/bows lose
 * one durability point and break when the last point is spent.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-tool-durability-'));
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
    UPDATE player_state
    SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'ji_cheng'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM player_skills WHERE skill_code IN ('SKL-WILD-SURVIVAL','SKL-FISH-NET','SKL-CRA-WEAVE','SKL-CRA-SMITH');").run();
  for (const code of ['TOOL-AXE', 'TOOL-NET', 'TOOL-PICK', 'TOOL-TRAP', 'TOOL-BOW', 'TOOL-HOE']) {
    db.prepare('DELETE FROM inventory_items WHERE item_code = ?;').run(code);
  }
  db.prepare("DELETE FROM character_tool_uses WHERE character_id = 'PLY-0001';").run();
  db.prepare("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id IN ('NODE-JICHENG-WOOD','NODE-PINGYUAN-FISH');").run();
  db.close();
}

async function run(): Promise<void> {
  console.log('=== Tool durability ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { bootstrapGrandStrategy } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const modules = await bootstrapGrandStrategy();
  const db = DatabaseService.getInstance(TEST_DB);

  // 1. Missing tool: gather still works at -30%, but nothing is consumed.
  const noAxe = modules.professions.gatherResource('PLY-0001', 'NODE-JICHENG-WOOD', 16, '185-06-01');
  assert.strictEqual(noAxe.toolMissing, true);
  assert.strictEqual(noAxe.toolMultiplier, 0.7);
  assert.strictEqual(noAxe.toolBroke, false);

  // 2. Durable axe loses one use and stays in inventory.
  db.execute(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('TOOL-AXE', 'TOOL', 'Axe', 1, 50, 'Kho ji_cheng');
  `);
  db.execute("UPDATE player_state SET fatigue = 0 WHERE player_id = 'PLY-0001';");
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-JICHENG-WOOD';");
  const first = modules.professions.gatherResource('PLY-0001', 'NODE-JICHENG-WOOD', 16, '185-06-01');
  assert.strictEqual(first.toolBroke, false);
  assert.strictEqual(first.toolUsesLeft, 19);
  assert.strictEqual(Number(db.queryOne("SELECT quantity FROM inventory_items WHERE item_code = 'TOOL-AXE';").quantity), 1);

  // 3. Last use breaks the axe and removes it.
  db.execute("UPDATE character_tool_uses SET uses_left = 1 WHERE character_id = 'PLY-0001' AND item_code = 'TOOL-AXE';");
  db.execute("UPDATE player_state SET fatigue = 0 WHERE player_id = 'PLY-0001';");
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-JICHENG-WOOD';");
  const broke = modules.professions.gatherResource('PLY-0001', 'NODE-JICHENG-WOOD', 16, '185-06-01');
  assert.strictEqual(broke.toolBroke, true);
  assert.strictEqual(Number(db.queryOne("SELECT quantity FROM inventory_items WHERE item_code = 'TOOL-AXE';")?.quantity || 0), 0);

  // 4. Net is a consumable: one successful fishing gather removes it.
  db.execute(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('TOOL-NET', 'TOOL', 'Net', 1, 45, 'Kho ping_yuan');
  `);
  db.execute("UPDATE player_state SET fatigue = 0, current_location = 'ping_yuan' WHERE player_id = 'PLY-0001';");
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-PINGYUAN-FISH';");
  const net = modules.professions.gatherResource('PLY-0001', 'NODE-PINGYUAN-FISH', 16, '185-06-01');
  assert.strictEqual(net.toolBroke, true);
  assert.strictEqual(net.toolKind, 'CONSUMABLE');
  assert.strictEqual(Number(db.queryOne("SELECT quantity FROM inventory_items WHERE item_code = 'TOOL-NET';")?.quantity || 0), 0);

  // 5. Tool recipes produce the same items.
  db.execute(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('RAW-REED-FIBER', 'RAW_MATERIAL', 'Reed', 4, 8, 'Kho test'),
           ('COM-TWINE', 'RAW_MATERIAL', 'Twine', 4, 20, 'Kho test')
    ON CONFLICT(item_code) DO UPDATE SET quantity = 4;
  `);
  // Recipe is data-only here; the craft route is covered by the variant suite.
  assert(db.queryOne("SELECT 1 AS ok FROM master_recipes WHERE recipe_code = 'REC-TOOL-NET';"));
  assert(db.queryOne("SELECT 1 AS ok FROM tool_rules WHERE item_code = 'TOOL-NET' AND kind = 'CONSUMABLE';"));

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: consumable nets, durable axes and tool breaking.');
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
