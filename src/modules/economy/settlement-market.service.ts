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
  public driftSettlement(settlementId: string): number {
    const rows = this.db.query<any>(
      'SELECT item_code, stock, demand FROM settlement_market_state WHERE settlement_id = ?;',
      [settlementId]
    );
    if (rows.length === 0) return 0;
    const rng = RngService.forDomain(this.db, 'settlement-market');
    this.db.transaction(() => {
      for (const row of rows) {
        const stock = Math.max(10, Math.min(500, Number(row.stock) + (Number(row.demand) - Number(row.stock)) * 0.1 + (rng.nextFloat() - 0.5) * 10));
        const demand = Math.max(10, Math.min(500, Number(row.demand) + (rng.nextFloat() - 0.5) * 6));
        this.db.execute(
          'UPDATE settlement_market_state SET stock = ?, demand = ?, updated_at = CURRENT_TIMESTAMP WHERE settlement_id = ? AND item_code = ?;',
          [Number(stock.toFixed(1)), Number(demand.toFixed(1)), settlementId, row.item_code]
        );
      }
    });
    return rows.length;
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
