/**
 * NPC freight contracts.
 *
 * A deficit settlement posts a contract for a surplus good; a named NPC pays
 * the reward on delivery. The cargo belongs to the issuer, so the player never
 * buys it; the player pays the escort fee and earns the freight fee.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextSequentialId } from '../../shared/id-generator';
import { postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { getMarketItem } from '../../shared/market-price-book';
import { SkillService } from '../progression/skill.service';
import { SettlementMarketService } from '../economy/settlement-market.service';
import {
  SETTLEMENT_PROFILES,
  RegionalMarketService,
  calculateDistanceLi
} from '../economy/regional-market.service';
import { GUARD_TIER_CONFIGS, CARAVAN_DAILY_LI } from '../ecology-logistics/caravan-logistics.service';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';
import { computeSpoilage, freightDiscountPct } from './spoilage';
import { addGameDays, gameDayOrdinal } from '../../shared/game-date';
import { hasProcessedDay, markProcessedDay } from '../../shared/day-ledger';

export class FreightService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): FreightService {
    return new FreightService(db);
  }

  private currentDate(): string {
    return this.db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;')?.d || '184-05-02';
  }

  private settlementLocations(settlementId: string): string[] {
    const locations: string[] = [];
    for (const [loc, node] of Object.entries(LOC_TO_NODE_MAP)) {
      if (node === settlementId) locations.push(loc);
    }
    return locations;
  }

  private guardTier(tier: string): any {
    const key = String(tier || 'VETERAN').toUpperCase() as keyof typeof GUARD_TIER_CONFIGS;
    return GUARD_TIER_CONFIGS[key] || GUARD_TIER_CONFIGS.VETERAN;
  }

  private travelDays(fromSettlement: string, toSettlement: string, ownerId: string): number {
    const distance = calculateDistanceLi(fromSettlement, toSettlement);
    let speed = 0;
    try {
      speed = Math.max(0, Math.min(0.5, SkillService.forDatabase(this.db).getEffectTotal(
        'TRAVEL_SPEED',
        ['SKL-COM-CARAVAN', 'SKL-LOG-PROV']
      )));
    } catch {
      speed = 0;
    }
    return Math.max(1, Math.ceil(distance / (CARAVAN_DAILY_LI * (1 + speed))));
  }

  public listContracts(settlementId: string, gameDate?: string): any[] {
    const date = gameDate || this.currentDate();
    this.db.execute(
      "UPDATE freight_contracts SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE status = 'OPEN' AND deadline < ?;",
      [date]
    );
    this.refresh(settlementId, date);
    return this.db.query<any>(
      "SELECT * FROM freight_contracts WHERE to_settlement_id = ? AND status = 'OPEN' ORDER BY reward_cash DESC;",
      [settlementId]
    ).map(row => this.view(row, date));
  }

  public listShipments(ownerId = 'PLY-0001'): any[] {
    return this.db.query<any>(
      `SELECT s.*, c.issuer_name_vi, c.deadline, mi.name_vi AS item_name_vi
       FROM freight_shipments s
       JOIN freight_contracts c ON c.contract_id = s.contract_id
       LEFT JOIN master_items mi ON mi.item_code = s.item_code
       WHERE s.owner_id = ? AND s.status IN ('EN_ROUTE','ARRIVED')
       ORDER BY s.created_date DESC;`,
      [ownerId]
    ).map(row => ({
      shipmentId: row.shipment_id,
      contractId: row.contract_id,
      issuerNameVi: row.issuer_name_vi,
      fromSettlementId: row.from_settlement_id,
      toSettlementId: row.to_settlement_id,
      itemCode: row.item_code,
      itemNameVi: row.item_name_vi || row.item_code,
      quantity: Number(row.quantity),
      daysRemaining: Number(row.days_remaining),
      status: row.status,
      rewardCash: Number(row.reward_cash),
      penaltyCash: Number(row.penalty_cash),
      guardTier: row.guard_tier,
      guardFee: Number(row.guard_fee),
      initialQuantity: Number(row.initial_quantity || row.quantity),
      spoiledQuantity: Number(row.spoiled_quantity || 0),
      deadline: row.deadline
    }));
  }

  private view(row: any, date: string): any {
    const distance = calculateDistanceLi(row.from_settlement_id, row.to_settlement_id);
    return {
      contractId: row.contract_id,
      issuerNpcId: row.issuer_npc_id,
      issuerNameVi: row.issuer_name_vi,
      fromSettlementId: row.from_settlement_id,
      toSettlementId: row.to_settlement_id,
      itemCode: row.item_code,
      quantity: Number(row.quantity),
      rewardCash: Number(row.reward_cash),
      penaltyCash: Number(row.penalty_cash),
      deadline: row.deadline,
      daysLeft: Math.max(0, gameDayOrdinal(row.deadline) - gameDayOrdinal(date)),
      distanceLi: distance,
      travelDays: this.travelDays(row.from_settlement_id, row.to_settlement_id, 'PLY-0001'),
      status: row.status
    };
  }

  private refresh(settlementId: string, date: string): number {
    const active = Number(this.db.queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM freight_contracts WHERE to_settlement_id = ? AND status = 'OPEN';",
      [settlementId]
    )?.c || 0);
    if (active >= 3) return 0;

    const destination = SETTLEMENT_PROFILES[settlementId];
    if (!destination) return 0;
    const locations = this.settlementLocations(settlementId);
    if (locations.length === 0) return 0;
    const placeholders = locations.map(() => '?').join(',');
    // arch-guard:allow-sql-interpolation — placeholders only, one per settlement location.
    const issuer = this.db.queryOne<any>(
      `SELECT npp.npc_id, npp.personal_cash, mc.name_vi
       FROM npc_personal_progression npp
       JOIN master_characters mc ON mc.npc_id = npp.npc_id
       WHERE mc.baseline_location IN (${placeholders})
         AND npp.npc_id <> 'PLY-0001'
         AND npp.personal_cash > 0
       ORDER BY npp.personal_cash DESC, npp.npc_id ASC
       LIMIT 1;`,
      locations
    );
    if (!issuer) return 0;

    const regional = new RegionalMarketService(this.db);
    const market = SettlementMarketService.forDatabase(this.db);
    const rng = RngService.forDomain(this.db, 'freight-contract');
    let created = 0;
    let issuerCash = Number(issuer.personal_cash);

    // Essential-consumption demand comes first: a fishing town needs fish even
    // when fish is not in its static deficit list. Structural deficits follow.
    const demandRows = this.db.query<{ item_code: string; monthly_demand: number }>(
      `SELECT item_code, monthly_demand
       FROM settlement_consumption
       WHERE settlement_id = ? AND monthly_demand > 0
       ORDER BY monthly_demand DESC, item_code ASC
       LIMIT 8;`,
      [settlementId]
    );
    const candidates: string[] = [];
    const seen = new Set<string>();
    for (const row of demandRows) {
      if (seen.has(row.item_code)) continue;
      seen.add(row.item_code);
      candidates.push(row.item_code);
    }
    for (const itemCode of destination.specialization.deficitItems) {
      if (seen.has(itemCode)) continue;
      seen.add(itemCode);
      candidates.push(itemCode);
    }

    for (const itemCode of candidates) {
      if (created >= 3 - active) break;
      const duplicate = this.db.queryOne(
        "SELECT 1 AS ok FROM freight_contracts WHERE to_settlement_id = ? AND item_code = ? AND status IN ('OPEN','ACCEPTED') LIMIT 1;",
        [settlementId, itemCode]
      );
      if (duplicate) continue;

      const item = getMarketItem(this.db, itemCode);
      if (!item) continue;
      const quantity = 5 + Math.floor(rng.nextFloat() * 8);
      const source = this.findFreightSource(itemCode, settlementId, quantity, market);
      if (!source) continue;

      const distance = calculateDistanceLi(source.settlementId, settlementId);
      const destPrice = regional.calculateSettlementPrice(settlementId, itemCode) || item.price;
      const reward = Math.max(
        20,
        Math.round(quantity * destPrice * 0.15 + distance * 0.15)
      );
      if (reward > issuerCash) continue;
      issuerCash -= reward;
      const deadline = addGameDays(date, Math.max(3, Math.ceil(distance / CARAVAN_DAILY_LI) + 3));
      const contractId = nextSequentialId(this.db, 'freight_contracts', 'FRT', date);
      this.db.execute(
        `INSERT INTO freight_contracts
          (contract_id, issuer_npc_id, issuer_name_vi, from_settlement_id, to_settlement_id,
           item_code, quantity, reward_cash, penalty_cash, deadline, status, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?);`,
        [
          contractId,
          issuer.npc_id,
          issuer.name_vi || issuer.npc_id,
          source.settlementId,
          settlementId,
          itemCode,
          quantity,
          reward,
          Math.round(reward * 0.4),
          deadline,
          date
        ]
      );
      created += 1;
    }
    return created;
  }

  /**
   * Finds a settlement with enough stock for the contract. A declared surplus
   * wins; otherwise the highest local stock (or endowment supply) can supply it.
   */
  private findFreightSource(
    itemCode: string,
    destinationId: string,
    quantity: number,
    market: SettlementMarketService
  ): { settlementId: string; stock: number } | null {
    const surplus = Object.values(SETTLEMENT_PROFILES).find(profile =>
      profile.settlementId !== destinationId
      && profile.specialization.surplusItems.includes(itemCode)
    );
    if (surplus) {
      const stock = Number(market.getState(surplus.settlementId, itemCode).stock);
      if (stock >= quantity) return { settlementId: surplus.settlementId, stock };
    }

    const rows = this.db.query<{ settlement_id: string; stock: number }>(
      `SELECT settlement_id, stock
       FROM settlement_market_state
       WHERE item_code = ? AND settlement_id <> ? AND stock >= ?
       ORDER BY stock DESC
       LIMIT 5;`,
      [itemCode, destinationId, quantity]
    );
    for (const row of rows) {
      if (!SETTLEMENT_PROFILES[row.settlement_id]) continue;
      return { settlementId: row.settlement_id, stock: Number(row.stock) };
    }

    const endowment = this.db.queryOne<{ settlement_id: string; supply_score: number }>(
      `SELECT settlement_id, supply_score
       FROM settlement_item_endowment
       WHERE item_code = ? AND settlement_id <> ? AND supply_score > 0
       ORDER BY supply_score DESC
       LIMIT 1;`,
      [itemCode, destinationId]
    );
    if (!endowment || !SETTLEMENT_PROFILES[endowment.settlement_id]) return null;
    const stock = Number(market.getState(endowment.settlement_id, itemCode).stock);
    return stock >= quantity ? { settlementId: endowment.settlement_id, stock } : null;
  }

  public accept(ownerId: string, contractId: string, guardTier: string, gameDate: string): any {
    const contract = this.db.queryOne<any>(
      "SELECT * FROM freight_contracts WHERE contract_id = ? AND status = 'OPEN' LIMIT 1;",
      [contractId]
    );
    if (!contract) throw new Error('Hợp đồng vận chuyển không còn mở.');
    if (String(contract.deadline) < gameDate) {
      this.db.execute("UPDATE freight_contracts SET status = 'EXPIRED' WHERE contract_id = ?;", [contractId]);
      throw new Error('Hợp đồng đã quá hạn.');
    }
    const guard = this.guardTier(guardTier);
    const discount = freightDiscountPct(this.db);
    const guardFee = Math.max(1, Math.round(guard.costQian * (1 - discount / 100)));
    const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
      'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
      [ownerId]
    );
    if (!player) throw new Error(`Không tìm thấy nhân vật ${ownerId}.`);
    if (Number(player.liquid_cash || 0) < guardFee) {
      throw new Error(`Cần ${guardFee} Quan phí hộ vệ ${guard.tier}.`);
    }

    const shipmentId = nextSequentialId(this.db, 'freight_shipments', 'SHP', gameDate);
    const days = this.travelDays(contract.from_settlement_id, contract.to_settlement_id, ownerId);
    const quantity = Number(contract.quantity);
    return this.db.transaction(() => {
      const market = SettlementMarketService.forDatabase(this.db);
      const source = market.getState(contract.from_settlement_id, contract.item_code);
      if (Number(source.stock) + 0.001 < quantity) {
        throw new Error(
          `Kho ${contract.from_settlement_id} chỉ còn ${source.stock} ${contract.item_code}, không đủ ${quantity} cho hợp đồng ${contractId}.`
        );
      }
      // Reserve the cargo at the source. Without this, delivery credits the
      // destination with goods that were never removed from anywhere.
      market.applyTrade(contract.from_settlement_id, contract.item_code, -quantity);

      const newLiquid = Number(player.liquid_cash || 0) - guardFee;
      this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, ownerId]);
      const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', gameDate);
      postDoubleEntry(this.db, {
        txnId,
        gameDate,
        counterparty: 'Bảo Tiêu',
        category: 'Logistics/FreightGuard',
        outflow: guardFee,
        balance: newLiquid + Number(player.safe_cash || 0),
        memo: `Thuê hộ vệ ${guard.nameVi} cho chuyến thuê ${contractId}`,
        debitAccount: ACCOUNT_CODES.operatingExpense,
        creditAccount: ACCOUNT_CODES.cashMobile
      });
      this.db.execute(
        "UPDATE freight_contracts SET status = 'ACCEPTED', accepted_by = ?, accepted_date = ?, updated_at = CURRENT_TIMESTAMP WHERE contract_id = ?;",
        [ownerId, gameDate, contractId]
      );
      this.db.execute(
        `INSERT INTO freight_shipments
          (shipment_id, contract_id, owner_id, from_settlement_id, to_settlement_id,
           item_code, quantity, days_remaining, status, reward_cash, penalty_cash,
           guard_tier, guard_fee, created_date, initial_quantity, total_days, spoiled_quantity,
           source_reserved_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EN_ROUTE', ?, ?, ?, ?, ?, ?, ?, 0, ?);`,
        [
          shipmentId,
          contractId,
          ownerId,
          contract.from_settlement_id,
          contract.to_settlement_id,
          contract.item_code,
          quantity,
          days,
          Number(contract.reward_cash),
          Number(contract.penalty_cash),
          guard.tier,
          guardFee,
          gameDate,
          quantity,
          days,
          quantity
        ]
      );
      return {
        shipmentId,
        contractId,
        fromSettlementId: contract.from_settlement_id,
        toSettlementId: contract.to_settlement_id,
        itemCode: contract.item_code,
        quantity,
        daysRemaining: days,
        rewardCash: Number(contract.reward_cash),
        guardFee,
        guardTier: guard.tier,
        deadline: contract.deadline
      };
    });
  }

  public deliver(ownerId: string, shipmentId: string, gameDate: string): any {
    const shipment = this.db.queryOne<any>(
      "SELECT * FROM freight_shipments WHERE shipment_id = ? AND owner_id = ? AND status = 'ARRIVED' LIMIT 1;",
      [shipmentId, ownerId]
    );
    if (!shipment) throw new Error('Chuyến hàng chưa đến nơi hoặc không thuộc bạn.');
    const contract = this.db.queryOne<any>(
      'SELECT * FROM freight_contracts WHERE contract_id = ? LIMIT 1;',
      [shipment.contract_id]
    );
    if (!contract) throw new Error('Hợp đồng nguồn không tồn tại.');
    if (String(contract.deadline) < gameDate) {
      this.failContract(shipment, contract, gameDate);
      throw new Error('Đã quá hạn giao hàng; hợp đồng thất bại và bị phạt.');
    }

    const issuer = this.db.queryOne<{ personal_cash: number }>(
      'SELECT personal_cash FROM npc_personal_progression WHERE npc_id = ? LIMIT 1;',
      [contract.issuer_npc_id]
    );
    const initialQuantity = Number(shipment.initial_quantity || contract.quantity || shipment.quantity);
    const deliveredRatio = Math.max(0, Math.min(1, Number(shipment.quantity) / Math.max(0.1, initialQuantity)));
    if (deliveredRatio <= 0.05) {
      throw new Error('Hàng đã hỏng gần hết; không thể giao.');
    }
    const reward = Math.max(1, Math.round(Number(contract.reward_cash) * deliveredRatio));
    if (!issuer || Number(issuer.personal_cash) < reward) {
      throw new Error('Người thuê hiện không đủ tiền trả phí vận chuyển.');
    }

    return this.db.transaction(() => {
      const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
        'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
        [ownerId]
      );
      const newLiquid = Number(player?.liquid_cash || 0) + reward;
      this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, ownerId]);
      const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', gameDate);
      postDoubleEntry(this.db, {
        txnId,
        gameDate,
        counterparty: contract.issuer_name_vi,
        category: 'Logistics/FreightFee',
        inflow: reward,
        balance: newLiquid + Number(player?.safe_cash || 0),
        memo: `Phí vận chuyển ${shipment.quantity} ${shipment.item_code} đến ${shipment.to_settlement_id}`,
        debitAccount: ACCOUNT_CODES.cashMobile,
        creditAccount: ACCOUNT_CODES.laborIncome
      });
      this.db.execute(
        'UPDATE npc_personal_progression SET personal_cash = MAX(0, personal_cash - ?) WHERE npc_id = ?;',
        [reward, contract.issuer_npc_id]
      );
      this.db.execute(
        "UPDATE freight_shipments SET status = 'DELIVERED', source_reserved_quantity = 0 WHERE shipment_id = ?;",
        [shipmentId]
      );
      this.db.execute(
        "UPDATE freight_contracts SET status = 'DELIVERED', delivered_date = ?, updated_at = CURRENT_TIMESTAMP WHERE contract_id = ?;",
        [gameDate, contract.contract_id]
      );
      SettlementMarketService.forDatabase(this.db).applyTrade(
        shipment.to_settlement_id,
        shipment.item_code,
        Number(shipment.quantity)
      );
      return {
        shipmentId,
        contractId: contract.contract_id,
        itemCode: shipment.item_code,
        quantity: Number(shipment.quantity),
        initialQuantity,
        deliveredRatio: Number(deliveredRatio.toFixed(2)),
        spoiledQuantity: Number(shipment.spoiled_quantity || 0),
        rewardCash: reward,
        issuerNameVi: contract.issuer_name_vi,
        deliveredDate: gameDate
      };
    });
  }

  private failContract(shipment: any, contract: any, gameDate: string): void {
    this.db.transaction(() => {
      const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
        'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
        [shipment.owner_id]
      );
      const penalty = Math.min(
        Math.max(0, Number(contract.penalty_cash || 0)),
        Math.max(0, Number(player?.liquid_cash || 0))
      );
      if (penalty > 0) {
        const newLiquid = Number(player?.liquid_cash || 0) - penalty;
        this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, shipment.owner_id]);
        const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', gameDate);
        postDoubleEntry(this.db, {
          txnId,
          gameDate,
          counterparty: contract.issuer_name_vi,
          category: 'Logistics/FreightPenalty',
          outflow: penalty,
          balance: newLiquid + Number(player?.safe_cash || 0),
          memo: `Phạt trễ hạn hợp đồng ${contract.contract_id}`,
          debitAccount: ACCOUNT_CODES.operatingExpense,
          creditAccount: ACCOUNT_CODES.cashMobile
        });
        this.db.execute(
          'UPDATE npc_personal_progression SET personal_cash = personal_cash + ? WHERE npc_id = ?;',
          [penalty, contract.issuer_npc_id]
        );
      }
      // Return the unspoiled cargo that was reserved at accept time. Spoiled
      // units are a real loss, not goods that reappear at the source.
      const held = Math.min(
        Math.max(0, Number(shipment.quantity || 0)),
        Math.max(0, Number(shipment.source_reserved_quantity || 0))
      );
      if (held > 0) {
        SettlementMarketService.forDatabase(this.db).applyTrade(
          shipment.from_settlement_id,
          shipment.item_code,
          held
        );
      }
      this.db.execute(
        "UPDATE freight_shipments SET status = 'FAILED', source_reserved_quantity = 0 WHERE shipment_id = ?;",
        [shipment.shipment_id]
      );
      this.db.execute("UPDATE freight_contracts SET status = 'FAILED' WHERE contract_id = ?;", [contract.contract_id]);
    });
  }

  public advanceByDays(days: number, gameDate?: string): { advanced: number; arrived: string[] } {
    const dayCount = Math.max(0, Math.floor(Number(days) || 0));
    if (dayCount === 0) return { advanced: 0, arrived: [] };
    const date = gameDate || this.currentDate();
    const startDate = addGameDays(date, -(dayCount - 1));
    const arrived = new Set<string>();
    let advanced = 0;

    for (let day = 0; day < dayCount; day += 1) {
      const dayDate = addGameDays(startDate, day);
      if (hasProcessedDay(this.db, 'freight', dayDate)) continue;
      this.db.transaction(() => {
        const shipments = this.db.query<any>(
          "SELECT * FROM freight_shipments WHERE status = 'EN_ROUTE';"
        );
        advanced = Math.max(advanced, shipments.length);
        for (const shipment of shipments) {
          const remaining = Math.max(0, Number(shipment.days_remaining) - 1);
          const status = remaining === 0 ? 'ARRIVED' : 'EN_ROUTE';
          if (status === 'ARRIVED') {
            const totalDays = Number(shipment.total_days) || Number(shipment.days_remaining) || 1;
            const spoil = computeSpoilage(
              this.db,
              shipment.item_code,
              Number(shipment.initial_quantity || shipment.quantity),
              Math.max(1, totalDays)
            );
            this.db.execute(
              'UPDATE freight_shipments SET days_remaining = ?, status = ?, quantity = ?, spoiled_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE shipment_id = ?;',
              [remaining, status, spoil.quantity, spoil.lost, shipment.shipment_id]
            );
            arrived.add(shipment.shipment_id);
          } else {
            this.db.execute(
              'UPDATE freight_shipments SET days_remaining = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE shipment_id = ?;',
              [remaining, status, shipment.shipment_id]
            );
          }
        }
        // Expire open contracts and fail accepted shipments past their deadline.
        const overdue = this.db.query<any>(
          `SELECT s.*, c.deadline, c.penalty_cash, c.issuer_npc_id, c.issuer_name_vi, c.contract_id
           FROM freight_shipments s
           JOIN freight_contracts c ON c.contract_id = s.contract_id
           WHERE s.status IN ('EN_ROUTE','ARRIVED') AND c.deadline < ?;`,
          [dayDate]
        );
        for (const row of overdue) {
          this.failContract(row, row, dayDate);
        }
        this.db.execute(
          "UPDATE freight_contracts SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE status = 'OPEN' AND deadline < ?;",
          [dayDate]
        );
        markProcessedDay(this.db, 'freight', dayDate, { shipments: shipments.length });
      });
    }
    return { advanced, arrived: [...arrived] };
  }
}
