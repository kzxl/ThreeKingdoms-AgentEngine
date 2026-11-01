/**
 * Player vitals: one damage path and one death transition.
 *
 * Every combat/injury/disease path calls `applyPlayerDamage` instead of writing
 * inconsistent `MAX(1|20|25, ...)` clamps. Health may reach 0; when it does, the
 * existing `BattleDuelService.applyPlayerDeath` runs succession or DEFEATED.
 */

import { DatabaseService } from '../../core/database';

export interface PlayerDamageInput {
  healthLoss: number;
  fatigueGain?: number;
  moraleLoss?: number;
  reason: string;
}

export interface PlayerDamageResult {
  health: number;
  died: boolean;
  succession?: boolean;
  heirId?: string;
}

export function applyPlayerDamage(
  db: DatabaseService,
  playerId: string,
  input: PlayerDamageInput
): PlayerDamageResult {
  const player = db.queryOne<{ health: number | null; fatigue: number | null; morale: number | null }>(
    'SELECT health, fatigue, morale FROM player_state WHERE player_id = ? LIMIT 1;',
    [playerId]
  );
  if (!player) throw new Error(`Không tìm thấy nhân vật ${playerId}.`);

  const health = Math.max(0, Number(player.health ?? 100) - Math.max(0, Number(input.healthLoss) || 0));
  const fatigue = Math.min(100, Number(player.fatigue ?? 0) + Math.max(0, Number(input.fatigueGain) || 0));
  const morale = Math.max(0, Math.min(100, Number(player.morale ?? 50) - Math.max(0, Number(input.moraleLoss) || 0)));
  db.execute(
    'UPDATE player_state SET health = ?, fatigue = ?, morale = ? WHERE player_id = ?;',
    [health, fatigue, morale, playerId]
  );

  if (health > 0) return { health, died: false };

  const meta = db.queryOne<{ status: string }>('SELECT status FROM campaign_meta LIMIT 1;');
  if (meta && meta.status !== 'ACTIVE') return { health, died: true };

  try {
    // Lazy require avoids a module cycle: BattleDuelService imports
    // ConditionService, which imports this helper.
    const { BattleDuelService } = require('./battle-duel.service') as typeof import('./battle-duel.service');
    const result = BattleDuelService.forDatabase(db).applyPlayerDeath(playerId, input.reason);
    return {
      health,
      died: true,
      succession: result.succession,
      heirId: result.heirId
    };
  } catch (error) {
    console.warn('[player-vitals] death transition failed:', (error as Error).message);
    return { health, died: true };
  }
}
