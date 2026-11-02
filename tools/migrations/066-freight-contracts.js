/**
 * Migration 066: freight contracts.
 *
 * NPCs in a deficit settlement hire the player to move goods from a surplus
 * settlement. The cargo belongs to the issuer; the player pays the escort fee
 * and receives the reward on delivery.
 */

module.exports = {
  id: '066-freight-contracts',
  description: 'Add NPC freight contracts and shipments',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS freight_contracts (
        contract_id TEXT PRIMARY KEY,
        issuer_npc_id TEXT NOT NULL,
        issuer_name_vi TEXT NOT NULL,
        from_settlement_id TEXT NOT NULL,
        to_settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        reward_cash INTEGER NOT NULL CHECK (reward_cash > 0),
        penalty_cash INTEGER NOT NULL DEFAULT 0,
        deadline TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN'
          CHECK (status IN ('OPEN','ACCEPTED','DELIVERED','FAILED','EXPIRED')),
        accepted_by TEXT,
        accepted_date TEXT,
        delivered_date TEXT,
        created_date TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS freight_shipments (
        shipment_id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        from_settlement_id TEXT NOT NULL,
        to_settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        days_remaining INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'EN_ROUTE'
          CHECK (status IN ('EN_ROUTE','ARRIVED','DELIVERED','FAILED')),
        reward_cash INTEGER NOT NULL,
        penalty_cash INTEGER NOT NULL DEFAULT 0,
        guard_tier TEXT NOT NULL,
        guard_fee INTEGER NOT NULL DEFAULT 0,
        created_date TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_freight_contracts_status
        ON freight_contracts(to_settlement_id, status);
      CREATE INDEX IF NOT EXISTS idx_freight_shipments_status
        ON freight_shipments(owner_id, status);
    `);
  }
};
