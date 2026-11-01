/**
 * NPC business succession: heir first, senior foreman second, settlement
 * liquidation last. ApplyNpcDeath uses the same resolver.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { resolveBusinessSuccession } from '../src/shared/business-succession';
import { ConditionService } from '../src/modules/military/condition.service';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-business-succession-'));
const TEST_DB = path.join(TMP, 'session.db');
const DATE = '185-06-01';
const OWNER = 'NPC-0007';
const FOREMAN = 'NPC-0011';

function reset(db: DatabaseService): void {
  db.execute('DELETE FROM businesses WHERE business_id = ?;', ['BIZ-TEST']);
  db.execute('DELETE FROM family_children WHERE father_id = ?;', [OWNER]);
  db.execute("UPDATE npc_state SET assigned_business_id = NULL, is_alive = 1 WHERE npc_id IN (?, ?);", [OWNER, FOREMAN]);
  db.execute("UPDATE npc_state SET assigned_business_id = NULL WHERE assigned_business_id = 'BIZ-TEST';");
  db.execute(
    `INSERT OR REPLACE INTO npc_state
      (npc_id, name, loyalty, morale, fatigue, int_attr, pol_attr, war_attr, ldr_attr,
       dip_attr, com_attr, log_attr, cra_attr, assigned_business_id, assigned_role,
       monthly_wage, is_alive)
     VALUES (?, 'Test Foreman', 50, 50, 0, 50, 50, 50, 50, 50, 70, 50, 80, NULL, 'FOREMAN', 0, 1);`,
    [FOREMAN]
  );
  db.execute(
    `INSERT INTO businesses
      (business_id, name, location_id, manager_npc_id, safe_cash, delegation_level,
       efficiency_multiplier, current_workforce, monthly_capacity_hours, monthly_rent,
       auto_procure, status)
     VALUES ('BIZ-TEST', 'Xưởng Kiểm Thử', 'LOC-0001', ?, 1000, 2, 1.0, 3, 600, 150, 1, 'ACTIVE');`,
    [OWNER]
  );
}

function business(db: DatabaseService): any {
  return db.queryOne<any>("SELECT * FROM businesses WHERE business_id = 'BIZ-TEST';");
}

function run(): void {
  console.log('=== NPC business succession ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute(`UPDATE campaign_meta SET status = 'ACTIVE', "current_date" = ? WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);`, [DATE]);

  // 1. No heir: the senior foreman takes over and safe cash is preserved.
  reset(db);
  db.execute("UPDATE npc_state SET assigned_business_id = 'BIZ-TEST' WHERE npc_id = ?;", [FOREMAN]);
  const foremanResult = resolveBusinessSuccession(db, OWNER, DATE);
  const foremanBusiness = foremanResult.find(row => row.businessId === 'BIZ-TEST');
  assert(foremanBusiness, 'BIZ-TEST must be resolved');
  assert.strictEqual(foremanBusiness!.mode, 'FOREMAN');
  assert.strictEqual(foremanBusiness!.successorId, FOREMAN);
  assert.strictEqual(business(db).manager_npc_id, FOREMAN);
  assert.strictEqual(Number(business(db).safe_cash), 1000);

  // 2. Adult heir wins over the foreman.
  reset(db);
  db.execute(`
    INSERT INTO family_children
      (child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, gender,
       birth_date, birth_turn, age, is_heir, status)
    VALUES ('CHILD-TEST', ?, 'PLY-0001', 'Test Mother', 'Test Heir', 'Test Heir', 'MALE',
      '167-01-01', 1, 18, 1, 'ADULT_OFFICER');
  `, [OWNER]);
  const heirResult = resolveBusinessSuccession(db, OWNER, DATE);
  const heirBusiness = heirResult.find(row => row.businessId === 'BIZ-TEST');
  assert(heirBusiness, 'BIZ-TEST must be resolved');
  assert.strictEqual(heirBusiness!.mode, 'HEIR');
  assert.strictEqual(heirBusiness!.successorId, 'CHILD-TEST');
  assert.strictEqual(business(db).manager_npc_id, 'CHILD-TEST');

  // 3. No heir or foreman: liquidate into the settlement treasury.
  reset(db);
  const settlement = db.queryOne<{ settlement_id: string; treasury_cash: number }>(
    "SELECT settlement_id, treasury_cash FROM session_settlements WHERE settlement_id = 'zhuo_xian';"
  );
  assert(settlement, 'zhuo_xian must exist');
  const treasuryBefore = Number(settlement!.treasury_cash);
  const liquidated = resolveBusinessSuccession(db, OWNER, DATE);
  const liquidatedBusiness = liquidated.find(row => row.businessId === 'BIZ-TEST');
  assert(liquidatedBusiness, 'BIZ-TEST must be resolved');
  assert.strictEqual(liquidatedBusiness!.mode, 'LIQUIDATED');
  assert.strictEqual(business(db).status, 'LIQUIDATED');
  assert.strictEqual(Number(business(db).safe_cash), 0);
  assert.strictEqual(
    Number(db.queryOne<{ treasury_cash: number }>(
      "SELECT treasury_cash FROM session_settlements WHERE settlement_id = 'zhuo_xian';"
    )?.treasury_cash),
    treasuryBefore + 1000
  );
  assert(db.queryOne(
    "SELECT 1 AS ok FROM settlement_ledger WHERE category = 'BUSINESS_LIQUIDATION' LIMIT 1;"
  ));

  // 4. applyNpcDeath runs the same resolver before clearing the NPC row.
  reset(db);
  db.execute("UPDATE npc_state SET assigned_business_id = 'BIZ-TEST' WHERE npc_id = ?;", [FOREMAN]);
  const died = ConditionService.forDatabase(db).applyNpcDeath(OWNER, 'TEST');
  assert.strictEqual(died, true);
  assert.strictEqual(business(db).manager_npc_id, FOREMAN);
  assert.strictEqual(
    Number(db.queryOne<{ is_alive: number }>('SELECT is_alive FROM npc_state WHERE npc_id = ?;', [OWNER])?.is_alive),
    0
  );

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: heir, foreman, liquidation and applyNpcDeath wiring.');
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
