/**
 * Workshop economics: staffed output, real wages/rent, and debt instead of a
 * silent zero-clamp. The pure settlement function is unit-tested, then the
 * real month close is exercised on a minimal database.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const { settleBusinessMonth, businessHealth } = require('../engine/business-economics');
const { GameplayManager } = require('../engine/gameplay-manager');
const migration042 = require('../tools/migrations/042-business-economics');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.workshop-economy');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function testPureSettlement(): void {
  // Loss: the flagship workshop with 8 staff cannot cover wages + rent.
  const staff = [
    { monthly_wage: 1000 }, { monthly_wage: 450 }, { monthly_wage: 450 },
    { monthly_wage: 500 }, { monthly_wage: 380 }, { monthly_wage: 380 },
    { monthly_wage: 380 }, { monthly_wage: 380 }
  ];
  const loss = settleBusinessMonth({
    tier: 1, efficiency_multiplier: 1.8, current_workforce: 7,
    monthly_rent: 150, safe_cash: 0, debt: 0
  }, staff);
  // gross = (1*260*1.8 + 8*25) * 1 = 668; wages = 3920; rent = 150.
  assert.strictEqual(loss.grossIncome, 668);
  assert.strictEqual(loss.totalWages, 3920);
  assert.strictEqual(loss.netProfit, 668 - 3920 - 150);
  assert.strictEqual(loss.safeCash, 0, 'a loss cannot leave cash behind');
  assert.strictEqual(loss.debt, 3402, 'the shortfall becomes debt, not zero');
  assert.strictEqual(businessHealth(loss), 'DISTRESSED');

  // No staff: the workshop is closed, so it cannot print revenue.
  const empty = settleBusinessMonth({
    tier: 1, efficiency_multiplier: 2, current_workforce: 4,
    monthly_rent: 200, safe_cash: 100, debt: 0
  }, []);
  assert.strictEqual(empty.grossIncome, 0);
  assert.strictEqual(empty.netProfit, -200);
  assert.strictEqual(empty.safeCash, 0);
  assert.strictEqual(empty.debt, 100, 'existing cash absorbs the loss first');
  assert.strictEqual(businessHealth(empty), 'CLOSED');

  // Understaffed: output scales with assigned staff against the roster.
  const understaffed = settleBusinessMonth({
    tier: 1, efficiency_multiplier: 1, current_workforce: 4,
    monthly_rent: 100, safe_cash: 0, debt: 0
  }, [{ monthly_wage: 100 }, { monthly_wage: 100 }]);
  assert.strictEqual(understaffed.staffingRatio, 0.5);
  assert.strictEqual(understaffed.grossIncome, 155); // (260 + 50) * 0.5

  // Profit pays debt first; only the remainder reaches the safe.
  const recovery = settleBusinessMonth({
    tier: 3, efficiency_multiplier: 2, current_workforce: 2,
    monthly_rent: 100, safe_cash: 0, debt: 300
  }, [{ monthly_wage: 100 }, { monthly_wage: 100 }]);
  assert.strictEqual(recovery.netProfit, 1310);
  assert.strictEqual(recovery.debt, 0);
  assert.strictEqual(recovery.safeCash, 1010);
  assert.strictEqual(businessHealth(recovery), 'PROFITABLE');

  console.log('  ✅ PASSED: settlement scales output, charges rent/wages and carries debt.');
}

function seedDatabase(): void {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  migration042.up(db);

  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-WORKSHOP', 'Workshop Economy', '184-02-01', '184-02-01', 1)
  `).run();
  db.prepare(`
    INSERT INTO player_state
      (player_id, name, age, liquid_cash, safe_cash, strategic_grain, fame, morale, health)
    VALUES ('PLY-0001', 'Workshop Tester', 21, 5000, 0, 50, 500, 100, 100)
  `).run();

  const insertBusiness = db.prepare(`
    INSERT INTO businesses
      (business_id, name, location_id, manager_npc_id, safe_cash, delegation_level,
       efficiency_multiplier, current_workforce, monthly_capacity_hours, monthly_rent,
       auto_procure, status, tier, debt)
    VALUES (?, ?, 'LOC-0001', NULL, ?, 2, ?, ?, 800, ?, 1, 'ACTIVE', ?, ?)
  `);
  const insertNpc = db.prepare(`
    INSERT INTO npc_state
      (npc_id, name, assigned_business_id, assigned_role, monthly_wage)
    VALUES (?, ?, ?, 'WORKER', ?)
  `);

  // 1. Structurally loss-making workshop.
  insertBusiness.run('BIZ-LOSS', 'Lỗ', 0, 1.8, 7, 150, 1, 0);
  insertNpc.run('NPC-L1', 'Thợ 1', 'BIZ-LOSS', 1000);
  insertNpc.run('NPC-L2', 'Thợ 2', 'BIZ-LOSS', 450);
  insertNpc.run('NPC-L3', 'Thợ 3', 'BIZ-LOSS', 450);
  insertNpc.run('NPC-L4', 'Thợ 4', 'BIZ-LOSS', 500);
  insertNpc.run('NPC-L5', 'Thợ 5', 'BIZ-LOSS', 380);
  insertNpc.run('NPC-L6', 'Thợ 6', 'BIZ-LOSS', 380);
  insertNpc.run('NPC-L7', 'Thợ 7', 'BIZ-LOSS', 380);
  insertNpc.run('NPC-L8', 'Thợ 8', 'BIZ-LOSS', 380);

  // 2. No staff at all: rent only.
  insertBusiness.run('BIZ-EMPTY', 'Đóng cửa', 0, 2, 4, 200, 1, 0);

  // 3. Profitable workshop that must repay its debt first.
  insertBusiness.run('BIZ-GOOD', 'Có lãi', 0, 2, 2, 100, 3, 300);
  insertNpc.run('NPC-G1', 'Thợ giỏi 1', 'BIZ-GOOD', 100);
  insertNpc.run('NPC-G2', 'Thợ giỏi 2', 'BIZ-GOOD', 100);

  db.close();
}

function testMonthClose(): void {
  seedDatabase();
  const gm = new GameplayManager(TEST_DB);
  const report = gm.advanceTurn({ notes: 'workshop economy' });

  const db = new Database(TEST_DB);
  const rows = db.prepare(`
    SELECT business_id, safe_cash, debt FROM businesses ORDER BY business_id;
  `).all() as Array<{ business_id: string; safe_cash: number; debt: number }>;
  db.close();

  const loss = rows.find(row => row.business_id === 'BIZ-LOSS')!;
  assert.strictEqual(loss.safe_cash, 0, 'loss-making workshop cannot keep cash');
  assert.strictEqual(loss.debt, 3402, 'loss-making workshop carries its shortfall');

  const empty = rows.find(row => row.business_id === 'BIZ-EMPTY')!;
  assert.strictEqual(empty.safe_cash, 0);
  assert.strictEqual(empty.debt, 200, 'an unstaffed workshop still owes rent');

  const good = rows.find(row => row.business_id === 'BIZ-GOOD')!;
  assert.strictEqual(good.debt, 0, 'profit repays debt first');
  assert.strictEqual(good.safe_cash, 1010);

  const lossReport = (report.bizReports || []).find((item: any) => item.businessId === 'BIZ-LOSS');
  assert(lossReport, 'monthly report must include the settlement');
  assert.strictEqual(lossReport.health, 'DISTRESSED');
  assert.strictEqual(lossReport.rent, 150, 'rent is part of the report');

  console.log('  ✅ PASSED: month close writes real P&L and debt to businesses.');
}

function run(): void {
  console.log('=== Workshop economics ===');
  testPureSettlement();
  testMonthClose();
  console.log('✅ Workshop economy verified.');
}

run();
