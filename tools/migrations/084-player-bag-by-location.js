/**
 * Migration 084: per-city personal bag.
 *
 * `inventory_items` stays the aggregate/global store used by crafting, quests
 * and equipment. `player_bag_by_location` records where the player is actually
 * carrying each item. Triggers mirror quantity changes into the bag of the
 * player's current location, so a good bought in one city is not silently
 * sellable in another.
 */

module.exports = {
  id: '084-player-bag-by-location',
  description: 'Per-city personal bag with inventory mirror triggers',
  up(db) {
    const hasInventory = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='inventory_items'"
    ).get();
    if (!hasInventory) return;

    db.exec(`
      CREATE TABLE IF NOT EXISTS player_bag_by_location (
        location_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        unit_cost_basis INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (location_id, item_code)
      );
      CREATE INDEX IF NOT EXISTS idx_player_bag_location
        ON player_bag_by_location(location_id, quantity);
    `);

    const hasPlayer = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_state'"
    ).get();
    const hasSubLocations = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='location_sublocations'"
    ).get();
    const hasMasterLocations = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_locations'"
    ).get();
    db.exec('DROP VIEW IF EXISTS current_player_location;');
    if (!hasPlayer) {
      db.exec("CREATE VIEW current_player_location AS SELECT 'LOC-0001' AS location_id;");
    } else if (hasSubLocations && hasMasterLocations) {
      db.exec(`
        CREATE VIEW current_player_location AS
        SELECT COALESCE(
          CASE WHEN p.current_location LIKE 'LOC-%' THEN p.current_location END,
          (
            SELECT s.location_id FROM location_sublocations s
            WHERE s.name_vi = p.current_sub_location
               OR s.sub_location_id = p.current_sub_location
            LIMIT 1
          ),
          (
            SELECT m.location_id FROM master_locations m
            WHERE m.location_id = p.current_location
               OR m.name_vi = p.current_location
            LIMIT 1
          ),
          'LOC-0001'
        ) AS location_id
        FROM player_state p
        LIMIT 1;
      `);
    } else {
      db.exec(`
        CREATE VIEW current_player_location AS
        SELECT CASE
          WHEN p.current_location LIKE 'LOC-%' THEN p.current_location
          ELSE 'LOC-0001'
        END AS location_id
        FROM player_state p
        LIMIT 1;
      `);
    }

    // Existing inventory belongs to the city the player is standing in now.
    db.exec(`
      INSERT INTO player_bag_by_location (location_id, item_code, quantity, unit_cost_basis)
      SELECT location_id, item_code, quantity, unit_cost_basis
      FROM inventory_items, current_player_location
      WHERE inventory_items.quantity > 0
      ON CONFLICT(location_id, item_code) DO UPDATE SET
        quantity = excluded.quantity,
        unit_cost_basis = excluded.unit_cost_basis,
        updated_at = CURRENT_TIMESTAMP;
    `);

    db.exec(`
      DROP TRIGGER IF EXISTS inventory_bag_after_insert;
      CREATE TRIGGER inventory_bag_after_insert
      AFTER INSERT ON inventory_items
      WHEN NEW.quantity > 0
      BEGIN
        INSERT INTO player_bag_by_location (location_id, item_code, quantity, unit_cost_basis)
        SELECT location_id, NEW.item_code, NEW.quantity, COALESCE(NEW.unit_cost_basis, 0)
        FROM current_player_location
        WHERE location_id IS NOT NULL
        ON CONFLICT(location_id, item_code) DO UPDATE SET
          quantity = quantity + excluded.quantity,
          unit_cost_basis = CASE
            WHEN excluded.unit_cost_basis > 0 THEN excluded.unit_cost_basis
            ELSE unit_cost_basis
          END,
          updated_at = CURRENT_TIMESTAMP;
      END;

      DROP TRIGGER IF EXISTS inventory_bag_after_update_up;
      CREATE TRIGGER inventory_bag_after_update_up
      AFTER UPDATE OF quantity ON inventory_items
      WHEN NEW.quantity > OLD.quantity
      BEGIN
        INSERT INTO player_bag_by_location (location_id, item_code, quantity, unit_cost_basis)
        SELECT location_id, NEW.item_code, NEW.quantity - OLD.quantity, COALESCE(NEW.unit_cost_basis, 0)
        FROM current_player_location
        WHERE location_id IS NOT NULL
        ON CONFLICT(location_id, item_code) DO UPDATE SET
          quantity = quantity + excluded.quantity,
          updated_at = CURRENT_TIMESTAMP;
      END;

      DROP TRIGGER IF EXISTS inventory_bag_after_update_down;
      CREATE TRIGGER inventory_bag_after_update_down
      AFTER UPDATE OF quantity ON inventory_items
      WHEN NEW.quantity < OLD.quantity
      BEGIN
        UPDATE player_bag_by_location
        SET quantity = MAX(0, quantity - (OLD.quantity - NEW.quantity)),
            updated_at = CURRENT_TIMESTAMP
        WHERE item_code = NEW.item_code
          AND location_id = (SELECT location_id FROM current_player_location);
      END;

      DROP TRIGGER IF EXISTS inventory_bag_after_delete;
      CREATE TRIGGER inventory_bag_after_delete
      AFTER DELETE ON inventory_items
      WHEN OLD.quantity > 0
      BEGIN
        UPDATE player_bag_by_location
        SET quantity = MAX(0, quantity - OLD.quantity),
            updated_at = CURRENT_TIMESTAMP
        WHERE item_code = OLD.item_code
          AND location_id = (SELECT location_id FROM current_player_location);
      END;
    `);
  }
};
