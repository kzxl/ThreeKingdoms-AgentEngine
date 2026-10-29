/**
 * ThreeKingdoms-AgentEngine: Autonomous Life Simulation Domain Service
 * (src/modules/lineage-succession/autonomous-life.service.ts)
 *
 * Implements:
 * 1. Autonomous NPC Marriage Simulation:
 *    - Non-player officers evaluate psychological readiness, active military campaign status,
 *      rank, age, personal wealth, and court civilian maidens across settlements.
 * 2. Autonomous NPC Childbirth Simulation:
 *    - Progresses gestation for all married NPC couples, checks military deployment constraints,
 *      and delivers healthy heirs bearing their father's authentic Han surname.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { AutonomousMarriageResult, AutonomousChildbirthResult } from './lineage-types';
import { CourtshipBetrothalService } from './courtship-betrothal.service';
import { ReproductionGeneticsService } from './reproduction-genetics.service';

export class AutonomousLifeService {
  private db: DatabaseService;
  private courtshipService: CourtshipBetrothalService;
  private reproductionService: ReproductionGeneticsService;

  public constructor(
    db?: DatabaseService,
    courtshipService?: CourtshipBetrothalService,
    reproductionService?: ReproductionGeneticsService
  ) {
    this.db = db || DatabaseService.getInstance();
    this.courtshipService = courtshipService || new CourtshipBetrothalService(this.db);
    this.reproductionService = reproductionService || new ReproductionGeneticsService(this.db);
  }

  /**
   * Autonomous NPC Marriage Simulation:
   * Non-player officers evaluate their psychological readiness, active military campaign status,
   * rank, age, personal wealth, and court civilian maidens across settlements.
   */
  public simulateAutonomousNpcMarriages(turnNumber: number, gameDate: string): AutonomousMarriageResult[] {
    const results: AutonomousMarriageResult[] = [];

    return this.db.transaction(() => {
      const marriedHusbands = new Set(
        this.db.query<any>("SELECT husband_id FROM family_spouses WHERE status = 'MARRIED';").map(r => r.husband_id)
      );

      // Query eligible officers across factions who are not the player, excluding all historical female heroines
      const candidateNpcs = this.db.query<any>(
        `SELECT DISTINCT mc.npc_id, mc.name_vi, mc.personality, mc.baseline_age
         FROM master_characters mc
         WHERE mc.npc_id NOT LIKE 'MDN-%'
           AND mc.npc_id NOT IN (
             'NPC-0071', 'NPC-0081', 'NPC-0087', 'NPC-0088', 'NPC-0089', 'NPC-0097',
             'NPC-0101', 'NPC-0128', 'NPC-0151', 'NPC-0152', 'NPC-0153', 'NPC-0154',
             'NPC-0155', 'NPC-0156', 'NPC-0157', 'NPC-0158', 'NPC-0159', 'NPC-0160'
           );`
      );

      for (const char of candidateNpcs) {
        const npcId = char.npc_id;
        if (marriedHusbands.has(npcId)) continue;

        // Psychological & military expedition readiness evaluation
        const readiness = this.courtshipService.evaluateNpcMarriageReadiness(npcId);
        if (!readiness.ready) continue;

        // Financial capacity check from npc_personal_progression
        let prog = this.db.queryOne<any>('SELECT personal_cash FROM npc_personal_progression WHERE npc_id = ?;', [npcId]);
        let personalCash = prog ? Number(prog.personal_cash) : 600;

        // Find an unmarried maiden whose dowry_cash <= personalCash
        const maiden = this.db.queryOne<any>(
          'SELECT * FROM civilian_maidens WHERE is_married = 0 AND dowry_cash <= ? ORDER BY dowry_cash ASC LIMIT 1;',
          [personalCash]
        );
        if (!maiden) continue;

        // Verify procedural feasibility
        const feas = this.courtshipService.checkMarriageFeasibility(npcId, maiden.maiden_id);
        if (!feas.allowed) continue;

        // Execute autonomous marriage
        const dowryCash = Number(maiden.dowry_cash);
        if (prog) {
          this.db.execute(
            'UPDATE npc_personal_progression SET personal_cash = personal_cash - ? WHERE npc_id = ?;',
            [dowryCash, npcId]
          );
        }

        this.db.execute(
          'UPDATE civilian_maidens SET is_married = 1, husband_id = ? WHERE maiden_id = ?;',
          [npcId, maiden.maiden_id]
        );

        const marriageId = nextId(this.db, 'marriage', `MARR-${npcId}`, getGameDate(this.db));
        this.db.execute(
          `INSERT INTO family_spouses (
            marriage_id, husband_id, wife_id, wife_name_vi, wife_name_en,
            marriage_date, marriage_turn, dowry_cash, dowry_items_json,
            intimacy, status, pregnancy_stage, household_role, role_effect_desc_vi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 85, 'MARRIED', 0, 'HOUSEKEEPER', 'Trông nom gia thất thuận hòa.');`,
          [
            marriageId,
            npcId,
            maiden.maiden_id,
            maiden.name_vi,
            maiden.name_en,
            gameDate,
            turnNumber,
            dowryCash
          ]
        );

        marriedHusbands.add(npcId);

        const narrativeVi = `${char.name_vi} thành gia lập thất cùng ${maiden.name_vi} (${maiden.father_profession_vi}). Sính lễ ${dowryCash.toLocaleString()} Quan. Gia đạo hòa hợp.`;
        results.push({
          husbandId: npcId,
          husbandNameVi: char.name_vi,
          wifeId: maiden.maiden_id,
          wifeNameVi: maiden.name_vi,
          socialStratum: maiden.social_stratum,
          marriageTurn: turnNumber,
          dowryCash,
          narrativeVi
        });
      }

      return results;
    });
  }

  /**
   * Autonomous NPC Childbirth Simulation:
   * Progresses gestation for all married NPC couples, checks military deployment constraints,
   * and delivers healthy heirs bearing their father's authentic Han surname.
   */
  public simulateAutonomousNpcChildbirth(turnNumber: number, gameDate: string): {
    births: AutonomousChildbirthResult[];
    conceptions: string[];
  } {
    const births: AutonomousChildbirthResult[] = [];
    const conceptions: string[] = [];

    return this.db.transaction(() => {
      const couples = this.db.query<any>(
        "SELECT * FROM family_spouses WHERE husband_id != 'PLY-0001' AND status = 'MARRIED';"
      );

      for (const couple of couples) {
        const husbandId = couple.husband_id;
        const wifeId = couple.wife_id;
        const pregnancyStage = Number(couple.pregnancy_stage || 0);

        if (pregnancyStage === 0) {
          // If husband is deployed on frontlines, conception is strictly blocked
          if (this.courtshipService.isCharacterInActiveExpedition(husbandId)) {
            continue;
          }

          // 35% conception chance per turn for non-deployed couples
          if (RngService.forDomain(this.db, 'npc-life').chance(0.35)) {
            this.db.execute(
              'UPDATE family_spouses SET pregnancy_stage = 1, conception_turn = ? WHERE marriage_id = ?;',
              [turnNumber, couple.marriage_id]
            );
            conceptions.push(couple.marriage_id);
          }
        } else if (pregnancyStage > 0 && pregnancyStage < 3) {
          this.db.execute(
            'UPDATE family_spouses SET pregnancy_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE marriage_id = ?;',
            [pregnancyStage + 1, couple.marriage_id]
          );
        } else if (pregnancyStage >= 3) {
          // Delivery!
          const fatherChar = this.db.queryOne<any>(
            'SELECT name_vi, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
            [husbandId]
          ) || { name_vi: 'Tướng Lĩnh', war_attr: 60, int_attr: 50, com_attr: 50, ldr_attr: 60, pol_attr: 50, dip_attr: 50, cra_attr: 50, log_attr: 50 };

          let motherChar = this.db.queryOne<any>(
            'SELECT name_vi, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM civilian_maidens WHERE maiden_id = ?;',
            [wifeId]
          );
          if (!motherChar) {
            motherChar = this.db.queryOne<any>(
              'SELECT name_vi, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
              [wifeId]
            ) || { name_vi: couple.wife_name_vi, war_attr: 35, int_attr: 50, com_attr: 50, ldr_attr: 40, pol_attr: 40, dip_attr: 50, cra_attr: 50, log_attr: 40 };
          }

          const fatherStats: Record<string, number> = {
            war: Number(fatherChar.war_attr || 50),
            int: Number(fatherChar.int_attr || 50),
            com: Number(fatherChar.com_attr || 50),
            ldr: Number(fatherChar.ldr_attr || 50),
            pol: Number(fatherChar.pol_attr || 50),
            dip: Number(fatherChar.dip_attr || 50),
            cra: Number(fatherChar.cra_attr || 50),
            log: Number(fatherChar.log_attr || 50)
          };

          const motherStats: Record<string, number> = {
            war: Number(motherChar.war_attr || 35),
            int: Number(motherChar.int_attr || 50),
            com: Number(motherChar.com_attr || 50),
            ldr: Number(motherChar.ldr_attr || 40),
            pol: Number(motherChar.pol_attr || 40),
            dip: Number(motherChar.dip_attr || 50),
            cra: Number(motherChar.cra_attr || 50),
            log: Number(motherChar.log_attr || 40)
          };

          const { inheritedStats, innateTalents } = this.reproductionService.calculateGenetics(fatherStats, motherStats, wifeId);
          const gender: 'MALE' | 'FEMALE' = RngService.forDomain(this.db, 'npc-life').chance(0.5) ? 'MALE' : 'FEMALE';
          const naming = this.reproductionService.generateChildHanName(fatherChar.name_vi, gender);

          const childId = nextId(this.db, 'family-children', 'CHD-NPC', getGameDate(this.db));

          this.db.execute(
            `INSERT INTO family_children (
              child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, style_name,
              gender, birth_date, birth_turn, age,
              war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr,
              innate_talents_json, growth_focus, is_heir, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BALANCED', 0, 'INFANT');`,
            [
              childId,
              husbandId,
              wifeId,
              couple.wife_name_vi,
              naming.nameVi,
              naming.nameEn,
              naming.styleName,
              gender,
              gameDate,
              turnNumber,
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

          // Reset pregnancy
          this.db.execute(
            'UPDATE family_spouses SET pregnancy_stage = 0, conception_turn = NULL WHERE marriage_id = ?;',
            [couple.marriage_id]
          );

          const narrativeVi = `${fatherChar.name_vi} và ${couple.wife_name_vi} đón mừng đinh trưởng! Hạ sinh ${gender === 'MALE' ? 'quý tử' : 'ái nữ'} [${naming.nameVi}]. Kế thừa huyết mạch gia phong.`;
          births.push({
            childId,
            fatherId: husbandId,
            fatherNameVi: fatherChar.name_vi,
            motherId: wifeId,
            motherNameVi: couple.wife_name_vi,
            nameVi: naming.nameVi,
            gender,
            inheritedStats,
            narrativeVi
          });
        }
      }

      return { births, conceptions };
    });
  }
}
