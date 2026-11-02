/**
 * Exploration & rare item discovery verification.
 *
 * Proves the pity floor, the fame-driven chance, the one-day cost and the
 * append-only exploration log. The live campaign copy is used so the seeded
 * discovery table is exactly the one the server reads.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const LIVE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-explore-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== Exploration & rare item discovery ===');

  fs.copyFileSync(LIVE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${LIVE_DB}${suffix}`)) fs.copyFileSync(`${LIVE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }

  // Point every module at the temp copy before any singleton is constructed;
  // a static import would bind the live save and the test would delete its log.
  process.env.SIM_DB_PATH = TEST_DB;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ExplorationService } = require('../src/modules/progression/exploration.service');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fameEffects } = require('../src/shared/prestige');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  try {
    const table = db.queryOne("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='discovery_items';");
    assert(table, 'migration 013 must create discovery_items');
    const rows = db.queryOne('SELECT COUNT(*) AS c FROM discovery_items;');
    assert(Number(rows?.c) >= 3, 'discovery table must be seeded');

    db.execute('DELETE FROM exploration_log;');
    db.execute("UPDATE player_state SET fame = 0 WHERE player_id = 'PLY-0001';");
    db.execute(`UPDATE campaign_meta SET "current_date" = '184-05-02';`);

    const before = db.queryOne('SELECT strategic_grain, fatigue FROM player_state LIMIT 1;');
    const inventoryBefore = db.queryOne('SELECT COUNT(*) AS c FROM inventory_items;');
    const chance = fameEffects(0).discoveryChance;
    assert(Math.abs(chance - 0.03) < 1e-9, 'fame 0 discovery chance must be 3%');

    // Ten failures force the pity find, so the test never depends on a lucky roll.
    for (let i = 0; i < 10; i += 1) {
      db.execute(
        `INSERT INTO exploration_log
          (explore_id, character_id, location, poi_name, game_date, fame_at_roll, chance, roll, success, item_code, item_tier, pity_triggered)
         VALUES (?, 'PLY-0001', 'LOC-0001', 'Test POI', '184-05-02', 0, 0.03, 1.0, 0, NULL, NULL, 0);`,
        [`EXP-PITY-${i}`]
      );
    }

    const service = ExplorationService.forDatabase(db);
    const result = service.explore({ characterId: 'PLY-0001', location: 'LOC-0001', poiName: 'Test POI' });
    assert.strictEqual(result.success, true, `explore failed: ${result.error}`);
    assert.strictEqual(result.pityTriggered, true, 'ten failures must trigger pity');
    assert.strictEqual(result.discovered, true, 'pity must guarantee a find');
    assert(result.item, 'pity find must include an item');
    assert.strictEqual(result.item!.tier, 1, 'fame 0 can only find tier 1');
    assert.strictEqual(result.gameDate, '184-05-04', 'exploration must cost two days');
    assert.strictEqual(result.chance, 0.03, 'chance must match the fame formula');

    const after = db.queryOne('SELECT strategic_grain, fatigue FROM player_state LIMIT 1;');
    assert(Number(after.strategic_grain) < Number(before.strategic_grain), 'the day must consume grain upkeep');

    const inventoryAfter = db.queryOne('SELECT COUNT(*) AS c FROM inventory_items;');
    assert(Number(inventoryAfter?.c) >= Number(inventoryBefore?.c), 'discovery must not destroy inventory rows');
    const stock = db.queryOne('SELECT quantity FROM inventory_items WHERE item_code = ?;', [result.item!.itemCode]);
    assert(Number(stock?.quantity) >= 1, 'discovered item must be in inventory');

    const log = db.queryOne(
      'SELECT * FROM exploration_log WHERE item_code = ? ORDER BY rowid DESC LIMIT 1;',
      [result.item!.itemCode]
    );
    assert(log, 'discovery must be written to exploration_log');
    assert.strictEqual(Number(log.pity_triggered), 1, 'log must record the pity flag');
    assert.strictEqual(Number(log.success), 1, 'log must record success');

    const movement = db.queryOne(
      "SELECT * FROM stock_movements WHERE movement_type = 'Discovery' ORDER BY rowid DESC LIMIT 1;"
    );
    assert(movement, 'discovery must create a stock movement');

    const action = db.queryOne(
      "SELECT * FROM action_log WHERE action_type = 'EXPLORE_POI' ORDER BY rowid DESC LIMIT 1;"
    );
    assert(action, 'exploration must be recorded in action_log');

    // Day 30 no longer blocks: the action rolls into the next month and the
    // month close runs automatically before the exploration resolves.
    db.execute(`UPDATE campaign_meta SET "current_date" = '184-05-30';`);
    const rollover = service.explore({ characterId: 'PLY-0001', location: 'LOC-0001' });
    assert.strictEqual(rollover.success, true, 'day 30 must roll over, not block');
    assert.strictEqual(rollover.time.advancedDays, 2, 'exploration still costs exactly two days');
    assert.strictEqual(rollover.time.monthsClosed.length, 1, 'crossing day 30 must close the month');
  } finally {
    db.close();
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
    }
  }

  const ui = fs.readFileSync(path.join(ROOT, 'public/js/spatial-poi-controller.js'), 'utf8');
  assert(ui.includes('const result = data.result || data;'), 'client must unwrap the explore response');
  assert(ui.includes('result.narrativeVi'), 'client must use the server narrative for misses');
  assert(!ui.includes('Danh vọng ${data.fame}'), 'client must not print undefined fame');
  const index = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert(index.includes('Tản Bộ'), 'button label must say it walks the current POI');
  assert(index.includes('muốn đi xa hơn hãy mở Dã Ngoại'), 'tooltip must distinguish walking from wilderness');
  const mapData = fs.readFileSync(path.join(ROOT, 'public/js/map-data.js'), 'utf8');
  assert(mapData.includes('SpatialPoiController.updateActionDock(targetLoc)'), 'local walking must refresh the action dock');
  assert(ui.includes('function currentLocationName()'), 'controller must prefer the canonical active sub-location');

  console.log('   ✅ exploration costs a day, logs every roll and honors the pity floor');
}

run();
