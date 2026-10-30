/**
 * ThreeKingdoms-AgentEngine: Expedition march bridge for the CommonJS engine.
 *
 * The day clock owns time, so it also owns army movement. Each elapsed day span
 * decrements `days_remaining` once; reaching zero moves the expedition to
 * ARRIVED and waits for the player's next order (assault or conclude).
 *
 * This is deliberately called synchronously from `advanceCampaignDays` and not
 * from WORLD_DAY_TICK: the EventBus publish is async and not awaited, so a tick
 * subscriber would race the clock and could advance an army twice.
 */

const { runSqlJson, runSqlExec } = require('./db-adapter');

let warnedMissingTable = false;

function advanceExpeditionsByDays(dbPath, days, asOfDate) {
  const advancedDays = Math.max(0, Math.ceil(Number(days) || 0));
  if (advancedDays === 0) return { advanced: 0, arrived: [] };

  try {
    const rows = runSqlJson(
      dbPath,
      `SELECT expedition_id, days_remaining
       FROM military_expeditions
       WHERE status = 'MARCHING';`
    );
    if (!rows.length) return { advanced: 0, arrived: [] };

    const arrived = [];
    for (const row of rows) {
      const remaining = Math.max(0, Number(row.days_remaining || 0) - advancedDays);
      if (remaining <= 0) {
        // A hostile arrival is a field battle before the city can be invested.
        let fieldOutcome = null;
        try {
          fieldOutcome = require('./field-battle-bridge').resolveArrival(
            dbPath, row.expedition_id, asOfDate || null
          );
        } catch {
          fieldOutcome = null;
        }
        if (fieldOutcome && fieldOutcome.battle) {
          arrived.push({
            expeditionId: row.expedition_id,
            status: fieldOutcome.expeditionStatus,
            battle: fieldOutcome.result ? fieldOutcome.result.outcome : 'UNKNOWN'
          });
          continue;
        }
        runSqlExec(
          dbPath,
          `UPDATE military_expeditions
           SET days_remaining = 0, status = 'ARRIVED', arrival_date = COALESCE(arrival_date, ?)
           WHERE expedition_id = ?;`,
          [asOfDate || null, row.expedition_id]
        );
        arrived.push(row.expedition_id);
      } else {
        runSqlExec(
          dbPath,
          `UPDATE military_expeditions SET days_remaining = ? WHERE expedition_id = ?;`,
          [remaining, row.expedition_id]
        );
      }
    }
    return { advanced: rows.length, arrived };
  } catch (error) {
    if (!warnedMissingTable) {
      warnedMissingTable = true;
      console.warn('[expedition-bridge] march advance unavailable:', error.message);
    }
    return { advanced: 0, arrived: [], error: error.message };
  }
}

module.exports = { advanceExpeditionsByDays };
