/**
 * ThreeKingdoms-AgentEngine: Settlement Market State
 * (src/modules/economy/settlement-market.service.ts)
 *
 * Static specialisation comes from SETTLEMENT_PROFILES; this service adds the
 * persisted stock/demand layer. Rows are created lazily for the item being
 * traded, then drift monthly so prices move even without a crisis.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { RegionalMarketService, SETTLEMENT_PROFILES } from './regional-market.service';
import { nextId } from '../../shared/id-generator';
import { hasProcessedDay, markProcessedDay } from '../../shared/day-ledger';

export interface SettlementMarketState {
  settlementId: string;
  itemCode: string;
  stock: number;
  demand: number;
}

export class SettlementMarketService {
  private static instance: SettlementMarketService | null = null;

  public constructor(private readonly db: DatabaseService = DatabaseService.getInstance()) {}

  public static getInstance(): SettlementMarketService {
    if (!SettlementMarketService.instance) {
      SettlementMarketService.instance = new SettlementMarketService();
    }
    return SettlementMarketService.instance;
  }

  public static forDatabase(db: DatabaseService): SettlementMarketService {
    return new SettlementMarketService(db);
  }

  public getState(settlementId: string, itemCode: string): SettlementMarketState {
    const existing = this.db.queryOne<any>(
      'SELECT settlement_id, item_code, stock, demand FROM settlement_market_state WHERE settlement_id = ? AND item_code = ?;',
      [settlementId, itemCode]
    );
    if (existing) {
      return {
        settlementId: existing.settlement_id,
        itemCode: existing.item_code,
        stock: Number(existing.stock),
        demand: Number(existing.demand)
      };
    }

    const profile = SETTLEMENT_PROFILES[settlementId];
    const surplus = profile?.specialization.surplusItems.includes(itemCode);
    const deficit = profile?.specialization.deficitItems.includes(itemCode);
    const stock = surplus ? 150 : deficit ? 60 : 100;
    const demand = surplus ? 100 : deficit ? 120 : 100;
    this.db.execute(
      `INSERT OR IGNORE INTO settlement_market_state (settlement_id, item_code, stock, demand)
       VALUES (?, ?, ?, ?);`,
      [settlementId, itemCode, stock, demand]
    );
    return { settlementId, itemCode, stock, demand };
  }

  public getStockMultiplier(settlementId: string, itemCode: string): number {
    const state = this.getState(settlementId, itemCode);
    const ratio = state.demand / Math.max(1, state.stock);
    return Math.max(0.5, Math.min(2, Math.sqrt(ratio)));
  }

  public getEndowmentMultiplier(settlementId: string, itemCode: string): number {
    let endowment: { supply_score: number; demand_score: number } | undefined;
    try {
      endowment = this.db.queryOne<{ supply_score: number; demand_score: number }>(
        'SELECT supply_score, demand_score FROM settlement_item_endowment WHERE settlement_id = ? AND item_code = ? LIMIT 1;',
        [settlementId, itemCode]
      );
    } catch {
      // Legacy/minimal databases before migration 073 have no endowment table.
      return 1;
    }
    if (!endowment) return 1;
    const ratio = Number(endowment.demand_score) / Math.max(1, Number(endowment.supply_score));
    return Math.max(0.6, Math.min(1.6, Math.sqrt(ratio)));
  }

  /**
   * The single local multiplier: specialisation × stock pressure × regional
   * endowment. `RegionalMarketService.calculateSettlementPrice` and every quote
   * consumer use this method so a fish-rich settlement is cheap everywhere,
   * not only on the stall screen.
   */
  public getLocalMultiplier(settlementId: string, itemCode: string): number {
    const specialization = SETTLEMENT_PROFILES[settlementId]
      ? this.specializationMultiplier(settlementId, itemCode)
      : 1;
    const local = specialization
      * this.getStockMultiplier(settlementId, itemCode)
      * this.getEndowmentMultiplier(settlementId, itemCode);
    return Math.max(0.5, Math.min(2, local));
  }

  /**
   * Books a physical trade into local stock. Buying reduces what the market has
   * left; selling adds to it. This is the write side of the same state that
   * `getLocalMultiplier` reads, so player trades move prices instead of only
   * drifting on a monthly timer.
   */
  public applyTrade(
    settlementId: string,
    itemCode: string,
    stockDelta: number
  ): SettlementMarketState & { stockMultiplier: number } {
    const state = this.getState(settlementId, itemCode);
    const delta = Number(stockDelta) || 0;
    const stock = Number(Math.max(0, Math.min(100000, state.stock + delta)).toFixed(1));
    this.db.execute(
      'UPDATE settlement_market_state SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE settlement_id = ? AND item_code = ?;',
      [stock, settlementId, itemCode]
    );
    const stockMultiplier = Math.max(0.5, Math.min(2, Math.sqrt(state.demand / Math.max(1, stock))));
    return {
      settlementId,
      itemCode,
      stock,
      demand: state.demand,
      stockMultiplier: Number(stockMultiplier.toFixed(3))
    };
  }

  /**
   * Drift stock toward demand with a small seeded shock. Daily calls can pass
   * `recordHistory: false` to keep the pulse table monthly-sized.
   */
  public driftSettlement(
    settlementId: string,
    gameDate?: string,
    options: { recordHistory?: boolean } = {}
  ): number {
    const rows = this.db.query<any>(
      'SELECT item_code, stock, demand FROM settlement_market_state WHERE settlement_id = ?;',
      [settlementId]
    );
    if (rows.length === 0) return 0;
    const recordHistory = options.recordHistory !== false;
    const rng = RngService.forDomain(this.db, 'settlement-market');
    const date = gameDate || this.currentDate();
    this.db.transaction(() => {
      for (const row of rows) {
        const stock = Math.max(10, Math.min(500, Number(row.stock) + (Number(row.demand) - Number(row.stock)) * 0.1 + (rng.nextFloat() - 0.5) * 10));
        const demand = Math.max(10, Math.min(500, Number(row.demand) + (rng.nextFloat() - 0.5) * 6));
        this.db.execute(
          'UPDATE settlement_market_state SET stock = ?, demand = ?, updated_at = CURRENT_TIMESTAMP WHERE settlement_id = ? AND item_code = ?;',
          [Number(stock.toFixed(1)), Number(demand.toFixed(1)), settlementId, row.item_code]
        );
        if (recordHistory) {
          const stockMultiplier = Math.max(0.5, Math.min(2, Math.sqrt(Number(demand) / Math.max(1, Number(stock)))));
          this.db.execute(
            `INSERT INTO settlement_market_history
              (history_id, settlement_id, item_code, game_date, stock, demand, stock_multiplier, local_multiplier)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              nextId(this.db, 'settlement_market_history', 'MKH', date),
              settlementId,
              row.item_code,
              date,
              Number(stock.toFixed(1)),
              Number(demand.toFixed(1)),
              Number(stockMultiplier.toFixed(3)),
              Number((this.getLocalMultiplier(settlementId, row.item_code)).toFixed(3))
            ]
          );
        }
      }
    });
    return rows.length;
  }

  /**
   * Monthly essential consumption. Draws stock down; a shortage reduces public
   * order and is logged for the report/audit.
   */
  public consumeEssentials(gameDate?: string): any[] {
    const date = gameDate || this.currentDate();
    if (hasProcessedDay(this.db, 'consumption', date)) return [];
    const rows = this.db.query<any>(
      `SELECT settlement_id, item_code, monthly_demand
       FROM settlement_consumption WHERE monthly_demand > 0;`
    );
    const events: any[] = [];
    this.db.transaction(() => {
      for (const row of rows) {
        const state = this.getState(row.settlement_id, row.item_code);
        const demand = Number(row.monthly_demand);
        const consumed = Math.min(Number(state.stock), demand);
        const shortage = Math.max(0, demand - consumed);
        const stock = Math.max(0, Number(state.stock) - consumed);
        this.db.execute(
          'UPDATE settlement_market_state SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE settlement_id = ? AND item_code = ?;',
          [Number(stock.toFixed(1)), row.settlement_id, row.item_code]
        );
        if (shortage > 0) {
          this.db.execute(
            'UPDATE session_settlements SET public_order = MAX(0, public_order - ?) WHERE settlement_id = ?;',
            [Math.min(20, Math.ceil(shortage * 0.5)), row.settlement_id]
          );
        }
        const logId = nextId(this.db, 'settlement_consumption_log', 'CONS', date);
        this.db.execute(
          `INSERT INTO settlement_consumption_log
            (log_id, settlement_id, item_code, game_date, demand, consumed, shortage)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [logId, row.settlement_id, row.item_code, date, demand, consumed, shortage]
        );
        events.push({ settlementId: row.settlement_id, itemCode: row.item_code, demand, consumed, shortage });
      }
      markProcessedDay(this.db, 'consumption', date, { events: events.length });
    });
    return events;
  }

  public getMarketPulse(settlementId: string, itemLimit = 30): any[] {
    const states = this.db.query<any>(
      'SELECT item_code, stock, demand, updated_at FROM settlement_market_state WHERE settlement_id = ? ORDER BY item_code LIMIT ?;',
      [settlementId, Math.max(1, Math.min(60, itemLimit))]
    );
    return states.map(state => {
      const stockMultiplier = Math.max(0.5, Math.min(2, Math.sqrt(Number(state.demand) / Math.max(1, Number(state.stock)))));
      const history = this.db.query<any>(
        'SELECT game_date, stock, demand, stock_multiplier FROM settlement_market_history WHERE settlement_id = ? AND item_code = ? ORDER BY game_date DESC, rowid DESC LIMIT 24;',
        [settlementId, state.item_code]
      ).reverse();
      return {
        itemCode: state.item_code,
        stock: Number(state.stock),
        demand: Number(state.demand),
        stockMultiplier: Number(stockMultiplier.toFixed(3)),
        localMultiplier: Number(this.getLocalMultiplier(settlementId, state.item_code).toFixed(3)),
        pressure: state.stock < state.demand * 0.7 ? 'SCARCE' : state.stock > state.demand * 1.3 ? 'SURPLUS' : 'NORMAL',
        history
      };
    });
  }

  /**
   * Full price board for one settlement: every master item, local price,
   * stock/demand pressure, recent history, player stock and the best arbitrage
   * destination. One call feeds the market modal so the table is never empty.
   */
  public getMarketBoard(settlementId: string, playerId = 'PLY-0001'): any {
    const regional = new RegionalMarketService(this.db);
    const catalog = regional.getSettlementMarketCatalog(settlementId);

    const stateByItem = new Map<string, { stock: number; demand: number }>();
    for (const row of this.db.query<any>(
      'SELECT item_code, stock, demand FROM settlement_market_state WHERE settlement_id = ?;',
      [settlementId]
    )) {
      stateByItem.set(String(row.item_code), { stock: Number(row.stock), demand: Number(row.demand) });
    }

    const historyByItem = new Map<string, Array<{
      gameDate: string;
      stock: number;
      demand: number;
      stockMultiplier: number;
    }>>();
    for (const row of this.db.query<any>(
      `SELECT item_code, game_date, stock, demand, stock_multiplier
         FROM settlement_market_history WHERE settlement_id = ?
        ORDER BY item_code, game_date DESC, rowid DESC;`,
      [settlementId]
    )) {
      const key = String(row.item_code);
      const list = historyByItem.get(key) || [];
      if (list.length < 24) {
        list.push({
          gameDate: String(row.game_date),
          stock: Number(row.stock),
          demand: Number(row.demand),
          stockMultiplier: Number(row.stock_multiplier)
        });
      }
      historyByItem.set(key, list);
    }
    for (const list of historyByItem.values()) list.reverse();

    const playerQuantity = new Map<string, number>();
    for (const row of this.db.query<any>(
      'SELECT item_code, quantity FROM inventory_items;'
    )) {
      playerQuantity.set(String(row.item_code), Number(row.quantity || 0));
    }

    const opportunities = regional.getArbitrageOpportunities(settlementId);
    const opportunityByItem = new Map(opportunities.map(opportunity => [opportunity.itemCode, opportunity]));

    const items = catalog.map(item => {
      const state = stateByItem.get(item.itemCode) || { stock: 100, demand: 100 };
      const pressure = state.stock < state.demand * 0.7 || item.supplyState === 'DEFICIT'
        ? 'SCARCE'
        : state.stock > state.demand * 1.3 || item.supplyState === 'SURPLUS'
          ? 'SURPLUS'
          : 'NORMAL';
      const changePct = item.basePrice > 0
        ? Math.round(((item.currentPrice - item.basePrice) / item.basePrice) * 100)
        : 0;
      return {
        itemCode: item.itemCode,
        nameVi: item.nameVi,
        category: item.category,
        basePrice: item.basePrice,
        currentPrice: item.currentPrice,
        changePct,
        supplyState: item.supplyState,
        crisisActive: item.crisisActive,
        stock: state.stock,
        demand: state.demand,
        pressure,
        playerQuantity: playerQuantity.get(item.itemCode) || 0,
        history: historyByItem.get(item.itemCode) || [],
        opportunity: opportunityByItem.get(item.itemCode) || null
      };
    });

    const profile = SETTLEMENT_PROFILES[settlementId];
    const summary = {
      total: items.length,
      scarce: items.filter(item => item.pressure === 'SCARCE').length,
      surplus: items.filter(item => item.pressure === 'SURPLUS').length,
      crisis: items.filter(item => item.crisisActive).length,
      affordable: items.filter(item => item.currentPrice <= 100).length,
      opportunities: opportunities.length,
      bestOpportunity: opportunities[0] || null
    };
    return {
      settlementId,
      settlementNameVi: profile?.nameVi || settlementId,
      provinceVi: profile?.provinceVi || '',
      gameDate: this.currentDate(),
      specialization: profile?.specialization || null,
      categories: Array.from(new Set(items.map(item => item.category))).sort(),
      summary,
      items
    };
  }

  private currentDate(): string {
    const meta = this.db.queryOne<{ current_date: string }>(
      'SELECT "current_date" AS current_date FROM campaign_meta LIMIT 1;'
    );
    return meta?.current_date || '184-05-02';
  }

  private specializationMultiplier(settlementId: string, itemCode: string): number {
    const profile = SETTLEMENT_PROFILES[settlementId];
    if (!profile) return 1;
    if (profile.specialization.surplusItems.includes(itemCode)) {
      return profile.specialization.surplusMultiplier ?? 0.7;
    }
    if (profile.specialization.deficitItems.includes(itemCode)) {
      return profile.specialization.deficitMultiplier ?? 1.5;
    }
    return 1;
  }
}
