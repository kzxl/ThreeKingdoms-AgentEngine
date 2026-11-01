/**
 * Livelihood depth: node stock/regrowth, tool penalties, specialised skills,
 * farm yield/soil/rotation and rent discounts.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-livelihood-depth-'));
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
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = ?
    WHERE player_id = 'PLY-0001';
  `).run(SETTLEMENT);
  db.prepare("DELETE FROM player_skills WHERE skill_code IN ('SKL-HERB-FORAGE','SKL-LAND-LEASE','SKL-AGR-PLANT','SKL-AGR-SOIL');").run();
  db.prepare("DELETE FROM inventory_items WHERE item_code IN ('TOOL-PICK','TOOL-NET','TOOL-AXE','TOOL-BOW','TOOL-HOE');").run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-LIVELIHOOD%';").run();
  db.close();
}

function setSkill(db: any, code: string, tier: number): void {
  const maxExp = [0, 40, 90, 180, 320][Math.max(1, tier)] || 40;
  db.execute('DELETE FROM player_skills WHERE skill_code = ?;', [code]);
  db.execute(
    'INSERT INTO player_skills (skill_code, skill_name, tier, current_exp, max_exp) VALUES (?, ?, ?, 0, ?);',
    [code, code, tier, maxExp]
  );
}

async function run(): Promise<void> {
  console.log('=== Livelihood depth ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { bootstrapGrandStrategy } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const modules = await bootstrapGrandStrategy();
  const db = DatabaseService.getInstance(TEST_DB);
  const professions = modules.professions;

  // 1. Resource rules and tool catalog are data-driven.
  assert.strictEqual(db.queryOne('SELECT COUNT(*) AS c FROM resource_node_rules;').c, 7);
  for (const tool of ['TOOL-PICK', 'TOOL-AXE', 'TOOL-NET', 'TOOL-BOW', 'TOOL-HOE']) {
    assert(db.queryOne('SELECT 1 AS ok FROM master_items WHERE item_code = ?;', [tool]), `${tool} must exist`);
  }

  // 2. Specialised skill tier drives gather bonus.
  setSkill(db, 'SKL-HERB-FORAGE', 1);
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-ZHUO-HERB';");
  const herbLow = professions.gatherResource('PLY-0001', 'NODE-ZHUO-HERB', 16, '185-06-01');
  assert.strictEqual(herbLow.skillCode, 'SKL-HERB-FORAGE');
  assert.strictEqual(herbLow.skillTier, 1);
  assert.strictEqual(herbLow.skillBonus, 1.06);

  setSkill(db, 'SKL-HERB-FORAGE', 5);
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-ZHUO-HERB';");
  const herbHigh = professions.gatherResource('PLY-0001', 'NODE-ZHUO-HERB', 16, '185-06-01');
  assert.strictEqual(herbHigh.skillTier, 5);
  assert.strictEqual(herbHigh.skillBonus, 1.3);

  // 3. Missing tool reduces yield; owning it restores full yield.
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-ZHUO-MINE';");
  db.execute("DELETE FROM inventory_items WHERE item_code = 'TOOL-PICK';");
  const noPick = professions.gatherResource('PLY-0001', 'NODE-ZHUO-MINE', 16, '185-06-01');
  assert.strictEqual(noPick.toolMissing, true);
  assert.strictEqual(noPick.toolMultiplier, 0.7);
  db.execute(
    "INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location) VALUES ('TOOL-PICK', 'TOOL', 'Pick', 1, 60, 'Kho zhuo_xian');"
  );
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-ZHUO-MINE';");
  const withPick = professions.gatherResource('PLY-0001', 'NODE-ZHUO-MINE', 16, '185-06-01');
  assert.strictEqual(withPick.toolMissing, false);
  assert.strictEqual(withPick.toolMultiplier, 1);

  // 4. Node stock depletes, blocks, then regrows with elapsed days.
  db.execute("UPDATE gathering_node_state SET stock = 2, last_respawn_date = '185-06-01' WHERE node_id = 'NODE-ZHUO-HERB';");
  db.execute("UPDATE player_state SET fatigue = 0 WHERE player_id = 'PLY-0001';");
  const first = professions.gatherResource('PLY-0001', 'NODE-ZHUO-HERB', 16, '185-06-01');
  assert(first.yieldQuantity <= 2);
  assert.strictEqual(first.stockRemaining, 0);
  let exhausted = false;
  try {
    professions.gatherResource('PLY-0001', 'NODE-ZHUO-HERB', 16, '185-06-01');
  } catch (error: any) {
    exhausted = error.code === 'NODE_EXHAUSTED';
  }
  assert.strictEqual(exhausted, true, 'empty node must reject gathering');
  db.execute("UPDATE player_state SET fatigue = 0 WHERE player_id = 'PLY-0001';");
  const regrown = professions.gatherResource('PLY-0001', 'NODE-ZHUO-HERB', 16, '185-06-03');
  assert(regrown.yieldQuantity > 0, 'node must regrow after two days');

  // 5. Farm rent discount, skill yield, soil depletion and rotation.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FarmService } = require('../src/modules/professions/farm.service');
  const farm = FarmService.forDatabase(db);
  db.execute(
    "UPDATE land_parcels SET status = 'IDLE', leased_by = NULL, lease_until = NULL, crop_code = NULL, last_crop_code = NULL, soil_quality = 1.0, area_mu = 1 WHERE settlement_id = ?;",
    [SETTLEMENT]
  );
  setSkill(db, 'SKL-LAND-LEASE', 5);
  const board = farm.listParcels('PLY-0001', SETTLEMENT, '185-06-01');
  assert(board.parcels[0].rentCash < board.parcels[0].baseRentCash, 'land lease skill must discount rent');

  setSkill(db, 'SKL-AGR-PLANT', 1);
  farm.rent(board.parcels[0].parcelId, 'PLY-0001', '185-06-01');
  const lowPlant = farm.plant(board.parcels[0].parcelId, 'CROP-RICE', 'PLY-0001', '185-06-01');
  setSkill(db, 'SKL-AGR-PLANT', 5);
  farm.rent(board.parcels[1].parcelId, 'PLY-0001', '185-06-01');
  const highPlant = farm.plant(board.parcels[1].parcelId, 'CROP-RICE', 'PLY-0001', '185-06-01');
  assert(
    highPlant.crop!.expectedYield > lowPlant.crop!.expectedYield,
    'crop skill must raise expected yield'
  );

  const harvested = farm.harvest(board.parcels[0].parcelId, 'PLY-0001', lowPlant.crop!.harvestDate);
  assert(harvested.soilAfter < harvested.soilBefore, 'grain harvest must deplete soil');
  const field = db.queryOne('SELECT last_crop_code FROM land_parcels WHERE parcel_id = ?;', [board.parcels[0].parcelId]);
  assert.strictEqual(field.last_crop_code, 'CROP-RICE');
  assert(db.queryOne("SELECT 1 AS ok FROM player_skills WHERE skill_code = 'SKL-AGR-PLANT';"));

  // Rotation: beans after rice gets a 10% lift over beans on fresh soil.
  db.execute(
    "UPDATE land_parcels SET soil_quality = 1.0, last_crop_code = 'CROP-RICE' WHERE parcel_id = ?;",
    [board.parcels[0].parcelId]
  );
  db.execute(
    "UPDATE land_parcels SET soil_quality = 1.0, last_crop_code = NULL WHERE parcel_id = ?;",
    [board.parcels[2].parcelId]
  );
  setSkill(db, 'SKL-AGR-SOIL', 1);
  farm.rent(board.parcels[2].parcelId, 'PLY-0001', '185-06-01');
  const rotated = farm.plant(board.parcels[0].parcelId, 'CROP-BEANS', 'PLY-0001', '185-06-01');
  const fresh = farm.plant(board.parcels[2].parcelId, 'CROP-BEANS', 'PLY-0001', '185-06-01');
  assert(
    rotated.crop!.expectedYield > fresh.crop!.expectedYield,
    'legume after grain must receive a rotation bonus'
  );

  const beansHarvest = farm.harvest(board.parcels[0].parcelId, 'PLY-0001', rotated.crop!.harvestDate);
  assert(beansHarvest.soilAfter > 1.0, 'legume must restore soil');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: node stock, tool penalty, skills, rent, yield, soil and rotation.');
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
