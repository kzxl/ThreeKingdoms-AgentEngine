/**
 * Migration 014: fame-driven arrivals.
 *
 * Fame attracts volunteers and patrons. The log records who arrived, why
 * (fame tier), and what they brought; `player_state.militia` stores the
 * volunteers that joined the player's retinue.
 */

module.exports = {
  id: '014-fame-arrivals',
  description: 'Add player militia and the monthly fame-arrival log',
  up(db) {
    const hasPlayer = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_state'")
      .get();
    if (!hasPlayer) {
      console.log('      (player_state absent — nothing to migrate)');
      return;
    }

    const columns = db.prepare('PRAGMA table_info(player_state)').all().map(row => row.name);
    if (!columns.includes('militia')) {
      db.exec('ALTER TABLE player_state ADD COLUMN militia INTEGER NOT NULL DEFAULT 0;');
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS fame_arrivals (
        arrival_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        game_date TEXT NOT NULL,
        fame_at_arrival INTEGER NOT NULL,
        tier_code TEXT NOT NULL,
        kind TEXT NOT NULL,
        name_vi TEXT NOT NULL,
        name_en TEXT NOT NULL,
        militia INTEGER NOT NULL DEFAULT 0,
        grain_gift REAL NOT NULL DEFAULT 0,
        narrative_vi TEXT,
        narrative_en TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('      fame arrivals ready');
  }
};
