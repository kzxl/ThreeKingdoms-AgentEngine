/**
 * Career paths: one resolver feeds both the API and gameplay.
 *
 * Verifies the five scores, the real modifiers, the `outcome_type` duel count
 * (the old query read a non-existent `outcome` column and always returned 0),
 * and that a MARTIAL path actually boosts WAR EXP through the attribute writer.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const { computeCareerPaths, getCareerModifiers } = require('../engine/career-paths');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-career-'));
const TEST_DB = path.join(TMP, 'session.db');

function readerFor(db: Database.Database) {
  return {
    queryOne: (sql: string, params: any[] = []) => db.prepare(sql).get(...params),
    query: (sql: string, params: any[] = []) => db.prepare(sql).all(...params)
  };
}

function testPureResolver(): void {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE player_state (
      player_id TEXT PRIMARY KEY, war_attr INTEGER, int_attr INTEGER, pol_attr INTEGER,
      dip_attr INTEGER, com_attr INTEGER, cra_attr INTEGER, liquid_cash INTEGER, fame INTEGER
    );
    CREATE TABLE session_duels (
      duel_id TEXT PRIMARY KEY, player_id TEXT, winner_id TEXT, outcome_type TEXT
    );
    CREATE TABLE character_professions (character_id TEXT, category TEXT, tier INTEGER);
    CREATE TABLE family_spouses (husband_id TEXT, wife_id TEXT);
    CREATE TABLE family_children (father_id TEXT);
  `);
  db.prepare(`
    INSERT INTO player_state VALUES ('PLY-0001', 90, 50, 50, 50, 50, 50, 0, 1000)
  `).run();
  const reader = readerFor(db);

  // Three real victories, stored under the real column name.
  const insertDuel = db.prepare(
    "INSERT INTO session_duels VALUES (?, 'PLY-0001', 'PLY-0001', 'VICTORY')"
  );
  insertDuel.run('D1'); insertDuel.run('D2'); insertDuel.run('D3');

  const martial = computeCareerPaths(reader);
  assert.strictEqual(martial.duelWins, 3, 'duel wins must read outcome_type, not outcome');
  assert.strictEqual(martial.activePath, 'MARTIAL');
  assert.strictEqual(martial.modifiers.expMultiplier.war, 1.1);
  assert.strictEqual(martial.activeScore, Math.round(90 * 0.75 + 24));

  // Merchant: commerce + liquid cash.
  db.prepare("UPDATE player_state SET war_attr = 50, com_attr = 95, liquid_cash = 20000;").run();
  const merchant = computeCareerPaths(reader);
  assert.strictEqual(merchant.activePath, 'MERCHANT');
  assert.strictEqual(merchant.modifiers.tradeMargin, 0.05);

  // Scholar: INT/POL average.
  db.prepare("UPDATE player_state SET int_attr = 95, pol_attr = 95, com_attr = 50, liquid_cash = 0;").run();
  const scholar = computeCareerPaths(reader);
  assert.strictEqual(scholar.activePath, 'SCHOLAR');
  assert.strictEqual(scholar.modifiers.expMultiplier.int, 1.1);
  assert.strictEqual(scholar.modifiers.expMultiplier.pol, 1.1);

  // Artisan: craft tier scales the defect reduction.
  db.prepare("UPDATE player_state SET int_attr = 50, pol_attr = 50, cra_attr = 95;").run();
  db.prepare("INSERT INTO character_professions VALUES ('PLY-0001', 'CRAFTING', 4);").run();
  const artisan = computeCareerPaths(reader);
  assert.strictEqual(artisan.activePath, 'ARTISAN');
  assert.strictEqual(artisan.modifiers.defectReduction, 0.08);

  // Lineage: spouse + children + fame.
  db.prepare("UPDATE player_state SET cra_attr = 50, fame = 4000;").run();
  db.prepare("INSERT INTO family_spouses VALUES ('PLY-0001', 'NPC-WIFE');").run();
  db.prepare("INSERT INTO family_children VALUES ('PLY-0001');").run();
  db.prepare("INSERT INTO family_children VALUES ('PLY-0001');").run();
  const lineage = computeCareerPaths(reader);
  assert.strictEqual(lineage.activePath, 'LINEAGE');
  assert.strictEqual(lineage.modifiers.clanPrestigeBonus, 0.1);

  db.close();
  console.log('  ✅ PASSED: five scores, duel count and modifiers resolve from one source.');
}

function testAttributeWiring(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const raw = new Database(TEST_DB);
  raw.pragma('journal_mode = DELETE');
  raw.prepare("DELETE FROM session_duels;").run();
  raw.prepare(`
    UPDATE player_state
    SET war_attr = 95, int_attr = 50, pol_attr = 50, dip_attr = 50,
        com_attr = 50, cra_attr = 50, liquid_cash = 0, fame = 0,
        war_exp = 0
    WHERE player_id = 'PLY-0001';
  `).run();
  raw.prepare("UPDATE character_professions SET tier = 1 WHERE character_id = 'PLY-0001';").run();
  raw.close();

  process.env.SIM_DB_PATH = TEST_DB;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AttributeProgressionService } = require('../src/modules/progression/attribute-progression.service');

  const career = getCareerModifiers(DatabaseService.getInstance() as any);
  assert.strictEqual(career.activePath, 'MARTIAL');

  AttributeProgressionService.awardAttributeExp('PLY-0001', 'war', 100);
  const after = new Database(TEST_DB);
  const row = after.prepare("SELECT war_exp FROM player_state WHERE player_id = 'PLY-0001';").get() as any;
  after.close();
  assert.strictEqual(Number(row.war_exp), 110, 'MARTIAL must turn 100 WAR EXP into 110');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: the active path boosts real attribute EXP.');
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
  console.log('=== Career paths ===');
  testPureResolver();
  testAttributeWiring();
  cleanup();
  console.log('✅ Career paths verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
