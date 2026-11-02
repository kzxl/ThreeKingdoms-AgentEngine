/**
 * Migration 049: close every cashflow row with a journal pair.
 *
 * The old wage/dividend/capital paths wrote `cashflow_ledger` without
 * `account_journal`. This backfills a balanced Dr/Cr pair for every orphan row
 * so the audit can require "every cashflow row has a journal set".
 */

function accountForInflow(category) {
  const value = String(category || '').toUpperCase();
  if (value.includes('LABOR_WAGE') || value.includes('WAGE')) return '4003_LABOR_INCOME';
  if (value.includes('DIVIDEND') || value.includes('FINANCIAL')) return '4002_FINANCIAL_INCOME';
  if (value.includes('SALES') || value.includes('TRADE') || value.includes('COMMERCIAL')) return '4001_SALES_REVENUE';
  return '7001_BOUNTY_INCOME';
}

function accountForOutflow(category) {
  const value = String(category || '').toUpperCase();
  if (value.includes('CAPITAL') || value.includes('INVEST')) return '1501_FIXED_ASSETS';
  return '6001_OPERATING_EXPENSE';
}

module.exports = {
  id: '049-ledger-completeness',
  description: 'Backfill a balanced journal pair for every cashflow row without one',
  up(db) {
    const hasCashflow = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='cashflow_ledger'").get();
    const hasJournal = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='account_journal'").get();
    if (!hasCashflow || !hasJournal) {
      console.log('      (cashflow/journal absent — nothing to backfill)');
      return;
    }

    const campaign = db.prepare('SELECT campaign_id FROM campaign_meta LIMIT 1;').get() || {};
    const rows = db.prepare(`
      SELECT c.* FROM cashflow_ledger c
      LEFT JOIN account_journal j ON c.txn_id = j.txn_id
      WHERE j.txn_id IS NULL;
    `).all();

    const insert = db.prepare(`
      INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
      VALUES (?, ?, ?, ?, ?, 0, ?), (?, ?, ?, ?, 0, ?, ?);
    `);

    let backfilled = 0;
    const tx = db.transaction(() => {
      for (const row of rows) {
        const inflow = Number(row.inflow || 0);
        const outflow = Number(row.outflow || 0);
        if (inflow <= 0 && outflow <= 0) continue;
        const amount = inflow > 0 ? inflow : outflow;
        const debitAccount = inflow > 0 ? '1001_CASH_MOBILE' : accountForOutflow(row.category);
        const creditAccount = inflow > 0 ? accountForInflow(row.category) : '1001_CASH_MOBILE';
        const memo = `Backfill journal for ${row.txn_id} (${row.category})`;
        insert.run(
          row.txn_id, campaign.campaign_id || null, row.game_date, debitAccount, amount, memo,
          row.txn_id, campaign.campaign_id || null, row.game_date, creditAccount, amount, memo
        );
        backfilled += 1;
      }
    });
    tx();
    console.log(`      journal backfilled for ${backfilled} cashflow row(s)`);
  }
};
