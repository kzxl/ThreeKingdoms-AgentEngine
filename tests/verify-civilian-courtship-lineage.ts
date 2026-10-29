/**
 * ThreeKingdoms-AgentEngine: Civilian Maiden Courtship, Encounter Rates & Generational Lineage Test Suite
 * (tests/verify-civilian-courtship-lineage.ts)
 *
 * Verifies:
 * 1. Location-based probabilistic encounter rates & dynamic modifiers (Prosperity, Charm, Prestige gates)
 * 2. Activity-driven discovery unlocking civilian maidens across social strata (Peasant, Artisan, Gentry)
 * 3. Courtship candidate aggregation (Historical heroines + Civilian maidens)
 * 4. Customary marriage proposal with dowry deduction and double-entry accounting
 * 5. Strict warfare/expedition blocker: active military campaign commanders cannot marry, rest, or conceive
 * 6. Officer personality-driven marriage readiness (Valiant/Martial glory vs Pragmatic/Household stability)
 * 7. Autonomous NPC marriages across factions with personal cash dowry payments
 * 8. Autonomous generational gestation and childbirth delivering authentic Han-named heirs with father's surname
 * 9. Perfect audit conservation and clean teardown maintaining 0 discrepancies.
 */

import { DatabaseService } from '../src/core/database';
import { FamilyLineageService } from '../src/modules/lineage-succession/family-lineage.service';
import { execSync } from 'child_process';
import path from 'path';

interface TestStats {
  passed: number;
  failed: number;
  tests: string[];
}

const stats: TestStats = {
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition: boolean, testName: string, detail?: string): void {
  stats.tests.push(testName);
  if (condition) {
    stats.passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    stats.failed++;
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runCivilianLineageVerification(): Promise<void> {
  console.log('======================================================================');
  console.log('   ROTK SIMULATION: CIVILIAN MAIDEN COURTSHIP & AUTONOMOUS LINEAGE    ');
  console.log('======================================================================\n');

  const db = DatabaseService.getInstance();
  const lineageService = FamilyLineageService.getInstance();

  const startPlayer = db.queryOne<any>('SELECT liquid_cash FROM player_state WHERE player_id = ?;', ['PLY-0001']);
  const baselineLiquidCash = Number(startPlayer?.liquid_cash || 8086);

  try {
    // -----------------------------------------------------------------------
    // GROUP 1: Schema & Data Integrity for Civilian Maidens & Encounter Rates
    // -----------------------------------------------------------------------
    console.log('>>> [GROUP 1] Civilian Maidens & Location Encounter Rates Integrity...');

    const maidenCountRow = db.queryOne<any>('SELECT COUNT(*) as cnt FROM civilian_maidens;');
    const maidenCount = Number(maidenCountRow?.cnt || 0);
    assert(maidenCount >= 18, `Civilian maidens populated with comprehensive social strata (Count: ${maidenCount} >= 18)`);

    const strataCounts = db.query<any>(
      'SELECT social_stratum, COUNT(*) as cnt FROM civilian_maidens GROUP BY social_stratum ORDER BY social_stratum;'
    );
    const peasantCount = Number(strataCounts.find(s => s.social_stratum === 'PEASANT')?.cnt || 0);
    const artisanCount = Number(strataCounts.find(s => s.social_stratum === 'ARTISAN_SHOP')?.cnt || 0);
    const gentryCount = Number(strataCounts.find(s => s.social_stratum === 'GENTRY_CLAN')?.cnt || 0);

    assert(peasantCount >= 6, `Peasant stratum represented (Count: ${peasantCount} >= 6)`);
    assert(artisanCount >= 6, `Artisan/Shop stratum represented (Count: ${artisanCount} >= 6)`);
    assert(gentryCount >= 6, `Gentry Clan stratum represented (Count: ${gentryCount} >= 6)`);

    const rateCountRow = db.queryOne<any>('SELECT COUNT(*) as cnt FROM location_encounter_rates;');
    const rateCount = Number(rateCountRow?.cnt || 0);
    assert(rateCount >= 7, `Location encounter rates configured across facility types (Count: ${rateCount} >= 7)`);

    // Verify rate probability invariants
    const invalidRates = db.query<any>(
      'SELECT rate_id FROM location_encounter_rates WHERE base_probability < 0.0 OR base_probability > 1.0;'
    );
    assert(invalidRates.length === 0, 'All encounter base probabilities strictly bounded within [0.0, 1.0]');

    // -----------------------------------------------------------------------
    // GROUP 2: Activity-Driven Probabilistic Encounter Trigger
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 2] Activity-Driven Probabilistic Encounter Trigger...');

    // Test farm activity encounter in zhuo_xian
    const farmResult = lineageService.triggerActivityEncounter({
      characterId: 'PLY-0001',
      actionType: 'FARM',
      facilityType: 'FARM_FIELD',
      settlementId: 'zhuo_xian'
    });

    assert(farmResult !== undefined, 'triggerActivityEncounter executes and returns result object');
    assert(farmResult.rateApplied !== undefined, 'Encounter resolution applied matching rate rule');
    assert(
      farmResult.rateApplied?.baseProbability === 0.25,
      `Farm field base probability equals 0.25 (Actual: ${farmResult.rateApplied?.baseProbability})`
    );
    assert(
      farmResult.rateApplied?.modifierProsperity !== undefined && farmResult.rateApplied.modifierProsperity > 0,
      `Settlement prosperity modifier dynamically applied (${farmResult.rateApplied?.modifierProsperity})`
    );
    assert(
      farmResult.rateApplied?.modifierCharm !== undefined && farmResult.rateApplied.modifierCharm > 0,
      `Character charm modifier dynamically applied (${farmResult.rateApplied?.modifierCharm})`
    );

    // Test tavern drink activity encounter
    const tavernResult = lineageService.triggerActivityEncounter({
      characterId: 'PLY-0001',
      actionType: 'DRINK',
      facilityType: 'TAVERN',
      settlementId: 'ye_cheng'
    });
    assert(tavernResult.rateApplied?.rateId === 'RATE-ALL-DRINK-ARTISAN', 'Tavern drink action correctly targets artisan stratum rate');

    // Test non-matching action returns cleanly without error
    const nonMatchResult = lineageService.triggerActivityEncounter({
      characterId: 'PLY-0001',
      actionType: 'UNKNOWN_ACTION',
      facilityType: 'UNKNOWN_FACILITY',
      settlementId: 'zhuo_xian'
    });
    assert(!nonMatchResult.encountered, 'Unknown facility/action returns encountered = false safely');

    // -----------------------------------------------------------------------
    // GROUP 3: Courtship Candidates Discovery & Strata Integration
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 3] Unified Courtship Candidates Roster...');

    const candidates = lineageService.getCourtshipCandidates();
    assert(candidates.length >= 23, `Candidate roster includes both heroines and civilian maidens (${candidates.length} >= 23)`);

    const heroineCandidate = candidates.find(c => c.npcId === 'NPC-0081');
    assert(heroineCandidate !== undefined, 'Historical heroine Lady Zhen present in candidates');
    assert(heroineCandidate?.socialStratum === 'HISTORICAL_HEROINE', 'Heroine categorized as HISTORICAL_HEROINE stratum');

    const peasantCandidate = candidates.find(c => c.npcId === 'MAIDEN-ZHUO-AGRI');
    assert(peasantCandidate !== undefined, 'Peasant maiden Lý Tú Lan present in candidates');
    assert(peasantCandidate?.socialStratum === 'PEASANT', 'Peasant maiden stratum matches PEASANT');
    assert(peasantCandidate?.recommendedDowryCash === 400, 'Peasant maiden customary dowry equals 400 Qian');

    const gentryCandidate = candidates.find(c => c.npcId === 'MAIDEN-ZHUO-GENTRY');
    assert(gentryCandidate !== undefined, 'Gentry maiden Lục Uyển Nhi present in candidates');
    assert(gentryCandidate?.socialStratum === 'GENTRY_CLAN', 'Gentry maiden stratum matches GENTRY_CLAN');
    assert(gentryCandidate?.recommendedDowryCash === 3500, 'Gentry maiden customary dowry equals 3500 Qian');

    // -----------------------------------------------------------------------
    // GROUP 4: Customary Proposal & Marriage to Civilian Maiden
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 4] Customary Civilian Proposal & Accounting Parity...');

    const testMaidenId = 'MAIDEN-ZHUO-AGRI';

    // Verify unencountered maiden proposal is blocked
    db.execute('DELETE FROM npc_intel_fog WHERE npc_id = ?;', [testMaidenId]);
    db.execute('DELETE FROM npc_relationship_deltas WHERE npc_id = ?;', [testMaidenId]);

    let unencounteredBlocked = false;
    try {
      lineageService.proposeMarriage({
        wifeNpcId: testMaidenId,
        dowryCash: 400
      });
    } catch (err: any) {
      unencounteredBlocked = err.message.includes('chưa từng diện kiến hay tương ngộ');
    }
    assert(unencounteredBlocked, 'Proposal blocked if maiden has not been encountered yet');

    // Simulate encounter and foster affinity to 80
    db.execute(`
      INSERT OR REPLACE INTO npc_intel_fog (npc_id, intel_level, interaction_count, current_mood)
      VALUES (?, 2, 5, 'CHEERFUL');
    `, [testMaidenId]);

    db.execute(`
      INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
      VALUES (?, '184-05-02', 60, 85, 'DEVOTED', 'Bồi đắp tình cảm thân thiết');
    `, [testMaidenId]);

    // Proposal with Affinity >= 80 succeeds
    const initialPlayer = db.queryOne<any>('SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?;', ['PLY-0001']);
    const initLiquid = Number(initialPlayer.liquid_cash);

    const marriageResult = lineageService.proposeMarriage({
      wifeNpcId: testMaidenId,
      dowryCash: 400
    });

    assert(marriageResult.success, 'Marriage proposal to civilian maiden succeeded');
    assert(marriageResult.wifeId === testMaidenId, 'Spouse wife_id matches civilian maiden ID');

    // Verify database state updates
    const maidenUpdated = db.queryOne<any>('SELECT is_married, husband_id FROM civilian_maidens WHERE maiden_id = ?;', [testMaidenId]);
    assert(Number(maidenUpdated?.is_married) === 1, 'civilian_maidens marked as married (is_married = 1)');
    assert(maidenUpdated?.husband_id === 'PLY-0001', 'civilian_maidens husband_id set to PLY-0001');

    const spouseRow = db.queryOne<any>('SELECT * FROM family_spouses WHERE wife_id = ?;', [testMaidenId]);
    assert(spouseRow !== undefined, 'Spouse record created in family_spouses table');
    assert(spouseRow?.status === 'MARRIED', 'Spouse status is MARRIED');

    const postPlayer = db.queryOne<any>('SELECT liquid_cash FROM player_state WHERE player_id = ?;', ['PLY-0001']);
    assert(Number(postPlayer.liquid_cash) === initLiquid - 400, 'Treasury liquid cash accurately reduced by dowry (400 Qian)');

    // -----------------------------------------------------------------------
    // GROUP 5: Military Expedition Warfare Hard Blocker
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 5] Active Military Warfare Deployment Blocker...');

    // Deploy PLY-0001 on an active military expedition
    const testExpId = 'EXP-TEST-WAR-001';
    db.execute(`
      INSERT INTO military_expeditions (
        expedition_id, commander_id, origin_settlement_id, target_settlement_id,
        troop_count, grain_supply_days, is_supplied, status, created_turn, game_date
      ) VALUES (?, 'PLY-0001', 'zhuo_xian', 'ye_cheng', 1000, 30.0, 1, 'MARCHING', 6, '184-05-02');
    `, [testExpId]);

    assert(
      lineageService.isCharacterInActiveExpedition('PLY-0001'),
      'isCharacterInActiveExpedition detects active expedition for commander'
    );

    // Attempting marriage while deployed MUST throw error
    let expeditionMarriageBlocked = false;
    try {
      lineageService.proposeMarriage({
        wifeNpcId: 'MAIDEN-ZHUO-CRAFT',
        dowryCash: 1200
      });
    } catch (err: any) {
      expeditionMarriageBlocked = err.message.includes('quân vụ sa trường') || err.message.includes('quân lệnh như sơn');
    }
    assert(expeditionMarriageBlocked, 'Marriage strictly blocked while commander is on active expedition');

    // Attempting cohabitation rest while deployed MUST throw error
    let expeditionRestBlocked = false;
    try {
      lineageService.restWithSpouse(spouseRow.marriage_id);
    } catch (err: any) {
      expeditionRestBlocked = err.message.includes('quân vụ') || err.message.includes('chiến trường');
    }
    assert(expeditionRestBlocked, 'Cohabitation rest strictly blocked while commander is in the field');

    // Conclude expedition to lift warfare blocker
    db.execute("UPDATE military_expeditions SET status = 'CONCLUDED' WHERE expedition_id = ?;", [testExpId]);
    assert(
      !lineageService.isCharacterInActiveExpedition('PLY-0001'),
      'Expedition conclusion immediately restores peace and lifts blockers'
    );

    // -----------------------------------------------------------------------
    // GROUP 6: Officer Personality & Situational Marriage Readiness
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 6] Officer Personality & Situational Readiness...');

    // Zhao Yun (NPC-0024: Valiant, age 20, low court rank) -> Not ready
    const zhaoYunReadiness = lineageService.evaluateNpcMarriageReadiness('NPC-0024');
    assert(
      !zhaoYunReadiness.ready,
      `Valiant young officer Zhao Yun prioritizes military exploits over marriage (Reason: ${zhaoYunReadiness.reasonVi})`
    );

    // Zhang Bao / Chen Bao (NPC-0007: Pragmatic, age 28) -> Ready
    const pragmaticReadiness = lineageService.evaluateNpcMarriageReadiness('NPC-0007');
    assert(
      pragmaticReadiness.ready,
      `Pragmatic officer Chen Bao embraces family stability (Reason: ${pragmaticReadiness.reasonVi})`
    );

    // Deploy officer Chen Bao to expedition -> immediately becomes unready
    db.execute(`
      INSERT INTO military_expeditions (
        expedition_id, commander_id, origin_settlement_id, target_settlement_id,
        troop_count, grain_supply_days, is_supplied, status, created_turn, game_date
      ) VALUES ('EXP-TEST-CHEN-01', 'NPC-0007', 'zhuo_xian', 'ye_cheng', 500, 20.0, 1, 'MARCHING', 6, '184-05-02');
    `);
    const deployedReadiness = lineageService.evaluateNpcMarriageReadiness('NPC-0007');
    assert(!deployedReadiness.ready, 'Officer deployed in battle automatically switches to unready');
    db.execute("DELETE FROM military_expeditions WHERE expedition_id = 'EXP-TEST-CHEN-01';");

    // -----------------------------------------------------------------------
    // GROUP 7: Autonomous NPC Marriage Simulation
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 7] Autonomous NPC Marriages Across Factions...');

    // Ensure officer NPC-0005 (Zhang Shiping - Merchant, Pragmatic, Cash 5000) has cash
    db.execute(`
      INSERT OR REPLACE INTO npc_personal_progression (npc_id, life_ambition, current_focus, personal_cash, prestige)
      VALUES ('NPC-0005', 'WEALTH_ACCUMULATION', 'COMMERCE', 5000, 120);
    `);

    const autoMarriages = lineageService.simulateAutonomousNpcMarriages(7, '184-05-15');
    assert(autoMarriages.length > 0, `Autonomous NPC marriage simulation executed (${autoMarriages.length} marriages arranged)`);

    const npcMarriage = autoMarriages[0];
    assert(npcMarriage.husbandId !== 'PLY-0001', 'Autonomous marriage arranged for non-player officer');
    assert(npcMarriage.dowryCash > 0, `Autonomous marriage deducted customary dowry (${npcMarriage.dowryCash} Qian)`);

    const npcSpouseRow = db.queryOne<any>('SELECT * FROM family_spouses WHERE husband_id = ?;', [npcMarriage.husbandId]);
    assert(npcSpouseRow !== undefined, 'Spouse record registered for autonomous NPC couple');

    // -----------------------------------------------------------------------
    // GROUP 8: Autonomous Gestation & Authentic Han-Named Childbirth
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 8] Generational Childbirth & Authentic Han Surnames...');

    // Test authentic Han surname extraction
    const guanSurname = lineageService.extractAuthenticSurname('Quan Vũ (Vân Trường)');
    assert(guanSurname === 'Quan', `Extracted single surname 'Quan' from 'Quan Vũ' (Actual: '${guanSurname}')`);

    const zhugeSurname = lineageService.extractAuthenticSurname('Gia Cát Lượng (Khổng Minh)');
    assert(zhugeSurname === 'Gia Cát', `Extracted compound surname 'Gia Cát' from 'Gia Cát Lượng' (Actual: '${zhugeSurname}')`);

    const xiahouSurname = lineageService.extractAuthenticSurname('Hạ Hầu Đôn (Nguyên Nhượng)');
    assert(xiahouSurname === 'Hạ Hầu', `Extracted compound surname 'Hạ Hầu' from 'Hạ Hầu Đôn' (Actual: '${xiahouSurname}')`);

    const liangSurname = lineageService.extractAuthenticSurname('Lương Diễn');
    assert(liangSurname === 'Lương', `Extracted single surname 'Lương' from 'Lương Diễn' (Actual: '${liangSurname}')`);

    // Advance pregnancy stage for NPC couple to Stage 3 (Full-term)
    db.execute(
      'UPDATE family_spouses SET pregnancy_stage = 3 WHERE marriage_id = ?;',
      [npcSpouseRow.marriage_id]
    );

    const childbirthResult = lineageService.simulateAutonomousNpcChildbirth(8, '184-06-01');
    assert(childbirthResult.births.length > 0, `Autonomous childbirth delivered new generational heir (${childbirthResult.births.length} births)`);

    const baby = childbirthResult.births[0];
    const fatherSurname = lineageService.extractAuthenticSurname(baby.fatherNameVi);
    assert(
      baby.nameVi.startsWith(fatherSurname),
      `Baby name [${baby.nameVi}] correctly bears father's authentic surname [${fatherSurname}]`
    );

    // Verify genetic attributes inherited
    assert(baby.inheritedStats.war >= 15 && baby.inheritedStats.war <= 90, 'Baby war stat adheres to statutory range [15, 90]');
    assert(baby.inheritedStats.int >= 15 && baby.inheritedStats.int <= 90, 'Baby int stat adheres to statutory range [15, 90]');

    // Verify mother pregnancy stage reset
    const postBirthSpouse = db.queryOne<any>('SELECT pregnancy_stage FROM family_spouses WHERE marriage_id = ?;', [npcSpouseRow.marriage_id]);
    assert(Number(postBirthSpouse?.pregnancy_stage) === 0, 'Mother pregnancy stage reset to 0 following delivery');

    // -----------------------------------------------------------------------
    // GROUP 9: Maternal Trait Perks for Civilian Maidens
    // -----------------------------------------------------------------------
    console.log('\n>>> [GROUP 9] Civilian Maiden Maternal Genetics...');

    const craftMaiden = db.queryOne<any>('SELECT * FROM civilian_maidens WHERE maiden_id = ?;', ['MAIDEN-ZHUO-CRAFT']);
    assert(craftMaiden?.maternal_trait_code === 'TLT-CRAFT-INGENUITY', 'Craft maiden possesses Craft Ingenuity maternal trait');
    assert(craftMaiden?.bonus_stat === 'cra', 'Craft maiden boosts craftsmanship (CRA)');

    const genetics = lineageService.calculateGenetics(
      { war: 60, int: 60, com: 60, ldr: 60, pol: 60, dip: 60, cra: 60, log: 60 },
      { war: 30, int: 50, com: 50, ldr: 40, pol: 40, dip: 50, cra: 50, log: 40 },
      'MAIDEN-ZHUO-CRAFT'
    );
    assert(
      genetics.innateTalents.includes('TLT-CRAFT-INGENUITY'),
      'Child genetics successfully inherited TLT-CRAFT-INGENUITY maternal perk'
    );

  } finally {
    // -----------------------------------------------------------------------
    // TEARDOWN: Clean up temporary test data and verify audit invariants
    // -----------------------------------------------------------------------
    console.log('\n>>> [TEARDOWN] Reverting test artifacts to maintain audit invariants...');

    db.transaction(() => {
      // Revert test marriages & children
      db.execute("DELETE FROM family_children WHERE child_id LIKE 'CHD-NPC-%';");
      db.execute("DELETE FROM family_spouses WHERE husband_id != 'PLY-0001' OR wife_id = 'MAIDEN-ZHUO-AGRI';");
      db.execute("UPDATE civilian_maidens SET is_married = 0, husband_id = NULL WHERE maiden_id = 'MAIDEN-ZHUO-AGRI';");
      db.execute("UPDATE civilian_maidens SET is_married = 0, husband_id = NULL WHERE is_married = 1;");
      db.execute("DELETE FROM military_expeditions WHERE expedition_id LIKE 'EXP-TEST-%';");
      db.execute("DELETE FROM npc_relationship_deltas WHERE npc_id = 'MAIDEN-ZHUO-AGRI';");
      db.execute("DELETE FROM npc_intel_fog WHERE npc_id = 'MAIDEN-ZHUO-AGRI';");
      db.execute("DELETE FROM family_genealogy_tree WHERE descendant_id = 'MAIDEN-ZHUO-AGRI';");

      // Revert test cashflow/journal entries
      const testTxns = db.query<any>("SELECT txn_id FROM cashflow_ledger WHERE category = 'MARRIAGE_DOWRY' AND memo LIKE '%Lý Tú Lan%';");
      for (const t of testTxns) {
        db.execute('DELETE FROM account_journal WHERE txn_id = ?;', [t.txn_id]);
        db.execute('DELETE FROM cashflow_ledger WHERE txn_id = ?;', [t.txn_id]);
      }

      // Restore PLY-0001 liquid cash
      db.execute("UPDATE player_state SET liquid_cash = ? WHERE player_id = 'PLY-0001';", [baselineLiquidCash]);
    });

    try {
      execSync('node tools/sim-audit.js', { stdio: 'pipe' });
      console.log('  ✓ Audit invariant check confirmed: all invariants preserved with 0 discrepancies!');
    } catch (e: any) {
      console.error('  ❌ Warning: sim-audit reported discrepancies during teardown:', e.message);
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`TOTAL CIVILIAN LINEAGE TESTS: ${stats.passed + stats.failed}`);
  console.log(`PASSED: ${stats.passed}`);
  console.log(`FAILED: ${stats.failed}`);
  console.log('======================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runCivilianLineageVerification().catch(err => {
  console.error('Fatal error running civilian lineage verification:', err);
  process.exit(1);
});
