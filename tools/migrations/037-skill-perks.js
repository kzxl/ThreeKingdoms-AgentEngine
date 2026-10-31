/**
 * Migration 037: skill perks at tiers 3 and 5.
 *
 * Each skill offers one mastery perk at tier 3 and one capstone at tier 5. The
 * player chooses one perk per (skill, tier); the effect is resolved by
 * SkillService together with the tier bonus.
 */

const DOMAIN_PERKS = {
  MARTIAL: ['DUEL_POWER', 2, 4],
  CRAFT: ['DEFECT_REDUCTION', 0.02, 0.04],
  COMMERCE: ['TRADE_MARGIN', 0.03, 0.06],
  LOGISTICS: ['TRAVEL_SPEED', 0.05, 0.1],
  TACTICS: ['SIEGE_POWER', 2, 4],
  LEADERSHIP: ['MORALE_BONUS', 2, 4],
  DIPLOMACY: ['CHECK_BONUS', 1, 2],
  POLITICS: ['CHECK_BONUS', 1, 2]
};

module.exports = {
  id: '037-skill-perks',
  description: 'Add mastery and capstone perks for every skill',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_perks (
        perk_code TEXT PRIMARY KEY,
        skill_code TEXT NOT NULL,
        tier INTEGER NOT NULL,
        name_vi TEXT NOT NULL,
        name_en TEXT NOT NULL,
        description_vi TEXT,
        description_en TEXT,
        effect_type TEXT NOT NULL,
        value REAL NOT NULL,
        UNIQUE(skill_code, tier)
      );
      CREATE TABLE IF NOT EXISTS player_perks (
        perk_code TEXT PRIMARY KEY,
        chosen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const hasSkills = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_skills';`
    ).get();
    if (!hasSkills) {
      console.log('      master_skills absent; perks left empty');
      return;
    }

    const insert = db.prepare(`
      INSERT OR REPLACE INTO master_perks
        (perk_code, skill_code, tier, name_vi, name_en, description_vi, description_en, effect_type, value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    const skills = db.prepare('SELECT skill_code, skill_name_vi, skill_name_en, domain FROM master_skills;').all();
    let count = 0;
    for (const skill of skills) {
      const [effectType, tier3Value, tier5Value] = DOMAIN_PERKS[skill.domain] || ['CHECK_BONUS', 1, 2];
      for (const tier of [3, 5]) {
        const suffix = tier === 3 ? 'MASTERY' : 'CAPSTONE';
        const value = tier === 3 ? tier3Value : tier5Value;
        insert.run(
          `${skill.skill_code}-P${tier}`,
          skill.skill_code,
          tier,
          `${skill.skill_name_vi} — ${tier === 3 ? 'Tinh Thông' : 'Tuyệt Kỹ'}`,
          `${skill.skill_name_en} — ${tier === 3 ? 'Mastery' : 'Capstone'}`,
          tier === 3 ? 'Chọn một perk tinh thông khi đạt bậc 3.' : 'Chọn một perk tuyệt kỹ khi đạt bậc 5.',
          tier === 3 ? 'Choose one mastery perk at tier 3.' : 'Choose one capstone perk at tier 5.',
          effectType,
          value
        );
        count += 1;
      }
    }
    console.log(`      ${count} skill perks ready`);
  }
};
