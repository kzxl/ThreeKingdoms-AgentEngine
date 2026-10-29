/**
 * Migration 009: unify the chart of accounts.
 *
 * Historical journals used two vocabularies (`CASH-ON-HAND` / `EXP-OPERATING`
 * / `REV-SALES` and `101_TIEN_MAT` / `301_VON_CHU_SO_HUU`) alongside the
 * numeric chart. New postings use `ACCOUNT_CODES`; this migration rewrites the
 * archived rows so reports no longer split one account into two labels.
 * Debit/credit parity is unchanged, only the code label.
 */

const CODE_MAP = {
  'CASH-ON-HAND': '1001_CASH_MOBILE',
  'ASSET-CASH': '1001_CASH_MOBILE',
  '101_TIEN_MAT': '1001_CASH_MOBILE',
  'EXP-OPERATING': '6001_OPERATING_EXPENSE',
  'REV-SALES': '4001_SALES_REVENUE',
  'REV-TRADING': '4001_SALES_REVENUE',
  '5001_SALES_REVENUE': '4001_SALES_REVENUE',
  '301_VON_CHU_SO_HUU': '3001_OWNER_EQUITY'
};

module.exports = {
  id: '009-unify-account-codes',
  description: 'Rewrite legacy account_journal codes to the numeric chart',
  up(db) {
    const table = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='account_journal'")
      .get();
    if (!table) {
      console.log('      (account_journal absent — nothing to normalize)');
      return;
    }

    let changed = 0;
    const update = db.prepare('UPDATE account_journal SET account_code = ? WHERE account_code = ?');
    for (const [legacy, canonical] of Object.entries(CODE_MAP)) {
      changed += update.run(canonical, legacy).changes;
    }
    console.log(`      normalized ${changed} account_journal code(s)`);
  }
};
