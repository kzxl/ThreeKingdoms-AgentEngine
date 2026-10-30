/**
 * ThreeKingdoms-AgentEngine: Battle/defeat bridge for the CommonJS engine.
 */

let cached = null;

function getBattleDuelService(dbPath) {
  if (cached) return cached;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { BattleDuelService } = require('../src/modules/military/battle-duel.service.ts');
    cached = BattleDuelService.forDatabase(DatabaseService.getInstance(dbPath));
    return cached;
  } catch (error) {
    return null;
  }
}

module.exports = { getBattleDuelService };
