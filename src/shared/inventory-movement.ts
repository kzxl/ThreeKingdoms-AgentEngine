/**
 * ThreeKingdoms-AgentEngine: Inventory Movement Recorder
 * (src/shared/inventory-movement.ts)
 *
 * Every change to `inventory_items.quantity` must be accompanied by a
 * `stock_movements` row whose `balance_after` equals the resulting quantity.
 * The auditor enforces this conservation law, so mutating inventory directly
 * (as equipment equip/unequip used to) silently breaks the ledger.
 */

import { DatabaseService } from '../core/database';

export interface StockMovementInput {
  itemCode: string;
  /** Signed quantity moved (negative for consumption). */
  delta: number;
  /** movement_type stored on the row, e.g. EQUIP / UNEQUIP / PURCHASE_RECEIPT. */
  reason: string;
  gameDate: string;
  refTxn: string;
  unitCost?: number;
}

/**
 * Appends a stock movement for the item's *current* on-hand quantity.
 * Call it after the quantity update inside the same transaction.
 */
export function recordStockMovement(db: DatabaseService, input: StockMovementInput): string {
  const row = db.queryOne<{ quantity: number; unit_cost_basis: number }>(
    'SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = ?;',
    [input.itemCode]
  );
  const balanceAfter = Number(row?.quantity ?? 0);
  const countRow = db.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM stock_movements;');
  const dateCompact = String(input.gameDate).replace(/-/g, '');
  const movId = `MOV-${dateCompact}-${String(Number(countRow?.c || 0) + 1).padStart(6, '0')}`;
  const unitCost = input.unitCost !== undefined ? input.unitCost : Number(row?.unit_cost_basis || 0);

  db.execute(
    `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [movId, input.gameDate, input.itemCode, input.reason, input.delta, unitCost, balanceAfter, input.refTxn]
  );

  return movId;
}

export interface InventoryConsumeInput extends Omit<StockMovementInput, 'delta'> {
  quantity?: number;
  /** Throw when the warehouse cannot cover the quantity (default true). */
  requireStock?: boolean;
}

export interface InventoryRestoreInput extends Omit<StockMovementInput, 'delta'> {
  quantity?: number;
  location?: string;
  category?: string;
  description?: string;
}

/**
 * Removes quantity from the warehouse and records the matching movement.
 * Returns the quantity removed (0 when `requireStock` is false and the item is
 * not stocked).
 */
export function consumeInventoryItem(db: DatabaseService, input: InventoryConsumeInput): number {
  const quantity = Math.max(0, Number(input.quantity ?? 1) || 0);
  if (quantity === 0) return 0;

  const stock = db.queryOne<{ quantity: number; unit_cost_basis: number }>(
    'SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = ?;',
    [input.itemCode]
  );
  if (!stock || Number(stock.quantity) < quantity) {
    if (input.requireStock !== false) {
      throw new Error(`Vật phẩm [${input.itemCode}] không còn trong kho đồ!`);
    }
    return 0;
  }

  db.execute(
    'UPDATE inventory_items SET quantity = quantity - ? WHERE item_code = ?;',
    [quantity, input.itemCode]
  );
  recordStockMovement(db, {
    itemCode: input.itemCode,
    delta: -quantity,
    reason: input.reason,
    gameDate: input.gameDate,
    refTxn: input.refTxn,
    unitCost: input.unitCost ?? Number(stock.unit_cost_basis || 0)
  });
  return quantity;
}

/**
 * Returns quantity to the warehouse (creating the row when absent) and records
 * the matching movement.
 */
export function restoreInventoryItem(db: DatabaseService, input: InventoryRestoreInput): number {
  const quantity = Math.max(0, Number(input.quantity ?? 1) || 0);
  if (quantity === 0) return 0;

  db.execute(
    `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + excluded.quantity;`,
    [
      input.itemCode,
      input.category || 'MILITARY_EQUIPMENT',
      input.description || input.itemCode,
      quantity,
      input.unitCost ?? 0,
      input.location || 'Zhuo Workshop'
    ]
  );
  recordStockMovement(db, {
    itemCode: input.itemCode,
    delta: quantity,
    reason: input.reason,
    gameDate: input.gameDate,
    refTxn: input.refTxn,
    unitCost: input.unitCost
  });
  return quantity;
}
