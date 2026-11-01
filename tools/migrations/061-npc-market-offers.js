/**
 * Migration 061: NPC market offers.
 *
 * The stall lets NPCs buy from the player. This table is the other half: named
 * NPCs list their own surplus at a price band around the local market quote, and
 * the player can buy it. Offers are generated lazily per settlement and expire.
 */

module.exports = {
  id: '061-npc-market-offers',
  description: 'Add NPC market offers and purchase history',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS npc_market_offers (
        offer_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        npc_id TEXT NOT NULL,
        npc_name_vi TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity >= 0),
        unit_price INTEGER NOT NULL CHECK (unit_price > 0),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SOLD_OUT','EXPIRED')),
        created_date TEXT NOT NULL,
        expires_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS npc_market_sales (
        sale_id TEXT PRIMARY KEY,
        offer_id TEXT NOT NULL,
        npc_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit_price INTEGER NOT NULL,
        total_cash INTEGER NOT NULL,
        game_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_npc_offers_settlement
        ON npc_market_offers(settlement_id, status);
      CREATE INDEX IF NOT EXISTS idx_npc_sales_settlement
        ON npc_market_sales(npc_id, game_date);
    `);
  }
};
