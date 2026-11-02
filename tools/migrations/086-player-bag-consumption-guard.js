/**
 * Migration 086: forbid consuming goods that are not in the current city bag.
 *
 * The mirror triggers in 084 keep the bag in sync, but a consumer in city A
 * could still decrement the aggregate inventory of an item held in city B. This
 * BEFORE UPDATE guard aborts that update instead of letting the bag and the
 * aggregate diverge.
 */

module.exports = {
  id: '086-player-bag-consumption-guard',
  description: 'Block inventory consumption from a city that does not hold the goods',
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
