/**
 * ThreeKingdoms-AgentEngine: Autonomous NPC & Workshop Engine (engine/workshop-engine.js)
 * Simulates enterprise production, workforce payroll, material procurement,
 * and NPC skill progression using deterministic utility scoring (ZERO LLM token cost).
 */

const fs = require('fs');
const path = require('path');
const { runSqlJson, runSqlBatch } = require('./db-adapter');
const { BILL_OF_MATERIALS, calculateDefectRate } = require('./rules');
const { SeededRandom } = require('./random');
const { renderProgressMarkdown } = require('./projector');

class WorkshopEngine {
  constructor(dbPath, progressPath = null) {
    this.dbPath = dbPath;
    this.progressPath = progressPath;
  }

  /**
   * Plans production mix dynamically based on labor hours, inventory levels, and safe cash budget.
   */
  planProductionMix(effectiveHours, safeCash, invMap, foreman) {
    // Target base quantities scaled by available hours
    // Base 680 hrs capacity -> 30 mats (60h), 20 baskets (80h), 15 shields (90h) = 230h
    let scale = Math.min(1.5, Math.max(0.5, effectiveHours / 680));

    // If safe cash is tight (< 2000), prioritize low-material products (mats & baskets)
    let matRatio = 1.0;
    let basketRatio = 1.0;
    let shieldRatio = 1.0;

    if (safeCash < 1500) {
      shieldRatio = 0.2; // Severely throttle expensive leather shields
      matRatio = 1.3;
      basketRatio = 1.2;
    } else if (safeCash < 2500) {
      shieldRatio = 0.6;
    }

    // Trait modifiers
    let talents = [];
    try {
      talents = JSON.parse(foreman.talents || '[]');
    } catch (e) {
      talents = [];
    }

    if (talents.includes('Master Artisan') || talents.includes('Meticulous')) {
      shieldRatio *= 1.2; // Prefers high-end craftsmanship
    }
    if (talents.includes('Frugal')) {
      matRatio *= 1.2;
    }

    const planned = {
      'PROD-MAT': Math.max(10, Math.round(30 * scale * matRatio)),
      'PROD-BASK': Math.max(10, Math.round(20 * scale * basketRatio)),
      'PROD-SHIELD-BAM': Math.max(0, Math.round(15 * scale * shieldRatio))
    };

    return planned;
  }

  /**
   * Evaluates if any strategic dilemma or emergency should escalate to player/LLM.
   */
  checkDilemma(business, endingSafeCash, workforce, rng) {
    if (endingSafeCash < 500) {
      return {
        escalated: true,
        type: 'CRITICAL_LIQUIDITY_WARNING',
        severity: 'HIGH',
        title: 'Liang Clan Workshop Near Insolvency',
        description: `Workshop safe cash has fallen to ${endingSafeCash} quan, endangering next month's payroll. Liang Yan must inject funds or scale down operations.`
      };
    }

    const lowMoraleWorker = workforce.find(w => w.morale < 55);
    if (lowMoraleWorker) {
      return {
        escalated: true,
        type: 'LABOR_DISCONTENT',
        severity: 'MEDIUM',
        title: `Workforce Discontent: ${lowMoraleWorker.name}`,
        description: `${lowMoraleWorker.name} (${lowMoraleWorker.assigned_role}) has morale ${lowMoraleWorker.morale}. Risk of resignation or craft quality deterioration.`
      };
    }

    // Deterministic random dilemma check (10% chance)
    const roll = rng.nextFloat();
    if (roll < 0.10) {
      return {
        escalated: true,
        type: 'SPECIAL_OPPORTUNITY',
        severity: 'LOW',
        title: 'Guangzong Garrison Military Contract Offer',
        description: 'An imperial supply officer requests an emergency order of 25 Leather-Bound Bamboo Shields at 160 quan each. Requires proprietor approval.'
      };
    }

    return {
      escalated: false,
      type: 'NONE',
      description: 'Routine autonomous operations running normally.'
    };
  }

  /**
   * Simulates one full monthly cycle of the autonomous enterprise.
   */
  simulateMonth(businessId = 'BIZ-0001', gameDate = '184-05-30', seed = 1840501) {
    const rng = new SeededRandom(seed);

    // 1. Fetch business entity
    const bizRows = runSqlJson(this.dbPath, `SELECT * FROM businesses WHERE business_id = '${businessId}' LIMIT 1;`);
    if (!bizRows || bizRows.length === 0) {
      return { success: false, code: 'BIZ_NOT_FOUND', error: `Business ${businessId} not found.` };
    }
    const biz = bizRows[0];

    // Idempotency: the autonomous workshop cycle runs once per business-month.
    // The same key is used by GameplayManager.advanceTurn's passive accrual, so
    // whichever settlement runs first in a month wins and the other is skipped.
    const monthKey = `BIZ_CYCLE_${businessId}_${String(gameDate).slice(0, 7).replace('-', '')}`;
    const priorRun = runSqlJson(
      this.dbPath,
      `SELECT result, game_date FROM action_log WHERE idempotency_key = ? LIMIT 1;`,
      [monthKey]
    )[0];
    if (priorRun) {
      let priorResult = null;
      try { priorResult = JSON.parse(priorRun.result); } catch (e) {}
      return {
        success: true,
        idempotent: true,
        businessId,
        gameDate: priorRun.game_date,
        message: `Workshop cycle already simulated for ${businessId} in ${monthKey.slice(-6)}; no double payout.`,
        previousResult: priorResult
      };
    }

    // 2. Fetch manager and full assigned workforce
    const workforce = runSqlJson(this.dbPath, `SELECT * FROM npc_state WHERE assigned_business_id = '${businessId}';`);
    const managerId = biz.manager_npc_id || 'NPC-0007';
    let foreman = workforce.find(w => w.npc_id === managerId);
    if (!foreman) {
      const mgrRows = runSqlJson(this.dbPath, `SELECT * FROM npc_state WHERE npc_id = '${managerId}' LIMIT 1;`);
      foreman = mgrRows[0] || { name: 'Chen Bao', cra_attr: 71, fatigue: 10, morale: 85, monthly_wage: 1050, talents: '["Meticulous"]' };
    }

    // Fetch foreman skills
    const foremanSkills = runSqlJson(this.dbPath, `SELECT * FROM npc_skills WHERE npc_id = '${managerId}';`);
    const mgtSkill = foremanSkills.find(s => s.skill_code === 'SKL-MGT-WORK') || { tier: 2, current_exp: 32, max_exp: 60 };
    const weaveSkill = foremanSkills.find(s => s.skill_code === 'SKL-CRA-WEAVE') || { tier: 4, current_exp: 64, max_exp: 80 };
    const leathSkill = foremanSkills.find(s => s.skill_code === 'SKL-CRA-LEATH') || { tier: 2, current_exp: 32, max_exp: 40 };

    // 3. Calculate effective labor capacity hours
    const baseCapacity = Number(biz.monthly_capacity_hours || 800);
    // Management skill increases efficiency (+2% per tier above 1)
    const skillEfficiencyBonus = (mgtSkill.tier - 1) * 0.02;
    const efficiency = Number(biz.efficiency_multiplier || 0.85) + skillEfficiencyBonus;
    const fatiguePenalty = Number(foreman.fatigue || 0) * 0.002;
    const effectiveHours = Math.floor(baseCapacity * efficiency * (1 - fatiguePenalty));

    // 4. Calculate total payroll obligations & overhead
    let totalPayroll = 0;
    if (workforce.length > 0) {
      for (const worker of workforce) {
        totalPayroll += Number(worker.monthly_wage || 0);
      }
    } else {
      totalPayroll = Number(foreman.monthly_wage || 1050) + 750 + 450 + 450; // default 2,700
    }
    const monthlyRent = Number(biz.monthly_rent || 200);
    const totalOverhead = totalPayroll + monthlyRent;

    let currentSafeCash = Number(biz.safe_cash || 3000);

    // 5. Query inventory stock
    const invMap = {};
    const invRows = runSqlJson(this.dbPath, `SELECT item_code, quantity, unit_cost_basis FROM inventory_items;`);
    for (const r of invRows) {
      invMap[r.item_code] = { qty: Number(r.quantity), cost: Number(r.unit_cost_basis) };
    }

    // 6. Dynamic Utility-Scored Production Plan
    const plan = this.planProductionMix(effectiveHours, currentSafeCash, invMap, foreman);
    const targetMats = plan['PROD-MAT'];
    const targetBaskets = plan['PROD-BASK'];
    const targetShields = plan['PROD-SHIELD-BAM'];

    // 7. Calculate Material Requirements per BOM
    const neededBamboo = (targetMats * 0.25) + (targetBaskets * 0.50) + (targetShields * 0.80);
    const neededTwine = (targetMats * 0.10) + (targetBaskets * 0.25) + (targetShields * 0.20);
    const neededLeather = targetShields * 0.50;

    const required = {
      'COM-BAMBOO': neededBamboo,
      'COM-TWINE': neededTwine,
      'COM-LEATH': neededLeather
    };

    // Auto-procure shortfalls if safe cash allows
    let procCost = 0;
    const procures = {};

    if (biz.auto_procure) {
      for (const [code, reqQty] of Object.entries(required)) {
        const available = invMap[code] ? invMap[code].qty : 0;
        if (available < reqQty) {
          const needed = reqQty - available;
          const unitPrice = code === 'COM-BAMBOO' ? 15 : (code === 'COM-TWINE' ? 20 : 100);
          const cost = Math.ceil(needed * unitPrice);
          if (currentSafeCash - procCost - cost >= totalOverhead * 0.7) {
            procCost += cost;
            procures[code] = { qty: needed, unitPrice, cost };
          }
        }
      }
    }

    // 8. Calculate outputs with defect rates
    // Talents & skill tier reduce defect rate
    let talentDefectBonus = 0;
    try {
      const tList = JSON.parse(foreman.talents || '[]');
      if (tList.includes('Meticulous')) talentDefectBonus += 0.01;
      if (tList.includes('Master Artisan')) talentDefectBonus += 0.015;
    } catch (e) {}

    const defectMat = Math.max(0.01, calculateDefectRate(0.05, foreman.cra_attr, foreman.fatigue) - talentDefectBonus - (weaveSkill.tier * 0.005));
    const defectBask = Math.max(0.01, calculateDefectRate(0.08, foreman.cra_attr, foreman.fatigue) - talentDefectBonus - (weaveSkill.tier * 0.005));
    const defectShield = Math.max(0.02, calculateDefectRate(0.10, foreman.cra_attr, foreman.fatigue) - talentDefectBonus - (leathSkill.tier * 0.008));

    const producedMats = Math.floor(targetMats * (1 - defectMat));
    const producedBaskets = Math.floor(targetBaskets * (1 - defectBask));
    const producedShields = Math.floor(targetShields * (1 - defectShield));

    // 9. Wholesale Sales (Liquidate portion to replenish safe cash)
    // Sell ~80% of mats, ~75% of baskets, ~65% of shields
    const sellMats = Math.min(producedMats, Math.floor(producedMats * 0.8));
    const sellBaskets = Math.min(producedBaskets, Math.floor(producedBaskets * 0.75));
    const sellShields = Math.min(producedShields, Math.floor(producedShields * 0.65));

    const localRevenue = (sellMats * 25) + (sellBaskets * 50) + (sellShields * 140);

    // Net additions to finished goods warehouse
    const netMats = producedMats - sellMats;
    const netBaskets = producedBaskets - sellBaskets;
    const netShields = producedShields - sellShields;

    // Financial settlements
    const totalDisbursements = totalOverhead + procCost;
    const netSafeCashChange = localRevenue - totalDisbursements;
    const newSafeCash = Math.max(0, currentSafeCash + netSafeCashChange);

    // Verify safe cash does not go negative
    if (currentSafeCash + localRevenue < totalDisbursements) {
      // Insufficient liquidity to fund full payroll and procurement
      return {
        success: false,
        code: 'INSOLVENCY_BLOCKED',
        error: `Workshop safe cash insufficient: current (${currentSafeCash}) + sales (${localRevenue}) < overhead (${totalDisbursements}).`
      };
    }

    const dateStamp = gameDate.replace(/-/g, '');
    const actionId = `ACT-WS-${dateStamp}`;

    // Informational snapshot of the player ledger (business cash is separate).
    const lastTxn = runSqlJson(this.dbPath, `SELECT balance FROM cashflow_ledger ORDER BY game_date DESC, txn_id DESC LIMIT 1;`)[0];
    const prevGlobalCash = lastTxn ? Number(lastTxn.balance) : 24200;
    const playerLiquid = runSqlJson(this.dbPath, `SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = 'PLY-0001';`)[0] || {};
    const newGlobalCash = Number(playerLiquid.liquid_cash || 0) + Number(playerLiquid.safe_cash || 0);

    // 10. NPC Experience & Promotions
    const promotions = [];
    const skillUpdates = [];

    // Helper to award EXP and handle tier promotions
    const processExp = (npcId, skillCode, skillName, currentTier, curExp, maxExp, expGain) => {
      let nTier = currentTier;
      let nExp = curExp + expGain;
      let nMax = maxExp;
      let promoted = false;

      while (nExp >= nMax && nTier < 5) {
        nExp -= nMax;
        nTier += 1;
        nMax = Math.round(nMax * 1.5);
        promoted = true;
      }

      if (promoted) {
        promotions.push({ npcId, skillCode, newTier: nTier });
      }

      skillUpdates.push({
        npcId,
        skillCode,
        skillName,
        tier: nTier,
        current_exp: nExp,
        max_exp: nMax
      });
    };

    processExp(managerId, 'SKL-MGT-WORK', 'Workshop Operations Management', mgtSkill.tier, mgtSkill.current_exp, mgtSkill.max_exp, 15);
    processExp(managerId, 'SKL-CRA-WEAVE', 'Bamboo & Textile Weaving', weaveSkill.tier, weaveSkill.current_exp, weaveSkill.max_exp, 10);
    processExp(managerId, 'SKL-CRA-LEATH', 'Leather Armor Processing', leathSkill.tier, leathSkill.current_exp, leathSkill.max_exp, 10);

    // Artisans gain craft exp
    const juniorArtisans = workforce.filter(w => w.npc_id !== managerId);
    for (const artisan of juniorArtisans) {
      const artSkills = runSqlJson(this.dbPath, `SELECT * FROM npc_skills WHERE npc_id = '${artisan.npc_id}';`);
      if (artSkills.length > 0) {
        const s = artSkills[0];
        processExp(artisan.npc_id, s.skill_code, s.skill_name, s.tier, s.current_exp, s.max_exp, 15);
      }
    }

    // 11. Build Atomic SQL Batch
    let sql = `
      -- 1. Update business safe cash. The player's personal safe_cash is a
      --    separate vault (deposit/withdraw only) and must never be rewritten
      --    by an autonomous business cycle.
      UPDATE businesses SET safe_cash = ${newSafeCash} WHERE business_id = '${businessId}';

      -- 2. Update NPC active state (morale, fatigue, EXP)
      UPDATE npc_state SET
        management_exp = management_exp + 15,
        craft_exp = craft_exp + 10,
        morale = MIN(100, morale + 2),
        fatigue = MAX(0, fatigue - 2)
      WHERE npc_id = '${managerId}';

      UPDATE npc_state SET
        craft_exp = craft_exp + 15,
        morale = MIN(100, morale + 1),
        fatigue = MAX(0, fatigue - 1)
      WHERE assigned_business_id = '${businessId}' AND npc_id != '${managerId}';

      -- 3. Business books are NOT the player's cashflow ledger.
      --    The workshop moves the business's own safe cash; the player ledger
      --    tracks player liquid + personal vault only. Recording business
      --    revenue/expense here would shift the ledger running balance without
      --    moving player cash and break the audit identity. Business P&L is
      --    stored on businesses.safe_cash and the action_log result above.
    `;

    // 5. Update NPC skills
    for (const su of skillUpdates) {
      sql += `
        INSERT OR REPLACE INTO npc_skills (npc_id, skill_code, skill_name, tier, current_exp, max_exp)
        VALUES ('${su.npcId}', '${su.skillCode}', '${su.skillName}', ${su.tier}, ${su.current_exp}, ${su.max_exp});
      `;
    }

    // 6. Update Raw Materials (Deduct consumed + add procured)
    for (const [code, consQty] of Object.entries(required)) {
      const procQty = procures[code] ? procures[code].qty : 0;
      const netMatChange = procQty - consQty;
      const curQty = invMap[code] ? invMap[code].qty : 0;
      const newMatQty = Math.max(0, curQty + netMatChange);

      sql += `
        UPDATE inventory_items SET quantity = ${newMatQty} WHERE item_code = '${code}';
        INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
        VALUES ('MOV-${dateStamp}-${code}', '${gameDate}', '${code}', 'Autonomous Production & Restock', ${netMatChange}, ${code === 'COM-LEATH' ? 100 : (code === 'COM-TWINE' ? 20 : 15)}, ${newMatQty}, '${actionId}');
      `;
    }

    // 7. Update Finished Goods (Add produced - sold)
    const curMatQty = (invMap['PROD-MAT'] ? invMap['PROD-MAT'].qty : 0) + netMats;
    const curBaskQty = (invMap['PROD-BASK'] ? invMap['PROD-BASK'].qty : 0) + netBaskets;
    const curShdQty = (invMap['PROD-SHIELD-BAM'] ? invMap['PROD-SHIELD-BAM'].qty : 0) + netShields;

    sql += `
      UPDATE inventory_items SET quantity = quantity + ${netMats} WHERE item_code = 'PROD-MAT';
      UPDATE inventory_items SET quantity = quantity + ${netBaskets} WHERE item_code = 'PROD-BASK';
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES ('PROD-SHIELD-BAM', 'Finished Good', 'Leather-Bound Bamboo Shield', ${netShields}, 140, 'Zhuo Workshop')
      ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + ${netShields};

      INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
      VALUES
        ('MOV-${dateStamp}-PROD-MAT', '${gameDate}', 'PROD-MAT', 'Autonomous Net Output', ${netMats}, 25, ${curMatQty}, '${actionId}'),
        ('MOV-${dateStamp}-PROD-BASK', '${gameDate}', 'PROD-BASK', 'Autonomous Net Output', ${netBaskets}, 50, ${curBaskQty}, '${actionId}'),
        ('MOV-${dateStamp}-PROD-SHIELD-BAM', '${gameDate}', 'PROD-SHIELD-BAM', 'Autonomous Net Output', ${netShields}, 140, ${curShdQty}, '${actionId}');

      -- 8. Record Idempotent Action Log
      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES (
        '${actionId}',
        '${monthKey}',
        (SELECT active_turn FROM campaign_meta LIMIT 1),
        '${gameDate}',
        'WORKSHOP_CYCLE',
        '{"business_id": "${businessId}", "seed": ${seed}}',
        '{"mats": ${producedMats}, "baskets": ${producedBaskets}, "shields": ${producedShields}, "revenue": ${localRevenue}, "overhead": ${totalOverhead}, "procurement": ${procCost}}',
        'SUCCESS'
      );
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'WORKSHOP_BATCH_FAILED', error: batchRes.error };
    }

    if (this.progressPath) {
      renderProgressMarkdown(this.dbPath, this.progressPath);
    }

    // 12. Evaluate Strategic Dilemma Escalation
    const dilemma = this.checkDilemma(biz, newSafeCash, workforce, rng);

    return {
      success: true,
      businessId,
      gameDate,
      foreman: foreman.name,
      effectiveHours,
      plannedTargets: {
        mats: targetMats,
        baskets: targetBaskets,
        shields: targetShields
      },
      producedOutputs: {
        mats: producedMats,
        baskets: producedBaskets,
        shields: producedShields
      },
      wholesaleLiquidated: {
        mats: sellMats,
        baskets: sellBaskets,
        shields: sellShields,
        revenue: localRevenue
      },
      netWarehouseAdditions: {
        mats: netMats,
        baskets: netBaskets,
        shields: netShields
      },
      financialSummary: {
        localRevenue,
        totalPayroll,
        monthlyRent,
        procurementCost: procCost,
        totalDisbursements,
        netSafeCashChange,
        safeCashBefore: currentSafeCash,
        safeCashAfter: newSafeCash,
        globalCashBefore: prevGlobalCash,
        globalCashAfter: newGlobalCash
      },
      promotions,
      dilemma
    };
  }
}

module.exports = {
  WorkshopEngine
};
