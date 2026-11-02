/**
 * City mini-map: 93 CITY rows resolve for a city, entering one updates
 * `current_sub_location` without spending a day, and wilderness or foreign-city
 * targets are rejected.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { MapRegistryService } from '../src/modules/ecology-logistics/map-registry.service';
import { CityMapService } from '../src/modules/ecology-logistics/city-map.service';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-city-map-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== City mini-map ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);

  const registry = MapRegistryService.forDatabase(db).getRegistry();
  const city = registry.subLocations.filter(row => row.mapScope === 'CITY');
  const wilderness = registry.subLocations.filter(row => row.mapScope === 'WILDERNESS');
  assert.strictEqual(city.length, 93, '93 urban rows must be scoped');
  for (const row of city) {
    assert(row.localX !== null && row.localY !== null, `${row.nameVi} must have local coordinates`);
  }

  db.execute(`
    UPDATE player_state
    SET current_location = 'LOC-0002', current_sub_location = 'Nam Cung Kim Loan Điện'
    WHERE player_id = 'PLY-0001';
  `);
  const service = CityMapService.forDatabase(db);
  const view = service.list('PLY-0001', 'luo_yang');
  assert(view.citySpots.length >= 1, 'luo_yang must expose urban rows');
  assert(view.poiScenes.length >= 1, 'luo_yang must expose POI scenes');
  const target = view.citySpots.find((row: any) => row.nameVi !== 'Nam Cung Kim Loan Điện');
  assert(target, 'luo_yang must have a second urban row');

  const entered = service.enter('PLY-0001', target.subLocationId);
  assert.strictEqual(entered.subLocationId, target.subLocationId);
  assert.strictEqual(entered.travelDays, 0);
  assert.strictEqual(
    db.queryOne<{ current_sub_location: string }>(
      "SELECT current_sub_location FROM player_state WHERE player_id = 'PLY-0001';"
    )?.current_sub_location,
    target.nameVi
  );

  const wildernessTarget = wilderness.find(row => row.nodeId === 'luo_yang');
  assert(wildernessTarget, 'luo_yang must have a wilderness row');
  assert.throws(
    () => service.enter('PLY-0001', wildernessTarget!.subLocationId),
    /dã ngoại/i
  );

  const foreign = city.find(row => row.nodeId !== 'luo_yang');
  assert(foreign, 'another city urban row must exist');
  assert.throws(
    () => service.enter('PLY-0001', foreign!.subLocationId),
    /thành khác/i
  );

  const ui = fs.readFileSync(path.join(ROOT, 'src/client/features/world-map/city-map.modal.ts'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'src/client/features/world-map/city-map.service.ts'), 'utf8');
  const worldMap = fs.readFileSync(path.join(ROOT, 'public/js/world-map.js'), 'utf8');
  assert(ui.includes('data-city-enter'), 'city UI must render enterable spots');
  assert(ui.includes('city-spot-card'), 'city UI must render a hotspot grid');
  assert(ui.includes('wilderness-scene-card'), 'city UI must open a local scene');
  assert(client.includes('/api/map/city'), 'client must load the city registry');
  assert(client.includes('/api/scene'), 'client must open contextual scenes');
  assert(worldMap.includes('openCityMap'), 'world map must expose the city entrance');
  assert(worldMap.includes('Vào Thành'), 'world map must show the enter-city button');

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: city scope, enter, scene surface and guards.');
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
