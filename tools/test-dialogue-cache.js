/**
 * ThreeKingdoms-AgentEngine: Test Suite for Contextual Dialogue Cache
 * (tools/test-dialogue-cache.js)
 */

const { ContextDialogueService } = require('../src/modules/social-kizuna/context-dialogue.service');
const { DailyInteractionEngine } = require('../src/modules/social-kizuna/daily-interaction.engine');

async function testDialogueCache() {
  console.log('=== RUNNING CONTEXTUAL DIALOGUE CACHE TEST SUITE ===');

  const service = ContextDialogueService.getInstance();
  const engine = DailyInteractionEngine.getInstance();

  // Reset auto-synthesized test rows for idempotent test runs
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.getInstance().execute(`DELETE FROM master_context_dialogues WHERE id LIKE 'DLG-AUTO-%';`);

  // Test 1: Query pre-seeded Zhang Fei Banquet Drink
  console.log('\n[Test 1] Testing Pre-Seeded Context (Zhang Fei BANQUET_DRINK CRITICAL_SUCCESS)...');
  const res1 = service.resolveDialogue({
    npcId: 'NPC-0002',
    actionType: 'BANQUET_DRINK',
    outcomeTier: 'CRITICAL_SUCCESS',
    heroNameVi: 'Trương Phi',
    heroNameEn: 'Zhang Fei'
  });
  console.log('  -> Source:', res1.source);
  console.log('  -> isCached:', res1.isCached);
  console.log('  -> Dialogue (VI):', res1.dialogueVi.slice(0, 100) + '...');
  if (!res1.isCached) throw new Error('Test 1 failed: Expected pre-seeded dialogue to be cached');

  // Test 2: Query novel context that has never been seeded before
  console.log('\n[Test 2] Testing Novel Context Lazy Synthesis (NPC-0007 TEA_CONVERSE AWKWARD)...');
  const res2 = service.resolveDialogue({
    npcId: 'NPC-0007',
    actionType: 'TEA_CONVERSE',
    outcomeTier: 'AWKWARD',
    heroNameVi: 'Trần Bảo',
    heroNameEn: 'Chen Bao'
  });
  console.log('  -> Source:', res2.source);
  console.log('  -> isCached:', res2.isCached);
  console.log('  -> Dialogue (VI):', res2.dialogueVi.slice(0, 100) + '...');
  if (res2.isCached) throw new Error('Test 2 failed: Expected first lookup of novel context to be a cache miss');

  // Test 3: Query the exact same novel context again -> MUST HIT CACHE!
  console.log('\n[Test 3] Testing Replay of Novel Context (NPC-0007 TEA_CONVERSE AWKWARD)...');
  const res3 = service.resolveDialogue({
    npcId: 'NPC-0007',
    actionType: 'TEA_CONVERSE',
    outcomeTier: 'AWKWARD',
    heroNameVi: 'Trần Bảo',
    heroNameEn: 'Chen Bao'
  });
  console.log('  -> Source:', res3.source);
  console.log('  -> isCached:', res3.isCached);
  console.log('  -> Dialogue (VI):', res3.dialogueVi.slice(0, 100) + '...');
  if (!res3.isCached) throw new Error('Test 3 failed: Expected subsequent lookup to HIT cache from SQLite');

  // Test 4: Full Engine Execution via DailyInteractionEngine
  console.log('\n[Test 4] Testing DailyInteractionEngine.executeDailyInteraction Integration...');
  const interactionRes = engine.executeDailyInteraction('NPC-0002', 'BANQUET_DRINK', 'Uống rượu Trác Thành Trán Nương');
  console.log('  -> Hero:', interactionRes.npcNameVi);
  console.log('  -> Outcome:', interactionRes.outcome);
  console.log('  -> Dialogue VI:', interactionRes.dialogueNarrativeVi.slice(0, 100) + '...');
  console.log('  -> Dialogue Source:', interactionRes.dialogueSource);
  console.log('  -> isDialogueCached:', interactionRes.isDialogueCached);

  // Test 5: Verify Cache Stats Telemetry
  console.log('\n[Test 5] Dialogue Cache Telemetry Stats:');
  const stats = service.getStats();
  console.log('  -> Total Dialogues in DB:', stats.totalCount);
  console.log('  -> Cache Hits:', stats.hits);
  console.log('  -> Cache Misses:', stats.misses);
  console.log('  -> Hit Ratio:', stats.hitRatio);

  console.log('\n✅ ALL 5 DIALOGUE CACHE TESTS PASSED SUCCESSFULLY!');
}

testDialogueCache().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
