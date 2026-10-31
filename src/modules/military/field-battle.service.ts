/**
 * ThreeKingdoms-AgentEngine: Field Battle on Hostile Arrival
 * (src/modules/military/field-battle.service.ts)
 *
 * When a marching expedition reaches a settlement owned by a faction at war
 * with its commander, the defender's garrison meets it in the field before the
 * city can be invested. The tactical engine resolves the battle; surviving
 * attackers continue to ARRIVED, a defeat ends the expedition.
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';
import { TacticalBattleEngine, BattleResult, TerrainType } from './tactical-battle';

export interface FieldBattleOutcome {
  battle: boolean;
  expeditionStatus?: 'ARRIVED' | 'CONCLUDED';
  result?: BattleResult;
  reason?: string;
  captured?: boolean;
}

export class FieldBattleService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): FieldBattleService {
    return new FieldBattleService(db);
  }

  public resolveArrival(expeditionId: string, gameDate: string): FieldBattleOutcome {
    const expedition = this.db.queryOne<any>(
      'SELECT * FROM military_expeditions WHERE expedition_id = ? LIMIT 1;',
      [expeditionId]
    );
    if (!expedition || String(expedition.status) !== 'MARCHING') {
      return { battle: false, reason: 'not-marching' };
    }

    const settlement = this.db.queryOne<any>(
      'SELECT * FROM session_settlements WHERE settlement_id = ? LIMIT 1;',
      [expedition.target_settlement_id]
    );
    if (!settlement) return { battle: false, reason: 'no-target' };

    const attackerFaction = this.db.queryOne<{ faction_id: string; leader_id: string }>(
      `SELECT faction_id, leader_id FROM session_factions WHERE leader_id = ? AND is_active = 1 LIMIT 1;`,
      [expedition.commander_id]
    );
    if (!attackerFaction?.faction_id) return { battle: false, reason: 'no-faction' };
    if (settlement.ruler_faction_id === attackerFaction.faction_id) {
      return { battle: false, reason: 'friendly-city' };
    }

    const war = this.db.queryOne<any>(
      `SELECT 1 AS ok FROM faction_diplomacy
       WHERE relation_state = 'WAR'
         AND ((faction_id_a = ? AND faction_id_b = ?) OR (faction_id_a = ? AND faction_id_b = ?))
       LIMIT 1;`,
      [attackerFaction.faction_id, settlement.ruler_faction_id, settlement.ruler_faction_id, attackerFaction.faction_id]
    );
    if (!war) return { battle: false, reason: 'not-at-war' };

    const attacker = this.resolveAttacker(expedition.commander_id);
    const defender = this.resolveDefender(settlement);

    const attackerTroops = Math.max(1, Math.round(Number(expedition.troop_count) || 0));
    const defenderTroops = Math.max(1, Math.round(Number(settlement.garrison_troops) || 0));

    const result = TacticalBattleEngine.simulate({
      battleId: `FIELD-${expeditionId}-${gameDate}`,
      terrain: this.resolveTerrain(expedition.route_id),
      attacker: {
        commander: attacker,
        vanguardTroops: Math.round(attackerTroops * 0.4),
        centerTroops: Math.round(attackerTroops * 0.4),
        rearguardTroops: Math.max(1, attackerTroops - Math.round(attackerTroops * 0.8))
      },
      defender: {
        commander: defender.commander,
        vanguardTroops: Math.round(defenderTroops * 0.4),
        centerTroops: Math.round(defenderTroops * 0.4),
        rearguardTroops: Math.max(1, defenderTroops - Math.round(defenderTroops * 0.8)),
        initialMorale: 90
      }
    });

    const attackerSurvivors = Math.max(0, Number(result.attackerFinalTroops || 0));
    const defenderSurvivors = Math.max(0, Number(result.defenderFinalTroops || 0));
    const attackerWon = result.winner === 'ATTACKER';
    const isPlayerAttack = attackerFaction.leader_id === 'PLY-0001';
    const captured = attackerWon && !isPlayerAttack;
    const status = captured ? 'CONCLUDED' : (attackerWon ? 'ARRIVED' : 'CONCLUDED');

    this.db.transaction(() => {
      this.db.execute(
        'UPDATE military_expeditions SET troop_count = ?, status = ? WHERE expedition_id = ?;',
        [attackerSurvivors, status, expeditionId]
      );
      if (captured) {
        // AI conquerors install their commander and leave the survivors behind.
        this.db.execute(
          `UPDATE session_settlements
           SET ruler_faction_id = ?, governor_id = ?, garrison_troops = ?,
               defense = 30, public_order = MAX(20, public_order - 20)
           WHERE settlement_id = ?;`,
          [attackerFaction.faction_id, expedition.commander_id, attackerSurvivors, settlement.settlement_id]
        );
      } else {
        this.db.execute(
          'UPDATE session_settlements SET garrison_troops = ? WHERE settlement_id = ?;',
          [defenderSurvivors, settlement.settlement_id]
        );
      }
    });

    if (captured) this.recordAiConquest(expedition, settlement, attackerFaction, attackerSurvivors, gameDate);

    return { battle: true, expeditionStatus: status, result, captured };
  }

  private resolveAttacker(commanderId: string): { id: string; name: string; war: number; leadership: number; intelligence: number } {
    if (commanderId === 'PLY-0001') {
      const player = this.db.queryOne<any>(
        `SELECT name, war_attr, ldr_attr, int_attr FROM player_state WHERE player_id = ? LIMIT 1;`,
        [commanderId]
      ) || {};
      return {
        id: commanderId,
        name: String(player.name || 'Lương Diễn'),
        war: Number(player.war_attr || 60),
        leadership: Number(player.ldr_attr || 60),
        intelligence: Number(player.int_attr || 60)
      };
    }
    try {
      const npc = this.db.queryOne<any>(
        'SELECT name, war_attr, ldr_attr, int_attr FROM npc_state WHERE npc_id = ? LIMIT 1;',
        [commanderId]
      );
      const master = npc ? null : this.db.queryOne<any>(
        'SELECT name_vi AS name, war_attr, ldr_attr, int_attr FROM master_characters WHERE npc_id = ? LIMIT 1;',
        [commanderId]
      );
      const row = npc || master;
      return {
        id: commanderId,
        name: String(row?.name || 'Tướng Lĩnh Địch'),
        war: Number(row?.war_attr || 65),
        leadership: Number(row?.ldr_attr || 65),
        intelligence: Number(row?.int_attr || 60)
      };
    } catch {
      return { id: commanderId, name: 'Tướng Lĩnh Địch', war: 65, leadership: 65, intelligence: 60 };
    }
  }

  private recordAiConquest(expedition: any, settlement: any, faction: any, troops: number, gameDate: string): void {
    try {
      const meta = this.db.queryOne<{ active_turn: number }>(
        'SELECT active_turn FROM campaign_meta LIMIT 1;'
      );
      this.db.execute(
        `INSERT OR REPLACE INTO faction_political_events
           (event_id, turn_number, game_date, event_type, source_faction_id, target_faction_id,
            instigator_officer_id, title_vi, narrative_vi, consequences_json)
         VALUES (?, ?, ?, 'AI_CONQUEST', ?, ?, ?, ?, ?, ?);`,
        [
          nextId(this.db, 'faction-event', 'FPE', gameDate),
          Number(meta?.active_turn || 1),
          gameDate,
          faction.faction_id,
          settlement.ruler_faction_id || null,
          expedition.commander_id,
          `${faction.faction_id} chiếm ${settlement.name_vi}`,
          `Quân ${faction.faction_id} đánh bại đồn trú ${settlement.name_vi}; ${troops} quân sống sót chiếm thành.`,
          JSON.stringify({ settlementId: settlement.settlement_id, troops })
        ]
      );
    } catch {
      // The capture stands even if the chronicle row cannot be written.
    }
  }

  private resolveDefender(settlement: any): { commander: { id: string; name: string; war: number; leadership: number; intelligence: number } } {
    const fallback = {
      id: String(settlement.governor_id || 'DEFENDER'),
      name: 'Thủ Tướng Địch',
      war: 65,
      leadership: 65,
      intelligence: 60
    };
    try {
      const faction = this.db.queryOne<any>(
        'SELECT leader_id, name_vi FROM session_factions WHERE faction_id = ? LIMIT 1;',
        [settlement.ruler_faction_id]
      );
      const id = settlement.governor_id || faction?.leader_id;
      if (!id) return { commander: { ...fallback, name: faction?.name_vi || fallback.name } };
      const npc = this.db.queryOne<any>(
        'SELECT name, war_attr, ldr_attr, int_attr FROM npc_state WHERE npc_id = ? LIMIT 1;',
        [id]
      );
      const master = npc ? null : this.db.queryOne<any>(
        'SELECT name_vi AS name, war_attr, ldr_attr, int_attr FROM master_characters WHERE npc_id = ? LIMIT 1;',
        [id]
      );
      const row = npc || master;
      if (!row) return { commander: { ...fallback, id, name: faction?.name_vi || fallback.name } };
      return {
        commander: {
          id,
          name: String(row.name || faction?.name_vi || fallback.name),
          war: Number(row.war_attr || 60),
          leadership: Number(row.ldr_attr || 60),
          intelligence: Number(row.int_attr || 60)
        }
      };
    } catch {
      return { commander: fallback };
    }
  }

  private resolveTerrain(routeId: string | null): TerrainType {
    if (!routeId) return 'PLAINS';
    try {
      const route = this.db.queryOne<{ terrain_type: string }>(
        'SELECT terrain_type FROM master_routes WHERE route_id = ? LIMIT 1;',
        [routeId]
      );
      const map: Record<string, TerrainType> = {
        PLAINS: 'PLAINS',
        MOUNTAIN_PASS: 'MOUNTAINS',
        RIVER_WATERWAY: 'RIVER_MARSH',
        PLANK_ROAD: 'HILLS'
      };
      return map[String(route?.terrain_type || 'PLAINS')] || 'PLAINS';
    } catch {
      return 'PLAINS';
    }
  }
}
