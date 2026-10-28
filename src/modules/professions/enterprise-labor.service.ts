/**
 * ThreeKingdoms-AgentEngine: Enterprise & Labor Service
 * Implements the Sandbox Free Enterprise & Labor System:
 * - 4 Business Types: WORKSHOP, TAVERN, APOTHECARY, BLACKSMITH
 * - Owner Mode: open enterprise with initial capital, track revenue/staff/rent, collect profits
 * - Wage Worker Mode: work shifts (Chef, Waiter, Compounder, Gatherer, Forge Hand, Weaver)
 *   with fatigue cost, daily wage payout, profession EXP and attribute EXP rewards.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import { seedMasterRecipes } from './recipes-seed';

export type EnterpriseType = 'WORKSHOP' | 'TAVERN' | 'APOTHECARY' | 'BLACKSMITH';

export interface EnterpriseConfig {
  type: EnterpriseType;
  nameVi: string;
  nameEn: string;
  defaultWorkforce: number;
  monthlyRent: number;
  baseDailyRevenue: number;
  minCapitalRequired: number;
  descriptionVi: string;
}

export const ENTERPRISE_CONFIGS: Record<EnterpriseType, EnterpriseConfig> = {
  WORKSHOP: {
    type: 'WORKSHOP',
    nameVi: 'Xưởng Dệt & Chế Tác Bản Địa',
    nameEn: 'Artisan Workshop & Weaver Guild',
    defaultWorkforce: 4,
    monthlyRent: 200,
    baseDailyRevenue: 140,
    minCapitalRequired: 1000,
    descriptionVi: 'Xưởng thủ công dệt lụa gai, đan chiếu trúc, gia công vật dụng thiết yếu.'
  },
  TAVERN: {
    type: 'TAVERN',
    nameVi: 'Tửu Quán & Khách Điếm Hào Hiệp',
    nameEn: 'Tavern & Inn',
    defaultWorkforce: 3,
    monthlyRent: 250,
    baseDailyRevenue: 200,
    minCapitalRequired: 1500,
    descriptionVi: 'Quán rượu và khách điếm phục vụ lữ khách, chế biến món ngon và thu thập tin tức tình báo.'
  },
  APOTHECARY: {
    type: 'APOTHECARY',
    nameVi: 'Dược Điếm & Y Quán Tế Thế',
    nameEn: 'Apothecary & Clinic',
    defaultWorkforce: 2,
    monthlyRent: 220,
    baseDailyRevenue: 180,
    minCapitalRequired: 1200,
    descriptionVi: 'Hiệu thuốc và phòng khám y đạo cứu người, điều chế thuốc thang và cao dán trị ngoại thương.'
  },
  BLACKSMITH: {
    type: 'BLACKSMITH',
    nameVi: 'Lò Rèn Bách Nghệ & Quân Nhu',
    nameEn: 'Blacksmith & Armory Forge',
    defaultWorkforce: 4,
    monthlyRent: 300,
    baseDailyRevenue: 260,
    minCapitalRequired: 2000,
    descriptionVi: 'Lò rèn đúc binh khí giáo thương, dao khiên, nông cụ và khí tài phòng thủ.'
  }
};

export type JobTypeCode =
  | 'JOB_TAVERN_COOK'
  | 'JOB_TAVERN_STAFF'
  | 'JOB_APOTHECARY_COMPOUNDER'
  | 'JOB_HERB_GATHERER'
  | 'JOB_FORGE_HAND'
  | 'JOB_WEAVER';

export interface WageJobDefinition {
  jobType: JobTypeCode;
  businessType: EnterpriseType;
  titleVi: string;
  titleEn: string;
  dailyWage: number;
  fatigueCost: number;
  professionCode: string;
  professionNameVi: string;
  professionNameEn: string;
  professionCategory: string;
  professionExp: number;
  attributeTarget: 'cra' | 'com' | 'log';
  attributeExp: number;
  descriptionVi: string;
}

export const WAGE_JOB_CATALOG: Record<JobTypeCode, WageJobDefinition> = {
  JOB_TAVERN_COOK: {
    jobType: 'JOB_TAVERN_COOK',
    businessType: 'TAVERN',
    titleVi: 'Đầu Bếp Quán Rượu (Trù Sư Phụ Tá)',
    titleEn: 'Tavern Cook & Kitchen Artisan',
    dailyWage: 65,
    fatigueCost: 15,
    professionCode: 'PROF_CHEF',
    professionNameVi: 'Trù Nghệ & Ẩm Thực Bách Vị',
    professionNameEn: 'Culinary Chef & Gastronomy',
    professionCategory: 'CRAFTING',
    professionExp: 25,
    attributeTarget: 'cra',
    attributeExp: 15,
    descriptionVi: 'Đứng bếp nấu canh rượu, xào thịt bánh bao phục vụ thực khách phương xa.'
  },
  JOB_TAVERN_STAFF: {
    jobType: 'JOB_TAVERN_STAFF',
    businessType: 'TAVERN',
    titleVi: 'Tiểu Nhị Tửu Quán (Bồi Bàn Khách Điếm)',
    titleEn: 'Tavern Waiter & Guest Host',
    dailyWage: 40,
    fatigueCost: 15,
    professionCode: 'PROF_MERCHANT',
    professionNameVi: 'Hành Thương & Khách Điếm',
    professionNameEn: 'Hospitality & Commerce',
    professionCategory: 'COMMERCE',
    professionExp: 25,
    attributeTarget: 'com',
    attributeExp: 10,
    descriptionVi: 'Đón tiếp lữ khách tứ phương, bưng bê trà tửu, thu xếp bàn ghế và khéo léo chào hàng.'
  },
  JOB_APOTHECARY_COMPOUNDER: {
    jobType: 'JOB_APOTHECARY_COMPOUNDER',
    businessType: 'APOTHECARY',
    titleVi: 'Dược Đồng Bào Chế (Thợ Giã Dược)',
    titleEn: 'Apothecary Medicine Compounder',
    dailyWage: 60,
    fatigueCost: 15,
    professionCode: 'PROF_MEDICINE',
    professionNameVi: 'Y Điếm & Bào Chế Y Dược',
    professionNameEn: 'Apothecary & Herbal Medicine',
    professionCategory: 'CRAFTING',
    professionExp: 25,
    attributeTarget: 'cra',
    attributeExp: 15,
    descriptionVi: 'Nghiền chu sa, chưng cất cao dược, cân đong dược liệu thảo mộc điều chế Kim Sang Dược.'
  },
  JOB_HERB_GATHERER: {
    jobType: 'JOB_HERB_GATHERER',
    businessType: 'APOTHECARY',
    titleVi: 'Thái Dược Sơn Dân (Người Hái Thảo Dược)',
    titleEn: 'Wild Herbal Forager',
    dailyWage: 45,
    fatigueCost: 15,
    professionCode: 'PROF_HERBALIST',
    professionNameVi: 'Thái Dược & Biện Thảo',
    professionNameEn: 'Herbalist & Forager',
    professionCategory: 'GATHERING',
    professionExp: 25,
    attributeTarget: 'cra',
    attributeExp: 10,
    descriptionVi: 'Lên các đỉnh núi hiểm trở thu hái thảo dược tươi, sơ chế phơi khô nhập kho cho y quán.'
  },
  JOB_FORGE_HAND: {
    jobType: 'JOB_FORGE_HAND',
    businessType: 'BLACKSMITH',
    titleVi: 'Phụ Lò Rèn (Thợ Đập Đe & Kéo Bễ)',
    titleEn: 'Forge Hand & Apprentice Smith',
    dailyWage: 75,
    fatigueCost: 15,
    professionCode: 'PROF_BLACKSMITH',
    professionNameVi: 'Đại Sư Rèn Đúc & Luyện Cương',
    professionNameEn: 'Blacksmith & Smelter',
    professionCategory: 'CRAFTING',
    professionExp: 25,
    attributeTarget: 'cra',
    attributeExp: 15,
    descriptionVi: 'Kéo bễ thổi than hồng, quai búa tôi thép, phụ trợ rèn đúc đao thương và nông cụ.'
  },
  JOB_WEAVER: {
    jobType: 'JOB_WEAVER',
    businessType: 'WORKSHOP',
    titleVi: 'Thợ Dệt Vải & Đan Lát Bản Địa',
    titleEn: 'Weaver & Mat Artisan',
    dailyWage: 50,
    fatigueCost: 15,
    professionCode: 'PROF_CRAFTSMAN',
    professionNameVi: 'Thợ Đan Dệt & Chế Tác Khí Giới',
    professionNameEn: 'Textile & Shield Craftsman',
    professionCategory: 'CRAFTING',
    professionExp: 25,
    attributeTarget: 'cra',
    attributeExp: 15,
    descriptionVi: 'Vận hành khung cửi dệt tơ lụa gai, đan chiếu trúc Lương gia và khung khiên da quân dụng.'
  }
};

export interface EnterpriseOpenResult {
  success: boolean;
  businessId: string;
  name: string;
  type: EnterpriseType;
  locationId: string;
  ownerCharacterId: string;
  initialCapital: number;
  remainingPlayerCash: number;
  safeCash: number;
  currentWorkforce: number;
  monthlyRent: number;
  dailyRevenue: number;
  status: string;
  message: string;
}

export interface EnterpriseDetails {
  businessId: string;
  name: string;
  type: EnterpriseType;
  locationId: string;
  ownerCharacterId: string;
  status: string;
  safeCash: number;
  dailyRevenue: number;
  staff: number;
  currentWorkforce: number;
  rent: number;
  monthlyRent: number;
  accumulatedProfit: number;
  delegationLevel: number;
  efficiencyMultiplier: number;
  autoProcure: boolean;
}

export interface CollectProfitsResult {
  success: boolean;
  businessId: string;
  collectedAmount: number;
  remainingProfit: number;
  remainingSafeCash: number;
  ownerNewCash: number;
  message: string;
}

export interface WorkShiftResult {
  success: boolean;
  characterId: string;
  jobType: JobTypeCode;
  jobTitle: string;
  wagePaid: number;
  fatigueConsumed: number;
  newFatigue: number;
  newLiquidCash: number;
  professionCode: string;
  professionNameVi: string;
  professionExpGained: number;
  currentProfessionTier: number;
  currentProfessionExp: number;
  attributeTarget: string;
  attributeExpGained: number;
  newAttributeExp: number;
  newAttributeVal: number;
  message: string;
}

export class EnterpriseLaborService {
  private static instance: EnterpriseLaborService | null = null;
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
    this.ensureSchema();
  }

  public static getInstance(db?: DatabaseService): EnterpriseLaborService {
    if (!EnterpriseLaborService.instance || db) {
      EnterpriseLaborService.instance = new EnterpriseLaborService(db);
    }
    return EnterpriseLaborService.instance;
  }

  /**
   * Ensures all required tables and schema columns exist in the database.
   */
  public ensureSchema(): void {
    // 1. Ensure businesses table
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS businesses (
        business_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location_id TEXT NOT NULL DEFAULT 'LOC-0001',
        manager_npc_id TEXT,
        safe_cash INTEGER NOT NULL DEFAULT 3000,
        delegation_level INTEGER NOT NULL DEFAULT 2,
        efficiency_multiplier REAL NOT NULL DEFAULT 0.85,
        current_workforce INTEGER NOT NULL DEFAULT 4,
        monthly_capacity_hours INTEGER NOT NULL DEFAULT 800,
        monthly_rent INTEGER NOT NULL DEFAULT 200,
        auto_procure INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        business_type TEXT DEFAULT 'WORKSHOP',
        owner_character_id TEXT DEFAULT 'PLY-0001',
        daily_revenue INTEGER DEFAULT 0,
        accumulated_profit INTEGER DEFAULT 0
      );
    `);

    // Add optional columns to businesses if table already existed without them
    try {
      const cols = this.db.query<any>('PRAGMA table_info(businesses);').map((c) => c.name);
      if (!cols.includes('business_type')) {
        this.db.execute('ALTER TABLE businesses ADD COLUMN business_type TEXT DEFAULT "WORKSHOP";');
      }
      if (!cols.includes('owner_character_id')) {
        this.db.execute('ALTER TABLE businesses ADD COLUMN owner_character_id TEXT DEFAULT "PLY-0001";');
      }
      if (!cols.includes('daily_revenue')) {
        this.db.execute('ALTER TABLE businesses ADD COLUMN daily_revenue INTEGER DEFAULT 0;');
      }
      if (!cols.includes('accumulated_profit')) {
        this.db.execute('ALTER TABLE businesses ADD COLUMN accumulated_profit INTEGER DEFAULT 0;');
      }
    } catch {
      // pragma inspect fallback
    }

    // 2. Ensure player_state table
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS player_state (
        player_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        style_name TEXT,
        age INTEGER NOT NULL DEFAULT 25,
        current_location TEXT NOT NULL DEFAULT 'LOC-0001',
        permanent_base TEXT NOT NULL DEFAULT 'LOC-0001',
        int_attr INTEGER NOT NULL DEFAULT 50,
        pol_attr INTEGER NOT NULL DEFAULT 50,
        war_attr INTEGER NOT NULL DEFAULT 50,
        ldr_attr INTEGER NOT NULL DEFAULT 50,
        dip_attr INTEGER NOT NULL DEFAULT 50,
        com_attr INTEGER NOT NULL DEFAULT 50,
        log_attr INTEGER NOT NULL DEFAULT 50,
        cra_attr INTEGER NOT NULL DEFAULT 50,
        liquid_cash INTEGER NOT NULL DEFAULT 15000,
        safe_cash INTEGER NOT NULL DEFAULT 0,
        strategic_grain REAL NOT NULL DEFAULT 0.0,
        fixed_capital INTEGER NOT NULL DEFAULT 0,
        special_licenses TEXT DEFAULT '[]',
        health INTEGER NOT NULL DEFAULT 100,
        fatigue INTEGER NOT NULL DEFAULT 0,
        morale INTEGER NOT NULL DEFAULT 100,
        int_exp INTEGER NOT NULL DEFAULT 0,
        war_exp INTEGER NOT NULL DEFAULT 0,
        ldr_exp INTEGER NOT NULL DEFAULT 0,
        pol_exp INTEGER NOT NULL DEFAULT 0,
        dip_exp INTEGER NOT NULL DEFAULT 0,
        com_exp INTEGER NOT NULL DEFAULT 0,
        log_exp INTEGER NOT NULL DEFAULT 0,
        cra_exp INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 3. Ensure character_professions table
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS character_professions (
        character_id TEXT NOT NULL,
        profession_code TEXT NOT NULL,
        profession_name_vi TEXT NOT NULL,
        profession_name_en TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GATHERING',
        tier INTEGER NOT NULL DEFAULT 1,
        current_exp INTEGER NOT NULL DEFAULT 0,
        max_exp INTEGER NOT NULL DEFAULT 100,
        is_primary INTEGER NOT NULL DEFAULT 0,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (character_id, profession_code)
      );
    `);

    // 4. Ensure cashflow_ledger table
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS cashflow_ledger (
        txn_id TEXT PRIMARY KEY,
        game_date TEXT NOT NULL,
        counterparty TEXT NOT NULL,
        category TEXT NOT NULL,
        inflow INTEGER NOT NULL DEFAULT 0,
        outflow INTEGER NOT NULL DEFAULT 0,
        balance INTEGER NOT NULL,
        memo TEXT,
        status TEXT NOT NULL DEFAULT 'Confirmed'
      );
    `);

    // 5. Seed recipes into master_recipes & master_items
    seedMasterRecipes(this.db);
  }

  // =========================================================================
  // OWNER MODE (Làm Chủ Sản Nghiệp)
  // =========================================================================

  /**
   * Opens an enterprise business facility owned by characterId.
   * Deducts initial capital from player liquid cash and registers enterprise.
   */
  public openEnterprise(
    characterId: string,
    type: string,
    name: string,
    locationId: string,
    initialCapital: number
  ): EnterpriseOpenResult {
    const normalizedType = type.toUpperCase() as EnterpriseType;
    const config = ENTERPRISE_CONFIGS[normalizedType];

    if (!config) {
      throw new Error(
        `Loại hình doanh nghiệp không hợp lệ: "${type}". Hỗ trợ 4 loại: WORKSHOP, TAVERN, APOTHECARY, BLACKSMITH.`
      );
    }

    if (initialCapital <= 0) {
      throw new Error(`Tiền vốn đầu tư ban đầu phải lớn hơn 0 (Đã cung cấp: ${initialCapital}).`);
    }

    // Retrieve or initialize player state
    let player = this.db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', [characterId]);
    if (!player) {
      this.db.execute(
        `INSERT OR IGNORE INTO player_state (player_id, name, age, liquid_cash, fatigue, cra_attr, com_attr)
         VALUES (?, ?, 25, 10000, 0, 50, 50);`,
        [characterId, characterId]
      );
      player = this.db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', [characterId]);
    }

    if (player.liquid_cash < initialCapital) {
      throw new Error(
        `Khí huyết tài chính bất túc! Cần ít nhất ${initialCapital} tiền vốn, hiện chỉ có ${player.liquid_cash} tiền.`
      );
    }

    const businessId = `BIZ-${normalizedType}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const currentDate = this.getGameDate();

    return this.db.transaction(() => {
      // 1. Deduct capital from player
      const remainingCash = player.liquid_cash - initialCapital;
      this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [
        remainingCash,
        characterId
      ]);

      // 2. Record cashflow ledger entry
      const txnId = `TXN-CAPITAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo)
         VALUES (?, ?, ?, 'CAPITAL_INVESTMENT', 0, ?, ?, ?);`,
        [txnId, currentDate, `Khai trương ${name}`, initialCapital, remainingCash, `Đầu tư mở cơ sở kinh doanh ${name}`]
      );

      // 3. Register business in businesses table
      this.db.execute(
        `INSERT INTO businesses (
          business_id, name, location_id, manager_npc_id, safe_cash,
          delegation_level, efficiency_multiplier, current_workforce,
          monthly_capacity_hours, monthly_rent, auto_procure, status,
          business_type, owner_character_id, daily_revenue, accumulated_profit
        ) VALUES (?, ?, ?, NULL, ?, 2, 0.9, ?, 800, ?, 1, 'ACTIVE', ?, ?, ?, 0);`,
        [
          businessId,
          name,
          locationId,
          initialCapital,
          config.defaultWorkforce,
          config.monthlyRent,
          normalizedType,
          characterId,
          config.baseDailyRevenue
        ]
      );

      return {
        success: true,
        businessId,
        name,
        type: normalizedType,
        locationId,
        ownerCharacterId: characterId,
        initialCapital,
        remainingPlayerCash: remainingCash,
        safeCash: initialCapital,
        currentWorkforce: config.defaultWorkforce,
        monthlyRent: config.monthlyRent,
        dailyRevenue: config.baseDailyRevenue,
        status: 'ACTIVE',
        message: `Khai trương thành công cơ sở ${name} (${config.nameVi})! Tiền vốn ban đầu ${initialCapital} đã nạp vào ngân khố an toàn.`
      };
    });
  }

  /**
   * Retrieves enterprise details: status, safe cash, daily revenue, staff, rent.
   */
  public getEnterpriseDetails(businessId: string): EnterpriseDetails {
    const row = this.db.queryOne<any>('SELECT * FROM businesses WHERE business_id = ?;', [businessId]);
    if (!row) {
      throw new Error(`Không tìm thấy cơ sở kinh doanh với ID: ${businessId}`);
    }

    const type = (row.business_type || 'WORKSHOP') as EnterpriseType;

    return {
      businessId: row.business_id,
      name: row.name,
      type,
      locationId: row.location_id,
      ownerCharacterId: row.owner_character_id || 'PLY-0001',
      status: row.status,
      safeCash: row.safe_cash,
      dailyRevenue: row.daily_revenue || 0,
      staff: row.current_workforce,
      currentWorkforce: row.current_workforce,
      rent: row.monthly_rent,
      monthlyRent: row.monthly_rent,
      accumulatedProfit: row.accumulated_profit || 0,
      delegationLevel: row.delegation_level,
      efficiencyMultiplier: row.efficiency_multiplier,
      autoProcure: Boolean(row.auto_procure)
    };
  }

  /**
   * Accrues operational profits for an enterprise based on daily revenue, rent, and overhead.
   */
  public accrueProfits(businessId: string, days = 1): { netProfitAccrued: number; totalAccumulatedProfit: number } {
    const biz = this.getEnterpriseDetails(businessId);
    const dailyRent = Math.round(biz.monthlyRent / 30);
    const dailyWageCost = biz.currentWorkforce * 15;
    const dailyNetProfit = Math.max(10, biz.dailyRevenue - dailyRent - dailyWageCost);
    const totalAccrued = dailyNetProfit * days;

    this.db.execute(
      `UPDATE businesses SET accumulated_profit = accumulated_profit + ? WHERE business_id = ?;`,
      [totalAccrued, businessId]
    );

    const updated = this.getEnterpriseDetails(businessId);
    return {
      netProfitAccrued: totalAccrued,
      totalAccumulatedProfit: updated.accumulatedProfit
    };
  }

  /**
   * Withdraws accumulated profits from the enterprise to the owner's personal cash.
   */
  public collectProfits(businessId: string, withdrawAmount?: number): CollectProfitsResult {
    const biz = this.getEnterpriseDetails(businessId);
    const availableProfit = biz.accumulatedProfit;

    if (availableProfit <= 0 && (!withdrawAmount || biz.safeCash <= 0)) {
      return {
        success: true,
        businessId,
        collectedAmount: 0,
        remainingProfit: 0,
        remainingSafeCash: biz.safeCash,
        ownerNewCash: this.getPlayerCash(biz.ownerCharacterId),
        message: 'Cơ sở hiện chưa có thặng dư lợi nhuận tích lũy để rút.'
      };
    }

    const toWithdraw = withdrawAmount
      ? Math.min(withdrawAmount, availableProfit > 0 ? availableProfit : biz.safeCash)
      : availableProfit > 0
      ? availableProfit
      : biz.safeCash;

    if (toWithdraw <= 0) {
      return {
        success: true,
        businessId,
        collectedAmount: 0,
        remainingProfit: availableProfit,
        remainingSafeCash: biz.safeCash,
        ownerNewCash: this.getPlayerCash(biz.ownerCharacterId),
        message: 'Số tiền muốn rút không hợp lệ.'
      };
    }

    const currentDate = this.getGameDate();

    return this.db.transaction(() => {
      // 1. Deduct profit from business record
      if (availableProfit >= toWithdraw) {
        this.db.execute(
          'UPDATE businesses SET accumulated_profit = accumulated_profit - ? WHERE business_id = ?;',
          [toWithdraw, businessId]
        );
      } else {
        // Fallback: deduct what remains of accumulated profit, then the rest from safe cash
        const profitDeducted = availableProfit;
        const safeCashDeducted = toWithdraw - profitDeducted;
        this.db.execute(
          'UPDATE businesses SET accumulated_profit = 0, safe_cash = MAX(0, safe_cash - ?) WHERE business_id = ?;',
          [safeCashDeducted, businessId]
        );
      }

      // 2. Deposit into owner's personal liquid cash
      this.db.execute(
        'UPDATE player_state SET liquid_cash = liquid_cash + ? WHERE player_id = ?;',
        [toWithdraw, biz.ownerCharacterId]
      );

      const ownerNewCash = this.getPlayerCash(biz.ownerCharacterId);

      // 3. Log cashflow ledger entry
      const txnId = `TXN-DIVIDEND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo)
         VALUES (?, ?, ?, 'ENTERPRISE_DIVIDEND', ?, 0, ?, ?);`,
        [txnId, currentDate, biz.name, toWithdraw, ownerNewCash, `Rút lợi nhuận kinh doanh từ ${biz.name}`]
      );

      const updated = this.getEnterpriseDetails(businessId);

      return {
        success: true,
        businessId,
        collectedAmount: toWithdraw,
        remainingProfit: updated.accumulatedProfit,
        remainingSafeCash: updated.safeCash,
        ownerNewCash,
        message: `Đã rút thành công ${toWithdraw} tiền lợi nhuận từ ${biz.name}. Số dư cá nhân hiện có: ${ownerNewCash}.`
      };
    });
  }

  // =========================================================================
  // WAGE WORKER / LABORER MODE (Đi Làm Thuê)
  // =========================================================================

  /**
   * Performs a labor shift for a character as an employee/laborer.
   * Requires 0 capital, consumes 15 fatigue, pays daily wage, awards profession EXP and attribute EXP.
   */
  public workShift(characterId: string, jobType: string): WorkShiftResult {
    const normalizedJob = jobType.toUpperCase() as JobTypeCode;
    const job = WAGE_JOB_CATALOG[normalizedJob];

    if (!job) {
      const validJobs = Object.keys(WAGE_JOB_CATALOG).join(', ');
      throw new Error(`Công việc làm thuê không hợp lệ: "${jobType}". Các công việc hỗ trợ: ${validJobs}`);
    }

    // Retrieve or initialize character state
    let player = this.db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', [characterId]);
    if (!player) {
      this.db.execute(
        `INSERT OR IGNORE INTO player_state (player_id, name, age, liquid_cash, fatigue, cra_attr, com_attr)
         VALUES (?, ?, 25, 0, 0, 50, 50);`,
        [characterId, characterId]
      );
      player = this.db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', [characterId]);
    }

    // Fatigue check
    if (player.fatigue + job.fatigueCost > 95) {
      throw new Error(
        `Khí lực kiệt quệ (${player.fatigue}/100)! Quá mệt mỏi, cần nghỉ ngơi hoặc ẩm trà trước khi làm thêm ca.`
      );
    }

    const currentDate = this.getGameDate();

    return this.db.transaction(() => {
      // 1. Deduct fatigue & add daily wage
      const newFatigue = Math.min(100, player.fatigue + job.fatigueCost);
      const newLiquidCash = player.liquid_cash + job.dailyWage;

      // 2. Award attribute EXP
      let newAttrVal = 50;
      let newAttrExp = 0;
      if (job.attributeTarget === 'cra') {
        newAttrExp = (player.cra_exp || 0) + job.attributeExp;
        newAttrVal = player.cra_attr || 50;
        if (newAttrExp >= 100) {
          newAttrVal += 1;
          newAttrExp -= 100;
        }
        this.db.execute(
          `UPDATE player_state SET fatigue = ?, liquid_cash = ?, cra_attr = ?, cra_exp = ? WHERE player_id = ?;`,
          [newFatigue, newLiquidCash, newAttrVal, newAttrExp, characterId]
        );
      } else if (job.attributeTarget === 'com') {
        newAttrExp = (player.com_exp || 0) + job.attributeExp;
        newAttrVal = player.com_attr || 50;
        if (newAttrExp >= 100) {
          newAttrVal += 1;
          newAttrExp -= 100;
        }
        this.db.execute(
          `UPDATE player_state SET fatigue = ?, liquid_cash = ?, com_attr = ?, com_exp = ? WHERE player_id = ?;`,
          [newFatigue, newLiquidCash, newAttrVal, newAttrExp, characterId]
        );
      } else {
        newAttrExp = (player.cra_exp || 0) + job.attributeExp;
        newAttrVal = player.cra_attr || 50;
        this.db.execute(
          `UPDATE player_state SET fatigue = ?, liquid_cash = ?, cra_exp = ? WHERE player_id = ?;`,
          [newFatigue, newLiquidCash, newAttrExp, characterId]
        );
      }

      // 3. Log cashflow wage transaction
      const txnId = `TXN-WAGE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo)
         VALUES (?, ?, ?, 'LABOR_WAGE', ?, 0, ?, ?);`,
        [txnId, currentDate, `Chủ quản cơ sở (${job.businessType})`, job.dailyWage, newLiquidCash, `Tiền công làm thuê: ${job.titleVi}`]
      );

      // 4. Award Profession EXP
      const existingProf = this.db.queryOne<any>(
        'SELECT * FROM character_professions WHERE character_id = ? AND profession_code = ?;',
        [characterId, job.professionCode]
      );

      let profTier = 1;
      let profExp = job.professionExp;
      let profMaxExp = 100;

      if (existingProf) {
        profTier = existingProf.tier;
        profExp = existingProf.current_exp + job.professionExp;
        profMaxExp = existingProf.max_exp;

        if (profExp >= profMaxExp && profTier < 5) {
          profExp -= profMaxExp;
          profTier += 1;
          profMaxExp = Math.round(profMaxExp * 1.5);
        }

        this.db.execute(
          `UPDATE character_professions
           SET tier = ?, current_exp = ?, max_exp = ?
           WHERE character_id = ? AND profession_code = ?;`,
          [profTier, profExp, profMaxExp, characterId, job.professionCode]
        );
      } else {
        this.db.execute(
          `INSERT INTO character_professions (
            character_id, profession_code, profession_name_vi, profession_name_en,
            category, tier, current_exp, max_exp, is_primary
          ) VALUES (?, ?, ?, ?, ?, 1, ?, 100, 0);`,
          [
            characterId,
            job.professionCode,
            job.professionNameVi,
            job.professionNameEn,
            job.professionCategory,
            job.professionExp
          ]
        );
      }

      return {
        success: true,
        characterId,
        jobType: job.jobType,
        jobTitle: job.titleVi,
        wagePaid: job.dailyWage,
        fatigueConsumed: job.fatigueCost,
        newFatigue,
        newLiquidCash,
        professionCode: job.professionCode,
        professionNameVi: job.professionNameVi,
        professionExpGained: job.professionExp,
        currentProfessionTier: profTier,
        currentProfessionExp: profExp,
        attributeTarget: job.attributeTarget,
        attributeExpGained: job.attributeExp,
        newAttributeExp: newAttrExp,
        newAttributeVal: newAttrVal,
        message: `Hoàn tất ca làm ${job.titleVi}: Nhận ${job.dailyWage} tiền công, tiêu hao ${job.fatigueCost} Thể Lực, +${job.professionExp} EXP nghề ${job.professionNameVi}, +${job.attributeExp} EXP thuộc tính!`
      };
    });
  }

  /**
   * Retrieves list of all available wage worker jobs in the game.
   */
  public getAvailableJobs(): WageJobDefinition[] {
    return Object.values(WAGE_JOB_CATALOG);
  }

  /**
   * Retrieves all businesses owned by a specific character.
   */
  public getEnterprisesByOwner(characterId: string): EnterpriseDetails[] {
    const rows = this.db.query<any>(
      'SELECT business_id FROM businesses WHERE owner_character_id = ? ORDER BY business_id ASC;',
      [characterId]
    );
    return rows.map((r) => this.getEnterpriseDetails(r.business_id));
  }

  // =========================================================================
  // Internal Helpers
  // =========================================================================

  private getGameDate(): string {
    try {
      const meta = this.db.queryOne<any>('SELECT current_date FROM campaign_meta LIMIT 1;');
      if (meta && meta.current_date) return meta.current_date;
    } catch {
      // fallback
    }
    return '184-05-01';
  }

  private getPlayerCash(characterId: string): number {
    try {
      const row = this.db.queryOne<any>('SELECT liquid_cash FROM player_state WHERE player_id = ?;', [characterId]);
      if (row) return row.liquid_cash;
    } catch {
      // fallback
    }
    return 0;
  }
}
