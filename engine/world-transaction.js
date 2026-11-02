/**
 * Per-module atomicity for the month close.
 *
 * World modules use DatabaseService. Running each module inside one transaction
 * means a module that throws halfway rolls back all of its writes instead of
 * leaving a partially simulated turn. Cross-module atomicity is still handled by
 * `world_turn_ledger` + retry, but each module is now all-or-nothing.
 */

function getDatabaseService(dbPath) {
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    return DatabaseService.getInstance(dbPath);
  } catch (error) {
    return null;
  }
}

function runWorldTransaction(dbPath, fn) {
  const db = getDatabaseService(dbPath);
  if (!db) return fn();
  return db.transaction(fn);
}

module.exports = { runWorldTransaction };
