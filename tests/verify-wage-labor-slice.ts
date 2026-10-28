/**
 * Verification Suite: Wage Labor Vertical Slice MVC
 * Tests canonical stamina calculation, shift execution, ledger recording, and fatigue guard.
 */

import path from 'path';
import { DatabaseService } from '../src/core/database';
import { WageLaborService, calculatePlayerStamina } from '../src/modules/professions/features/wage-labor/wage-labor.service';
import { CANONICAL_LABOR_SHIFTS } from '../src/modules/professions/features/wage-labor/wage-labor.constants';
const { renderProgressMarkdown } = require('../engine/projector');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests(): Promise<void> {
  console.log('======================================================================');
  console.log('   WAGE LABOR VERTICAL SLICE MVC: VERIFICATION SUITE                  ');
  console.log('======================================================================\n');

  const db = DatabaseService.getInstance();
  const service = WageLaborService.getInstance();

  const initialCashflow = db.query<any>('SELECT * FROM cashflow_ledger ORDER BY rowid ASC;');
  const initialPlayer = db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', ['PLY-0001']);

  const testWorkerId = 'CHAR-VERIFY-SLICE-WORKER';

  let passed = 0;
  const total = 10;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Canonical Stamina Formula Calculation
    // -------------------------------------------------------------------------
    console.log('>>> [TEST 1] Canonical Stamina Calculation Verification...');
    // Base case: WAR 50, Health 100, Fatigue 0 -> maxStamina = 100 + 0 + 10 = 110, current = 110
    const s1 = calculatePlayerStamina({ war_attr: 50, health: 100, fatigue: 0 });
    assert(s1.maxStamina === 110, `Expected maxStamina 110, got ${s1.maxStamina}`);
    assert(s1.currentStamina === 110, `Expected currentStamina 110, got ${s1.currentStamina}`);
    assert(s1.staminaPct === 100, `Expected staminaPct 100%, got ${s1.staminaPct}`);
    passed++;
    console.log('  PASS 1: Base stamina calculation (WAR 50, Health 100) verified.');

    // Martial case: WAR 68, Health 100, Fatigue 54
    // maxStamina = 100 + round(18 * 1.5) + 10 = 100 + 27 + 10 = 137
    // currentStamina = 137 - 54 = 83
    const s2 = calculatePlayerStamina({ war_attr: 68, health: 100, fatigue: 54 });
    assert(s2.maxStamina === 137, `Expected maxStamina 137, got ${s2.maxStamina}`);
    assert(s2.currentStamina === 83, `Expected currentStamina 83, got ${s2.currentStamina}`);
    assert(s2.fatigue === 54, `Expected fatigue 54, got ${s2.fatigue}`);
    passed++;
    console.log('  PASS 2: Martial hero stamina calculation (WAR 68, Fatigue 54) verified.');

    // Clamped zero case: Fatigue 100
    const s3 = calculatePlayerStamina({ war_attr: 50, health: 80, fatigue: 100 });
    assert(s3.maxStamina === 108, `Expected maxStamina 108, got ${s3.maxStamina}`);
    assert(s3.currentStamina === 8, `Expected currentStamina 8, got ${s3.currentStamina}`);
    passed++;
    console.log('  PASS 3: Low stamina boundary calculation verified.');

    // -------------------------------------------------------------------------
    // TEST 2: Wage Labor Shifts Catalog & Overview
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 2] Wage Labor Catalog & Overview Verification...');
    assert(CANONICAL_LABOR_SHIFTS.length === 6, `Expected 6 canonical shifts, got ${CANONICAL_LABOR_SHIFTS.length}`);
    const overview = service.getLaborOverview('PLY-0001');
    assert(overview.shifts.length === 6, `Expected overview to have 6 shifts, got ${overview.shifts.length}`);
    assert(overview.stamina.maxStamina > 100, 'Protagonist max stamina should be > 100');
    assert(overview.shifts.every(s => typeof s.canWork === 'boolean'), 'All shifts must compute canWork boolean');
    passed++;
    console.log('  PASS 4: Labor overview and shift catalog integrity verified.');

    // -------------------------------------------------------------------------
    // TEST 3: Shift Execution on Test Worker
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 3] Shift Execution on Test Worker...');
    db.execute('DELETE FROM player_state WHERE player_id = ?;', [testWorkerId]);
    db.execute('DELETE FROM character_professions WHERE character_id = ?;', [testWorkerId]);

    db.execute(`
      INSERT INTO player_state (player_id, name, age, liquid_cash, fatigue, cra_attr, cra_exp, war_attr, health)
      VALUES (?, 'Thợ Đan Gai Mới', 20, 0, 10, 50, 0, 50, 100);
    `, [testWorkerId]);

    // Work shift as Bamboo Weaver (SHIFT_WEAVER: wage 95, staminaCost 12, fatigueCost 12, CRA exp 25, cra attr exp 15)
    const execResult = service.executeShift(testWorkerId, 'SHIFT_WEAVER');
    assert(execResult.success, 'Weaver shift execution must succeed');
    assert(execResult.wageEarned === 95, `Expected wage 95, got ${execResult.wageEarned}`);
    assert(execResult.newLiquidCash === 95, `Expected liquid cash 95, got ${execResult.newLiquidCash}`);
    assert(execResult.newFatigue === 22, `Expected fatigue 22 (10+12), got ${execResult.newFatigue}`);
    assert(execResult.professionCode === 'PROF_CRAFTSMAN', `Expected PROF_CRAFTSMAN, got ${execResult.professionCode}`);
    assert(execResult.professionExpGained === 25, `Expected 25 prof EXP, got ${execResult.professionExpGained}`);
    passed++;
    console.log('  PASS 5: Bamboo Weaver shift executed cleanly with correct wage and fatigue.');

    // Verify DB persistence
    const workerInDb = db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', [testWorkerId]);
    assert(workerInDb.liquid_cash === 95, 'DB liquid_cash must be 95');
    assert(workerInDb.fatigue === 22, 'DB fatigue must be 22');
    assert(workerInDb.cra_exp === 10, 'DB cra_exp must be 10');
    passed++;
    console.log('  PASS 6: Worker state persisted accurately to SQLite.');

    // Verify Profession record
    const profInDb = db.queryOne<any>(
      'SELECT * FROM character_professions WHERE character_id = ? AND profession_code = ?;',
      [testWorkerId, 'PROF_CRAFTSMAN']
    );
    assert(!!profInDb, 'PROF_CRAFTSMAN record must exist');
    assert(profInDb.current_exp === 25, 'Profession current_exp must be 25');
    passed++;
    console.log('  PASS 7: Profession record created and awarded EXP.');

    // Verify Ledger entry
    const ledgerTxn = db.queryOne<any>(
      'SELECT * FROM cashflow_ledger WHERE counterparty = ? ORDER BY rowid DESC LIMIT 1;',
      ['Xưởng Thủ Công Lương Gia']
    );
    assert(!!ledgerTxn, 'Cashflow ledger transaction must exist');
    assert(ledgerTxn.inflow === 95, 'Ledger inflow must be 95');
    assert(ledgerTxn.balance === 95, 'Ledger balance must match total cash');
    passed++;
    console.log('  PASS 8: Double-entry cashflow ledger entry verified.');

    // -------------------------------------------------------------------------
    // TEST 4: Exhaustion Guard Rejection
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 4] Exhaustion Guard Verification...');
    // Set worker fatigue to 95 -> cannot work shift with fatigueCost 12 (95 + 12 > 100)
    db.execute('UPDATE player_state SET fatigue = 95 WHERE player_id = ?;', [testWorkerId]);

    let exhaustionCaught = false;
    try {
      service.executeShift(testWorkerId, 'SHIFT_WEAVER');
    } catch (err: any) {
      exhaustionCaught = true;
      assert(
        err.message.includes('Độ mệt mỏi') || err.message.includes('Khí lực kiệt quệ'),
        `Expected exhaustion message, got: ${err.message}`
      );
    }
    assert(exhaustionCaught, 'Overwork beyond 100 fatigue must throw error');
    passed++;
    console.log('  PASS 9: Overwork guard blocked exhausted shift cleanly.');

    // -------------------------------------------------------------------------
    // TEST 5: Backward Compatibility Aliases
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 5] Backward Compatibility Aliases Verification...');
    // Shift lookup by legacy jobType 'JOB_TAVERN_COOK'
    const cookShift = CANONICAL_LABOR_SHIFTS.find(s => s.jobType === 'JOB_TAVERN_COOK');
    assert(!!cookShift, 'JOB_TAVERN_COOK alias must map to canonical shift');
    assert(cookShift!.shiftId === 'SHIFT_CHEF_TAVERN', 'JOB_TAVERN_COOK should map to SHIFT_CHEF_TAVERN');
    passed++;
    console.log('  PASS 10: Legacy jobType aliases mapped correctly to canonical shifts.');

  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN & ZERO-DRIFT RESTORATION
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEARDOWN] Reverting test artifacts to maintain SQLite audit invariants...');
    try {
      db.getDb().pragma('foreign_keys = OFF');
      db.transaction(() => {
        db.execute('DELETE FROM player_state WHERE player_id = ?;', [testWorkerId]);
        db.execute('DELETE FROM character_professions WHERE character_id = ?;', [testWorkerId]);
        db.execute('DELETE FROM chat_chronicle WHERE text LIKE ?;', ['%Thợ Đan Gai Mới%']);

        // Restore cashflow_ledger
        db.execute('DELETE FROM cashflow_ledger;');
        for (const r of initialCashflow) {
          db.execute(
            'INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [r.txn_id, r.game_date, r.counterparty, r.category, r.inflow, r.outflow, r.balance, r.memo, r.status]
          );
        }

        if (initialPlayer) {
          db.execute(
            'UPDATE player_state SET liquid_cash = ?, safe_cash = ?, fatigue = ?, morale = ? WHERE player_id = ?;',
            [initialPlayer.liquid_cash, initialPlayer.safe_cash, initialPlayer.fatigue, initialPlayer.morale, 'PLY-0001']
          );
        }
      });
      db.getDb().pragma('foreign_keys = ON');
      renderProgressMarkdown(db.getDbPath(), path.join(process.cwd(), 'game', 'PROGRESS.md'));
    } catch (e: any) {
      console.warn('  [WARN] Teardown error:', e.message);
    }
  }

  console.log('======================================================================');
  console.log(`   VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED SUCCESSFULLY!`);
  console.log('======================================================================');
}

runTests().catch(err => {
  console.error('\n❌ VERIFICATION SUITE FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
