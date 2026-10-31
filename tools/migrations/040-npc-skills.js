/**
 * Migration 040: NPC skills and deterministic perk selection.
 *
 * `npc_skills` only held workshop artisans, so NPC commanders fought with bare
 * attributes. This migration seeds an aptitude ladder for every `npc_state`
 * officer from the canonical attributes and grants the best perk for each
 * reached tier into `npc_perks`.
 */

const { expRequiredForTier } = require('../../engine/skill-exp');

function tierFor(attribute) {
  if (attribute >= 85) return 4;
  if (attribute >= 75) return 3;
  if (attribute >= 65) return 2;
  if (attribute >= 55) return 1;
  return 0;
}

function skillsFor(npc) {
  const assignments = [];
  const add = (code, attribute) => {
    const tier = tierFor(attribute);
    if (tier > 0) assignments.push([code, tier]);
  };

  add('SKL-WAR-DUEL', npc.war_attr);
  add('SKL-TAC-STRAT', npc.int_attr);
  add('SKL-LDR-DRILL', npc.ldr_attr);
  add('SKL-LOG-PROV', npc.log_attr);
  add('SKL-COM-APPRAISE', npc.com_attr);
  add('SKL-POL-ADMIN', npc.pol_attr);
  add('SKL-DIP-RHET', npc.dip_attr);
  const role = String(npc.assigned_role || '');
  const craftCode = /SMITH|FOUNDRY|FORGE/.test(role) ? 'SKL-CRA-SMITH' : 'SKL-CRA-WEAVE';
  add(craftCode, npc.cra_attr);
  return assignments;
}

module.exports = {
  id: '040-npc-skills',
  description: 'Seed NPC skill ladders and deterministic perks',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS npc_perks (
        npc_id TEXT NOT NULL,
        perk_code TEXT NOT NULL,
        chosen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (npc_id, perk_code)
      );
    `);

    const hasMaster = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_skills';`
    ).get();
    const hasNpc = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'npc_state';`
    ).get();
    if (!hasMaster || !hasNpc) {
      console.log('      master_skills or npc_state absent; NPC skills left untouched');
      return;
    }

    const master = new Map(
      db.prepare('SELECT skill_code, skill_name_vi, skill_name_en FROM master_skills;')
        .all()
        .map(row => [row.skill_code, row])
    );
    const insertSkill = db.prepare(`
      INSERT OR IGNORE INTO npc_skills
        (npc_id, skill_code, skill_name, tier, current_exp, max_exp)
      VALUES (?, ?, ?, ?, 0, ?);
    `);

    let seeded = 0;
    for (const npc of db.prepare("SELECT * FROM npc_state WHERE npc_id NOT LIKE 'CHILD-%';").all()) {
      for (const [code, tier] of skillsFor(npc)) {
        const skill = master.get(code);
        if (!skill) continue;
        insertSkill.run(
          npc.npc_id,
          code,
          skill.skill_name_vi || skill.skill_name_en || code,
          tier,
          expRequiredForTier(tier)
        );
        seeded += 1;
      }
    }

    let perks = 0;
    const hasPerks = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_perks';`
    ).get();
    if (hasPerks) {
      const bestPerk = db.prepare(`
        SELECT perk_code FROM master_perks
        WHERE skill_code = ? AND tier = ?
        ORDER BY value DESC, perk_code ASC LIMIT 1;
      `);
      const insertPerk = db.prepare(
        'INSERT OR IGNORE INTO npc_perks (npc_id, perk_code) VALUES (?, ?);'
      );
      const rows = db.prepare('SELECT npc_id, skill_code, tier FROM npc_skills;').all();
      for (const row of rows) {
        for (const tier of [3, 5]) {
          if (Number(row.tier) < tier) continue;
          const perk = bestPerk.get(row.skill_code, tier);
          if (perk) {
            insertPerk.run(row.npc_id, perk.perk_code);
            perks += 1;
          }
        }
      }
    }

    console.log(`      NPC skill rows: ${seeded}, perks: ${perks}`);
  }
};
