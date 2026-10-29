/**
 * ThreeKingdoms-AgentEngine: World Turn Ledger
 * (src/shared/turn-ledger.ts)
 *
 * The monthly world simulation (NPC lifecycle, faction politics, ecology) runs
 * outside the player-state transaction because each service owns its own
 * writes. To keep a retry safe, completion is recorded in the database per
 * (campaign, turn, module) *after* the module's writes succeed. The previous
 * in-memory `lastSimulatedTurn` flag was set before the writes, so a failed
 * module was skipped on retry and its work was silently lost.
 */

import { DatabaseService } from '../core/database';

export function ensureTurnLedger(db: DatabaseService): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_turn_ledger (
      campaign_id TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      module_id TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (campaign_id, turn_number, module_id)
    );
  `);
}

export function getCampaignId(db: DatabaseService): string {
  const row = db.queryOne<{ campaign_id: string }>(
    'SELECT campaign_id FROM campaign_meta LIMIT 1;'
  );
  return String(row?.campaign_id || 'CMP-184-ZHOU-01');
}

export function isTurnModuleDone(db: DatabaseService, turnNumber: number, moduleId: string): boolean {
  ensureTurnLedger(db);
  const row = db.queryOne<{ 1: number }>(
    'SELECT 1 FROM world_turn_ledger WHERE campaign_id = ? AND turn_number = ? AND module_id = ? LIMIT 1;',
    [getCampaignId(db), turnNumber, moduleId]
  );
  return Boolean(row);
}

export function markTurnModuleDone(db: DatabaseService, turnNumber: number, moduleId: string): void {
  ensureTurnLedger(db);
  db.execute(
    `INSERT OR IGNORE INTO world_turn_ledger (campaign_id, turn_number, module_id)
     VALUES (?, ?, ?);`,
    [getCampaignId(db), turnNumber, moduleId]
  );
}
