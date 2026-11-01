/**
 * Migration 060: player market stall and NPC buyers.
 *
 * The settlement market is an abstract counterparty. A stall is the concrete
 * player-facing shop: the player stocks goods, NPCs in the same settlement spend
 * their personal cash, and every sale is recorded with the buyer id.
 *
 * `npc_personal_progression` is seeded for every master character that lacks a
 * row, so ordinary officers can actually buy instead of only the ten original
 * economy NPCs.
 */

module.exports = {
  id: '060-market-stall',
  description: 'Add player stalls, listings, sales and NPC buyer cash',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_stalls (
        stall_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        settlement_id TEXT NOT NULL,
        name_vi TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
        created_date TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(owner_id, settlement_id)
      );

      CREATE TABLE IF NOT EXISTS stall_listings (
        listing_id TEXT PRIMARY KEY,
        stall_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity >= 0),
        unit_price INTEGER NOT NULL CHECK (unit_price > 0),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SOLD_OUT')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stall_id, item_code)
      );

      CREATE TABLE IF NOT EXISTS stall_sales (
        sale_id TEXT PRIMARY KEY,
        stall_id TEXT NOT NULL,
        npc_id TEXT NOT NULL,
        npc_name_vi TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit_price INTEGER NOT NULL,
        total_cash INTEGER NOT NULL,
        game_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_stall_listings_stall ON stall_listings(stall_id, status);
      CREATE INDEX IF NOT EXISTS idx_stall_sales_stall ON stall_sales(stall_id, game_date);
    `);

    const hasNpcProgress = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='npc_personal_progression'"
    ).get();
    const hasCharacters = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_characters'"
    ).get();
    if (hasNpcProgress && hasCharacters) {
      db.exec(`
        INSERT OR IGNORE INTO npc_personal_progression (npc_id, personal_cash)
        SELECT npc_id,
               200 + CAST((COALESCE(war_attr, 50) + COALESCE(int_attr, 50) + COALESCE(com_attr, 50)) * 3 AS INTEGER)
        FROM master_characters
        WHERE npc_id <> 'PLY-0001';
      `);
      console.log('      NPC buyer cash seeded for the master roster');
    }
  }
};
