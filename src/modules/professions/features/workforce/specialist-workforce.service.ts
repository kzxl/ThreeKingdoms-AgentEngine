/**
 * ThreeKingdoms-AgentEngine: Specialist Workforce & Retainer Employment Service
 * (src/modules/professions/features/workforce/specialist-workforce.service.ts)
 *
 * Implements hiring, employment contracts, role assignment into business enterprises,
 * and operational efficiency enhancements for all 20 auxiliary specialists (NPC-0201 -> NPC-0220).
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../../../core/database';
import { recordFinancialTransaction } from '../../../../shared/financial-transaction';

export interface SpecialistCandidate {
  npcId: string;
  nameVi: string;
  nameEn: string;
  baselineLocation: string;
  baselinePositionVi: string;
  intAttr: number;
  polAttr: number;
  warAttr: number;
  ldrAttr: number;
  comAttr: number;
  logAttr: number;
  craAttr: number;
  talents: string;
  bioVi: string;
  isHired: boolean;
  assignedBusinessId?: string | null;
  assignedBusinessName?: string | null;
  assignedRole?: string | null;
  monthlyWage: number;
  signingBonus: number;
  efficiencyBonus: number;
  recommendedRole: string;
}

export interface HireSpecialistInput {
  characterId?: string;
  npcId: string;
  businessId: string;
  role?: string;
  signingBonus?: number;
}

export interface HireSpecialistResult {
  success: boolean;
  npcId: string;
  nameVi: string;
  assignedBusinessId: string;
  businessName: string;
  assignedRole: string;
  monthlyWage: number;
  signingBonusPaid: number;
  newEfficiencyMultiplier: number;
  newWorkforceCount: number;
  messageVi: string;
}

export class SpecialistWorkforceService {
  private static instance: SpecialistWorkforceService | null = null;
  private db: DatabaseService;

  public constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  public static getInstance(db?: DatabaseService): SpecialistWorkforceService {
    if (!SpecialistWorkforceService.instance || db) {
      SpecialistWorkforceService.instance = new SpecialistWorkforceService(db);
    }
    return SpecialistWorkforceService.instance;
  }

  /**
   * Retrieves all auxiliary specialist candidates across settlements.
   */
  public getAvailableSpecialists(locationId?: string): SpecialistCandidate[] {
    let sql = `
      SELECT 
        mc.npc_id as npcId,
        mc.name_vi as nameVi,
        mc.name_en as nameEn,
        mc.baseline_location as baselineLocation,
        mc.baseline_position_vi as baselinePositionVi,
        mc.int_attr as intAttr,
        mc.pol_attr as polAttr,
        mc.war_attr as warAttr,
        mc.ldr_attr as ldrAttr,
        mc.com_attr as comAttr,
        mc.log_attr as logAttr,
        mc.cra_attr as craAttr,
        mc.talents,
        mc.bio_vi as bioVi,
        ns.assigned_business_id as assignedBusinessId,
        ns.assigned_role as assignedRole,
        ns.monthly_wage as currentWage,
        b.name as businessName
      FROM master_characters mc
      LEFT JOIN npc_state ns ON mc.npc_id = ns.npc_id
      LEFT JOIN businesses b ON ns.assigned_business_id = b.business_id
      WHERE mc.npc_id LIKE 'NPC-02%'
    `;
    const params: any[] = [];
    if (locationId) {
      sql += ` AND mc.baseline_location = ?`;
      params.push(locationId);
    }
    sql += ` ORDER BY mc.npc_id ASC;`;

    const rows = this.db.query<any>(sql, params);

    return rows.map((r) => {
      const isHired = !!r.assignedBusinessId;
      const isManager = r.baselinePositionVi.includes('Chưởng Quỹ') || r.baselinePositionVi.includes('Quản Gia');
      const isSmith = r.baselinePositionVi.includes('Thợ Rèn') || r.baselinePositionVi.includes('Đúc');
      const isEscort = r.baselinePositionVi.includes('Tiêu Đầu') || r.baselinePositionVi.includes('Hộ Vệ');
      const isWeaver = r.baselinePositionVi.includes('Dệt') || r.baselinePositionVi.includes('Chức');

      let recommendedRole = 'ASSISTANT_WORKER';
      let signingBonus = 200;
      let monthlyWage = 350;
      let efficiencyBonus = 0.15;

      if (isManager) {
        recommendedRole = 'ACCOUNTANT_MANAGER';
        signingBonus = 400;
        monthlyWage = 500;
        efficiencyBonus = 0.25;
      } else if (isSmith) {
        recommendedRole = 'MASTER_BLACKSMITH';
        signingBonus = 350;
        monthlyWage = 450;
        efficiencyBonus = 0.20;
      } else if (isEscort) {
        recommendedRole = 'CARAVAN_ESCORT_CHIEF';
        signingBonus = 300;
        monthlyWage = 400;
        efficiencyBonus = 0.18;
      } else if (isWeaver) {
        recommendedRole = 'MASTER_WEAVER';
        signingBonus = 250;
        monthlyWage = 380;
        efficiencyBonus = 0.18;
      }

      return {
        npcId: r.npcId,
        nameVi: r.nameVi,
        nameEn: r.nameEn,
        baselineLocation: r.baselineLocation,
        baselinePositionVi: r.baselinePositionVi,
        intAttr: r.intAttr,
        polAttr: r.polAttr,
        warAttr: r.warAttr,
        ldrAttr: r.ldrAttr,
        comAttr: r.comAttr,
        logAttr: r.logAttr,
        craAttr: r.craAttr,
        talents: r.talents || '',
        bioVi: r.bioVi || '',
        isHired,
        assignedBusinessId: r.assignedBusinessId,
        assignedBusinessName: r.businessName,
        assignedRole: r.assignedRole,
        monthlyWage: r.currentWage || monthlyWage,
        signingBonus,
        efficiencyBonus,
        recommendedRole
      };
    });
  }

  /**
   * Resolves a candidate by either exact NPC id or partial Vietnamese name.
   */
  public resolveCandidateByName(nameOrPattern: string): { npcId: string; nameVi: string } | null {
    const clean = nameOrPattern.split('(')[0].trim();
    const row = this.db.queryOne<any>(
      `SELECT npc_id, name_vi FROM master_characters WHERE npc_id = ? OR name_vi = ? OR name_vi LIKE ? LIMIT 1;`,
      [clean, clean, `%${clean}%`]
    );
    if (!row) return null;
    return { npcId: row.npc_id, nameVi: row.name_vi };
  }

  /**
   * Retrieves player-owned enterprises for workforce deployment.
   */
  public getPlayerBusinesses(characterId: string = 'PLY-0001'): any[] {
    const rows = this.db.query<any>(
      `SELECT 
        business_id as businessId,
        name,
        business_type as businessType,
        location_id as locationId,
        current_workforce as currentWorkforce,
        efficiency_multiplier as efficiencyMultiplier,
        safe_cash as safeCash
      FROM businesses 
      WHERE owner_character_id = ? OR owner_character_id IS NULL OR owner_character_id = ''
      ORDER BY business_id ASC;`,
      [characterId]
    );
    return rows;
  }

  /**
   * Executes hiring agreement with ACID transaction and double-entry accounting.
   */
  public hireSpecialist(input: HireSpecialistInput): HireSpecialistResult {
    const { characterId = 'PLY-0001', npcId, businessId, role, signingBonus = 250 } = input;

    // 1. Validate master character
    const masterChar = this.db.queryOne<any>(
      `SELECT * FROM master_characters WHERE npc_id = ? LIMIT 1;`,
      [npcId]
    );
    if (!masterChar) {
      throw new Error(`Nhân sự ${npcId} không tồn tại trong danh bộ nhân vật.`);
    }

    // 2. Validate target enterprise
    const business = this.db.queryOne<any>(
      `SELECT * FROM businesses WHERE business_id = ? LIMIT 1;`,
      [businessId]
    );
    if (!business) {
      throw new Error(`Sản nghiệp ${businessId} không tồn tại.`);
    }

    // 3. Check if already hired in npc_state
    const existingNpc = this.db.queryOne<any>(
      `SELECT * FROM npc_state WHERE npc_id = ? LIMIT 1;`,
      [npcId]
    );
    if (existingNpc && existingNpc.assigned_business_id) {
      throw new Error(`${masterChar.name_vi} hiện đang đảm nhiệm chức vụ tại sản nghiệp ${existingNpc.assigned_business_id}.`);
    }

    const assignedRole = role || 'SPECIALIST_OPERATOR';
    const isManager = assignedRole.includes('MANAGER') || masterChar.baseline_position_vi.includes('Chưởng Quỹ');
    const monthlyWage = isManager ? 500 : 380;
    const efficiencyIncrease = isManager ? 0.25 : 0.15;

    // 4. Execute atomic transaction
    return this.db.transaction(() => {
      // 4a. Double-entry cash outflow for signing bonus
      let costPaid = 0;
      if (signingBonus > 0) {
        const tx = recordFinancialTransaction(this.db, {
          category: 'WORKFORCE_HIRE',
          counterparty: masterChar.name_vi,
          memo: `Ký kết khế ước chiêu mộ ${masterChar.name_vi} (${masterChar.baseline_position_vi}) gia nhập ${business.name}`,
          outflow: signingBonus,
          debitAccount: 'EXP-OPERATING',
          creditAccount: 'CASH-ON-HAND'
        });
        costPaid = tx.outflow;
      }

      // 4b. Insert or update into npc_state
      this.db.execute(
        `INSERT OR REPLACE INTO npc_state (
          npc_id, name, loyalty, morale, fatigue,
          int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr,
          assigned_business_id, assigned_role, monthly_wage,
          management_exp, craft_exp, updated_at, talents, personality, motivation
        ) VALUES (
          ?, ?, 85, 90, 0,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          100, 50, datetime('now'), ?, ?, ?
        );`,
        [
          masterChar.npc_id,
          masterChar.name_vi,
          masterChar.int_attr || 50,
          masterChar.pol_attr || 50,
          masterChar.war_attr || 50,
          masterChar.ldr_attr || 50,
          masterChar.dip_attr || 50,
          masterChar.com_attr || 50,
          masterChar.log_attr || 50,
          masterChar.cra_attr || 50,
          businessId,
          assignedRole,
          monthlyWage,
          masterChar.talents || '',
          masterChar.personality || 'Chuyên chú',
          masterChar.motivation || 'Cống hiến sản nghiệp'
        ]
      );

      // 4c. Update business workforce & efficiency multiplier
      const newWorkforce = (business.current_workforce || 0) + 1;
      const newEfficiency = Math.min(2.0, Math.round(((business.efficiency_multiplier || 1.0) + efficiencyIncrease) * 100) / 100);

      let updateBizSql = `UPDATE businesses SET current_workforce = ?, efficiency_multiplier = ?`;
      const updateBizParams: any[] = [newWorkforce, newEfficiency];

      if (isManager) {
        updateBizSql += `, manager_npc_id = ?`;
        updateBizParams.push(masterChar.npc_id);
      }
      updateBizSql += ` WHERE business_id = ?;`;
      updateBizParams.push(businessId);

      this.db.execute(updateBizSql, updateBizParams);

      return {
        success: true,
        npcId: masterChar.npc_id,
        nameVi: masterChar.name_vi,
        assignedBusinessId: businessId,
        businessName: business.name,
        assignedRole,
        monthlyWage,
        signingBonusPaid: costPaid,
        newEfficiencyMultiplier: newEfficiency,
        newWorkforceCount: newWorkforce,
        messageVi: `Đã ký kết hợp đồng chiêu mộ ${masterChar.name_vi} thành công! Đảm nhiệm: ${assignedRole} tại ${business.name}. Hiệu suất vận hành tăng lên ${(newEfficiency * 100).toFixed(0)}%.`
      };
    });
  }
}
