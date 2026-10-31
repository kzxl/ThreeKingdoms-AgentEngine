/**
 * Migration 042: real enterprise economics.
 *
 * `businesses` had no `tier`, so the monthly formula always read tier 1, and a
 * loss was clamped to zero. This migration adds the missing tier and a debt
 * column: a month that cannot cover wages + rent now carries the shortfall as
 * debt instead of silently forgiving it.
 */

function hasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some(row => row.name === column);
}

function addColumnIfMissing(db, table, column, ddl) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl};`);
}

module.exports = {
  id: '042-business-economics',
  description: 'Add business tier and debt so monthly P&L can be negative',
  up(db) {
    const hasBusinesses = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='businesses'")
      .get();
    if (!hasBusinesses) {
      console.log('      (businesses absent — nothing to migrate)');
      return;
    }

    addColumnIfMissing(db, 'businesses', 'tier', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfMissing(db, 'businesses', 'debt', 'INTEGER NOT NULL DEFAULT 0');

    // Existing rows keep their current output but are labelled tier 1. A
    // negative safe_cash from older experiments becomes explicit debt.
    db.exec(`
      UPDATE businesses SET tier = 1 WHERE tier IS NULL OR tier < 1;
      UPDATE businesses SET debt = ABS(safe_cash) WHERE safe_cash < 0 AND debt = 0;
      UPDATE businesses SET safe_cash = 0 WHERE safe_cash < 0;
    `);
  }
};
