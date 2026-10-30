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
import { DatabaseService } from '../src/core/database';
import { ExplorationService } from '../src/modules/progression/exploration.service';
import { fameEffects } from '../src/shared/prestige';

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

  const db = DatabaseService.getInstance(TEST_DB);
  try {
    const table = db.queryOne<any>("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='discovery_items';");
    assert(table, 'migration 013 must create discovery_items');
    const rows = db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM discovery_items;');
    assert(Number(rows?.c) >= 3, 'discovery table must be seeded');

    db.execute('DELETE FROM exploration_log;');
    db.execute("UPDATE player_state SET fame = 0 WHERE player_id = 'PLY-0001';");
    db.execute(`UPDATE campaign_meta SET "current_date" = '184-05-02';`);

    const before = db.queryOne<any>('SELECT strategic_grain, fatigue FROM player_state LIMIT 1;');
    const inventoryBefore = db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM inventory_items;');
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
    assert.strictEqual(result.gameDate, '184-05-03', 'exploration must cost one day');
    assert.strictEqual(result.chance, 0.03, 'chance must match the fame formula');

    const after = db.queryOne<any>('SELECT strategic_grain, fatigue FROM player_state LIMIT 1;');
    assert(Number(after.strategic_grain) < Number(before.strategic_grain), 'the day must consume grain upkeep');

    const inventoryAfter = db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM inventory_items;');
    assert(Number(inventoryAfter?.c) >= Number(inventoryBefore?.c), 'discovery must not destroy inventory rows');
    const stock = db.queryOne<any>('SELECT quantity FROM inventory_items WHERE item_code = ?;', [result.item!.itemCode]);
    assert(Number(stock?.quantity) >= 1, 'discovered item must be in inventory');

    const log = db.queryOne<any>(
      'SELECT * FROM exploration_log WHERE item_code = ? ORDER BY rowid DESC LIMIT 1;',
      [result.item!.itemCode]
    );
    assert(log, 'discovery must be written to exploration_log');
    assert.strictEqual(Number(log.pity_triggered), 1, 'log must record the pity flag');
    assert.strictEqual(Number(log.success), 1, 'log must record success');

    const movement = db.queryOne<any>(
      "SELECT * FROM stock_movements WHERE movement_type = 'Discovery' ORDER BY rowid DESC LIMIT 1;"
    );
    assert(movement, 'discovery must create a stock movement');

    const action = db.queryOne<any>(
      "SELECT * FROM action_log WHERE action_type = 'EXPLORE_POI' ORDER BY rowid DESC LIMIT 1;"
    );
    assert(action, 'exploration must be recorded in action_log');

    // Day 30 must block before any roll.
    db.execute(`UPDATE campaign_meta SET "current_date" = '184-05-30';`);
    const blocked = service.explore({ characterId: 'PLY-0001', location: 'LOC-0001' });
    assert.strictEqual(blocked.success, false, 'day 30 must block exploration');
    assert.strictEqual(blocked.code, 'MONTH_END', 'day 30 must return MONTH_END');
  } finally {
    db.close();
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
    }
  }

  console.log('   ✅ exploration costs a day, logs every roll and honors the pity floor');
}

run();
