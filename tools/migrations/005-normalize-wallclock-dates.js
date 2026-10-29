/**
 * Migration 005: Normalize wall-clock dates written by the `current_date` bug.
 *
 * Before the keyword fix, several services read the SQLite CURRENT_DATE keyword
 * instead of the campaign column and stamped real-world dates (2026-xx-xx) into
 * chronicles, journeys, career shifts, political events, innovations,
 * relationship deltas and stock movements.
 *
 * The campaign clock itself is handled by migration 002. This migration rewrites
 * only rows whose year falls outside the historical era; genuine metadata
 * timestamps (e.g. npc_episodic_memories.created_date) are left untouched.
 */

const ERA_MIN = 180;
const ERA_MAX = 300;

module.exports = {
  id: '005-normalize-wallclock-dates',
  description: 'Rewrite out-of-era (2026) game dates in session records to the campaign date',
  up(db) {
    const meta = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='campaign_meta'")
      .get();
    if (!meta) {
      console.log('      (campaign_meta absent — nothing to normalize)');
      return;
    }

    const campaign = db.prepare('SELECT "current_date" AS d FROM campaign_meta LIMIT 1').get();
    const campaignDate = campaign?.d || '184-02-01';

    const targets = [
      { table: 'chat_chronicle', column: 'game_date' },
      { table: 'npc_journey_logs', column: 'game_date' },
      { table: 'npc_career_shifts', column: 'game_date' },
      { table: 'faction_political_events', column: 'game_date' },
      { table: 'emergent_innovations', column: 'game_date' },
      { table: 'npc_relationship_deltas', column: 'game_date' },
      { table: 'stock_movements', column: 'game_date' }
    ];

    const outOfEra = column =>
      `(${column} IS NOT NULL AND (CAST(substr(${column}, 1, 4) AS INTEGER) < ${ERA_MIN} OR CAST(substr(${column}, 1, 4) AS INTEGER) > ${ERA_MAX}))`;

    let total = 0;
    for (const target of targets) {
      const exists = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
        .get(target.table);
      if (!exists) continue;

      const columns = db.prepare(`PRAGMA table_info(${target.table})`).all().map(c => c.name);
      if (!columns.includes(target.column)) continue;

      let changes = 0;
      if (columns.includes('turn_number')) {
        // Keep history ordered: prefer the matching turn's date.
        changes = db
          .prepare(
            `UPDATE ${target.table}
                SET ${target.column} = COALESCE(
                  (SELECT t.game_date FROM turn_log t WHERE t.turn_number = ${target.table}.turn_number),
                  ?)
              WHERE ${outOfEra(target.column)}`
          )
          .run(campaignDate).changes;
      } else {
        changes = db
          .prepare(`UPDATE ${target.table} SET ${target.column} = ? WHERE ${outOfEra(target.column)}`)
          .run(campaignDate).changes;
      }

      if (changes > 0) {
        total += changes;
        console.log(`      • ${target.table}.${target.column}: ${changes} row(s) → game dates`);
      }
    }

    if (total === 0) console.log('      (no out-of-era dates found)');
  }
};
