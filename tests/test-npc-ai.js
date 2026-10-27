/**
 * ThreeKingdoms-AgentEngine: Autonomous NPC & Workshop Test Suite (tests/test-npc-ai.js)
 * Verifies zero-token utility AI, workforce payroll, material procurement,
 * skill ladder tier promotion, insolvency guards, and audit parity.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { WorkshopEngine } = require('../engine/workshop-engine');
const { auditSqliteCashflow, auditSqliteInventory, auditDoubleEntryJournal, auditNpcAndBusinesses } = require('../tools/sim-audit');

const TEST_DIR = path.resolve(__dirname);
const ROOT_DIR = path.resolve(__dirname, '..');
const LIVE_DB = path.join(ROOT_DIR, 'saves', 'session.db');
const SANDBOX_DIR = path.join(TEST_DIR, 'sandbox');
const SANDBOX_DB = path.join(SANDBOX_DIR, 'npc_test.db');

function setupSandbox() {
  if (!fs.existsSync(SANDBOX_DIR)) fs.mkdirSync(SANDBOX_DIR, { recursive: true });
  if (fs.existsSync(SANDBOX_DB)) fs.unlinkSync(SANDBOX_DB);
  fs.copyFileSync(LIVE_DB, SANDBOX_DB);
}

function cleanupSandbox() {
  if (fs.existsSync(SANDBOX_DB)) fs.unlinkSync(SANDBOX_DB);
  if (fs.existsSync(SANDBOX_DIR)) {
    try { fs.rmdirSync(SANDBOX_DIR); } catch (e) {}
  }
}

function runSqlJson(dbPath, sql) {
  const tmp = path.join(SANDBOX_DIR, `query_${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql, 'utf8');
  try {
    const stdout = execSync(`sqlite3 -json "${dbPath}" < "${tmp}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return stdout && stdout.trim() ? JSON.parse(stdout) : [];
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

function runTests() {
  console.log('====================================================');
  console.log(' 🧪 RUNNING AUTONOMOUS NPC & ENTERPRISE TEST SUITE (P4)');
  console.log('====================================================\n');

  setupSandbox();
  let passed = 0;
  let total = 6;

  try {
    // -------------------------------------------------------------
    // TEST 1: Autonomous Monthly Workshop Simulation
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing autonomous monthly workshop cycle...');
    const engine = new WorkshopEngine(SANDBOX_DB, null);
    const result = engine.simulateMonth('BIZ-0001', '184-05-30', 1840501);

    if (!result.success) {
      throw new Error(`Simulation failed: ${result.error}`);
    }

    if (result.producedOutputs.mats <= 0 || result.producedOutputs.baskets <= 0) {
      throw new Error(`Invalid output production: ${JSON.stringify(result.producedOutputs)}`);
    }

    if (result.financialSummary.localRevenue <= 0) {
      throw new Error(`Liquidation revenue must be positive, got ${result.financialSummary.localRevenue}`);
    }

    if (result.financialSummary.safeCashAfter < 0) {
      throw new Error(`Safe cash dipped negative: ${result.financialSummary.safeCashAfter}`);
    }

    console.log(`  ✅ PASSED: Produced ${result.producedOutputs.mats} mats, ${result.producedOutputs.baskets} baskets, ${result.producedOutputs.shields} shields.`);
    console.log(`             Generated ${result.financialSummary.localRevenue} Qian revenue. Safe cash: ${result.financialSummary.safeCashAfter} Qian.`);
    passed++;

    // -------------------------------------------------------------
    // TEST 2: Material Consumption & Stock Movement Parity
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing inventory movement conservation...');
    process.env.SIM_DB_PATH = SANDBOX_DB;
    const invAudit = auditSqliteInventory();
    if (!invAudit.passed) {
      throw new Error(`Inventory audit failed after workshop simulation: ${invAudit.errors.join('; ')}`);
    }
    console.log(`  ✅ PASSED: Inventory conserved across ${invAudit.itemCount} SKUs and ${invAudit.movementCount} stock movements.`);
    passed++;

    // -------------------------------------------------------------
    // TEST 3: Double-Entry Journal Parity & State Invariants
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing double-entry journal balance & cashflow...');
    const journalAudit = auditDoubleEntryJournal();
    if (!journalAudit.passed) {
      throw new Error(`Double-entry audit failed: ${journalAudit.errors.join('; ')}`);
    }

    const cashAudit = auditSqliteCashflow();
    if (!cashAudit.passed) {
      throw new Error(`Cashflow audit failed: ${cashAudit.errors.join('; ')}`);
    }

    const npcAudit = auditNpcAndBusinesses();
    if (!npcAudit.passed) {
      throw new Error(`NPC/Business audit failed: ${npcAudit.errors.join('; ')}`);
    }

    console.log(`  ✅ PASSED: Double-entry journal debits == credits across ${journalAudit.entriesCount} entries.`);
    console.log(`             Cashflow ledger balances exactly at ${cashAudit.finalBalance} Qian.`);
    passed++;

    // -------------------------------------------------------------
    // TEST 4: NPC Skill Progression & Leveling Promotion
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing NPC skill EXP accumulation & tier promotion...');
    // Setup NPC-0008 (Zhao An) close to leveling (38/40 EXP)
    execSync(`sqlite3 "${SANDBOX_DB}" "UPDATE npc_skills SET current_exp = 38 WHERE npc_id = 'NPC-0008' AND skill_code = 'SKL-CRA-WEAVE';"`);

    const cycle2 = engine.simulateMonth('BIZ-0001', '184-06-30', 1840601);
    if (!cycle2.success) {
      throw new Error(`Cycle 2 failed: ${cycle2.error}`);
    }

    const zhaoSkill = runSqlJson(SANDBOX_DB, `SELECT tier, current_exp, max_exp FROM npc_skills WHERE npc_id = 'NPC-0008' AND skill_code = 'SKL-CRA-WEAVE';`)[0];
    if (zhaoSkill.tier < 3) {
      throw new Error(`Expected Zhao An to level up to tier 3, got tier ${zhaoSkill.tier}`);
    }

    console.log(`  ✅ PASSED: Zhao An successfully promoted to Tier ${zhaoSkill.tier} (${zhaoSkill.current_exp}/${zhaoSkill.max_exp} EXP).`);
    passed++;

    // -------------------------------------------------------------
    // TEST 5: Insolvency Guard / Safe Cash Protection
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing insolvency guard when safe cash is severely depleted...');
    // Drain safe cash to 50 Qian and empty inventory to make revenue impossible
    execSync(`sqlite3 "${SANDBOX_DB}" "UPDATE businesses SET safe_cash = 50 WHERE business_id = 'BIZ-0001';"`);
    execSync(`sqlite3 "${SANDBOX_DB}" "UPDATE inventory_items SET quantity = 0 WHERE item_code LIKE 'COM-%'; "`);

    const insolventAttempt = engine.simulateMonth('BIZ-0001', '184-07-30', 1840701);
    if (insolventAttempt.success) {
      throw new Error('Simulation should have failed or rejected due to depleted safe cash & raw materials!');
    }
    if (insolventAttempt.code !== 'INSOLVENCY_BLOCKED') {
      throw new Error(`Expected INSOLVENCY_BLOCKED code, got: ${insolventAttempt.code}`);
    }

    console.log(`  ✅ PASSED: Engine blocked insolvent cycle cleanly (${insolventAttempt.error}).`);
    passed++;

    // -------------------------------------------------------------
    // TEST 6: Deterministic Replay Reproducibility
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing deterministic replay with identical seed...');
    const dbA = path.join(SANDBOX_DIR, 'db_a.db');
    const dbB = path.join(SANDBOX_DIR, 'db_b.db');
    fs.copyFileSync(LIVE_DB, dbA);
    fs.copyFileSync(LIVE_DB, dbB);

    const engineA = new WorkshopEngine(dbA, null);
    const engineB = new WorkshopEngine(dbB, null);

    const resA = engineA.simulateMonth('BIZ-0001', '184-05-30', 99999);
    const resB = engineB.simulateMonth('BIZ-0001', '184-05-30', 99999);

    if (JSON.stringify(resA.producedOutputs) !== JSON.stringify(resB.producedOutputs)) {
      throw new Error('Replay produced mismatch outputs between DB_A and DB_B');
    }
    if (JSON.stringify(resA.financialSummary) !== JSON.stringify(resB.financialSummary)) {
      throw new Error('Replay produced mismatch financials between DB_A and DB_B');
    }

    console.log('  ✅ PASSED: Independent replay across separate databases yielded identical outputs and financials.');
    passed++;

    if (fs.existsSync(dbA)) fs.unlinkSync(dbA);
    if (fs.existsSync(dbB)) fs.unlinkSync(dbB);

  } finally {
    delete process.env.SIM_DB_PATH;
    cleanupSandbox();
  }

  console.log('\n====================================================');
  console.log(` 🟢 ALL AUTONOMOUS NPC & ENTERPRISE TESTS PASSED (${passed}/${total})`);
  console.log('====================================================\n');
  return true;
}

if (require.main === module) {
  try {
    runTests();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ TEST SUITE FAILED: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  runTests
};
