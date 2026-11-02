/**
 * Migration 089: prefer an explicit LOC id in `current_location`.
 *
 * Travel and tests sometimes set `current_location = 'LOC-0002'` while leaving
 * a stale display name in `current_sub_location`. The LOC id is an explicit
 * city override; a display name still falls through to the sub-location lookup.
 */

module.exports = {
  id: '089-player-location-view-locid',
  description: 'Resolve current city from an explicit LOC id before the sub-location name',
  up(db) {
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
      return;
    }
    if (hasSubLocations && hasMasterLocations) {
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
      return;
    }
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
};
