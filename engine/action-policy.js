/**
 * Action time policy — single source of truth for how many days and how much
 * fatigue each action costs. Days are calendar days; the month only closes
 * through the explicit "Qua Tháng" action.
 *
 * Fatigue ownership: when a feature service already applies the activity's
 * stamina effect (production batches, social interactions, work shifts), this
 * table must declare `fatigue: 0` for that action. Otherwise the client's
 * `/api/time/spend` call charges stamina a second time on top of the service.
 */

const DEFAULT_ACTION_COST = { days: 1, fatigue: 3, labelVi: 'Hành động', labelEn: 'Action' };

const ACTION_TIME_POLICY = {
  TRADE_BUY: { days: 1, fatigue: 2, labelVi: 'Phiên chợ', labelEn: 'Market session' },
  TRADE_SELL: { days: 1, fatigue: 2, labelVi: 'Phiên chợ', labelEn: 'Market session' },
  // Fatigue applied by blacksmith-forge / professions craft endpoints.
  PRODUCTION_BATCH: { days: 1, fatigue: 0, labelVi: 'Sản xuất', labelEn: 'Production' },
  PAY_WAGES: { days: 0, fatigue: 0, labelVi: 'Kế toán', labelEn: 'Bookkeeping' },
  RECORD_BOUNTY: { days: 0, fatigue: 0, labelVi: 'Ghi sổ', labelEn: 'Record' },
  REWARD_NPC: { days: 0, fatigue: 0, labelVi: 'Thưởng', labelEn: 'Reward' },
  MOVE_LOCATION: { days: 1, fatigue: 5, labelVi: 'Di chuyển', labelEn: 'Travel' },
  PERSONAL_GROWTH: { days: 1, fatigue: 0, labelVi: 'Tu dưỡng', labelEn: 'Self-cultivation' },
  // Fatigue applied by daily-interaction / tavern-banquet services.
  KIZUNA_INTERACT: { days: 1, fatigue: 0, labelVi: 'Giao lưu', labelEn: 'Social' },
  // Fatigue applied by enterprise-labor / wage-labor services.
  WORK_SHIFT: { days: 1, fatigue: 0, labelVi: 'Ca làm việc', labelEn: 'Work shift' },
  WORKFORCE_HIRE: { days: 1, fatigue: 3, labelVi: 'Chiêu mộ', labelEn: 'Recruitment' },
  ENTERPRISE_MANAGE: { days: 1, fatigue: 3, labelVi: 'Quản lý sản nghiệp', labelEn: 'Enterprise management' },
  START_TASK: { days: 1, fatigue: 5, labelVi: 'Khởi công', labelEn: 'Start task' },
  CANCEL_TASK: { days: 0, fatigue: 0, labelVi: 'Hủy task', labelEn: 'Cancel task' },
  REST_RECOVERY: { days: 1, fatigue: 0, labelVi: 'Nghỉ ngơi', labelEn: 'Rest' },
  TRAIN_MARTIAL: { days: 1, fatigue: 0, labelVi: 'Luyện võ', labelEn: 'Training' }
};

function getActionTimeCost(type, subType) {
  if (subType && ACTION_TIME_POLICY[subType]) return ACTION_TIME_POLICY[subType];
  return ACTION_TIME_POLICY[type] || DEFAULT_ACTION_COST;
}

module.exports = {
  ACTION_TIME_POLICY,
  DEFAULT_ACTION_COST,
  getActionTimeCost
};
