/**
 * ThreeKingdoms-AgentEngine: Fame attraction bridge for the CommonJS engine.
 * Loads the TypeScript service lazily; returns null when tsx is absent.
 */

let cached = null;

function getFameAttractionService(dbPath) {
  if (cached) return cached;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { FameAttractionService } = require('../src/modules/progression/fame-attraction.service.ts');
    cached = FameAttractionService.forDatabase(DatabaseService.getInstance(dbPath));
    return cached;
  } catch (error) {
    return null;
  }
}

module.exports = { getFameAttractionService };
