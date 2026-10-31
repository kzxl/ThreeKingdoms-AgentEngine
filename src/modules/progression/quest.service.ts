/**
 * ThreeKingdoms-AgentEngine: Quest & Encounter Service
 * (src/modules/progression/quest.service.ts)
 *
 * DB-authored questlines with 3 steps each. A step costs calendar days, rolls
 * d20 + stat modifier against its DC, and pays its reward through the central
 * ledger, prestige service and inventory movements.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { recordFinancialTransaction } from '../../shared/financial-transaction';
import { PrestigeService } from './prestige.service';

const EXP_SQL: Record<string, string> = {
  int: 'UPDATE player_state SET int_exp = COALESCE(int_exp, 0) + ? WHERE player_id = ?;',
  war: 'UPDATE player_state SET war_exp = COALESCE(war_exp, 0) + ? WHERE player_id = ?;',
  ldr: 'UPDATE player_state SET ldr_exp = COALESCE(ldr_exp, 0) + ? WHERE player_id = ?;',
  pol: 'UPDATE player_state SET pol_exp = COALESCE(pol_exp, 0) + ? WHERE player_id = ?;',
  dip: 'UPDATE player_state SET dip_exp = COALESCE(dip_exp, 0) + ? WHERE player_id = ?;',
  com: 'UPDATE player_state SET com_exp = COALESCE(com_exp, 0) + ? WHERE player_id = ?;',
  log: 'UPDATE player_state SET log_exp = COALESCE(log_exp, 0) + ? WHERE player_id = ?;',
  cra: 'UPDATE player_state SET cra_exp = COALESCE(cra_exp, 0) + ? WHERE player_id = ?;'
};

export interface QuestStepView {
  index: number;
  titleVi: string;
  titleEn: string;
  stat: string;
  dc: number;
  daysCost: number;
}

export interface QuestView {
  questId: string;
  titleVi: string;
  titleEn: string;
  pathCode: string;
  descriptionVi: string;
  descriptionEn: string;
  status: 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';
  currentStep: number;
  attempts: number;
  steps: QuestStepView[];
}

export class QuestService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): QuestService {
    return new QuestService(db);
  }

  public list(playerId = 'PLY-0001'): QuestView[] {
    const quests = this.db.query<any>(
      'SELECT * FROM master_quests ORDER BY sort_order ASC, quest_id ASC;'
    );
    const progress = new Map(
      this.db.query<any>('SELECT * FROM player_quests WHERE player_id = ?;', [playerId])
        .map(row => [row.quest_id, row])
    );

    return quests.map(quest => {
      const steps = this.db.query<any>(
        'SELECT * FROM master_quest_steps WHERE quest_id = ? ORDER BY step_index ASC;',
        [quest.quest_id]
      );
      const row = progress.get(quest.quest_id);
      return {
        questId: quest.quest_id,
        titleVi: quest.title_vi,
        titleEn: quest.title_en,
        pathCode: quest.path_code,
        descriptionVi: quest.description_vi || '',
        descriptionEn: quest.description_en || '',
        status: row ? row.status : 'AVAILABLE',
        currentStep: row ? Number(row.current_step || 0) : 0,
        attempts: row ? Number(row.attempts || 0) : 0,
        steps: steps.map(step => ({
          index: Number(step.step_index),
          titleVi: step.title_vi,
          titleEn: step.title_en,
          stat: step.stat,
          dc: Number(step.dc),
          daysCost: Number(step.days_cost)
        }))
      };
    });
  }

  public accept(questId: string, playerId = 'PLY-0001'): QuestView {
    const quest = this.db.queryOne<any>('SELECT * FROM master_quests WHERE quest_id = ? LIMIT 1;', [questId]);
    if (!quest) throw new Error(`Quest ${questId} not found.`);
    const existing = this.db.queryOne<any>(
      'SELECT * FROM player_quests WHERE player_id = ? AND quest_id = ? LIMIT 1;',
      [playerId, questId]
    );
    if (existing?.status === 'COMPLETED') throw new Error('Nhiệm vụ này đã hoàn thành.');
    if (!existing) {
      this.db.execute(
        `INSERT INTO player_quests (player_id, quest_id, status, current_step, attempts, started_date)
         VALUES (?, ?, 'ACTIVE', 0, 0, ?);`,
        [playerId, questId, getGameDate(this.db)]
      );
    }
    return this.list(playerId).find(item => item.questId === questId)!;
  }

  public advance(questId: string, playerId = 'PLY-0001', options: { roll?: number } = {}) {
    const quest = this.db.queryOne<any>('SELECT * FROM master_quests WHERE quest_id = ? LIMIT 1;', [questId]);
    if (!quest) throw new Error(`Quest ${questId} not found.`);
    const progress = this.db.queryOne<any>(
      'SELECT * FROM player_quests WHERE player_id = ? AND quest_id = ? LIMIT 1;',
      [playerId, questId]
    );
    if (!progress) throw new Error('Hãy nhận nhiệm vụ trước khi thực hiện.');
    if (progress.status !== 'ACTIVE') throw new Error('Nhiệm vụ này không còn hoạt động.');

    const steps = this.db.query<any>(
      'SELECT * FROM master_quest_steps WHERE quest_id = ? ORDER BY step_index ASC;',
      [questId]
    );
    const step = steps.find(item => Number(item.step_index) === Number(progress.current_step));
    if (!step) throw new Error('Bước nhiệm vụ không tồn tại.');

    const player = this.db.queryOne<any>(
      'SELECT * FROM player_state WHERE player_id = ? LIMIT 1;',
      [playerId]
    );
    if (!player) throw new Error(`Player ${playerId} not found.`);

    // Time is a precondition: the step consumes whole days and can cross a month.
    const { applyActionTime } = require('../../../engine/time-manager');
    const time = applyActionTime(this.db.path, 'QUEST_STEP', null, `quest:${questId}`, Number(step.days_cost || 2));
    if (!time || time.success === false) {
      throw new Error(time?.error || 'Không thể tiêu tốn thời gian cho nhiệm vụ.');
    }

    const statKey = String(step.stat || 'int');
    const statValue = Number(player[`${statKey}_attr`] || 50);
    const mod = Math.floor((statValue - 50) / 5);
    const roll = options.roll !== undefined
      ? Math.max(1, Math.min(20, Math.round(Number(options.roll))))
      : RngService.forDomain(this.db, 'quest').d20();
    const total = roll + mod;
    const dc = Number(step.dc || 10);
    const success = total >= dc;
    const gameDate = time.nextDate;

    const reward = this.parseJson(success ? step.reward_json : '{}');
    const applied = this.applyRewards(reward, playerId, gameDate, `Quest ${questId} step ${Number(step.step_index) + 1}`);
    if (!success) {
      this.db.execute(
        `UPDATE player_state
         SET fatigue = MIN(100, fatigue + 8), morale = MAX(0, morale - 5)
         WHERE player_id = ?;`,
        [playerId]
      );
      this.db.execute(
        'UPDATE player_quests SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND quest_id = ?;',
        [playerId, questId]
      );
      return {
        success: false,
        questId,
        stepIndex: Number(step.step_index),
        roll,
        mod,
        total,
        dc,
        narrative: step.failure_vi || 'Bước này thất bại.',
        narrativeEn: step.failure_en || 'This step failed.',
        rewards: {},
        status: 'ACTIVE',
        time
      };
    }

    const nextStep = Number(step.step_index) + 1;
    const completed = nextStep >= steps.length;
    let questReward = {};
    if (completed) {
      questReward = this.parseJson(quest.reward_json);
      this.applyRewards(questReward, playerId, gameDate, `Quest ${questId} completed`);
      this.db.execute(
        `UPDATE player_quests
         SET status = 'COMPLETED', current_step = ?, attempts = attempts + 1,
             completed_date = ?, updated_at = CURRENT_TIMESTAMP
         WHERE player_id = ? AND quest_id = ?;`,
        [nextStep, gameDate, playerId, questId]
      );
    } else {
      this.db.execute(
        `UPDATE player_quests
         SET current_step = ?, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
         WHERE player_id = ? AND quest_id = ?;`,
        [nextStep, playerId, questId]
      );
    }

    return {
      success: true,
      questId,
      stepIndex: Number(step.step_index),
      roll,
      mod,
      total,
      dc,
      narrative: step.success_vi || 'Bước này thành công.',
      narrativeEn: step.success_en || 'This step succeeded.',
      rewards: { ...applied, quest: questReward },
      status: completed ? 'COMPLETED' : 'ACTIVE',
      nextStep: completed ? null : nextStep,
      time
    };
  }

  private parseJson(value: any): any {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private applyRewards(reward: any, playerId: string, gameDate: string, reason: string): any {
    const applied: any = {};
    const cash = Math.round(Number(reward?.cash || 0));
    if (cash > 0) {
      recordFinancialTransaction(this.db, {
        category: 'QUEST_REWARD',
        counterparty: 'Nhiệm vụ',
        memo: reason,
        inflow: cash,
        debitAccount: '1001_CASH_MOBILE',
        creditAccount: '4001_SALES_REVENUE',
        gameDate
      });
      applied.cash = cash;
    }

    const fame = Number(reward?.fame || 0);
    if (fame > 0) {
      const change = PrestigeService.forDatabase(this.db).award(playerId, {
        rawGain: fame,
        reason: 'QUEST_REWARD',
        sourceId: reason,
        gameDate
      });
      applied.fame = change.delta;
    }

    if (reward?.exp && typeof reward.exp === 'object') {
      applied.exp = {};
      for (const [stat, amount] of Object.entries(reward.exp)) {
        const sql = EXP_SQL[stat];
        const gain = Math.max(0, Math.round(Number(amount) || 0));
        if (!sql || gain === 0) continue;
        this.db.execute(sql, [gain, playerId]);
        applied.exp[stat] = gain;
      }
    }

    if (Array.isArray(reward?.items)) {
      applied.items = [];
      for (const item of reward.items) {
        const code = String(item.code || '');
        const quantity = Math.max(1, Math.round(Number(item.qty || 1)));
        if (!code) continue;
        this.db.execute(
          `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
           VALUES (?, 'FINISHED_GOOD', ?, ?, 0, 'Nhiệm vụ')
           ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + excluded.quantity;`,
          [code, `Phần thưởng nhiệm vụ ${code}`, quantity]
        );
        this.db.execute(
          `INSERT INTO stock_movements
             (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
           VALUES (?, ?, ?, 'QUEST_REWARD', ?, 0,
             (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
          [nextId(this.db, 'stock-movements', 'MOV-QUEST', gameDate), gameDate, code, quantity, code, reason]
        );
        applied.items.push({ code, quantity });
      }
    }

    return applied;
  }
}
