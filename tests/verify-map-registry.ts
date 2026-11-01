/**
 * One map registry: 20 nodes, 133 sub-locations, 132 POIs, 23 resources and 23
 * settlements all resolve to a rendered node with zero orphans.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { MapRegistryService } from '../src/modules/ecology-logistics/map-registry.service';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-map-registry-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== Map registry ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const service = MapRegistryService.forDatabase(db);
  const registry = service.getRegistry();

  assert.strictEqual(registry.nodes.length, 20, 'map must expose exactly 20 nodes');
  assert.strictEqual(new Set(registry.nodes.map(node => node.nodeId)).size, 20);
  assert.strictEqual(registry.subLocations.length, 133, 'all 133 sub-locations must be normalized');
  assert.strictEqual(registry.poiScenes.length, 132, 'all POI scenes must be exposed');
  assert.strictEqual(registry.resources.length, 23, 'all gathering nodes must be exposed');
  assert.strictEqual(registry.settlements.length, 23, 'all settlements must be exposed');
  assert.deepStrictEqual(registry.orphans, [], 'no map entity may be orphaned');

  const nodeIds = new Set(registry.nodes.map(node => node.nodeId));
  for (const sub of registry.subLocations) {
    assert(nodeIds.has(sub.nodeId), `sub-location ${sub.subLocationId} has no node`);
  }
  for (const poi of registry.poiScenes) {
    assert(nodeIds.has(poi.nodeId), `POI ${poi.poiName} has no node`);
  }
  for (const resource of registry.resources) {
    assert(nodeIds.has(resource.nodeId), `resource ${resource.resourceNodeId} has no node`);
  }
  for (const settlement of registry.settlements) {
    assert(nodeIds.has(settlement.nodeId), `settlement ${settlement.settlementId} has no node`);
  }

  const zhuo = service.getSubLocationsForNode('zhuo_xian');
  assert(zhuo.length >= 7, 'zhuo_xian must expose its seven sub-locations');
  assert(zhuo.some(row => /Vườn Đào/.test(row.nameVi)), 'zhuo_xian must include Vườn Đào');
  assert(zhuo.some(row => row.kind === 'URBAN' || row.kind === 'WILDERNESS'));
  assert(service.getPoiScenesForNode('zhuo_xian').length > 0, 'zhuo_xian must expose POI scenes');
  assert(service.getResourcesForNode('zhuo_xian').length > 0, 'zhuo_xian must expose resource nodes');

  const totalByNode = Object.values(registry.subLocationsByNode)
    .reduce((sum, rows) => sum + rows.length, 0);
  assert.strictEqual(totalByNode, registry.subLocations.length);

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: one registry, 20 nodes, 133 sub-locations, 132 POIs, zero orphans.');
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
