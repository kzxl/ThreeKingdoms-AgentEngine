/**
 * Migration 046: persistent injuries and conditions.
 *
 * Combat used to leave no lasting mark: single combat floored health at 20 and
 * enemy death was only a sentence. A condition row records an injury with a
 * severity, a combat penalty and a recovery timer, so a hard fight has a cost
 * beyond the immediate round.
 */

module.exports = {
  id: '046-conditions',
  description: 'Add persistent injuries with combat penalties and recovery',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS conditions (
        condition_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        condition_type TEXT NOT NULL DEFAULT 'INJURY',
        severity INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),
        stat_penalty INTEGER NOT NULL DEFAULT 0 CHECK (stat_penalty >= 0),
        source TEXT,
        game_date TEXT NOT NULL,
        days_remaining INTEGER NOT NULL DEFAULT 0 CHECK (days_remaining >= 0),
        narrative_vi TEXT,
        narrative_en TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_conditions_character_active
        ON conditions(character_id, is_active, days_remaining);
    `);
  }
};
