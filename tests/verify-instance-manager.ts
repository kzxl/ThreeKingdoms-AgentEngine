/**
 * ThreeKingdoms-AgentEngine: Multi-Instance Playthrough Verification Suite
 * (tests/verify-instance-manager.ts)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { InstanceManagerService } from '../src/modules/instances/instances.service';

async function runInstanceTests() {
  console.log('======================================================================');
  console.log('   MULTI-INSTANCE ENGINE: VERIFICATION SUITE                          ');
  console.log('======================================================================\n');

  const instSvc = InstanceManagerService.getInstance();

  // 1. Test listInstances
  console.log('>>> [TEST 1] Listing Existing Instances...');
  const initialList = instSvc.listInstances('default');
  assert(Array.isArray(initialList), 'listInstances should return an array');
  assert(initialList.length >= 1, 'Should find at least default instance');
  const defaultInst = initialList.find(i => i.id === 'default');
  assert(defaultInst, 'Default instance must exist in list');
  assert.strictEqual(defaultInst.isDefault, true, 'Default flag should be true');
  assert.strictEqual(defaultInst.isCurrent, true, 'Default should be flagged as current');
  console.log(`  ✓ Passed: Found ${initialList.length} initial instance(s). Default: ${defaultInst.name} (${defaultInst.gameDate}, Turn ${defaultInst.turnNumber})`);

  // 2. Test createInstance with ARCH-COMMONER-YOUTH
  console.log('\n>>> [TEST 2] Creating New Instance (Thanh Niên Bố Y - Hai Bàn Tay Trắng)...');
  const newInst = instSvc.createInstance({
    name: 'Triệu Vân Giả Định',
    styleName: 'Tử Long',
    archetypeId: 'ARCH-COMMONER-YOUTH'
  });

  assert(newInst.id.startsWith('inst_'), `Instance ID should start with inst_, got ${newInst.id}`);
  assert(fs.existsSync(newInst.filepath), `Database file must exist at ${newInst.filepath}`);
  assert.strictEqual(newInst.name, 'Triệu Vân Giả Định', 'Player name should match');
  assert.strictEqual(newInst.styleName, 'Tử Long', 'Style name should match');
  assert.strictEqual(newInst.age, 18, 'Starting age for Commoner Youth must be 18');
  assert.strictEqual(newInst.liquidCash, 100, 'Starting cash for Commoner Youth must be 100 Qian');
  assert.strictEqual(newInst.turnNumber, 1, 'Starting turn must be 1');

  // Verify internal SQLite state of new instance
  const db = new Database(newInst.filepath, { readonly: true });
  try {
    const player = db.prepare(`SELECT * FROM player_state WHERE player_id = 'PLY-0001'`).get() as any;
    assert.strictEqual(player.liquid_cash, 100, 'Internal liquid_cash must be 100');
    assert.strictEqual(player.safe_cash, 0, 'Internal safe_cash must be 0');
    assert.strictEqual(player.fatigue, 0, 'Initial fatigue must be 0');
    assert.strictEqual(player.war_attr, 55, 'Initial WAR must be 55');
    assert.strictEqual(player.cra_attr, 58, 'Initial CRA must be 58');

    const meta = db.prepare(`SELECT * FROM campaign_meta LIMIT 1`).get() as any;
    assert.strictEqual(meta.active_turn, 1, 'Active turn must be 1');
    assert.strictEqual(meta.current_date, '184-05-02', 'Game date must be 184-05-02');

    const ledgerCount = db.prepare(`SELECT COUNT(*) as cnt, balance FROM cashflow_ledger`).get() as any;
    assert.strictEqual(ledgerCount.cnt, 1, 'Ledger must have exactly 1 initial capital record');
    assert.strictEqual(ledgerCount.balance, 100, 'Ledger balance must equal 100 Qian');

    const eqpCount = db.prepare(`SELECT COUNT(*) as cnt FROM character_equipment WHERE character_id = 'PLY-0001'`).get() as any;
    assert.strictEqual(eqpCount.cnt, 0, 'Commoner youth starts with 0 military equipment');

    const biz = db.prepare(`SELECT owner_character_id FROM businesses WHERE business_id = 'BIZ-0001'`).get() as any;
    assert.notStrictEqual(biz.owner_character_id, 'PLY-0001', 'Commoner youth does not own initial workshop');
  } finally {
    db.close();
  }
  console.log(`  ✓ Passed: Instance [${newInst.id}] created and validated with 100 Qian and Pauper Youth rules.`);

  // 3. Test listInstances with new instance
  console.log('\n>>> [TEST 3] Verifying Multi-Instance Discovery...');
  const updatedList = instSvc.listInstances(newInst.id);
  assert.strictEqual(updatedList.length, initialList.length + 1, 'Instance count should increment by 1');
  const foundNew = updatedList.find(i => i.id === newInst.id);
  assert(foundNew, 'New instance must be discoverable in list');
  assert.strictEqual(foundNew.isCurrent, true, 'New instance should be flagged as current');
  console.log(`  ✓ Passed: Discovered ${updatedList.length} instances, active instance correctly marked.`);

  // 4. Test cloneInstance
  console.log('\n>>> [TEST 4] Cloning/Forking Instance...');
  const clonedInst = instSvc.cloneInstance({
    sourceId: newInst.id,
    newLabel: 'Nhánh Thử Nghiệm Sao Lưu'
  });
  assert(clonedInst.id.startsWith('inst_'), 'Cloned instance must have unique ID');
  assert.notStrictEqual(clonedInst.id, newInst.id, 'Cloned ID must differ from source ID');
  assert(fs.existsSync(clonedInst.filepath), 'Cloned database file must exist');
  console.log(`  ✓ Passed: Cloned [${newInst.id}] -> [${clonedInst.id}].`);

  // 5. Test deleteInstance
  console.log('\n>>> [TEST 5] Deleting Instances & Protecting Default...');
  // Attempt to delete default instance (must fail)
  let defaultProtected = false;
  try {
    instSvc.deleteInstance('default');
  } catch (err: any) {
    defaultProtected = true;
    assert(err.message.includes('Không thể xóa'), 'Error message should protect default');
  }
  assert(defaultProtected, 'Must prevent deletion of default session');

  // Delete created test instances
  const delNew = instSvc.deleteInstance(newInst.id);
  assert.strictEqual(delNew, true, 'deleteInstance on test instance should return true');
  assert(!fs.existsSync(newInst.filepath), 'Test instance file should be physically removed');

  const delCloned = instSvc.deleteInstance(clonedInst.id);
  assert.strictEqual(delCloned, true, 'deleteInstance on cloned instance should return true');
  assert(!fs.existsSync(clonedInst.filepath), 'Cloned instance file should be physically removed');

  const finalList = instSvc.listInstances('default');
  assert.strictEqual(finalList.length, initialList.length, 'Instance count should return to original');
  console.log(`  ✓ Passed: Cleanup verified. Default instance safely guarded.`);

  console.log('\n======================================================================');
  console.log('   MULTI-INSTANCE VERIFICATION COMPLETE: ALL 5 TESTS PASSED!          ');
  console.log('======================================================================');
}

runInstanceTests().catch(err => {
  console.error('\n❌ MULTI-INSTANCE TEST FAILED:', err);
  process.exit(1);
});
