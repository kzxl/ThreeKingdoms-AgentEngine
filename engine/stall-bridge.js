/**
 * Stall bridge for the CommonJS day clock.
 *
 * Each elapsed day gives NPCs in the stall settlement a chance to buy listed
 * goods. The bridge is synchronous, like expedition/siege, so a sale cannot
 * race the calendar.
 */

const contexts = new Map();

function getService(dbPath) {
  const key = dbPath || '__default__';
  const existing = contexts.get(key);
  if (existing) return existing;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { StallService } = require('../src/modules/market/stall.service.ts');
    const service = StallService.forDatabase(DatabaseService.getInstance(dbPath));
    contexts.set(key, service);
    return service;
  } catch (error) {
    return null;
  }
}

function advanceByDays(dbPath, days, gameDate) {
  const service = getService(dbPath);
  if (!service) return { sales: [], totalCash: 0 };
  try {
    return service.advanceByDays(days, gameDate);
  } catch (error) {
    return { sales: [], totalCash: 0, error: error && error.message ? error.message : String(error) };
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
