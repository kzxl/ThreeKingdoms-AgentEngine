/**
 * Migration 044: periodic obligations (taxes and fees).
 *
 * The economy had recurring costs only inside the enterprise P&L. This table
 * adds player-level dues with a due date: the player can pay them (a decision),
 * and an unpaid due obligation becomes OVERDUE with a late fee and a
 * credibility loss at month close.
 */

module.exports = {
  id: '044-obligations',
  description: 'Add periodic player obligations with due dates and penalties',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS obligations (
        obligation_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL DEFAULT 'PLY-0001',
        obligation_type TEXT NOT NULL,
        counterparty TEXT NOT NULL,
        settlement_id TEXT,
        amount_cash INTEGER NOT NULL DEFAULT 0 CHECK (amount_cash >= 0),
        amount_grain REAL NOT NULL DEFAULT 0 CHECK (amount_grain >= 0),
        issued_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE', 'PAID', 'OVERDUE', 'WAIVED')),
        paid_date TEXT,
        breakdown_json TEXT,
        penalty_json TEXT,
        narrative_vi TEXT,
        narrative_en TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_obligations_character_status
        ON obligations(character_id, status, due_date);
    `);
  }
};
