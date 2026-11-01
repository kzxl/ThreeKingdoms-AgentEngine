/**
 * Migration 062: per-NPC trade preferences.
 *
 * The stall and NPC offer prices used one settlement-wide band. This table lets
 * each NPC carry a bid/ask modifier per item category, generated lazily from
 * their attributes and then editable as data.
 */

module.exports = {
  id: '062-npc-trade-preferences',
  description: 'Add per-NPC category bid/ask preferences',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS npc_trade_preferences (
        npc_id TEXT NOT NULL,
        item_category TEXT NOT NULL,
        bid_multiplier REAL NOT NULL DEFAULT 1 CHECK (bid_multiplier > 0),
        ask_multiplier REAL NOT NULL DEFAULT 1 CHECK (ask_multiplier > 0),
        notes_vi TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (npc_id, item_category)
      );
    `);
  }
};
