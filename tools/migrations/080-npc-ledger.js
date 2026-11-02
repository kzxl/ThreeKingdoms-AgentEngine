/**
 * Migration 080: append-only NPC cash/troop ledger.
 *
 * The NPC lifecycle used to add `personal_cash` and `personal_troops` without a
 * counterparty. This ledger records every mutation with the balance after it,
 * so the audit can prove `npc_personal_progression` matches the last entry.
 */

module.exports = {
  id: '080-npc-ledger',
  description: 'Add the NPC cash/troop ledger and opening balances',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS npc_ledger (
        entry_id TEXT PRIMARY KEY,
        npc_id TEXT NOT NULL,
        game_date TEXT NOT NULL,
        category TEXT NOT NULL,
        counterparty TEXT,
        delta_cash REAL NOT NULL DEFAULT 0,
        delta_troops REAL NOT NULL DEFAULT 0,
        balance_cash REAL NOT NULL,
        balance_troops REAL NOT NULL,
        memo_vi TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_npc_ledger_npc
        ON npc_ledger(npc_id, entry_id);
    `);

    const hasProgress = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='npc_personal_progression'"
    ).get();
    if (!hasProgress) return;
    const date = db.prepare('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;').get()?.d || '184-05-02';
    const rows = db.prepare(
      'SELECT npc_id, personal_cash, personal_troops FROM npc_personal_progression;'
    ).all();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO npc_ledger
        (entry_id, npc_id, game_date, category, counterparty, delta_cash, delta_troops,
         balance_cash, balance_troops, memo_vi)
      VALUES (?, ?, ?, 'OPENING', NULL, ?, ?, ?, ?, 'Số dư đầu kỳ');
    `);
    for (const row of rows) {
      insert.run(
        `NPL-OPEN-${row.npc_id}`,
        row.npc_id,
        date,
        Number(row.personal_cash || 0),
        Number(row.personal_troops || 0),
        Number(row.personal_cash || 0),
        Number(row.personal_troops || 0)
      );
    }
  }
};
