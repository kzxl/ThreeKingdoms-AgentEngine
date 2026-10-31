/**
 * Migration 041: talent-specific structured effects.
 *
 * Migration 038 gave every talent in a category the same effect, so "Bridge-
 * Shaking Roar" and "Peerless" were mechanically identical. This migration
 * writes a curated effect list for each of the 33 master talents while leaving
 * the category fallback in `SkillService` for homebrew/test talents.
 */

const TALENT_EFFECTS = {
  // COMMERCE
  'TLT-MASTER-METALLURGIST': [['DEFECT_REDUCTION', 0.05], ['CHECK_BONUS', 2]],
  'TLT-CALC': [['TRADE_MARGIN', 0.03], ['CHECK_BONUS', 2]],
  'TLT-SILK-WEAVER-PRODIGY': [['DEFECT_REDUCTION', 0.04], ['CHECK_BONUS', 2]],
  'TLT-MERCHANT-PRINCE': [['TRADE_MARGIN', 0.06], ['CHECK_BONUS', 3]],
  'TLT-FACTOR-MONOPOLY': [['TRADE_MARGIN', 0.04], ['CHECK_BONUS', 2]],
  // GOVERNANCE
  'TLT-DIVINE-HEALER': [['MORALE_BONUS', 3], ['CHECK_BONUS', 4]],
  'TLT-GRAIN-FOREMAN': [['CHECK_BONUS', 2], ['MORALE_BONUS', 2]],
  'TLT-BENEVOLENCE': [['MORALE_BONUS', 4], ['CHECK_BONUS', 2]],
  'TLT-HOUSEHOLD-STEWARD': [['MORALE_BONUS', 2], ['CHECK_BONUS', 2]],
  'TLT-CALM': [['CHECK_BONUS', 2], ['MORALE_BONUS', 2]],
  'TLT-SWIFT-CARTER': [['TRAVEL_SPEED', 0.12], ['CHECK_BONUS', 2]],
  // LEADERSHIP
  'TLT-SWORD-LOYALTY': [['MORALE_BONUS', 4], ['CHECK_BONUS', 4]],
  'TLT-VOID-HERO': [['DUEL_POWER', 3], ['CHECK_BONUS', 4]],
  'TLT-PROPHET': [['MORALE_BONUS', 3], ['CHECK_BONUS', 3]],
  // MARTIAL
  'TLT-IRON-BASTION': [['SIEGE_POWER', 3], ['MORALE_BONUS', 2]],
  'TLT-PEERLESS': [['DUEL_POWER', 5]],
  'TLT-UNRIVALED-MIGHT': [['DUEL_POWER', 5]],
  'TLT-UNRIVALED-WARRIOR': [['DUEL_POWER', 5], ['CHECK_BONUS', 3]],
  'TLT-ROAR-FEI': [['DUEL_POWER', 4], ['MORALE_BONUS', 3]],
  'TLT-ROARING-THUNDER': [['DUEL_POWER', 4], ['SIEGE_POWER', 3]],
  'TLT-TIGER-GUARD': [['DUEL_POWER', 3], ['MORALE_BONUS', 3]],
  'TLT-IRON-ESCORT': [['TRAVEL_SPEED', 0.08], ['CHECK_BONUS', 2]],
  'TLT-GOD-WAR': [['DUEL_POWER', 5], ['CHECK_BONUS', 4]],
  'TLT-GOD-OF-WAR': [['DUEL_POWER', 5], ['MORALE_BONUS', 3]],
  'TLT-ROAR-BRIDGE': [['DUEL_POWER', 3], ['MORALE_BONUS', 2]],
  'TLT-DRAGON-HEART': [['DUEL_POWER', 5], ['CHECK_BONUS', 3]],
  // STRATEGY
  'TLT-FIRE-GENIUS': [['SIEGE_POWER', 4], ['CHECK_BONUS', 4]],
  'TLT-FLAME-EMPEROR': [['SIEGE_POWER', 4], ['MORALE_BONUS', 2]],
  'TLT-WOLF-PATIENCE': [['SIEGE_POWER', 3], ['CHECK_BONUS', 4]],
  'TLT-DIVINE-CALCULATOR': [['CHECK_BONUS', 5], ['SIEGE_POWER', 4]],
  'TLT-DRAGON-WIT': [['SIEGE_POWER', 4], ['CHECK_BONUS', 4]],
  'TLT-DRAGON-STRAT': [['SIEGE_POWER', 4], ['MORALE_BONUS', 2]],
  'TLT-GHOST-STRATEGIST': [['CHECK_BONUS', 5], ['SIEGE_POWER', 4]]
};

module.exports = {
  id: '041-talent-effects',
  description: 'Give each master talent its own structured effect list',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_talent_effects (
        talent_code TEXT NOT NULL,
        effect_type TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (talent_code, effect_type)
      );
    `);
    db.exec('DELETE FROM master_talent_effects;');

    const insert = db.prepare(`
      INSERT OR REPLACE INTO master_talent_effects (talent_code, effect_type, value)
      VALUES (?, ?, ?);
    `);
    let effects = 0;
    for (const [talentCode, rows] of Object.entries(TALENT_EFFECTS)) {
      for (const [effectType, value] of rows) {
        insert.run(talentCode, effectType, value);
        effects += 1;
      }
    }
    console.log(`      talent effects: ${Object.keys(TALENT_EFFECTS).length} talents, ${effects} effects`);
  }
};
