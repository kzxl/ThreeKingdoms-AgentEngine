/**
 * Feature Module: Ecological Crises & Macro Logistics Caravans
 * Implements dynamic natural disasters (droughts, locusts, floods, pestilence, peasant uprisings)
 * and physical trade caravan logistics with chokepoint bandit ambushes and bounty hunting.
 *
 * Adheres to AgentOption Universe Modular Architecture v4.0.
 */

import path from 'path';
import { execSync } from 'child_process';
import { DatabaseService } from '../../core/database';
import {
  IFeatureModule,
  ModuleContext,
  SettlementId,
  FactionId,
  CharacterId,
  EcologicalCrisis,
  TradeCaravan,
  BanditStronghold
} from '../../core/types';

export class EcologyLogisticsModule implements IFeatureModule {
  public readonly id = 'module.ecology-logistics';
  public readonly name = 'Ecological Crises & Macro Logistics Caravans';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;
  private db!: DatabaseService;

  public async init(ctx: ModuleContext): Promise<void> {
    this.ctx = ctx;
    this.db = DatabaseService.getInstance(ctx.dbPath);
    this.ensureTablesAndSeedData();

    // Subscribe to turn advanced event
    this.ctx.eventBus.subscribe('TURN_ADVANCED', async (payload: any) => {
      const turnNumber = payload?.turnNumber || 6;
      const gameDate = payload?.gameDate || '184-05-01';
      this.simulateEcologyAndLogisticsTurn(turnNumber, gameDate);
    });
  }

  private ensureTablesAndSeedData(): void {
    // 1. Seed initial Bandit Strongholds if empty
    const strongholdCount =
      this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM bandit_strongholds;`)?.count || 0;
    if (strongholdCount === 0) {
      this.seedBanditStrongholds();
    }

    // 2. Seed initial Trade Caravans if empty
    const caravanCount =
      this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM trade_caravans;`)?.count || 0;
    if (caravanCount === 0) {
      this.seedInitialCaravans();
    }

    // 3. Seed baseline Ecological Crisis if empty (Drought in Yecheng & Yellow Turban unrest)
    const crisisCount =
      this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM regional_ecological_crises;`)?.count || 0;
    if (crisisCount === 0) {
      this.seedBaselineCrises();
    }
  }

  private seedBanditStrongholds(): void {
    const sql = `
      INSERT OR REPLACE INTO bandit_strongholds (stronghold_id, name_vi, location_near, bandit_chief_name, bandit_power, plundered_wealth, bounty_reward, status) VALUES
      ('STRONGHOLD-TAIHANG', 'Hắc Sơn Phỉ Trại', 'ye_cheng', 'Trương Yến (Hắc Sơn Quân)', 350, 1500, 1200, 'ACTIVE'),
      ('STRONGHOLD-TONGGUAN', 'Bạch Mã Đạo Phỉ', 'luo_yang', 'Bạch Ba Tặc Quách Thái', 220, 800, 800, 'ACTIVE'),
      ('STRONGHOLD-TAISHAN', 'Thái Sơn Tặc Doanh', 'ping_yuan', 'Tang Bá & Ngô Đôn', 280, 1100, 1000, 'ACTIVE');
    `;
    this.db.execute(sql);
  }

  private seedInitialCaravans(): void {
    const sql = `
      INSERT OR REPLACE INTO trade_caravans (caravan_id, caravan_name, owner_faction_id, from_settlement_id, to_settlement_id, cargo_item_code, cargo_quantity, cargo_value_qian, guard_troops, route_progress, status, created_turn) VALUES
      ('CARAVAN-01', 'Hà Bắc Lương Đội (Ký Châu -> Trác Huyện)', 'FAC-YUAN-SHAO', 'ye_cheng', 'zhuo_xian', 'COM-GRAIN', 15.0, 1500, 45, 0.45, 'EN_ROUTE', 6),
      ('CARAVAN-02', 'Lương Thị Bảo Tiêu Thương Đội (Trác Huyện -> Bắc Bình)', 'FAC-LIANG-CLAN', 'zhuo_xian', 'ji_cheng', 'PROD-SHIELD-BAM', 12.0, 1080, 30, 0.25, 'EN_ROUTE', 6),
      ('CARAVAN-03', 'Thanh Châu Diêm Thương (Bình Nguyên -> Lạc Dương)', 'FAC-HAN', 'ping_yuan', 'luo_yang', 'COM-SALT-SEA', 25.0, 1800, 50, 0.60, 'EN_ROUTE', 6);
    `;
    this.db.execute(sql);
  }

  private seedBaselineCrises(): void {
    const sql = `
      INSERT OR REPLACE INTO regional_ecological_crises (crisis_id, settlement_id, crisis_type, severity_level, duration_turns_left, agriculture_penalty, public_order_penalty, grain_price_multiplier, is_active, title_vi, narrative_vi) VALUES
      ('CRISIS-184-YE', 'ye_cheng', 'GREAT_DROUGHT', 1.5, 3, 0.5, 25, 2.5, 1, 'Đại Hạn Hán Hà Bắc Thiêu Đốt Cánh Đồng Ký Châu', 'Nắng hạn kéo dài 4 tháng không một giọt mưa, lòng sông cạn trơ đáy bùn nứt nẻ. Sản lượng lúa mì Ký Châu sụt giảm một nửa, giá lương tăng vọt, lưu dân bắt đầu lũ lượt kéo về hướng Nam.'),
      ('CRISIS-184-GZ', 'guang_zong', 'PEASANT_REBELLION', 2.0, 4, 0.7, 40, 3.0, 1, 'Cuồng Triều Khăn Vàng Nổi Dậy Chiếm Đóng Kho Lương', 'Nạn đói cùng cực kích phát tín đồ Thái Bình Đạo vùng Cự Lộc đồng loạt vũ trang khởi nghĩa, cướp bóc kho lương quan phủ và bao vây các thành trì lân cận.');
    `;
    this.db.execute(sql);
  }

  /**
   * Retrieves all active ecological crises and environmental status
   */
  public getCrises(activeOnly = true): EcologicalCrisis[] {
    const filter = activeOnly ? `WHERE is_active = ?` : '';
    const params = activeOnly ? [1] : [];
    const sql = `
      SELECT 
        crisis_id as crisisId,
        settlement_id as settlementId,
        crisis_type as crisisType,
        severity_level as severityLevel,
        duration_turns_left as durationTurnsLeft,
        agriculture_penalty as agriculturePenalty,
        public_order_penalty as publicOrderPenalty,
        grain_price_multiplier as grainPriceMultiplier,
        is_active as isActive,
        title_vi as titleVi,
        narrative_vi as narrativeVi
      FROM regional_ecological_crises
      ${filter}
      ORDER BY severity_level DESC;
    `;
    const rows = this.db.query<any>(sql, params);
    return rows.map(r => ({
      ...r,
      isActive: Boolean(r.isActive)
    }));
  }

  /**
   * Retrieves all running trade caravans on the map
   */
  public getCaravans(): TradeCaravan[] {
    const sql = `
      SELECT 
        c.caravan_id as caravanId,
        c.caravan_name as caravanName,
        c.owner_faction_id as ownerFactionId,
        sf.name_vi as ownerFactionName,
        c.from_settlement_id as fromSettlementId,
        sf_from.name_vi as fromSettlementName,
        c.to_settlement_id as toSettlementId,
        sf_to.name_vi as toSettlementName,
        c.cargo_item_code as cargoItemCode,
        mi.name_vi as cargoItemName,
        c.cargo_quantity as cargoQuantity,
        c.cargo_value_qian as cargoValueQian,
        c.guard_troops as guardTroops,
        c.route_progress as routeProgress,
        c.status,
        c.created_turn as createdTurn
      FROM trade_caravans c
      JOIN session_factions sf ON c.owner_faction_id = sf.faction_id
      LEFT JOIN session_settlements sf_from ON c.from_settlement_id = sf_from.settlement_id
      LEFT JOIN session_settlements sf_to ON c.to_settlement_id = sf_to.settlement_id
      LEFT JOIN master_items mi ON c.cargo_item_code = mi.item_code
      ORDER BY c.status, c.route_progress DESC;
    `;
    return this.db.query<TradeCaravan>(sql);
  }

  /**
   * Retrieves bandit strongholds and bounties
   */
  public getBanditStrongholds(): BanditStronghold[] {
    const sql = `
      SELECT 
        stronghold_id as strongholdId,
        name_vi as nameVi,
        location_near as locationNear,
        bandit_chief_name as banditChiefName,
        bandit_power as banditPower,
        plundered_wealth as plunderedWealth,
        bounty_reward as bountyReward,
        status
      FROM bandit_strongholds
      ORDER BY status ASC, plundered_wealth DESC;
    `;
    return this.db.query<BanditStronghold>(sql);
  }

  /**
   * Action: Dispatch Grain Relief to quell crisis and peasant uprising
   */
  public dispatchGrainRelief(settlementId: string, grainAmount = 5.0, turnNumber = 6, gameDate = '184-05-01'): any {
    const crisis = this.db.queryOne<any>(
      `SELECT * FROM regional_ecological_crises WHERE settlement_id = ? AND is_active = 1;`,
      [settlementId]
    );

    if (!crisis) {
      throw new Error(`Quận huyện ${settlementId} hiện tại không có thiên tai hay nạn đói bùng phát.`);
    }

    // Verify player has strategic grain in player_state or inventory
    const player = this.db.queryOne<any>(
      `SELECT liquid_cash, strategic_grain FROM player_state WHERE player_id = 'PLY-0001';`
    );
    if (!player || player.strategic_grain < grainAmount) {
      throw new Error(`Kho lương thảo chiến lược của bạn không đủ ${grainAmount} thạch để phát chẩn.`);
    }

    let resolved = false;
    this.db.transaction(() => {
      // Deduct grain from player
      this.db.execute(
        `UPDATE player_state SET strategic_grain = strategic_grain - ? WHERE player_id = 'PLY-0001';`,
        [grainAmount]
      );

      // Restore settlement public order and reduce crisis duration
      this.db.execute(
        `UPDATE session_settlements SET public_order = MIN(100, public_order + 35) WHERE settlement_id = ?;`,
        [settlementId]
      );

      this.db.execute(
        `UPDATE regional_ecological_crises SET duration_turns_left = MAX(0, duration_turns_left - 2) WHERE crisis_id = ?;`,
        [crisis.crisis_id]
      );

      const updated = this.db.queryOne<any>(
        `SELECT duration_turns_left FROM regional_ecological_crises WHERE crisis_id = ?;`,
        [crisis.crisis_id]
      );
      if (updated && updated.duration_turns_left <= 0) {
        this.db.execute(
          `UPDATE regional_ecological_crises SET is_active = 0 WHERE crisis_id = ?;`,
          [crisis.crisis_id]
        );
        resolved = true;
      }
    });

    // Sync projection to progress.md
    try {
      const rootDir = path.resolve(__dirname, '../../..');
      execSync(`node "${path.join(rootDir, 'tools', 'sim-db.js')}" export-progress`, { stdio: 'ignore' });
    } catch (e) {}

    return {
      success: true,
      settlementId,
      grainAmount,
      orderBoost: 35,
      resolved,
      message: `Đã mở kho phát chẩn ${grainAmount} thạch lương thảo cứu đói vạn dân tại ${settlementId}! Lòng dân hoan hỉ, trị an +35 điểm${resolved ? ' (Thiên tai đã được dập tắt hoàn toàn).' : '.'}`
    };
  }

  /**
   * Action: Attack Bandit Stronghold to recover plundered goods and claim bounty
   */
  public attackBanditStronghold(characterId = 'PLY-0001', strongholdId: string, turnNumber = 6, gameDate = '184-05-01'): any {
    const stronghold = this.db.queryOne<any>(
      `SELECT * FROM bandit_strongholds WHERE stronghold_id = ?;`,
      [strongholdId]
    );
    if (!stronghold) {
      throw new Error(`Sơn trại ${strongholdId} không tồn tại.`);
    }
    if (stronghold.status === 'SUBDUED') {
      throw new Error(`Sơn trại này đã bị dẹp tan từ trước.`);
    }

    // Player martial prowess calculation
    const player = this.db.queryOne<any>(
      `SELECT war_attr, ldr_attr, health, fatigue, liquid_cash FROM player_state WHERE player_id = ?;`,
      [characterId]
    );
    if (!player) {
      throw new Error(`Nhân vật ${characterId} không tồn tại.`);
    }
    if (player.fatigue > 75) {
      throw new Error(`Thể lực quá mỏi mệt (${player.fatigue}/100), không thể thống lĩnh binh mã công sơn kích trại!`);
    }

    const combatScore = (player.war_attr * 1.5 + player.ldr_attr * 1.2) + Math.random() * 50;
    const isVictory = combatScore >= stronghold.bandit_power;

    if (isVictory) {
      const lootCash = stronghold.plundered_wealth;
      const bounty = stronghold.bounty_reward;
      const totalReward = lootCash + bounty;

      // Update player cash and fatigue
      this.db.transaction(() => {
        this.db.execute(
          `UPDATE player_state SET liquid_cash = liquid_cash + ?, fatigue = MIN(100, fatigue + 30) WHERE player_id = ?;`,
          [totalReward, characterId]
        );

        this.db.execute(
          `UPDATE bandit_strongholds SET status = 'SUBDUED', plundered_wealth = 0 WHERE stronghold_id = ?;`,
          [strongholdId]
        );
      });

      // Sync projection
      try {
        const rootDir = path.resolve(__dirname, '../../..');
        execSync(`node "${path.join(rootDir, 'tools', 'sim-db.js')}" export-progress`, { stdio: 'ignore' });
      } catch (e) {}

      return {
        success: true,
        strongholdId,
        strongholdName: stronghold.name_vi,
        bounty,
        lootCash,
        totalReward,
        message: `Đại thắng! Thống lĩnh quân sĩ phá tan ${stronghold.name_vi}, trảm tướng cướp ${stronghold.bandit_chief_name}, thu hồi ${lootCash} tiền của thương đoàn bị cướp và lĩnh thưởng ${bounty} tiền quân công triều đình!`
      };
    } else {
      this.db.execute(
        `UPDATE player_state SET health = MAX(30, health - 20), fatigue = MIN(100, fatigue + 40) WHERE player_id = ?;`,
        [characterId]
      );

      return {
        success: false,
        strongholdId,
        strongholdName: stronghold.name_vi,
        message: `Công trại thất bại! Địa hình hiểm trở cạm bẫy trùng điệp, quân sĩ bị phục kích tổn thất, Lương Diễn phải rút lui (-20 Khí huyết, +40 Mệt mỏi).`
      };
    }
  }

  /**
   * Simulates monthly/turn cycle for Ecology & Macro Logistics Caravans
   */
  public simulateEcologyAndLogisticsTurn(turnNumber: number, gameDate: string): any {
    const events: string[] = [];

    // 1. Advance Caravans
    const activeCaravans = this.db.query<any>(`SELECT * FROM trade_caravans WHERE status = 'EN_ROUTE';`);
    for (const car of activeCaravans) {
      const newProgress = Math.min(1.0, Math.round((car.route_progress + 0.35) * 100) / 100);

      // Ambush check at midway (0.4 to 0.7)
      if (newProgress >= 0.4 && newProgress <= 0.7 && Math.random() < 0.30) {
        // Find nearest active bandit stronghold
        const stronghold = this.db.queryOne<any>(`SELECT * FROM bandit_strongholds WHERE status = 'ACTIVE' LIMIT 1;`);
        if (stronghold && stronghold.bandit_power > car.guard_troops * 2) {
          // Caravan Plundered!
          this.db.transaction(() => {
            this.db.execute(
              `UPDATE trade_caravans SET status = 'PLUNDERED', updated_at = CURRENT_TIMESTAMP WHERE caravan_id = ?;`,
              [car.caravan_id]
            );
            this.db.execute(
              `UPDATE bandit_strongholds SET plundered_wealth = plundered_wealth + ? WHERE stronghold_id = ?;`,
              [car.cargo_value_qian, stronghold.stronghold_id]
            );
          });

          events.push(`[CẢNH BÁO] ${car.caravan_name} đã bị ${stronghold.name_vi} mai phục cướp sạch hàng hóa trị giá ${car.cargo_value_qian} tiền!`);
          continue;
        }
      }

      if (newProgress >= 1.0) {
        // Arrived and traded successfully!
        this.db.transaction(() => {
          this.db.execute(
            `UPDATE trade_caravans SET status = 'SUCCESS_TRADED', route_progress = 1.0, updated_at = CURRENT_TIMESTAMP WHERE caravan_id = ?;`,
            [car.caravan_id]
          );
          this.db.execute(
            `UPDATE session_factions SET treasury_cash = treasury_cash + ? WHERE faction_id = ?;`,
            [Math.round(car.cargo_value_qian * 1.35), car.owner_faction_id]
          );
        });

        events.push(`[CẬP BẾN] ${car.caravan_name} đã cập bến an toàn, xuất bán toàn bộ hàng hóa thu lãi +${Math.round(car.cargo_value_qian * 0.35)} tiền!`);
      } else {
        this.db.execute(
          `UPDATE trade_caravans SET route_progress = ?, updated_at = CURRENT_TIMESTAMP WHERE caravan_id = ?;`,
          [newProgress, car.caravan_id]
        );
      }
    }

    // 2. Tick Ecological Crises
    const crises = this.db.query<any>(`SELECT * FROM regional_ecological_crises WHERE is_active = 1;`);
    for (const c of crises) {
      const remainingTurns = c.duration_turns_left - 1;
      if (remainingTurns <= 0) {
        this.db.execute(
          `UPDATE regional_ecological_crises SET is_active = 0, duration_turns_left = 0 WHERE crisis_id = ?;`,
          [c.crisis_id]
        );
        events.push(`[THỜI TIẾT] Thiên tai tại ${c.settlement_id} (${c.title_vi}) đã qua đi, đất đai hồi sinh.`);
      } else {
        this.db.execute(
          `UPDATE regional_ecological_crises SET duration_turns_left = ? WHERE crisis_id = ?;`,
          [remainingTurns, c.crisis_id]
        );
      }
    }

    return {
      turnNumber,
      gameDate,
      processedCaravans: activeCaravans.length,
      events
    };
  }
}
