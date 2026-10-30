/**
 * Victory bridge for the CommonJS engine. The rule itself lives in
 * src/shared/victory.ts so the military service and the month close share it.
 */

let cached = null;
let cachedPath = null;

function getVictoryService(dbPath) {
  if (cached && cachedPath === dbPath) return cached;
  require('tsx/cjs');
  const { DatabaseService } = require('../src/core/database.ts');
  const { applyVictoryIfEligible, evaluateVictory } = require('../src/shared/victory.ts');
  cached = {
    apply: () => applyVictoryIfEligible(DatabaseService.getInstance(dbPath)),
    evaluate: () => evaluateVictory(DatabaseService.getInstance(dbPath))
  };
  cachedPath = dbPath;
  return cached;
}

function checkVictory(dbPath) {
  try {
    return getVictoryService(dbPath).apply();
  } catch (error) {
    return { victorious: false, error: error.message };
  }
}

module.exports = { checkVictory };
