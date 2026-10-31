/**
 * Migration 039: normalize the skill EXP curve.
 *
 * Older rows stored ad-hoc `max_exp` values (40/60/90/120) that made tier speed
 * depend on which writer created the row. The shared curve now owns the
 * requirement per tier; this migration aligns every stored skill row to it.
 */

const { expRequiredForTier, SKILL_MAX_TIER } = require('../../engine/skill-exp');

module.exports = {
  id: '039-skill-exp-curve',
  description: 'Align player and NPC skill max_exp with the shared tier curve',
  up(db) {
    const update = db.prepare(
      'UPDATE player_skills SET max_exp = ?, tier = MIN(tier, ?) WHERE tier = ?;'
    );
    for (let tier = 1; tier <= SKILL_MAX_TIER; tier += 1) {
      update.run(expRequiredForTier(tier), SKILL_MAX_TIER, tier);
    }

    const npcTables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'npc_skills';`
    ).get();
    if (npcTables) {
      const updateNpc = db.prepare(
        'UPDATE npc_skills SET max_exp = ?, tier = MIN(tier, ?) WHERE tier = ?;'
      );
      for (let tier = 1; tier <= SKILL_MAX_TIER; tier += 1) {
        updateNpc.run(expRequiredForTier(tier), SKILL_MAX_TIER, tier);
      }
    }

    console.log(`      skill EXP curve normalized (${SKILL_MAX_TIER} tiers)`);
  }
};
