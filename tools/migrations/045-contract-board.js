/**
 * Migration 045: repeatable delivery contracts.
 *
 * Questlines are one-shot content. This table adds a rotating local board:
 * merchants post offers, the player accepts one, delivers the goods before the
 * deadline, and an expired contract becomes a penalty obligation.
 */

module.exports = {
  id: '045-contract-board',
  description: 'Add rotating contract offers and accepted player contracts',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contract_offers (
        offer_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        reward_cash INTEGER NOT NULL CHECK (reward_cash >= 0),
        reward_fame INTEGER NOT NULL DEFAULT 0 CHECK (reward_fame >= 0),
        penalty_cash INTEGER NOT NULL DEFAULT 0 CHECK (penalty_cash >= 0),
        deadline_days INTEGER NOT NULL DEFAULT 15 CHECK (deadline_days > 0),
        issued_date TEXT NOT NULL,
        expires_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACCEPTED', 'EXPIRED')),
        narrative_vi TEXT,
        narrative_en TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_contract_offers_settlement
        ON contract_offers(settlement_id, status, expires_date);

      CREATE TABLE IF NOT EXISTS player_contracts (
        contract_id TEXT PRIMARY KEY,
        offer_id TEXT NOT NULL UNIQUE,
        player_id TEXT NOT NULL DEFAULT 'PLY-0001',
        settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        reward_cash INTEGER NOT NULL DEFAULT 0 CHECK (reward_cash >= 0),
        reward_fame INTEGER NOT NULL DEFAULT 0 CHECK (reward_fame >= 0),
        penalty_cash INTEGER NOT NULL DEFAULT 0 CHECK (penalty_cash >= 0),
        accepted_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DELIVERED', 'EXPIRED')),
        delivered_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_player_contracts_status
        ON player_contracts(player_id, status, due_date);
    `);
  }
};
