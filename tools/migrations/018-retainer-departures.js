/**
 * Migration 018: personal retainer departures.
 *
 * Low fame corrodes loyalty; a retainer below 30 can leave. The log records
 * who left, why, and the fame/loyalty values at the time.
 */

module.exports = {
  id: '018-retainer-departures',
  description: 'Add the personal retainer departure log',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS retainer_departures (
        departure_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        npc_id TEXT NOT NULL,
        npc_name TEXT NOT NULL,
        game_date TEXT NOT NULL,
        fame_at_departure INTEGER NOT NULL,
        loyalty_before INTEGER NOT NULL,
        reason TEXT NOT NULL,
        narrative_vi TEXT,
        narrative_en TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('      retainer departures ready');
  }
};
