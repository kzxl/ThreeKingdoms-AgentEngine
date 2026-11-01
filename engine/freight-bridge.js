/**
 * Freight bridge for the CommonJS day clock: advances hired shipments and
 * expires stale contracts.
 */

const contexts = new Map();

function getService(dbPath) {
  const key = dbPath || '__default__';
  const existing = contexts.get(key);
  if (existing) return existing;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { FreightService } = require('../src/modules/market/freight.service.ts');
    const service = FreightService.forDatabase(DatabaseService.getInstance(dbPath));
    contexts.set(key, service);
    return service;
  } catch (error) {
    return null;
  }
}

function advanceByDays(dbPath, days, gameDate) {
  const service = getService(dbPath);
  if (!service) return { advanced: 0, arrived: [] };
  try {
    return service.advanceByDays(days, gameDate);
  } catch (error) {
    return { advanced: 0, arrived: [], error: error && error.message ? error.message : String(error) };
  }
}

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

module.exports = { advanceByDays, close };
