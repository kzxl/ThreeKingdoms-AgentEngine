/**
 * ThreeKingdoms-AgentEngine: Battle Duels & Defeat States
 * (src/modules/military/battle-duel.service.ts)
 *
 * Pre-battle layer: a civil officer can negotiate, both commanders can duel,
 * and a duel can kill the loser. Death is intentionally rare and logged.
 * Bankruptcy is a separate, slower defeat checked at month close.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { recordLegacy } from '../../shared/victory';
import { SkillService } from '../progression/skill.service';
import { NpcSkillService } from '../progression/npc-skill.service';
import { getFameTier, fameRatio } from '../../shared/prestige';
import { PrestigeService } from '../progression/prestige.service';
import { DynastySuccessionService } from '../lineage-succession/dynasty-succession.service';
import { ConditionService } from './condition.service';
import BATTLE_CONFIG from '../../../config/battle-duel.json';

export interface PreBattleInput {
  battleId: string;
  gameDate: string;
  context: 'STRONGHOLD' | 'FIELD';
  playerId: string;
  playerName: string;
  playerWar: number;
  playerLeadership: number;
  playerDiplomacy: number;
  enemyName: string;
  enemyId?: string;
  enemyWar: number;
  enemyLeadership: number;
}

export interface PreBattleResult {
  battleId: string;
  negotiationAttempted: boolean;
  negotiationSuccess: boolean;
  negotiationRoll: number;
  duelTriggered: boolean;
  duelWinner: 'PLAYER' | 'ENEMY' | 'DRAW' | null;
  death: 'PLAYER' | 'ENEMY' | null;
  deathChance: number;
  deathRoll: number;
  playerMoraleDelta: number;
  enemyMoraleDelta: number;
  narrativeVi: string;
  narrativeEn: string;
}

export class BattleDuelService {
  private static instance: BattleDuelService | null = null;

  private constructor(private readonly db: DatabaseService) {}

  public static getInstance(): BattleDuelService {
    if (!BattleDuelService.instance) {
      BattleDuelService.instance = new BattleDuelService(DatabaseService.getInstance());
    }
    return BattleDuelService.instance;
  }

  public static forDatabase(db: DatabaseService): BattleDuelService {
    return new BattleDuelService(db);
  }

  public resolvePreBattle(input: PreBattleInput): PreBattleResult {
    const rng = RngService.forSeed(`battle-duel:${input.battleId}`);
    const prestige = PrestigeService.forDatabase(this.db);
    const fame = prestige.getFame(input.playerId);
    const cfg = BATTLE_CONFIG;
    const duelSkill = Math.round(SkillService.forDatabase(this.db).getEffectTotal(
      'DUEL_POWER',
      ['SKL-WAR-DUEL', 'SKL-WAR-SPEAR', 'SKL-WAR-BLADE', 'SKL-WAR-RIDE']
    ));
    const playerWar = Number(input.playerWar || 0) + duelSkill;
    const enemyDuelSkill = input.enemyId
      ? NpcSkillService.forDatabase(this.db).combatBonuses(input.enemyId).duelPower
      : 0;
    const enemyWar = Number(input.enemyWar || 0) + enemyDuelSkill;

    let negotiationAttempted = false;
    let negotiationSuccess = false;
    let negotiationRoll = 0;
    let playerMoraleDelta = 0;
    let enemyMoraleDelta = 0;
    let narrativeVi = '';
    let narrativeEn = '';

    if (input.playerLeadership <= cfg.negotiation.leadershipMax && input.playerDiplomacy >= cfg.negotiation.diplomacyMin) {
      negotiationAttempted = true;
      const chance = Math.min(0.9, cfg.negotiation.successChance + fameRatio(fame) * cfg.negotiation.fameBonus);
      negotiationRoll = rng.nextFloat();
      negotiationSuccess = negotiationRoll < chance;
      if (negotiationSuccess) {
        enemyMoraleDelta -= 10;
        prestige.award(input.playerId, { rawGain: cfg.negotiation.successPrestige, reason: 'BATTLE_NEGOTIATION', sourceId: input.battleId, gameDate: input.gameDate });
        narrativeVi = `Trước trận, ${input.playerName} dùng lời lẽ lay động ${input.enemyName}; địch chùn bước, sĩ khí giảm.`;
        narrativeEn = `Before the battle, ${input.playerName} swayed ${input.enemyName} with words; enemy morale fell.`;
      } else {
        playerMoraleDelta -= cfg.negotiation.failureMorale;
        prestige.penalize(input.playerId, { rawGain: cfg.negotiation.failurePrestige, reason: 'BATTLE_NEGOTIATION_FAILED', sourceId: input.battleId, gameDate: input.gameDate });
        narrativeVi = `Đàm phán với ${input.enemyName} thất bại; quân ta dao động, danh vọng tổn hại.`;
        narrativeEn = `Negotiation with ${input.enemyName} failed; your troops wavered and fame suffered.`;
      }
    }

    let duelTriggered = false;
    let duelWinner: PreBattleResult['duelWinner'] = null;
    let death: PreBattleResult['death'] = null;
    let deathChance = 0;
    let deathRoll = 1;

    if (cfg.enabled && playerWar >= 70 && enemyWar >= 70 && rng.chance(cfg.duelTriggerChance)) {
      duelTriggered = true;
      const playerScore = playerWar + rng.d20() + input.playerLeadership / 10;
      const enemyScore = enemyWar + rng.d20() + input.enemyLeadership / 10;
      const margin = Math.abs(playerScore - enemyScore);
      duelWinner = playerScore === enemyScore ? 'DRAW' : playerScore > enemyScore ? 'PLAYER' : 'ENEMY';

      if (duelWinner === 'PLAYER') {
        playerMoraleDelta += 8;
        enemyMoraleDelta -= 8;
        prestige.award(input.playerId, { rawGain: 30, reason: 'BATTLE_DUEL_WIN', sourceId: input.battleId, gameDate: input.gameDate });
        deathChance = Math.min(cfg.death.cap, cfg.death.enemyBase + (margin >= 15 ? cfg.death.marginBonus : 0) + (input.context === 'STRONGHOLD' ? cfg.death.strongholdBonus : 0));
        deathRoll = rng.nextFloat();
        if (deathRoll < deathChance) death = 'ENEMY';
        narrativeVi = `${input.playerName} thắng ${input.enemyName} trong trận đấu tướng${death === 'ENEMY' ? `, ${input.enemyName} tử trận!` : '!'}`;
        narrativeEn = `${input.playerName} bested ${input.enemyName} in a champion duel${death === 'ENEMY' ? `; ${input.enemyName} was killed!` : '!'}`;
      } else if (duelWinner === 'ENEMY') {
        playerMoraleDelta -= 10;
        enemyMoraleDelta += 8;
        prestige.penalize(input.playerId, { rawGain: 10, reason: 'BATTLE_DUEL_LOSS', sourceId: input.battleId, gameDate: input.gameDate });
        deathChance = Math.min(cfg.death.cap, cfg.death.playerBase + (margin >= 15 ? cfg.death.marginBonus : 0) + (input.context === 'STRONGHOLD' ? cfg.death.strongholdBonus : 0));
        deathRoll = rng.nextFloat();
        if (deathRoll < deathChance) death = 'PLAYER';
        narrativeVi = `${input.enemyName} thắng ${input.playerName} trong trận đấu tướng${death === 'PLAYER' ? '; bạn tử trận!' : '!'}`;
        narrativeEn = `${input.enemyName} bested ${input.playerName} in a champion duel${death === 'PLAYER' ? '; you were killed!' : '!'}`;
      } else {
        narrativeVi = `Hai tướng giao đấu bất phân thắng bại.`;
        narrativeEn = `The two champions fought to a standstill.`;
      }
    }

    // Combat consequences: a killed enemy leaves the roster; a surviving loser
    // carries a wound that reduces combat power until the next month close.
    if (duelTriggered) {
      const conditions = ConditionService.forDatabase(this.db);
      if (death === 'ENEMY' && input.enemyId) {
        conditions.applyNpcDeath(input.enemyId, 'BATTLE_DUEL');
      } else if (death !== 'PLAYER') {
        const severity = rng.chance(0.3) ? 3 : 2;
        if (duelWinner === 'PLAYER' && input.enemyId) {
          conditions.applyInjury(input.enemyId, severity, 'BATTLE_DUEL', input.gameDate);
        } else if (duelWinner === 'ENEMY') {
          conditions.applyInjury(input.playerId, severity, 'BATTLE_DUEL', input.gameDate);
        }
      }
    }

    this.db.execute(
      `INSERT INTO battle_duels
        (duel_id, battle_id, game_date, context, player_id, player_name, enemy_name,
         negotiation_result, negotiation_roll, duel_triggered, duel_winner, death_chance, death_roll, death_applied, narrative_vi, narrative_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        nextId(this.db, 'battle_duels', 'BDUEL', input.gameDate),
        input.battleId,
        input.gameDate,
        input.context,
        input.playerId,
        input.playerName,
        input.enemyName,
        negotiationAttempted ? (negotiationSuccess ? 'SUCCESS' : 'FAILED') : null,
        Number(negotiationRoll.toFixed(4)),
        duelTriggered ? 1 : 0,
        duelWinner,
        Number(deathChance.toFixed(4)),
        Number(deathRoll.toFixed(4)),
        death ? 1 : 0,
        narrativeVi,
        narrativeEn
      ]
    );

    if (death === 'PLAYER') {
      this.applyPlayerDeath(input.playerId, 'DUEL_DEATH');
    }

    // The defending champion learns from a champion duel that did not kill him.
    if (input.enemyId && duelTriggered && death !== 'ENEMY') {
      const exp = duelWinner === 'ENEMY' ? 20 : duelWinner === 'DRAW' ? 10 : 8;
      NpcSkillService.forDatabase(this.db).awardExp(input.enemyId, 'SKL-WAR-DUEL', exp);
    }

    return {
      battleId: input.battleId,
      negotiationAttempted,
      negotiationSuccess,
      negotiationRoll,
      duelTriggered,
      duelWinner,
      death,
      deathChance,
      deathRoll,
      playerMoraleDelta,
      enemyMoraleDelta,
      narrativeVi,
      narrativeEn
    };
  }

  public applyPlayerDeath(playerId: string, reason: string): { succession: boolean; heirId?: string } {
    const heir = this.db.queryOne<{ child_id: string }>(
      "SELECT child_id FROM family_children WHERE is_heir = 1 AND status NOT IN ('DECEASED', 'SUCCESSOR_RULER') LIMIT 1;"
    );
    if (heir) {
      try {
        new DynastySuccessionService(this.db).executeSuccession({ heirChildId: heir.child_id });
        this.db.execute(
          "UPDATE campaign_meta SET status = 'ACTIVE', defeat_reason = 'SUCCEEDED_BY_HEIR' WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);"
        );
        // Personal fame belongs to the fallen protagonist; the heir starts at
        // the commoner baseline while the family prestige carries over.
        this.db.execute('UPDATE player_state SET fame = 500, militia = 0 WHERE player_id = ?;', [playerId]);
        return { succession: true, heirId: heir.child_id };
      } catch (error) {
        console.warn('[BattleDuelService] succession failed:', (error as Error).message);
      }
    }

    this.db.execute(
      "UPDATE campaign_meta SET status = 'DEFEATED', defeat_reason = ? WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);",
      [reason]
    );
    this.db.execute('UPDATE player_state SET health = 0, fame = 0 WHERE player_id = ?;', [playerId]);
    recordLegacy(this.db, 'DEFEATED', 'Tử Chiến');
    return { succession: false };
  }

  /**
   * Called at month close. Two consecutive months below the cash/grain floor
   * end the campaign as BANKRUPT; recovering above the floor resets the counter.
   */
  public checkBankruptcy(playerId = 'PLY-0001'): {
    status: string;
    distressMonths: number;
    bankrupt: boolean;
  } {
    const cfg = BATTLE_CONFIG.bankruptcy;
    const player = this.db.queryOne<any>('SELECT liquid_cash, safe_cash, strategic_grain FROM player_state WHERE player_id = ?;', [playerId]);
    const meta = this.db.queryOne<any>('SELECT status, distress_months FROM campaign_meta LIMIT 1;');
    if (!player || !meta) return { status: 'UNKNOWN', distressMonths: 0, bankrupt: false };
    if (meta.status && meta.status !== 'ACTIVE') return { status: meta.status, distressMonths: Number(meta.distress_months || 0), bankrupt: meta.status === 'BANKRUPT' };

    const cash = Number(player.liquid_cash || 0) + Number(player.safe_cash || 0);
    const grain = Number(player.strategic_grain || 0);
    const distressed = cash < cfg.cashThreshold && grain < cfg.grainThreshold;
    const months = distressed ? Number(meta.distress_months || 0) + 1 : 0;
    const bankrupt = months >= cfg.monthsToDefeat;
    this.db.execute(
      'UPDATE campaign_meta SET distress_months = ?, status = CASE WHEN ? THEN \'BANKRUPT\' ELSE status END, defeat_reason = CASE WHEN ? THEN \'BANKRUPTCY\' ELSE defeat_reason END;',
      [months, bankrupt ? 1 : 0, bankrupt ? 1 : 0]
    );
    return { status: bankrupt ? 'BANKRUPT' : 'ACTIVE', distressMonths: months, bankrupt };
  }
}
