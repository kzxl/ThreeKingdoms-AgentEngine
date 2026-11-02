/**
 * Life Layer service: one writer for daily-life actions.
 *
 * The controller owns calendar time and idempotency; this service owns the
 * state transition, skill EXP and any cash/item movement. It deliberately does
 * not extend the legacy contextual-action switch.
 */

import { DatabaseService } from '../../core/database';
import { SkillService } from '../progression/skill.service';
import { DailyInteractionEngine } from '../social-kizuna/daily-interaction.engine';
import { postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { nextSequentialId } from '../../shared/id-generator';

export type LifeActionCode =
  | 'EAT_MEAL'
  | 'SLEEP'
  | 'TEA_WITH_NPC'
  | 'HOUSEHOLD_UPKEEP'
  | 'STUDY_TRAIN'
  | 'LEISURE';

export interface LifeActionInput {
  actionCode: LifeActionCode;
  npcId?: string;
  skillCode?: string;
  leisureType?: string;
}

export interface LifeActionView {
  code: LifeActionCode;
  labelVi: string;
  labelEn: string;
  available: boolean;
  reasonVi?: string;
}

export interface LifeStatusView {
  characterId: string;
  date: string;
  phase: number;
  phaseLabel: string;
  needs: {
    fatigue: number;
    morale: number;
    stress: number;
    health: number;
  };
  household: {
    spouseName: string | null;
    spouseRole: string | null;
    children: number;
    upkeepDue: boolean;
  };
  skills: Array<{
    skillCode: string;
    nameVi: string;
    tier: number;
    currentExp: number;
    maxExp: number;
    effectType: string;
    effectValue: number;
  }>;
  trainableSkills: Array<{ skillCode: string; nameVi: string; domain: string }>;
  actions: LifeActionView[];
}

const ACTION_LABELS: Record<LifeActionCode, { labelVi: string; labelEn: string }> = {
  EAT_MEAL: { labelVi: 'Dùng Bữa', labelEn: 'Eat a Meal' },
  SLEEP: { labelVi: 'Nghỉ Đêm', labelEn: 'Sleep' },
  TEA_WITH_NPC: { labelVi: 'Uống Trà', labelEn: 'Tea with Someone' },
  HOUSEHOLD_UPKEEP: { labelVi: 'Chi Tiêu Gia Đình', labelEn: 'Household Upkeep' },
  STUDY_TRAIN: { labelVi: 'Luyện Kỹ Năng', labelEn: 'Study a Skill' },
  LEISURE: { labelVi: 'Thư Giãn', labelEn: 'Leisure' }
};

const SKILL_EFFECT_MAP: Record<string, string> = {
  'SKL-LIF-COOK': 'MORALE_RECOVERY',
  'SKL-LIF-TEA': 'SOCIAL_GAIN',
  'SKL-LIF-HOUSE': 'UPKEEP_DISCOUNT',
  'SKL-LIF-PARENT': 'CHILD_GROWTH',
  'SKL-LIF-MED': 'HEAL_RATE',
  'SKL-LIF-MUSIC': 'LEISURE_GAIN',
  'SKL-LIF-AUSTERE': 'FATIGUE_RECOVERY',
  'SKL-LIF-CIVIC': 'VIRTUE_GAIN',
  'SKL-LIF-ETIQ': 'CREDIBILITY_GAIN'
};

export class LifeService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): LifeService {
    return new LifeService(db);
  }

  private clock(): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../../engine/time-manager').getClock(this.db.path);
  }

  private ensureState(characterId: string): any {
    this.db.execute(
      'INSERT OR IGNORE INTO player_life_state (character_id) VALUES (?);',
      [characterId]
    );
    return this.db.queryOne<any>(
      'SELECT * FROM player_life_state WHERE character_id = ?;',
      [characterId]
    ) || { character_id: characterId, stress: 20, routine_streak: 0 };
  }

  private player(characterId: string): any {
    const row = this.db.queryOne<any>(
      "SELECT liquid_cash, safe_cash, fatigue, morale, health, strategic_grain, virtue FROM player_state WHERE player_id = ?;",
      [characterId]
    );
    if (!row) throw new Error(`Không tìm thấy nhân vật ${characterId}.`);
    return row;
  }

  private effect(effectType: string, skillCodes: string[]): number {
    return SkillService.forDatabase(this.db).getEffectTotal(effectType, skillCodes);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private upkeepCost(characterId: string): { base: number; cost: number; discount: number; spouses: number; children: number } {
    const spouses = Number(this.db.queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM family_spouses WHERE husband_id = ? AND status = 'MARRIED';",
      [characterId]
    )?.c || 0);
    const children = Number(this.db.queryOne<{ c: number }>(
      'SELECT COUNT(*) AS c FROM family_children WHERE father_id = ?;',
      [characterId]
    )?.c || 0);
    const base = 20 + spouses * 10 + children * 5;
    const discount = Math.min(30, this.effect('UPKEEP_DISCOUNT', ['SKL-LIF-HOUSE']));
    const cost = Math.max(1, Math.round(base * (1 - discount / 100)));
    return { base, cost, discount, spouses, children };
  }

  public getStatus(characterId = 'PLY-0001'): LifeStatusView {
    const state = this.ensureState(characterId);
    const player = this.player(characterId);
    const clock = this.clock();
    const currentDate = String(clock.currentDate);
    const currentMonth = currentDate.slice(0, 7);

    const spouse = this.db.queryOne<any>(
      "SELECT wife_name_vi, household_role FROM family_spouses WHERE husband_id = ? AND status = 'MARRIED' LIMIT 1;",
      [characterId]
    );
    const childCount = Number(this.db.queryOne<{ c: number }>(
      'SELECT COUNT(*) AS c FROM family_children WHERE father_id = ?;',
      [characterId]
    )?.c || 0);
    const upkeep = this.upkeepCost(characterId);

    const lifeSkills = SkillService.forDatabase(this.db).list()
      .filter(skill => skill.domain === 'LIFE')
      .map(skill => {
        const effectType = SKILL_EFFECT_MAP[skill.skillCode] || 'CHECK_BONUS';
        const effectValue = skill.effects
          .filter(effect => effect.effectType === effectType)
          .sort((a, b) => b.tier - a.tier)[0]?.value || 0;
        return {
          skillCode: skill.skillCode,
          nameVi: skill.nameVi,
          tier: skill.tier,
          currentExp: skill.currentExp,
          maxExp: skill.maxExp,
          effectType,
          effectValue
        };
      });

    const trainableSkills = this.db.query<any>(
      'SELECT skill_code AS skillCode, skill_name_vi AS nameVi, domain FROM master_skills ORDER BY domain, skill_code;'
    );

    const ateToday = state.last_meal_date === currentDate;
    const paidThisMonth = state.last_upkeep_month === currentMonth;
    const actions: LifeActionView[] = [
      {
        code: 'EAT_MEAL',
        ...ACTION_LABELS.EAT_MEAL,
        available: !ateToday && Number(player.strategic_grain || 0) >= 0.1,
        reasonVi: ateToday ? 'Hôm nay đã dùng bữa.' : (Number(player.strategic_grain || 0) < 0.1 ? 'Kho lương không đủ 0.1 Thạch.' : undefined)
      },
      {
        code: 'SLEEP',
        ...ACTION_LABELS.SLEEP,
        available: true
      },
      {
        code: 'TEA_WITH_NPC',
        ...ACTION_LABELS.TEA_WITH_NPC,
        available: Number(player.liquid_cash || 0) >= 5,
        reasonVi: Number(player.liquid_cash || 0) < 5 ? 'Cần 5 Quan tiền trà.' : undefined
      },
      {
        code: 'HOUSEHOLD_UPKEEP',
        ...ACTION_LABELS.HOUSEHOLD_UPKEEP,
        available: !paidThisMonth && Number(player.liquid_cash || 0) >= upkeep.cost,
        reasonVi: paidThisMonth
          ? 'Tháng này đã chi tiêu gia đình.'
          : (Number(player.liquid_cash || 0) < upkeep.cost ? `Cần ${upkeep.cost} Quan.` : undefined)
      },
      {
        code: 'STUDY_TRAIN',
        ...ACTION_LABELS.STUDY_TRAIN,
        available: Number(player.fatigue || 0) < 92,
        reasonVi: Number(player.fatigue || 0) >= 92 ? 'Thể lực quá cạn, hãy nghỉ trước.' : undefined
      },
      {
        code: 'LEISURE',
        ...ACTION_LABELS.LEISURE,
        available: true
      }
    ];

    return {
      characterId,
      date: currentDate,
      phase: Number(clock.phase || 0),
      phaseLabel: String(clock.phaseLabel || 'Sáng'),
      needs: {
        fatigue: Number(player.fatigue || 0),
        morale: Number(player.morale || 100),
        stress: Number(state.stress || 0),
        health: Number(player.health || 100)
      },
      household: {
        spouseName: spouse?.wife_name_vi || null,
        spouseRole: spouse?.household_role || null,
        children: childCount,
        upkeepDue: !paidThisMonth
      },
      skills: lifeSkills,
      trainableSkills,
      actions
    };
  }

  public act(characterId: string, input: LifeActionInput): any {
    const state = this.ensureState(characterId);
    const player = this.player(characterId);
    const clock = this.clock();
    const currentDate = String(clock.currentDate);
    const currentMonth = currentDate.slice(0, 7);

    return this.db.transaction(() => {
      switch (input.actionCode) {
        case 'EAT_MEAL': {
          if (state.last_meal_date === currentDate) throw new Error('Hôm nay đã dùng bữa rồi.');
          if (Number(player.strategic_grain || 0) < 0.1) throw new Error('Kho lương không đủ 0.1 Thạch để dùng bữa.');
          const cookBonus = this.effect('MORALE_RECOVERY', ['SKL-LIF-COOK']);
          const fatigue = this.clamp(Number(player.fatigue || 0) - 5);
          const morale = this.clamp(Number(player.morale || 100) + 5 + cookBonus);
          const stress = this.clamp(Number(state.stress || 0) - 8);
          this.db.execute(
            'UPDATE player_state SET strategic_grain = strategic_grain - 0.1, fatigue = ?, morale = ? WHERE player_id = ?;',
            [fatigue, morale, characterId]
          );
          this.db.execute(
            'UPDATE player_life_state SET stress = ?, last_meal_date = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?;',
            [stress, currentDate, characterId]
          );
          const skill = SkillService.forDatabase(this.db).awardExp('SKL-LIF-COOK', 8);
          return {
            actionCode: input.actionCode,
            messageVi: `Dùng bữa ấm cúng, hồi phục tinh thần (+${5 + cookBonus} Sĩ khí).`,
            needs: { fatigue, morale, stress },
            skillExp: skill
          };
        }

        case 'SLEEP': {
          const austere = Math.min(30, this.effect('FATIGUE_RECOVERY', ['SKL-LIF-AUSTERE']));
          const stressPenalty = Number(state.stress || 0) >= 80 ? 0.6 : 1;
          const recovery = Math.round(40 * (1 + austere / 100) * stressPenalty);
          const fatigue = this.clamp(Number(player.fatigue || 0) - recovery);
          const morale = this.clamp(Number(player.morale || 100) + 3);
          const stress = this.clamp(Number(state.stress || 0) - 25);
          this.db.execute(
            'UPDATE player_state SET fatigue = ?, morale = ? WHERE player_id = ?;',
            [fatigue, morale, characterId]
          );
          this.db.execute(
            'UPDATE player_life_state SET stress = ?, last_rest_date = ?, routine_streak = routine_streak + 1, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?;',
            [stress, currentDate, characterId]
          );
          const skill = SkillService.forDatabase(this.db).awardExp('SKL-LIF-AUSTERE', 5);
          return {
            actionCode: input.actionCode,
            messageVi: `Một giấc ngủ sâu, hồi phục ${recovery} Thể lực.`,
            needs: { fatigue, morale, stress },
            skillExp: skill
          };
        }

        case 'TEA_WITH_NPC': {
          if (!input.npcId) throw new Error('Cần chọn người cùng uống trà.');
          if (Number(player.liquid_cash || 0) < 5) throw new Error('Cần 5 Quan tiền trà.');
          const engine = DailyInteractionEngine.getInstance();
          const result = engine.executeDailyInteraction(input.npcId, 'TEA_CONVERSE', 'Life tea');
          const socialBonus = this.effect('SOCIAL_GAIN', ['SKL-LIF-TEA']);
          if (socialBonus > 0) {
            const sentiment = engine.getNpcSentiment(input.npcId);
            this.db.execute(
              "INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes) VALUES (?, ?, ?, ?, ?, ?);",
              [
                input.npcId,
                currentDate,
                socialBonus,
                this.clamp(sentiment.affinity + socialBonus),
                sentiment.titleVi,
                'Life tea bonus'
              ]
            );
          }
          const stress = this.clamp(Number(state.stress || 0) - 10);
          this.db.execute(
            'UPDATE player_life_state SET stress = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?;',
            [stress, characterId]
          );
          const skill = SkillService.forDatabase(this.db).awardExp('SKL-LIF-TEA', 10);
          return {
            actionCode: input.actionCode,
            messageVi: `Trà thơm câu chuyện, thiện cảm tăng thêm ${socialBonus}.`,
            needs: { fatigue: Number(player.fatigue || 0), morale: Number(player.morale || 100), stress },
            socialBonus,
            interaction: result,
            skillExp: skill
          };
        }

        case 'HOUSEHOLD_UPKEEP': {
          if (state.last_upkeep_month === currentMonth) throw new Error('Tháng này đã chi tiêu gia đình rồi.');
          const upkeep = this.upkeepCost(characterId);
          if (Number(player.liquid_cash || 0) < upkeep.cost) {
            throw new Error(`Cần ${upkeep.cost} Quan để chi tiêu gia đình.`);
          }
          const newLiquid = Number(player.liquid_cash || 0) - upkeep.cost;
          const balance = newLiquid + Number(player.safe_cash || 0);
          this.db.execute(
            'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
            [newLiquid, characterId]
          );
          const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', currentDate);
          postDoubleEntry(this.db, {
            txnId,
            gameDate: currentDate,
            counterparty: 'Gia dụng',
            category: 'Life/HouseholdUpkeep',
            outflow: upkeep.cost,
            balance,
            memo: `Chi tiêu gia đình tháng ${currentMonth}`,
            debitAccount: ACCOUNT_CODES.operatingExpense,
            creditAccount: ACCOUNT_CODES.cashMobile
          });
          const stress = this.clamp(Number(state.stress || 0) - 3);
          const morale = this.clamp(Number(player.morale || 100) + 2);
          this.db.execute(
            'UPDATE player_state SET morale = ? WHERE player_id = ?;',
            [morale, characterId]
          );
          this.db.execute(
            'UPDATE player_life_state SET stress = ?, last_upkeep_month = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?;',
            [stress, currentMonth, characterId]
          );
          const skill = SkillService.forDatabase(this.db).awardExp('SKL-LIF-HOUSE', 8);
          return {
            actionCode: input.actionCode,
            messageVi: `Chi tiêu gia đình ${upkeep.cost} Quan (giảm ${upkeep.discount}% nhờ Trị Gia).`,
            upkeep,
            needs: { fatigue: Number(player.fatigue || 0), morale, stress },
            skillExp: skill
          };
        }

        case 'STUDY_TRAIN': {
          if (!input.skillCode) throw new Error('Cần chọn kỹ năng để luyện.');
          const master = this.db.queryOne<any>(
            'SELECT skill_code, skill_name_vi, domain FROM master_skills WHERE skill_code = ? LIMIT 1;',
            [input.skillCode]
          );
          if (!master) throw new Error(`Kỹ năng ${input.skillCode} không tồn tại.`);
          if (Number(player.fatigue || 0) >= 92) throw new Error('Thể lực quá cạn, hãy nghỉ trước khi luyện.');
          const fatigue = this.clamp(Number(player.fatigue || 0) + 8);
          const stress = this.clamp(Number(state.stress || 0) + 6);
          this.db.execute(
            'UPDATE player_state SET fatigue = ? WHERE player_id = ?;',
            [fatigue, characterId]
          );
          this.db.execute(
            'UPDATE player_life_state SET stress = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?;',
            [stress, characterId]
          );
          const skill = SkillService.forDatabase(this.db).awardExp(master.skill_code, 20);
          return {
            actionCode: input.actionCode,
            messageVi: `Luyện ${master.skill_name_vi} (+20 EXP).`,
            needs: { fatigue, morale: Number(player.morale || 100), stress },
            skillExp: skill,
            skillCode: master.skill_code,
            skillNameVi: master.skill_name_vi
          };
        }

        case 'LEISURE': {
          const leisureBonus = this.effect('LEISURE_GAIN', ['SKL-LIF-MUSIC']);
          const morale = this.clamp(Number(player.morale || 100) + 6 + leisureBonus);
          const stress = this.clamp(Number(state.stress || 0) - 15);
          const fatigue = this.clamp(Number(player.fatigue || 0) - 3);
          this.db.execute(
            'UPDATE player_state SET morale = ?, fatigue = ? WHERE player_id = ?;',
            [morale, fatigue, characterId]
          );
          this.db.execute(
            'UPDATE player_life_state SET stress = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?;',
            [stress, characterId]
          );
          const skill = SkillService.forDatabase(this.db).awardExp('SKL-LIF-MUSIC', 10);
          return {
            actionCode: input.actionCode,
            messageVi: `Thư giãn ${input.leisureType || 'cầm kỳ thi họa'}, tinh thần sảng khoái.`,
            needs: { fatigue, morale, stress },
            skillExp: skill
          };
        }

        default:
          throw new Error(`Hành động đời sống ${String((input as any).actionCode)} không hợp lệ.`);
      }
    });
  }
}
