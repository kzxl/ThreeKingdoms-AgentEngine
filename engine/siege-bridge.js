/**
 * ThreeKingdoms-AgentEngine: Siege bridge for the CommonJS engine.
 *
 * The day clock advances active sieges synchronously, alongside caravans and
 * expeditions. The TypeScript service owns the ledger writes.
 */

let cached = null;
let cachedPath = null;

const { runSqlJson } = require('./db-adapter');

function hasActiveSieges(dbPath) {
  try {
    const table = runSqlJson(
      dbPath,
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'session_sieges' LIMIT 1;`
    );
    if (!table.length) return false;
    const active = runSqlJson(
      dbPath,
      `SELECT 1 AS ok FROM session_sieges WHERE status = 'ACTIVE' LIMIT 1;`
    );
    return active.length > 0;
  } catch {
    return false;
  }
}

function getSiegeService(dbPath) {
  if (cached && cachedPath === dbPath) return cached;
  require('tsx/cjs');
  const { DatabaseService } = require('../src/core/database.ts');
  const { SiegeService } = require('../src/modules/military/siege.service.ts');
  cached = SiegeService.forDatabase(DatabaseService.getInstance(dbPath));
  cachedPath = dbPath;
  return cached;
}

function advanceSiegesByDays(dbPath, days, asOfDate) {
  // Most databases have no investment in progress; skip the TypeScript service
  // (and its persistent connection) entirely in that case.
  if (!hasActiveSieges(dbPath)) return { active: 0, resolved: [] };
  try {
    return getSiegeService(dbPath).advanceByDays(days, asOfDate);
  } catch (error) {
    return { active: 0, resolved: [], error: error && error.message ? error.message : String(error) };
  }
}

module.exports = { advanceSiegesByDays, getSiegeService };
