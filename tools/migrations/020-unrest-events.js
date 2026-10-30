/**
 * Migration 020: unified unrest log.
 *
 * Retainer departures and officer coups are different mechanics but the same
 * social signal. One append-only table lets the monthly report and audit read
 * a single unrest stream instead of two disconnected logs.
 */

module.exports = {
  id: '020-unrest-events',
  description: 'Add the unified unrest event log',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS unrest_events (
        unrest_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        source TEXT NOT NULL,
        npc_id TEXT NOT NULL,
        npc_name TEXT,
        event_type TEXT NOT NULL,
        severity REAL NOT NULL DEFAULT 0,
        game_date TEXT NOT NULL,
        detail_vi TEXT,
        detail_en TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('      unrest event log ready');
  }
};
