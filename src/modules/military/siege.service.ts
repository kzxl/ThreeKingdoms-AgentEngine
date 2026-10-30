/**
 * ThreeKingdoms-AgentEngine: Multi-day Siege Service
 * (src/modules/military/siege.service.ts)
 *
 * A siege is a persistent state, not a single d20 roll. Each elapsed campaign
 * day reduces the defender's wall/garrision and the attacker's troops; the
 * settlement falls when the wall reaches the breach threshold or the garrison
 * is wiped out. Loot is written through the central financial transaction
 * helper, so Dr == Cr and the player cash row stay in sync.
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { recordFinancialTransaction } from '../../shared/financial-transaction';
import { applyVictoryIfEligible } from '../../shared/victory';
import { BattleDuelService } from './battle-duel.service';

export interface StartSiegeInput {
  settlementId: string;
  commanderId?: string;
  attackerTroops: number;
  gameDate?: string;
  expeditionId?: string;
  /** Tests pass false to keep siege math deterministic. */
  preBattle?: boolean;
}

export interface SiegeResolution {
  siegeId: string;
  settlementId: string;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'ABORTED';
  lootQian: number;
  defense: number;
  garrison: number;
  attackerTroops: number;
  aborted?: boolean;
  preBattle?: any;
}

export class SiegeService {
  constructor(private readonly db: DatabaseService) {
    this.ensureTable();
  }

  public static forDatabase(db: DatabaseService): SiegeService {
    return new SiegeService(db);
  }

  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_sieges (
        siege_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        commander_id TEXT NOT NULL,
        attacker_troops INTEGER NOT NULL,
        daily_damage INTEGER NOT NULL,
        started_date TEXT NOT NULL,
        days_elapsed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        last_loot INTEGER NOT NULL DEFAULT 0,
        expedition_id TEXT,
        prebattle_json TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public startSiege(input: StartSiegeInput): SiegeResolution {
    const settlementId = String(input.settlementId || '');
    const commanderId = input.commanderId || 'PLY-0001';
    let attackerTroops = Math.max(1, Math.round(Number(input.attackerTroops) || 0));
    if (!settlementId) throw new Error('settlementId is required.');

    const settlement = this.db.queryOne<any>(
      'SELECT * FROM session_settlements WHERE settlement_id = ?;',
      [settlementId]
    );
    if (!settlement) throw new Error(`Target settlement ${settlementId} not found.`);

    const playerFaction = this.getPlayerFaction();
    if (playerFaction && settlement.ruler_faction_id === playerFaction) {
      throw new Error('Không thể bao vây thành trì của chính phe mình.');
    }

    const commander = this.db.queryOne<any>(
      'SELECT name, war_attr, ldr_attr, dip_attr, fatigue, health FROM player_state WHERE player_id = ?;',
      [commanderId]
    );
    if (commander && Number(commander.fatigue) > 85) {
      throw new Error('Khí lực tướng soái kiệt quệ, không thể đốc thúc ba quân công thành!');
    }

    let expedition: any = null;
    if (input.expeditionId) {
      expedition = this.db.queryOne<any>(
        'SELECT * FROM military_expeditions WHERE expedition_id = ?;',
        [input.expeditionId]
      );
      if (!expedition) throw new Error(`Expedition ${input.expeditionId} not found.`);
      if (expedition.commander_id !== commanderId) {
        throw new Error('Viễn chinh này không do tướng soái hiện tại chỉ huy.');
      }
      if (expedition.status !== 'ARRIVED') {
        throw new Error(`Viễn chinh ${input.expeditionId} chưa tới nơi (trạng thái ${expedition.status}).`);
      }
      if (String(expedition.target_settlement_id) !== settlementId) {
        throw new Error('Viễn chinh đang ở trước cửa thành khác.');
      }
      attackerTroops = Math.max(1, Math.round(Number(expedition.troop_count) || 0));
    }

    const existing = this.db.queryOne<any>(
      `SELECT * FROM session_sieges WHERE settlement_id = ? AND status = 'ACTIVE' LIMIT 1;`,
      [settlementId]
    );
    if (existing) {
      return {
        siegeId: existing.siege_id,
        settlementId,
        status: 'ACTIVE',
        lootQian: 0,
        defense: Number(settlement.defense || 0),
        garrison: Number(settlement.garrison_troops || 0),
        attackerTroops: Number(existing.attacker_troops || 0)
      };
    }

    const gameDate = input.gameDate || getGameDate(this.db);

    // Pre-battle layer: negotiation and a champion duel can change the siege
    // before the first day, and a player death aborts the investment entirely.
    let preBattle: any = null;
    let defenseAdjustment = 0;
    let damageBonus = 0;
    let troopMultiplier = 1;
    if (input.preBattle !== false) {
      const defender = this.resolveDefender(settlement);
      preBattle = BattleDuelService.forDatabase(this.db).resolvePreBattle({
        battleId: `SIEGE-${settlementId}-${gameDate}-${commanderId}`,
        gameDate,
        context: 'STRONGHOLD',
        playerId: commanderId,
        playerName: String(commander?.name || 'Lương Diễn'),
        playerWar: Number(commander?.war_attr || 60),
        playerLeadership: Number(commander?.ldr_attr || 60),
        playerDiplomacy: Number(commander?.dip_attr || 50),
        enemyName: defender.name,
        enemyWar: defender.war,
        enemyLeadership: defender.ldr
      });

      if (preBattle.death === 'PLAYER') {
        return {
          siegeId: 'ABORTED',
          settlementId,
          status: 'ABORTED',
          aborted: true,
          lootQian: 0,
          defense: Number(settlement.defense || 0),
          garrison: Number(settlement.garrison_troops || 0),
          attackerTroops: 0,
          preBattle
        };
      }

      if (preBattle.playerMoraleDelta) {
        this.db.execute(
          `UPDATE player_state SET morale = MAX(0, MIN(100, morale + ?)) WHERE player_id = ?;`,
          [Number(preBattle.playerMoraleDelta), commanderId]
        );
      }
      if (preBattle.negotiationSuccess) {
        defenseAdjustment -= 10;
        damageBonus += 2;
      }
      if (preBattle.duelWinner === 'PLAYER') {
        defenseAdjustment -= 10;
        damageBonus += 2;
      } else if (preBattle.duelWinner === 'ENEMY') {
        troopMultiplier = 0.9;
      }
      if (preBattle.death === 'ENEMY') damageBonus += 3;

      attackerTroops = Math.max(1, Math.round(attackerTroops * troopMultiplier));
      if (defenseAdjustment !== 0) {
        this.db.execute(
          `UPDATE session_settlements SET defense = MAX(10, MIN(100, defense + ?)) WHERE settlement_id = ?;`,
          [defenseAdjustment, settlementId]
        );
      }
    }

    const dailyDamage = Math.max(
      2,
      Math.round(attackerTroops / 40 + Number(commander?.war_attr || 60) / 20) + damageBonus
    );
    const siegeId = nextId(this.db, 'siege', 'SIEGE', gameDate);

    this.db.transaction(() => {
      this.db.execute(
        `INSERT INTO session_sieges
           (siege_id, settlement_id, commander_id, attacker_troops, daily_damage, started_date, days_elapsed, status, expedition_id, prebattle_json)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'ACTIVE', ?, ?);`,
        [
          siegeId, settlementId, commanderId, attackerTroops, dailyDamage, gameDate,
          expedition?.expedition_id || null,
          preBattle ? JSON.stringify(preBattle) : null
        ]
      );
      if (expedition) {
        this.db.execute(
          `UPDATE military_expeditions SET status = 'BESIEGING' WHERE expedition_id = ?;`,
          [expedition.expedition_id]
        );
      }
    });

    return {
      siegeId,
      settlementId,
      status: 'ACTIVE',
      lootQian: 0,
      defense: Number(settlement.defense || 0),
      garrison: Number(settlement.garrison_troops || 0),
      attackerTroops,
      preBattle
    };
  }

  private resolveDefender(settlement: any): { name: string; war: number; ldr: number } {
    try {
      const faction = this.db.queryOne<any>(
        'SELECT leader_id, name_vi FROM session_factions WHERE faction_id = ? LIMIT 1;',
        [settlement.ruler_faction_id]
      );
      const leader = faction?.leader_id
        ? this.db.queryOne<any>(
          'SELECT name_vi, war_attr, ldr_attr FROM master_characters WHERE npc_id = ? LIMIT 1;',
          [faction.leader_id]
        )
        : null;
      return {
        name: leader?.name_vi || faction?.name_vi || 'Thủ Tướng Địch',
        war: Number(leader?.war_attr || 65),
        ldr: Number(leader?.ldr_attr || 65)
      };
    } catch {
      return { name: 'Thủ Tướng Địch', war: 65, ldr: 65 };
    }
  }

  private getPlayerFaction(): string | null {
    const row = this.db.queryOne<{ faction_id: string }>(
      `SELECT faction_id FROM session_factions WHERE leader_id = 'PLY-0001' AND is_active = 1 LIMIT 1;`
    );
    return row?.faction_id || 'FAC-LIANG-CLAN';
  }

  private recordConquest(siege: any, settlement: any, troops: number, gameDate: string): void {
    try {
      const factionId = this.getPlayerFaction() || 'FAC-LIANG-CLAN';
      const meta = this.db.queryOne<{ active_turn: number }>(
        'SELECT active_turn FROM campaign_meta LIMIT 1;'
      );
      const eventId = nextId(this.db, 'faction-event', 'FPE', gameDate);
      this.db.execute(
        `INSERT OR REPLACE INTO faction_political_events
           (event_id, turn_number, game_date, event_type, source_faction_id, target_faction_id,
            instigator_officer_id, title_vi, narrative_vi, consequences_json)
         VALUES (?, ?, ?, 'SETTLEMENT_CONQUERED', ?, ?, ?, ?, ?, ?);`,
        [
          eventId,
          Number(meta?.active_turn || 1),
          gameDate,
          factionId,
          settlement.ruler_faction_id || null,
          siege.commander_id || 'PLY-0001',
          `Chiếm được ${settlement.name_vi}`,
          `${troops} quân sống sót trấn giữ ${settlement.name_vi}; thành chuyển về ${factionId}.`,
          JSON.stringify({ settlementId: settlement.settlement_id, troops })
        ]
      );
    } catch {
      // The conquest stays valid even if the chronicle row cannot be written.
    }
  }

  /**
   * Advances every active siege by `days`. Called once per elapsed day span by
   * engine/time-manager, never from an async day-tick subscriber.
   */
  public advanceByDays(days: number, asOfDate?: string): {
    active: number;
    resolved: SiegeResolution[];
  } {
    const elapsed = Math.max(0, Math.ceil(Number(days) || 0));
    if (elapsed === 0) return { active: 0, resolved: [] };

    const active = this.db.query<any>(
      `SELECT * FROM session_sieges WHERE status = 'ACTIVE' ORDER BY siege_id ASC;`
    );
    const resolved: SiegeResolution[] = [];

    for (const siege of active) {
      const settlement = this.db.queryOne<any>(
        'SELECT * FROM session_settlements WHERE settlement_id = ?;',
        [siege.settlement_id]
      );
      if (!settlement) continue;

      const troops = Math.max(0, Number(siege.attacker_troops || 0));
      const defense = Math.max(0, Number(settlement.defense || 0));
      const garrison = Math.max(0, Number(settlement.garrison_troops || 0));

      const attackerLoss = Math.max(1, Math.round(troops * 0.02 * elapsed));
      const garrisonLoss = Math.max(1, Math.round(troops * 0.03 * elapsed));
      const nextTroops = Math.max(0, troops - attackerLoss);
      const nextGarrison = Math.max(0, garrison - garrisonLoss);
      const nextDefense = Math.max(0, defense - Number(siege.daily_damage || 0) * elapsed);

      const won = nextDefense <= 10 || nextGarrison <= 0;
      const lost = !won && nextTroops <= 0;
      const playerFaction = this.getPlayerFaction() || 'FAC-LIANG-CLAN';
      let loot = 0;

      this.db.transaction(() => {
        if (won) {
          loot = Math.round(Number(settlement.treasury_cash || 0) * 0.3);
          // The surviving attackers garrison the captured city, so ownership,
          // governor and garrison change in one write.
          this.db.execute(
            `UPDATE session_settlements
             SET ruler_faction_id = ?, governor_id = 'PLY-0001',
                 defense = 30, garrison_troops = ?,
                 public_order = MAX(20, public_order - 20),
                 treasury_cash = MAX(0, treasury_cash - ?)
             WHERE settlement_id = ?;`,
            [playerFaction, nextTroops, loot, siege.settlement_id]
          );
          this.db.execute(
            `UPDATE session_sieges
             SET status = 'WON', days_elapsed = days_elapsed + ?, attacker_troops = ?,
                 last_loot = ?, updated_at = CURRENT_TIMESTAMP
             WHERE siege_id = ?;`,
            [elapsed, nextTroops, loot, siege.siege_id]
          );
          if (siege.expedition_id) {
            this.db.execute(
              `UPDATE military_expeditions
               SET troop_count = ?, status = 'CONCLUDED'
               WHERE expedition_id = ?;`,
              [nextTroops, siege.expedition_id]
            );
          }
          if (loot > 0) {
            recordFinancialTransaction(this.db, {
              category: 'WAR_LOOT',
              counterparty: settlement.name_vi,
              memo: `Công phá đại thắng ${settlement.name_vi}, thu giữ ${loot} quan chiến phí`,
              inflow: loot,
              debitAccount: '1001_CASH_MOBILE',
              creditAccount: '4001_SALES_REVENUE',
              gameDate: asOfDate
            });
          }
        } else {
          this.db.execute(
            `UPDATE session_settlements SET defense = ?, garrison_troops = ? WHERE settlement_id = ?;`,
            [nextDefense, nextGarrison, siege.settlement_id]
          );
          this.db.execute(
            `UPDATE session_sieges
             SET status = ?, days_elapsed = days_elapsed + ?, attacker_troops = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE siege_id = ?;`,
            [lost ? 'LOST' : 'ACTIVE', elapsed, nextTroops, siege.siege_id]
          );
          if (siege.expedition_id) {
            this.db.execute(
              `UPDATE military_expeditions
               SET troop_count = ?, status = ?
               WHERE expedition_id = ?;`,
              [nextTroops, lost ? 'CONCLUDED' : 'BESIEGING', siege.expedition_id]
            );
          }
        }
      });

      if (won) {
        this.recordConquest(siege, settlement, nextTroops, asOfDate || getGameDate(this.db));
        // Conquest can be the twelfth settlement that completes the realm.
        try { applyVictoryIfEligible(this.db); } catch { /* victory is best-effort */ }
      }

      if (won || lost) {
        resolved.push({
          siegeId: siege.siege_id,
          settlementId: siege.settlement_id,
          status: won ? 'WON' : 'LOST',
          lootQian: loot,
          defense: won ? 30 : Math.max(10, nextDefense),
          garrison: won ? nextTroops : nextGarrison,
          attackerTroops: nextTroops
        });
      }
    }

    const stillActive = Number(
      this.db.queryOne<{ c: number }>(
        `SELECT COUNT(*) AS c FROM session_sieges WHERE status = 'ACTIVE';`
      )?.c || 0
    );
    return { active: stillActive, resolved };
  }

  public listActive(): any[] {
    return this.db.query<any>(
      `SELECT s.*, ss.name_vi AS settlement_name_vi, ss.defense, ss.garrison_troops
       FROM session_sieges s
       LEFT JOIN session_settlements ss ON ss.settlement_id = s.settlement_id
       WHERE s.status = 'ACTIVE'
       ORDER BY s.started_date ASC;`
    );
  }
}
