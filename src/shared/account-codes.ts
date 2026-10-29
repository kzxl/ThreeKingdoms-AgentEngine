/**
 * Canonical chart-of-accounts codes for player bookkeeping.
 *
 * Historical journals contain two vocabularies (`1001_CASH_MOBILE` vs
 * `CASH-ON-HAND`, `6001_OPERATING_EXPENSE` vs `EXP-OPERATING`). New postings
 * should use these constants; `canonicalAccountCode()` maps the legacy aliases
 * for reports without rewriting history.
 */

export const ACCOUNT_CODES = {
  cashOnHand: 'CASH-ON-HAND',
  cashMobile: '1001_CASH_MOBILE',
  cashSafe: '1002_CASH_SAFE',
  accountsReceivable: '1003_ACCOUNTS_RECEIVABLE',
  accountsPayable: '2001_ACCOUNTS_PAYABLE',
  ownerEquity: '3001_OWNER_EQUITY',
  inventory: '1201_INVENTORY',
  salesRevenue: '4001_SALES_REVENUE',
  financialIncome: '4002_FINANCIAL_INCOME',
  salesRevenueSecondary: '5001_SALES_REVENUE',
  financialExpense: '5002_FINANCIAL_EXPENSE',
  operatingExpense: '6001_OPERATING_EXPENSE',
  bountyIncome: '7001_BOUNTY_INCOME'
} as const;

export type AccountCode = typeof ACCOUNT_CODES[keyof typeof ACCOUNT_CODES];

/** Legacy code -> canonical code, for reporting and migrations. */
export const ACCOUNT_ALIASES: Readonly<Record<string, string>> = {
  '101_TIEN_MAT': ACCOUNT_CODES.cashOnHand,
  'ASSET-CASH': ACCOUNT_CODES.cashOnHand,
  'EXP-OPERATING': ACCOUNT_CODES.operatingExpense,
  'REV-SALES': ACCOUNT_CODES.salesRevenue,
  'REV-TRADING': ACCOUNT_CODES.salesRevenue,
  '301_VON_CHU_SO_HUU': ACCOUNT_CODES.ownerEquity
};

export function canonicalAccountCode(code: string): string {
  return ACCOUNT_ALIASES[code] || code;
}
