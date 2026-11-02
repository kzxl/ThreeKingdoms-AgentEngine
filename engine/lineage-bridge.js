/**
 * ThreeKingdoms-AgentEngine: Lineage bridge for the CommonJS engine.
 *
 * `src/modules/lineage-succession/family-lineage.service.ts` owns pregnancy,
 * child growth and autonomous NPC family life. The monthly clock needs those
 * side effects without importing TypeScript from engine code, so this bridge
 * loads the service lazily and returns null when tsx is absent.
 */

let cached = null;
let cachedPath = null;

function getFamilyLineageService(dbPath) {
  if (cached && cachedPath === dbPath) return cached;
  try {
    require('tsx/cjs');
    const { FamilyLineageService } = require('../src/modules/lineage-succession/family-lineage.service.ts');
    // Bind explicitly to the requested database; the service singleton would
    // keep the first path and leak state between playthrough instances.
    cached = new FamilyLineageService(dbPath);
    cachedPath = dbPath;
    return cached;
  } catch (error) {
    return null;
  }
}

module.exports = { getFamilyLineageService };
