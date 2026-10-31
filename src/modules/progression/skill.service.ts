/**
 * ThreeKingdoms-AgentEngine: Skill Service
 * (src/modules/progression/skill.service.ts)
 *
 * One resolver for the structured skill effects introduced by migration 036.
 * Player skills are a single-character ladder (player_skills has no player_id),
 * so the service is bound to one database and reads the active character.
 */

import { DatabaseService } from '../../core/database';
import { applySkillExpGain, expRequiredForTier } from '../../shared/skill-exp';

export interface SkillEffectView {
  tier: number;
  effectType: string;
  value: number;
}

export interface SkillPerkView {
  perkCode: string;
  tier: number;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  effectType: string;
  value: number;
  chosen: boolean;
}

export interface PlayerSkillView {
  skillCode: string;
  nameVi: string;
  nameEn: string;
  domain: string;
  primaryAttr: string;
  tier: number;
  currentExp: number;
  maxExp: number;
  effects: SkillEffectView[];
  perks: SkillPerkView[];
}

export interface PlayerTalentView {
  talentCode: string;
  nameVi: string;
  nameEn: string;
  category: string;
  effectType: string;
  value: number;
}

export class SkillService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): SkillService {
    return new SkillService(db);
  }

  public list(): PlayerSkillView[] {
    let rows: any[];
    try {
      rows = this.db.query<any>(
        `SELECT ps.skill_code, ps.skill_name, ps.tier, ps.current_exp, ps.max_exp,
                ms.skill_name_vi, ms.skill_name_en, ms.domain, ms.primary_attr
         FROM player_skills ps
         LEFT JOIN master_skills ms ON ms.skill_code = ps.skill_code
         ORDER BY ps.tier DESC, ps.current_exp DESC, ps.skill_code ASC;`
      );
    } catch {
      // Legacy/sparse databases without the master skill catalog.
      rows = this.db.query<any>(
        `SELECT skill_code, skill_name, tier, current_exp, max_exp
         FROM player_skills ORDER BY tier DESC, current_exp DESC, skill_code ASC;`
      );
    }
    let chosen = new Set<string>();
    try {
      chosen = new Set(
        this.db.query<{ perk_code: string }>('SELECT perk_code FROM player_perks;')
          .map(row => row.perk_code)
      );
    } catch {
      chosen = new Set();
    }
    return rows.map(row => {
      let effects: SkillEffectView[] = [];
      try {
        effects = this.db.query<SkillEffectView>(
          `SELECT tier, effect_type AS effectType, value
           FROM master_skill_effects
           WHERE skill_code = ? AND tier <= ?;`,
          [row.skill_code, Number(row.tier || 1)]
        );
      } catch {
        effects = [];
      }
      let perks: SkillPerkView[] = [];
      try {
        perks = this.db.query<any>(
          `SELECT * FROM master_perks WHERE skill_code = ? ORDER BY tier ASC;`,
          [row.skill_code]
        ).map(perk => ({
          perkCode: perk.perk_code,
          tier: Number(perk.tier),
          nameVi: perk.name_vi,
          nameEn: perk.name_en,
          descriptionVi: perk.description_vi || '',
          descriptionEn: perk.description_en || '',
          effectType: perk.effect_type,
          value: Number(perk.value),
          chosen: chosen.has(perk.perk_code)
        }));
      } catch {
        perks = [];
      }
      return {
        skillCode: row.skill_code,
        nameVi: row.skill_name_vi || row.skill_name || row.skill_code,
        nameEn: row.skill_name_en || row.skill_name || row.skill_code,
        domain: row.domain || 'GENERAL',
        primaryAttr: row.primary_attr || 'INT',
        tier: Number(row.tier || 1),
        currentExp: Number(row.current_exp || 0),
        maxExp: Number(row.max_exp || 40),
        effects: effects.map(effect => ({
          tier: Number(effect.tier),
          effectType: String(effect.effectType),
          value: Number(effect.value)
        })),
        perks
      };
    });
  }

  /**
   * Sums an effect type across the player's skills, optionally restricted to a
   * set of skill codes (quest, travel, craft, duel).
   */
  public getEffectTotal(effectType: string, skillCodes?: string[]): number {
    const skills = this.list();
    const filter = skillCodes && skillCodes.length > 0 ? new Set(skillCodes) : null;
    let total = 0;
    for (const skill of skills) {
      if (filter && !filter.has(skill.skillCode)) continue;
      // Use the highest tier the player has reached, not the sum of every
      // lower tier (tier values are absolute bonuses, not cumulative steps).
      const effect = skill.effects
        .filter(item => item.effectType === effectType)
        .sort((a, b) => b.tier - a.tier)[0];
      if (effect) total += effect.value;
    }

    let chosen: any[] = [];
    try {
      chosen = this.db.query<any>(
        `SELECT mp.skill_code, mp.effect_type, mp.value
         FROM master_perks mp
         JOIN player_perks pp ON pp.perk_code = mp.perk_code;`
      );
    } catch {
      chosen = [];
    }
    for (const perk of chosen) {
      if (filter && !filter.has(perk.skill_code)) continue;
      if (perk.effect_type === effectType) total += Number(perk.value);
    }

    let talents: any[] = [];
    try {
      talents = this.db.query<any>(
        `SELECT mte.effect_type, mte.value
         FROM master_talent_effects mte
         JOIN player_talents pt ON pt.talent_code = mte.talent_code;`
      );
    } catch {
      talents = [];
    }
    for (const talent of talents) {
      if (talent.effect_type === effectType) total += Number(talent.value);
    }
    return Number(total.toFixed(4));
  }

  public getCheckBonus(skillCodes?: string[]): number {
    return Math.round(this.getEffectTotal('CHECK_BONUS', skillCodes));
  }

  public listTalents(): PlayerTalentView[] {
    try {
      return this.db.query<any>(
        `SELECT pt.talent_code, mt.name_vi, mt.name_en, mt.category,
                mte.effect_type, mte.value
         FROM player_talents pt
         LEFT JOIN master_talents mt ON mt.talent_code = pt.talent_code
         LEFT JOIN master_talent_effects mte ON mte.talent_code = pt.talent_code
         ORDER BY pt.talent_code ASC;`
      ).map(row => ({
        talentCode: row.talent_code,
        nameVi: row.name_vi || row.talent_code,
        nameEn: row.name_en || row.name_vi || row.talent_code,
        category: row.category || 'GENERAL',
        effectType: row.effect_type || 'CHECK_BONUS',
        value: Number(row.value || 0)
      }));
    } catch {
      return [];
    }
  }

  public hasSkill(skillCode: string): boolean {
    return Boolean(this.db.queryOne(
      'SELECT 1 AS ok FROM player_skills WHERE skill_code = ? LIMIT 1;',
      [skillCode]
    ));
  }

  /**
   * Offers the perks whose tier is reached and not yet taken. One perk per
   * (skill, tier) is enforced here because master_perks has a UNIQUE pair.
   */
  public availablePerks(skillCode: string): SkillPerkView[] {
    const skill = this.list().find(item => item.skillCode === skillCode);
    if (!skill) return [];
    return skill.perks.filter(perk => perk.tier <= skill.tier && !perk.chosen);
  }

  /**
   * Awards skill EXP and rolls tier-ups. Creates the row from master_skills if
   * the character has not learned the skill yet (profession bridge).
   */
  public awardExp(skillCode: string, amount: number): { tier: number; currentExp: number; maxExp: number } | null {
    const gain = Math.max(0, Math.round(Number(amount) || 0));
    if (!skillCode || gain === 0) return null;

    let row = this.db.queryOne<any>(
      'SELECT * FROM player_skills WHERE skill_code = ? LIMIT 1;',
      [skillCode]
    );
    if (!row) {
      const master = this.db.queryOne<any>(
        'SELECT skill_code, skill_name_vi FROM master_skills WHERE skill_code = ? LIMIT 1;',
        [skillCode]
      );
      if (!master) return null;
      this.db.execute(
        `INSERT INTO player_skills (skill_code, skill_name, tier, current_exp, max_exp)
         VALUES (?, ?, 1, 0, ?);`,
        [skillCode, master.skill_name_vi, expRequiredForTier(1)]
      );
      row = { tier: 1, current_exp: 0, max_exp: expRequiredForTier(1) };
    }

    const advanced = applySkillExpGain(
      Number(row.tier || 1),
      Number(row.current_exp || 0),
      gain
    );

    this.db.execute(
      'UPDATE player_skills SET tier = ?, current_exp = ?, max_exp = ? WHERE skill_code = ?;',
      [advanced.tier, advanced.currentExp, advanced.maxExp, skillCode]
    );
    return { tier: advanced.tier, currentExp: advanced.currentExp, maxExp: advanced.maxExp };
  }

  public choosePerk(perkCode: string): SkillPerkView {    const perk = this.db.queryOne<any>(
      'SELECT * FROM master_perks WHERE perk_code = ? LIMIT 1;',
      [perkCode]
    );
    if (!perk) throw new Error(`Perk ${perkCode} not found.`);

    const skill = this.db.queryOne<any>(
      'SELECT tier FROM player_skills WHERE skill_code = ? LIMIT 1;',
      [perk.skill_code]
    );
    if (!skill) throw new Error('Chưa học kỹ năng này.');
    if (Number(skill.tier) < Number(perk.tier)) {
      throw new Error(`Cần kỹ năng bậc ${perk.tier} để chọn perk này.`);
    }

    const already = this.db.queryOne<any>(
      `SELECT mp.perk_code FROM master_perks mp
       JOIN player_perks pp ON pp.perk_code = mp.perk_code
       WHERE mp.skill_code = ? AND mp.tier = ? LIMIT 1;`,
      [perk.skill_code, perk.tier]
    );
    if (already) throw new Error(`Đã chọn perk bậc ${perk.tier} cho kỹ năng này.`);

    this.db.execute(
      'INSERT OR REPLACE INTO player_perks (perk_code) VALUES (?);',
      [perkCode]
    );
    return {
      perkCode: perk.perk_code,
      tier: Number(perk.tier),
      nameVi: perk.name_vi,
      nameEn: perk.name_en,
      descriptionVi: perk.description_vi || '',
      descriptionEn: perk.description_en || '',
      effectType: perk.effect_type,
      value: Number(perk.value),
      chosen: true
    };
  }
}
