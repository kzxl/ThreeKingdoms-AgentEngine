/**
 * ThreeKingdoms-AgentEngine: Verify Contextual Dialogue Matching
 * (tools/verify-dialogue-matching.js)
 */

const { DailyInteractionEngine } = require('../src/modules/social-kizuna/daily-interaction.engine');
const { ContextDialogueService } = require('../src/modules/social-kizuna/context-dialogue.service');

function verify() {
  console.log('=== VERIFYING ZHANG FEI / LIU BEI DIALOGUE ISOLATION ===');
  const engine = DailyInteractionEngine.getInstance();
  const service = ContextDialogueService.getInstance();

  // Test 1: Trương Phi Sparring / Spear Drills
  console.log('\n[1] Trương Phi (NPC-0002) - SPAR_DEBATE (Thương Pháp):');
  const res1 = engine.executeDailyInteraction('NPC-0002', 'SPAR_DEBATE', 'Luyện tập Thương Pháp thực chiến dưới gốc đào hạ trạch');
  console.log('  -> Target NPC:', res1.npcNameVi);
  console.log('  -> Outcome:', res1.outcomeTitleVi);
  console.log('  -> Dialogue:\n     ' + res1.dialogueNarrativeVi);

  if (res1.dialogueNarrativeVi.includes('Lưu Bị') || res1.dialogueNarrativeVi.includes('Quan Vũ')) {
    throw new Error('FAILED: Trương Phi spoke another hero\'s line!');
  }
  console.log('  ✅ PASSED: Trương Phi spoke authentically as himself.');

  // Test 2: Trương Phi Tea Converse
  console.log('\n[2] Trương Phi (NPC-0002) - TEA_CONVERSE (Uống trà):');
  const res2 = engine.executeDailyInteraction('NPC-0002', 'TEA_CONVERSE', 'Uống trà đàm đạo');
  console.log('  -> Target NPC:', res2.npcNameVi);
  console.log('  -> Outcome:', res2.outcomeTitleVi);
  console.log('  -> Dialogue:\n     ' + res2.dialogueNarrativeVi);

  if (res2.dialogueNarrativeVi.includes('Lưu Bị') || res2.dialogueNarrativeVi.includes('Quan Vũ')) {
    throw new Error('FAILED: Trương Phi spoke another hero\'s line in Tea Converse!');
  }
  console.log('  ✅ PASSED: Trương Phi tea dialogue is isolated and authentic.');

  // Test 3: Trương Phi Banquet Drink
  console.log('\n[3] Trương Phi (NPC-0002) - BANQUET_DRINK (Uống rượu):');
  const res3 = engine.executeDailyInteraction('NPC-0002', 'BANQUET_DRINK', 'Nâng chén rượu Đào Viên');
  console.log('  -> Target NPC:', res3.npcNameVi);
  console.log('  -> Outcome:', res3.outcomeTitleVi);
  console.log('  -> Dialogue:\n     ' + res3.dialogueNarrativeVi);

  if (res3.dialogueNarrativeVi.includes('Lưu Bị') || res3.dialogueNarrativeVi.includes('Quan Vũ')) {
    throw new Error('FAILED: Trương Phi spoke another hero\'s line in Banquet!');
  }
  console.log('  ✅ PASSED: Trương Phi banquet dialogue is isolated and authentic.');

  // Test 4: Lưu Bị (NPC-0001) - Check that Liu Bei still speaks Liu Bei's line
  console.log('\n[4] Lưu Bị (NPC-0001) - TEA_CONVERSE:');
  const res4 = engine.executeDailyInteraction('NPC-0001', 'TEA_CONVERSE', 'Đàm đạo thế sự');
  console.log('  -> Target NPC:', res4.npcNameVi);
  console.log('  -> Outcome:', res4.outcomeTitleVi);
  console.log('  -> Dialogue:\n     ' + res4.dialogueNarrativeVi);

  if (!res4.dialogueNarrativeVi.includes('Lưu Bị')) {
    throw new Error('FAILED: Expected Liu Bei\'s dialogue for NPC-0001!');
  }
  console.log('  ✅ PASSED: Lưu Bị dialogue matches strictly.');

  console.log('\n🎉 ALL DIALOGUE ISOLATION INVARIANTS VERIFIED 100% CORRECT!');
}

verify();
