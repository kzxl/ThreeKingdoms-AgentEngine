/**
 * One health/death rule: every damage path may reach 0 and the first zero
 * transition either succeeds an heir or marks the campaign DEFEATED. No path
 * clamps health to 1/20/25 any more.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { applyPlayerDamage } from '../src/modules/military/player-vitals';
import { ConditionService } from '../src/modules/military/condition.service';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-defeat-'));
const TEST_DB = path.join(TMP, 'session.db');
const DATE = '185-06-01';

function seed(db: DatabaseService): void {
  db.execute(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, "current_date" = ?, active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `, [DATE]);
  db.execute(`
    UPDATE player_state SET health = 50, fatigue = 10, morale = 80, fame = 500
    WHERE player_id = 'PLY-0001';
  `);
  db.execute("UPDATE family_children SET is_heir = 0 WHERE is_heir = 1;");
}

function run(): void {
  console.log('=== Defeat consistency ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  seed(db);

  // Non-lethal damage keeps the campaign active.
  const light = applyPlayerDamage(db, 'PLY-0001', {
    healthLoss: 10,
    fatigueGain: 20,
    moraleLoss: 15,
    reason: 'TEST_LIGHT'
  });
  assert.strictEqual(light.died, false);
  assert.strictEqual(light.health, 40);
  const afterLight = db.queryOne<any>(
    "SELECT health, fatigue, morale FROM player_state WHERE player_id = 'PLY-0001';"
  );
  assert.strictEqual(Number(afterLight.health), 40);
  assert.strictEqual(Number(afterLight.fatigue), 30);
  assert.strictEqual(Number(afterLight.morale), 65);
  assert.strictEqual(
    db.queryOne<{ status: string }>('SELECT status FROM campaign_meta LIMIT 1;')?.status,
    'ACTIVE'
  );

  // A lethal hit reaches 0, not 1/20/25, and marks the campaign defeated.
  db.execute("UPDATE player_state SET health = 5 WHERE player_id = 'PLY-0001';");
  const lethal = applyPlayerDamage(db, 'PLY-0001', {
    healthLoss: 10,
    reason: 'TEST_LETHAL'
  });
  assert.strictEqual(lethal.died, true);
  assert.strictEqual(lethal.health, 0);
  const meta = db.queryOne<{ status: string; defeat_reason: string }>(
    'SELECT status, defeat_reason FROM campaign_meta LIMIT 1;'
  );
  assert.strictEqual(meta?.status, 'DEFEATED');
  assert.strictEqual(meta?.defeat_reason, 'TEST_LETHAL');
  const dead = db.queryOne<{ health: number }>(
    "SELECT health FROM player_state WHERE player_id = 'PLY-0001';"
  );
  assert.strictEqual(Number(dead?.health), 0);

  // The injury service uses the same path.
  seed(db);
  db.execute("UPDATE player_state SET health = 5 WHERE player_id = 'PLY-0001';");
  ConditionService.forDatabase(db).applyInjury('PLY-0001', 1, 'TEST_INJURY', DATE);
  assert.strictEqual(
    db.queryOne<{ status: string }>('SELECT status FROM campaign_meta LIMIT 1;')?.status,
    'DEFEATED'
  );

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: one damage path, one zero-health transition.');
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
