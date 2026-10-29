/**
 * Canonical chart-of-accounts codes for player bookkeeping.
 *
 * The numeric chart (`1001_...`) is canonical. Older rows used `CASH-ON-HAND`,
 * `EXP-OPERATING`, `REV-SALES`, `REV-TRADING`, `ASSET-CASH`, `101_TIEN_MAT`,
 * `301_VON_CHU_SO_HUU` and `5001_SALES_REVENUE`; migration 009 rewrites those
 * rows, and `canonicalAccountCode()` remains the reporting bridge for any
 * external/legacy data.
 */

export const ACCOUNT_CODES = {
  cashMobile: '1001_CASH_MOBILE',
  cashSafe: '1002_CASH_SAFE',
  accountsReceivable: '1003_ACCOUNTS_RECEIVABLE',
  inventory: '1201_INVENTORY',
  accountsPayable: '2001_ACCOUNTS_PAYABLE',
  ownerEquity: '3001_OWNER_EQUITY',
  salesRevenue: '4001_SALES_REVENUE',
  financialIncome: '4002_FINANCIAL_INCOME',
  financialExpense: '5002_FINANCIAL_EXPENSE',
  operatingExpense: '6001_OPERATING_EXPENSE',
  bountyIncome: '7001_BOUNTY_INCOME'
} as const;

export type AccountCode = typeof ACCOUNT_CODES[keyof typeof ACCOUNT_CODES];

/** Legacy code -> canonical code, for reporting and migrations. */
export const ACCOUNT_ALIASES: Readonly<Record<string, string>> = {
  'CASH-ON-HAND': ACCOUNT_CODES.cashMobile,
  'ASSET-CASH': ACCOUNT_CODES.cashMobile,
  '101_TIEN_MAT': ACCOUNT_CODES.cashMobile,
  'EXP-OPERATING': ACCOUNT_CODES.operatingExpense,
  'REV-SALES': ACCOUNT_CODES.salesRevenue,
  'REV-TRADING': ACCOUNT_CODES.salesRevenue,
  '5001_SALES_REVENUE': ACCOUNT_CODES.salesRevenue,
  '301_VON_CHU_SO_HUU': ACCOUNT_CODES.ownerEquity
};

export function canonicalAccountCode(code: string): string {
  return ACCOUNT_ALIASES[code] || code;
}
