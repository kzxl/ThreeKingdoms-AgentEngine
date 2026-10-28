/**
 * ThreeKingdoms-AgentEngine: Strategic World Map & ROTK Distillation Verification Suite
 * (tests/verify-strategic-world-map.ts)
 *
 * Verifies:
 * 1. Distilled ROTK Master Items, Talents, and Characters (Historical & Auxiliary Specialists).
 * 2. 20 Historical Settlements with military garrisons, defenses, granary reserves, cash.
 * 3. Master Routes with 4 explicit ROTK terrain profiles (HIGHWAY, WATERWAY, MOUNTAIN_PASS, PLANK_ROAD).
 * 4. Military Controller REST endpoints: /api/garrisons and /api/military/routes.
 * 5. Spatial Registry synchronization across all 20 tactical nodes.
 * 6. Frontend map-data structure (military, economy, hireableNpcs) and route styling specs.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Router } from '../src/server/router';
import { registerMilitaryRoutes } from '../src/modules/military/military.controller';

const SESSION_DB_PATH = path.resolve(process.cwd(), 'saves', 'session.db');
const MASTER_DB_PATH = path.resolve(process.cwd(), 'saves', 'master.db');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runWorldMapVerification(): Promise<void> {
  console.log('====================================================');
  console.log(' 🗺️  VERIFYING STRATEGIC WORLD MAP & ROTK DISTILLATION');
  console.log('====================================================\n');

  const sdb = new Database(SESSION_DB_PATH);
  const mdb = new Database(MASTER_DB_PATH);

  // 1. MASTER ITEMS VERIFICATION
  console.log('[1/7] Verifying Distilled Master Items...');
  const itemsCount = sdb.prepare('SELECT count(*) as count FROM master_items;').get() as { count: number };
  console.log(`      Found ${itemsCount.count} master items in session.db (Blueprint: >= 120)`);
  assert(itemsCount.count >= 120, `Expected at least 120 master items, found ${itemsCount.count}`);

  const qinglongBlade = sdb.prepare("SELECT * FROM master_items WHERE item_code = 'WPN-GREEN-DRAGON';").get() as any;
  assert(!!qinglongBlade, 'Thanh Long Yểm Nguyệt Đao must exist');

  const redHare = sdb.prepare("SELECT * FROM master_items WHERE item_code = 'STEED-RED-HARE';").get() as any;
  assert(!!redHare, 'Xích Thố Mã must exist');

  const saltCommodity = sdb.prepare("SELECT * FROM master_items WHERE item_code = 'COMM-XUZHOU-SALT';").get() as any;
  assert(!!saltCommodity, 'Muối Biển Hạ Phì must exist');
  console.log('      ✅ Master Items verified (Weapons, Steeds, Treatises, Commodities).');

  // 2. MASTER TALENTS VERIFICATION
  console.log('\n[2/7] Verifying Distilled Master Talents...');
  const talentsCount = sdb.prepare('SELECT count(*) as count FROM master_talents;').get() as { count: number };
  console.log(`      Found ${talentsCount.count} talents in session.db (Expected: >= 30)`);
  assert(talentsCount.count >= 30, `Expected at least 30 talents, found ${talentsCount.count}`);

  const divineBlade = sdb.prepare("SELECT * FROM master_talents WHERE talent_code = 'TLT-GOD-OF-WAR';").get() as any;
  assert(!!divineBlade, 'Vạn Nhân Địch Nghĩa Tuyệt talent must exist');

  const masterSmithTalent = sdb.prepare("SELECT * FROM master_talents WHERE talent_code = 'TLT-MASTER-METALLURGIST';").get() as any;
  assert(!!masterSmithTalent, 'Bách Luyện Thần Chùy talent must exist');
  console.log('      ✅ Master Talents verified (Combat, Tactics, Crafting, Trade, Caravan).');

  // 3. MASTER CHARACTERS & AUXILIARY SPECIALISTS
  console.log('\n[3/7] Verifying Distilled Characters & Auxiliary Workforce...');
  const charsCount = sdb.prepare('SELECT count(*) as count FROM master_characters;').get() as { count: number };
  console.log(`      Total Characters: ${charsCount.count} (Expected: >= 150)`);
  assert(charsCount.count >= 150, `Expected at least 150 characters, found ${charsCount.count}`);

  const auxNpcs = sdb.prepare("SELECT * FROM master_characters WHERE npc_id LIKE 'NPC-02%';").all() as any[];
  console.log(`      Found ${auxNpcs.length} hireable auxiliary specialist NPCs (Expected: >= 20)`);
  assert(auxNpcs.length >= 20, `Expected at least 20 auxiliary specialists, found ${auxNpcs.length}`);

  const shopkeeper = auxNpcs.find(n => n.npc_id === 'NPC-0201');
  assert(!!shopkeeper && shopkeeper.name_vi.includes('Vương Lão Thất'), 'Vương Lão Thất (Chưởng Quỹ) must exist');

  const masterSmith = auxNpcs.find(n => n.npc_id === 'NPC-0202');
  assert(!!masterSmith && masterSmith.name_vi.includes('Lý Thiết Chùy'), 'Lý Thiết Chùy (Thợ Rèn) must exist');

  const escortLeader = auxNpcs.find(n => n.npc_id === 'NPC-0203');
  assert(!!escortLeader && escortLeader.name_vi.includes('Triệu Dũng'), 'Triệu Dũng (Tiêu Đầu) must exist');
  console.log('      ✅ Auxiliary Workforce verified with specific profession roles.');

  // 4. SESSION SETTLEMENTS & MILITARY/ECONOMIC ALIGNMENT
  console.log('\n[4/7] Verifying 20 Strategic Settlements...');
  const settlements = sdb.prepare(`
    SELECT settlement_id, name_vi, garrison_troops, defense, granary_grain, treasury_cash, ruler_faction_id 
    FROM session_settlements;
  `).all() as any[];
  console.log(`      Settlement records: ${settlements.length} (Expected: 20)`);
  assert(settlements.length >= 20, `Expected at least 20 settlements, found ${settlements.length}`);

  for (const s of settlements) {
    assert(s.garrison_troops > 0, `Settlement ${s.settlement_id} must have positive garrison`);
    assert(s.defense >= 50 && s.defense <= 100, `Settlement ${s.settlement_id} defense out of range`);
    assert(s.granary_grain > 0, `Settlement ${s.settlement_id} must have grain reserves`);
    assert(s.treasury_cash > 0, `Settlement ${s.settlement_id} must have cash treasury`);
    assert(!!s.ruler_faction_id, `Settlement ${s.settlement_id} must have ruler faction`);
  }

  const luoyang = settlements.find(s => s.settlement_id === 'luo_yang');
  assert(luoyang.garrison_troops === 15000, `Luoyang garrison should be 15,000, got ${luoyang.garrison_troops}`);
  assert(luoyang.defense === 98, `Luoyang defense should be 98, got ${luoyang.defense}`);
  console.log('      ✅ All 20 settlements have aligned garrison, wall defense, grain, and cash.');

  // 5. MASTER ROUTES & 4 TERRAIN PROFILES
  console.log('\n[5/7] Verifying Inter-citadel Master Routes & Terrain Profiles...');
  const routes = sdb.prepare(`
    SELECT route_id, source_location_id, target_location_id, terrain_type, distance_li, standard_march_days, grain_provision_cost 
    FROM master_routes;
  `).all() as any[];
  console.log(`      Total Routes in DB: ${routes.length} (Expected: >= 20)`);
  assert(routes.length >= 20, `Expected at least 20 routes, found ${routes.length}`);

  const terrainTypes = new Set(routes.map(r => r.terrain_type));
  console.log('      Observed terrain types:', Array.from(terrainTypes));
  assert(terrainTypes.has('HIGHWAY') || terrainTypes.has('PLAINS'), 'Must contain HIGHWAY/PLAINS');
  assert(terrainTypes.has('WATERWAY') || terrainTypes.has('RIVER_CROSSING'), 'Must contain WATERWAY');
  assert(terrainTypes.has('MOUNTAIN_PASS') || terrainTypes.has('MOUNTAIN'), 'Must contain MOUNTAIN_PASS');
  assert(terrainTypes.has('PLANK_ROAD'), 'Must contain PLANK_ROAD');
  console.log('      ✅ All 4 tactical terrain profiles confirmed.');

  // 6. MILITARY CONTROLLER REST ENDPOINTS
  console.log('\n[6/7] Verifying Military Controller REST Endpoints...');
  const router = new Router();
  registerMilitaryRoutes(router);

  // Test /api/garrisons
  const garrisonsResponse = await new Promise<any>((resolve) => {
    const req = { method: 'GET', url: '/api/garrisons', headers: { host: 'localhost' } };
    const res = {
      writeHead: (_status: number, _headers: any) => {},
      end: (data: string) => resolve(JSON.parse(data))
    };
    (router as any).handle(req, res);
  });
  assert(garrisonsResponse.success === true, 'GET /api/garrisons must succeed');
  assert(garrisonsResponse.count >= 20, `GET /api/garrisons count expected >= 20, got ${garrisonsResponse.count}`);
  console.log(`      GET /api/garrisons returned ${garrisonsResponse.count} settlements.`);

  // Test /api/military/routes
  const routesResponse = await new Promise<any>((resolve) => {
    const req = { method: 'GET', url: '/api/military/routes', headers: { host: 'localhost' } };
    const res = {
      writeHead: (_status: number, _headers: any) => {},
      end: (data: string) => resolve(JSON.parse(data))
    };
    (router as any).handle(req, res);
  });
  assert(routesResponse.success === true, 'GET /api/military/routes must succeed');
  assert(routesResponse.count >= 20, `GET /api/military/routes count expected >= 20, got ${routesResponse.count}`);
  console.log(`      GET /api/military/routes returned ${routesResponse.count} routes with terrain.`);
  console.log('      ✅ Military Controller Endpoints verified.');

  // 7. FRONTEND MAP DATA & SPATIAL REGISTRY INTEGRITY
  console.log('\n[7/7] Verifying Frontend Map Data & Spatial Registry Alignment...');
  const mapDataContent = fs.readFileSync(path.resolve(process.cwd(), 'public', 'js', 'map-data.js'), 'utf8');
  assert(mapDataContent.includes('const WORLD_MAP_NODES = {'), 'WORLD_MAP_NODES must be declared');
  assert(mapDataContent.includes('const WORLD_MAP_ROUTES = ['), 'WORLD_MAP_ROUTES must be declared');
  assert(mapDataContent.includes('hireableNpcs:'), 'hireableNpcs must be present on nodes');
  assert(mapDataContent.includes('military: {'), 'military state must be present on nodes');
  assert(mapDataContent.includes('economy: {'), 'economy state must be present on nodes');

  const worldMapContent = fs.readFileSync(path.resolve(process.cwd(), 'public', 'js', 'world-map.js'), 'utf8');
  assert(worldMapContent.includes('currentMapViewMode'), 'world-map.js must support currentMapViewMode');
  assert(worldMapContent.includes('setMapViewMode'), 'world-map.js must support setMapViewMode');
  assert(worldMapContent.includes('map-viewmode-toolbar'), 'world-map.js must render view mode toolbar');
  assert(worldMapContent.includes('map-route-active'), 'world-map.js must support active route pulse highlight');
  assert(worldMapContent.includes('intel-npc-pill'), 'world-map.js must render hireable specialists');

  // Verify Spatial Registry
  const spatialRegistry = require('../engine/spatial-registry.js');
  assert(typeof spatialRegistry.getNodeCoordinates === 'function', 'spatial-registry must expose getNodeCoordinates');
  assert(typeof spatialRegistry.resolveLocationId === 'function', 'spatial-registry must expose resolveLocationId');

  const requiredNodes = [
    'zhuo_xian', 'ji_cheng', 'ye_cheng', 'guang_zong', 'ping_yuan',
    'luo_yang', 'chang_an', 'xu_chang', 'xia_pi', 'xiang_yang',
    'jiang_ling', 'chi_bi', 'jian_ye', 'han_zhong', 'cheng_du',
    'wan_cheng', 'shou_chun', 'shang_dang', 'wu_wei', 'jiao_zhi'
  ];

  for (const nodeKey of requiredNodes) {
    const coords = spatialRegistry.getNodeCoordinates(nodeKey);
    assert(!!coords && coords.x > 0 && coords.y > 0, `Node ${nodeKey} must have positive coordinates`);
    const locId = spatialRegistry.resolveLocationId(nodeKey);
    assert(!!locId && locId.startsWith('LOC-'), `Node ${nodeKey} must resolve to valid LOC ID, got ${locId}`);
  }
  console.log('      ✅ All 20 nodes registered with valid coordinates and LOC-IDs in Spatial Registry.');

  sdb.close();
  mdb.close();

  console.log('\n====================================================');
  console.log(' 🟢 ALL 7/7 STRATEGIC WORLD MAP VERIFICATION CHECKS PASSED');
  console.log('====================================================\n');
}

runWorldMapVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
