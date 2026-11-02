/**
 * Obligation bridge for the CommonJS month close.
 *
 * The TypeScript ObligationService owns the rules; this adapter lets
 * `GameplayManager.closeMonth` process overdue bills and issue the next month's
 * tax without importing TypeScript directly.
 */

const contexts = new Map();

function getService(dbPath) {
  const key = dbPath || '__default__';
  const existing = contexts.get(key);
  if (existing) return existing;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { ObligationService } = require('../src/modules/economy/obligation.service.ts');
    const service = ObligationService.forDatabase(DatabaseService.getInstance(dbPath));
    contexts.set(key, service);
    return service;
  } catch (error) {
    return null;
  }
}

/**
 * Month-close hook: penalise bills that passed their due date, then issue the
 * tax for the month being entered. Returns null when the service or table is
 * unavailable (older save, minimal test database).
 */
function processMonthClose(dbPath, playerId = 'PLY-0001', closedDate, nextDate) {
  const service = getService(dbPath);
  if (!service) return null;
  try {
    const overdue = service.processDue(playerId, closedDate);
    const issued = service.ensureMonthly(playerId, nextDate);
    return {
      overdue,
      issued,
      summary: service.summary(playerId, nextDate)
    };
  } catch (error) {
    return null;
  }
}

function close() {
  if (contexts.size === 0) return;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    for (const key of contexts.keys()) {
      if (key !== '__default__') DatabaseService.closePath(key);
    }
  } catch (error) {
    // bridge may not have loaded tsx
  }
  contexts.clear();
}

module.exports = { processMonthClose, close };
