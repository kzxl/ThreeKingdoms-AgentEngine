/**
 * ThreeKingdoms-AgentEngine: Settlement market bridge for the CommonJS engine.
 */

let cached = null;
let cachedPath = null;

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
    cachedPath = dbPath;
    return cached;
  } catch (error) {
    return null;
  }
}

/** Releases the TypeScript DatabaseService connection opened by this bridge. */
function close() {
  if (!cached) return;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    DatabaseService.closePath(cachedPath);
  } catch (error) {
    // bridge may not have loaded tsx
  }
  cached = null;
  cachedPath = null;
}

function driftPlayerSettlement(dbPath, location) {
  const ctx = getSettlementMarketContext(dbPath);
  if (!ctx) return 0;
  const node = ctx.locToNode[location] || location;
  return ctx.service.driftSettlement(node);
}

function getLocalMultiplier(dbPath, location, itemCode) {
  const ctx = getSettlementMarketContext(dbPath);
  if (!ctx) return 1;
  try {
    const node = ctx.locToNode[location] || location;
    return ctx.service.getLocalMultiplier(node, itemCode);
  } catch (error) {
    return 1;
  }
}

function getStockState(dbPath, location, itemCode) {
  const ctx = getSettlementMarketContext(dbPath);
  if (!ctx) return null;
  try {
    const node = ctx.locToNode[location] || location;
    const state = ctx.service.getState(node, itemCode);
    const multiplier = ctx.service.getStockMultiplier(node, itemCode);
    const pressure = state.stock < state.demand * 0.7
      ? 'SCARCE'
      : state.stock > state.demand * 1.3
        ? 'SURPLUS'
        : 'NORMAL';
    return { ...state, multiplier, pressure };
  } catch (error) {
    return null;
  }
}

module.exports = { driftPlayerSettlement, getLocalMultiplier, getStockState, close };
