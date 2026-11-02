/**
 * Migration 052: settlement treasury ledger.
 *
 * Faction treasuries have a ledger after 051; settlement treasuries (looted on
 * conquest, seeded with local cash) did not. This adds the same opening + flow
 * contract for every settlement.
 */

module.exports = {
  id: '052-settlement-ledger',
  description: 'Add a settlement treasury ledger with opening balances',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settlement_ledger (
        entry_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        game_date TEXT NOT NULL,
        category TEXT NOT NULL,
        counterparty TEXT,
        inflow INTEGER NOT NULL DEFAULT 0 CHECK (inflow >= 0),
        outflow INTEGER NOT NULL DEFAULT 0 CHECK (outflow >= 0),
        balance_after INTEGER NOT NULL,
        memo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_settlement_ledger_settlement
        ON settlement_ledger(settlement_id, entry_id);
    `);

    const hasSettlements = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='session_settlements'"
    ).get();
    if (!hasSettlements) return;

    const settlements = db.prepare('SELECT settlement_id, treasury_cash FROM session_settlements;').all();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO settlement_ledger
        (entry_id, settlement_id, game_date, category, counterparty, inflow, outflow, balance_after, memo)
      VALUES (?, ?, ?, 'OPENING', 'Khởi tạo', ?, 0, ?, 'Số dư ngân khố thành trì đầu kỳ');
    `);
    const date = db.prepare('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;').get()?.d || '184-05-02';
    for (const settlement of settlements) {
      insert.run(
        `SLE-OPEN-${settlement.settlement_id}`,
        settlement.settlement_id,
        date,
        Number(settlement.treasury_cash || 0),
        Number(settlement.treasury_cash || 0)
      );
    }
  }
};
