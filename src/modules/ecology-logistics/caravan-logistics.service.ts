/**
 * ThreeKingdoms-AgentEngine: Caravan Logistics & Inter-City Trade Service
 * (src/modules/ecology-logistics/caravan-logistics.service.ts)
 *
 * Implements physical caravan dispatching, route transit progression,
 * chokepoint bandit ambushes and combat resolutions, double-entry financial journaling,
 * and caravan liquidation upon arrival.
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import path from 'path';
import { execSync } from 'child_process';
import { DatabaseService } from '../../core/database';
import {
  RegionalMarketService,
  calculateDistanceLi,
  SETTLEMENT_PROFILES
} from '../economy/regional-market.service';
import { ProgressionExpService } from '../progression/attribute-progression.service';
import { CaravanStatus } from '../../core/types';

export type GuardTier = 'MILITIA' | 'VETERAN' | 'ELITE_RETINUE';

export interface GuardTierConfig {
  tier: GuardTier;
  nameVi: string;
  troops: number;
  costQian: number;
}

export const GUARD_TIER_CONFIGS: Record<GuardTier, GuardTierConfig> = {
  MILITIA: {
    tier: 'MILITIA',
    nameVi: 'Dân Dũng Hộ Vệ (10 Dũng)',
    troops: 10,
    costQian: 100
  },
  VETERAN: {
    tier: 'VETERAN',
    nameVi: 'Thiện Chiến Du Binh (25 Binh)',
    troops: 25,
    costQian: 250
  },
  ELITE_RETINUE: {
    tier: 'ELITE_RETINUE',
    nameVi: 'Tinh Nhuệ Gia Binh (40 Giáp)',
    troops: 40,
    costQian: 500
  }
};

export interface CaravanDispatchInput {
  cargoItemCode: string;
  cargoQuantity: number;
  fromSettlementId: string;
  toSettlementId: string;
  guardTier: GuardTier;
}

export interface CaravanEncounterEvent {
  caravanId: string;
  caravanName: string;
  strongholdId: string;
  strongholdNameVi: string;
  isVictory: boolean;
  ldrExpGained?: number;
  cargoPlundered?: number;
  valueLost?: number;
  narrativeVi: string;
}

export interface TickCaravansResult {
  tickedCaravansCount: number;
  arrivedCaravansCount: number;
  encounters: CaravanEncounterEvent[];
  updatedCaravans: Array<{
    caravanId: string;
    caravanName: string;
    routeProgress: number;
    status: CaravanStatus;
  }>;
}

export interface ClaimCaravanResult {
  success: boolean;
  caravanId: string;
  caravanName: string;
  destinationSettlementId: string;
  destinationSettlementNameVi: string;
  cargoItemCode: string;
  cargoItemNameVi: string;
  soldQuantity: number;
  unitPrice: number;
  grossRevenue: number;
  initialValue: number;
  netProfit: number;
  comExpAwarded: number;
  ldrExpAwarded: number;
  expGained?: number;
  newLiquidCash: number;
  message: string;
}

export class CaravanLogisticsService {
  private static instance: CaravanLogisticsService | null = null;
  private db: DatabaseService;
  private regionalMarket: RegionalMarketService;

  public constructor(dbService?: DatabaseService, marketService?: RegionalMarketService) {
    this.db = dbService || DatabaseService.getInstance();
    this.regionalMarket = marketService || RegionalMarketService.getInstance(this.db);
  }

  public static getInstance(
    dbService?: DatabaseService,
    marketService?: RegionalMarketService
  ): CaravanLogisticsService {
    if (!CaravanLogisticsService.instance) {
      CaravanLogisticsService.instance = new CaravanLogisticsService(dbService, marketService);
    }
    return CaravanLogisticsService.instance;
  }

  public static resetInstance(): void {
    CaravanLogisticsService.instance = null;
  }

  private getCampaignMeta(): { activeTurn: number; currentDate: string; campaignId: string } {
    try {
      const row = this.db.queryOne<any>(
        'SELECT campaign_id, active_turn, campaign_meta.current_date as current_date FROM campaign_meta LIMIT 1;'
      );
      if (row) {
        return {
          campaignId: row.campaign_id || 'CMP-184-ZHOU-01',
          activeTurn: Number(row.active_turn) || 6,
          currentDate: row.current_date || '184-05-02'
        };
      }
    } catch {}
    return { campaignId: 'CMP-184-ZHOU-01', activeTurn: 6, currentDate: '184-05-02' };
  }

  /**
   * Dispatches a merchant caravan loaded with inventory cargo and protected by hired guards.
   */
  public dispatchCaravan(input: CaravanDispatchInput, playerId = 'PLY-0001'): any {
    const { cargoItemCode, cargoQuantity, fromSettlementId, toSettlementId, guardTier } = input;

    if (!cargoItemCode || !cargoQuantity || cargoQuantity <= 0) {
      throw new Error('Hàng hóa và số lượng hợp lệ (> 0) là bắt buộc.');
    }
    if (!fromSettlementId || !toSettlementId) {
      throw new Error('Cần xác định điểm xuất phát và điểm đến của thương đoàn.');
    }
    if (fromSettlementId === toSettlementId) {
      throw new Error('Điểm đến không được trùng với điểm xuất phát thương đoàn.');
    }
    const guardConfig = GUARD_TIER_CONFIGS[guardTier];
    if (!guardConfig) {
      throw new Error(`Cấp độ hộ vệ "${guardTier}" không hợp lệ. Chọn MILITIA, VETERAN, hoặc ELITE_RETINUE.`);
    }

    const fromProfile = SETTLEMENT_PROFILES[fromSettlementId];
    const toProfile = SETTLEMENT_PROFILES[toSettlementId];
    if (!fromProfile || !toProfile) {
      throw new Error(`Điểm đi hoặc điểm đến không tồn tại trong danh mục thành trì.`);
    }

    const item = this.db.queryOne<any>(
      'SELECT item_code, name_vi, category, baseline_peace_price FROM master_items WHERE item_code = ?;',
      [cargoItemCode]
    );
    if (!item) {
      throw new Error(`Mã hàng hóa "${cargoItemCode}" không tồn tại trong kho master.`);
    }

    const meta = this.getCampaignMeta();
    const effectiveDate = meta.currentDate;
    const distanceLi = calculateDistanceLi(fromSettlementId, toSettlementId);

    const result = this.db.transaction(() => {
      // 1. Verify player stock in inventory_items
      const stock = this.db.queryOne<{ quantity: number; unit_cost_basis: number }>(
        'SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = ?;',
        [cargoItemCode]
      );
      if (!stock || stock.quantity < cargoQuantity) {
        throw new Error(
          `Kho hàng không đủ tồn kho mặt hàng ${item.name_vi} (Hiện có: ${stock?.quantity || 0}, Cần xuất: ${cargoQuantity}).`
        );
      }

      // 2. Verify player cash for guard hire fee
      const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number; name: string }>(
        'SELECT liquid_cash, safe_cash, name FROM player_state WHERE player_id = ?;',
        [playerId]
      );
      if (!player) {
        throw new Error(`Không tìm thấy dữ liệu người chơi ${playerId}.`);
      }
      if (player.liquid_cash < guardConfig.costQian) {
        throw new Error(
          `Ngân lượng không đủ thuê hộ vệ ${guardConfig.nameVi} (Hiện có: ${player.liquid_cash} Qian, Chi phí: ${guardConfig.costQian} Qian).`
        );
      }

      // 3. Deduct stock from inventory_items
      const newStockQty = stock.quantity - cargoQuantity;
      this.db.execute(
        'UPDATE inventory_items SET quantity = ? WHERE item_code = ?;',
        [newStockQty, cargoItemCode]
      );

      const txnId = `TXN-LOG-${Date.now().toString().slice(-6)}`;
      const movId = `MOV-CRV-${Date.now().toString().slice(-6)}`;

      // 4. Log stock movement
      this.db.execute(
        `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
         VALUES (?, ?, ?, 'CARAVAN_DISPATCH', ?, ?, ?, ?);`,
        [movId, effectiveDate, cargoItemCode, -cargoQuantity, stock.unit_cost_basis || item.baseline_peace_price, newStockQty, txnId]
      );

      // 5. Deduct guard fee from liquid_cash
      const newCashBalance = player.liquid_cash - guardConfig.costQian;
      const totalLedgerBalance = newCashBalance + Number(player.safe_cash || 0);
      this.db.execute(
        'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
        [newCashBalance, playerId]
      );

      // 6. Log cashflow ledger (tracks total player capital including safe_cash)
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
         VALUES (?, ?, ?, 'Logistics/GuardFee', 0, ?, ?, ?, 'Confirmed');`,
        [
          txnId,
          effectiveDate,
          `Bảo Tiêu Doanh ${fromProfile.nameVi}`,
          guardConfig.costQian,
          totalLedgerBalance,
          `Thuê ${guardConfig.nameVi} áp tải thương đoàn sang ${toProfile.nameVi}`
        ]
      );

      // 7. Double-entry accounting journal
      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '6001_OPERATING_EXPENSE', ?, 0, ?);`,
        [txnId, meta.campaignId, effectiveDate, guardConfig.costQian, `Chi phí thuê hộ vệ thương đoàn ${guardTier}`]
      );
      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '1001_CASH_MOBILE', 0, ?, ?);`,
        [txnId, meta.campaignId, effectiveDate, guardConfig.costQian, `Thanh toán ngân lượng bảo tiêu thương đoàn`]
      );

      // 8. Compute destination price & initial cargo value
      const destPrice = this.regionalMarket.calculateSettlementPrice(toSettlementId, cargoItemCode);
      const expectedRevenue = Math.round(cargoQuantity * destPrice);
      const cargoValueQian = Math.round(cargoQuantity * (stock.unit_cost_basis || item.baseline_peace_price));

      // 9. Generate Caravan record
      const caravanId = `CRV-${Date.now().toString().slice(-6)}`;
      const caravanName = `Lương Thị Thương Đội (${fromProfile.nameVi} → ${toProfile.nameVi})`;
      const ownerFactionId = 'FAC-LIANG-CLAN';

      this.db.execute(
        `INSERT INTO trade_caravans (
          caravan_id, caravan_name, owner_faction_id, from_settlement_id, to_settlement_id,
          cargo_item_code, cargo_quantity, cargo_value_qian, guard_troops, route_progress,
          status, created_turn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 'EN_ROUTE', ?);`,
        [
          caravanId,
          caravanName,
          ownerFactionId,
          fromSettlementId,
          toSettlementId,
          cargoItemCode,
          cargoQuantity,
          cargoValueQian,
          guardConfig.troops,
          meta.activeTurn
        ]
      );

      return {
        caravanId,
        caravanName,
        fromSettlementId,
        fromSettlementNameVi: fromProfile.nameVi,
        toSettlementId,
        toSettlementNameVi: toProfile.nameVi,
        cargoItemCode,
        cargoItemNameVi: item.name_vi,
        cargoQuantity,
        cargoCostBasis: cargoValueQian,
        expectedDestinationUnitPrice: destPrice,
        expectedRevenue,
        distanceLi,
        guardTier,
        guardTroops: guardConfig.troops,
        guardFee: guardConfig.costQian,
        remainingStock: newStockQty,
        newLiquidCash: newCashBalance,
        status: 'EN_ROUTE',
        message: `Đã phái xuất ${caravanName} khởi hành! Áp tải ${cargoQuantity} ${item.name_vi}, hộ vệ ${guardConfig.troops} binh mã. Khoảng cách: ${distanceLi} dặm.`
      };
    });

    // Keep PROGRESS.md synchronized
    try {
      const rootDir = process.cwd();
      execSync(`node "${path.join(rootDir, 'tools', 'sim-db.js')}" export-progress`, {
        stdio: 'ignore'
      });
    } catch {}

    return result;
  }

  /**
   * Advances active trade caravans along their routes.
   * Checks for proximity to active bandit strongholds and simulates skirmishes.
   */
  public tickCaravans(): TickCaravansResult {
    const activeCaravans = this.db.query<any>(
      `SELECT * FROM trade_caravans WHERE status = 'EN_ROUTE';`
    );

    const strongholds = this.db.query<any>(
      `SELECT * FROM bandit_strongholds WHERE status = 'ACTIVE';`
    );

    const encounters: CaravanEncounterEvent[] = [];
    const updatedCaravans: Array<{
      caravanId: string;
      caravanName: string;
      routeProgress: number;
      status: CaravanStatus;
    }> = [];

    let arrivedCount = 0;

    for (const caravan of activeCaravans) {
      const distanceLi = calculateDistanceLi(caravan.from_settlement_id, caravan.to_settlement_id);
      // Speed scales inversely with distance, minimum 0.20 per tick
      const speed = Math.max(0.20, Math.round((80 / distanceLi) * 100) / 100);
      let newProgress = Math.min(1.0, Math.round((caravan.route_progress + speed) * 100) / 100);
      let currentStatus: CaravanStatus = 'EN_ROUTE';

      // Check bandit stronghold encounter
      // Triggered once mid-transit as caravan crosses through contested territory (around halfway mark)
      const crossedMidpoint = caravan.route_progress < 0.5 && newProgress >= 0.5;
      if (crossedMidpoint) {
        const dangerousStronghold = strongholds.find((sh) => {
          return (
            caravan.from_settlement_id === sh.location_near ||
            caravan.to_settlement_id === sh.location_near ||
            sh.location_near === 'ye_cheng' ||
            sh.location_near === 'luo_yang' ||
            sh.location_near === 'ping_yuan'
          );
        });

        if (dangerousStronghold) {
          const banditPower = Number(dangerousStronghold.bandit_power) || 200;
          const combatThreshold = Math.floor(banditPower / 2);
          const guards = Number(caravan.guard_troops) || 0;

          if (guards >= combatThreshold) {
            // Victory: Repelled the bandits!
            const ldrExp = 15;
            ProgressionExpService.awardAttributeExp('PLY-0001', 'ldr', ldrExp);

            encounters.push({
              caravanId: caravan.caravan_id,
              caravanName: caravan.caravan_name,
              strongholdId: dangerousStronghold.stronghold_id,
              strongholdNameVi: dangerousStronghold.name_vi,
              isVictory: true,
              ldrExpGained: ldrExp,
              narrativeVi: `Thương đoàn ${caravan.caravan_name} chạm trán toán thảo khấu thuộc ${dangerousStronghold.name_vi} (${dangerousStronghold.bandit_chief_name}). Nhờ hộ vệ tinh nhuệ (${guards} quân vs ngưỡng ${combatThreshold}), thương đoàn đã kích thoái giặc cướp thành công (+${ldrExp} LDR EXP)!`
            });
          } else {
            // Defeat: Ambushed and 20% cargo plundered!
            const plunderQty = Math.round(Number(caravan.cargo_quantity) * 0.20 * 100) / 100;
            const remainingQty = Math.max(0.1, Number(caravan.cargo_quantity) - plunderQty);
            const valueLost = Math.round(Number(caravan.cargo_value_qian) * 0.20);
            const remainingValue = Math.max(0, Number(caravan.cargo_value_qian) - valueLost);

            this.db.execute(
              `UPDATE trade_caravans 
               SET cargo_quantity = ?, cargo_value_qian = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE caravan_id = ?;`,
              [remainingQty, remainingValue, caravan.caravan_id]
            );

            this.db.execute(
              `UPDATE bandit_strongholds 
               SET plundered_wealth = plundered_wealth + ? 
               WHERE stronghold_id = ?;`,
              [valueLost, dangerousStronghold.stronghold_id]
            );

            encounters.push({
              caravanId: caravan.caravan_id,
              caravanName: caravan.caravan_name,
              strongholdId: dangerousStronghold.stronghold_id,
              strongholdNameVi: dangerousStronghold.name_vi,
              isVictory: false,
              cargoPlundered: plunderQty,
              valueLost,
              narrativeVi: `Thương đoàn ${caravan.caravan_name} bị đạo tặc ${dangerousStronghold.name_vi} phục kích chớp nhoáng! Lực lượng hộ vệ (${guards} quân) quá mỏng, bị cướp đoạt 20% hàng hóa (-${plunderQty} hàng, -${valueLost} Qian)!`
            });

            // Re-read updated cargo
            caravan.cargo_quantity = remainingQty;
            caravan.cargo_value_qian = remainingValue;
          }
        }
      }

      if (newProgress >= 1.0) {
        newProgress = 1.0;
        currentStatus = 'ARRIVED';
        arrivedCount++;
      }

      this.db.execute(
        `UPDATE trade_caravans 
         SET route_progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE caravan_id = ?;`,
        [newProgress, currentStatus, caravan.caravan_id]
      );

      updatedCaravans.push({
        caravanId: caravan.caravan_id,
        caravanName: caravan.caravan_name,
        routeProgress: newProgress,
        status: currentStatus
      });
    }

    return {
      tickedCaravansCount: activeCaravans.length,
      arrivedCaravansCount: arrivedCount,
      encounters,
      updatedCaravans
    };
  }

  /**
   * Liquidates arrived caravan cargo at the destination regional market price,
   * credits player liquid cash, posts double-entry accounting journals, and awards EXP.
   */
  public claimCaravan(caravanId: string, playerId = 'PLY-0001'): ClaimCaravanResult {
    const caravan = this.db.queryOne<any>(
      'SELECT * FROM trade_caravans WHERE caravan_id = ?;',
      [caravanId]
    );

    if (!caravan) {
      throw new Error(`Thương đoàn "${caravanId}" không tồn tại trong hệ thống.`);
    }

    if (caravan.status === 'COMPLETED') {
      throw new Error(`Thương đoàn "${caravan.caravan_name}" đã thanh lý quyết toán từ trước.`);
    }

    if (caravan.status !== 'ARRIVED' && caravan.status !== 'SUCCESS_TRADED') {
      throw new Error(
        `Thương đoàn "${caravan.caravan_name}" đang trên đường đi (Tiến độ: ${Math.round(caravan.route_progress * 100)}%), chưa đến nơi để quyết toán xuất bán.`
      );
    }

    const item = this.db.queryOne<any>(
      'SELECT name_vi, baseline_peace_price FROM master_items WHERE item_code = ?;',
      [caravan.cargo_item_code]
    );
    const itemNameVi = item?.name_vi || caravan.cargo_item_code;
    const destProfile = SETTLEMENT_PROFILES[caravan.to_settlement_id];
    const destNameVi = destProfile?.nameVi || caravan.to_settlement_id;

    // 1. Calculate destination market price
    const destUnitPrice = this.regionalMarket.calculateSettlementPrice(
      caravan.to_settlement_id,
      caravan.cargo_item_code
    );
    const grossRevenue = Math.round(Number(caravan.cargo_quantity) * destUnitPrice);
    const initialCostBasis = Number(caravan.cargo_value_qian) || 0;
    const netProfit = Math.max(0, grossRevenue - initialCostBasis);

    const meta = this.getCampaignMeta();
    const effectiveDate = meta.currentDate;
    const txnId = `TXN-REV-${Date.now().toString().slice(-6)}`;

    // 2. Perform ACID settlement claim
    const finalResult = this.db.transaction(() => {
      const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
        'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?;',
        [playerId]
      );
      if (!player) {
        throw new Error(`Không tìm thấy nhân vật người chơi ${playerId}.`);
      }

      const newLiquidCash = player.liquid_cash + grossRevenue;
      const totalLedgerBalance = newLiquidCash + Number(player.safe_cash || 0);

      // Update player cash
      this.db.execute(
        'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
        [newLiquidCash, playerId]
      );

      // Log cashflow ledger (tracks total player capital including safe_cash)
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
         VALUES (?, ?, ?, 'Trade/CaravanRevenue', ?, 0, ?, ?, 'Confirmed');`,
        [
          txnId,
          effectiveDate,
          `Thương Điếm ${destNameVi}`,
          grossRevenue,
          totalLedgerBalance,
          `Thanh lý thương đoàn ${caravan.caravan_name} tại ${destNameVi} (${caravan.cargo_quantity} ${itemNameVi})`
        ]
      );

      // Double-entry accounting journal
      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '1001_CASH_MOBILE', ?, 0, ?);`,
        [txnId, meta.campaignId, effectiveDate, grossRevenue, `Thu tiền xuất bán hàng hóa thương đoàn`]
      );
      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '5001_SALES_REVENUE', 0, ?, ?);`,
        [txnId, meta.campaignId, effectiveDate, grossRevenue, `Doanh thu bán hàng liên thành ${destNameVi}`]
      );

      // Award Progression EXP
      // COM EXP = Math.round(netProfit * 0.05), minimum 10
      const comExp = Math.max(10, Math.round(netProfit * 0.05));
      const ldrExp = 20;

      ProgressionExpService.awardAttributeExp(playerId, 'com', comExp);
      ProgressionExpService.awardAttributeExp(playerId, 'ldr', ldrExp);

      // Update caravan status to COMPLETED
      this.db.execute(
        `UPDATE trade_caravans 
         SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
         WHERE caravan_id = ?;`,
        [caravanId]
      );

      return {
        newLiquidCash,
        comExp,
        ldrExp
      };
    });

    // 3. Keep PROGRESS.md synchronized
    try {
      const rootDir = process.cwd();
      execSync(`node "${path.join(rootDir, 'tools', 'sim-db.js')}" export-progress`, {
        stdio: 'ignore'
      });
    } catch {}

    return {
      success: true,
      caravanId,
      caravanName: caravan.caravan_name,
      destinationSettlementId: caravan.to_settlement_id,
      destinationSettlementNameVi: destNameVi,
      cargoItemCode: caravan.cargo_item_code,
      cargoItemNameVi: itemNameVi,
      soldQuantity: Number(caravan.cargo_quantity),
      unitPrice: destUnitPrice,
      grossRevenue,
      initialValue: initialCostBasis,
      netProfit,
      comExpAwarded: finalResult.comExp,
      ldrExpAwarded: finalResult.ldrExp,
      expGained: finalResult.comExp,
      newLiquidCash: finalResult.newLiquidCash,
      message: `Quyết toán ${caravan.caravan_name} thành công! Xuất bán ${caravan.cargo_quantity} ${itemNameVi} tại ${destNameVi} với giá ${destUnitPrice} Qian/đơn vị. Thu về ${grossRevenue} Qian (Lãi ròng: +${netProfit} Qian, +${finalResult.comExp} COM EXP, +${finalResult.ldrExp} LDR EXP).`
    };
  }

  /**
   * Retrieves all caravans owned by the player faction.
   */
  public getPlayerCaravans(playerId = 'PLY-0001'): any[] {
    const sql = `
      SELECT 
        c.caravan_id as caravanId,
        c.caravan_name as caravanName,
        c.owner_faction_id as ownerFactionId,
        c.from_settlement_id as fromSettlementId,
        sf_from.name_vi as fromSettlementNameVi,
        c.to_settlement_id as toSettlementId,
        sf_to.name_vi as toSettlementNameVi,
        c.cargo_item_code as cargoItemCode,
        mi.name_vi as cargoItemNameVi,
        c.cargo_quantity as cargoQuantity,
        c.cargo_value_qian as cargoValueQian,
        c.guard_troops as guardTroops,
        c.route_progress as routeProgress,
        c.status,
        c.created_turn as createdTurn,
        c.updated_at as updatedAt
      FROM trade_caravans c
      LEFT JOIN session_settlements sf_from ON c.from_settlement_id = sf_from.settlement_id
      LEFT JOIN session_settlements sf_to ON c.to_settlement_id = sf_to.settlement_id
      LEFT JOIN master_items mi ON c.cargo_item_code = mi.item_code
      WHERE c.owner_faction_id = 'FAC-LIANG-CLAN' 
         OR c.owner_faction_id IN (SELECT faction_id FROM session_factions WHERE leader_id = ?)
      ORDER BY 
        CASE c.status 
          WHEN 'ARRIVED' THEN 1 
          WHEN 'EN_ROUTE' THEN 2 
          WHEN 'AMBUSHED_FIGHTING' THEN 3
          WHEN 'PLUNDERED' THEN 4
          ELSE 5 
        END ASC,
        c.updated_at DESC;
    `;
    return this.db.query<any>(sql, [playerId]);
  }
}
