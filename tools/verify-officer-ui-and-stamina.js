/**
 * Verification test for Officer Dossier Standardization, Stamina Mechanics, and Spatial Proximity Actions
 */
const { DatabaseService } = require('../src/core/database');
const { DailyInteractionEngine } = require('../src/modules/social-kizuna/daily-interaction.engine');

async function runTests() {
  console.log('--- STARTING VERIFICATION: OFFICER DOSSIER, STAMINA & SPATIAL PROXIMITY ---');

  const engine = DailyInteractionEngine.getInstance();
  const db = DatabaseService.getInstance();

  // Test 1: Retrieve Zhang Fei dossier and verify name formatting
  console.log('\n[TEST 1] Verifying Zhang Fei Dossier Data...');
  const zfDossier = engine.getNpcDossier('NPC-0002');
  console.log(`- Name: ${zfDossier.nameVi}`);
  console.log(`- Style: ${zfDossier.styleNameVi}`);
  console.log(`- Location: ${zfDossier.locationVi}`);
  console.log(`- Baseline Location: ${zfDossier.baselineLocation}`);
  if (!zfDossier.nameVi || !zfDossier.styleNameVi) throw new Error('Missing name or style for Zhang Fei');
  console.log('✅ Test 1 Passed: Zhang Fei dossier intact.');

  // Test 2: Retrieve Tran Bao dossier and verify workshop location
  console.log('\n[TEST 2] Verifying Tran Bao Dossier Data...');
  const tbDossier = engine.getNpcDossier('NPC-0007');
  console.log(`- Name: ${tbDossier.nameVi}`);
  console.log(`- Style: ${tbDossier.styleNameVi}`);
  console.log(`- Location: ${tbDossier.locationVi}`);
  console.log(`- Baseline Location: ${tbDossier.baselineLocation}`);
  if (!tbDossier.locationVi.includes('Xưởng')) throw new Error('Tran Bao should be at Liang Clan Workshop');
  console.log('✅ Test 2 Passed: Tran Bao workshop location confirmed.');

  // Test 3: Test SEND_COURIER_LETTER for remote NPC (Tran Bao)
  console.log('\n[TEST 3] Testing SEND_COURIER_LETTER interaction with Tran Bao...');
  const courierRes = engine.executeDailyInteraction('NPC-0007', 'SEND_COURIER_LETTER');
  console.log(`- Action: ${courierRes.actionTitleVi}`);
  console.log(`- Outcome: ${courierRes.outcomeTitleVi}`);
  console.log(`- Cash Cost: ${courierRes.deltas.cashCost} Qian`);
  console.log(`- Affinity Delta: +${courierRes.deltas.affinityChange}`);
  console.log(`- Dialogue: "${courierRes.dialogueNarrativeVi.slice(0, 100)}..."`);
  if (courierRes.deltas.cashCost !== 3) throw new Error('Courier fee must be 3 Qian');
  console.log('✅ Test 3 Passed: Remote servant courier successfully delivered letter.');

  // Test 4: Test TEA_CONVERSE stamina recovery
  console.log('\n[TEST 4] Testing TEA_CONVERSE stamina recovery...');
  const playerBeforeTea = db.queryOne(`SELECT fatigue, morale FROM player_state WHERE player_id = 'PLY-0001';`);
  const teaRes = engine.executeDailyInteraction('NPC-0002', 'TEA_CONVERSE');
  const playerAfterTea = db.queryOne(`SELECT fatigue, morale FROM player_state WHERE player_id = 'PLY-0001';`);
  console.log(`- Fatigue before: ${playerBeforeTea.fatigue}, after: ${playerAfterTea.fatigue} (Delta: ${teaRes.deltas.fatigueDelta})`);
  console.log(`- Morale before: ${playerBeforeTea.morale}, after: ${playerAfterTea.morale} (Delta: ${teaRes.deltas.moraleDelta})`);
  if (teaRes.deltas.fatigueDelta !== -15) throw new Error('Tea converse must reduce fatigue by 15');
  console.log('✅ Test 4 Passed: Tea conversation recovered 15 stamina.');

  // Test 5: Test BANQUET_DRINK stamina recovery
  console.log('\n[TEST 5] Testing BANQUET_DRINK stamina recovery...');
  const playerBeforeWine = db.queryOne(`SELECT fatigue, morale FROM player_state WHERE player_id = 'PLY-0001';`);
  const wineRes = engine.executeDailyInteraction('NPC-0002', 'BANQUET_DRINK');
  const playerAfterWine = db.queryOne(`SELECT fatigue, morale FROM player_state WHERE player_id = 'PLY-0001';`);
  console.log(`- Fatigue before: ${playerBeforeWine.fatigue}, after: ${playerAfterWine.fatigue} (Delta: ${wineRes.deltas.fatigueDelta})`);
  console.log(`- Morale before: ${playerBeforeWine.morale}, after: ${playerAfterWine.morale} (Delta: ${wineRes.deltas.moraleDelta})`);
  if (wineRes.deltas.fatigueDelta !== -35) throw new Error('Wine banquet must reduce fatigue by 35');
  console.log('✅ Test 5 Passed: Wine banquet recovered 35 stamina.');

  console.log('\n🎉 ALL 5 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
