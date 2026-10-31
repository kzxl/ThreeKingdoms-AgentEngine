/**
 * ThreeKingdoms-AgentEngine: Skill Service
 * (src/modules/progression/skill.service.ts)
 *
 * One resolver for the structured skill effects introduced by migration 036.
 * Player skills are a single-character ladder (player_skills has no player_id),
 * so the service is bound to one database and reads the active character.
 */

import { DatabaseService } from '../../core/database';

export interface SkillEffectView {
  tier: number;
  effectType: string;
  value: number;
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
}

export class SkillService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): SkillService {
    return new SkillService(db);
  }

  public list(): PlayerSkillView[] {
    const rows = this.db.query<any>(
      `SELECT ps.skill_code, ps.skill_name, ps.tier, ps.current_exp, ps.max_exp,
              ms.skill_name_vi, ms.skill_name_en, ms.domain, ms.primary_attr
       FROM player_skills ps
       LEFT JOIN master_skills ms ON ms.skill_code = ps.skill_code
       ORDER BY ps.tier DESC, ps.current_exp DESC, ps.skill_code ASC;`
    );
    return rows.map(row => {
      const effects = this.db.query<SkillEffectView>(
        `SELECT tier, effect_type AS effectType, value
         FROM master_skill_effects
         WHERE skill_code = ? AND tier <= ?;`,
        [row.skill_code, Number(row.tier || 1)]
      );
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
        }))
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
    return Number(total.toFixed(4));
  }

  public getCheckBonus(skillCodes?: string[]): number {
    return Math.round(this.getEffectTotal('CHECK_BONUS', skillCodes));
  }

  public hasSkill(skillCode: string): boolean {
    return Boolean(this.db.queryOne(
      'SELECT 1 AS ok FROM player_skills WHERE skill_code = ? LIMIT 1;',
      [skillCode]
    ));
  }
}
