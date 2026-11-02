/**
 * Conditions surface: an injury created by combat is listed by /api/conditions,
 * rendered by the shared condition-chip helper in both dossiers and the journal,
 * and disappears after the month-close recovery.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-condition-ui-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== Conditions UI ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  // The environment must point at the temp copy before any module opens the
  // default DB; a static import would bind the source save instead.
  process.env.SIM_DB_PATH = TEST_DB;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ConditionService } = require('../src/modules/military/condition.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute("UPDATE player_state SET health = 100 WHERE player_id = 'PLY-0001';");
  db.execute("DELETE FROM conditions WHERE character_id = 'PLY-0001';");

  const service = ConditionService.forDatabase(db);
  const injury = service.applyInjury('PLY-0001', 2, 'DUEL', '185-06-01');
  assert.strictEqual(injury.severity, 2);
  assert.strictEqual(injury.daysRemaining, 20);
  assert(injury.statPenalty > 0);

  const active = service.list('PLY-0001');
  assert.strictEqual(active.length, 1, 'active injury must be listed');
  assert.strictEqual(active[0].conditionId, injury.conditionId);
  assert(service.getCombatPenalty('PLY-0001') > 0);

  service.recoverMonthly('185-06-30');
  assert.strictEqual(service.list('PLY-0001').length, 0, 'month close must clear the healed injury');
  assert.strictEqual(service.getCombatPenalty('PLY-0001'), 0);

  const config = fs.readFileSync(path.join(ROOT, 'public/js/config.js'), 'utf8');
  const protagonist = fs.readFileSync(path.join(ROOT, 'public/js/protagonist-dossier-modal.js'), 'utf8');
  const npc = fs.readFileSync(path.join(ROOT, 'public/js/npc-dossier-modal.js'), 'utf8');
  const journal = fs.readFileSync(path.join(ROOT, 'public/js/personal-journal-ui.js'), 'utf8');
  assert(config.includes('renderConditionChips'), 'one shared condition renderer must exist');
  assert(config.includes('condition-chip'), 'condition strip must have a stable class');
  for (const source of [protagonist, npc, journal]) {
    assert(source.includes('/api/conditions'), 'each surface must read the conditions endpoint');
    assert(source.includes('renderConditionChips'), 'each surface must use the shared renderer');
  }

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: injury listing, shared dossier/journal strip and recovery.');
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
  run();
  cleanup();
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
