/**
 * NPC hire refusal: a stranger with no standing is refused with a retry date;
 * building affinity lets the same offer succeed.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { SpecialistWorkforceService } from '../src/modules/professions/features/workforce/specialist-workforce.service';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-npc-refusal-'));
const TEST_DB = path.join(TMP, 'session.db');
const NPC = 'NPC-0011';
const DATE = '185-06-01';

function run(): void {
  console.log('=== NPC hire refusal ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute(`
    UPDATE campaign_meta SET status = 'ACTIVE', "current_date" = ?
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `, [DATE]);
  db.execute(`
    UPDATE player_state SET fame = 0, virtue = 0, liquid_cash = 100000, safe_cash = 0
    WHERE player_id = 'PLY-0001';
  `);
  db.execute('DELETE FROM npc_relationship_deltas WHERE npc_id = ?;', [NPC]);
  db.execute('DELETE FROM npc_state WHERE npc_id = ?;', [NPC]);

  const service = new SpecialistWorkforceService(db);
  let refused: any = null;
  try {
    service.hireSpecialist({ characterId: 'PLY-0001', npcId: NPC, businessId: 'BIZ-0001' });
  } catch (error) {
    refused = error;
  }
  assert(refused, 'a zero-standing stranger must be refused');
  assert.strictEqual(refused.code, 'NPC_REFUSED');
  assert.strictEqual(refused.statusCode, 400);
  assert(refused.retryAfterDate, 'refusal must return a retry date');
  assert(/từ chối/i.test(refused.message));

  // Build affinity; the same offer now succeeds.
  db.execute(
    `INSERT INTO npc_relationship_deltas
      (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
     VALUES (?, ?, 40, 40, 'TEST', 'Test affinity');`,
    [NPC, DATE]
  );
  const hired = service.hireSpecialist({
    characterId: 'PLY-0001',
    npcId: NPC,
    businessId: 'BIZ-0001'
  });
  assert.strictEqual(hired.success, true);
  const state = db.queryOne<{ assigned_business_id: string }>(
    'SELECT assigned_business_id FROM npc_state WHERE npc_id = ?;',
    [NPC]
  );
  assert.strictEqual(state?.assigned_business_id, 'BIZ-0001');

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: refusal, retry date and affinity-gated success.');
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
