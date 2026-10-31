/**
 * NPC skill resolver.
 *
 * NPCs use the same `master_skills` / `master_skill_effects` / `master_perks`
 * catalogs as the player. They do not pick perks interactively: every reached
 * perk tier is resolved deterministically (highest value, then perk code), so
 * an NPC commander's duel, siege and morale bonuses are stable across runs.
 *
 * Generals who exist only in `master_characters` have no `npc_skills` rows
 * (the table's foreign key targets `npc_state`); their aptitude is derived from
 * the canonical attributes so historical commanders still fight with skill.
 */

import { DatabaseService } from '../../core/database';

export interface NpcPerkView {
  perkCode: string;
  skillCode: string;
  tier: number;
  nameVi: string;
  nameEn: string;
  effectType: string;
  value: number;
}

export interface NpcSkillView {
  skillCode: string;
  nameVi: string;
  nameEn: string;
  domain: string;
  tier: number;
  currentExp: number;
  maxExp: number;
  effects: Array<{ tier: number; effectType: string; value: number }>;
  perks: NpcPerkView[];
}

export interface NpcCombatBonuses {
  duelPower: number;
  siegePower: number;
  moraleBonus: number;
}

function attributeGrade(value: number, legendary: number, epic: number, veteran: number): number {
  if (value >= legendary) return 4;
  if (value >= epic) return 3;
  if (value >= veteran) return 2;
  if (value >= 55) return 1;
  return 0;
}

export class NpcSkillService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): NpcSkillService {
    return new NpcSkillService(db);
  }

  public listSkills(npcId: string): NpcSkillView[] {
    let rows: any[] = [];
    try {
      rows = this.db.query<any>(
        `SELECT ns.skill_code, ns.skill_name, ns.tier, ns.current_exp, ns.max_exp,
                ms.skill_name_vi, ms.skill_name_en, ms.domain
         FROM npc_skills ns
         LEFT JOIN master_skills ms ON ms.skill_code = ns.skill_code
         WHERE ns.npc_id = ?
         ORDER BY ns.tier DESC, ns.skill_code ASC;`,
        [npcId]
      );
    } catch {
      return [];
    }

    let persisted: NpcPerkView[] = [];
    try {
      persisted = this.db.query<any>(
        `SELECT np.npc_id, mp.perk_code, mp.skill_code, mp.tier, mp.name_vi, mp.name_en,
                mp.effect_type, mp.value
         FROM npc_perks np
         JOIN master_perks mp ON mp.perk_code = np.perk_code
         WHERE np.npc_id = ?;`,
        [npcId]
      ).map(row => ({
        perkCode: row.perk_code,
        skillCode: row.skill_code,
        tier: Number(row.tier),
        nameVi: row.name_vi,
        nameEn: row.name_en,
        effectType: row.effect_type,
        value: Number(row.value)
      }));
    } catch {
      persisted = [];
    }

    return rows.map(row => {
      const tier = Number(row.tier || 1);
      let effects: NpcSkillView['effects'] = [];
      try {
        effects = this.db.query<any>(
          `SELECT tier, effect_type AS effectType, value
           FROM master_skill_effects
           WHERE skill_code = ? AND tier <= ?;`,
          [row.skill_code, tier]
        ).map(effect => ({
          tier: Number(effect.tier),
          effectType: String(effect.effectType),
          value: Number(effect.value)
        }));
      } catch {
        effects = [];
      }
      const perks = this.resolvePerks(row.skill_code, tier, persisted);
      return {
        skillCode: row.skill_code,
        nameVi: row.skill_name_vi || row.skill_name || row.skill_code,
        nameEn: row.skill_name_en || row.skill_name || row.skill_code,
        domain: row.domain || 'GENERAL',
        tier,
        currentExp: Number(row.current_exp || 0),
        maxExp: Number(row.max_exp || 0),
        effects,
        perks
      };
    });
  }

  /**
   * Sums one effect type for an NPC. Explicit skill rows win; a master-only
   * general falls back to an aptitude grade derived from his attributes.
   */
  public effectTotal(npcId: string, effectType: string, skillCodes?: string[]): number {
    const skills = this.listSkills(npcId);
    if (skills.length === 0) return this.derivedEffect(npcId, effectType);

    const filter = skillCodes && skillCodes.length > 0 ? new Set(skillCodes) : null;
    let total = 0;
    for (const skill of skills) {
      if (filter && !filter.has(skill.skillCode)) continue;
      const best = skill.effects
        .filter(effect => effect.effectType === effectType)
        .sort((a, b) => b.tier - a.tier)[0];
      if (best) total += best.value;
      for (const perk of skill.perks) {
        if (perk.effectType === effectType) total += perk.value;
      }
    }
    return Number(total.toFixed(4));
  }

  public combatBonuses(npcId: string): NpcCombatBonuses {
    return {
      duelPower: Math.round(this.effectTotal(npcId, 'DUEL_POWER')),
      siegePower: Math.round(this.effectTotal(npcId, 'SIEGE_POWER')),
      moraleBonus: Math.round(this.effectTotal(npcId, 'MORALE_BONUS'))
    };
  }

  /**
   * Persists the deterministic perk selection. Called by migration 040 and
   * available for future NPC level-up hooks.
   */
  public ensurePerks(npcId: string): number {
    const skills = this.listSkills(npcId);
    const chosenTiers = new Map<string, Set<number>>();
    try {
      const rows = this.db.query<any>(
        `SELECT mp.skill_code, mp.tier
         FROM npc_perks np
         JOIN master_perks mp ON mp.perk_code = np.perk_code
         WHERE np.npc_id = ?;`,
        [npcId]
      );
      for (const row of rows) {
        const set = chosenTiers.get(row.skill_code) || new Set<number>();
        set.add(Number(row.tier));
        chosenTiers.set(row.skill_code, set);
      }
    } catch {
      // npc_perks is optional in sparse fixtures.
    }

    let inserted = 0;
    for (const skill of skills) {
      const already = chosenTiers.get(skill.skillCode) || new Set<number>();
      let candidates: any[] = [];
      try {
        candidates = this.db.query<any>(
          `SELECT perk_code, tier FROM master_perks
           WHERE skill_code = ? AND tier <= ?
           ORDER BY value DESC, perk_code ASC;`,
          [skill.skillCode, skill.tier]
        );
      } catch {
        candidates = [];
      }
      const seen = new Set<number>();
      for (const candidate of candidates) {
        const tier = Number(candidate.tier);
        if (already.has(tier) || seen.has(tier)) continue;
        seen.add(tier);
        try {
          this.db.execute(
            'INSERT OR IGNORE INTO npc_perks (npc_id, perk_code) VALUES (?, ?);',
            [npcId, candidate.perk_code]
          );
          inserted += 1;
        } catch {
          return inserted;
        }
      }
    }
    return inserted;
  }

  private resolvePerks(skillCode: string, tier: number, persisted: NpcPerkView[]): NpcPerkView[] {
    const chosen = persisted.filter(perk => perk.skillCode === skillCode && perk.tier <= tier);
    if (chosen.length > 0) return chosen;
    try {
      return this.db.query<any>(
        `SELECT perk_code, skill_code, tier, name_vi, name_en, effect_type, value
         FROM master_perks
         WHERE skill_code = ? AND tier <= ?
         ORDER BY tier ASC, value DESC, perk_code ASC;`,
        [skillCode, tier]
      ).reduce<NpcPerkView[]>((perks, row) => {
        if (perks.some(perk => perk.tier === Number(row.tier))) return perks;
        perks.push({
          perkCode: row.perk_code,
          skillCode: row.skill_code,
          tier: Number(row.tier),
          nameVi: row.name_vi,
          nameEn: row.name_en,
          effectType: row.effect_type,
          value: Number(row.value)
        });
        return perks;
      }, []);
    } catch {
      return [];
    }
  }

  private derivedEffect(npcId: string, effectType: string): number {
    const stats = this.lookupAttributes(npcId);
    if (!stats) return 0;
    switch (effectType) {
      case 'DUEL_POWER':
        return attributeGrade(stats.war, 95, 85, 75);
      case 'SIEGE_POWER':
        return attributeGrade(stats.int, 95, 85, 75);
      case 'MORALE_BONUS':
        return attributeGrade(stats.ldr, 95, 85, 75);
      case 'TRADE_MARGIN':
        return attributeGrade(stats.com, 90, 80, 70) * 0.01;
      case 'DEFECT_REDUCTION':
        return attributeGrade(stats.cra, 90, 80, 70) * 0.01;
      case 'TRAVEL_SPEED':
        return attributeGrade(stats.log, 90, 80, 70) * 0.04;
      case 'CHECK_BONUS':
        return Math.min(3, attributeGrade(Math.max(
          stats.war, stats.int, stats.ldr, stats.com, stats.cra, stats.log
        ), 95, 85, 75) - 1);
      default:
        return 0;
    }
  }

  private lookupAttributes(npcId: string): {
    war: number; int: number; ldr: number; com: number; cra: number; log: number;
  } | null {
    try {
      const npc = this.db.queryOne<any>(
        `SELECT war_attr, int_attr, ldr_attr, com_attr, cra_attr, log_attr
         FROM npc_state WHERE npc_id = ? LIMIT 1;`,
        [npcId]
      );
      if (npc) return this.toStats(npc);
      const master = this.db.queryOne<any>(
        `SELECT war_attr, int_attr, ldr_attr, com_attr, cra_attr, log_attr
         FROM master_characters WHERE npc_id = ? LIMIT 1;`,
        [npcId]
      );
      return master ? this.toStats(master) : null;
    } catch {
      return null;
    }
  }

  private toStats(row: any) {
    return {
      war: Number(row.war_attr || 0),
      int: Number(row.int_attr || 0),
      ldr: Number(row.ldr_attr || 0),
      com: Number(row.com_attr || 0),
      cra: Number(row.cra_attr || 0),
      log: Number(row.log_attr || 0)
    };
  }
}
