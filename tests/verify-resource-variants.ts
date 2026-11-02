/**
 * Resource variants and processing: skill/season-weighted fish, game and timber
 * outputs, byproducts, and the fish/jerky/hide/plank recipes.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-resource-variants-'));
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
    SET status = 'ACTIVE', "current_date" = '185-09-15', active_turn = 20, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'ping_yuan'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM player_skills WHERE skill_code IN ('SKL-FISH-NET','SKL-HUNT-TRACK','SKL-WILD-SURVIVAL','SKL-HUNT-SKIN');").run();
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

function scalar(db: any, sql: string, params: any[] = []): any {
  return db.prepare(sql).get(...params);
}

async function run(): Promise<void> {
  console.log('=== Resource variants & processing ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { bootstrapGrandStrategy, createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ResourceNodeService } = require('../src/modules/professions/resource-node.service');
  DatabaseService.resetInstance();
  const modules = await bootstrapGrandStrategy();
  const db = DatabaseService.getInstance(TEST_DB);
  const resources = ResourceNodeService.forDatabase(db);
  const router = createGrandStrategyRouter();

  // 1. Variant selection honours skill tier and season.
  assert.strictEqual(resources.pickVariant('FISH', 0, '185-09-15').variantId, 'VAR-FISH-BASE');
  const autumnFish = new Set<string>();
  for (let i = 0; i < 400; i += 1) {
    const variant = resources.pickVariant('FISH', 3, '185-09-15');
    if (variant) autumnFish.add(variant.variantId);
  }
  assert(autumnFish.has('VAR-FISH-BASE'));
  assert(autumnFish.has('VAR-FISH-CARP'));
  assert(autumnFish.has('VAR-FISH-STURGEON'));
  assert(!autumnFish.has('VAR-FISH-SHRIMP'), 'shrimp is a summer-only variant');

  const summerFish = new Set<string>();
  for (let i = 0; i < 400; i += 1) {
    const variant = resources.pickVariant('FISH', 1, '185-06-15');
    if (variant) summerFish.add(variant.variantId);
  }
  assert(summerFish.has('VAR-FISH-SHRIMP'));
  assert(!summerFish.has('VAR-FISH-STURGEON'), 'sturgeon requires autumn and tier 3');

  const gameVariants = new Set<string>();
  for (let i = 0; i < 500; i += 1) {
    const variant = resources.pickVariant('GAME', 4, '185-09-15');
    if (variant) gameVariants.add(variant.variantId);
  }
  assert(gameVariants.has('VAR-GAME-ANTLER'), 'tier 4 autumn hunting must unlock antler');

  const timberVariants = new Set<string>();
  for (let i = 0; i < 500; i += 1) {
    const variant = resources.pickVariant('TIMBER', 4, '185-09-15');
    if (variant) timberVariants.add(variant.variantId);
  }
  assert(timberVariants.has('VAR-TIMBER-EBONY'), 'tier 4 forestry must unlock ebony');

  // 2. Gather uses the variant and writes the byproduct.
  setSkill(db, 'SKL-FISH-NET', 3);
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-09-15' WHERE node_id = 'NODE-PINGYUAN-FISH';");
  const fish = modules.professions.gatherResource('PLY-0001', 'NODE-PINGYUAN-FISH', 20, '185-09-15');
  assert(['COM-FISH-FRESH', 'COM-FISH-CARP', 'COM-FISH-STURGEON'].includes(fish.itemCode));
  assert(fish.variant && ['COMMON', 'FINE', 'RARE'].includes(fish.variant.quality));

  setSkill(db, 'SKL-HUNT-TRACK', 4);
  db.execute("UPDATE player_state SET current_location = 'ji_cheng', fatigue = 0 WHERE player_id = 'PLY-0001';");
  db.execute("UPDATE gathering_node_state SET stock = 100, last_respawn_date = '185-09-15' WHERE node_id = 'NODE-JICHENG-GAME';");
  const game = modules.professions.gatherResource('PLY-0001', 'NODE-JICHENG-GAME', 20, '185-09-15');
  assert(['COM-GAME-MEAT', 'COM-GAME-VENISON'].includes(game.itemCode));
  assert(['RAW-HIDE', 'COM-GAME-ANTLER'].includes(game.byproductItemCode));
  assert(game.byproductQuantity > 0);
  assert(scalar(db, 'SELECT quantity FROM inventory_items WHERE item_code = ?;', [game.byproductItemCode])?.quantity > 0);

  // 3. Recipes process the common outputs; skill gates are enforced.
  const stockRows: Array<[string, number]> = [
    ['COM-FISH-FRESH', 20], ['COM-SALT', 20], ['COM-GAME-MEAT', 20], ['RAW-HIDE', 10], ['RAW-TIMBER-OAK', 20],
    ['RAW-FISH-ROE', 2], ['COM-FISH-CARP', 4], ['COM-GAME-VENISON', 4], ['RAW-TIMBER-EBONY', 4]
  ];
  for (const [code, qty] of stockRows) {
    db.execute(`
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES (?, 'RAW_MATERIAL', ?, ?, 10, 'Kho test')
      ON CONFLICT(item_code) DO UPDATE SET quantity = ?;
    `, [code, code, qty, qty]);
  }

  setSkill(db, 'SKL-FISH-NET', 1);
  const blocked = await request(router, 'POST', '/api/professions/craft', {
    recipeCode: 'REC-FISH-SAUCE',
    quantity: 1,
    idempotencyKey: 'TEST-VARIANT-SAUCE-BLOCKED'
  });
  assert.strictEqual(blocked.status, 400, JSON.stringify(blocked.data));
  assert(/bậc 2/i.test(blocked.data.error));

  setSkill(db, 'SKL-FISH-NET', 2);
  const dried = await request(router, 'POST', '/api/professions/craft', {
    recipeCode: 'REC-FISH-DRY',
    quantity: 1,
    idempotencyKey: 'TEST-VARIANT-FISH-DRY'
  });
  assert.strictEqual(dried.status, 200, JSON.stringify(dried.data));
  assert.strictEqual(dried.data.productItemCode, 'FOOD-FISH-DRIED');
  assert(scalar(db, "SELECT quantity FROM inventory_items WHERE item_code = 'FOOD-FISH-DRIED';")?.quantity >= 1);
  assert.strictEqual(scalar(db, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-FISH-FRESH';").quantity, 18);

  // Rare variants have their own sink.
  setSkill(db, 'SKL-FISH-NET', 3);
  const caviar = await request(router, 'POST', '/api/professions/craft', {
    recipeCode: 'REC-CAVIAR', quantity: 1, idempotencyKey: 'TEST-VARIANT-CAVIAR'
  });
  assert.strictEqual(caviar.status, 200, JSON.stringify(caviar.data));
  assert(scalar(db, "SELECT quantity FROM inventory_items WHERE item_code = 'FOOD-CAVIAR';")?.quantity >= 1);

  const carpDried = await request(router, 'POST', '/api/professions/craft', {
    recipeCode: 'REC-FISH-DRY-CARP', quantity: 1, idempotencyKey: 'TEST-VARIANT-CARP'
  });
  assert.strictEqual(carpDried.status, 200, JSON.stringify(carpDried.data));
  assert(scalar(db, "SELECT quantity FROM inventory_items WHERE item_code = 'FOOD-FISH-DRIED-FINE';")?.quantity >= 1);

  setSkill(db, 'SKL-HUNT-SKIN', 2);
  const jerky = await request(router, 'POST', '/api/professions/craft', {
    recipeCode: 'REC-GAME-JERKY', quantity: 1, idempotencyKey: 'TEST-VARIANT-JERKY'
  });
  assert.strictEqual(jerky.status, 200, JSON.stringify(jerky.data));
  assert(scalar(db, "SELECT quantity FROM inventory_items WHERE item_code = 'FOOD-GAME-JERKY';")?.quantity >= 1);

  const hide = await request(router, 'POST', '/api/professions/craft', {
    recipeCode: 'REC-HIDE-CURED', quantity: 1, idempotencyKey: 'TEST-VARIANT-HIDE'
  });
  assert.strictEqual(hide.status, 200, JSON.stringify(hide.data));
  assert(scalar(db, "SELECT quantity FROM inventory_items WHERE item_code = 'RAW-HIDE-CURED';")?.quantity >= 1);

  setSkill(db, 'SKL-WILD-SURVIVAL', 1);
  const plank = await request(router, 'POST', '/api/professions/craft', {
    recipeCode: 'REC-TIMBER-PLANK', quantity: 1, idempotencyKey: 'TEST-VARIANT-PLANK'
  });
  assert.strictEqual(plank.status, 200, JSON.stringify(plank.data));
  assert(scalar(db, "SELECT quantity FROM inventory_items WHERE item_code = 'MAT-TIMBER-PLANK';")?.quantity >= 1);

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: variants, byproducts and processing recipes.');
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
