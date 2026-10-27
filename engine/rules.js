/**
 * ThreeKingdoms-AgentEngine: Simulation Rules & Mathematical Formulas (engine/rules.js)
 * Implements deterministic formulas from game/RULES.md and game/ECONOMY.md.
 */

// Baseline commodity price index (Eastern Han 184 AD wholesale benchmark)
const COMMODITY_PRICE_INDEX = {
  'COM-GRAIN': { name: 'Millet/Wheat', unit: 'Dan', basePrice: 160 },
  'COM-TIMBER': { name: 'Hardwood Timber', unit: 'Bundle', basePrice: 40 },
  'COM-BAMBOO': { name: 'Cured Bamboo', unit: 'Bundle', basePrice: 15 },
  'COM-TWINE': { name: 'Hemp Twine', unit: 'Spool', basePrice: 20 },
  'COM-LEATH': { name: 'Tanned Hide', unit: 'Piece', basePrice: 100 },
  'COM-IRON': { name: 'Pig Iron', unit: 'Jin', basePrice: 30 },
  'COM-SALT': { name: 'Refined Sea Salt', unit: 'Dou', basePrice: 65 },
  'COM-SPEAR': { name: 'Iron-Tipped Spear', unit: 'Unit', basePrice: 400 },
  'COM-SWORD': { name: 'Han Dao Sword', unit: 'Unit', basePrice: 800 },
  'COM-HORSE-D': { name: 'Pack Mule / Draft Horse', unit: 'Head', basePrice: 3500 },
  'COM-HORSE-W': { name: 'Northern War Steed', unit: 'Head', basePrice: 5000 },
  'PROD-MAT': { name: 'Woven Straw Mat', unit: 'Unit', basePrice: 25 },
  'PROD-BASK': { name: 'Military Grain Basket', unit: 'Unit', basePrice: 50 },
  'PROD-SHIELD-BAM': { name: 'Leather-Bound Bamboo Shield', unit: 'Unit', basePrice: 140 }
};

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

module.exports = {
  COMMODITY_PRICE_INDEX,
  BILL_OF_MATERIALS,
  resolveSkillCheck,
  calculateWorkshopCapacity,
  calculateDefectRate
};
