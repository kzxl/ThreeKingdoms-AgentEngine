/**
 * ThreeKingdoms-AgentEngine: Global Config & Application State (public/js/config.js)
 * Standards Applied: AgentOption UI System & Anti-AI-Slop Architecture
 */

const API_BASE = '';

// Global Application State (Persisted across refreshes)
let activeSubLocation = localStorage.getItem('sim_active_subloc') || 'Vườn Đào';
let lastEncounterSubLocation = localStorage.getItem('sim_last_encounter_subloc') || null;
let currentScene = null;
let currentInventory = [];
let currentStatus = null;
let selectedChoiceId = null;
let isProcessingAction = false; // Anti-Piling Guard
const storyChronicle = []; // History of dialogue and action turns
let currentLang = localStorage.getItem('sim_lang') || 'vi';

/**
 * Returns a shared SVG line icon from the sprite in index.html.
 * Hanzi seals are decorative; functional UI uses these icons.
 */
function uiIcon(name, className = '') {
  const extra = className ? ` ${className}` : '';
  return `<svg class="ui-icon${extra}" aria-hidden="true" focusable="false"><use href="#icon-${name}"></use></svg>`;
}
window.uiIcon = uiIcon;

// Server policy cache. `/api/time/clock` returns the authoritative
// `ACTION_TIME_POLICY`; the local table below is only an offline fallback so
// the day chip can render before the first clock fetch.
let ACTION_POLICY_CACHE = null;

const ACTION_DAY_COSTS = {
  TRADE_BUY: 1,
  TRADE_SELL: 1,
  PRODUCTION_BATCH: 1,
  PAY_WAGES: 0,
  RECORD_BOUNTY: 0,
  REWARD_NPC: 0,
  MOVE_LOCATION: 1,
  PERSONAL_GROWTH: 1,
  KIZUNA_INTERACT: 1,
  WORK_SHIFT: 1,
  WORKFORCE_HIRE: 1,
  ENTERPRISE_MANAGE: 1,
  START_TASK: 1,
  CANCEL_TASK: 0,
  REST_RECOVERY: 1,
  TRAIN_MARTIAL: 1
};

function setActionPolicy(policy) {
  if (policy && typeof policy === 'object') ACTION_POLICY_CACHE = policy;
}

function getActionDayCost(type, subType = '') {
  const entry = (subType && ACTION_POLICY_CACHE && ACTION_POLICY_CACHE[subType])
    || (ACTION_POLICY_CACHE && ACTION_POLICY_CACHE[type])
    || null;
  if (entry && Number.isFinite(Number(entry.days))) return Number(entry.days);

  if (subType && Object.prototype.hasOwnProperty.call(ACTION_DAY_COSTS, subType)) {
    return ACTION_DAY_COSTS[subType];
  }
  return Object.prototype.hasOwnProperty.call(ACTION_DAY_COSTS, type) ? ACTION_DAY_COSTS[type] : 1;
}

window.setActionPolicy = setActionPolicy;
window.getActionDayCost = getActionDayCost;

// Currency and grain units mirror config/game-constants.json. This classic
// script loads before the module bundle and cannot import JSON, so the copy is
// checked for drift by tests/verify-shared-constants.ts.
const CURRENCY_UNIT = { vi: 'Quan', en: 'quan' };
const GRAIN_UNIT = { vi: 'Thạch', en: 'piculs' };

function formatMoney(amount, lang) {
  const language = lang || (typeof currentLang !== 'undefined' ? currentLang : 'vi');
  const value = Math.round(Number(amount) || 0);
  const text = value.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN');
  return `${text} ${language === 'en' ? CURRENCY_UNIT.en : CURRENCY_UNIT.vi}`;
}

function formatGrain(amount, lang) {
  const language = lang || (typeof currentLang !== 'undefined' ? currentLang : 'vi');
  const value = Number(amount) || 0;
  const text = language === 'en' ? value.toFixed(2) : value.toFixed(2).replace('.', ',');
  return `${text} ${language === 'en' ? GRAIN_UNIT.en : GRAIN_UNIT.vi}`;
}

window.CURRENCY_UNIT = CURRENCY_UNIT;
window.GRAIN_UNIT = GRAIN_UNIT;
window.formatMoney = formatMoney;
window.formatGrain = formatGrain;

// Expose state to window for module interoperability
window.API_BASE = API_BASE;
window.storyChronicle = storyChronicle;
window.activeSubLocation = activeSubLocation;
window.lastEncounterSubLocation = lastEncounterSubLocation;
