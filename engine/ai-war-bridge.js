/**
 * AI war bridge: called once per month close after diplomacy has settled.
 */

let cached = null;
let cachedPath = null;

function getService(dbPath) {
  if (cached && cachedPath === dbPath) return cached;
  require('tsx/cjs');
  const { DatabaseService } = require('../src/core/database.ts');
  const { AiArmyService } = require('../src/modules/military/ai-army.service.ts');
  cached = AiArmyService.forDatabase(DatabaseService.getInstance(dbPath));
  cachedPath = dbPath;
  return cached;
}

function simulateMonthly(dbPath, turnNumber, gameDate) {
  try {
    return getService(dbPath).simulateMonthly(turnNumber, gameDate);
  } catch (error) {
    console.warn('[ai-war-bridge] monthly dispatch failed:', error.message);
    return [];
  }
}

module.exports = { simulateMonthly };
