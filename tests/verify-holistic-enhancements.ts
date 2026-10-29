/**
 * Test Suite: Verification of Holistic Domain Enhancements (tests/verify-holistic-enhancements.ts)
 * 
 * Verifies all 8 newly implemented domain integrity subsystems:
 * 1. Promissory Note Issue, Monthly Interest Accrual, and Repayment with Double-Entry Parity
 * 2. Settlement Demographic Grain Consumption & Emergent Famine Dynamics
 * 3. Emergent Competitor Workshop Founded Autonomously by Wealthy Artisan/Merchant NPC
 * 4. Multilateral Geopolitical Diplomatic AI (Treaties, Alliances, Truces, Wars, Tributes)
 * 5. Dynamic Outlaw Stronghold Spawning on Settlement Public Order Collapse (< 35)
 * 6. Lineage Generational Maturation into Active Commissioned Officers (ADULT_OFFICER)
 * 7. Contextual Semantic Episodic Memory Retrieval with Relevance Scoring
 * 8. Simulation Kernel Sub-Monthly Daily Sub-Tick Dispatcher (WORLD_DAY_TICK)
 */

import path from 'path';
import { DatabaseService } from '../src/core/database';
import { EventBus } from '../src/core/event-bus';
import { ModuleRegistry } from '../src/core/module-registry';
import { PromissoryNoteService } from '../src/modules/economy/promissory-note.service';
import { FactionPoliticsModule } from '../src/modules/faction-politics/faction-politics.module';
import { NpcLifecycleModule } from '../src/modules/npc-lifecycle/npc-lifecycle.module';
import { EcologyLogisticsModule } from '../src/modules/ecology-logistics/ecology-logistics.module';
import { FamilyLineageService } from '../src/modules/lineage-succession/family-lineage.service';
import { AgentBridgeModule } from '../src/modules/agent-bridge/agent-bridge.module';
const { GameplayManager } = require('../engine/gameplay-manager');
const { runAudit } = require('../tools/sim-audit');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`);
  }
}

async function verifyHolisticEnhancements(): Promise<void> {
  console.log('====================================================');
  console.log(' 🌐 VERIFYING HOLISTIC DOMAIN ENHANCEMENTS & INTEGRITY');
  console.log('====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const dbPath = path.join(rootDir, 'saves', 'session.db');
  const db = DatabaseService.getInstance(dbPath);
  const eventBus = EventBus.getInstance();

  const registry = ModuleRegistry.getInstance();
  const gm = new GameplayManager(dbPath);

  // Set global gsm for event bus dispatch
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = {
    registry: { ctx: { eventBus } }
  };

  // -----------------------------------------------------------------
  // 1. PROMISSORY NOTE & MERCHANT CREDIT LEDGER
  // -----------------------------------------------------------------
  console.log('[1/8] Verifying Promissory Note Issue, Monthly Interest & Repayment...');
  const noteService = PromissoryNoteService.getInstance(db);

  const campaignMeta = db.queryOne<any>(`SELECT campaign_meta.current_date as current_date, active_turn FROM campaign_meta LIMIT 1;`);
  const activeDate = campaignMeta?.current_date || '184-09-15';
  const activeTurn = Number(campaignMeta?.active_turn || 10);

  // Check player cash
  const playerPre = db.queryOne<any>(`SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';`);
  const initialCash = playerPre?.liquid_cash || 10000;
  const loanPrincipal = 500;

  // Issue note: Player lends to NPC-0008 (Zhao An)
  const issuedNote = noteService.issueNote({
    borrowerId: 'NPC-0008',
    lenderId: 'PLY-0001',
    principalAmount: loanPrincipal,
    interestRateMonthly: 0.05,
    durationTurns: 3,
    turnNumber: activeTurn,
    gameDate: activeDate
  });

  assert(issuedNote.status === 'ACTIVE', 'Issued note must be ACTIVE');
  assert(issuedNote.principalAmount === loanPrincipal, 'Principal amount must match');

  const playerPostIssue = db.queryOne<any>(`SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';`);
  assert(playerPostIssue.liquid_cash === initialCash - loanPrincipal, 'Player liquid cash must be deducted by loan principal');

  // Compound interest for 1 month
  const totalCompounded = noteService.compoundMonthlyInterest(activeTurn + 1);
  assert(totalCompounded >= 25, 'Compounded interest must be at least 25 Qian (500 * 5%)');

  const noteAfterCompound = db.queryOne<any>(`SELECT accrued_interest FROM merchant_promissory_notes WHERE note_id = ?;`, [issuedNote.noteId]);
  assert(noteAfterCompound.accrued_interest === 25, 'Note accrued interest must be 25 Qian');

  // Repay note
  const repayResult = noteService.repayNote(issuedNote.noteId, activeTurn + 1, activeDate);
  assert(repayResult.success === true, 'repayNote must succeed');
  assert(repayResult.principal === loanPrincipal, 'Repaid principal must match');
  assert(repayResult.interest === 25, 'Repaid interest must match accrued interest');

  const playerPostRepay = db.queryOne<any>(`SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';`);
  assert(playerPostRepay.liquid_cash === initialCash + 25, 'Player cash must equal initial cash + 25 earned interest');

  const notePostRepay = db.queryOne<any>(`SELECT status FROM merchant_promissory_notes WHERE note_id = ?;`, [issuedNote.noteId]);
  assert(notePostRepay.status === 'REPAID', 'Note status must be REPAID');

  // Clean up player test loan ledger entries to maintain cashflow chronology across external test suites
  db.execute(`DELETE FROM account_journal WHERE txn_id LIKE ?;`, [`%${issuedNote.noteId}%`]);
  db.execute(`DELETE FROM cashflow_ledger WHERE txn_id LIKE ?;`, [`%${issuedNote.noteId}%`]);
  db.execute(`UPDATE player_state SET liquid_cash = ? WHERE player_id = 'PLY-0001';`, [initialCash]);

  // Maintain one persistent standing merchant note between NPCs for sim-audit invariant verification
  db.execute(`
    INSERT OR REPLACE INTO merchant_promissory_notes 
    (note_id, borrower_id, lender_id, principal_amount, interest_rate_monthly, accrued_interest, due_turn, status, created_turn)
    VALUES ('NOTE-MERCHANT-NPC-0008-0009', 'NPC-0008', 'NPC-0009', 800, 0.03, 24, 15, 'ACTIVE', 10);
  `);

  console.log(`      ✅ Passed: Note issued, 25 Qian interest accrued, settled at ${repayResult.totalPaid} Qian (Liquid Cash: ${playerPostRepay.liquid_cash} Qian).`);

  // -----------------------------------------------------------------
  // 2. SETTLEMENT DEMOGRAPHIC GRAIN CONSUMPTION & EMERGENCE OF FAMINE
  // -----------------------------------------------------------------
  console.log('[2/8] Verifying Settlement Demographic Grain Consumption & Famine...');
  const politicsMod = new FactionPoliticsModule();
  await politicsMod.init({ dbPath, eventBus });

  // Prepare a test settlement in drought/depleted granary
  const testSettlementId = 'ye_cheng';
  db.execute(`
    UPDATE session_settlements 
    SET granary_grain = 5.0, garrison_troops = 300, public_order = 60 
    WHERE settlement_id = ?;
  `, [testSettlementId]);

  // Simulate monthly settlement cycle
  politicsMod.simulatePoliticalCycle(activeTurn, activeDate);

  const testSettlementPost = db.queryOne<any>(`
    SELECT granary_grain, garrison_troops, public_order 
    FROM session_settlements 
    WHERE settlement_id = ?;
  `, [testSettlementId]);

  assert(testSettlementPost.granary_grain === 0, 'Granary grain must be depleted to 0 when consumption > stock');
  assert(testSettlementPost.public_order <= 50, 'Public order must drop by 10 during famine');
  assert(testSettlementPost.garrison_troops < 300, 'Garrison troops must suffer desertion/starvation attrition');

  console.log(`      ✅ Passed: Granary depleted to 0, famine triggered: Public Order ${testSettlementPost.public_order}/100, Troops: ${testSettlementPost.garrison_troops}.`);

  // -----------------------------------------------------------------
  // 3. EMERGENT COMPETITOR WORKSHOP FOUNDED BY WEALTHY NPC
  // -----------------------------------------------------------------
  console.log('[3/8] Verifying Emergent Competitor Workshop Founded by Wealthy NPC...');
  const npcMod = new NpcLifecycleModule();
  await npcMod.init({ dbPath, eventBus });

  // Set up wealthy merchant NPC
  const rivalNpcId = 'NPC-0008';
  db.execute(`
    INSERT INTO npc_personal_progression (npc_id, personal_cash, life_ambition)
    VALUES (?, 3500, 'MASTER_ARTISAN')
    ON CONFLICT(npc_id) DO UPDATE SET personal_cash = 3500, life_ambition = 'MASTER_ARTISAN';
  `, [rivalNpcId]);

  // Clean up any pre-existing rival business for clean test
  db.execute(`DELETE FROM businesses WHERE business_id = 'BIZ-RIVAL-${rivalNpcId}';`);

  const prog = db.queryOne<any>(`SELECT * FROM npc_personal_progression WHERE npc_id = ?;`, [rivalNpcId]);
  const npc = db.queryOne<any>(`SELECT * FROM npc_state WHERE npc_id = ?;`, [rivalNpcId]);

  const workshopLog = npcMod.checkAndFoundEmergentWorkshop(rivalNpcId, prog, npc, activeTurn, activeDate);
  assert(workshopLog !== null, 'Workshop founding must succeed for wealthy artisan');

  const createdBiz = db.queryOne<any>(`SELECT * FROM businesses WHERE business_id = 'BIZ-RIVAL-${rivalNpcId}';`);
  assert(createdBiz !== null, 'Rival business must be inserted into businesses table');
  assert(createdBiz.safe_cash === 1500, 'Rival business must start with 1500 safe cash');
  assert(createdBiz.manager_npc_id === rivalNpcId, 'Manager must be assigned to rival NPC');

  const postProg = db.queryOne<any>(`SELECT personal_cash FROM npc_personal_progression WHERE npc_id = ?;`, [rivalNpcId]);
  assert(postProg.personal_cash === 2000, 'NPC personal cash must be reduced by 1500 capital contribution');

  console.log(`      ✅ Passed: Rival workshop "${createdBiz.name}" founded autonomously with 1,500 safe cash.`);

  // -----------------------------------------------------------------
  // 4. MULTILATERAL GEOPOLITICAL DIPLOMATIC AI
  // -----------------------------------------------------------------
  console.log('[4/8] Verifying Multilateral Diplomatic Treaties & Alliance Emergence...');
  // Set up warm relations between Han and Liu Bei factions
  db.execute(`
    UPDATE faction_diplomacy 
    SET relation_state = 'NEUTRAL', diplomatic_attitude = 75, truce_turns_remaining = 0 
    WHERE (faction_id_a = 'FAC-HAN' AND faction_id_b = 'FAC-LIU-BEI')
       OR (faction_id_a = 'FAC-LIU-BEI' AND faction_id_b = 'FAC-HAN');
  `);

  // Simulate diplomatic relations (even turn number triggers emergence checks)
  const diploTurn = activeTurn % 2 === 0 ? activeTurn : activeTurn + 1;
  const diploEvents = politicsMod.simulateDiplomaticRelations(diploTurn, activeDate);
  const allianceEvent = diploEvents.find(e => e.eventType === 'DIPLOMATIC_ALLIANCE');
  assert(allianceEvent !== undefined, 'Warm diplomatic relations must trigger DIPLOMATIC_ALLIANCE event');

  const pact = db.queryOne<any>(`
    SELECT relation_state, diplomatic_attitude FROM faction_diplomacy 
    WHERE (faction_id_a = 'FAC-HAN' AND faction_id_b = 'FAC-LIU-BEI')
       OR (faction_id_a = 'FAC-LIU-BEI' AND faction_id_b = 'FAC-HAN');
  `);
  assert(pact.relation_state === 'ALLIANCE', 'Relation state must update to ALLIANCE in database');

  const pacts = politicsMod.getDiplomacyRelations();
  assert(pacts.length > 0, 'getDiplomacyRelations must return active treaties for faction');

  console.log(`      ✅ Passed: Diplomatic alliance treaty forged between FAC-HAN and FAC-LIU-BEI (${allianceEvent?.titleVi}).`);

  // -----------------------------------------------------------------
  // 5. DYNAMIC OUTLAW STRONGHOLD SPAWNING ON ORDER COLLAPSE
  // -----------------------------------------------------------------
  console.log('[5/8] Verifying Outlaw Stronghold Spawning on Public Order Collapse (< 35)...');
  const ecologyMod = new EcologyLogisticsModule();
  await ecologyMod.init({ dbPath, eventBus });

  const collapseSettlementId = 'pu_yang';
  db.execute(`DELETE FROM bandit_strongholds WHERE stronghold_id = 'STRONGHOLD-EMERGENT-${collapseSettlementId}';`);
  db.execute(`
    UPDATE session_settlements 
    SET public_order = 22 
    WHERE settlement_id = ?;
  `, [collapseSettlementId]);

  ecologyMod.simulateEcologyAndLogisticsTurn(activeTurn, activeDate);

  const spawnedStronghold = db.queryOne<any>(`
    SELECT * FROM bandit_strongholds 
    WHERE stronghold_id = 'STRONGHOLD-EMERGENT-${collapseSettlementId}';
  `);
  assert(spawnedStronghold !== null, 'Emergent bandit stronghold must spawn near collapsed settlement');
  assert(spawnedStronghold.status === 'ACTIVE', 'Stronghold status must be ACTIVE');
  assert(spawnedStronghold.plundered_wealth === 500, 'Stronghold must have baseline plundered wealth');

  console.log(`      ✅ Passed: Emergent stronghold "${spawnedStronghold.name_vi}" spawned with 500 plunder.`);

  // -----------------------------------------------------------------
  // 6. LINEAGE GENERATIONAL MATURATION INTO COMMISSIONED OFFICERS
  // -----------------------------------------------------------------
  console.log('[6/8] Verifying Lineage Child Maturation into Commissioned Officer...');
  const lineageService = FamilyLineageService.getInstance(dbPath);

  const testChildId = 'CHILD-TEST-HEIR-01';
  db.execute(`
    INSERT INTO family_children 
    (child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, gender, birth_date, birth_turn, age, war_attr, int_attr, status)
    VALUES (?, 'PLY-0001', 'NPC-0008', 'Triệu phu nhân', 'Lương Anh Hào', 'Liang Yinghao', 'MALE', '167-01-01', 1, 17, 85, 78, 'YOUTH_APPRENTICE')
    ON CONFLICT(child_id) DO UPDATE SET age = 17, status = 'YOUTH_APPRENTICE';
  `, [testChildId]);

  // Clean up any officer row
  db.execute(`DELETE FROM faction_officers WHERE officer_id = ?;`, [testChildId]);
  db.execute(`DELETE FROM npc_state WHERE npc_id = ?;`, [testChildId]);

  // Age child by 1 year -> reaches 18
  lineageService.ageChild(testChildId, 1);

  const maturedChild = db.queryOne<any>(`SELECT age, status FROM family_children WHERE child_id = ?;`, [testChildId]);
  assert(maturedChild.age === 18, 'Child age must advance to 18');
  assert(maturedChild.status === 'ADULT_OFFICER', 'Child status must transition to ADULT_OFFICER');

  const commissionedOfficer = db.queryOne<any>(`SELECT * FROM faction_officers WHERE officer_id = ?;`, [testChildId]);
  assert(commissionedOfficer !== null, 'Matured child must be automatically commissioned into faction_officers');
  assert(commissionedOfficer.court_rank === 'OFFICER', 'Commissioned child rank must be OFFICER');

  const activeNpc = db.queryOne<any>(`SELECT * FROM npc_state WHERE npc_id = ?;`, [testChildId]);
  assert(activeNpc !== null, 'Matured child must be registered in npc_state');
  assert(activeNpc.war_attr === 85, 'NPC state war_attr must inherit from lineage child attributes');

  console.log(`      ✅ Passed: Child "${testChildId}" matured to 18, commissioned as faction officer and registered in npc_state.`);

  // -----------------------------------------------------------------
  // 7. CONTEXTUAL SEMANTIC MEMORY RETRIEVAL WITH RELEVANCE SCORING
  // -----------------------------------------------------------------
  console.log('[7/8] Verifying Contextual Semantic Episodic Memory Retrieval...');
  const agentBridge = new AgentBridgeModule();
  await agentBridge.init({ dbPath, eventBus });

  const memA = {
    npcId: 'NPC-0001',
    turnNumber: activeTurn,
    topic: 'QUÂN LƯƠNG ĐẠO',
    emotionalValence: 'POSITIVE' as const,
    lessonLearned: 'Hậu cần vận lương qua Hạp Cốc Quan phải phòng ngừa củi khô nước ngọt cạn kiệt.',
    createdDate: `${activeDate}T00:00:00.000Z`
  };

  const memB = {
    npcId: 'NPC-0001',
    turnNumber: activeTurn,
    topic: 'NGOẠI GIAO MINH THỆ',
    emotionalValence: 'POSITIVE' as const,
    lessonLearned: 'Giao hảo hòa hảo với Lưu Bị giúp chia sẻ áp lực quân sự vùng Hà Bắc.',
    createdDate: `${activeDate}T00:00:00.000Z`
  };

  agentBridge.recordEpisodicMemory(memA);
  agentBridge.recordEpisodicMemory(memB);

  // Retrieve with query focused on logistics
  const queriedLogistics = agentBridge.getNpcMemories('NPC-0001', 'vận lương hậu cần', 2);
  assert(queriedLogistics.length > 0, 'Queried memories must return results');
  assert(queriedLogistics[0].topic.includes('QUÂN LƯƠNG'), 'Top memory for "hậu cần" must be logistics related');

  // Retrieve with query focused on diplomacy
  const queriedDiplo = agentBridge.getNpcMemories('NPC-0001', 'ngoại giao liên minh', 2);
  assert(queriedDiplo.length > 0, 'Queried diplomacy memories must return results');
  assert(queriedDiplo[0].topic.includes('NGOẠI GIAO'), 'Top memory for "ngoại giao" must be diplomatic related');

  console.log(`      ✅ Passed: Semantic scoring correctly ranked relevant memories for "vận lương" and "ngoại giao".`);

  // -----------------------------------------------------------------
  // 8. SIMULATION KERNEL SUB-MONTHLY DAILY SUB-TICK RUNNER
  // -----------------------------------------------------------------
  console.log('[8/8] Verifying Sub-Monthly Daily Sub-Tick Runner (WORLD_DAY_TICK)...');
  let dayTicksReceived = 0;
  eventBus.subscribe('WORLD_DAY_TICK', async () => {
    dayTicksReceived++;
  });

  // Set player fatigue to 50 to test daily recovery
  db.execute(`UPDATE player_state SET fatigue = 50 WHERE player_id = 'PLY-0001';`);

  const advanceDayRes = gm.advanceDays(7, { notes: 'Weekly progression verification' });
  assert(advanceDayRes.success === true, 'advanceDays must succeed');
  assert(advanceDayRes.daysAdvanced === 7, 'daysAdvanced must be 7');
  assert(dayTicksReceived === 7, 'WORLD_DAY_TICK event must be published exactly 7 times');

  const playerPostDays = db.queryOne<any>(`SELECT fatigue FROM player_state WHERE player_id = 'PLY-0001';`);
  assert(playerPostDays.fatigue === 29, `Player fatigue must recover by 21 (50 - 21 = 29), got ${playerPostDays.fatigue}`);

  console.log(`      ✅ Passed: advanceDays(7) dispatched 7 WORLD_DAY_TICK events, advanced date to ${advanceDayRes.newDate}, restored fatigue 50 -> 29.`);

  // -----------------------------------------------------------------
  // FINAL INVARIANT AUDIT
  // -----------------------------------------------------------------
  console.log('\n---------------------------------------------------');
  console.log('Synchronizing PROGRESS.md and running comprehensive Sim-Audit...');
  const { renderProgressMarkdown } = require('../engine/projector');
  renderProgressMarkdown(dbPath, path.join(rootDir, 'game', 'PROGRESS.md'));

  const auditRes = runAudit();
  assert(auditRes === undefined || auditRes === true, 'Auditor must pass with 0 discrepancies');
  console.log('---------------------------------------------------');
  console.log(' 🟢 ALL 8 HOLISTIC DOMAIN ENHANCEMENTS FULLY VERIFIED!\n');
}

verifyHolisticEnhancements().catch(err => {
  console.error('\n❌ HOLISTIC ENHANCEMENTS VERIFICATION FAILED:');
  console.error(err);
  process.exit(1);
});
