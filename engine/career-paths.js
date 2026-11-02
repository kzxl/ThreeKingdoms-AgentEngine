/**
 * Career paths — one resolver for the five identity ladders.
 *
 * The progression API used to compute path scores inline while no service read
 * them, so the advertised bonuses were flavour text. This module is now the
 * single source: controllers display the same scores the gameplay code applies,
 * and `getCareerModifiers` returns the active path's real modifiers.
 *
 * A reader is any object with `queryOne(sql, params)` and `query(sql, params)`.
 * `DatabaseService` satisfies it directly; engine callers use `readerForDbPath`.
 */

const PATHS = [
  {
    code: 'MARTIAL', nameVi: 'Võ Lộ', nameEn: 'Martial Path', seal: '武',
    effectVi: '+10% WAR EXP khi luyện võ, đấu tay đôi và giao chiến',
    effectEn: '+10% WAR EXP from training, duels and battles'
  },
  {
    code: 'MERCHANT', nameVi: 'Thương Lộ', nameEn: 'Merchant Path', seal: '商',
    effectVi: '+5% biên lợi nhuận mua bán',
    effectEn: '+5% trade margin on purchases and sales'
  },
  {
    code: 'SCHOLAR', nameVi: 'Sĩ Lộ', nameEn: 'Scholar Path', seal: '士',
    effectVi: '+10% INT/POL EXP khi nghiên cứu và triều đàm',
    effectEn: '+10% INT/POL EXP from study and court talks'
  },
  {
    code: 'ARTISAN', nameVi: 'Công Lộ', nameEn: 'Artisan Path', seal: '工',
    effectVi: '-2% phế phẩm mỗi bậc nghề khi chế tác',
    effectEn: '-2% defect chance per profession tier when crafting'
  },
  {
    code: 'LINEAGE', nameVi: 'Tông Tộc Lộ', nameEn: 'Dynastic Clan Path', seal: '家',
    effectVi: '+10% uy tín gia tộc khi kết hôn, sinh nở và kế vị',
    effectEn: '+10% clan prestige from marriage, birth and succession'
  }
];

const DEFAULT_MODIFIERS = {
  expMultiplier: {},
  tradeMargin: 0,
  defectReduction: 0,
  clanPrestigeBonus: 0
};

function clampScore(value) {
  const numeric = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function computeCareerPaths(reader, playerId = 'PLY-0001') {
  const player = reader.queryOne(
    'SELECT war_attr, int_attr, pol_attr, dip_attr, com_attr, cra_attr, liquid_cash, fame FROM player_state WHERE player_id = ? LIMIT 1;',
    [playerId]
  ) || {};

  const duelWins = safe(() => Number(reader.queryOne(
    "SELECT COUNT(*) AS c FROM session_duels WHERE player_id = ? AND outcome_type = 'VICTORY';",
    [playerId]
  )?.c || 0), 0);

  const craftTier = Math.max(1, safe(() => Number(reader.queryOne(
    "SELECT MAX(tier) AS tier FROM character_professions WHERE character_id = ? AND category IN ('CRAFTING', 'EMERGENCY');",
    [playerId]
  )?.tier || 1), 1));

  const spouseCount = safe(() => Number(reader.queryOne(
    'SELECT COUNT(*) AS c FROM family_spouses WHERE husband_id = ? OR wife_id = ?;',
    [playerId, playerId]
  )?.c || 0), 0);
  const childCount = safe(() => Number(reader.queryOne(
    'SELECT COUNT(*) AS c FROM family_children WHERE father_id = ?;',
    [playerId]
  )?.c || 0), 0);

  const fame = Number(player.fame || 0);
  const familyScore = (spouseCount > 0 ? 30 : 0)
    + Math.min(40, childCount * 10)
    + Math.min(30, fame / 200);

  const scores = {
    MARTIAL: clampScore(Number(player.war_attr || 50) * 0.75 + Math.min(30, duelWins * 8)),
    MERCHANT: clampScore(Number(player.com_attr || 50) * 0.65 + Math.min(40, Number(player.liquid_cash || 0) / 500)),
    SCHOLAR: clampScore((Number(player.int_attr || 50) + Number(player.pol_attr || 50)) / 2),
    ARTISAN: clampScore(Number(player.cra_attr || 50) * 0.7 + craftTier * 6),
    LINEAGE: clampScore(familyScore)
  };

  const paths = PATHS.map(path => ({
    ...path,
    score: scores[path.code],
    modifiers: modifiersFor(path.code, { craftTier })
  })).sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));

  const active = paths[0];
  return {
    activePath: active.code,
    activeScore: active.score,
    paths,
    modifiers: active.modifiers,
    duelWins,
    craftTier
  };
}

function modifiersFor(code, context = {}) {
  const craftTier = Math.max(1, Number(context.craftTier || 1));
  const byPath = {
    MARTIAL: { expMultiplier: { war: 1.1 } },
    MERCHANT: { tradeMargin: 0.05 },
    SCHOLAR: { expMultiplier: { int: 1.1, pol: 1.1 } },
    ARTISAN: { defectReduction: 0.02 * craftTier },
    LINEAGE: { clanPrestigeBonus: 0.1 }
  };
  return {
    ...DEFAULT_MODIFIERS,
    ...(byPath[code] || {}),
    expMultiplier: { ...((byPath[code] || {}).expMultiplier || {}) }
  };
}

function getCareerModifiers(reader, playerId = 'PLY-0001') {
  const result = computeCareerPaths(reader, playerId);
  return {
    activePath: result.activePath,
    activeScore: result.activeScore,
    modifiers: result.modifiers
  };
}

/** Adapts a database path to the reader interface used by engine modules. */
function readerForDbPath(dbPath) {
  const { runSqlJson } = require('./db-adapter');
  return {
    queryOne: (sql, params = []) => runSqlJson(dbPath, sql, params)[0],
    query: (sql, params = []) => runSqlJson(dbPath, sql, params)
  };
}

/** Multiplier for one attribute's EXP on the active path. */
function expMultiplierFor(reader, attribute, playerId = 'PLY-0001') {
  const { modifiers } = getCareerModifiers(reader, playerId);
  return Number(modifiers.expMultiplier[attribute] || 1);
}

module.exports = {
  PATHS,
  DEFAULT_MODIFIERS,
  computeCareerPaths,
  getCareerModifiers,
  readerForDbPath,
  expMultiplierFor
};
