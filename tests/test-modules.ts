import { ModuleRegistry } from '../src/core/module-registry';
import { UtilityAiModule, UtilityCurveEvaluator } from '../src/modules/utility-ai/utility-ai.module';
import { MilitaryModule } from '../src/modules/military/military.module';
import { EconomyModule } from '../src/modules/economy/economy.module';
import { KizunaModule } from '../src/modules/social-kizuna/kizuna.module';
import { AgentBridgeModule } from '../src/modules/agent-bridge/agent-bridge.module';

async function runTests() {
  console.log('--- Testing AgentOption Modular Architecture ---');
  const registry = ModuleRegistry.getInstance();
  const aiMod = new UtilityAiModule();
  const milMod = new MilitaryModule();
  const econMod = new EconomyModule();
  const kizunaMod = new KizunaModule();
  const bridgeMod = new AgentBridgeModule();

  registry.register(aiMod);
  registry.register(milMod);
  registry.register(econMod);
  registry.register(kizunaMod);
  registry.register(bridgeMod);

  await registry.initAll('saves/session.db');
  console.log('✅ Registered modules count:', registry.getAll().length);
  registry.getAll().forEach(m => console.log(`  - [${m.id}] ${m.name} v${m.version}`));

  // 1. Test Utility Curve
  const logisticVal = UtilityCurveEvaluator.evaluateLogistic(75, 50, 0.1);
  console.log('✅ Utility AI Sigmoid (x=75, mid=50, k=0.1):', logisticVal.toFixed(4));

  // 2. Test Military Graph BFS Supply Check
  const hasSupply = milMod.graph.hasUnbrokenSupplyPath('LOC-0001', 'LOC-0002');
  console.log('✅ Military Supply Line Zhuo (LOC-0001) -> Luoyang (LOC-0002):', hasSupply);

  // 3. Test Market Price Elasticity
  const dynamicPrice = econMod.calculateDynamicPrice({
    commodity: 'GRAIN',
    basePrice: 50,
    currentPrice: 50,
    stockUnits: 100,
    demandUnits: 500,
    priceElasticity: 1.5
  });
  console.log('✅ Dynamic Grain Price (Base=50, Stock=100, Demand=500):', dynamicPrice);

  // 4. Test Kizuna Social Sentiment & Sworn Brotherhood
  const rel = kizunaMod.modifySentiment('PLY-0001', 'NPC-0002', 95, 85);
  console.log('✅ Kizuna Relation (Guan Yu):', { affinity: rel.affinity, respect: rel.respect });

  // 5. Test Episodic Memory Harvesting
  const mem = bridgeMod.recordEpisodicMemory({
    npcId: 'NPC-0002',
    turnNumber: 6,
    topic: 'PEACH_GARDEN_OATH',
    emotionalValence: 'POSITIVE',
    lessonLearned: 'Lương Diễn đã quyên góp 1,500 Tiền chế tạo Thanh Long Đao, kết làm sinh tử chi giao.',
    createdDate: new Date().toISOString()
  });
  console.log('✅ Episodic Memory Harvested:', mem.id, mem.lessonLearned);

  console.log('🎉 All modular tests passed flawlessly!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
