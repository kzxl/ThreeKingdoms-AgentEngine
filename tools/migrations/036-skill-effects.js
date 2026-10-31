/**
 * Migration 036: structured skill effects and quest skill links.
 *
 * `master_skills.tier_N_effect_vi` was descriptive text with no consumer. This
 * migration creates a structured effect table (tier 2–5) and links every quest
 * step to the skill that should modify its check.
 */

const DOMAIN_EFFECTS = {
  COMMERCE: [['TRADE_MARGIN', 0.02]],
  CRAFT: [['DEFECT_REDUCTION', 0.01]],
  DIPLOMACY: [],
  LEADERSHIP: [['MORALE_BONUS', 1]],
  LOGISTICS: [['TRAVEL_SPEED', 0.04]],
  MARTIAL: [['DUEL_POWER', 1]],
  POLITICS: [],
  TACTICS: [['SIEGE_POWER', 1]]
};

const QUEST_STEP_SKILLS = {
  'Q-MARTIAL-01': ['SKL-WAR-DUEL', 'SKL-WAR-SPEAR', 'SKL-LDR-CRACK'],
  'Q-MERCHANT-01': ['SKL-COM-APPRAISE', 'SKL-COM-CARAVAN', 'SKL-COM-SPECULATE'],
  'Q-SCHOLAR-01': ['SKL-TAC-STRAT', 'SKL-DIP-RHET', 'SKL-POL-ADMIN'],
  'Q-ARTISAN-01': ['SKL-CRA-SMITH', 'SKL-CRA-WEAVE', 'SKL-CRA-SMITH'],
  'Q-LINEAGE-01': ['SKL-DIP-TALENT', 'SKL-POL-BENEV', 'SKL-DIP-ALLIANCE']
};

module.exports = {
  id: '036-skill-effects',
  description: 'Create master_skill_effects and link quest steps to skills',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_skill_effects (
        skill_code TEXT NOT NULL,
        tier INTEGER NOT NULL,
        effect_type TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (skill_code, tier, effect_type)
      );
    `);

    const hasSkills = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_skills';`
    ).get();
    if (hasSkills) {
      const skills = db.prepare('SELECT skill_code, domain FROM master_skills;').all();
      const insert = db.prepare(`
        INSERT OR REPLACE INTO master_skill_effects (skill_code, tier, effect_type, value)
        VALUES (?, ?, ?, ?);
      `);
      for (const skill of skills) {
        for (let tier = 2; tier <= 5; tier += 1) {
          insert.run(skill.skill_code, tier, 'CHECK_BONUS', tier - 1);
          for (const [type, perTier] of DOMAIN_EFFECTS[skill.domain] || []) {
            insert.run(skill.skill_code, tier, type, Number((perTier * (tier - 1)).toFixed(4)));
          }
        }
      }
      console.log(`      skill effects seeded for ${skills.length} skills`);
    }

    const hasSteps = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_quest_steps';`
    ).get();
    if (hasSteps) {
      const columns = db.prepare('PRAGMA table_info(master_quest_steps)').all().map(c => c.name);
      if (!columns.includes('skill_code')) {
        db.exec('ALTER TABLE master_quest_steps ADD COLUMN skill_code TEXT;');
      }
      for (const [questId, skills] of Object.entries(QUEST_STEP_SKILLS)) {
        skills.forEach((skill, index) => {
          db.prepare(
            'UPDATE master_quest_steps SET skill_code = ? WHERE quest_id = ? AND step_index = ?;'
          ).run(skill, questId, index);
        });
      }
      console.log('      quest steps linked to skills');
    }
  }
};
