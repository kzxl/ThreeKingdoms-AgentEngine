/**
 * Scenario ownership seeds for the commonJS new-game path.
 * Shares config/scenario-seeds.json with the instance bootstrap.
 */

const { runSqlJson, runSqlExec } = require('./db-adapter');
const SEEDS = require('../config/scenario-seeds.json');

function applyScenarioSeed(dbPath, scenarioId) {
  const seed = scenarioId ? SEEDS[scenarioId] : null;
  if (!seed) return { applied: false };

  try {
    const player = runSqlJson(
      dbPath,
      `SELECT faction_id FROM session_factions WHERE leader_id = 'PLY-0001' AND is_active = 1 LIMIT 1;`
    )[0];
    if (!player?.faction_id) return { applied: false };

    const owned = new Set(seed.playerSettlements || []);
    const settlements = runSqlJson(dbPath, 'SELECT settlement_id, ruler_faction_id FROM session_settlements;');
    for (const settlement of settlements) {
      if (owned.has(settlement.settlement_id)) {
        runSqlExec(
          dbPath,
          `UPDATE session_settlements SET ruler_faction_id = ?, governor_id = 'PLY-0001' WHERE settlement_id = ?;`,
          [player.faction_id, settlement.settlement_id]
        );
      } else if (settlement.ruler_faction_id === player.faction_id) {
        runSqlExec(
          dbPath,
          `UPDATE session_settlements SET ruler_faction_id = 'FAC-HAN', governor_id = NULL WHERE settlement_id = ?;`,
          [settlement.settlement_id]
        );
      }
    }

    const capital = seed.playerSettlements?.[0];
    if (capital) {
      runSqlExec(
        dbPath,
        'UPDATE session_factions SET capital_settlement_id = ? WHERE faction_id = ?;',
        [capital, player.faction_id]
      );
    }

    for (const enemy of seed.wars || []) {
      const exists = runSqlJson(dbPath, 'SELECT 1 AS ok FROM session_factions WHERE faction_id = ? LIMIT 1;', [enemy]);
      if (!exists.length) continue;
      runSqlExec(
        dbPath,
        `INSERT OR REPLACE INTO faction_diplomacy
           (id, faction_id_a, faction_id_b, relation_state, diplomatic_attitude, truce_turns_remaining, tribute_amount, updated_turn)
         VALUES (?, ?, ?, 'WAR', -100, 0, 0, 1);`,
        [`DIP-${player.faction_id}-${enemy}`, player.faction_id, enemy]
      );
    }
    return { applied: true };
  } catch (error) {
    return { applied: false, error: error.message };
  }
}

module.exports = { applyScenarioSeed };
