/**
 * Perishables and freight skills: fresh fish spoils over travel days, dried
 * fish does not, cold chain reduces loss and freight handling cuts escort fees.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-spoilage-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare("DELETE FROM player_skills WHERE skill_code IN ('SKL-LOG-COLD','SKL-LOG-FREIGHT');").run();
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
  console.log('=== Spoilage & freight skills ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { computeSpoilage, freightDiscountPct } = require('../src/modules/market/spoilage');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);

  const rawFish = computeSpoilage(db, 'COM-FISH-FRESH', 100, 5);
  assert(rawFish.lost > 0, 'fresh fish must spoil over five days');
  assert(rawFish.quantity < 100);

  const dryFish = computeSpoilage(db, 'FOOD-FISH-DRIED', 100, 5);
  assert(dryFish.lost < rawFish.lost, 'dried fish must spoil far less than fresh');
  assert(dryFish.quantity >= 99, 'dried fish must remain almost intact');

  setSkill(db, 'SKL-LOG-COLD', 5);
  const coldFish = computeSpoilage(db, 'COM-FISH-FRESH', 100, 5);
  assert(coldFish.lost < rawFish.lost, 'cold chain must reduce spoilage');
  assert(coldFish.reductionPct >= 50);

  const noFreight = freightDiscountPct(db);
  setSkill(db, 'SKL-LOG-FREIGHT', 5);
  const withFreight = freightDiscountPct(db);
  assert(withFreight > noFreight, 'freight skill must discount escort fees');
  assert(withFreight >= 10);

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: fresh vs dried cargo, cold chain and freight discount.');
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
