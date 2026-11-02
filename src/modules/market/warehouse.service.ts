/**
 * Settlement warehouses.
 *
 * `inventory_items` is the personal bag; `warehouse_stock` is per settlement.
 * Renting or buying a warehouse gives capacity; deposit/withdraw move quantity
 * between the two stores and keep a stock movement for conservation.
 */

import { DatabaseService } from '../../core/database';
import { nextSequentialId } from '../../shared/id-generator';
import { postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { consumeInventoryItem, restoreInventoryItem } from '../../shared/inventory-movement';
import { addGameDays } from '../../shared/game-date';
import { assertBagQuantity, resolvePlayerLocationId } from '../../shared/player-bag';
import { NODE_TO_LOC_MAP } from '../ecology-logistics/spatial-registry';

const RENT_CASH = 300;
const PURCHASE_PRICE = 2000;
const LEASE_DAYS = 90;
const DEFAULT_CAPACITY = 300;

export class WarehouseService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): WarehouseService {
    return new WarehouseService(db);
  }

  private capacityUsed(warehouseId: string): number {
    const row = this.db.queryOne<{ v: number }>(
      'SELECT COALESCE(SUM(quantity), 0) AS v FROM warehouse_stock WHERE warehouse_id = ?;',
      [warehouseId]
    );
    return Number(row?.v || 0);
  }

  private warehouseRow(warehouseId: string, ownerId: string): any {
    const row = this.db.queryOne<any>(
      'SELECT * FROM warehouses WHERE warehouse_id = ? AND owner_id = ? LIMIT 1;',
      [warehouseId, ownerId]
    );
    if (!row) throw new Error('Không tìm thấy kho này hoặc bạn không sở hữu.');
    return row;
  }

  private assertUsable(row: any, gameDate: string): void {
    if (row.status !== 'ACTIVE') throw new Error('Kho đã hết hạn; hãy gia hạn trước.');
    if (row.ownership_type === 'RENTED' && row.lease_until && String(row.lease_until) < gameDate) {
      this.db.execute("UPDATE warehouses SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ?;", [row.warehouse_id]);
      throw new Error('Kho đã hết hạn; hãy gia hạn trước.');
    }
  }

  public listWarehouses(ownerId = 'PLY-0001', gameDate?: string): any[] {
    const date = gameDate || this.currentDate();
    const rows = this.db.query<any>('SELECT * FROM warehouses WHERE owner_id = ? ORDER BY settlement_id;', [ownerId]);
    return rows.map(row => {
      if (row.ownership_type === 'RENTED' && row.lease_until && String(row.lease_until) < date && row.status === 'ACTIVE') {
        this.db.execute("UPDATE warehouses SET status = 'EXPIRED' WHERE warehouse_id = ?;", [row.warehouse_id]);
        row.status = 'EXPIRED';
      }
      return {
        warehouseId: row.warehouse_id,
        settlementId: row.settlement_id,
        nameVi: row.name_vi,
        ownershipType: row.ownership_type,
        capacity: Number(row.capacity),
        usedCapacity: Number(this.capacityUsed(row.warehouse_id).toFixed(1)),
        rentCash: Number(row.rent_cash),
        purchasePrice: Number(row.purchase_price),
        leaseUntil: row.lease_until,
        status: row.status
      };
    });
  }

  public getWarehouse(ownerId: string, warehouseId: string, gameDate?: string): any {
    const date = gameDate || this.currentDate();
    const row = this.warehouseRow(warehouseId, ownerId);
    if (row.ownership_type === 'RENTED' && row.lease_until && String(row.lease_until) < date && row.status === 'ACTIVE') {
      this.db.execute("UPDATE warehouses SET status = 'EXPIRED' WHERE warehouse_id = ?;", [warehouseId]);
      row.status = 'EXPIRED';
    }
    const items = this.db.query<any>(
      `SELECT ws.item_code, ws.quantity, ws.unit_cost_basis, mi.name_vi, mi.category
       FROM warehouse_stock ws
       LEFT JOIN master_items mi ON mi.item_code = ws.item_code
       WHERE ws.warehouse_id = ? AND ws.quantity > 0
       ORDER BY ws.item_code;`,
      [warehouseId]
    ).map(item => ({
      itemCode: item.item_code,
      itemNameVi: item.name_vi || item.item_code,
      category: item.category,
      quantity: Number(item.quantity),
      unitCostBasis: Number(item.unit_cost_basis)
    }));
    return {
      warehouseId: row.warehouse_id,
      settlementId: row.settlement_id,
      nameVi: row.name_vi,
      ownershipType: row.ownership_type,
      capacity: Number(row.capacity),
      usedCapacity: Number(this.capacityUsed(warehouseId).toFixed(1)),
      rentCash: Number(row.rent_cash),
      purchasePrice: Number(row.purchase_price),
      leaseUntil: row.lease_until,
      status: row.status,
      items
    };
  }

  private currentDate(): string {
    return this.db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;')?.d || '184-05-02';
  }

  private pay(ownerId: string, amount: number, gameDate: string, category: string, memo: string, debitAccount: string): void {
    const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
      'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
      [ownerId]
    );
    if (!player) throw new Error(`Không tìm thấy nhân vật ${ownerId}.`);
    if (Number(player.liquid_cash || 0) < amount) throw new Error(`Cần ${amount} Quan.`);
    const newLiquid = Number(player.liquid_cash || 0) - amount;
    this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, ownerId]);
    const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', gameDate);
    postDoubleEntry(this.db, {
      txnId,
      gameDate,
      counterparty: 'Chủ kho địa phương',
      category,
      outflow: amount,
      balance: newLiquid + Number(player.safe_cash || 0),
      memo,
      debitAccount,
      creditAccount: ACCOUNT_CODES.cashMobile
    });
  }

  public rent(ownerId: string, settlementId: string, gameDate: string, capacity = DEFAULT_CAPACITY): any {
    const existing = this.db.queryOne<any>(
      'SELECT * FROM warehouses WHERE owner_id = ? AND settlement_id = ? LIMIT 1;',
      [ownerId, settlementId]
    );
    if (existing?.ownership_type === 'OWNED') throw new Error('Bạn đã sở hữu kho tại thành này.');
    const warehouseId = existing?.warehouse_id || nextSequentialId(this.db, 'warehouses', 'WH', gameDate);
    // Re-renting an active lease extends it instead of discarding the remaining
    // days and restarting from today.
    const leaseBase = existing?.lease_until && String(existing.lease_until) >= gameDate
      ? String(existing.lease_until)
      : gameDate;
    const leaseUntil = addGameDays(leaseBase, LEASE_DAYS);
    return this.db.transaction(() => {
      this.pay(ownerId, RENT_CASH, gameDate, 'Trade/WarehouseRent', `Thuê kho tại ${settlementId}`, ACCOUNT_CODES.operatingExpense);
      this.db.execute(
        `INSERT INTO warehouses
          (warehouse_id, owner_id, settlement_id, name_vi, ownership_type, capacity,
           rent_cash, purchase_price, lease_until, status, created_date)
         VALUES (?, ?, ?, ?, 'RENTED', ?, ?, ?, ?, 'ACTIVE', ?)
         ON CONFLICT(owner_id, settlement_id) DO UPDATE SET
           status = 'ACTIVE', lease_until = excluded.lease_until, capacity = excluded.capacity,
           updated_at = CURRENT_TIMESTAMP;`,
        [
          warehouseId, ownerId, settlementId, `Kho ${settlementId}`,
          Math.max(DEFAULT_CAPACITY, Number(capacity) || DEFAULT_CAPACITY),
          RENT_CASH, PURCHASE_PRICE,
          leaseUntil, gameDate
        ]
      );
      return this.getWarehouse(ownerId, warehouseId, gameDate);
    });
  }

  public buy(ownerId: string, settlementId: string, gameDate: string): any {
    const existing = this.db.queryOne<any>(
      'SELECT * FROM warehouses WHERE owner_id = ? AND settlement_id = ? LIMIT 1;',
      [ownerId, settlementId]
    );
    if (existing?.ownership_type === 'OWNED') throw new Error('Bạn đã sở hữu kho tại thành này.');
    const warehouseId = existing?.warehouse_id || nextSequentialId(this.db, 'warehouses', 'WH', gameDate);
    return this.db.transaction(() => {
      this.pay(ownerId, PURCHASE_PRICE, gameDate, 'Trade/WarehousePurchase', `Mua kho tại ${settlementId}`, ACCOUNT_CODES.fixedAssets);
      this.db.execute(
        `INSERT INTO warehouses
          (warehouse_id, owner_id, settlement_id, name_vi, ownership_type, capacity,
           rent_cash, purchase_price, lease_until, status, created_date)
         VALUES (?, ?, ?, ?, 'OWNED', ?, ?, ?, NULL, 'ACTIVE', ?)
         ON CONFLICT(owner_id, settlement_id) DO UPDATE SET
           ownership_type = 'OWNED', status = 'ACTIVE', lease_until = NULL,
           capacity = MAX(capacity, excluded.capacity), updated_at = CURRENT_TIMESTAMP;`,
        [
          warehouseId, ownerId, settlementId, `Kho ${settlementId}`,
          DEFAULT_CAPACITY, RENT_CASH, PURCHASE_PRICE, gameDate
        ]
      );
      return this.getWarehouse(ownerId, warehouseId, gameDate);
    });
  }

  public renew(ownerId: string, warehouseId: string, gameDate: string): any {
    const row = this.warehouseRow(warehouseId, ownerId);
    if (row.ownership_type === 'OWNED') throw new Error('Kho sở hữu không cần gia hạn.');
    const leaseBase = row.lease_until && String(row.lease_until) >= gameDate
      ? String(row.lease_until)
      : gameDate;
    const leaseUntil = addGameDays(leaseBase, LEASE_DAYS);
    return this.db.transaction(() => {
      this.pay(ownerId, RENT_CASH, gameDate, 'Trade/WarehouseRent', `Gia hạn kho ${warehouseId}`, ACCOUNT_CODES.operatingExpense);
      this.db.execute(
        "UPDATE warehouses SET status = 'ACTIVE', lease_until = ?, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ?;",
        [leaseUntil, warehouseId]
      );
      return this.getWarehouse(ownerId, warehouseId, gameDate);
    });
  }

  private assertSameCity(row: any, ownerId: string): string {
    const warehouseLocationId = NODE_TO_LOC_MAP[row.settlement_id] || row.settlement_id;
    const playerLocationId = resolvePlayerLocationId(this.db, ownerId);
    if (warehouseLocationId !== playerLocationId) {
      throw new Error('Phải đứng tại thành của kho mới nạp hoặc rút hàng.');
    }
    return playerLocationId;
  }

  public deposit(ownerId: string, warehouseId: string, itemCode: string, quantity: number, gameDate: string): any {
    const row = this.warehouseRow(warehouseId, ownerId);
    this.assertUsable(row, gameDate);
    const locationId = this.assertSameCity(row, ownerId);
    const qty = Math.max(0.1, Number(quantity) || 0);
    const used = this.capacityUsed(warehouseId);
    if (used + qty > Number(row.capacity)) {
      throw new Error(`Kho chỉ còn ${(Number(row.capacity) - used).toFixed(1)} sức chứa.`);
    }
    const stock = this.db.queryOne<{ quantity: number; unit_cost_basis: number }>(
      'SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = ? LIMIT 1;',
      [itemCode]
    );
    if (!stock || Number(stock.quantity) < qty) throw new Error(`Túi nhân không đủ ${itemCode}.`);
    assertBagQuantity(this.db, locationId, itemCode, qty, row.settlement_id);

    return this.db.transaction(() => {
      consumeInventoryItem(this.db, {
        itemCode,
        quantity: qty,
        reason: 'WAREHOUSE_DEPOSIT',
        gameDate,
        refTxn: `WAREHOUSE-${warehouseId}`
      });
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
          `INSERT INTO warehouse_stock (warehouse_id, item_code, quantity, unit_cost_basis)
           VALUES (?, ?, ?, ?);`,
          [warehouseId, itemCode, qty, Number(stock.unit_cost_basis || 0)]
        );
      }
      return this.getWarehouse(ownerId, warehouseId, gameDate);
    });
  }

  public withdraw(ownerId: string, warehouseId: string, itemCode: string, quantity: number, gameDate: string): any {
    const row = this.warehouseRow(warehouseId, ownerId);
    this.assertUsable(row, gameDate);
    this.assertSameCity(row, ownerId);
    const qty = Math.max(0.1, Number(quantity) || 0);
    const stock = this.db.queryOne<{ quantity: number }>(
      'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ? LIMIT 1;',
      [warehouseId, itemCode]
    );
    if (!stock || Number(stock.quantity) < qty) throw new Error(`Kho không đủ ${itemCode}.`);

    return this.db.transaction(() => {
      const remaining = Number(stock.quantity) - qty;
      this.db.execute(
        'UPDATE warehouse_stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = ? AND item_code = ?;',
        [remaining, warehouseId, itemCode]
      );
      restoreInventoryItem(this.db, {
        itemCode,
        quantity: qty,
        reason: 'WAREHOUSE_WITHDRAW',
        gameDate,
        refTxn: `WAREHOUSE-${warehouseId}`,
        location: `Kho ${row.settlement_id}`
      });
      return this.getWarehouse(ownerId, warehouseId, gameDate);
    });
  }
}
