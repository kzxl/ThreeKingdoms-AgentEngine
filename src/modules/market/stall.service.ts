/**
 * Player market stall.
 *
 * The player stocks goods at a settlement; each elapsed campaign day a few NPCs
 * in that settlement spend their personal cash on listings priced at or below
 * the local market quote. Sales write player cashflow, NPC personal cash, local
 * market stock and an append-only `stall_sales` record.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextSequentialId } from '../../shared/id-generator';
import { postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { consumeInventoryItem, restoreInventoryItem } from '../../shared/inventory-movement';
import { getMarketItem } from '../../shared/market-price-book';
import { RegionalMarketService } from '../economy/regional-market.service';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';
import { npcBidMultiplier } from './npc-pricing';
import { addGameDays } from '../../shared/game-date';
import { hasProcessedDay, markProcessedDay } from '../../shared/day-ledger';

const OPEN_FEE = 20;

export interface StallListingView {
  listingId: string;
  itemCode: string;
  itemNameVi: string;
  quantity: number;
  unitPrice: number;
  marketPrice: number;
  status: string;
}

export interface StallSaleView {
  saleId: string;
  npcId: string;
  npcNameVi: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  totalCash: number;
  gameDate: string;
}

export class StallService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): StallService {
    return new StallService(db);
  }

  private currentDate(): string {
    return this.db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;')?.d || '184-05-02';
  }

  private resolveSettlement(settlementId?: string): string {
    if (settlementId) return settlementId;
    const location = this.db.queryOne<{ current_location: string }>(
      "SELECT current_location FROM player_state WHERE player_id = 'PLY-0001' LIMIT 1;"
    )?.current_location || 'LOC-0001';
    return LOC_TO_NODE_MAP[location] || location;
  }

  private settlementLocations(settlementId: string): string[] {
    const locations: string[] = [];
    for (const [loc, node] of Object.entries(LOC_TO_NODE_MAP)) {
      if (node === settlementId) locations.push(loc);
    }
    return locations;
  }

  private marketPrice(settlementId: string, itemCode: string): number {
    return new RegionalMarketService(this.db).calculateSettlementPrice(settlementId, itemCode, this.currentDate());
  }

  public getStall(characterId = 'PLY-0001'): any {
    const stall = this.db.queryOne<any>(
      "SELECT * FROM player_stalls WHERE owner_id = ? AND status = 'OPEN' ORDER BY created_date DESC LIMIT 1;",
      [characterId]
    );
    if (!stall) return null;
    const listings = this.db.query<any>(
      `SELECT l.*, mi.name_vi
       FROM stall_listings l
       LEFT JOIN master_items mi ON mi.item_code = l.item_code
       WHERE l.stall_id = ? AND l.quantity > 0
       ORDER BY l.unit_price ASC, l.item_code ASC;`,
      [stall.stall_id]
    ).map(row => ({
      listingId: row.listing_id,
      itemCode: row.item_code,
      itemNameVi: row.name_vi || row.item_code,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      marketPrice: this.marketPrice(stall.settlement_id, row.item_code),
      status: row.status,
      sourceType: row.source_type || 'BAG',
      warehouseId: row.warehouse_id || null
    }));
    const sales = this.db.query<any>(
      'SELECT * FROM stall_sales WHERE stall_id = ? ORDER BY rowid DESC LIMIT 12;',
      [stall.stall_id]
    ).map(row => ({
      saleId: row.sale_id,
      npcId: row.npc_id,
      npcNameVi: row.npc_name_vi,
      itemCode: row.item_code,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      totalCash: Number(row.total_cash),
      gameDate: row.game_date
    }));
    return {
      stallId: stall.stall_id,
      ownerId: stall.owner_id,
      settlementId: stall.settlement_id,
      nameVi: stall.name_vi,
      status: stall.status,
      createdDate: stall.created_date,
      listings,
      recentSales: sales
    };
  }

  public openStall(characterId: string, settlementId: string | undefined, name: string | undefined, gameDate: string): any {
    const settlement = this.resolveSettlement(settlementId);
    const existing = this.db.queryOne<any>(
      'SELECT * FROM player_stalls WHERE owner_id = ? AND settlement_id = ? LIMIT 1;',
      [characterId, settlement]
    );
    if (existing && existing.status === 'OPEN') return this.getStall(characterId);

    const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
      'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
      [characterId]
    );
    if (!player) throw new Error(`Không tìm thấy nhân vật ${characterId}.`);
    if (Number(player.liquid_cash || 0) < OPEN_FEE) {
      throw new Error(`Cần ${OPEN_FEE} Quan để mở quầy.`);
    }

    const stallId = existing?.stall_id || nextSequentialId(this.db, 'player_stalls', 'STALL', gameDate);
    return this.db.transaction(() => {
      if (!existing) {
        const newLiquid = Number(player.liquid_cash || 0) - OPEN_FEE;
        const balance = newLiquid + Number(player.safe_cash || 0);
        this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, characterId]);
        const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', gameDate);
        postDoubleEntry(this.db, {
          txnId,
          gameDate,
          counterparty: 'Chợ địa phương',
          category: 'Trade/StallOpen',
          outflow: OPEN_FEE,
          balance,
          memo: `Mở quầy tại ${settlement}`,
          debitAccount: ACCOUNT_CODES.operatingExpense,
          creditAccount: ACCOUNT_CODES.cashMobile
        });
      }
      this.db.execute(
        `INSERT INTO player_stalls (stall_id, owner_id, settlement_id, name_vi, status, created_date)
         VALUES (?, ?, ?, ?, 'OPEN', ?)
         ON CONFLICT(owner_id, settlement_id) DO UPDATE SET status = 'OPEN', updated_at = CURRENT_TIMESTAMP;`,
        [stallId, characterId, settlement, name || `Quầy ${characterId}`, gameDate]
      );
      return this.getStall(characterId);
    });
  }

  private findOpenStall(characterId: string, stallId?: string, settlementId?: string): any {
    if (stallId) {
      const row = this.db.queryOne<any>(
        "SELECT * FROM player_stalls WHERE stall_id = ? AND owner_id = ? AND status = 'OPEN' LIMIT 1;",
        [stallId, characterId]
      );
      if (!row) throw new Error('Quầy không tồn tại hoặc đã đóng.');
      return row;
    }
    if (settlementId) {
      const row = this.db.queryOne<any>(
        "SELECT * FROM player_stalls WHERE owner_id = ? AND settlement_id = ? AND status = 'OPEN' LIMIT 1;",
        [characterId, settlementId]
      );
      if (!row) throw new Error(`Không có quầy mở tại ${settlementId}.`);
      return row;
    }
    const rows = this.db.query<any>(
      "SELECT * FROM player_stalls WHERE owner_id = ? AND status = 'OPEN' ORDER BY created_date DESC;",
      [characterId]
    );
    if (rows.length === 0) throw new Error('Hãy mở quầy trước khi niêm yết hàng.');
    if (rows.length > 1) {
      throw new Error('Bạn có nhiều quầy đang mở; hãy truyền stallId hoặc settlementId.');
    }
    return rows[0];
  }

  public listItem(
    characterId: string,
    itemCode: string,
    quantity: number,
    unitPrice: number,
    gameDate: string,
    source: 'BAG' | 'WAREHOUSE' = 'BAG',
    warehouseId?: string,
    stallId?: string,
    settlementId?: string
  ): any {
    const stall = this.findOpenStall(characterId, stallId, settlementId);
    const qty = Math.max(0.1, Number(quantity) || 0);
    const price = Math.max(1, Math.round(Number(unitPrice) || 0));
    const item = getMarketItem(this.db, itemCode);
    if (!item) throw new Error(`Mặt hàng ${itemCode} không tồn tại.`);
    const sourceType = source === 'WAREHOUSE' ? 'WAREHOUSE' : 'BAG';
    if (sourceType === 'WAREHOUSE' && !warehouseId) throw new Error('warehouseId is required for a warehouse listing.');

    return this.db.transaction(() => {
      const existing = this.db.queryOne<any>(
        'SELECT * FROM stall_listings WHERE stall_id = ? AND item_code = ? LIMIT 1;',
        [stall.stall_id, itemCode]
      );
      if (existing && (existing.source_type || 'BAG') !== sourceType) {
        throw new Error('Mặt hàng này đang niêm yết từ nguồn khác; hãy đóng quầy hoặc bán hết trước.');
      }

      if (sourceType === 'WAREHOUSE') {
        const warehouse = this.db.queryOne<any>(
          `SELECT * FROM warehouses
           WHERE warehouse_id = ? AND owner_id = ? AND settlement_id = ? LIMIT 1;`,
          [warehouseId, characterId, stall.settlement_id]
        );
        if (!warehouse) throw new Error('Kho không thuộc thành của quầy hoặc không do bạn sở hữu.');
        if (warehouse.status !== 'ACTIVE') throw new Error('Kho đã hết hạn; hãy gia hạn trước.');
        if (warehouse.ownership_type === 'RENTED' && warehouse.lease_until && String(warehouse.lease_until) < gameDate) {
          this.db.execute("UPDATE warehouses SET status = 'EXPIRED' WHERE warehouse_id = ?;", [warehouseId]);
          throw new Error('Kho đã hết hạn; hãy gia hạn trước.');
        }
        const stock = this.db.queryOne<{ quantity: number }>(
          'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ? LIMIT 1;',
          [warehouseId, itemCode]
        );
        if (!stock || Number(stock.quantity) < qty) throw new Error(`Kho không đủ ${itemCode}.`);
        this.db.execute(
          'UPDATE warehouse_stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ? AND item_code = ?;',
          [qty, warehouseId, itemCode]
        );
      } else {
        consumeInventoryItem(this.db, {
          itemCode,
          quantity: qty,
          reason: 'STALL_STOCK',
          gameDate,
          refTxn: `STALL-${stall.stall_id}`
        });
      }

      if (existing) {
        this.db.execute(
          `UPDATE stall_listings
           SET quantity = quantity + ?, unit_price = ?, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
           WHERE listing_id = ?;`,
          [qty, price, existing.listing_id]
        );
      } else {
        const listingId = nextSequentialId(this.db, 'stall_listings', 'LST', gameDate);
        this.db.execute(
          `INSERT INTO stall_listings
            (listing_id, stall_id, item_code, quantity, unit_price, status, source_type, warehouse_id)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?);`,
          [listingId, stall.stall_id, itemCode, qty, price, sourceType, warehouseId || null]
        );
      }
      return this.getStall(characterId);
    });
  }

  public closeStall(characterId: string, gameDate: string, stallId?: string, settlementId?: string): any {
    let stall: any;
    try {
      stall = this.findOpenStall(characterId, stallId, settlementId);
    } catch (error: any) {
      if (/Hãy mở quầy/.test(error.message)) return { closed: false, returned: [] };
      throw error;
    }
    return this.db.transaction(() => {
      const rows = this.db.query<any>(
        'SELECT * FROM stall_listings WHERE stall_id = ? AND quantity > 0;',
        [stall.stall_id]
      );
      const returned: any[] = [];
      for (const row of rows) {
        if ((row.source_type || 'BAG') === 'WAREHOUSE' && row.warehouse_id) {
          const warehouse = this.db.queryOne<any>(
            'SELECT * FROM warehouses WHERE warehouse_id = ? AND owner_id = ? LIMIT 1;',
            [row.warehouse_id, characterId]
          );
          if (!warehouse) throw new Error('Kho nguồn của mặt hàng này không còn tồn tại.');
          const used = Number(this.db.queryOne<{ v: number }>(
            'SELECT COALESCE(SUM(quantity), 0) AS v FROM warehouse_stock WHERE warehouse_id = ?;',
            [row.warehouse_id]
          )?.v || 0);
          if (used + Number(row.quantity) > Number(warehouse.capacity)) {
            throw new Error(`Kho ${warehouse.name_vi} không đủ sức chứa để nhận lại hàng; hãy rút bớt hàng trước.`);
          }
          const existing = this.db.queryOne<any>(
            'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ? LIMIT 1;',
            [row.warehouse_id, row.item_code]
          );
          if (existing) {
            this.db.execute(
              'UPDATE warehouse_stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ? AND item_code = ?;',
              [Number(row.quantity), row.warehouse_id, row.item_code]
            );
          } else {
            this.db.execute(
              'INSERT INTO warehouse_stock (warehouse_id, item_code, quantity, unit_cost_basis) VALUES (?, ?, ?, 0);',
              [row.warehouse_id, row.item_code, Number(row.quantity)]
            );
          }
          returned.push({ itemCode: row.item_code, quantity: Number(row.quantity), sourceType: 'WAREHOUSE' });
        } else {
          restoreInventoryItem(this.db, {
            itemCode: row.item_code,
            quantity: Number(row.quantity),
            reason: 'STALL_RETURN',
            gameDate,
            refTxn: `STALL-${stall.stall_id}`,
            location: `Kho ${stall.settlement_id}`
          });
          returned.push({ itemCode: row.item_code, quantity: Number(row.quantity), sourceType: 'BAG' });
        }
      }
      this.db.execute("UPDATE stall_listings SET quantity = 0, status = 'SOLD_OUT' WHERE stall_id = ?;", [stall.stall_id]);
      this.db.execute("UPDATE player_stalls SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE stall_id = ?;", [stall.stall_id]);
      return { closed: true, returned };
    });
  }

  private buyers(settlementId: string, characterId: string): any[] {
    const locations = this.settlementLocations(settlementId);
    if (locations.length === 0) return [];
    const placeholders = locations.map(() => '?').join(',');
    // arch-guard:allow-sql-interpolation — placeholders only, one per settlement location.
    return this.db.query<any>(
      `SELECT npp.npc_id, npp.personal_cash, mc.name_vi
       FROM npc_personal_progression npp
       JOIN master_characters mc ON mc.npc_id = npp.npc_id
       WHERE mc.baseline_location IN (${placeholders})
         AND npp.npc_id <> ?
         AND npp.personal_cash > 0
       ORDER BY npp.personal_cash DESC, npp.npc_id ASC
       LIMIT 12;`,
      [...locations, characterId]
    );
  }

  private simulateDay(stall: any, gameDate: string): any[] {
    const sales: any[] = [];
    const buyers = this.buyers(stall.settlement_id, stall.owner_id);
    if (buyers.length === 0) return sales;
    const used = new Set<string>();
    const rng = RngService.forDomain(this.db, 'stall-sale');
    const listings = this.db.query<any>(
      "SELECT * FROM stall_listings WHERE stall_id = ? AND status = 'ACTIVE' AND quantity > 0 ORDER BY unit_price ASC;",
      [stall.stall_id]
    );

    for (const listing of listings) {
      const marketPrice = this.marketPrice(stall.settlement_id, listing.item_code);
      const item = getMarketItem(this.db, listing.item_code);
      if (marketPrice <= 0 || !item) continue;

      for (const buyer of buyers) {
        if (used.has(buyer.npc_id)) continue;
        const maxBuyerPrice = Math.round(
          marketPrice * npcBidMultiplier(this.db, buyer.npc_id, item.category)
        );
        const price = Number(listing.unit_price);
        if (price > maxBuyerPrice) continue;
        const affordable = Math.floor(Number(buyer.personal_cash) / price);
        if (affordable < 1) continue;
        const want = Math.min(
          Number(listing.quantity),
          1 + Math.floor(rng.nextFloat() * 3),
          affordable
        );
        if (want < 0.1) continue;
        const total = Math.round(want * price);
        const saleId = nextSequentialId(this.db, 'stall_sales', 'SALE', gameDate);
        const buyerName = String(buyer.name_vi || buyer.npc_id);

        this.db.transaction(() => {
          const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
            'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
            [stall.owner_id]
          );
          const newLiquid = Number(player?.liquid_cash || 0) + total;
          this.db.execute(
            'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
            [newLiquid, stall.owner_id]
          );
          const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', gameDate);
          postDoubleEntry(this.db, {
            txnId,
            gameDate,
            counterparty: buyerName,
            category: 'Trade/StallSale',
            inflow: total,
            balance: newLiquid + Number(player?.safe_cash || 0),
            memo: `Bán ${want} ${listing.item_code} cho ${buyerName}`,
            debitAccount: ACCOUNT_CODES.cashMobile,
            creditAccount: ACCOUNT_CODES.salesRevenue
          });
          this.db.execute(
            'UPDATE npc_personal_progression SET personal_cash = MAX(0, personal_cash - ?) WHERE npc_id = ?;',
            [total, buyer.npc_id]
          );
          const remaining = Math.max(0, Number(listing.quantity) - want);
          this.db.execute(
            `UPDATE stall_listings SET quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE listing_id = ?;`,
            [remaining, remaining > 0 ? 'ACTIVE' : 'SOLD_OUT', listing.listing_id]
          );
          this.db.execute(
            `INSERT INTO stall_sales
              (sale_id, stall_id, npc_id, npc_name_vi, item_code, quantity, unit_price, total_cash, game_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [saleId, stall.stall_id, buyer.npc_id, buyerName, listing.item_code, want, price, total, gameDate]
          );
        });

        used.add(buyer.npc_id);
        listing.quantity = Math.max(0, Number(listing.quantity) - want);
        sales.push({
          saleId,
          npcId: buyer.npc_id,
          npcNameVi: buyerName,
          itemCode: listing.item_code,
          quantity: want,
          unitPrice: price,
          totalCash: total
        });
        if (Number(listing.quantity) <= 0) break;
      }
    }
    return sales;
  }

  public advanceByDays(days: number, gameDate?: string): { sales: any[]; totalCash: number } {
    const dayCount = Math.max(0, Math.floor(Number(days) || 0));
    if (dayCount === 0) return { sales: [], totalCash: 0 };
    const date = gameDate || this.currentDate();
    const stalls = this.db.query<any>(
      "SELECT * FROM player_stalls WHERE status = 'OPEN';"
    );
    const sales: any[] = [];
    const startDate = addGameDays(date, -(dayCount - 1));
    for (let day = 0; day < dayCount; day += 1) {
      const dayDate = addGameDays(startDate, day);
      if (hasProcessedDay(this.db, 'stall', dayDate)) continue;
      const daySales: any[] = [];
      this.db.transaction(() => {
        for (const stall of stalls) {
          daySales.push(...this.simulateDay(stall, dayDate));
        }
        markProcessedDay(this.db, 'stall', dayDate, { sales: daySales.length });
      });
      sales.push(...daySales);
    }
    const totalCash = sales.reduce((sum, sale) => sum + Number(sale.totalCash || 0), 0);
    return { sales, totalCash };
  }
}
