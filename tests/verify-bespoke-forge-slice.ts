/**
 * ThreeKingdoms-AgentEngine: Bespoke Forge Vertical Slice Verification Suite
 * (tests/verify-bespoke-forge-slice.ts)
 */

import assert from 'assert';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { BespokeForgeService } from '../src/modules/professions/features/bespoke-forge/bespoke-forge.service';
import { BESPOKE_FORGE_RULES } from '../src/modules/professions/features/bespoke-forge/bespoke-forge.constants';
const { renderProgressMarkdown } = require('../engine/projector');

async function runBespokeForgeTests() {
  console.log('=== [TEST] Bespoke Forge Vertical Slice Verification ===');
  const db = DatabaseService.getInstance();
  const forgeSvc = BespokeForgeService.getInstance(db);

  // Snapshot original state for clean teardown
  const testCharId = 'PLY-0001';
  const prePlayer = db.queryOne<any>(`SELECT * FROM player_state WHERE player_id = ?;`, [testCharId]);
  assert(prePlayer, 'Protagonist PLY-0001 must exist in database');
  const preInventory = db.query<any>(`SELECT * FROM inventory_items;`);

  let forgedItemCode: string | null = null;

  try {
    // 1. Temporarily grant CRA 65 and fatigue 10 for deterministic test
    db.execute(`UPDATE player_state SET cra_attr = 65, fatigue = 10, cra_exp = 0 WHERE player_id = ?;`, [testCharId]);

    // 2. Test calculateRates
    console.log('[1/3] Testing Bespoke Quality Rates Calculation...');
    const rates = forgeSvc.calculateRates(testCharId);
    assert.strictEqual(rates.craAttr, 65, 'CRA attribute should match');
    assert.strictEqual(rates.canForge, true, 'Character with CRA 65 & Fatigue 10 should be eligible to forge');
    assert(rates.tiers.length === 4, 'Should return 4 quality tiers (LEGENDARY, MASTERWORK, FINE, NORMAL)');
    const totalProb = rates.tiers.reduce((acc, t) => acc + t.probabilityPercent, 0);
    assert(Math.abs(totalProb - 100) <= 1, `Total probability should sum to ~100%, got ${totalProb}`);
    console.log(`  -> Rates OK. Effective score: ${rates.effectiveMasteryScore}, Probabilities: ${rates.tiers.map(t => `${t.tier}: ${t.probabilityPercent}%`).join(', ')}`);

    // 3. Test forgeWeapon
    console.log('[2/3] Testing Bespoke Weapon Forging Execution...');
    const preEqpCount = db.queryOne<any>(`SELECT COUNT(*) as cnt FROM character_equipment WHERE character_id = ?;`, [testCharId]).cnt;
    const result = forgeSvc.forgeWeapon({
      characterId: testCharId,
      weaponType: 'HALBERD',
      customName: 'Thanh Phong Phá Quân Kích',
      targetDestination: 'EQUIP_IMMEDIATELY'
    });
    forgedItemCode = result.itemCode;

    assert.strictEqual(result.success, true, 'Forge execution should succeed');
    assert(result.itemCode.startsWith('EQP-WEAPON-HALBERD'), 'Item code should follow EQP-WEAPON prefix');
    assert.strictEqual(result.customName, 'Thanh Phong Phá Quân Kích', 'Custom name should be applied');
    assert(['NORMAL', 'FINE', 'MASTERWORK', 'LEGENDARY'].includes(result.quality), 'Quality must be a valid tier');
    assert(result.statModifiers.war >= BESPOKE_FORGE_RULES.STAT_MIN && result.statModifiers.war <= BESPOKE_FORGE_RULES.STAT_MAX,
      `WAR modifier must be clamped within [+1..+5], got ${result.statModifiers.war}`);
    
    // Verify Database State Mutation
    const postPlayer = db.queryOne<any>(`SELECT cra_attr, fatigue, cra_exp FROM player_state WHERE player_id = ?;`, [testCharId]);
    assert.strictEqual(postPlayer.fatigue, 10 + BESPOKE_FORGE_RULES.FATIGUE_COST, `Fatigue should increase by ${BESPOKE_FORGE_RULES.FATIGUE_COST}`);
    assert.strictEqual(postPlayer.cra_exp, BESPOKE_FORGE_RULES.EXP_GAIN, `CRA EXP should increase by ${BESPOKE_FORGE_RULES.EXP_GAIN}`);

    const postEqpCount = db.queryOne<any>(`SELECT COUNT(*) as cnt FROM character_equipment WHERE character_id = ?;`, [testCharId]).cnt;
    assert.strictEqual(postEqpCount, preEqpCount + 1, 'Equipment count should increase by 1');

    const eqpRecord = db.queryOne<any>(`SELECT * FROM character_equipment WHERE item_code = ?;`, [result.itemCode]);
    assert(eqpRecord, 'Newly forged weapon must exist in character_equipment');
    assert.strictEqual(eqpRecord.slot_type, 'WEAPON', 'Weapon slot_type should be WEAPON');
    assert.strictEqual(eqpRecord.custom_name, 'Thanh Phong Phá Quân Kích', 'Custom weapon name must match');

    // Verify Master Item Record
    const masterItem = db.queryOne<any>(`SELECT * FROM master_items WHERE item_code = ?;`, [result.itemCode]);
    assert(masterItem, 'Newly forged weapon must exist in master_items');

    // 4. Test Error Handling (Fatigue Limit)
    console.log('[3/3] Testing Fatigue Exhaustion Guard...');
    db.execute(`UPDATE player_state SET fatigue = 85 WHERE player_id = ?;`, [testCharId]);
    let failedAsExpected = false;
    try {
      forgeSvc.forgeWeapon({ characterId: testCharId, weaponType: 'SWORD' });
    } catch (err: any) {
      failedAsExpected = true;
      assert(err.message.includes('mệt mỏi'), `Error should mention fatigue exhaustion: ${err.message}`);
    }
    assert(failedAsExpected, 'Should throw error when fatigue exceeds limit');

    console.log('=== [SUCCESS] All Bespoke Forge Slice tests passed cleanly! ===\n');
  } finally {
    // Teardown: cleanly restore database state to protect all 186 invariants
    db.execute(`UPDATE player_state SET cra_attr = ?, fatigue = ?, cra_exp = ? WHERE player_id = ?;`,
      [prePlayer.cra_attr, prePlayer.fatigue, prePlayer.cra_exp, testCharId]);

    if (forgedItemCode) {
      db.execute(`DELETE FROM character_equipment WHERE item_code = ?;`, [forgedItemCode]);
      db.execute(`DELETE FROM master_items WHERE item_code = ?;`, [forgedItemCode]);
      db.execute(`DELETE FROM inventory_items WHERE item_code = ?;`, [forgedItemCode]);
      db.execute(`DELETE FROM chat_chronicle WHERE text LIKE ?;`, ['%Thanh Phong Phá Quân Kích%']);
    }

    // Restore inventory items
    for (const inv of preInventory) {
      db.execute(`UPDATE inventory_items SET quantity = ? WHERE item_code = ?;`, [inv.quantity, inv.item_code]);
    }

    renderProgressMarkdown(db.getDbPath(), path.join(process.cwd(), 'game', 'PROGRESS.md'));
  }
}

runBespokeForgeTests().catch(err => {
  console.error('[FAIL] Bespoke Forge test failed:', err);
  process.exit(1);
});
