/**
 * Combat consequences: injuries reduce real combat power, an NPC officer can
 * die permanently, and a month of rest heals.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration046 = require('../tools/migrations/046-conditions');
const { recoverMonth, close: closeBridge } = require('../engine/condition-bridge');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-conditions-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  migration046.up(db);
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state SET health = 100, current_location = 'Lôi Đài Giáo Trường'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM conditions WHERE 1 = 1;").run();
  db.close();
}

function run(): void {
  console.log('=== Combat consequences ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ConditionService } = require('../src/modules/military/condition.service');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SingleCombatDuelService } = require('../src/modules/military/single-combat-duel.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const conditions = ConditionService.forDatabase(db);
  const duels = SingleCombatDuelService.getInstance(db);

  // 1. An injury is recorded, costs health and reduces the duel profile.
  const beforeDuel = duels.initiateDuel({
    playerId: 'PLY-0001', opponentId: 'NPC-0002',
    context: 'FRIENDLY_SPARRING', commitDb: false
  });
  const baseWar = beforeDuel.player.effectiveWar;
  const injury = conditions.applyInjury('PLY-0001', 3, 'TEST', '185-06-01');
  assert.strictEqual(injury.statPenalty, 9);
  assert.strictEqual(conditions.getCombatPenalty('PLY-0001'), 9);
  const health = Number(db.queryOne("SELECT health FROM player_state WHERE player_id = 'PLY-0001';").health);
  assert.strictEqual(health, 76, 'severity 3 must cost 24 health');

  const afterDuel = duels.initiateDuel({
    playerId: 'PLY-0001', opponentId: 'NPC-0002',
    context: 'FRIENDLY_SPARRING', commitDb: false
  });
  assert.strictEqual(afterDuel.player.effectiveWar, baseWar - 9, 'injury must reduce effective WAR');

  // 2. An NPC officer can die permanently and leaves the faction roster.
  const victim = db.queryOne(
    "SELECT npc_id FROM npc_state WHERE is_alive = 1 ORDER BY npc_id LIMIT 1;"
  ).npc_id as string;
  const officersBefore = Number(db.queryOne(
    'SELECT COUNT(*) AS c FROM faction_officers WHERE officer_id = ?;', [victim]
  ).c);
  const killed = conditions.applyNpcDeath(victim, 'TEST');
  assert.strictEqual(killed, true);
  const npc = db.queryOne("SELECT is_alive, assigned_role FROM npc_state WHERE npc_id = ?;", [victim]);
  assert.strictEqual(Number(npc.is_alive), 0, 'dead NPC must be inactive');
  assert.strictEqual(npc.assigned_role, 'DECEASED');
  const officersAfter = Number(db.queryOne(
    'SELECT COUNT(*) AS c FROM faction_officers WHERE officer_id = ?;', [victim]
  ).c);
  assert.strictEqual(officersAfter, Math.max(0, officersBefore - 1), 'dead officer leaves the roster');

  // 3. Month rest heals the player's injury.
  assert.strictEqual(conditions.recoverMonthly(), 1, 'one active injury must heal');
  assert.strictEqual(conditions.getCombatPenalty('PLY-0001'), 0);
  assert.strictEqual(conditions.list('PLY-0001').length, 0);

  // 4. The month-close bridge performs the same recovery.
  conditions.applyInjury('PLY-0001', 1, 'TEST', '185-07-01');
  assert.strictEqual(recoverMonth(TEST_DB), 1, 'month-close bridge must recover active injuries');

  console.log('  ✅ PASSED: injury penalty, NPC death and monthly recovery.');
}

function cleanup(): void {
  try { closeBridge(); } catch { /* bridge not loaded */ }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
  console.log('✅ Combat consequences verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
