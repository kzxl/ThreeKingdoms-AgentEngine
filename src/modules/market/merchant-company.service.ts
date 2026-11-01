/**
 * Automated merchant company.
 *
 * A route connects two owned/rented warehouses. Every elapsed day:
 *   advance shipments → unload arrived cargo → sell destination stock above the
 *   floor → procure from NPC offers below the ceiling → dispatch the next run.
 */

import { DatabaseService } from '../../core/database';
import { nextSequentialId } from '../../shared/id-generator';
import { postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { getMarketItem } from '../../shared/market-price-book';
import { SkillService } from '../progression/skill.service';
import { SettlementMarketService } from '../economy/settlement-market.service';
import { RegionalMarketService, calculateDistanceLi } from '../economy/regional-market.service';
import { GUARD_TIER_CONFIGS, CARAVAN_DAILY_LI } from '../ecology-logistics/caravan-logistics.service';
import { NpcMarketService } from './npc-market.service';
import { computeSpoilage, freightDiscountPct } from './spoilage';
import { addGameDays } from '../../shared/game-date';
import { hasProcessedDay, markProcessedDay } from '../../shared/day-ledger';
import { resolveLogisticsAmbush } from '../../shared/logistics-risk';
import { postNpcMutation } from '../npc-lifecycle/npc-ledger';

export class MerchantCompanyService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): MerchantCompanyService {
    return new MerchantCompanyService(db);
  }

  private currentDate(): string {
    return this.db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;')?.d || '184-05-02';
  }

  private warehouseRow(warehouseId: string, ownerId: string): any {
    const row = this.db.queryOne<any>(
      'SELECT * FROM warehouses WHERE warehouse_id = ? AND owner_id = ? LIMIT 1;',
      [warehouseId, ownerId]
    );
    if (!row) throw new Error(`Kho ${warehouseId} không thuộc bạn.`);
    return row;
  }

  private warehouseUsable(warehouseId: string, gameDate: string): boolean {
    const row = this.db.queryOne<any>(
      'SELECT status, ownership_type, lease_until FROM warehouses WHERE warehouse_id = ? LIMIT 1;',
      [warehouseId]
    );
    if (!row || row.status !== 'ACTIVE') return false;
    if (row.ownership_type === 'RENTED' && row.lease_until && String(row.lease_until) < gameDate) return false;
    return true;
  }

  private stock(warehouseId: string, itemCode: string): number {
    return Number(this.db.queryOne<{ v: number }>(
      'SELECT quantity AS v FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ? LIMIT 1;',
      [warehouseId, itemCode]
    )?.v || 0);
  }

  private routeStock(routeId: string, warehouseId: string, itemCode: string): number {
    return Number(this.db.queryOne<{ v: number }>(
      'SELECT quantity AS v FROM merchant_route_stock WHERE route_id = ? AND warehouse_id = ? AND item_code = ? LIMIT 1;',
      [routeId, warehouseId, itemCode]
    )?.v || 0);
  }

  private addRouteStock(routeId: string, warehouseId: string, itemCode: string, quantity: number): void {
    if (quantity <= 0) return;
    this.db.execute(
      `INSERT INTO merchant_route_stock (route_id, warehouse_id, item_code, quantity)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(route_id, warehouse_id, item_code) DO UPDATE SET
         quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP;`,
      [routeId, warehouseId, itemCode, quantity]
    );
  }

  private removeRouteStock(routeId: string, warehouseId: string, itemCode: string, quantity: number): void {
    this.db.execute(
      'UPDATE merchant_route_stock SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE route_id = ? AND warehouse_id = ? AND item_code = ?;',
      [quantity, routeId, warehouseId, itemCode]
    );
  }

  private room(warehouseId: string): number {
    const row = this.db.queryOne<any>('SELECT capacity FROM warehouses WHERE warehouse_id = ? LIMIT 1;', [warehouseId]);
    const used = Number(this.db.queryOne<{ v: number }>(
      'SELECT COALESCE(SUM(quantity), 0) AS v FROM warehouse_stock WHERE warehouse_id = ?;',
      [warehouseId]
    )?.v || 0);
    return Math.max(0, Number(row?.capacity || 0) - used);
  }

  private addStock(warehouseId: string, itemCode: string, quantity: number): number {
    const room = this.room(warehouseId);
    const qty = Math.min(room, Math.max(0, quantity));
    if (qty <= 0) return 0;
    const existing = this.db.queryOne<any>(
      'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ? LIMIT 1;',
      [warehouseId, itemCode]
    );
    if (existing) {
      this.db.execute(
        'UPDATE warehouse_stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ? AND item_code = ?;',
        [qty, warehouseId, itemCode]
      );
    } else {
      this.db.execute(
        'INSERT INTO warehouse_stock (warehouse_id, item_code, quantity, unit_cost_basis) VALUES (?, ?, ?, 0);',
        [warehouseId, itemCode, qty]
      );
    }
    return qty;
  }

  private removeStock(warehouseId: string, itemCode: string, quantity: number): void {
    this.db.execute(
      'UPDATE warehouse_stock SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ? AND item_code = ?;',
      [quantity, warehouseId, itemCode]
    );
  }

  private travelDays(fromSettlement: string, toSettlement: string): number {
    let speed = 0;
    try {
      speed = Math.max(0, Math.min(0.5, SkillService.forDatabase(this.db).getEffectTotal(
        'TRAVEL_SPEED',
        ['SKL-COM-CARAVAN', 'SKL-LOG-PROV']
      )));
    } catch {
      speed = 0;
    }
    return Math.max(1, Math.ceil(calculateDistanceLi(fromSettlement, toSettlement) / (CARAVAN_DAILY_LI * (1 + speed))));
  }

  private event(routeId: string, date: string, type: string, itemCode: string | null, quantity: number, cash: number, message: string): void {
    const eventId = nextSequentialId(this.db, 'merchant_events', 'MEV', date);
    this.db.execute(
      `INSERT INTO merchant_events (event_id, route_id, game_date, event_type, item_code, quantity, total_cash, message_vi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [eventId, routeId, date, type, itemCode, quantity, cash, message]
    );
  }

  public createRoute(ownerId: string, input: any, gameDate: string): any {
    const from = this.warehouseRow(String(input.fromWarehouseId || ''), ownerId);
    const to = this.warehouseRow(String(input.toWarehouseId || ''), ownerId);
    if (!this.warehouseUsable(from.warehouse_id, gameDate)) throw new Error('Kho nguồn đã hết hạn.');
    if (!this.warehouseUsable(to.warehouse_id, gameDate)) throw new Error('Kho đích đã hết hạn.');
    if (from.settlement_id === to.settlement_id) throw new Error('Kho nguồn và kho đích phải khác thành.');
    const item = getMarketItem(this.db, String(input.itemCode || ''));
    if (!item) throw new Error('Mặt hàng không tồn tại.');
    const maxBuy = Math.max(1, Math.round(Number(input.maxBuyPrice) || 0));
    const minSell = Math.max(1, Math.round(Number(input.minSellPrice) || 0));
    if (minSell <= maxBuy) throw new Error('Giá bán sàn phải cao hơn giá mua trần.');
    const qty = Math.max(0.1, Number(input.quantityPerRun) || 0);
    const frequency = Math.max(1, Math.round(Number(input.frequencyDays) || 7));
    const guard = String(input.guardTier || 'VETERAN').toUpperCase() as keyof typeof GUARD_TIER_CONFIGS;
    if (!GUARD_TIER_CONFIGS[guard]) throw new Error('Cấp hộ vệ không hợp lệ.');
    const routeId = nextSequentialId(this.db, 'merchant_routes', 'MTR', gameDate);
    this.db.execute(
      `INSERT INTO merchant_routes
        (route_id, owner_id, name_vi, from_warehouse_id, to_warehouse_id, item_code,
         max_buy_price, min_sell_price, quantity_per_run, frequency_days, guard_tier,
         status, next_run_date, created_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?);`,
      [
        routeId, ownerId,
        String(input.nameVi || `${from.settlement_id} → ${to.settlement_id} ${item.itemCode}`),
        from.warehouse_id, to.warehouse_id, item.itemCode,
        maxBuy, minSell, qty, frequency, guard, gameDate, gameDate
      ]
    );
    return this.getRoute(ownerId, routeId);
  }

  public getRoute(ownerId: string, routeId: string): any {
    const row = this.db.queryOne<any>(
      `SELECT r.*, wf.settlement_id AS from_settlement, wt.settlement_id AS to_settlement
       FROM merchant_routes r
       JOIN warehouses wf ON wf.warehouse_id = r.from_warehouse_id
       JOIN warehouses wt ON wt.warehouse_id = r.to_warehouse_id
       WHERE r.route_id = ? AND r.owner_id = ? LIMIT 1;`,
      [routeId, ownerId]
    );
    if (!row) throw new Error('Route không tồn tại.');
    return this.view(row);
  }

  private view(row: any): any {
    return {
      routeId: row.route_id,
      nameVi: row.name_vi,
      fromWarehouseId: row.from_warehouse_id,
      toWarehouseId: row.to_warehouse_id,
      fromSettlementId: row.from_settlement,
      toSettlementId: row.to_settlement,
      itemCode: row.item_code,
      maxBuyPrice: Number(row.max_buy_price),
      minSellPrice: Number(row.min_sell_price),
      quantityPerRun: Number(row.quantity_per_run),
      frequencyDays: Number(row.frequency_days),
      guardTier: row.guard_tier,
      status: row.status,
      nextRunDate: row.next_run_date,
      sourceStock: this.routeStock(row.route_id, row.from_warehouse_id, row.item_code),
      destinationStock: this.routeStock(row.route_id, row.to_warehouse_id, row.item_code)
    };
  }

  public listRoutes(ownerId = 'PLY-0001'): any[] {
    return this.db.query<any>(
      `SELECT r.*, wf.settlement_id AS from_settlement, wt.settlement_id AS to_settlement
       FROM merchant_routes r
       JOIN warehouses wf ON wf.warehouse_id = r.from_warehouse_id
       JOIN warehouses wt ON wt.warehouse_id = r.to_warehouse_id
       WHERE r.owner_id = ? ORDER BY r.created_date DESC;`,
      [ownerId]
    ).map(row => this.view(row));
  }

  public setStatus(ownerId: string, routeId: string, status: string): any {
    const next = status === 'PAUSED' ? 'PAUSED' : 'ACTIVE';
    const result = this.db.execute(
      'UPDATE merchant_routes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE route_id = ? AND owner_id = ?;',
      [next, routeId, ownerId]
    );
    if (!Number((result as any)?.changes || 0)) throw new Error('Route không tồn tại.');
    return this.getRoute(ownerId, routeId);
  }

  public listEvents(ownerId: string, routeId?: string): any[] {
    const routes = routeId
      ? [this.getRoute(ownerId, routeId)]
      : this.listRoutes(ownerId);
    const ids = routes.map(route => route.routeId);
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    // arch-guard:allow-sql-interpolation — placeholders only, one per route id.
    return this.db.query<any>(
      `SELECT * FROM merchant_events WHERE route_id IN (${placeholders}) ORDER BY rowid DESC LIMIT 50;`,
      ids
    ).map(row => ({
      eventId: row.event_id,
      routeId: row.route_id,
      gameDate: row.game_date,
      eventType: row.event_type,
      itemCode: row.item_code,
      quantity: Number(row.quantity || 0),
      totalCash: Number(row.total_cash || 0),
      messageVi: row.message_vi
    }));
  }

  private advanceShipments(days: number): void {
    const rows = this.db.query<any>("SELECT * FROM merchant_shipments WHERE status = 'EN_ROUTE';");
    for (const row of rows) {
      const remaining = Math.max(0, Number(row.days_remaining) - days);
      const totalDays = Number(row.total_days) || Number(row.days_remaining) || 1;
      let quantity = Number(row.quantity);
      let ambushLoss = Number(row.ambush_loss_quantity || 0);
      let ambushResolved = Number(row.ambush_resolved || 0) === 1;
      if (remaining === 0 && !ambushResolved) {
        const route = this.db.queryOne<any>(
          `SELECT r.guard_tier, wf.settlement_id AS from_settlement, wt.settlement_id AS to_settlement
           FROM merchant_routes r
           JOIN warehouses wf ON wf.warehouse_id = r.from_warehouse_id
           JOIN warehouses wt ON wt.warehouse_id = r.to_warehouse_id
           WHERE r.route_id = ? LIMIT 1;`,
          [row.route_id]
        );
        if (route) {
          const risk = resolveLogisticsAmbush(this.db, {
            fromSettlementId: route.from_settlement,
            toSettlementId: route.to_settlement,
            guardTier: route.guard_tier,
            quantity
          });
          ambushResolved = true;
          if (risk.ambushed) {
            const lost = Math.min(quantity, risk.lostQuantity);
            quantity = Math.max(0, Number((quantity - lost).toFixed(1)));
            ambushLoss = Number((ambushLoss + lost).toFixed(1));
            if (risk.strongholdId) {
              const price = new RegionalMarketService(this.db).calculateSettlementPrice(
                route.to_settlement,
                row.item_code
              );
              this.db.execute(
                'UPDATE bandit_strongholds SET plundered_wealth = plundered_wealth + ? WHERE stronghold_id = ?;',
                [Math.max(1, Math.round(lost * price)), risk.strongholdId]
              );
            }
          }
        }
      }
      if (remaining === 0) {
        const spoil = computeSpoilage(
          this.db,
          row.item_code,
          quantity,
          Math.max(1, totalDays)
        );
        this.db.execute(
          `UPDATE merchant_shipments
           SET days_remaining = 0, status = ?, quantity = ?, spoiled_quantity = ?,
               ambush_loss_quantity = ?, ambush_resolved = 1, updated_at = CURRENT_TIMESTAMP
           WHERE shipment_id = ?;`,
          ['ARRIVED', spoil.quantity, spoil.lost, ambushLoss, row.shipment_id]
        );
      } else {
        this.db.execute(
          `UPDATE merchant_shipments
           SET days_remaining = ?, status = ?, quantity = ?, ambush_loss_quantity = ?,
               ambush_resolved = ?, updated_at = CURRENT_TIMESTAMP
           WHERE shipment_id = ?;`,
          [remaining, 'EN_ROUTE', quantity, ambushLoss, ambushResolved ? 1 : 0, row.shipment_id]
        );
      }
    }
  }

  private unloadArrived(date: string): void {
    const rows = this.db.query<any>("SELECT * FROM merchant_shipments WHERE status = 'ARRIVED';");
    for (const row of rows) {
      const route = this.db.queryOne<any>('SELECT * FROM merchant_routes WHERE route_id = ? LIMIT 1;', [row.route_id]);
      if (!route) continue;
      const destinationWarehouse = this.db.queryOne<any>(
        'SELECT settlement_id FROM warehouses WHERE warehouse_id = ? LIMIT 1;',
        [row.to_warehouse_id]
      );
      if (!this.warehouseUsable(row.to_warehouse_id, date)) continue;
      const destinationSettlement = destinationWarehouse?.settlement_id || row.to_warehouse_id;
      const unloaded = this.addStock(row.to_warehouse_id, row.item_code, Number(row.quantity));
      this.addRouteStock(route.route_id, row.to_warehouse_id, row.item_code, unloaded);
      const overflow = Math.max(0, Number(row.quantity) - unloaded);
      if (overflow > 0) {
        const price = new RegionalMarketService(this.db).calculateSettlementPrice(destinationSettlement, row.item_code);
        const total = Math.round(overflow * price);
        const player = this.db.queryOne<any>('SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;', [row.owner_id]);
        const newLiquid = Number(player?.liquid_cash || 0) + total;
        this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, row.owner_id]);
        const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', date);
        postDoubleEntry(this.db, {
          txnId, gameDate: date,
          counterparty: 'Chợ đích',
          category: 'Trade/MerchantOverflowSale',
          inflow: total,
          balance: newLiquid + Number(player?.safe_cash || 0),
          memo: `Bán phần tràn kho ${row.item_code}`,
          debitAccount: ACCOUNT_CODES.cashMobile,
          creditAccount: ACCOUNT_CODES.salesRevenue
        });
        SettlementMarketService.forDatabase(this.db).applyTrade(destinationSettlement, row.item_code, overflow);
        this.event(row.route_id, date, 'OVERFLOW_SALE', row.item_code, overflow, total, `Bán ${overflow} ${row.item_code} do kho đích đầy.`);
      }
      this.db.execute("UPDATE merchant_shipments SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP WHERE shipment_id = ?;", [row.shipment_id]);
      this.event(
        row.route_id,
        date,
        'UNLOAD',
        row.item_code,
        unloaded,
        0,
        `Dỡ ${unloaded} ${row.item_code} vào kho đích${Number(row.spoiled_quantity || 0) > 0 ? ` (hỏng ${row.spoiled_quantity})` : ''}.`
      );
    }
  }

  private sellDestination(date: string): void {
    const routes = this.db.query<any>(
      `SELECT r.*, wf.settlement_id AS from_settlement, wt.settlement_id AS to_settlement
       FROM merchant_routes r
       JOIN warehouses wf ON wf.warehouse_id = r.from_warehouse_id
       JOIN warehouses wt ON wt.warehouse_id = r.to_warehouse_id
       WHERE r.status = 'ACTIVE';`
    );
    const regional = new RegionalMarketService(this.db);
    for (const route of routes) {
      if (!this.warehouseUsable(route.to_warehouse_id, date)) continue;
      const qty = this.routeStock(route.route_id, route.to_warehouse_id, route.item_code);
      if (qty < 0.1) continue;
      const price = regional.calculateSettlementPrice(route.to_settlement, route.item_code, date);
      if (price < Number(route.min_sell_price)) continue;
      const total = Math.round(qty * price);
      const player = this.db.queryOne<any>('SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;', [route.owner_id]);
      const newLiquid = Number(player?.liquid_cash || 0) + total;
      this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, route.owner_id]);
      const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', date);
      postDoubleEntry(this.db, {
        txnId, gameDate: date,
        counterparty: 'Chợ đích',
        category: 'Trade/MerchantSale',
        inflow: total,
        balance: newLiquid + Number(player?.safe_cash || 0),
        memo: `Bán ${qty} ${route.item_code} tại ${route.to_settlement}`,
        debitAccount: ACCOUNT_CODES.cashMobile,
        creditAccount: ACCOUNT_CODES.salesRevenue
      });
      this.removeStock(route.to_warehouse_id, route.item_code, qty);
      this.removeRouteStock(route.route_id, route.to_warehouse_id, route.item_code, qty);
      SettlementMarketService.forDatabase(this.db).applyTrade(route.to_settlement, route.item_code, qty);
      this.event(route.route_id, date, 'SALE', route.item_code, qty, total, `Bán ${qty} ${route.item_code} tại ${route.to_settlement} (${price} Quan/đơn vị).`);
    }
  }

  private procure(date: string): void {
    const routes = this.db.query<any>(
      `SELECT r.*, wf.settlement_id AS from_settlement
       FROM merchant_routes r
       JOIN warehouses wf ON wf.warehouse_id = r.from_warehouse_id
       WHERE r.status = 'ACTIVE';`
    );
    const npcMarket = NpcMarketService.forDatabase(this.db);
    for (const route of routes) {
      if (!this.warehouseUsable(route.from_warehouse_id, date)) continue;
      const current = this.stock(route.from_warehouse_id, route.item_code);
      let needed = Math.max(0, Number(route.quantity_per_run) - current);
      if (needed < 0.1) continue;
      npcMarket.refreshOffers(route.from_settlement, date);
      const offers = this.db.query<any>(
        `SELECT * FROM npc_market_offers
         WHERE settlement_id = ? AND item_code = ? AND status = 'ACTIVE'
           AND quantity > 0 AND unit_price <= ?
         ORDER BY unit_price ASC;`,
        [route.from_settlement, route.item_code, Number(route.max_buy_price)]
      );
      for (const offer of offers) {
        if (needed < 0.1) break;
        const room = this.room(route.from_warehouse_id);
        if (room < 0.1) break;
        const player = this.db.queryOne<any>('SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;', [route.owner_id]);
        const affordable = Math.floor(Number(player?.liquid_cash || 0) / Number(offer.unit_price));
        if (affordable < 1) break;
        const qty = Math.min(needed, Number(offer.quantity), room, affordable);
        if (qty < 0.1) continue;
        const total = Math.round(qty * Number(offer.unit_price));
        const newLiquid = Number(player.liquid_cash) - total;
        this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, route.owner_id]);
        const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', date);
        postDoubleEntry(this.db, {
          txnId, gameDate: date,
          counterparty: offer.npc_name_vi,
          category: 'Trade/MerchantPurchase',
          outflow: total,
          balance: newLiquid + Number(player.safe_cash || 0),
          memo: `Công ty thu mua ${qty} ${route.item_code} từ ${offer.npc_name_vi}`,
          debitAccount: ACCOUNT_CODES.inventory,
          creditAccount: ACCOUNT_CODES.cashMobile
        });
        postNpcMutation(this.db, {
          npcId: offer.npc_id,
          gameDate: date,
          category: 'MERCHANT_ROUTE_PURCHASE',
          counterparty: route.owner_id,
          deltaCash: total,
          memoVi: `Công ty mua ${qty} ${route.item_code}`
        });
        const remaining = Math.max(0, Number(offer.quantity) - qty);
        this.db.execute(
          'UPDATE npc_market_offers SET quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE offer_id = ?;',
          [remaining, remaining > 0 ? 'ACTIVE' : 'SOLD_OUT', offer.offer_id]
        );
        this.addStock(route.from_warehouse_id, route.item_code, qty);
        this.addRouteStock(route.route_id, route.from_warehouse_id, route.item_code, qty);
        SettlementMarketService.forDatabase(this.db).applyTrade(route.from_settlement, route.item_code, -qty);
        this.event(route.route_id, date, 'PURCHASE', route.item_code, qty, total, `Thu mua ${qty} ${route.item_code} tại ${route.from_settlement}.`);
        needed -= qty;
      }
    }
  }

  private dispatchDue(date: string): void {
    const routes = this.db.query<any>(
      `SELECT r.*, wf.settlement_id AS from_settlement, wt.settlement_id AS to_settlement
       FROM merchant_routes r
       JOIN warehouses wf ON wf.warehouse_id = r.from_warehouse_id
       JOIN warehouses wt ON wt.warehouse_id = r.to_warehouse_id
       WHERE r.status = 'ACTIVE' AND r.next_run_date <= ?;`,
      [date]
    );
    for (const route of routes) {
      if (!this.warehouseUsable(route.from_warehouse_id, date)) continue;
      if (!this.warehouseUsable(route.to_warehouse_id, date)) continue;
      const routeQty = this.routeStock(route.route_id, route.from_warehouse_id, route.item_code);
      const qty = Math.min(routeQty, Number(route.quantity_per_run));
      if (qty < 0.1) continue;
      const guard = GUARD_TIER_CONFIGS[route.guard_tier as keyof typeof GUARD_TIER_CONFIGS] || GUARD_TIER_CONFIGS.VETERAN;
      const discount = freightDiscountPct(this.db);
      const guardFee = Math.max(1, Math.round(guard.costQian * (1 - discount / 100)));
      const player = this.db.queryOne<any>('SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;', [route.owner_id]);
      if (Number(player?.liquid_cash || 0) < guardFee) continue;
      const newLiquid = Number(player.liquid_cash) - guardFee;
      this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, route.owner_id]);
      const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', date);
      postDoubleEntry(this.db, {
        txnId, gameDate: date,
        counterparty: 'Bảo Tiêu công ty',
        category: 'Logistics/CompanyGuard',
        outflow: guardFee,
        balance: newLiquid + Number(player.safe_cash || 0),
        memo: `Phí hộ vệ route ${route.route_id}`,
        debitAccount: ACCOUNT_CODES.operatingExpense,
        creditAccount: ACCOUNT_CODES.cashMobile
      });
      this.removeStock(route.from_warehouse_id, route.item_code, qty);
      this.removeRouteStock(route.route_id, route.from_warehouse_id, route.item_code, qty);
      const shipmentId = nextSequentialId(this.db, 'merchant_shipments', 'MSH', date);
      const days = this.travelDays(route.from_settlement, route.to_settlement);
      this.db.execute(
        `INSERT INTO merchant_shipments
          (shipment_id, route_id, owner_id, from_warehouse_id, to_warehouse_id, item_code,
           quantity, days_remaining, status, cargo_value, guard_fee, created_date,
           initial_quantity, total_days, spoiled_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EN_ROUTE', ?, ?, ?, ?, ?, 0);`,
        [
          shipmentId, route.route_id, route.owner_id, route.from_warehouse_id, route.to_warehouse_id,
          route.item_code, qty, days,
          Math.round(qty * Number(route.max_buy_price)), guardFee, date,
          qty, days
        ]
      );
      this.db.execute(
        'UPDATE merchant_routes SET next_run_date = ?, updated_at = CURRENT_TIMESTAMP WHERE route_id = ?;',
        [addGameDays(date, Number(route.frequency_days)), route.route_id]
      );
      this.event(route.route_id, date, 'DISPATCH', route.item_code, qty, guardFee, `Xuất chuyến ${qty} ${route.item_code} ${route.from_settlement} → ${route.to_settlement}.`);
    }
  }

  public advanceByDays(days: number, gameDate?: string): { routes: number; events: number; daysProcessed: number } {
    const count = Math.max(0, Math.floor(Number(days) || 0));
    if (count === 0) return { routes: 0, events: 0, daysProcessed: 0 };
    const date = gameDate || this.currentDate();
    const routes = Number(this.db.queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM merchant_routes WHERE status = 'ACTIVE';")?.c || 0);
    let daysProcessed = 0;
    let eventsWritten = 0;

    for (let day = 0; day < count; day += 1) {
      // `gameDate` is the date after the full span; walk the intermediate days.
      const dayDate = addGameDays(date, day - count + 1);
      if (hasProcessedDay(this.db, 'merchant', dayDate)) continue;

      const beforeEvents = Number(this.db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM merchant_events;')?.c || 0);
      this.db.transaction(() => {
        this.advanceShipments(1);
        this.unloadArrived(dayDate);
        this.sellDestination(dayDate);
        this.procure(dayDate);
        this.dispatchDue(dayDate);
        const afterEvents = Number(this.db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM merchant_events;')?.c || 0);
        markProcessedDay(this.db, 'merchant', dayDate, {
          routes,
          events: afterEvents - beforeEvents
        });
        daysProcessed += 1;
        eventsWritten += afterEvents - beforeEvents;
      });
    }
    return { routes, events: eventsWritten, daysProcessed };
  }
}
