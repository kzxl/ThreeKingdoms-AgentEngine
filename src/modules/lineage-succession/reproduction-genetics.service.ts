/**
 * ThreeKingdoms-AgentEngine: Reproduction, Cohabitation & Genetics Domain Service
 * (src/modules/lineage-succession/reproduction-genetics.service.ts)
 *
 * Implements:
 * 1. Household roles assignment and cohabitation rest turns
 * 2. Gestation tick progression (3-stage cycle)
 * 3. Culturally authentic Han surname extraction & procedurally generated Han names
 * 4. Genetic attribute inheritance combining parental averages with [-3, +5] mutation and maternal perks
 * 5. Full childbirth registration in family_children and genealogy tree
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextSequentialId } from '../../shared/id-generator';
import {
  HouseholdRole,
  RestWithSpouseResult,
  BirthChildParams,
  BirthChildResult,
  GeneticAttributeRoll
} from './lineage-types';

export class ReproductionGeneticsService {
  private db: DatabaseService;

  public constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  /** Deterministic stream for name generation, mutation and gender rolls. */
  private rng() {
    return RngService.forDomain(this.db, 'lineage-genetics');
  }

  private getCampaignMeta(): { activeTurn: number; currentDate: string; campaignId: string } {
    try {
      const row = this.db.queryOne<any>(
        'SELECT active_turn, "current_date", campaign_id FROM campaign_meta LIMIT 1;'
      );
      if (row) {
        return {
          activeTurn: Number(row.active_turn) || 6,
          currentDate: row.current_date || '184-05-02',
          campaignId: row.campaign_id || 'CMP-184-ZHOU-01'
        };
      }
    } catch {
      // Fallback
    }
    return { activeTurn: 6, currentDate: '184-05-02', campaignId: 'CMP-184-ZHOU-01' };
  }

  /**
   * Checks whether a character is actively commanding a military expedition in the field.
   */
  public isCharacterInActiveExpedition(characterId: string): boolean {
    try {
      const active = this.db.queryOne<any>(
        "SELECT expedition_id FROM military_expeditions WHERE commander_id = ? AND status != 'CONCLUDED' LIMIT 1;",
        [characterId]
      );
      return !!active;
    } catch {
      return false;
    }
  }

  /**
   * Extracts authentic Chinese single or compound surname from full Vietnamese transcription.
   */
  public extractAuthenticSurname(fullName: string): string {
    if (!fullName) return 'Lương';
    const trimmed = fullName.trim();
    const compoundSurnames = [
      'Gia Cát',
      'Hạ Hầu',
      'Tư Mã',
      'Âu Dương',
      'Độc Cô',
      'Hoàng Phủ',
      'Thượng Quan',
      'Chư Cát',
      'Công Tôn'
    ];
    for (const comp of compoundSurnames) {
      if (trimmed.startsWith(comp)) {
        return comp;
      }
    }
    const parts = trimmed.split(/\s+/);
    return parts[0] || 'Lương';
  }

  /**
   * Procedurally generates culturally authentic Han names incorporating father's authentic surname.
   */
  public generateChildHanName(
    fatherName: string,
    gender: 'MALE' | 'FEMALE'
  ): { nameVi: string; nameEn: string; styleName: string } {
    const surname = this.extractAuthenticSurname(fatherName);
    const maleGiven = ['Hưng', 'Bào', 'Thống', 'Bình', 'Hạo', 'Minh', 'Kế', 'Tùng', 'Đạt', 'Vũ', 'Ninh', 'Sách'];
    const femaleGiven = ['Uyển', 'Nguyệt', 'Hương', 'Lan', 'Dung', 'Châu', 'Trâm', 'Khanh', 'Sương', 'Diễm', 'Thư'];
    const givenList = gender === 'MALE' ? maleGiven : femaleGiven;
    const given = givenList[Math.floor(this.rng().nextFloat() * givenList.length)];
    const fullName = `${surname} ${given}`;
    const styleName = gender === 'MALE' ? 'Tử Viễn' : 'Uyển Khanh';
    return { nameVi: fullName, nameEn: fullName, styleName };
  }

  /**
   * Assigns specialized household roles to married spouses.
   */
  public assignHouseholdRole(marriageId: string, role: HouseholdRole): void {
    const roleDescriptions: Record<HouseholdRole, string> = {
      HOUSEKEEPER: 'Tăng 30% tốc độ hồi phục thể lực khi nghỉ ngơi, duy trì hòa khí gia thất.',
      ENTERPRISE_SUPERVISOR: 'Gia tăng 15% hiệu suất sản nghiệp và triệt tiêu tỷ lệ hao hụt nguyên liệu.',
      STRATEGIC_ADVISOR: 'Gia tăng 25% điểm EXP Mưu Lược và Chính Trị cho con cái khi thụ giáo đại sư.',
      MILITARY_DEFENDER: 'Thân chinh áp tải tiêu xa thương đoàn, giảm trừ nguy cơ bị thảo khấu phục kích.'
    };

    const desc = roleDescriptions[role] || 'Trông nom gia thất.';
    const result = this.db.execute(
      'UPDATE family_spouses SET household_role = ?, role_effect_desc_vi = ?, updated_at = CURRENT_TIMESTAMP WHERE marriage_id = ?;',
      [role, desc, marriageId]
    );

    if (result.changes === 0) {
      throw new Error(`Không tìm thấy hôn ước ${marriageId} để phân công nội vụ!`);
    }
  }

  /**
   * Executes a cohabitation rest turn with spouse.
   * Restores protagonist fatigue and rolls for pregnancy conception.
   */
  public restWithSpouse(marriageId: string): RestWithSpouseResult {
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      const spouse = this.db.queryOne<any>(
        "SELECT * FROM family_spouses WHERE marriage_id = ? AND status = 'MARRIED';",
        [marriageId]
      );
      if (!spouse) {
        throw new Error(`Không tìm thấy thê thất ${marriageId} đang chung sống!`);
      }

      // Check active military expedition blocker
      if (this.isCharacterInActiveExpedition(spouse.husband_id)) {
        throw new Error('Không thể đồng phòng nghỉ ngơi vì phu quân đang thống lĩnh binh mã tại chiến trường sa trường!');
      }

      const player = this.db.queryOne<any>(
        'SELECT fatigue, health, morale FROM player_state WHERE player_id = ?;',
        [spouse.husband_id]
      );
      if (!player) {
        throw new Error('Không tìm thấy trạng thái chủ nhân gia tộc!');
      }

      // Calculate Fatigue Recovery (boosted if HOUSEKEEPER)
      const isHousekeeper = spouse.household_role === 'HOUSEKEEPER';
      const fatigueRecovery = isHousekeeper ? 45 : 30;
      const moraleBoost = 5;

      const newFatigue = Math.max(0, Number(player.fatigue || 0) - fatigueRecovery);
      const newMorale = Math.min(100, Number(player.morale || 100) + moraleBoost);

      this.db.execute(
        'UPDATE player_state SET fatigue = ?, morale = ? WHERE player_id = ?;',
        [newFatigue, newMorale, spouse.husband_id]
      );

      // Pregnancy Roll (if not currently pregnant and health is high)
      let conceived = false;
      let pregnancyStage = Number(spouse.pregnancy_stage || 0);

      if (pregnancyStage === 0 && Number(player.health || 100) >= 70) {
        // 45% base conception chance
        const roll = this.rng().nextFloat();
        if (roll < 0.45) {
          conceived = true;
          pregnancyStage = 1;
          this.db.execute(
            'UPDATE family_spouses SET pregnancy_stage = 1, conception_turn = ? WHERE marriage_id = ?;',
            [meta.activeTurn, marriageId]
          );
        }
      }

      const narrativeVi = conceived
        ? `Đồng phòng cùng ${spouse.wife_name_vi}. Hồi phục ${fatigueRecovery} Thể Lực. Nương tử hỉ mạch hiển lộ, đã mang cốt nhục Lương thị!`
        : `An tĩnh nghỉ ngơi bên ${spouse.wife_name_vi}. Hồi phục ${fatigueRecovery} Thể Lực, tâm cảnh thư thái.`;

      return {
        success: true,
        spouseName: spouse.wife_name_vi,
        fatigueRecovered: fatigueRecovery,
        newFatigue,
        moraleBoost,
        conceived,
        pregnancyStage,
        narrativeVi
      };
    });
  }

  /**
   * Advances the pregnancy stages for all pregnant wives.
   */
  public advancePregnancyTick(turn?: number, gameDate?: string): void {
    this.db.transaction(() => {
      const pregnantSpouses = this.db.query<any>(
        "SELECT marriage_id, pregnancy_stage FROM family_spouses WHERE status = 'MARRIED' AND pregnancy_stage > 0 AND pregnancy_stage < 3;"
      );

      for (const s of pregnantSpouses) {
        const nextStage = Number(s.pregnancy_stage) + 1;
        this.db.execute(
          'UPDATE family_spouses SET pregnancy_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE marriage_id = ?;',
          [nextStage, s.marriage_id]
        );
      }
    });
  }

  /**
   * Generates genetic attributes based on parental averages with [-3, +5] mutation and maternal perks.
   */
  public calculateGenetics(
    fatherStats: Record<string, number>,
    motherStats: Record<string, number>,
    motherId: string
  ): {
    inheritedStats: Record<string, number>;
    statBreakdown: Record<string, GeneticAttributeRoll>;
    innateTalents: string[];
  } {
    const attrKeys = ['war', 'int', 'com', 'ldr', 'pol', 'dip', 'cra', 'log'];
    const inheritedStats: Record<string, number> = {};
    const statBreakdown: Record<string, GeneticAttributeRoll> = {};
    const innateTalents: string[] = [];

    // Maternal trait perks mapping
    const maternalTraitMap: Record<string, { trait: string; bonusStat: string; bonusVal: number }> = {
      'NPC-0087': { trait: 'TLT-TIGER-HERITAGE', bonusStat: 'war', bonusVal: 2 },
      'NPC-0097': { trait: 'TLT-POETIC-GENIUS', bonusStat: 'int', bonusVal: 2 },
      'NPC-0081': { trait: 'TLT-SILK-ACUMEN', bonusStat: 'com', bonusVal: 2 },
      'NPC-0088': { trait: 'TLT-MASTER-ARTISAN', bonusStat: 'cra', bonusVal: 2 },
      'NPC-0089': { trait: 'TLT-HARMONIOUS-AESTHETIC', bonusStat: 'dip', bonusVal: 2 },
      'NPC-0071': { trait: 'TLT-TIGER-HERITAGE', bonusStat: 'war', bonusVal: 2 },
      'NPC-0101': { trait: 'TLT-PEERLESS-BEAUTY', bonusStat: 'dip', bonusVal: 2 },
      'NPC-0128': { trait: 'TLT-MASTER-INVENTOR', bonusStat: 'cra', bonusVal: 2 },
      'NPC-0151': { trait: 'TLT-VIRTUOUS-FORESIGHT', bonusStat: 'pol', bonusVal: 2 },
      'NPC-0152': { trait: 'TLT-WAR-HERITAGE', bonusStat: 'war', bonusVal: 2 },
      'NPC-0153': { trait: 'TLT-SERENE-BENEVOLENCE', bonusStat: 'dip', bonusVal: 2 },
      'NPC-0154': { trait: 'TLT-CAVALRY-PROWESS', bonusStat: 'ldr', bonusVal: 2 },
      'NPC-0155': { trait: 'TLT-AZURE-WILL', bonusStat: 'war', bonusVal: 2 },
      'NPC-0156': { trait: 'TLT-ASTUTE-PERCEPTION', bonusStat: 'int', bonusVal: 2 },
      'NPC-0157': { trait: 'TLT-CAPTIVATING-GRACE', bonusStat: 'dip', bonusVal: 2 },
      'NPC-0158': { trait: 'TLT-PURE-INTEGRITY', bonusStat: 'pol', bonusVal: 2 },
      'NPC-0159': { trait: 'TLT-SACRIFICIAL-LOYALTY', bonusStat: 'com', bonusVal: 2 },
      'NPC-0160': { trait: 'TLT-EMPRESS-GRACE', bonusStat: 'pol', bonusVal: 2 }
    };

    let traitConfig = maternalTraitMap[motherId];
    if (!traitConfig && motherId) {
      try {
        const maidenRow = this.db.queryOne<any>(
          'SELECT maternal_trait_code, bonus_stat, bonus_val FROM civilian_maidens WHERE maiden_id = ?;',
          [motherId]
        );
        if (maidenRow) {
          traitConfig = {
            trait: maidenRow.maternal_trait_code,
            bonusStat: maidenRow.bonus_stat,
            bonusVal: Number(maidenRow.bonus_val || 2)
          };
        }
      } catch {
        // Table might not exist in isolated unit mocks
      }
    }

    if (traitConfig) {
      innateTalents.push(traitConfig.trait);
    }

    for (const key of attrKeys) {
      const fStat = Number(fatherStats[key] || 50);
      const mStat = Number(motherStats[key] || 50);
      const parentMean = Math.floor((fStat + mStat) / 2);

      // Random mutation delta strictly clamped between -3 and +5
      const mutationDelta = Math.floor(this.rng().nextFloat() * 9) - 3; // -3 to +5

      let traitBonus = 0;
      if (traitConfig && traitConfig.bonusStat === key) {
        traitBonus = traitConfig.bonusVal;
      }

      // In childhood (age 0), attribute potential is scaled by 0.45 + mutation
      const finalStat = Math.max(15, Math.min(90, Math.floor(parentMean * 0.45) + mutationDelta + traitBonus));

      inheritedStats[key] = finalStat;
      statBreakdown[key] = {
        fatherStat: fStat,
        motherStat: mStat,
        mutationDelta,
        maternalTraitBonus: traitBonus > 0 ? traitBonus : undefined,
        finalStat
      };
    }

    return { inheritedStats, statBreakdown, innateTalents };
  }

  /**
   * Executes childbirth and initializes the child record in family_children and genealogy tree.
   */
  public birthChild(params: BirthChildParams): BirthChildResult {
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      // 1. Locate Mother
      const spouse = this.db.queryOne<any>(
        'SELECT * FROM family_spouses WHERE wife_id = ? LIMIT 1;',
        [params.motherId]
      );
      if (!spouse) {
        throw new Error(`Không tìm thấy hồ sơ người mẹ ${params.motherId} trong gia thất!`);
      }

      // 2. Fetch Father & Mother Stats
      let fatherStats: Record<string, number> = {
        war: 58, int: 61, com: 80, ldr: 71, pol: 68, dip: 74, cra: 62, log: 70
      };

      if (spouse.husband_id === 'PLY-0001') {
        const father = this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM player_state WHERE player_id = ?;',
          [spouse.husband_id]
        );
        if (father) {
          fatherStats = {
            war: Number(father.war_attr || 58),
            int: Number(father.int_attr || 61),
            com: Number(father.com_attr || 80),
            ldr: Number(father.ldr_attr || 71),
            pol: Number(father.pol_attr || 68),
            dip: Number(father.dip_attr || 74),
            cra: Number(father.cra_attr || 62),
            log: Number(father.log_attr || 70)
          };
        }
      } else {
        const father = this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
          [spouse.husband_id]
        ) || this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, cra_attr FROM npc_state WHERE npc_id = ?;',
          [spouse.husband_id]
        );
        if (father) {
          fatherStats = {
            war: Number(father.war_attr || 50),
            int: Number(father.int_attr || 50),
            com: Number(father.com_attr || 50),
            ldr: Number(father.ldr_attr || 50),
            pol: Number(father.pol_attr || 50),
            dip: Number(father.dip_attr || 50),
            cra: Number(father.cra_attr || 50),
            log: Number(father.log_attr || 50)
          };
        }
      }

      let motherChar = this.db.queryOne<any>(
        'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
        [params.motherId]
      );
      if (!motherChar) {
        motherChar = this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM civilian_maidens WHERE maiden_id = ?;',
          [params.motherId]
        );
      }

      const motherStats: Record<string, number> = {
        war: Number(motherChar?.war_attr || 30),
        int: Number(motherChar?.int_attr || 50),
        com: Number(motherChar?.com_attr || 50),
        ldr: Number(motherChar?.ldr_attr || 40),
        pol: Number(motherChar?.pol_attr || 40),
        dip: Number(motherChar?.dip_attr || 50),
        cra: Number(motherChar?.cra_attr || 50),
        log: Number(motherChar?.log_attr || 40)
      };

      // 3. Roll Genetics
      const { inheritedStats, innateTalents } = this.calculateGenetics(fatherStats, motherStats, params.motherId);

      // 4. Gender & Authentic Han Naming
      const gender = params.gender || (this.rng().nextFloat() < 0.5 ? 'MALE' : 'FEMALE');

      let nameVi = (params.customName || '').trim();
      let nameEn = nameVi;
      let styleName = '';

      if (!nameVi) {
        let fatherName = 'Lương Diễn';
        if (spouse.husband_id === 'PLY-0001') {
          const p = this.db.queryOne<any>('SELECT name FROM player_state WHERE player_id = ?;', [spouse.husband_id]);
          if (p?.name) fatherName = p.name;
        } else {
          const n = this.db.queryOne<any>('SELECT name_vi FROM master_characters WHERE npc_id = ?;', [spouse.husband_id]);
          if (n?.name_vi) fatherName = n.name_vi;
        }
        const naming = this.generateChildHanName(fatherName, gender);
        nameVi = naming.nameVi;
        nameEn = naming.nameEn;
        styleName = naming.styleName;
      } else {
        styleName = gender === 'MALE' ? 'Tử Viễn' : 'Uyển Khanh';
      }

      // 5. Insert Child Record
      const childId = nextSequentialId(this.db, 'family_children', 'CHD', this.getCampaignMeta().currentDate);

      this.db.execute(
        `INSERT INTO family_children (
          child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, style_name,
          gender, birth_date, birth_turn, age,
          war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr,
          innate_talents_json, growth_focus, is_heir, status
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 0,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, 'BALANCED', 0, 'INFANT'
        );`,
        [
          childId,
          spouse.husband_id,
          params.motherId,
          spouse.wife_name_vi,
          nameVi,
          nameEn,
          styleName,
          gender,
          meta.currentDate,
          meta.activeTurn,
          inheritedStats.war,
          inheritedStats.int,
          inheritedStats.com,
          inheritedStats.ldr,
          inheritedStats.pol,
          inheritedStats.dip,
          inheritedStats.cra,
          inheritedStats.log,
          JSON.stringify(innateTalents)
        ]
      );

      // 6. Register Genealogical Links
      const lineage = this.db.queryOne<any>('SELECT current_generation FROM family_lineage LIMIT 1;') || {
        current_generation: 1
      };

      this.db.execute(
        `INSERT INTO family_genealogy_tree (ancestor_id, descendant_id, relation_type, generation, notes)
         VALUES (?, ?, 'FATHER_CHILD', ?, ?);`,
        [spouse.husband_id, childId, lineage.current_generation, `Phụ tử huyết mạch (${nameVi})`]
      );

      this.db.execute(
        `INSERT INTO family_genealogy_tree (ancestor_id, descendant_id, relation_type, generation, notes)
         VALUES (?, ?, 'MOTHER_CHILD', ?, ?);`,
        [params.motherId, childId, lineage.current_generation, `Mẫu tử huyết mạch (${nameVi})`]
      );

      // 7. Reset Mother's Pregnancy Stage
      this.db.execute(
        'UPDATE family_spouses SET pregnancy_stage = 0, conception_turn = NULL WHERE wife_id = ?;',
        [params.motherId]
      );

      // 8. Increase Family Prestige (only for Liang protagonist dynasty)
      if (spouse.husband_id === 'PLY-0001') {
        this.db.execute(
          'UPDATE family_lineage SET family_prestige = family_prestige + 150 WHERE family_id = ?;',
          ['FAM-LIANG']
        );
      }

      const narrativeVi = `Chúc mừng thêm đinh! ${spouse.wife_name_vi} hạ sinh ${gender === 'MALE' ? 'quý tử' : 'ái nữ'} [${nameVi}]. Kế thừa trọn vẹn huyết mạch anh kiệt phụ mẫu!`;

      return {
        childId,
        fatherId: spouse.husband_id,
        motherId: params.motherId,
        motherNameVi: spouse.wife_name_vi,
        nameVi,
        nameEn,
        gender,
        styleName,
        inheritedStats,
        innateTalents,
        narrativeVi
      };
    });
  }
}
