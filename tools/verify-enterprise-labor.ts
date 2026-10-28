/**
 * Standalone Verification Suite: Sandbox Free Enterprise & Labor System
 * Validates:
 * 1. Master Recipes presence and Bill of Materials (BOM) specification for Cooking and Medicine.
 * 2. Owner Mode: Opening a Tavern and Apothecary, managing workforce/rent/revenue, accruing and collecting profits.
 * 3. Wage Worker Mode: Working shifts as Tavern Cook, Tavern Staff, and Apothecary Medicine Compounder
 *    with fatigue deduction, wage payouts, zero capital requirement, profession EXP and attribute EXP rewards.
 * 4. Boundary safety: Insufficient capital prevention and fatigue exhaustion guard.
 */

import { DatabaseService } from '../src/core/database';
import {
  EnterpriseLaborService,
  WAGE_JOB_CATALOG,
  ENTERPRISE_CONFIGS
} from '../src/modules/professions/enterprise-labor.service';
import { seedMasterRecipes } from '../src/modules/professions/recipes-seed';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runVerification(): Promise<void> {
  console.log('======================================================================');
  console.log('   THREE KINGDOMS: ENTERPRISE & LABOR SYSTEM VERIFICATION SUITE       ');
  console.log('======================================================================\n');

  const db = DatabaseService.getInstance();
  const service = new EnterpriseLaborService(db);

  let passedTests = 0;
  const totalTests = 12;

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Master Recipes Presence and BOM Validation
  // -------------------------------------------------------------------------
  console.log('>>> [TEST GROUP 1] Master Recipes & Bill of Materials (BOM) Validation');

  const seedResult = seedMasterRecipes(db);
  console.log(`  ✓ Seeded / Verified recipes in catalog (newly seeded count: ${seedResult.seededCount})`);

  // Verify all 5 required recipes exist
  const expectedRecipes = [
    { code: 'REC-COOK-BAO', category: 'COOKING', nameVi: 'Bánh Bao Thịt Trác Huyện' },
    { code: 'REC-COOK-VENISON', category: 'COOKING', nameVi: 'Thịt Rừng Nướng Ngũ Vị' },
    { code: 'REC-COOK-DUKANG', category: 'COOKING', nameVi: 'Đỗ Khang Mỹ Tửu' },
    { code: 'REC-MED-HEAL-SALVE', category: 'MEDICINE', nameVi: 'Kim Sang Dược Cầm Máu' },
    { code: 'REC-MED-VIGOR-DECOCTION', category: 'MEDICINE', nameVi: 'Thang Dược Hồi Nguyên Bồi Bổ' }
  ];

  for (const expected of expectedRecipes) {
    const row = db.queryOne<any>('SELECT * FROM master_recipes WHERE recipe_code = ?;', [expected.code]);
    assert(!!row, `Recipe ${expected.code} must exist in master_recipes table.`);
    assert(row.category === expected.category, `Recipe ${expected.code} must belong to category ${expected.category}.`);
    assert(row.product_name_vi === expected.nameVi, `Recipe ${expected.code} product name mismatch.`);

    // Validate BOM inputs parse correctly as JSON array
    const bomInputs = JSON.parse(row.bom_inputs);
    assert(Array.isArray(bomInputs) && bomInputs.length > 0, `BOM inputs for ${expected.code} must be a valid array.`);

    // Verify all input items exist in master_items
    for (const input of bomInputs) {
      const itemCode = input.item_code || input.item;
      assert(!!itemCode, `BOM input item in ${expected.code} must have item_code.`);
      const itemRow = db.queryOne<any>('SELECT * FROM master_items WHERE item_code = ?;', [itemCode]);
      assert(!!itemRow, `Item ${itemCode} required by recipe ${expected.code} must exist in master_items.`);
    }

    // Verify product exists in master_items
    const productRow = db.queryOne<any>('SELECT * FROM master_items WHERE item_code = ?;', [row.product_item_code]);
    assert(!!productRow, `Product ${row.product_item_code} produced by ${expected.code} must exist in master_items.`);
  }

  // Validate specific BOM formulas
  const baoBOM = JSON.parse(
    db.queryOne<any>('SELECT bom_inputs FROM master_recipes WHERE recipe_code = ?;', ['REC-COOK-BAO']).bom_inputs
  );
  assert(
    baoBOM.some((b: any) => (b.item_code === 'COM-GRAIN' || b.item === 'COM-GRAIN') && (b.quantity === 1 || b.qty === 1)),
    'REC-COOK-BAO must require 1 Grain'
  );
  assert(
    baoBOM.some((b: any) => (b.item_code === 'COM-MEAT' || b.item === 'COM-MEAT') && (b.quantity === 1 || b.qty === 1)),
    'REC-COOK-BAO must require 1 Meat'
  );
  assert(
    baoBOM.some((b: any) => (b.item_code === 'COM-SALT' || b.item === 'COM-SALT') && (b.quantity === 0.2 || b.qty === 0.2)),
    'REC-COOK-BAO must require 0.2 Salt'
  );

  const decoctionBOM = JSON.parse(
    db.queryOne<any>('SELECT bom_inputs FROM master_recipes WHERE recipe_code = ?;', ['REC-MED-VIGOR-DECOCTION']).bom_inputs
  );
  assert(
    decoctionBOM.some((b: any) => (b.item_code === 'RAW-HERB-WILD' || b.item === 'RAW-HERB-WILD') && (b.quantity === 2 || b.qty === 2)),
    'REC-MED-VIGOR-DECOCTION must require 2 Wild Herbs'
  );
  assert(
    decoctionBOM.some((b: any) => (b.item_code === 'RAW-CINNABAR' || b.item === 'RAW-CINNABAR') && (b.quantity === 1 || b.qty === 1)),
    'REC-MED-VIGOR-DECOCTION must require 1 Cinnabar'
  );

  passedTests++;
  console.log('  PASS 1: All 5 recipes for Cooking and Medicine present with verified BOM ratios.\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Owner Mode (Làm Chủ Sản Nghiệp)
  // -------------------------------------------------------------------------
  console.log('>>> [TEST GROUP 2] Owner Mode: Enterprise Opening & Profit Management');

  const testOwnerId = 'CHAR-VERIFY-OWNER-01';
  db.execute('DELETE FROM player_state WHERE player_id = ?;', [testOwnerId]);
  db.execute('DELETE FROM businesses WHERE owner_character_id = ?;', [testOwnerId]);
  db.execute(
    'DELETE FROM cashflow_ledger WHERE counterparty LIKE ? OR counterparty LIKE ? OR memo LIKE ? OR txn_id LIKE ?;',
    ['%Đào Viên Khách Điếm%', '%Tế Dân Dược Quán%', '%Tiền công làm thuê%', 'TXN-WAGE-%']
  );

  db.execute(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, fatigue, cra_attr, com_attr)
    VALUES (?, 'Chủ Hộ Lương Gia', 30, 10000, 10, 60, 60);
  `, [testOwnerId]);

  // Test 2.1: Open a Tavern
  const tavernResult = service.openEnterprise(
    testOwnerId,
    'TAVERN',
    'Đào Viên Khách Điếm & Tửu Quán',
    'LOC-0001',
    2500
  );

  assert(tavernResult.success, 'Opening Tavern must succeed.');
  assert(tavernResult.type === 'TAVERN', 'Enterprise type must be TAVERN.');
  assert(tavernResult.initialCapital === 2500, 'Initial capital must be 2500.');
  assert(tavernResult.safeCash === 2500, 'Business safe cash must be initialized with capital.');
  assert(tavernResult.remainingPlayerCash === 7500, 'Owner liquid cash must be deducted by capital (10000 - 2500 = 7500).');

  passedTests++;
  console.log('  PASS 2: Opened Tavern successfully with capital deduction and safe cash deposit.');

  // Test 2.2: Retrieve Tavern Details
  const tavernDetails = service.getEnterpriseDetails(tavernResult.businessId);
  assert(tavernDetails.status === 'ACTIVE', 'Tavern status must be ACTIVE.');
  assert(tavernDetails.staff === 3, 'Tavern staff must match default workforce (3).');
  assert(tavernDetails.rent === 250, 'Tavern monthly rent must be 250.');
  assert(tavernDetails.dailyRevenue === 200, 'Tavern daily revenue must be 200.');
  assert(tavernDetails.safeCash === 2500, 'Tavern safe cash must be 2500.');

  passedTests++;
  console.log('  PASS 3: getEnterpriseDetails correctly returns status, safe cash, daily revenue, staff, and rent.');

  // Test 2.3: Open an Apothecary
  const apothecaryResult = service.openEnterprise(
    testOwnerId,
    'APOTHECARY',
    'Tế Dân Dược Quán & Y Điếm',
    'LOC-0001',
    2000
  );

  assert(apothecaryResult.success, 'Opening Apothecary must succeed.');
  assert(apothecaryResult.type === 'APOTHECARY', 'Enterprise type must be APOTHECARY.');
  assert(apothecaryResult.currentWorkforce === 2, 'Apothecary workforce must be 2.');
  assert(apothecaryResult.remainingPlayerCash === 5500, 'Owner cash must be 7500 - 2000 = 5500.');

  passedTests++;
  console.log('  PASS 4: Opened Apothecary successfully with separate facility profile.');

  // Test 2.4: Accrue and Collect Profits
  const accrueResult = service.accrueProfits(tavernResult.businessId, 7);
  assert(accrueResult.totalAccumulatedProfit > 0, 'Accruing profits over 7 days must produce surplus profit.');
  const profitBefore = accrueResult.totalAccumulatedProfit;

  const collectResult = service.collectProfits(tavernResult.businessId);
  assert(collectResult.success, 'Collecting profits must succeed.');
  assert(collectResult.collectedAmount === profitBefore, 'Collected amount must match total accumulated profit.');
  assert(collectResult.remainingProfit === 0, 'Remaining profit must be zero after full collection.');
  assert(collectResult.ownerNewCash === 5500 + profitBefore, 'Owner liquid cash must increase by collected profit.');

  passedTests++;
  console.log(`  PASS 5: Accrued (${profitBefore} Qian) and collected profits into owner liquid cash.`);

  // Test 2.5: Insufficient Capital Prevention
  let capitalErrorCaught = false;
  try {
    service.openEnterprise(testOwnerId, 'BLACKSMITH', 'Lò Rèn Bách Nghệ', 'LOC-0001', 999999);
  } catch (err: any) {
    capitalErrorCaught = true;
    assert(err.message.includes('bất túc'), 'Error message must reflect insufficient funds.');
  }
  assert(capitalErrorCaught, 'Attempting to open business with excessive capital requirement must fail.');

  passedTests++;
  console.log('  PASS 6: Guard prevents opening enterprise without sufficient capital.\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Wage Worker / Laborer Mode (Đi Làm Thuê)
  // -------------------------------------------------------------------------
  console.log('>>> [TEST GROUP 3] Wage Worker Mode: Zero Capital, Wages, Fatigue, EXP');

  const testWorkerId = 'CHAR-VERIFY-WORKER-01';
  db.execute('DELETE FROM player_state WHERE player_id = ?;', [testWorkerId]);
  db.execute('DELETE FROM character_professions WHERE character_id = ?;', [testWorkerId]);

  // Worker starts with 0 money, 0 fatigue, 50 CRA attr, 0 CRA exp
  db.execute(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, fatigue, cra_attr, com_attr, cra_exp, com_exp)
    VALUES (?, 'Thiếu Niên Học Việc', 18, 0, 0, 50, 50, 0, 0);
  `, [testWorkerId]);

  // Test 3.1: Work as Tavern Cook (JOB_TAVERN_COOK)
  const cookShift = service.workShift(testWorkerId, 'JOB_TAVERN_COOK');
  assert(cookShift.success, 'Work shift as Tavern Cook must succeed.');
  assert(cookShift.fatigueConsumed === 15, 'Work shift must consume 15 fatigue.');
  assert(cookShift.newFatigue === 15, 'New fatigue must be 15.');
  assert(cookShift.wagePaid === 65, 'Tavern Cook must earn 65 Qian daily wage.');
  assert(cookShift.newLiquidCash === 65, 'Worker liquid cash must increase from 0 to 65.');
  assert(cookShift.professionCode === 'PROF_CHEF', 'Profession rewarded must be PROF_CHEF.');
  assert(cookShift.professionExpGained === 25, 'Profession EXP gained must be 25.');
  assert(cookShift.attributeTarget === 'cra', 'Attribute target must be CRA.');
  assert(cookShift.attributeExpGained === 15, 'Attribute CRA EXP gained must be 15.');

  // Verify in database tables
  const workerStateAfterCook = db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', [testWorkerId]);
  assert(workerStateAfterCook.liquid_cash === 65, 'DB liquid_cash must be 65.');
  assert(workerStateAfterCook.fatigue === 15, 'DB fatigue must be 15.');
  assert(workerStateAfterCook.cra_exp === 15, 'DB cra_exp must be 15.');

  const chefProf = db.queryOne<any>(
    'SELECT * FROM character_professions WHERE character_id = ? AND profession_code = ?;',
    [testWorkerId, 'PROF_CHEF']
  );
  assert(!!chefProf, 'PROF_CHEF record must exist in character_professions.');
  assert(chefProf.current_exp === 25, 'Chef profession EXP must be 25.');

  passedTests++;
  console.log('  PASS 7: Tavern Cook shift completed (+65 wage, +15 fatigue, +25 Chef EXP, +15 CRA EXP).');

  // Test 3.2: Work as Apothecary Medicine Compounder (JOB_APOTHECARY_COMPOUNDER)
  const compounderShift = service.workShift(testWorkerId, 'JOB_APOTHECARY_COMPOUNDER');
  assert(compounderShift.success, 'Work shift as Apothecary Compounder must succeed.');
  assert(compounderShift.fatigueConsumed === 15, 'Shift must consume 15 fatigue.');
  assert(compounderShift.newFatigue === 30, 'Worker fatigue must now be 30 (15 + 15).');
  assert(compounderShift.wagePaid === 60, 'Medicine Compounder wage must be 60 Qian.');
  assert(compounderShift.newLiquidCash === 125, 'Worker liquid cash must now be 125 (65 + 60).');
  assert(compounderShift.professionCode === 'PROF_MEDICINE', 'Profession must be PROF_MEDICINE.');
  assert(compounderShift.professionExpGained === 25, 'Profession EXP must be 25.');

  const medProf = db.queryOne<any>(
    'SELECT * FROM character_professions WHERE character_id = ? AND profession_code = ?;',
    [testWorkerId, 'PROF_MEDICINE']
  );
  assert(!!medProf, 'PROF_MEDICINE record must exist in character_professions.');
  assert(medProf.current_exp === 25, 'Medicine profession EXP must be 25.');

  passedTests++;
  console.log('  PASS 8: Apothecary Compounder shift completed (+60 wage, +15 fatigue, +25 Medicine EXP).');

  // Test 3.3: Work as Tavern Staff (JOB_TAVERN_STAFF)
  const waiterShift = service.workShift(testWorkerId, 'JOB_TAVERN_STAFF');
  assert(waiterShift.success, 'Work shift as Tavern Staff must succeed.');
  assert(waiterShift.wagePaid === 40, 'Tavern Staff wage must be 40 Qian.');
  assert(waiterShift.newLiquidCash === 165, 'Worker cash must now be 165 (125 + 40).');
  assert(waiterShift.attributeTarget === 'com', 'Waiter attribute target must be COM.');
  assert(waiterShift.attributeExpGained === 10, 'Waiter attribute COM EXP must be 10.');

  passedTests++;
  console.log('  PASS 9: Tavern Waiter shift completed (+40 wage, +10 COM EXP, +25 Merchant EXP).');

  // Test 3.4: Work as Herbal Forager & Forge Hand
  const foragerShift = service.workShift(testWorkerId, 'JOB_HERB_GATHERER');
  assert(foragerShift.success, 'Herbal Forager shift must succeed.');
  assert(foragerShift.professionCode === 'PROF_HERBALIST', 'Profession must be PROF_HERBALIST.');

  const forgeShift = service.workShift(testWorkerId, 'JOB_FORGE_HAND');
  assert(forgeShift.success, 'Forge Hand shift must succeed.');
  assert(forgeShift.professionCode === 'PROF_BLACKSMITH', 'Profession must be PROF_BLACKSMITH.');
  assert(forgeShift.wagePaid === 75, 'Forge hand wage must be 75 Qian.');

  passedTests++;
  console.log('  PASS 10: Herbal Forager and Forge Hand shifts verified across disciplines.');

  // Test 3.5: Fatigue Exhaustion Guard
  db.execute('UPDATE player_state SET fatigue = 90 WHERE player_id = ?;', [testWorkerId]);
  let fatigueErrorCaught = false;
  try {
    service.workShift(testWorkerId, 'JOB_TAVERN_COOK');
  } catch (err: any) {
    fatigueErrorCaught = true;
    assert(err.message.includes('Khí lực kiệt quệ'), 'Error message must warn of fatigue exhaustion.');
  }
  assert(fatigueErrorCaught, 'Worker with >= 90 fatigue must not be allowed to work another shift.');

  passedTests++;
  console.log('  PASS 11: Fatigue exhaustion guard prevents overwork when fatigue + 15 > 95.');

  // Test 3.6: Verify Available Jobs Catalog
  const availableJobs = service.getAvailableJobs();
  assert(availableJobs.length === 6, 'There must be 6 distinct wage jobs available in catalog.');
  const jobTypes = availableJobs.map((j) => j.jobType);
  assert(jobTypes.includes('JOB_TAVERN_COOK'), 'Catalog must include JOB_TAVERN_COOK.');
  assert(jobTypes.includes('JOB_TAVERN_STAFF'), 'Catalog must include JOB_TAVERN_STAFF.');
  assert(jobTypes.includes('JOB_APOTHECARY_COMPOUNDER'), 'Catalog must include JOB_APOTHECARY_COMPOUNDER.');
  assert(jobTypes.includes('JOB_HERB_GATHERER'), 'Catalog must include JOB_HERB_GATHERER.');
  assert(jobTypes.includes('JOB_FORGE_HAND'), 'Catalog must include JOB_FORGE_HAND.');
  assert(jobTypes.includes('JOB_WEAVER'), 'Catalog must include JOB_WEAVER.');

  passedTests++;
  console.log('  PASS 12: Available jobs catalog lists all 6 roleplay labor positions.\n');

  const cleanup = () => {
    try {
      db.execute('DELETE FROM player_state WHERE player_id IN (?, ?);', [testOwnerId, testWorkerId]);
      db.execute('DELETE FROM businesses WHERE owner_character_id IN (?, ?);', [testOwnerId, testWorkerId]);
      db.execute('DELETE FROM character_professions WHERE character_id IN (?, ?);', [testOwnerId, testWorkerId]);
      db.execute(
        'DELETE FROM cashflow_ledger WHERE counterparty LIKE ? OR counterparty LIKE ? OR memo LIKE ? OR txn_id LIKE ?;',
        ['%Đào Viên Khách Điếm%', '%Tế Dân Dược Quán%', '%Tiền công làm thuê%', 'TXN-WAGE-%']
      );
    } catch (e) {}
  };

  // -------------------------------------------------------------------------
  // CLEANUP TEST ENTITIES
  // -------------------------------------------------------------------------
  cleanup();

  console.log('======================================================================');
  console.log(`   VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('======================================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION SUITE FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
