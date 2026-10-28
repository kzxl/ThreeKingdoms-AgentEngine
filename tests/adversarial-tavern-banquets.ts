/**
 * ThreeKingdoms-AgentEngine: Adversarial Stress Test Harness for Tavern Banquets & Recruitment
 * (tests/adversarial-tavern-banquets.ts)
 *
 * Empirical verification of edge cases, stress scenarios, and conservation invariants:
 * 1. Capacity boundary testing: 0, 1, 2, 3, 4, 5, 8, 9, 20 guests across all 3 tiers.
 * 2. Inventory depletion and fallback cash procurement cashflow balance.
 * 3. Rapid sequential banquets (vital recovery clamping, stock movement parity, ledger balance).
 * 4. Brotherhood threshold gate (79 vs 80) and recruitment constraints (stranger vs acquaintance vs brother).
 * 5. Full restoration and 140/140 SQLite audit invariant verification.
 */

import { execSync } from 'child_process';
import { DatabaseService } from '../src/core/database';
import { DailyInteractionEngine } from '../src/modules/social-kizuna/daily-interaction.engine';
import {
  TavernBanquetService,
  BanquetTier,
  BANQUET_TIER_CONFIGS
} from '../src/modules/social-kizuna/tavern-banquet.service';

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, detail?: string): void {
  results.push({ name, passed: condition, detail });
  if (condition) {
    console.log(`  [PASS] ${name}`);
  } else {
    console.error(`  [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runAdversarialHarness(): Promise<void> {
  console.log('======================================================================');
  console.log('  CHALLENGER 2: ADVERSARIAL STRESS TEST - BANQUETS & RECRUITMENT      ');
  console.log('======================================================================\n');

  const db = DatabaseService.getInstance();
  const dailyEngine = DailyInteractionEngine.getInstance();
  const banquetService = TavernBanquetService.getInstance(db);

  // Take full backup snapshots for zero-drift teardown
  const backupPlayer = db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', ['PLY-0001']);
  const backupRelations = db.query<any>('SELECT * FROM master_relations_baseline;');
  const backupOfficers = db.query<any>('SELECT * FROM faction_officers;');
  const backupFog = db.query<any>('SELECT * FROM npc_intel_fog;');
  const backupInventory = db.query<any>('SELECT * FROM inventory_items;');

  // Pool of test NPCs
  const testNpcPool = [
    'NPC-0001', 'NPC-0002', 'NPC-0003', 'NPC-0011', 'NPC-0013',
    'NPC-0024', 'NPC-0025', 'NPC-0026', 'NPC-0027', 'NPC-0028',
    'NPC-0029', 'NPC-0030', 'NPC-0031', 'NPC-0032', 'NPC-0033',
    'NPC-0034', 'NPC-0035', 'NPC-0036', 'NPC-0037', 'NPC-0038'
  ];

  try {
    // =========================================================================
    // SECTION 1: BANQUET GUEST CAPACITY BOUNDARIES
    // =========================================================================
    console.log('>>> [SECTION 1] Banquet Guest Capacity Boundaries...');
    console.log('    Testing 0, 1, 2, 3, 4, 5, 8, 9, 20 guests across all 3 tiers\n');

    // Ensure warehouse has sufficient items so capacity checks are isolated from inventory checks
    db.transaction(() => {
      db.execute(`
        INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
        VALUES ('FOOD-COOK-DUKANG', 'Finished Good', 'Đỗ Khang Mỹ Tửu', 100, 60, 'Zhuo Tavern Cellar')
        ON CONFLICT(item_code) DO UPDATE SET quantity = 100;
      `);
      db.execute(`
        INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
        VALUES ('FOOD-COOK-BAO', 'Finished Good', 'Bánh Bao Thịt', 100, 15, 'Zhuo Tavern Kitchen')
        ON CONFLICT(item_code) DO UPDATE SET quantity = 100;
      `);
      db.execute(`
        INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
        VALUES ('FOOD-COOK-VENISON', 'Finished Good', 'Thịt Rừng Nướng', 100, 35, 'Zhuo Tavern Kitchen')
        ON CONFLICT(item_code) DO UPDATE SET quantity = 100;
      `);
    });

    const boundaryCounts = [0, 1, 2, 3, 4, 5, 8, 9, 20];
    const tiersToTest: BanquetTier[] = ['TIET_KIEM', 'HAO_HIEP', 'DAO_VIEN'];

    for (const tier of tiersToTest) {
      const config = BANQUET_TIER_CONFIGS[tier];
      const maxCap = config.capacity;
      console.log(`\n  --- Testing Tier [${tier}] (Capacity: ${maxCap}) ---`);

      for (const count of boundaryCounts) {
        const guestList = testNpcPool.slice(0, count);
        let errorCaught: string | null = null;
        let hostSuccess = false;

        try {
          const res = banquetService.hostBanquet({
            tier,
            guestNpcIds: guestList,
            playerId: 'PLY-0001'
          });
          hostSuccess = res.success;
        } catch (e: any) {
          errorCaught = e.message;
        }

        if (count === 0) {
          // Empirical observation of count = 0 behavior
          // When guestNpcIds is [], hostBanquet defaults to ['NPC-0002']
          assert(
            hostSuccess === true,
            `Tier ${tier} with 0 guests falls back to default Zhang Fei without crash`,
            `Result: success=${hostSuccess}`
          );
        } else if (count <= maxCap) {
          assert(
            hostSuccess === true && errorCaught === null,
            `Tier ${tier} with ${count} guests (<= ${maxCap}) SUCCEEDS`,
            `Error: ${errorCaught}`
          );
        } else {
          // Oversized party MUST reject cleanly
          assert(
            hostSuccess === false && errorCaught !== null && errorCaught.includes('vượt quá sức chứa'),
            `Tier ${tier} with ${count} guests (> ${maxCap}) STRICTLY REJECTED`,
            `Error observed: ${errorCaught}`
          );
        }
      }
    }

    // =========================================================================
    // SECTION 2: INVENTORY DEPLETION AND FALLBACK PROCUREMENT BALANCE
    // =========================================================================
    console.log('\n>>> [SECTION 2] Inventory Depletion & Fallback Procurement Cashflow Balance...');

    // 2.1 Complete warehouse depletion
    db.execute("UPDATE inventory_items SET quantity = 0 WHERE item_code IN ('FOOD-COOK-DUKANG', 'FOOD-COOK-BAO', 'FOOD-COOK-VENISON');");

    const cashBefore2_1 = db.queryOne<any>('SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?;', ['PLY-0001']);
    const initialLiquid = Number(cashBefore2_1.liquid_cash);
    const initialSafe = Number(cashBefore2_1.safe_cash);

    // Calculate dynamic BOM price for HAO_HIEP
    const baoPrice = Number(db.queryOne<any>("SELECT baseline_peace_price FROM master_items WHERE item_code = 'FOOD-COOK-BAO';").baseline_peace_price);
    const venisonPrice = Number(db.queryOne<any>("SELECT baseline_peace_price FROM master_items WHERE item_code = 'FOOD-COOK-VENISON';").baseline_peace_price);
    const dukangPrice = Number(db.queryOne<any>("SELECT baseline_peace_price FROM master_items WHERE item_code = 'FOOD-COOK-DUKANG';").baseline_peace_price);
    const expectedHaoHiepCost = (2 * baoPrice) + (2 * venisonPrice) + (2 * dukangPrice);

    console.log(`    Hosting HAO_HIEP with 0 inventory (Expected procurement: ${expectedHaoHiepCost} Qian)...`);
    const autoRes = banquetService.hostBanquet({
      tier: 'HAO_HIEP',
      guestNpcIds: ['NPC-0002', 'NPC-0003'],
      playerId: 'PLY-0001'
    });

    assert(autoRes.success === true, 'Banquet succeeded via fallback auto-procurement');
    assert(
      autoRes.cashSpent === expectedHaoHiepCost,
      `Cash spent matches dynamic BOM procurement exactly (${expectedHaoHiepCost} Qian)`
    );

    const cashAfter2_1 = db.queryOne<any>('SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?;', ['PLY-0001']);
    assert(
      Number(cashAfter2_1.liquid_cash) === initialLiquid - expectedHaoHiepCost,
      `Player liquid cash decremented by exactly ${expectedHaoHiepCost} Qian`
    );

    // Verify Cashflow Ledger entry
    const latestTxn = db.queryOne<any>("SELECT * FROM cashflow_ledger WHERE txn_id LIKE 'TXN-BNQ-BUY-%' ORDER BY rowid DESC LIMIT 1;");
    assert(latestTxn !== null, 'Procurement transaction recorded in cashflow_ledger');
    assert(Number(latestTxn.outflow) > 0, `Outflow recorded (${latestTxn.outflow})`);
    assert(
      Number(latestTxn.balance) === Number(cashAfter2_1.liquid_cash) + initialSafe,
      `Ledger balance (${latestTxn.balance}) matches total player cash (${Number(cashAfter2_1.liquid_cash) + initialSafe})`
    );

    // Verify Account Journal Dr == Cr parity
    const journalEntries = db.query<any>("SELECT * FROM account_journal WHERE txn_id LIKE 'TXN-BNQ-BUY-%';");
    assert(journalEntries.length >= 2, 'Account journal has double-entry rows');
    let totalDebit = 0;
    let totalCredit = 0;
    for (const j of journalEntries) {
      totalDebit += Number(j.debit || 0);
      totalCredit += Number(j.credit || 0);
    }
    assert(totalDebit === totalCredit, `Account journal maintains Dr == Cr exact parity (${totalDebit} == ${totalCredit})`);

    // Verify Stock Movements parity for this specific banquet
    const buyMovements = db.query<any>("SELECT * FROM stock_movements WHERE movement_type = 'PURCHASE' AND ref_txn LIKE 'TXN-BNQ-BUY-%';");
    const consumeMovements = db.query<any>("SELECT * FROM stock_movements WHERE movement_type = 'BANQUET_CONSUME' AND ref_txn = ?;", [autoRes.banquetId]);
    assert(buyMovements.length === 3, `Recorded exactly 3 PURCHASE movements for the 3 missing items (observed: ${buyMovements.length})`);
    assert(consumeMovements.length === 3, `Recorded exactly 3 BANQUET_CONSUME movements for banquet ${autoRes.banquetId}`);

    // Verify inventory returns to 0
    const invCheck = db.query<any>("SELECT item_code, quantity FROM inventory_items WHERE item_code IN ('FOOD-COOK-DUKANG', 'FOOD-COOK-BAO', 'FOOD-COOK-VENISON');");
    for (const item of invCheck) {
      assert(item.quantity === 0, `Item ${item.item_code} quantity is 0 after consumption`);
    }

    // 2.2 Adversarial Check: Depleted inventory + Insufficient Cash -> MUST FAIL cleanly without side-effects
    console.log('\n    Testing auto-procurement when player cash is insufficient...');
    db.execute("UPDATE player_state SET liquid_cash = 5 WHERE player_id = 'PLY-0001';");

    let insolventErrorCaught = false;
    try {
      banquetService.hostBanquet({
        tier: 'HAO_HIEP',
        guestNpcIds: ['NPC-0002'],
        playerId: 'PLY-0001'
      });
    } catch (e: any) {
      if (e.message.includes('ngân quỹ không đủ để tự động mua')) {
        insolventErrorCaught = true;
      }
    }

    assert(insolventErrorCaught, 'Insolvent banquet hosting strictly rejected with clear cash shortfall error');

    // Verify no ledger or journal leak occurred during rollback
    const postInsolventCash = db.queryOne<any>('SELECT liquid_cash FROM player_state WHERE player_id = ?;', ['PLY-0001']);
    assert(Number(postInsolventCash.liquid_cash) === 5, 'Player cash strictly preserved at 5 Qian after rollback');

    // Restore cash for subsequent tests
    db.execute(`UPDATE player_state SET liquid_cash = ${initialLiquid} WHERE player_id = 'PLY-0001';`);

    // =========================================================================
    // SECTION 3: RAPID SEQUENTIAL BANQUETS (STRESS & CONCURRENCY)
    // =========================================================================
    console.log('\n>>> [SECTION 3] Rapid Sequential Banquets Stress...');
    console.log('    Hosting 6 consecutive banquets across varying tiers...');

    // Set player fatigue high to test recovery
    db.execute("UPDATE player_state SET fatigue = 80, morale = 40 WHERE player_id = 'PLY-0001';");

    const sequentialTiers: BanquetTier[] = [
      'TIET_KIEM', 'HAO_HIEP', 'DAO_VIEN', 'TIET_KIEM', 'HAO_HIEP', 'DAO_VIEN'
    ];

    let seqCount = 0;
    for (const t of sequentialTiers) {
      seqCount++;
      const pBefore = db.queryOne<any>('SELECT fatigue, morale FROM player_state WHERE player_id = ?;', ['PLY-0001']);
      const res = banquetService.hostBanquet({
        tier: t,
        guestNpcIds: ['NPC-0024', 'NPC-0025'], // Zhao Yun & Zhuge Liang
        playerId: 'PLY-0001'
      });

      const pAfter = db.queryOne<any>('SELECT fatigue, morale FROM player_state WHERE player_id = ?;', ['PLY-0001']);
      assert(res.success === true, `Sequential banquet #${seqCount} [${t}] executed successfully`);
      assert(
        Number(pAfter.fatigue) <= Number(pBefore.fatigue),
        `Fatigue non-increasing (Before: ${pBefore.fatigue}, After: ${pAfter.fatigue})`
      );
      assert(
        Number(pAfter.morale) >= Number(pBefore.morale) && Number(pAfter.morale) <= 100,
        `Morale non-decreasing and capped at 100 (Before: ${pBefore.morale}, After: ${pAfter.morale})`
      );
    }

    // Check Zhao Yun sentiment after repeated feasts
    const zhaoSentiment = dailyEngine.getNpcSentiment('NPC-0024');
    assert(zhaoSentiment.affinity > 50, `Zhao Yun affinity accumulated heavily (${zhaoSentiment.affinity})`);
    assert(zhaoSentiment.respect > 30, `Zhao Yun respect accumulated heavily (${zhaoSentiment.respect})`);

    // =========================================================================
    // SECTION 4: BROTHERHOOD AFFINITY GATE (79 VS 80) & RECRUITMENT CONSTRAINTS
    // =========================================================================
    console.log('\n>>> [SECTION 4] Brotherhood Affinity Gate (79 vs 80) & Recruitment Constraints...');

    // Determine baseline sentiment for Pang Tong (NPC-0026)
    const basePangRow = db.queryOne<any>("SELECT baseline_sentiment FROM master_relations_baseline WHERE source_entity_id = 'NPC-0026';");
    const basePangSentiment = basePangRow ? Number(basePangRow.baseline_sentiment) : 25;

    // 4.1 Setup candidate NPC-0026 (Pang Tong) at exactly 79 affinity
    console.log('    Testing brotherhood oath at boundary 79 vs 80...');
    db.execute("DELETE FROM npc_relationship_deltas WHERE npc_id = 'NPC-0026';");
    const deltaFor79 = 79 - basePangSentiment;
    db.execute(`
      INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
      VALUES ('NPC-0026', '184-05-02', ?, 79, 'Tri Kỷ', 'Test calibration at 79 affinity');
    `, [deltaFor79]);

    const sentiment79 = dailyEngine.getNpcSentiment('NPC-0026');
    assert(sentiment79.affinity === 79, `Calibrated Pang Tong affinity to exactly 79 (observed: ${sentiment79.affinity})`);

    let oath79Caught = false;
    try {
      banquetService.swearBrotherhood('NPC-0026', 'PLY-0001');
    } catch (e: any) {
      if (e.message.includes('chưa đạt mức Đào Viên Kết Nghĩa (yêu cầu >= 80')) {
        oath79Caught = true;
      }
    }
    assert(oath79Caught, 'Swearing brotherhood at Affinity = 79 is STRICTLY REJECTED');

    // 4.2 Increment to exactly 80 affinity
    db.execute("DELETE FROM npc_relationship_deltas WHERE npc_id = 'NPC-0026';");
    const deltaFor80 = 80 - basePangSentiment;
    db.execute(`
      INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
      VALUES ('NPC-0026', '184-05-02', ?, 80, 'Tri Kỷ', 'Test calibration at 80 affinity');
    `, [deltaFor80]);
    const sentiment80 = dailyEngine.getNpcSentiment('NPC-0026');
    assert(sentiment80.affinity === 80, `Calibrated Pang Tong affinity to exactly 80 (observed: ${sentiment80.affinity})`);

    let oath80Success = false;
    let oath80Result: any = null;
    try {
      oath80Result = banquetService.swearBrotherhood('NPC-0026', 'PLY-0001');
      oath80Success = oath80Result.success;
    } catch (e: any) {
      console.error('Unexpected oath failure at 80:', e.message);
    }

    assert(oath80Success === true, 'Swearing brotherhood at Affinity = 80 SUCCEEDS');
    assert(oath80Result?.unlockedFogTier === 5, 'Sworn brotherhood unlocks Tier 5 Fog of Information');

    const baselinePang = db.queryOne<any>("SELECT * FROM master_relations_baseline WHERE source_entity_id = 'NPC-0026';");
    assert(baselinePang?.relationship_type_vi === 'Tử Sinh Huynh Đệ', 'Baseline updated to Tử Sinh Huynh Đệ');
    assert(baselinePang?.baseline_sentiment === 100, 'Baseline sentiment elevated to 100');

    const fogPang = db.queryOne<any>("SELECT * FROM npc_intel_fog WHERE npc_id = 'NPC-0026';");
    assert(fogPang?.intel_level === 5, 'npc_intel_fog elevated to intel_level = 5');
    assert(fogPang?.revealed_ambition === 1 && fogPang?.revealed_secrets === 1, 'Ambition and secrets revealed');

    // 4.3 Recruitment Constraints: Stranger vs Acquaintance vs Sworn Brother
    console.log('\n    Testing officer recruitment constraints...');

    // Stranger: NPC-0013 (Zuo Feng) with affinity = 0 (or baseline 25)
    db.execute("DELETE FROM npc_relationship_deltas WHERE npc_id = 'NPC-0013';");
    let strangerRecruitCaught = false;
    try {
      banquetService.recruitRetainer({
        heroNpcId: 'NPC-0013',
        assignedRole: 'COMMANDER'
      });
    } catch (e: any) {
      if (e.message.includes('chưa đủ để chiêu mộ')) {
        strangerRecruitCaught = true;
      }
    }
    assert(strangerRecruitCaught, 'Recruiting stranger (Zuo Feng, affinity < 70) is STRICTLY REJECTED');

    // Boundary: Calibrate NPC-0027 (Fa Zheng) at affinity = 69
    const baseFaRow = db.queryOne<any>("SELECT baseline_sentiment FROM master_relations_baseline WHERE source_entity_id = 'NPC-0027';");
    const baseFaSentiment = baseFaRow ? Number(baseFaRow.baseline_sentiment) : 25;

    db.execute("DELETE FROM npc_relationship_deltas WHERE npc_id = 'NPC-0027';");
    const deltaFor69 = 69 - baseFaSentiment;
    db.execute(`
      INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
      VALUES ('NPC-0027', '184-05-02', ?, 69, 'Sơ Giao', 'Calibration at 69 affinity');
    `, [deltaFor69]);
    const sentFa69 = dailyEngine.getNpcSentiment('NPC-0027');
    assert(sentFa69.affinity === 69, `Calibrated Fa Zheng affinity to exactly 69 (observed: ${sentFa69.affinity})`);

    let recruit69Caught = false;
    try {
      banquetService.recruitRetainer({
        heroNpcId: 'NPC-0027',
        assignedRole: 'OFFICER'
      });
    } catch (e: any) {
      if (e.message.includes('chưa đủ để chiêu mộ')) {
        recruit69Caught = true;
      }
    }
    assert(recruit69Caught, 'Recruiting candidate at boundary Affinity = 69 is STRICTLY REJECTED');

    // Boundary: Calibrate NPC-0027 at affinity = 70
    db.execute("DELETE FROM npc_relationship_deltas WHERE npc_id = 'NPC-0027';");
    const deltaFor70 = 70 - baseFaSentiment;
    db.execute(`
      INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
      VALUES ('NPC-0027', '184-05-02', ?, 70, 'Bằng Hữu', 'Calibration at 70 affinity');
    `, [deltaFor70]);
    const sentFa70 = dailyEngine.getNpcSentiment('NPC-0027');
    assert(sentFa70.affinity === 70, `Calibrated Fa Zheng affinity to exactly 70 (observed: ${sentFa70.affinity})`);

    const recruit70Res = banquetService.recruitRetainer({
      heroNpcId: 'NPC-0027',
      assignedRole: 'OFFICER'
    });
    assert(recruit70Res.success === true, 'Recruiting candidate at boundary Affinity = 70 SUCCEEDS');
    assert(recruit70Res.appointedRank === 'OFFICER', 'Assigned rank matches requested rank (OFFICER)');

    // Sworn Brother: Recruit Pang Tong (NPC-0026) as CHIEF_ADVISOR
    const brotherRecruitRes = banquetService.recruitRetainer({
      heroNpcId: 'NPC-0026',
      assignedRole: 'CHIEF_ADVISOR'
    });
    assert(brotherRecruitRes.success === true, 'Recruiting sworn brother (Pang Tong) SUCCEEDS');
    assert(brotherRecruitRes.appointedRank === 'CHIEF_ADVISOR', 'Assigned rank matches CHIEF_ADVISOR');
    assert(brotherRecruitRes.startingLoyalty >= 95, `Sworn brother loyalty is exceptionally high (${brotherRecruitRes.startingLoyalty})`);
    assert(brotherRecruitRes.betrayalRisk <= 0.02, `Sworn brother betrayal risk is minimal (${brotherRecruitRes.betrayalRisk})`);

    // Verify faction_officers table persistence
    const officerRow = db.queryOne<any>("SELECT * FROM faction_officers WHERE officer_id = 'NPC-0026';");
    assert(officerRow !== null, 'Officer persistent in faction_officers');
    assert(officerRow.faction_id === 'FAC-LIANG-CLAN', 'Officer assigned to FAC-LIANG-CLAN');

    // Role Re-assignment / Idempotency test: Re-appoint Pang Tong as GENERAL
    const reappointRes = banquetService.recruitRetainer({
      heroNpcId: 'NPC-0026',
      assignedRole: 'GENERAL'
    });
    assert(reappointRes.success === true, 'Re-appointing existing officer SUCCEEDS cleanly');
    const updatedOfficer = db.queryOne<any>("SELECT * FROM faction_officers WHERE officer_id = 'NPC-0026';");
    assert(updatedOfficer.court_rank === 'GENERAL', 'Court rank cleanly updated to GENERAL');

    // Invalid role fallback
    const fallbackRes = banquetService.recruitRetainer({
      heroNpcId: 'NPC-0026',
      assignedRole: 'GRAND_WARLORD_SUPREME'
    });
    assert(fallbackRes.appointedRank === 'OFFICER', 'Unknown court rank safely falls back to OFFICER');

  } finally {
    // =========================================================================
    // SECTION 5: COMPLETE RESTORATION & TEARDOWN
    // =========================================================================
    console.log('\n>>> [SECTION 5] Zero-Drift Database Teardown & Audit Invariant Check...');

    db.transaction(() => {
      // 1. Revert player_state
      db.execute(`
        UPDATE player_state
        SET liquid_cash = ?, safe_cash = ?, health = ?, fatigue = ?, morale = ?
        WHERE player_id = 'PLY-0001';
      `, [backupPlayer.liquid_cash, backupPlayer.safe_cash, backupPlayer.health, backupPlayer.fatigue, backupPlayer.morale]);

      // 2. Clear test movements created by banquet service and test harness
      db.execute("DELETE FROM stock_movements WHERE movement_type = 'BANQUET_CONSUME' OR ref_txn LIKE 'TXN-BNQ-%' OR mov_id LIKE 'MOV-BUY-%' OR mov_id LIKE 'MOV-BNQ-%';");

      // 3. Clear test inventory items & restore original inventory items
      db.execute("DELETE FROM inventory_items WHERE item_code IN ('FOOD-COOK-DUKANG', 'FOOD-COOK-BAO', 'FOOD-COOK-VENISON');");
      for (const inv of backupInventory) {
        if (!['FOOD-COOK-DUKANG', 'FOOD-COOK-BAO', 'FOOD-COOK-VENISON'].includes(inv.item_code)) {
          db.execute(`
            INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(item_code) DO UPDATE SET quantity = ?, unit_cost_basis = ?;
          `, [inv.item_code, inv.category, inv.description, inv.quantity, inv.unit_cost_basis, inv.location, inv.quantity, inv.unit_cost_basis]);
        }
      }

      // 4. Remove test cashflow & journal rows
      db.execute("DELETE FROM account_journal WHERE txn_id LIKE 'TXN-BNQ-%';");
      db.execute("DELETE FROM cashflow_ledger WHERE txn_id LIKE 'TXN-BNQ-%';");

      // 5. Remove test relationship deltas
      db.execute("DELETE FROM npc_relationship_deltas WHERE notes LIKE '%Test%' OR notes LIKE '%Calibration%' OR notes LIKE '%tiệc%' OR notes LIKE '%Đỗ Khang%' OR notes LIKE '%Đào Viên Kết Nghĩa%' OR notes LIKE '%Quy thuận%';");

      // 6. Restore master_relations_baseline
      db.execute('DELETE FROM master_relations_baseline;');
      for (const rel of backupRelations) {
        db.execute(`
          INSERT INTO master_relations_baseline (
            id, source_entity_id, target_entity_id, entity_type, relationship_type_vi,
            relationship_type_en, baseline_sentiment, notes_vi, notes_en
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          rel.id, rel.source_entity_id, rel.target_entity_id, rel.entity_type,
          rel.relationship_type_vi, rel.relationship_type_en, rel.baseline_sentiment,
          rel.notes_vi, rel.notes_en
        ]);
      }

      // 7. Restore faction_officers
      db.execute("DELETE FROM faction_officers WHERE officer_id IN ('NPC-0026', 'NPC-0027', 'NPC-0002');");
      for (const off of backupOfficers) {
        db.execute(`
          INSERT OR REPLACE INTO faction_officers (
            officer_id, faction_id, court_rank, loyalty, ambition,
            appointed_settlement_id, betrayal_risk, secret_faction_sympathy, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          off.officer_id, off.faction_id, off.court_rank, off.loyalty, off.ambition,
          off.appointed_settlement_id, off.betrayal_risk, off.secret_faction_sympathy, off.updated_at
        ]);
      }

      // 8. Restore npc_intel_fog
      db.execute("DELETE FROM npc_intel_fog WHERE npc_id IN ('NPC-0026', 'NPC-0027', 'NPC-0002', 'NPC-0024', 'NPC-0025');");
      for (const fog of backupFog) {
        db.execute(`
          INSERT OR REPLACE INTO npc_intel_fog (
            npc_id, intel_level, revealed_hobbies, revealed_dislikes, revealed_stats,
            revealed_ambition, revealed_secrets, interaction_count, last_topic,
            last_outcome, current_mood, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          fog.npc_id, fog.intel_level, fog.revealed_hobbies, fog.revealed_dislikes,
          fog.revealed_stats, fog.revealed_ambition, fog.revealed_secrets, fog.interaction_count,
          fog.last_topic, fog.last_outcome, fog.current_mood, fog.updated_at
        ]);
      }
    });

    // Re-sync progress and verify audit
    try {
      execSync('node tools/sim-db.js export-progress', { stdio: 'ignore' });
      const auditOut = execSync('node tools/sim-audit.js', { encoding: 'utf-8' });
      console.log('    ✓ Teardown successful. Running sim-audit.js verification...');
      if (auditOut.includes('140') && auditOut.includes('Discrepancies Detected   : 0')) {
        assert(true, 'Post-stress audit verified: 140/140 invariants preserved with 0 discrepancies');
      } else {
        assert(false, 'sim-audit output missing expected 140/140 invariants', auditOut);
      }
    } catch (e: any) {
      assert(false, 'sim-audit reported failure after teardown', e.message);
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n======================================================================');
  console.log(`TOTAL ADVERSARIAL STRESS TESTS: ${results.length}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialHarness().catch((err) => {
  console.error('Fatal error running adversarial test harness:', err);
  process.exit(1);
});
