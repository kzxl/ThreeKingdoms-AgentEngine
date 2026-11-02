/**
 * Migration 088: make the bag consumption guard treat a missing bag row as 0.
 *
 * The scalar subquery in 086/087 returned NULL when the city had no row, so the
 * comparison was NULL and the trigger never aborted. COALESCE must wrap the
 * subquery, not the row value.
 */

module.exports = {
  id: '088-player-bag-guard-null',
  description: 'Treat a missing city bag row as zero in the consumption guard',
  up(db) {
    const hasBag = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_bag_by_location'"
    ).get();
    const hasInventory = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='inventory_items'"
    ).get();
    const hasView = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='view' AND name='current_player_location'"
    ).get();
    if (!hasBag || !hasInventory || !hasView) return;

    db.exec(`
      DROP TRIGGER IF EXISTS inventory_bag_before_update_down;
      CREATE TRIGGER inventory_bag_before_update_down
      BEFORE UPDATE OF quantity ON inventory_items
      WHEN NEW.quantity < OLD.quantity
      BEGIN
        SELECT RAISE(ABORT, 'PLAYER_BAG_INSUFFICIENT')
        WHERE COALESCE((
          SELECT quantity FROM player_bag_by_location
          WHERE location_id = (SELECT location_id FROM current_player_location)
            AND item_code = OLD.item_code
        ), 0) < (OLD.quantity - NEW.quantity);
      END;
    `);
  }
};
