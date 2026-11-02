/**
 * Wilderness local map: 40 WILDERNESS rows have coordinates, a city's
 * wilderness list resolves, travel updates `current_sub_location`, and urban or
 * foreign-city targets are rejected.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { MapRegistryService } from '../src/modules/ecology-logistics/map-registry.service';
import { WildernessService } from '../src/modules/ecology-logistics/wilderness.service';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-wilderness-'));
const TEST_DB = path.join(TMP, 'session.db');
const DATE = '185-06-01';

function run(): void {
  console.log('=== Wilderness local map ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute(`UPDATE campaign_meta SET status = 'ACTIVE', "current_date" = ? WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);`, [DATE]);

  const registry = MapRegistryService.forDatabase(db).getRegistry();
  const wilderness = registry.subLocations.filter(row => row.mapScope === 'WILDERNESS');
  const city = registry.subLocations.filter(row => row.mapScope === 'CITY');
  assert.strictEqual(wilderness.length, 40, '40 wilderness rows must be scoped');
  assert.strictEqual(city.length, 93, '93 urban rows must be scoped');
  for (const row of wilderness) {
    assert(row.localX !== null && row.localY !== null, `${row.nameVi} must have local coordinates`);
    assert(row.localX! >= 0 && row.localX! <= 1 && row.localY! >= 0 && row.localY! <= 1);
    assert(row.iconKey, `${row.nameVi} must have an icon key`);
  }

  // Luoyang has one wilderness POI: Bắc Mang Sơn Cổ Đạo.
  db.execute(`
    UPDATE player_state
    SET current_location = 'LOC-0002', current_sub_location = 'Nam Cung Kim Loan Điện'
    WHERE player_id = 'PLY-0001';
  `);
  const service = WildernessService.forDatabase(db);
  const view = service.list('PLY-0001', 'luo_yang');
  assert(view.wilderness.length >= 1, 'luo_yang must expose wilderness rows');
  const target = view.wilderness[0];

  const moved = service.travel('PLY-0001', target.subLocationId, DATE);
  assert.strictEqual(moved.subLocationId, target.subLocationId);
  assert.strictEqual(moved.travelDays, 1);
  assert.strictEqual(
    db.queryOne<{ current_sub_location: string }>(
      "SELECT current_sub_location FROM player_state WHERE player_id = 'PLY-0001';"
    )?.current_sub_location,
    target.nameVi
  );

  // Urban targets belong to the city mini-map, not this surface.
  const urban = city.find(row => row.nodeId === 'luo_yang');
  assert(urban, 'luo_yang must have an urban row');
  assert.throws(
    () => service.travel('PLY-0001', urban!.subLocationId, DATE),
    /nội thành/i
  );

  // A wilderness point in another city is rejected.
  const foreign = wilderness.find(row => row.nodeId !== 'luo_yang');
  assert(foreign, 'another city wilderness row must exist');
  assert.throws(
    () => service.travel('PLY-0001', foreign!.subLocationId, DATE),
    /thành khác/i
  );

  // The wilderness surface exposes gather and POI-scene actions, not counts only.
  const ui = fs.readFileSync(path.join(ROOT, 'src/client/features/world-map/wilderness-map.modal.ts'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'src/client/features/world-map/wilderness-map.service.ts'), 'utf8');
  assert(ui.includes('data-wilderness-gather'), 'wilderness UI must render gather badges');
  assert(ui.includes('data-poi-scene'), 'wilderness UI must render POI survey actions');
  assert(ui.includes('wilderness-scene-card'), 'POI scenes must render inline');
  assert(client.includes('/api/professions/gather'), 'client gather must call the professions endpoint');
  assert(client.includes('/api/scene'), 'client POI survey must call the contextual scene endpoint');

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: wilderness scope, coordinates, travel and city guards.');
}

function cleanup(): void {
  try {
    DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
