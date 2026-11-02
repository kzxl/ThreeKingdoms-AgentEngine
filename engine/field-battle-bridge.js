/**
 * Field battle bridge: the expedition march clock calls this synchronously
 * when a marching army reaches a hostile settlement.
 */

let cached = null;
let cachedPath = null;

function getService(dbPath) {
  if (cached && cachedPath === dbPath) return cached;
  require('tsx/cjs');
  const { DatabaseService } = require('../src/core/database.ts');
  const { FieldBattleService } = require('../src/modules/military/field-battle.service.ts');
  cached = FieldBattleService.forDatabase(DatabaseService.getInstance(dbPath));
  cachedPath = dbPath;
  return cached;
}

function resolveArrival(dbPath, expeditionId, gameDate) {
  try {
    return getService(dbPath).resolveArrival(expeditionId, gameDate);
  } catch (error) {
    return { battle: false, error: error && error.message ? error.message : String(error) };
  }
}

module.exports = { resolveArrival };
