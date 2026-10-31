/**
 * Action time policy — single source of truth for how many days and how much
 * fatigue each action costs. Days are calendar days; a month closes
 * automatically when the calendar reaches day 1 of the next month.
 *
 * Fatigue ownership: when a feature service already applies the activity's
 * stamina effect (production batches, social interactions, work shifts), this
 * table must declare `fatigue: 0` for that action. Otherwise the server charge
 * adds stamina a second time on top of the service.
 *
 * Day ownership: the HTTP layer charges these costs once per player action via
 * `src/shared/action-time.ts`. The client `/api/time/spend` endpoint is now a
 * clock-refresh shim; it never advances the calendar.
 */

const DEFAULT_ACTION_COST = { days: 1, fatigue: 3, labelVi: 'Hành động', labelEn: 'Action' };

const ACTION_TIME_POLICY = {
  TRADE_BUY: { days: 2, fatigue: 4, labelVi: 'Phiên chợ', labelEn: 'Market session' },
  TRADE_SELL: { days: 2, fatigue: 4, labelVi: 'Phiên chợ', labelEn: 'Market session' },
  // Fatigue applied by blacksmith-forge / professions craft endpoints.
  PRODUCTION_BATCH: { days: 2, fatigue: 0, labelVi: 'Sản xuất', labelEn: 'Production' },
  PAY_WAGES: { days: 0, fatigue: 0, labelVi: 'Kế toán', labelEn: 'Bookkeeping' },
  RECORD_BOUNTY: { days: 0, fatigue: 0, labelVi: 'Ghi sổ', labelEn: 'Record' },
  REWARD_NPC: { days: 0, fatigue: 0, labelVi: 'Thưởng', labelEn: 'Reward' },
  MOVE_LOCATION: { days: 1, fatigue: 5, labelVi: 'Di chuyển', labelEn: 'Travel' },
  PERSONAL_GROWTH: { days: 5, fatigue: 10, labelVi: 'Tu dưỡng', labelEn: 'Self-cultivation' },
  // Fatigue applied by daily-interaction / tavern-banquet services.
  KIZUNA_INTERACT: { days: 2, fatigue: 0, labelVi: 'Giao lưu', labelEn: 'Social' },
  // Fatigue applied by enterprise-labor / wage-labor services.
  WORK_SHIFT: { days: 1, fatigue: 0, labelVi: 'Ca làm việc', labelEn: 'Work shift' },
  WORKFORCE_HIRE: { days: 2, fatigue: 3, labelVi: 'Chiêu mộ', labelEn: 'Recruitment' },
  ENTERPRISE_MANAGE: { days: 2, fatigue: 3, labelVi: 'Quản lý sản nghiệp', labelEn: 'Enterprise management' },
  START_TASK: { days: 1, fatigue: 5, labelVi: 'Khởi công', labelEn: 'Start task' },
  CANCEL_TASK: { days: 0, fatigue: 0, labelVi: 'Hủy task', labelEn: 'Cancel task' },
  REST_RECOVERY: { days: 1, fatigue: 0, labelVi: 'Nghỉ ngơi', labelEn: 'Rest' },
  TRAIN_MARTIAL: { days: 5, fatigue: 8, labelVi: 'Luyện võ', labelEn: 'Training' },
  EXPLORE_POI: { days: 2, fatigue: 5, labelVi: 'Khảo sát', labelEn: 'Explore' },
  QUEST_STEP: { days: 2, fatigue: 5, labelVi: 'Nhiệm vụ', labelEn: 'Quest step' },
  // Combat services own their stamina cost (`fatigueDelta`), so these policy
  // rows charge calendar days only. Charging fatigue here would double it.
  DUEL_SPAR: { days: 5, fatigue: 0, labelVi: 'Tỉ thí võ nghệ', labelEn: 'Sparring' },
  ARENA_CHALLENGE: { days: 5, fatigue: 0, labelVi: 'Khiêu chiến lôi đài', labelEn: 'Arena challenge' },
  COMBAT_ENCOUNTER: { days: 1, fatigue: 0, labelVi: 'Giao chiến', labelEn: 'Combat encounter' },
  // Gathering services already charge fatigue per node.
  GATHER_NODE: { days: 1, fatigue: 0, labelVi: 'Khai thác', labelEn: 'Gather' },
  // Farming: rent paperwork is quick; planting and harvest are field work.
  FARM_RENT: { days: 1, fatigue: 3, labelVi: 'Thuê ruộng', labelEn: 'Lease land' },
  FARM_PLANT: { days: 2, fatigue: 6, labelVi: 'Gieo trồng', labelEn: 'Plant crop' },
  FARM_HARVEST: { days: 2, fatigue: 8, labelVi: 'Thu hoạch', labelEn: 'Harvest' }
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
