/**
 * Migration 087: replace the consumption guard with a RAISE ... WHERE form.
 *
 * The CASE-expression form created by 086 was accepted by SQLite but did not
 * abort the update on every build. `SELECT RAISE(ABORT, ...) WHERE <condition>`
 * is the portable trigger form.
 */

module.exports = {
  id: '087-player-bag-guard-raise',
  description: 'Use a portable RAISE ... WHERE bag consumption guard',
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
