/**
 * Contract board bridge for the CommonJS month close.
 *
 * Expires overdue delivery contracts (creating penalty obligations) and posts
 * the next month's three offers for the player's settlement.
 */

const contexts = new Map();

function getService(dbPath) {
  const key = dbPath || '__default__';
  const existing = contexts.get(key);
  if (existing) return existing;
  try {
    require('tsx/cjs');
    const { DatabaseService } = require('../src/core/database.ts');
    const { ContractBoardService } = require('../src/modules/economy/contract-board.service.ts');
    const service = ContractBoardService.forDatabase(DatabaseService.getInstance(dbPath));
    contexts.set(key, service);
    return service;
  } catch (error) {
    return null;
  }
}

function processMonthClose(dbPath, playerId = 'PLY-0001', closedDate, nextDate) {
  const service = getService(dbPath);
  if (!service) return null;
  try {
    return service.monthClose(playerId, closedDate, nextDate);
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
