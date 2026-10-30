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
import { getFameTier, fameRatio } from '../../shared/prestige';
import { PrestigeService } from '../progression/prestige.service';
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

    if (cfg.enabled && input.playerWar >= 70 && input.enemyWar >= 70 && rng.chance(cfg.duelTriggerChance)) {
      duelTriggered = true;
      const playerScore = input.playerWar + rng.d20() + input.playerLeadership / 10;
      const enemyScore = input.enemyWar + rng.d20() + input.enemyLeadership / 10;
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

  public applyPlayerDeath(playerId: string, reason: string): void {
    this.db.execute(
      "UPDATE campaign_meta SET status = 'DEFEATED', defeat_reason = ? WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);",
      [reason]
    );
    this.db.execute('UPDATE player_state SET health = 0, fame = 0 WHERE player_id = ?;', [playerId]);
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
