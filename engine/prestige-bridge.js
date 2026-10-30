/**
 * ThreeKingdoms-AgentEngine: Prestige bridge for the CommonJS engine.
 *
 * `src/modules/progression/prestige.service.ts` is the only fame writer. The
 * engine runs under tsx in production and in the test harness; this bridge
 * loads the TypeScript service lazily and returns null when tsx is absent so a
 * plain-node utility run never crashes on prestige.
 */

let cached = null;

function getPrestigeService(dbPath) {
  if (cached) return cached;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { PrestigeService } = require('../src/modules/progression/prestige.service.ts');
    cached = PrestigeService.forDatabase(DatabaseService.getInstance(dbPath));
    return cached;
  } catch (error) {
    return null;
  }
}

module.exports = { getPrestigeService };
