/**
 * Migration 051: faction/world treasury ledger.
 *
 * Faction treasuries were mutated directly in eight places (tax, tribute,
 * caravan settlement, farm rent, officer rewards) with no counterpart. This
 * table gives every faction a running ledger and an OPENING row equal to the
 * current treasury, so the auditor can prove:
 *
 *     opening + sum(inflow) - sum(outflow) = treasury_cash
 */

module.exports = {
  id: '051-faction-ledger',
  description: 'Add a double-entry faction treasury ledger with opening balances',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS faction_ledger (
        entry_id TEXT PRIMARY KEY,
        faction_id TEXT NOT NULL,
        game_date TEXT NOT NULL,
        category TEXT NOT NULL,
        counterparty TEXT,
        inflow INTEGER NOT NULL DEFAULT 0 CHECK (inflow >= 0),
        outflow INTEGER NOT NULL DEFAULT 0 CHECK (outflow >= 0),
        balance_after INTEGER NOT NULL,
        memo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_faction_ledger_faction
        ON faction_ledger(faction_id, entry_id);
    `);

    const hasFactions = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='session_factions'"
    ).get();
    if (!hasFactions) return;

    const factions = db.prepare('SELECT faction_id, treasury_cash FROM session_factions;').all();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO faction_ledger
        (entry_id, faction_id, game_date, category, counterparty, inflow, outflow, balance_after, memo)
      VALUES (?, ?, ?, 'OPENING', 'Khởi tạo', ?, 0, ?, 'Số dư ngân khố đầu kỳ');
    `);
    const date = db.prepare('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;').get()?.d || '184-05-02';
    for (const faction of factions) {
      insert.run(
        `FLE-OPEN-${faction.faction_id}`,
        faction.faction_id,
        date,
        Number(faction.treasury_cash || 0),
        Number(faction.treasury_cash || 0)
      );
    }
  }
};
