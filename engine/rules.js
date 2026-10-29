/**
 * ThreeKingdoms-AgentEngine: Simulation Rules & Mathematical Formulas (engine/rules.js)
 * Implements deterministic formulas from game/RULES.md and game/ECONOMY.md.
 *
 * Prices are not defined here: `master_items` is the only market-price source and
 * `engine/market-price-book.js` is the read path.
 */

// Bill of Materials (BOM) definitions for workshop production
const BILL_OF_MATERIALS = {
  'PROD-MAT': {
    laborHours: 2.0,
    materials: {
      'COM-BAMBOO': 0.25, // 0.25 bundle per mat
      'COM-TWINE': 0.10   // 0.10 spool per mat
    },
    baseDefectRate: 0.05 // 5% base defect
  },
  'PROD-BASK': {
    laborHours: 4.0,
    materials: {
      'COM-BAMBOO': 0.50,
      'COM-TWINE': 0.25
    },
    baseDefectRate: 0.08
  },
  'PROD-SHIELD-BAM': {
    laborHours: 6.0,
    materials: {
      'COM-BAMBOO': 0.80,
      'COM-LEATH': 0.50,
      'COM-TWINE': 0.20
    },
    baseDefectRate: 0.10
  }
};

/**
 * Calculates Skill Check Score:
 * Score = (Attribute * 0.5) + (Skill * 0.5) + Modifiers + d20
 */
function resolveSkillCheck(attributeVal, skillVal, modifiers = 0, d20Roll = 10) {
  const attrScore = attributeVal * 0.5;
  const skillScore = skillVal * 0.5;
  const totalScore = attrScore + skillScore + modifiers + d20Roll;
  return {
    attributeVal,
    skillVal,
    modifiers,
    d20Roll,
    totalScore,
    isSuccess: (dc) => totalScore >= dc
  };
}

/**
 * Calculates workshop monthly capacity in units:
 * Max Capacity = (Craftsmen * Hours/Day * Days/Month) / Labor Hours per Unit
 */
function calculateWorkshopCapacity(craftsmenCount, hoursPerDay, daysPerMonth, laborHoursPerUnit) {
  const totalLaborHours = craftsmenCount * hoursPerDay * daysPerMonth;
  return Math.floor(totalLaborHours / laborHoursPerUnit);
}

/**
 * Calculates scrap / defect rate:
 * Defect Rate = max(0.02, BaseDefect - (Craftsmanship * 0.0015) + (Fatigue * 0.001))
 */
function calculateDefectRate(baseDefect, craftsmanship, fatigue = 0) {
  const reduction = craftsmanship * 0.0015;
  const fatiguePenalty = fatigue * 0.001;
  const netDefect = baseDefect - reduction + fatiguePenalty;
  return Math.max(0.02, Math.min(0.50, netDefect));
}

/**
 * Calculates a character's canonical stamina profile based on War (WAR),
 * Vigor (Health), and current accumulated Fatigue.
 */
function calculatePlayerStamina(player) {
  const warAttr = Number(player?.war_attr !== undefined ? player.war_attr : (player?.war !== undefined ? player.war : 50));
  const healthVal = Number(player?.health !== undefined ? player.health : 100);
  const fatigueVal = Number(player?.fatigue || 0);

  const maxStamina = 100 + Math.max(0, Math.round((warAttr - 50) * 1.5)) + Math.floor(healthVal / 10);
  const currentStamina = Math.max(0, maxStamina - fatigueVal);
  const staminaPct = Math.min(100, Math.max(0, Math.round((currentStamina / maxStamina) * 100)));
  const fatiguePct = Math.min(100, Math.max(0, Math.round((fatigueVal / 100) * 100)));

  return {
    maxStamina,
    currentStamina,
    fatigue: fatigueVal,
    staminaPct,
    fatiguePct,
    health: healthVal,
    warAttr
  };
}

try {
  require('tsx/cjs');
  const { calculatePlayerStamina: canonicalStamina } = require('../src/shared/character-stats/index.ts');
  if (typeof canonicalStamina === 'function') {
    calculatePlayerStamina = canonicalStamina;
  }
} catch (e) {}

module.exports = {
  BILL_OF_MATERIALS,
  resolveSkillCheck,
  calculateWorkshopCapacity,
  calculateDefectRate,
  calculatePlayerStamina
};
