/**
 * ThreeKingdoms-AgentEngine: Settlement market bridge for the CommonJS engine.
 */

let cached = null;

function getSettlementMarketContext(dbPath) {
  if (cached) return cached;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { SettlementMarketService } = require('../src/modules/economy/settlement-market.service.ts');
    const { LOC_TO_NODE_MAP } = require('../src/modules/ecology-logistics/spatial-registry.ts');
    cached = {
      service: SettlementMarketService.forDatabase(DatabaseService.getInstance(dbPath)),
      locToNode: LOC_TO_NODE_MAP
    };
    return cached;
  } catch (error) {
    return null;
  }
}

function driftPlayerSettlement(dbPath, location) {
  const ctx = getSettlementMarketContext(dbPath);
  if (!ctx) return 0;
  const node = ctx.locToNode[location] || location;
  return ctx.service.driftSettlement(node);
}

module.exports = { driftPlayerSettlement };
