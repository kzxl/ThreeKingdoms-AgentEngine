/**
 * Condition bridge for the CommonJS month close.
 *
 * One month heals every active injury (a 10/20/30-day wound is at most one
 * month); the TypeScript ConditionService owns the rule.
 */

const contexts = new Map();

function getService(dbPath) {
  const key = dbPath || '__default__';
  const existing = contexts.get(key);
  if (existing) return existing;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { ConditionService } = require('../src/modules/military/condition.service.ts');
    const service = ConditionService.forDatabase(DatabaseService.getInstance(dbPath));
    contexts.set(key, service);
    return service;
  } catch (error) {
    return null;
  }
}

function recoverMonth(dbPath) {
  const service = getService(dbPath);
  if (!service) return 0;
  try {
    return service.recoverMonthly();
  } catch (error) {
    return 0;
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

module.exports = { recoverMonth, close };
