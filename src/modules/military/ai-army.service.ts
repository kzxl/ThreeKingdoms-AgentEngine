/**
 * ThreeKingdoms-AgentEngine: AI War Dispatch
 * (src/modules/military/ai-army.service.ts)
 *
 * Once per month, every active AI faction at war may send one expedition from
 * its capital against the weakest enemy settlement. The existing march clock and
 * FieldBattleService resolve the movement and the battle, so AI armies use the
 * same rules as the player's.
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { NODE_TO_LOC_MAP } from '../ecology-logistics/spatial-registry';

const MIN_MILITARY_POWER = 800;
const MAX_TROOPS = 2000;

export interface AiDispatchSummary {
  factionId: string;
  factionName: string;
  expeditionId: string;
  targetSettlementId: string;
  troops: number;
  marchDays: number;
}

export class AiArmyService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): AiArmyService {
    return new AiArmyService(db);
  }

  public simulateMonthly(turnNumber: number, gameDate: string): AiDispatchSummary[] {
    const factions = this.db.query<any>(
      `SELECT * FROM session_factions WHERE is_active = 1 AND leader_id != 'PLY-0001';`
    );
    const dispatched: AiDispatchSummary[] = [];

    for (const faction of factions) {
      if (Number(faction.military_power || 0) < MIN_MILITARY_POWER) continue;
      if (!faction.leader_id) continue;

      const busy = this.db.queryOne<any>(
        `SELECT 1 AS ok FROM military_expeditions
         WHERE commander_id = ? AND status IN ('MARCHING', 'ARRIVED', 'BESIEGING') LIMIT 1;`,
        [faction.leader_id]
      );
      if (busy) continue;

      const enemies = new Set(
        this.db.query<{ faction_id: string }>(
          `SELECT CASE WHEN faction_id_a = ? THEN faction_id_b ELSE faction_id_a END AS faction_id
           FROM faction_diplomacy
           WHERE relation_state = 'WAR' AND (faction_id_a = ? OR faction_id_b = ?);`,
          [faction.faction_id, faction.faction_id, faction.faction_id]
        ).map(row => row.faction_id)
      );
      if (enemies.size === 0) continue;

      const capital = faction.capital_settlement_id;
      // arch-guard:allow-sql-interpolation — placeholders only, one per enemy faction id.
      const targets = this.db.query<any>(
        `SELECT settlement_id, name_vi, defense, garrison_troops, ruler_faction_id
         FROM session_settlements
         WHERE ruler_faction_id IN (${[...enemies].map(() => '?').join(', ')})
           AND settlement_id != ?
         ORDER BY defense ASC, garrison_troops ASC LIMIT 1;`,
        [...enemies, capital]
      );
      const target = targets[0];
      if (!target) continue;

      const troops = Math.min(MAX_TROOPS, Math.max(150, Math.round(Number(faction.military_power) * 0.25)));
      const marchDays = this.resolveMarchDays(capital, target.settlement_id);
      const arrivalDate = this.addDays(gameDate, marchDays);
      const expeditionId = nextId(this.db, 'expedition', 'EXP', gameDate);

      this.db.execute(
        `INSERT INTO military_expeditions
           (expedition_id, commander_id, origin_settlement_id, target_settlement_id,
            troop_count, grain_supply_days, is_supplied, status, created_turn, game_date,
            route_id, march_days, days_remaining, arrival_date)
         VALUES (?, ?, ?, ?, ?, ?, 1, 'MARCHING', ?, ?, NULL, ?, ?, ?);`,
        [
          expeditionId,
          faction.leader_id,
          capital,
          target.settlement_id,
          troops,
          marchDays,
          turnNumber,
          gameDate,
          marchDays,
          marchDays,
          arrivalDate
        ]
      );

      dispatched.push({
        factionId: faction.faction_id,
        factionName: faction.name_vi,
        expeditionId,
        targetSettlementId: target.settlement_id,
        troops,
        marchDays
      });
    }

    return dispatched;
  }

  private resolveMarchDays(originSettlement: string, targetSettlement: string): number {
    const origin = NODE_TO_LOC_MAP[originSettlement] || originSettlement;
    const target = NODE_TO_LOC_MAP[targetSettlement] || targetSettlement;
    try {
      const route = this.db.queryOne<any>(
        `SELECT standard_march_days FROM master_routes
         WHERE (source_location_id = ? AND target_location_id = ?)
            OR (source_location_id = ? AND target_location_id = ?)
         LIMIT 1;`,
        [origin, target, target, origin]
      );
      return Math.max(1, Math.round(Number(route?.standard_march_days) || 5));
    } catch {
      return 5;
    }
  }

  private addDays(dateStr: string, days: number): string {
    const [year, month, day] = String(dateStr || getGameDate(this.db)).split('-').map(Number);
    const total = year * 360 + (month - 1) * 30 + (day - 1) + Math.max(0, days);
    const nextYear = Math.floor(total / 360);
    const rem = total % 360;
    const nextMonth = Math.floor(rem / 30) + 1;
    const nextDay = (rem % 30) + 1;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
  }
}
