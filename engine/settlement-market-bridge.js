/**
 * ThreeKingdoms-AgentEngine: Settlement market bridge for the CommonJS engine.
 */

const contexts = new Map();

/**
 * One context per database path. The previous single-slot cache returned the
 * first campaign for every later path, so a sandbox/test database could read
 * the live market (or vice versa).
 */
function getSettlementMarketContext(dbPath) {
  const key = dbPath || '__default__';
  const existing = contexts.get(key);
  if (existing) return existing;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { SettlementMarketService } = require('../src/modules/economy/settlement-market.service.ts');
    const { LOC_TO_NODE_MAP } = require('../src/modules/ecology-logistics/spatial-registry.ts');
    const ctx = {
      service: SettlementMarketService.forDatabase(DatabaseService.getInstance(dbPath)),
      locToNode: LOC_TO_NODE_MAP
    };
    contexts.set(key, ctx);
    return ctx;
  } catch (error) {
    return null;
  }
}

/** Releases every TypeScript DatabaseService connection opened by this bridge. */
function close() {
  if (contexts.size === 0) return;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    for (const key of contexts.keys()) {
      if (key !== '__default__') DatabaseService.closePath(key);
    }
  } catch (error) {
    // bridge may not have loaded tsx
  }
  contexts.clear();
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

/** Monthly essential consumption across every settlement. */
function consumeEssentials(dbPath, gameDate) {
  const ctx = getSettlementMarketContext(dbPath);
  if (!ctx) return [];
  try {
    return ctx.service.consumeEssentials(gameDate);
  } catch (error) {
    return [];
  }
}

/**
 * Books a trade into local stock: buying passes a negative delta, selling a
 * positive one. Returns the new state or null when the bridge is unavailable.
 */
function applyTrade(dbPath, location, itemCode, stockDelta) {
  const ctx = getSettlementMarketContext(dbPath);
  if (!ctx) return null;
  try {
    const node = ctx.locToNode[location] || location;
    return ctx.service.applyTrade(node, itemCode, stockDelta);
  } catch (error) {
    return null;
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

module.exports = { driftPlayerSettlement, consumeEssentials, getLocalMultiplier, getStockState, applyTrade, close };
