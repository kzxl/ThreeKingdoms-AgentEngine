/**
 * ThreeKingdoms-AgentEngine: Courtship, Betrothal & Civilian Encounter Domain Service
 * (src/modules/lineage-succession/courtship-betrothal.service.ts)
 *
 * Implements:
 * 1. Historical heroine discovery & civilian maiden social strata integration
 * 2. Activity-driven probabilistic encounter resolution with dynamic modifiers
 * 3. Military warfare blocker & psychological personality readiness gates
 * 4. Customary dowry gifting with balanced double-entry journal and cashflow ledgers
 */

import { DatabaseService } from '../../core/database';
import { DailyInteractionEngine } from '../social-kizuna/daily-interaction.engine';
import {
  CourtshipCandidateDTO,
  ActivityEncounterParams,
  ActivityEncounterResult,
  ProposeMarriageParams,
  ProposeMarriageResult
} from './lineage-types';

export class CourtshipBetrothalService {
  private db: DatabaseService;

  public constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  private getCampaignMeta(): { activeTurn: number; currentDate: string; campaignId: string } {
    try {
      const row = this.db.queryOne<any>(
        'SELECT active_turn, current_date, campaign_id FROM campaign_meta LIMIT 1;'
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
   * Checks whether the protagonist has encountered an NPC via deltas, intel fog, or prior union.
   */
  public hasEncounteredNpc(npcId: string): boolean {
    try {
      const delta = this.db.queryOne<any>(
        'SELECT 1 FROM npc_relationship_deltas WHERE npc_id = ? LIMIT 1;',
        [npcId]
      );
      if (delta) return true;

      const fog = this.db.queryOne<any>(
        'SELECT interaction_count FROM npc_intel_fog WHERE npc_id = ? LIMIT 1;',
        [npcId]
      );
      if (fog && Number(fog.interaction_count) > 0) {
        return true;
      }

      const spouse = this.db.queryOne<any>(
        'SELECT 1 FROM family_spouses WHERE wife_id = ? LIMIT 1;',
        [npcId]
      );
      if (spouse) return true;

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether a character (player or NPC) is actively commanding a military expedition in the field.
   * Hard constraint: Warfare strictly blocks marriage, cohabitation, and conception!
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
   * Evaluates procedural marriage feasibility between two individuals.
   */
  public checkMarriageFeasibility(husbandId: string, wifeId: string): { allowed: boolean; reasonVi?: string } {
    if (this.isCharacterInActiveExpedition(husbandId)) {
      return {
        allowed: false,
        reasonVi: 'Đang thân chinh thống lĩnh quân vụ sa trường, quân lệnh như sơn, không thể cử hành hôn lễ lúc này!'
      };
    }
    if (this.isCharacterInActiveExpedition(wifeId)) {
      return {
        allowed: false,
        reasonVi: 'Đối phương đang thống lĩnh quân vụ nơi tiền tuyến, không thể kết tóc se duyên!'
      };
    }
    const existing = this.db.queryOne<any>(
      "SELECT marriage_id FROM family_spouses WHERE (wife_id = ? OR husband_id = ?) AND status = 'MARRIED' LIMIT 1;",
      [wifeId, husbandId]
    );
    if (existing) {
      return {
        allowed: false,
        reasonVi: 'Một trong hai bên đã kết tóc se duyên, không thể tái giá hoặc trùng hôn!'
      };
    }
    return { allowed: true };
  }

  /**
   * Evaluates autonomous psychological & situational readiness of an officer to form a family.
   */
  public evaluateNpcMarriageReadiness(npcId: string): { ready: boolean; reasonVi: string } {
    if (this.isCharacterInActiveExpedition(npcId)) {
      return {
        ready: false,
        reasonVi: 'Đang thân chinh nơi tiền tuyến sa trường, toàn tâm vì quân vụ.'
      };
    }

    const char = this.db.queryOne<any>('SELECT * FROM master_characters WHERE npc_id = ?;', [npcId]);
    const age = char ? Number(char.baseline_age || 20) : 20;
    const personality = (char?.personality || 'PRAGMATIC').toUpperCase();

    const officer = this.db.queryOne<any>('SELECT court_rank FROM faction_officers WHERE officer_id = ? LIMIT 1;', [npcId]);
    const courtRank = officer?.court_rank || 'OFFICER';

    const prog = this.db.queryOne<any>('SELECT prestige FROM npc_personal_progression WHERE npc_id = ?;', [npcId]);
    const prestige = prog ? Number(prog.prestige) : 50;

    const martialPersonalities = ['VALIANT', 'FIERCE', 'AMBITIOUS'];
    if (martialPersonalities.includes(personality)) {
      const hasHighRank = ['RULER', 'CHIEF_COMMANDER', 'GENERAL', 'GOVERNOR'].includes(courtRank);
      if (age < 30 && !hasHighRank && prestige < 150) {
        return {
          ready: false,
          reasonVi: 'Chí lớn chưa thành, giặc loạn chưa yên, há có thể bận lòng chuyện nhi nữ thường tình!'
        };
      }
    } else if (personality === 'SCHOLARLY' || personality === 'HONORABLE') {
      if (age < 22) {
        return {
          ready: false,
          reasonVi: 'Tu dưỡng lễ nghi, dùi mài kinh sử chưa tròn, chưa đến thời điểm hợp lễ.'
        };
      }
    } else {
      if (age < 18) {
        return {
          ready: false,
          reasonVi: 'Chưa đủ tuổi thành niên (dưới 18).'
        };
      }
    }

    return { ready: true, reasonVi: 'Tâm nguyện an cư lạc nghiệp, sẵn sàng thành gia lập thất.' };
  }

  /**
   * Retrieves aggregated courtship candidates across historical heroines and civilian maidens.
   */
  public getCourtshipCandidates(): CourtshipCandidateDTO[] {
    const prominentHeroines = [
      {
        npcId: 'NPC-0081',
        nameVi: 'Chân Phu Nhân (Chân Mật)',
        nameEn: 'Lady Zhen (Zhen Ji)',
        baselineLocation: 'LOC-0006',
        dowryCash: 6000,
        dowryItems: [{ itemCode: 'COM-SILK', itemNameVi: 'Tơ Lụa Thượng Phẩm', quantity: 5 }],
        clueVi: 'Danh môn khuê tú Ký Châu Chân thị, tài sắc quán tuyệt, thường ngụ tại Nghiệp Thành phủ đệ.',
        clueEn: 'Noble lady of the Zhen clan in Jizhou, often residing at Yecheng manor.',
        maternalTrait: {
          traitCode: 'TLT-SILK-ACUMEN',
          traitNameVi: 'Lạc Thần Thương Trí',
          descriptionVi: '+25% EXP Thương Nghiệp cho con cái, +2 Base COM.'
        }
      },
      {
        npcId: 'NPC-0087',
        nameVi: 'Tôn Thượng Hương (Cung Yêu Cơ)',
        nameEn: 'Sun Shangxiang',
        baselineLocation: 'LOC-0013',
        dowryCash: 8000,
        dowryItems: [{ itemCode: 'COM-HORSE-W', itemNameVi: 'Chiến Mã Thuần Chủng', quantity: 2 }],
        clueVi: 'Giang Đông Kiêu Cơ, ái muội đao cung võ bị, thường cùng nữ binh luyện võ tại Kiến Nghiệp doanh đài.',
        clueEn: 'Fierce martial maiden of Jiangdong, often training with archers at Jianye parade grounds.',
        maternalTrait: {
          traitCode: 'TLT-TIGER-HERITAGE',
          traitNameVi: 'Kiêu Cơ Vũ Huyết',
          descriptionVi: '+25% EXP Võ Lực cho con cái, +2 Base WAR.'
        }
      },
      {
        npcId: 'NPC-0088',
        nameVi: 'Đại Kiều',
        nameEn: 'Da Qiao',
        baselineLocation: 'LOC-0013',
        dowryCash: 5000,
        dowryItems: [{ itemCode: 'COM-SILK', itemNameVi: 'Tơ Lụa Thượng Phẩm', quantity: 3 }],
        clueVi: 'Kiều gia trưởng nữ tại Hoàn Thành - Giang Đông, cầm kỳ thi họa, trang nhã ôn nhu, ẩn cư khuê các.',
        clueEn: 'Elder Qiao maiden of Jiangdong, poised and graceful, practicing guqin at Wan County.',
        maternalTrait: {
          traitCode: 'TLT-MASTER-ARTISAN',
          traitNameVi: 'Quỳnh Hoa Xảo Thủ',
          descriptionVi: '+25% EXP Kỹ Nghệ cho con cái, +2 Base CRA.'
        }
      },
      {
        npcId: 'NPC-0089',
        nameVi: 'Tiểu Kiều',
        nameEn: 'Xiao Qiao',
        baselineLocation: 'LOC-0011',
        dowryCash: 5000,
        dowryItems: [{ itemCode: 'COM-WINE', itemNameVi: 'Đỗ Khang Mỹ Tửu', quantity: 5 }],
        clueVi: 'Kiều gia thứ nữ tuyệt sắc khuynh thành, tinh thông âm luật, thường dạo chơi ngắm cảnh vùng Sài Tang & Xích Bích.',
        clueEn: 'Younger Qiao maiden of celestial beauty, fond of melodious arts near Saitang and Chibi.',
        maternalTrait: {
          traitCode: 'TLT-HARMONIOUS-AESTHETIC',
          traitNameVi: 'Quốc Sắc Thiên Hương',
          descriptionVi: '+20% Gia Tộc Sĩ Khí, +2 Base DIP.'
        }
      },
      {
        npcId: 'NPC-0097',
        nameVi: 'Thái Diễm (Thái Văn Cơ)',
        nameEn: 'Cai Wenji',
        baselineLocation: 'LOC-0002',
        dowryCash: 6000,
        dowryItems: [{ itemCode: 'COM-SILK', itemNameVi: 'Tơ Lụa Thượng Phẩm', quantity: 4 }],
        clueVi: 'Ái nữ Thái Ung đại phu, học rộng thi thư, tinh thông Hồ Gia Thập Bát Phách tại Kinh Đô Lạc Dương.',
        clueEn: 'Daughter of Master Cai Yong, famous poet and musician residing in Imperial Capital Luoyang.',
        maternalTrait: {
          traitCode: 'TLT-POETIC-GENIUS',
          traitNameVi: 'Hồ Gia Thi Vận',
          descriptionVi: '+25% EXP Mưu Lược / Điển Tịch cho con cái, +2 Base INT.'
        }
      }
    ];

    const kizunaEngine = DailyInteractionEngine.getInstance();
    const activeSpouseIds = new Set(
      this.db.query<any>("SELECT wife_id FROM family_spouses WHERE status = 'MARRIED';").map(r => r.wife_id)
    );

    const candidates: CourtshipCandidateDTO[] = prominentHeroines.map(h => {
      const char = this.db.queryOne<any>(
        'SELECT * FROM master_characters WHERE npc_id = ?;',
        [h.npcId]
      ) || {};

      const locRow = this.db.queryOne<any>(
        'SELECT name_vi, name_en FROM master_locations WHERE location_id = ?;',
        [char.baseline_location || h.baselineLocation]
      );
      const locationNameVi = locRow?.name_vi || 'Phương xa';
      const locationNameEn = locRow?.name_en || 'Distant Province';

      const isEncountered = this.hasEncounteredNpc(h.npcId);

      let affinity = 0;
      let respect = 0;
      let relationshipTitleVi = 'Chưa Tương Ngộ (Chưa Gặp)';
      let relationshipTitleEn = 'Unencountered (Unknown)';

      if (isEncountered) {
        try {
          const sentiment = kizunaEngine.getNpcSentiment(h.npcId);
          affinity = sentiment.affinity;
          respect = sentiment.respect;
          relationshipTitleVi = sentiment.titleVi;
          relationshipTitleEn = sentiment.titleEn;
        } catch {
          affinity = 25;
          respect = 25;
          relationshipTitleVi = 'Sơ Giao';
          relationshipTitleEn = 'Acquaintance';
        }
      }

      const isAlreadyMarried = activeSpouseIds.has(h.npcId);
      const canPropose = isEncountered && affinity >= 80 && !isAlreadyMarried;

      return {
        npcId: h.npcId,
        nameVi: char.name_vi || h.nameVi,
        nameEn: char.name_en || h.nameEn,
        socialStratum: 'HISTORICAL_HEROINE',
        baselineLocation: char.baseline_location || h.baselineLocation,
        locationNameVi,
        locationNameEn,
        clueVi: h.clueVi,
        clueEn: h.clueEn,
        keyStats: {
          war: Number(char.war_attr || 30),
          int: Number(char.int_attr || 70),
          com: Number(char.com_attr || 60),
          ldr: Number(char.ldr_attr || 50),
          pol: Number(char.pol_attr || 60),
          dip: Number(char.dip_attr || 70),
          cra: Number(char.cra_attr || 50)
        },
        isEncountered,
        affinity,
        respect,
        relationshipTitleVi,
        relationshipTitleEn,
        canPropose,
        recommendedDowryCash: h.dowryCash,
        recommendedDowryItems: h.dowryItems,
        maternalTraitPerk: h.maternalTrait
      };
    });

    try {
      const maidens = this.db.query<any>(
        'SELECT * FROM civilian_maidens WHERE is_married = 0;'
      );

      for (const m of maidens) {
        const locRow = this.db.queryOne<any>(
          'SELECT name_vi, name_en FROM session_settlements WHERE settlement_id = ?;',
          [m.settlement_id]
        ) || this.db.queryOne<any>(
          'SELECT name_vi, name_en FROM master_locations WHERE location_id = ?;',
          [m.settlement_id]
        );
        const locationNameVi = locRow?.name_vi || m.settlement_id;
        const locationNameEn = locRow?.name_en || m.settlement_id;

        const isEncountered = this.hasEncounteredNpc(m.maiden_id);
        let affinity = 0;
        let respect = 0;
        let relationshipTitleVi = 'Chưa Tương Ngộ (Chưa Gặp)';
        let relationshipTitleEn = 'Unencountered (Unknown)';

        if (isEncountered) {
          try {
            const sentiment = kizunaEngine.getNpcSentiment(m.maiden_id);
            affinity = sentiment.affinity;
            respect = sentiment.respect;
            relationshipTitleVi = sentiment.titleVi;
            relationshipTitleEn = sentiment.titleEn;
          } catch {
            affinity = 35;
            respect = 30;
            relationshipTitleVi = 'Sơ Giao';
            relationshipTitleEn = 'Acquaintance';
          }
        }

        const isAlreadyMarried = activeSpouseIds.has(m.maiden_id);
        const canPropose = isEncountered && affinity >= 80 && !isAlreadyMarried;

        candidates.push({
          npcId: m.maiden_id,
          nameVi: m.name_vi,
          nameEn: m.name_en,
          socialStratum: m.social_stratum,
          baselineLocation: m.settlement_id,
          locationNameVi,
          locationNameEn,
          clueVi: m.clue_vi,
          clueEn: m.clue_en,
          keyStats: {
            war: Number(m.war_attr || 30),
            int: Number(m.int_attr || 50),
            com: Number(m.com_attr || 50),
            ldr: Number(m.ldr_attr || 40),
            pol: Number(m.pol_attr || 40),
            dip: Number(m.dip_attr || 50),
            cra: Number(m.cra_attr || 50)
          },
          isEncountered,
          affinity,
          respect,
          relationshipTitleVi,
          relationshipTitleEn,
          canPropose,
          recommendedDowryCash: Number(m.dowry_cash || 500),
          recommendedDowryItems: m.dowry_item_code
            ? [{ itemCode: m.dowry_item_code, itemNameVi: m.dowry_item_code, quantity: Number(m.dowry_item_qty || 1) }]
            : [],
          maternalTraitPerk: {
            traitCode: m.maternal_trait_code,
            traitNameVi: m.maternal_trait_name_vi,
            descriptionVi: m.maternal_trait_desc_vi
          }
        });
      }
    } catch {
      // Table might not exist in isolated tests
    }

    return candidates;
  }

  /**
   * Evaluates and triggers activity-driven probabilistic encounters with civilian maidens.
   */
  public triggerActivityEncounter(params: ActivityEncounterParams): ActivityEncounterResult {
    const characterId = params.characterId || 'PLY-0001';
    const meta = this.getCampaignMeta();
    const gameDate = params.gameDate || meta.currentDate;

    // 1. Look up encounter rate from location_encounter_rates
    const rateRow = this.db.queryOne<any>(
      `SELECT * FROM location_encounter_rates 
       WHERE facility_type = ? 
         AND (action_type = ? OR action_type = 'ANY')
         AND (settlement_id = ? OR settlement_id = 'ALL')
       ORDER BY (settlement_id = ?) DESC, RANDOM() LIMIT 1;`,
      [params.facilityType, params.actionType, params.settlementId, params.settlementId]
    );

    if (!rateRow) {
      return {
        encountered: false,
        narrativeVi: `Tại ${params.facilityType} vùng ${params.settlementId}, phố phường thanh bình, không có biến cố tương ngộ đặc biệt nào.`
      };
    }

    // 2. Prestige Check
    const minPrestige = Number(rateRow.min_player_prestige || 0);
    if (minPrestige > 0) {
      let currentPrestige = 100;
      if (characterId === 'PLY-0001') {
        const fam = this.db.queryOne<any>('SELECT family_prestige FROM family_lineage LIMIT 1;');
        currentPrestige = Number(fam?.family_prestige || 100);
      } else {
        const prog = this.db.queryOne<any>('SELECT prestige FROM npc_personal_progression WHERE npc_id = ?;', [characterId]);
        currentPrestige = Number(prog?.prestige || 50);
      }
      if (currentPrestige < minPrestige) {
        return {
          encountered: false,
          narrativeVi: `Thân phận chưa đủ hiển đạt (Uy vọng hiện tại: ${currentPrestige}, yêu cầu: ${minPrestige}) để tiếp cận giai tầng ${rateRow.social_stratum}.`
        };
      }
    }

    // 3. Dynamic Modifiers Calculation
    let modProsperity = 1.0;
    try {
      const settRow = this.db.queryOne<any>(
        'SELECT public_order, agriculture, commerce, treasury_cash FROM session_settlements WHERE settlement_id = ?;',
        [params.settlementId]
      );
      if (settRow) {
        const pubOrderRatio = Number(settRow.public_order || 80) / 80.0;
        if (rateRow.social_stratum === 'PEASANT') {
          const agriRatio = Number(settRow.agriculture || 60) / 60.0;
          modProsperity = Math.max(0.7, Math.min(1.3, agriRatio * pubOrderRatio));
        } else if (rateRow.social_stratum === 'ARTISAN_SHOP') {
          const comRatio = Number(settRow.commerce || 60) / 60.0;
          modProsperity = Math.max(0.7, Math.min(1.3, comRatio * pubOrderRatio));
        } else {
          const gentryRatio = Math.min(1.3, Number(settRow.treasury_cash || 10000) / 10000.0);
          modProsperity = Math.max(0.7, Math.min(1.3, gentryRatio * pubOrderRatio));
        }
      }
    } catch {
      // Tolerate missing settlement tables in isolated tests
    }

    let charDip = 70;
    try {
      if (characterId === 'PLY-0001') {
        const player = this.db.queryOne<any>('SELECT dip_attr FROM player_state WHERE player_id = ?;', [characterId]);
        charDip = Number(player?.dip_attr || 70);
      } else {
        const char = this.db.queryOne<any>('SELECT dip_attr FROM master_characters WHERE npc_id = ?;', [characterId]);
        charDip = Number(char?.dip_attr || 50);
      }
    } catch {
      // Fallback
    }
    const modCharm = Math.max(0.8, Math.min(1.3, 1.0 + (charDip - 50) * 0.005));

    const baseProb = Number(rateRow.base_probability);
    const finalProb = Math.min(0.95, Math.max(0.01, baseProb * modProsperity * modCharm));
    const roll = Math.random();

    if (roll > finalProb) {
      return {
        encountered: false,
        rateApplied: {
          rateId: rateRow.rate_id,
          baseProbability: baseProb,
          modifierProsperity: Number(modProsperity.toFixed(3)),
          modifierCharm: Number(modCharm.toFixed(3)),
          finalProbability: Number(finalProb.toFixed(3)),
          roll: Number(roll.toFixed(3))
        },
        narrativeVi: `Hoạt động ${params.actionType} tại ${params.facilityType} diễn ra bình ổn, không tương ngộ giai nhân nào.`
      };
    }

    // 4. Locate an unmarried maiden in this stratum and settlement
    const maiden = this.db.queryOne<any>(
      `SELECT * FROM civilian_maidens 
       WHERE is_married = 0 
         AND social_stratum = ? 
         AND (settlement_id = ? OR settlement_id IS NOT NULL)
       ORDER BY (settlement_id = ?) DESC, RANDOM() 
       LIMIT 1;`,
      [rateRow.social_stratum, params.settlementId, params.settlementId]
    );

    if (!maiden) {
      return {
        encountered: false,
        rateApplied: {
          rateId: rateRow.rate_id,
          baseProbability: baseProb,
          modifierProsperity: Number(modProsperity.toFixed(3)),
          modifierCharm: Number(modCharm.toFixed(3)),
          finalProbability: Number(finalProb.toFixed(3)),
          roll: Number(roll.toFixed(3))
        },
        narrativeVi: `Giai tầng ${rateRow.social_stratum} tại địa phương hiện không có khuê nữ nào chưa xuất giá.`
      };
    }

    // 5. Unlock maiden in intel fog and relationship deltas
    try {
      this.db.execute(`
        INSERT INTO npc_intel_fog (npc_id, intel_level, interaction_count, current_mood)
        VALUES (?, 2, 1, 'CHEERFUL')
        ON CONFLICT(npc_id) DO UPDATE SET interaction_count = interaction_count + 1;
      `, [maiden.maiden_id]);

      this.db.execute(`
        INSERT INTO npc_relationship_deltas (
          npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
        ) VALUES (?, ?, 35, 35, 'ACQUAINTANCE', ?);
      `, [
        maiden.maiden_id,
        gameDate,
        `Tương ngộ ngẫu nhiên khi tham gia ${params.actionType} tại ${params.facilityType} (${params.settlementId})`
      ]);
    } catch {
      // Table update tolerance
    }

    const narrativeVi = `Duyên định tương ngộ! Tại ${params.facilityType} (${params.settlementId}), bạn tình cờ gặp gỡ ${maiden.name_vi} (${maiden.father_profession_vi}). Tính tình ${maiden.personality}, khí sắc đoan trang!`;

    return {
      encountered: true,
      rateApplied: {
        rateId: rateRow.rate_id,
        baseProbability: baseProb,
        modifierProsperity: Number(modProsperity.toFixed(3)),
        modifierCharm: Number(modCharm.toFixed(3)),
        finalProbability: Number(finalProb.toFixed(3)),
        roll: Number(roll.toFixed(3))
      },
      maiden: {
        maidenId: maiden.maiden_id,
        nameVi: maiden.name_vi,
        nameEn: maiden.name_en,
        socialStratum: maiden.social_stratum,
        personality: maiden.personality,
        maternalTraitNameVi: maiden.maternal_trait_name_vi,
        clueVi: maiden.clue_vi,
        dowryCash: Number(maiden.dowry_cash)
      },
      narrativeVi
    };
  }

  /**
   * Proposes marriage to a candidate maiden with double-entry cashflow accounting.
   * Requirement: Affinity >= 80 and sufficient cash/items.
   */
  public proposeMarriage(params: ProposeMarriageParams): ProposeMarriageResult {
    const targetWifeId = params.wifeNpcId || params.spouseNpcId;
    if (!targetWifeId) {
      throw new Error('Chưa chỉ định đối tượng cầu hôn (wifeNpcId / spouseNpcId)!');
    }

    const playerId = params.playerId || 'PLY-0001';
    const dowryCash = Math.max(0, Number(params.dowryCash) || 0);
    const dowryItems = params.dowryItems || [];
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      // 1. Check existing marriage & active military expedition blockers
      const feas = this.checkMarriageFeasibility(playerId, targetWifeId);
      if (!feas.allowed) {
        throw new Error(feas.reasonVi || 'Không thể thành hôn vào lúc này!');
      }

      // 2. Check candidate existence (historical heroine or civilian maiden)
      let character = this.db.queryOne<any>(
        'SELECT npc_id, name_vi, name_en, personality FROM master_characters WHERE npc_id = ?;',
        [targetWifeId]
      );

      let isCivilianMaiden = false;
      let maidenRow: any = null;

      if (!character) {
        maidenRow = this.db.queryOne<any>(
          'SELECT maiden_id, name_vi, name_en, dowry_cash, personality, father_profession_vi, is_married FROM civilian_maidens WHERE maiden_id = ?;',
          [targetWifeId]
        );
        if (maidenRow) {
          isCivilianMaiden = true;
          character = {
            npc_id: maidenRow.maiden_id,
            name_vi: maidenRow.name_vi,
            name_en: maidenRow.name_en,
            personality: maidenRow.personality
          };
          if (Number(maidenRow.is_married) === 1) {
            throw new Error(`Khuê nữ ${maidenRow.name_vi} đã xuất giá, không thể cầu hôn!`);
          }
        } else {
          throw new Error(`Không tìm thấy hồ sơ mỹ nhân ${targetWifeId} trong thiên hạ lục!`);
        }
      }

      // 3. Check Encounter Prerequisite (Must have met before proposing)
      if (!this.hasEncounteredNpc(targetWifeId)) {
        throw new Error(
          `Bạn chưa từng diện kiến hay tương ngộ ${character.name_vi}! Phải diện kiến tương ngộ và bồi đắp hảo cảm (≥ 80) mới có thể nạp sính lễ cầu hôn.`
        );
      }

      // 4. Check Affinity >= 80
      const kizunaEngine = DailyInteractionEngine.getInstance();
      const sentiment = kizunaEngine.getNpcSentiment(targetWifeId);
      if (sentiment.affinity < 80) {
        throw new Error(
          `Hảo cảm chưa đủ sâu sắc (${sentiment.affinity}/100)! Cần tối thiểu 80 điểm hảo cảm để kết tóc se duyên.`
        );
      }

      // 5. Check Candidate Personality Requirements
      if (character.personality === 'VALIANT' && targetWifeId === 'NPC-0087') {
        const playerStats = this.db.queryOne<any>('SELECT war_attr FROM player_state WHERE player_id = ?;', [playerId]);
        const fam = this.db.queryOne<any>('SELECT family_prestige FROM family_lineage LIMIT 1;');
        const warVal = Number(playerStats?.war_attr || 50);
        const prestigeVal = Number(fam?.family_prestige || 50);
        if (warVal < 60 && prestigeVal < 100) {
          throw new Error('Tôn Thượng Hương tính tình kiêu dũng, yêu thích đao cung võ bị, yêu cầu phu quân phải có danh vọng võ huân hiển hách (Võ Lực ≥ 60 hoặc Uy Vọng Gia Tộc ≥ 100)!');
        }
      }

      // 6. Verify Treasury Cash
      const player = this.db.queryOne<any>(
        'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?;',
        [playerId]
      );
      if (!player) {
        throw new Error(`Player ${playerId} not found in player_state.`);
      }

      const liquidCash = Number(player.liquid_cash || 0);
      const safeCash = Number(player.safe_cash || 0);
      if (liquidCash < dowryCash) {
        throw new Error(
          `Ngân khố không đủ tiền mặt chi trả sính lễ! Cần ${dowryCash.toLocaleString()} Tiền, hiện có ${liquidCash.toLocaleString()} Tiền.`
        );
      }

      // 7. Verify and deduct Dowry Items (if any)
      const deductedItems: Array<{ itemCode: string; quantity: number }> = [];
      for (const item of dowryItems) {
        const itemRow = this.db.queryOne<any>(
          'SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = ?;',
          [item.itemCode]
        );
        const available = itemRow ? Number(itemRow.quantity) : 0;
        if (available < item.quantity) {
          throw new Error(
            `Kho hàng không đủ lễ vật [${item.itemCode}]: cần ${item.quantity}, hiện có ${available}.`
          );
        }

        const newQty = available - item.quantity;
        this.db.execute(
          'UPDATE inventory_items SET quantity = ? WHERE item_code = ?;',
          [newQty, item.itemCode]
        );

        const movId = `MOV-DOWRY-${Date.now()}-${item.itemCode}`;
        this.db.execute(
          `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
           VALUES (?, ?, ?, 'OUTBOUND_DOWRY_GIFT', ?, ?, ?, ?);`,
          [
            movId,
            meta.currentDate,
            item.itemCode,
            item.quantity,
            itemRow.unit_cost_basis || 0,
            newQty,
            `TXN-MARR-${targetWifeId}`
          ]
        );

        deductedItems.push({ itemCode: item.itemCode, quantity: item.quantity });
      }

      // 8. Deduct Cash & Log Double-Entry Accounting
      const newLiquid = liquidCash - dowryCash;
      const newTotalCash = newLiquid + safeCash;

      this.db.execute(
        'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
        [newLiquid, playerId]
      );

      const txnId = `TXN-MARR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Insert into cashflow_ledger
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
         VALUES (?, ?, ?, 'MARRIAGE_DOWRY', 0, ?, ?, ?, 'Confirmed');`,
        [
          txnId,
          meta.currentDate,
          character.name_vi,
          dowryCash,
          newTotalCash,
          `Nạp sính lễ thành hôn cùng ${character.name_vi}`
        ]
      );

      // Insert balanced double-entry into account_journal
      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '6001_OPERATING_EXPENSE', ?, 0, ?);`,
        [txnId, meta.campaignId, meta.currentDate, dowryCash, `Chi phí sính lễ thành thân [${character.name_vi}]`]
      );

      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '1001_CASH_MOBILE', 0, ?, ?);`,
        [txnId, meta.campaignId, meta.currentDate, dowryCash, `Xuất quỹ tiền mặt ngân khố sính lễ`]
      );

      // 9. Update Civilian Maiden Registry if applicable
      if (isCivilianMaiden) {
        this.db.execute(
          'UPDATE civilian_maidens SET is_married = 1, husband_id = ? WHERE maiden_id = ?;',
          [playerId, targetWifeId]
        );
      }

      // 10. Register Marriage
      const marriageId = `MARR-${Date.now().toString(36).toUpperCase()}`;
      this.db.execute(
        `INSERT INTO family_spouses (
          marriage_id, husband_id, wife_id, wife_name_vi, wife_name_en,
          marriage_date, marriage_turn, dowry_cash, dowry_items_json,
          intimacy, status, pregnancy_stage, household_role, role_effect_desc_vi
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'MARRIED', 0, 'HOUSEKEEPER', 'Tăng 30% tốc độ hồi phục thể lực khi nghỉ ngơi.'
        );`,
        [
          marriageId,
          playerId,
          targetWifeId,
          character.name_vi,
          character.name_en,
          meta.currentDate,
          meta.activeTurn,
          dowryCash,
          JSON.stringify(deductedItems),
          sentiment.affinity
        ]
      );

      // 11. Register Genealogy Tree Edge
      const lineage = this.db.queryOne<any>('SELECT current_generation FROM family_lineage LIMIT 1;') || {
        current_generation: 1
      };
      this.db.execute(
        `INSERT INTO family_genealogy_tree (ancestor_id, descendant_id, relation_type, generation, notes)
         VALUES (?, ?, 'SPOUSE', ?, ?);`,
        [playerId, targetWifeId, lineage.current_generation, `Hôn phối chính thê [${character.name_vi}]`]
      );

      // 12. Increase Family Prestige & NPC devotion
      this.db.execute(
        'UPDATE family_lineage SET family_prestige = family_prestige + 25 WHERE family_id = ?;',
        ['FAM-LIANG']
      );

      const newSentimentTotal = Math.max(0, Math.min(100, sentiment.affinity + 10));
      this.db.execute(
        `INSERT INTO npc_relationship_deltas (
          npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
        ) VALUES (?, ?, 10, ?, 'DEVOTED', ?);`,
        [
          targetWifeId,
          meta.currentDate,
          newSentimentTotal,
          `Thành thân đại hỷ, kết tóc se duyên cùng Lương Diễn`
        ]
      );

      const narrativeVi = `Cử hành hôn lễ đại hỷ cùng ${character.name_vi}! Trống gõ rợp trời, tiệc rượu ba ngày ba đêm. Sính lễ ${dowryCash.toLocaleString()} Tiền đã giao nạp. Danh vọng gia tộc tăng thêm 25 điểm!`;

      return {
        success: true,
        marriageId,
        wifeId: targetWifeId,
        wifeNameVi: character.name_vi,
        wifeNameEn: character.name_en,
        dowryCashDeducted: dowryCash,
        dowryItemsDeducted: deductedItems,
        intimacy: sentiment.affinity,
        narrativeVi
      };
    });
  }
}
