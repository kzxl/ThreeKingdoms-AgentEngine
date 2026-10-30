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
import { SETTLEMENT_PROFILES } from './regional-market.service';
import { nextId } from '../../shared/id-generator';

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

  public getLocalMultiplier(settlementId: string, itemCode: string): number {
    const specialization = SETTLEMENT_PROFILES[settlementId]
      ? this.specializationMultiplier(settlementId, itemCode)
      : 1;
    return Math.max(0.5, Math.min(2, specialization * this.getStockMultiplier(settlementId, itemCode)));
  }

  /** Monthly drift: stock reverts toward demand with a small seeded shock. */
  public driftSettlement(settlementId: string, gameDate?: string): number {
    const rows = this.db.query<any>(
      'SELECT item_code, stock, demand FROM settlement_market_state WHERE settlement_id = ?;',
      [settlementId]
    );
    if (rows.length === 0) return 0;
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
            Number((this.specializationMultiplier(settlementId, row.item_code) * stockMultiplier).toFixed(3))
          ]
        );
      }
    });
    return rows.length;
  }

  public getMarketPulse(settlementId: string, itemLimit = 30): any[] {
    const states = this.db.query<any>(
      'SELECT item_code, stock, demand, updated_at FROM settlement_market_state WHERE settlement_id = ? ORDER BY item_code LIMIT ?;',
      [settlementId, Math.max(1, Math.min(60, itemLimit))]
    );
    return states.map(state => {
      const stockMultiplier = Math.max(0.5, Math.min(2, Math.sqrt(Number(state.demand) / Math.max(1, Number(state.stock)))));
      const history = this.db.query<any>(
        'SELECT game_date, stock, demand, stock_multiplier FROM settlement_market_history WHERE settlement_id = ? AND item_code = ? ORDER BY game_date DESC, rowid DESC LIMIT 12;',
        [settlementId, state.item_code]
      ).reverse();
      return {
        itemCode: state.item_code,
        stock: Number(state.stock),
        demand: Number(state.demand),
        stockMultiplier: Number(stockMultiplier.toFixed(3)),
        localMultiplier: Number((this.specializationMultiplier(settlementId, state.item_code) * stockMultiplier).toFixed(3)),
        pressure: state.stock < state.demand * 0.7 ? 'SCARCE' : state.stock > state.demand * 1.3 ? 'SURPLUS' : 'NORMAL',
        history
      };
    });
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
