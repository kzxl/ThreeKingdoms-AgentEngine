/**
 * ThreeKingdoms-AgentEngine: Server Composition Root (src/server/main.ts)
 * Integrates AgentOption Universe Modular Architecture v4.0 with HTTP Server.
 * Bootstraps feature modules, in-memory EventBus, and Grand Strategy endpoints.
 */

import path from 'path';
import http from 'http';
import { ModuleRegistry } from '../core/module-registry';
import { UtilityAiModule } from '../modules/utility-ai/utility-ai.module';
import { MilitaryModule } from '../modules/military/military.module';
import { EconomyModule } from '../modules/economy/economy.module';
import { KizunaModule } from '../modules/social-kizuna/kizuna.module';
import { AgentBridgeModule } from '../modules/agent-bridge/agent-bridge.module';
import { NpcLifecycleModule } from '../modules/npc-lifecycle/npc-lifecycle.module';
import { FactionPoliticsModule } from '../modules/faction-politics/faction-politics.module';
import { ProfessionsModule } from '../modules/professions/professions.module';
import { EcologyLogisticsModule } from '../modules/ecology-logistics/ecology-logistics.module';
import { Router } from './router';
import { registerEconomyRoutes } from '../modules/economy/economy.controller';
import { registerMilitaryRoutes } from '../modules/military/military.controller';
import { registerProfessionsRoutes } from '../modules/professions/professions.controller';
import { registerEcologyRoutes } from '../modules/ecology-logistics/ecology.controller';
import { registerKizunaRoutes } from '../modules/social-kizuna/kizuna.controller';
import { registerBlacksmithForgeRoutes } from '../modules/professions/blacksmith-forge.service';
import { registerLineageRoutes } from '../modules/lineage-succession/lineage.controller';
import { registerDuelRoutes } from '../modules/military/duel.controller';
import { registerBanquetRoutes } from '../modules/social-kizuna/banquet.controller';
import { registerProgressionRoutes } from '../modules/progression/progression.controller';
import { DailyInteractionEngine } from '../modules/social-kizuna/daily-interaction.engine';
import { ContextActionEngine } from '../modules/contextual-actions/context-action.engine';

// Resolve database path
const ROOT_DIR = path.resolve(__dirname, '../..');
const DB_PATH = process.env.SIM_DB_PATH || path.join(ROOT_DIR, 'saves', 'session.db');

export async function bootstrapGrandStrategy() {
  console.log('[Bootstrap] Initializing AgentOption Universe Modular Engine...');
  const registry = ModuleRegistry.getInstance();

  const utilityAi = new UtilityAiModule();
  const military = new MilitaryModule();
  const economy = new EconomyModule();
  const kizuna = new KizunaModule();
  const agentBridge = new AgentBridgeModule();
  const npcLifecycle = new NpcLifecycleModule();
  const factionPolitics = new FactionPoliticsModule();
  const professions = new ProfessionsModule();
  const ecologyLogistics = new EcologyLogisticsModule();

  registry.register(utilityAi);
  registry.register(military);
  registry.register(economy);
  registry.register(kizuna);
  registry.register(agentBridge);
  registry.register(npcLifecycle);
  registry.register(factionPolitics);
  registry.register(professions);
  registry.register(ecologyLogistics);

  await registry.initAll(DB_PATH);

  console.log(`[Bootstrap] [ACTIVE] ${registry.getAll().length} Feature Modules Active:`);
  registry.getAll().forEach(m => console.log(`   ├─ [${m.id}] ${m.name} (v${m.version})`));

  return {
    registry,
    utilityAi,
    military,
    economy,
    kizuna,
    agentBridge,
    npcLifecycle,
    factionPolitics,
    professions,
    ecologyLogistics
  };
}

export function createGrandStrategyRouter(): Router {
  const router = new Router();
  registerEconomyRoutes(router);
  registerMilitaryRoutes(router);
  registerProfessionsRoutes(router);
  registerEcologyRoutes(router);
  registerKizunaRoutes(router);
  registerBlacksmithForgeRoutes(router);
  registerLineageRoutes(router);
  registerDuelRoutes(router);
  registerBanquetRoutes(router);
  registerProgressionRoutes(router);
  return router;
}

// Start standalone or attach to sim-web
async function main() {
  const modules = await bootstrapGrandStrategy();

  // Attach to global for Web Server route handlers
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = modules;

  // Initialize modular HTTP router
  const router = createGrandStrategyRouter();
  (globalThis as any).__GRAND_STRATEGY_ROUTER__ = router;
  (globalThis as any).__DAILY_INTERACTION_ENGINE__ = DailyInteractionEngine.getInstance();
  (globalThis as any).__CONTEXT_ACTION_ENGINE__ = ContextActionEngine.getInstance();
  console.log(`[Bootstrap] [HTTP] Modular Router active with ${router.getRoutes().length} registered endpoints.`);

  // Import existing web server
  const simWeb = require('../../tools/sim-web.js');

  const PORT = parseInt(process.env.PORT || '3300', 10);
  console.log(`[Bootstrap] Starting Fullstack Server with Grand Strategy Modules on Port ${PORT}...`);
  simWeb.startServer(PORT);
}

if (require.main === module || process.env.RUN_MAIN === 'true') {
  main().catch(err => {
    console.error('[Bootstrap] Fatal startup error:', err);
    process.exit(1);
  });
}
