/**
 * Per-city personal bag reads.
 *
 * `inventory_items` is the aggregate store used by crafting, quests and
 * equipment. `player_bag_by_location` records where the player physically
 * carries each item; migration 084 mirrors quantity changes into the current
 * city automatically. Trade/warehouse/caravan paths use this helper to reject
 * using goods that are sitting in another city.
 */

import { DatabaseService } from '../core/database';

export function resolvePlayerLocationId(db: DatabaseService, playerId = 'PLY-0001'): string {
  const player = db.queryOne<{ current_location: string; current_sub_location: string }>(
    'SELECT current_location, current_sub_location FROM player_state WHERE player_id = ? LIMIT 1;',
    [playerId]
  );
  if (!player) return 'LOC-0001';

  // A canonical LOC id is an explicit city override used by travel/tests; a
  // display name ("Vườn Đào") falls through to the sub-location lookup.
  if (/^LOC-\d+/i.test(player.current_location || '')) return player.current_location;

  if (player.current_sub_location) {
    const sub = db.queryOne<{ location_id: string }>(
      'SELECT location_id FROM location_sublocations WHERE name_vi = ? OR sub_location_id = ? LIMIT 1;',
      [player.current_sub_location, player.current_sub_location]
    );
    if (sub?.location_id) return String(sub.location_id);
  }

  if (player.current_location) {
    const loc = db.queryOne<{ location_id: string }>(
      'SELECT location_id FROM master_locations WHERE location_id = ? OR name_vi = ? LIMIT 1;',
      [player.current_location, player.current_location]
    );
    if (loc?.location_id) return String(loc.location_id);
    if (/^LOC-\d+/i.test(player.current_location)) return player.current_location;
  }
  return 'LOC-0001';
}

export function getBagQuantity(
  db: DatabaseService,
  locationId: string,
  itemCode: string
): number {
  const row = db.queryOne<{ quantity: number }>(
    'SELECT quantity FROM player_bag_by_location WHERE location_id = ? AND item_code = ? LIMIT 1;',
    [locationId, itemCode]
  );
  return Number(row?.quantity || 0);
}

export function getBagRows(db: DatabaseService, locationId: string): Array<{
  itemCode: string;
  quantity: number;
  unitCostBasis: number;
}> {
  return db.query<any>(
    `SELECT item_code, quantity, unit_cost_basis
       FROM player_bag_by_location
      WHERE location_id = ? AND quantity > 0
      ORDER BY item_code;`,
    [locationId]
  ).map(row => ({
    itemCode: String(row.item_code),
    quantity: Number(row.quantity),
    unitCostBasis: Number(row.unit_cost_basis || 0)
  }));
}

export function assertBagQuantity(
  db: DatabaseService,
  locationId: string,
  itemCode: string,
  quantity: number,
  cityName = ''
): number {
  const available = getBagQuantity(db, locationId, itemCode);
  if (available < quantity) {
    throw new Error(
      `Túi tại ${cityName || locationId} chỉ có ${available} ${itemCode}; ` +
      `hàng ở thành khác phải được vận chuyển tới trước.`
    );
  }
  return available;
}
