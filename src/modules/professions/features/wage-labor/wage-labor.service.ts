/**
 * ThreeKingdoms-AgentEngine: Wage Labor Service
 * (src/modules/professions/features/wage-labor/wage-labor.service.ts)
 *
 * Implements the core business logic, ACID transactions, and canonical stamina
 * calculation for the Wage Labor vertical slice.
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../../../core/database';
import {
  WAGE_LABOR_RULES,
  CANONICAL_LABOR_SHIFTS,
  ShiftTemplate
} from './wage-labor.constants';
import {
  StaminaProfileDTO,
  LaborShiftItemDTO,
  WageLaborOverviewDTO,
  WorkShiftExecutionDTO
} from './wage-labor.dto';
import { calculatePlayerStamina as canonicalCalculatePlayerStamina } from '../../../../shared/character-stats';
import { nextId } from '../../../../shared/id-generator';
import { getGameDate } from '../../../../shared/game-clock';
import { postCashflowEntry } from '../../../../shared/ledger';

/**
 * Re-exports canonical stamina profile calculation from shared character-stats domain.
 */
export const calculatePlayerStamina = canonicalCalculatePlayerStamina;

export class WageLaborService {
  private static instance: WageLaborService | null = null;
  private db: DatabaseService;

  public constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  public static getInstance(db?: DatabaseService): WageLaborService {
    if (!WageLaborService.instance || db) {
      WageLaborService.instance = new WageLaborService(db);
    }
    return WageLaborService.instance;
  }

  /**
   * Retrieves full labor market overview and stamina profile for a character.
   */
  public getLaborOverview(characterId: string = 'PLY-0001'): WageLaborOverviewDTO {
    const player = this.db.queryOne<any>(
      `SELECT player_id, name, liquid_cash, safe_cash, fatigue, health, war_attr,
              cra_attr, com_attr, int_attr, log_attr, cra_exp, com_exp, int_exp, log_exp
       FROM player_state WHERE player_id = ? LIMIT 1;`,
      [characterId]
    );

    const stamina = calculatePlayerStamina(player || {});
    const playerCash = Number(player?.liquid_cash || 0);
    const playerSafeCash = Number(player?.safe_cash || 0);
    const characterName = player?.name || 'Lương Diễn';

    const shifts: LaborShiftItemDTO[] = CANONICAL_LABOR_SHIFTS.map(s => {
      const hasEnoughStamina = stamina.currentStamina >= s.staminaCost;
      const fatigueWithinLimit =
        stamina.fatigue + s.fatigueCost <= WAGE_LABOR_RULES.MAX_FATIGUE_LIMIT;
      const canPerform = hasEnoughStamina && fatigueWithinLimit;

      let reasonCannotPerform: string | undefined = undefined;
      if (!canPerform) {
        if (!hasEnoughStamina) {
          reasonCannotPerform = `Cần ${s.staminaCost} Thể Lực (Hiện có: ${stamina.currentStamina}/${stamina.maxStamina})`;
        } else {
          reasonCannotPerform = `Mệt mỏi sẽ vượt quá giới hạn 100 (Hiện tại: ${stamina.fatigue}/100)`;
        }
      }

      return {
        ...s,
        canPerform,
        canWork: canPerform,
        reasonCannotPerform
      };
    });

    return {
      characterId,
      characterName,
      playerCash,
      playerSafeCash,
      stamina,
      shifts
    };
  }

  /**
   * Executes a labor shift atomically with double-entry cashflow ledger balancing.
   */
  public executeShift(
    characterId: string = 'PLY-0001',
    shiftIdOrJobType: string
  ): WorkShiftExecutionDTO {
    const normalizedInput = shiftIdOrJobType.trim().toUpperCase();
    const shift = CANONICAL_LABOR_SHIFTS.find(
      s =>
        s.shiftId.toUpperCase() === normalizedInput ||
        s.jobType.toUpperCase() === normalizedInput
    );

    if (!shift) {
      const validCodes = CANONICAL_LABOR_SHIFTS.map(s => s.shiftId).join(', ');
      throw new Error(
        `Ca làm việc không hợp lệ: "${shiftIdOrJobType}". Danh mục hỗ trợ: ${validCodes}`
      );
    }

    const player = this.db.queryOne<any>(
      `SELECT player_id, name, liquid_cash, safe_cash, fatigue, health, war_attr,
              cra_attr, com_attr, int_attr, log_attr, cra_exp, com_exp, int_exp, log_exp
       FROM player_state WHERE player_id = ? LIMIT 1;`,
      [characterId]
    );

    if (!player) {
      throw new Error(`Nhân vật [${characterId}] không tồn tại trong phiên.`);
    }

    const currentStaminaProfile = calculatePlayerStamina(player);

    if (currentStaminaProfile.currentStamina < shift.staminaCost) {
      throw new Error(
        `Khí lực kiệt quệ (${currentStaminaProfile.currentStamina}/${currentStaminaProfile.maxStamina} Thể Lực)! ` +
          `Không đủ sức nhận ca làm [${shift.titleVi}] (cần ${shift.staminaCost} Thể Lực). Cần nghỉ ngơi hồi sức.`
      );
    }

    if (
      currentStaminaProfile.fatigue + shift.fatigueCost >
      WAGE_LABOR_RULES.MAX_FATIGUE_LIMIT
    ) {
      throw new Error(
        `Độ mệt mỏi quá cao (${currentStaminaProfile.fatigue}/100)! ` +
          `Nhận thêm ca làm sẽ làm sụp đổ thể lực. Cần ẩm trà hoặc qua lượt mới để hồi phục.`
      );
    }

    const meta = this.db.queryOne<any>(
      `SELECT "current_date", active_turn FROM campaign_meta LIMIT 1;`
    ) || { current_date: '184-05-02', active_turn: 6 };
    const currentDate = meta.current_date;

    return this.db.transaction(() => {
      // 1. Fatigue & Cash mutation
      const newFatigue = Math.min(100, currentStaminaProfile.fatigue + shift.fatigueCost);
      const newCash = Number(player.liquid_cash || 0) + shift.wage;
      const totalBalance = newCash + Number(player.safe_cash || 0);

      // 2. Attribute EXP progression
      const attr = shift.attributeTarget;
      const attrExpCol = `${attr}_exp`;
      const attrValCol = `${attr}_attr`;
      let currentAttrExp = Number(player[attrExpCol] || 0) + shift.attributeExp;
      let currentAttrVal = Number(player[attrValCol] || 50);

      if (currentAttrExp >= 100) {
        currentAttrVal += 1;
        currentAttrExp -= 100;
      }

      this.db.execute(
        `UPDATE player_state 
         SET liquid_cash = ?, fatigue = ?, ${attrValCol} = ?, ${attrExpCol} = ? 
         WHERE player_id = ?;`,
        [newCash, newFatigue, currentAttrVal, currentAttrExp, characterId]
      );

      // 3. Double-entry Cashflow Ledger
      const txnId = nextId(this.db, 'cashflow', 'TXN-WAGE', getGameDate(this.db));
      postCashflowEntry(this.db, {
        txnId,
        gameDate: currentDate,
        counterparty: shift.workplaceVi,
        category: 'LABOR_WAGE',
        inflow: shift.wage,
        balance: totalBalance,
        memo: `Tiền công lao động: ${shift.titleVi}`
      });

      // 4. Profession EXP upsert
      const existingProf = this.db.queryOne<any>(
        `SELECT * FROM character_professions WHERE character_id = ? AND profession_code = ?;`,
        [characterId, shift.professionCode]
      );

      let profTier = 1;
      let profExp = shift.expGain;
      let profMaxExp = 100;

      if (existingProf) {
        profTier = existingProf.tier || 1;
        profExp = Number(existingProf.current_exp || 0) + shift.expGain;
        profMaxExp = Number(existingProf.max_exp || 100);
        if (profExp >= profMaxExp && profTier < 5) {
          profTier += 1;
          profExp -= profMaxExp;
          profMaxExp = Math.round(profMaxExp * 1.5);
        }
        this.db.execute(
          `UPDATE character_professions 
           SET tier = ?, current_exp = ?, max_exp = ? 
           WHERE character_id = ? AND profession_code = ?;`,
          [profTier, profExp, profMaxExp, characterId, shift.professionCode]
        );
      } else {
        this.db.execute(
          `INSERT INTO character_professions (character_id, profession_code, profession_name_vi, profession_name_en, category, tier, current_exp, max_exp, is_primary)
           VALUES (?, ?, ?, ?, ?, 1, ?, 100, 0);`,
          [
            characterId,
            shift.professionCode,
            shift.professionNameVi,
            shift.titleEn,
            shift.professionCategory,
            shift.expGain
          ]
        );
      }

      // 5. Chronicle Log
      const chronicleId = nextId(this.db, 'chronicle', 'chron_wage', getGameDate(this.db));
      const narrative = `Lương Diễn hoàn tất ca làm việc [${shift.titleVi}] tại ${shift.workplaceVi}. Nhận được ${shift.wage} Quan tiền công trao tay, tiêu hao ${shift.staminaCost} Thể Lực (+${shift.fatigueCost} Mệt Mỏi), tích lũy +${shift.expGain} EXP ${shift.professionNameVi}.`;

      this.db.execute(
        `INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, deltas, reasoning)
         VALUES (?, ?, ?, 'player', 'Lương Diễn (Lao Động)', ?, 'Diễn', ?, ?, 'Lao động cần cù kiếm sống tích lũy tư bản ban đầu.');`,
        [
          chronicleId,
          meta.active_turn || 1,
          currentDate,
          shift.titleVi,
          narrative,
          JSON.stringify({
            cash: `+${shift.wage} quan`,
            stamina: `-${shift.staminaCost}`,
            fatigue: `+${shift.fatigueCost}`,
            exp: `+${shift.expGain} ${shift.professionCode}`
          })
        ]
      );

      // Compute updated stamina
      const updatedPlayer = {
        ...player,
        fatigue: newFatigue,
        health: player.health,
        war_attr: player.war_attr
      };
      const updatedStamina = calculatePlayerStamina(updatedPlayer);

      return {
        success: true,
        shiftId: shift.shiftId,
        jobType: shift.jobType,
        titleVi: shift.titleVi,
        wageEarned: shift.wage,
        wagePaid: shift.wage,
        staminaConsumed: shift.staminaCost,
        fatigueCost: shift.fatigueCost,
        fatigueConsumed: shift.fatigueCost,
        remainingStamina: updatedStamina.currentStamina,
        newFatigue,
        stamina: updatedStamina,
        newLiquidCash: newCash,
        newBalance: totalBalance,
        professionCode: shift.professionCode,
        professionExpGained: shift.expGain,
        attributeTarget: shift.attributeTarget,
        attributeExpGained: shift.attributeExp,
        messageVi: `Hoàn tất ca làm [${shift.titleVi}]! Nhận +${shift.wage} Quan, tiêu hao ${shift.staminaCost} Thể Lực (+${shift.fatigueCost} Mệt Mỏi).`
      };
    });
  }
}
