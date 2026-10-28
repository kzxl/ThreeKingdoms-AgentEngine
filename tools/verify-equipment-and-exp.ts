/**
 * ThreeKingdoms-AgentEngine: Equipment & EXP Progression Verification Suite
 * (tools/verify-equipment-and-exp.ts)
 *
 * Verifies:
 * 1. EXP award and diminishing returns level-up past 90 and past 100 (soft cap 120).
 * 2. Equipment stat modifier cap STRICTLY clamped between +1 and +5 points per attribute.
 * 3. Equipment equip/unequip operations for Player and NPCs (slot replacement & unique constraint).
 * 4. Effective stats calculation (effective = base + gear bonus) and isOver100 flag.
 * 5. Pre-seeded NPC equipment validation (Guan Yu Green Dragon Blade, Zhang Fei Serpent Spear).
 *
 * Execution:
 *   npx tsx tools/verify-equipment-and-exp.ts
 */

import { DatabaseService } from '../src/core/database';
import {
  AttributeProgressionService,
  VALID_ATTRIBUTES
} from '../src/modules/progression/attribute-progression.service';
import {
  EquipmentSystemService,
  clampStatModifier,
  clampStatModifiers
} from '../src/modules/equipment/equipment-system.service';

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

async function runVerification(): Promise<void> {
  console.log('================================================================');
  console.log('   ROTK SIMULATION: EQUIPMENT & PROGRESSION VERIFICATION SUITE   ');
  console.log('================================================================\n');

  const db = DatabaseService.getInstance();
  const progressionService = AttributeProgressionService.getInstance();
  const equipmentService = EquipmentSystemService.getInstance();

  // --------------------------------------------------------------------------
  // SUITE 1: EXP Threshold & Diminishing Returns Progression Scaling
  // --------------------------------------------------------------------------
  console.log('>>> [SUITE 1] Testing EXP Thresholds & Diminishing Returns Scaling...');

  // 1.1 Threshold definitions
  assert(
    progressionService.getRequiredExp(50) === 100,
    'getRequiredExp(50) returns 100 for stat <= 90'
  );
  assert(
    progressionService.getRequiredExp(90) === 100,
    'getRequiredExp(90) returns 100 for stat <= 90'
  );
  assert(
    progressionService.getRequiredExp(91) === 150,
    'getRequiredExp(91) returns 150 for stat 91..99'
  );
  assert(
    progressionService.getRequiredExp(99) === 150,
    'getRequiredExp(99) returns 150 for stat 91..99'
  );
  assert(
    progressionService.getRequiredExp(100) === 250,
    'getRequiredExp(100) returns 250 for stat >= 100'
  );
  assert(
    progressionService.getRequiredExp(115) === 250,
    'getRequiredExp(115) returns 250 for stat >= 100'
  );

  // 1.2 Isolated Player EXP Award Tests (using PLY-0001, saving state for clean rollback)
  const origPlayer = db.queryOne<any>(
    'SELECT war_attr, war_exp FROM player_state WHERE player_id = ?',
    ['PLY-0001']
  );

  try {
    // Reset player war for deterministic tests
    progressionService.setAttribute('PLY-0001', 'war', 89, 0);

    // Partial exp without level-up
    const r1 = progressionService.awardAttributeExp('PLY-0001', 'war', 50);
    assert(
      !r1.leveledUp && r1.oldVal === 89 && r1.newVal === 89 && r1.currentExp === 50 && r1.maxExp === 100,
      'Partial EXP award grants exp without level up (89: 50/100 EXP)'
    );

    // Exactly reach threshold <= 90
    const r2 = progressionService.awardAttributeExp('PLY-0001', 'war', 50);
    assert(
      r2.leveledUp && r2.oldVal === 89 && r2.newVal === 90 && r2.currentExp === 0 && r2.maxExp === 100,
      'Completing threshold levels up 89 -> 90 and resets currentExp'
    );

    // Cross into Veteran tier (90 -> 91 requires 100 EXP, then next maxExp becomes 150)
    const r3 = progressionService.awardAttributeExp('PLY-0001', 'war', 100);
    assert(
      r3.leveledUp && r3.oldVal === 90 && r3.newVal === 91 && r3.currentExp === 0 && r3.maxExp === 150,
      'Progression past 90: levels up 90 -> 91 with next threshold scaling to 150 EXP'
    );

    // Partial exp in Veteran tier (91..99)
    const r4 = progressionService.awardAttributeExp('PLY-0001', 'war', 80);
    assert(
      !r4.leveledUp && r4.newVal === 91 && r4.currentExp === 80 && r4.maxExp === 150,
      'Veteran tier partial EXP: 80/150 EXP without level up'
    );

    // Level up in Veteran tier (91 -> 92 with leftover exp)
    const r5 = progressionService.awardAttributeExp('PLY-0001', 'war', 80);
    assert(
      r5.leveledUp && r5.oldVal === 91 && r5.newVal === 92 && r5.currentExp === 10 && r5.maxExp === 150,
      'Veteran tier level up: 91 -> 92 with 10 leftover EXP rollover'
    );

    // Cross into Heroic tier (99 -> 100 requires 150 EXP, next maxExp becomes 250)
    progressionService.setAttribute('PLY-0001', 'war', 99, 0);
    const r6 = progressionService.awardAttributeExp('PLY-0001', 'war', 150);
    assert(
      r6.leveledUp && r6.oldVal === 99 && r6.newVal === 100 && r6.currentExp === 0 && r6.maxExp === 250,
      'Crossing into 100: levels up 99 -> 100 with next threshold scaling to 250 EXP'
    );

    // Natural growth past 100 (Heroic tier: 100 -> 101 requires 250 EXP)
    const r7 = progressionService.awardAttributeExp('PLY-0001', 'war', 250);
    assert(
      r7.leveledUp && r7.oldVal === 100 && r7.newVal === 101 && r7.currentExp === 0 && r7.maxExp === 250,
      'Natural growth past 100: levels up 100 -> 101 requiring 250 EXP'
    );

    // Soft cap constraint at 120
    progressionService.setAttribute('PLY-0001', 'war', 119, 0);
    const r8 = progressionService.awardAttributeExp('PLY-0001', 'war', 1000);
    assert(
      r8.leveledUp && r8.oldVal === 119 && r8.newVal === 120,
      'Stat caps gracefully at 120 (soft cap constraint)'
    );

    // Case-insensitive & normalized attribute key support
    progressionService.setAttribute('PLY-0001', 'int', 60, 0);
    const r9 = progressionService.awardAttributeExp('PLY-0001', 'INT_ATTR', 100);
    assert(
      r9.leveledUp && r9.newVal === 61,
      'Normalizes attribute key: accepts "INT_ATTR" seamlessly'
    );
  } finally {
    // Restore original player state
    if (origPlayer) {
      progressionService.setAttribute(
        'PLY-0001',
        'war',
        origPlayer.war_attr,
        origPlayer.war_exp
      );
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Stat Modifier Clamping (+1 to +5 Constraint)
  // --------------------------------------------------------------------------
  console.log('\n>>> [SUITE 2] Testing Equipment Stat Modifier Clamping (+1 to +5)...');

  // 2.1 Direct clamp function checks
  assert(clampStatModifier(10) === 5, 'Clamps modifier +10 down to +5');
  assert(clampStatModifier(5) === 5, 'Preserves maximum allowable modifier +5');
  assert(clampStatModifier(3) === 3, 'Preserves standard mid-tier modifier +3');
  assert(clampStatModifier(1) === 1, 'Preserves minimum modifier +1');
  assert(clampStatModifier(0) === 1, 'Clamps 0 up to +1');
  assert(clampStatModifier(-5) === 1, 'Clamps negative modifier up to +1');

  // 2.2 Object-level clamp dictionary
  const rawBatch = {
    war: 12, // Should clamp to 5
    ldr: 7,  // Should clamp to 5
    pol: 3,  // Preserved as 3
    int: 1,  // Preserved as 1
    dip: -2  // Clamped to 1
  };
  const clampedBatch = clampStatModifiers(rawBatch);
  assert(
    clampedBatch.war === 5 &&
    clampedBatch.ldr === 5 &&
    clampedBatch.pol === 3 &&
    clampedBatch.int === 1 &&
    clampedBatch.dip === 1,
    'clampStatModifiers clamps all modifiers within [1, 5] bounds'
  );

  // 2.3 Equipping item with exaggerated modifiers enforces database storage clamping
  const testCharId = 'PLY-TEST-001';
  db.execute(`DELETE FROM character_equipment WHERE character_id = ?`, [testCharId]);

  try {
    const equipRes = equipmentService.equipItem(
      testCharId,
      'WEAPON',
      'COM-SWORD',
      'Test Overpowered Sword',
      { war: 25, ldr: 10 } // Exaggerated override modifiers
    );

    assert(
      equipRes.statModifiers.war === 5 && equipRes.statModifiers.ldr === 5,
      'equipItem strictly clamps stored modifiers to +5 max'
    );

    // Verify database record row directly
    const storedRow = db.queryOne<any>(
      `SELECT stat_modifiers FROM character_equipment WHERE character_id = ? AND slot_type = 'WEAPON'`,
      [testCharId]
    );
    const storedJson = JSON.parse(storedRow.stat_modifiers);
    assert(
      storedJson.war === 5 && storedJson.ldr === 5,
      'Database character_equipment.stat_modifiers reflects clamped JSON: {"war":5,"ldr":5}'
    );
  } finally {
    db.execute(`DELETE FROM character_equipment WHERE character_id = ?`, [testCharId]);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Equipment System - Equip & Unequip (Player & NPC)
  // --------------------------------------------------------------------------
  console.log('\n>>> [SUITE 3] Testing Equip/Unequip Operations & Slot Replacement...');

  const playerEqBackup = db.query<any>(
    'SELECT * FROM character_equipment WHERE character_id = ?',
    ['PLY-0001']
  );

  try {
    db.execute('DELETE FROM character_equipment WHERE character_id = ?', ['PLY-0001']);

    // 3.1 Equip Weapon
    const eq1 = equipmentService.equipItem('PLY-0001', 'WEAPON', 'COM-SWORD');
    assert(eq1.success && eq1.slotType === 'WEAPON', 'Equips WEAPON (COM-SWORD)');

    // 3.2 Equip Armor
    const eq2 = equipmentService.equipItem('PLY-0001', 'ARMOR', 'EQP-ARMOR-LEATHER');
    assert(eq2.success && eq2.slotType === 'ARMOR', 'Equips ARMOR (EQP-ARMOR-LEATHER)');

    // 3.3 Check aggregated equipment bonuses
    // COM-SWORD (+2 WAR) + EQP-ARMOR-LEATHER (+2 WAR, +1 LDR) -> total WAR +4, LDR +1
    const playerGear = equipmentService.getCharacterEquipment('PLY-0001');
    assert(playerGear.items.length === 2, 'Character has exactly 2 items equipped');
    assert(
      playerGear.totalBonuses.war === 4 && playerGear.totalBonuses.ldr === 1,
      'Total equipment bonuses correctly summed (WAR: +4, LDR: +1)'
    );

    // 3.4 Slot replacement (replaces COM-SWORD with COM-SPEAR in WEAPON slot)
    // COM-SPEAR has +1 WAR
    const eq3 = equipmentService.equipItem('PLY-0001', 'WEAPON', 'COM-SPEAR');
    assert(eq3.success && eq3.itemCode === 'COM-SPEAR', 'Replaces existing WEAPON with COM-SPEAR');

    const playerGearReplaced = equipmentService.getCharacterEquipment('PLY-0001');
    assert(
      playerGearReplaced.items.length === 2,
      'Unique constraint maintained: exactly 1 item in WEAPON slot'
    );
    assert(
      playerGearReplaced.totalBonuses.war === 3, // COM-SPEAR (+1) + EQP-ARMOR-LEATHER (+2) = +3 WAR
      'Total bonuses updated after weapon swap (WAR: +3)'
    );

    // 3.5 Unequip Armor
    const unequipArmor = equipmentService.unequipItem('PLY-0001', 'ARMOR');
    assert(unequipArmor.success && unequipArmor.unequipped, 'Unequips ARMOR slot');

    const gearAfterUnequip = equipmentService.getCharacterEquipment('PLY-0001');
    assert(gearAfterUnequip.items.length === 1, 'Only 1 item remains equipped after unequip');
    assert(
      gearAfterUnequip.slots.ARMOR === null,
      'ARMOR slot is null after unequip'
    );
    assert(
      gearAfterUnequip.totalBonuses.war === 1 && gearAfterUnequip.totalBonuses.ldr === 0,
      'Total bonuses updated accurately after unequip (WAR: +1, LDR: 0)'
    );

    // 3.6 Unequip empty slot returns unequipped: false gracefully
    const unequipEmpty = equipmentService.unequipItem('PLY-0001', 'ARMOR');
    assert(
      unequipEmpty.success && !unequipEmpty.unequipped,
      'Unequipping empty slot handles gracefully without throwing'
    );
  } finally {
    // Restore player equipment
    db.execute('DELETE FROM character_equipment WHERE character_id = ?', ['PLY-0001']);
    for (const row of playerEqBackup) {
      db.execute(
        `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.character_id, row.slot_type, row.item_code, row.custom_name, row.stat_modifiers, row.equipped_at]
      );
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Pre-seeded NPC Legendary Equipment & Effective Stats Calculation
  // --------------------------------------------------------------------------
  console.log('\n>>> [SUITE 4] Testing Effective Stats & Legendary NPC Equipment...');

  // 4.1 NPC-0003 Guan Yu (Yunchang)
  // Master base stats: WAR = 98, LDR = 94
  // Equipped: Green Dragon Blade (WPN-GREEN-DRAGON) -> +5 WAR, +2 LDR
  // Effective WAR = 98 + 5 = 103 (> 100 -> isOver100: true)
  // Effective LDR = 94 + 2 = 96 (<= 100 -> isOver100: false)
  const guanYuStats = equipmentService.getEffectiveStats('NPC-0003');
  assert(
    guanYuStats.characterType === 'NPC',
    'Guan Yu identified as NPC'
  );
  assert(
    guanYuStats.baseStats.war === 98 && guanYuStats.baseStats.ldr === 94,
    'Guan Yu base stats correct (WAR: 98, LDR: 94)'
  );
  assert(
    guanYuStats.gearBonuses.war === 5 && guanYuStats.gearBonuses.ldr === 2,
    'Guan Yu gear bonuses correct (+5 WAR, +2 LDR from Green Dragon Blade)'
  );
  assert(
    guanYuStats.effectiveStats.war === 103,
    'Guan Yu effective WAR: 98 + 5 = 103'
  );
  assert(
    guanYuStats.isOver100.war === true,
    'Guan Yu isOver100.war is TRUE (103 > 100)'
  );
  assert(
    guanYuStats.effectiveStats.ldr === 96,
    'Guan Yu effective LDR: 94 + 2 = 96'
  );
  assert(
    guanYuStats.isOver100.ldr === false,
    'Guan Yu isOver100.ldr is FALSE (96 <= 100)'
  );

  // 4.2 NPC-0002 Zhang Fei (Yide)
  // Master base stats: WAR = 98, LDR = 84
  // Equipped: Serpent Spear (WPN-SERPENT-SPEAR) -> +5 WAR, +1 LDR
  // Effective WAR = 98 + 5 = 103 (> 100 -> isOver100: true)
  // Effective LDR = 84 + 1 = 85 (<= 100 -> isOver100: false)
  const zhangFeiStats = equipmentService.getEffectiveStats('NPC-0002');
  assert(
    zhangFeiStats.characterType === 'NPC',
    'Zhang Fei identified as NPC'
  );
  assert(
    zhangFeiStats.baseStats.war === 98 && zhangFeiStats.baseStats.ldr === 84,
    'Zhang Fei base stats correct (WAR: 98, LDR: 84)'
  );
  assert(
    zhangFeiStats.gearBonuses.war === 5 && zhangFeiStats.gearBonuses.ldr === 1,
    'Zhang Fei gear bonuses correct (+5 WAR, +1 LDR from Serpent Spear)'
  );
  assert(
    zhangFeiStats.effectiveStats.war === 103,
    'Zhang Fei effective WAR: 98 + 5 = 103'
  );
  assert(
    zhangFeiStats.isOver100.war === true,
    'Zhang Fei isOver100.war is TRUE (103 > 100)'
  );
  assert(
    zhangFeiStats.effectiveStats.ldr === 85,
    'Zhang Fei effective LDR: 84 + 1 = 85'
  );
  assert(
    zhangFeiStats.isOver100.ldr === false,
    'Zhang Fei isOver100.ldr is FALSE (85 <= 100)'
  );

  // 4.3 End-to-End Dynamic Integration: EXP Growth + Equipment Synergy
  console.log('\n>>> [SUITE 5] Testing End-to-End Progression & Equipment Synergy...');
  const testNpcId = 'NPC-0010'; // He Da (base WAR 50, LDR 32)
  const origNpc = db.queryOne<any>('SELECT war_attr, war_exp FROM npc_state WHERE npc_id = ?', [testNpcId]);
  const origNpcEq = db.query<any>('SELECT * FROM character_equipment WHERE character_id = ?', [testNpcId]);

  try {
    // Equip iron spear (+1 WAR)
    equipmentService.equipItem(testNpcId, 'WEAPON', 'EQP-SPEAR-IRON');

    // Base WAR is 50. Gear bonus is +1. Initial effective WAR = 51.
    const initialStats = equipmentService.getEffectiveStats(testNpcId);
    assert(
      initialStats.baseStats.war === 50 && initialStats.effectiveStats.war === 51,
      'Initial effective WAR = 50 + 1 = 51'
    );

    // Train NPC with 100 EXP -> levels up base WAR 50 -> 51
    const expRes = progressionService.awardAttributeExp(testNpcId, 'war', 100);
    assert(expRes.leveledUp && expRes.newVal === 51, 'NPC base WAR levels up 50 -> 51');

    // Effective stats immediately reflect new base stat + gear bonus
    const updatedStats = equipmentService.getEffectiveStats(testNpcId);
    assert(
      updatedStats.baseStats.war === 51 && updatedStats.effectiveStats.war === 52,
      'Updated effective WAR = 51 + 1 = 52 immediately reflects progression synergy'
    );
  } finally {
    // Restore test NPC state
    if (origNpc) {
      progressionService.setAttribute(testNpcId, 'war', origNpc.war_attr, origNpc.war_exp);
    }
    db.execute('DELETE FROM character_equipment WHERE character_id = ?', [testNpcId]);
    for (const row of origNpcEq) {
      db.execute(
        `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.character_id, row.slot_type, row.item_code, row.custom_name, row.stat_modifiers, row.equipped_at]
      );
    }
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL VERIFICATION RUN: ${stats.passed + stats.failed} tests`);
  console.log(`PASSED: ${stats.passed}`);
  console.log(`FAILED: ${stats.failed}`);
  console.log('================================================================');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});
