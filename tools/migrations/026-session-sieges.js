/**
 * Migration 026: multi-day sieges.
 *
 * A siege is a persistent investment with daily damage, not a single d20 roll.
 * The day clock advances active rows through engine/siege-bridge.
 */

module.exports = {
  id: '026-session-sieges',
  description: 'Add the persistent siege table',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS session_sieges (
        siege_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        commander_id TEXT NOT NULL,
        attacker_troops INTEGER NOT NULL,
        daily_damage INTEGER NOT NULL,
        started_date TEXT NOT NULL,
        days_elapsed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        last_loot INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sieges_active
        ON session_sieges(status, settlement_id);
    `);
    console.log('      session_sieges ready');
  }
};
