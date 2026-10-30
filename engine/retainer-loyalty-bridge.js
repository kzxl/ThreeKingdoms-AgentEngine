/**
 * ThreeKingdoms-AgentEngine: Retainer loyalty bridge for the CommonJS engine.
 */

let cached = null;

function getRetainerLoyaltyService(dbPath) {
  if (cached) return cached;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { RetainerLoyaltyService } = require('../src/modules/progression/retainer-loyalty.service.ts');
    cached = RetainerLoyaltyService.forDatabase(DatabaseService.getInstance(dbPath));
    return cached;
  } catch (error) {
    return null;
  }
}

module.exports = { getRetainerLoyaltyService };
