/**
 * Migration 083: infer the current sub-location for legacy saves.
 *
 * Older saves store a place name (for example "Vườn Đào") in
 * `player_state.current_location`, not a LOC id. Resolve it against the
 * normalized sub-locations first, then fall back to the city default.
 */

module.exports = {
  id: '083-current-sub-location-backfill',
  description: 'Backfill player_state.current_sub_location from legacy place names',
  up(db) {
    const hasPlayer = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_state'"
    ).get();
    if (!hasPlayer) return;
    const columns = db.prepare('PRAGMA table_info(player_state)').all().map(row => row.name);
    if (!columns.includes('current_sub_location')) return;
    const hasSubLocations = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='location_sublocations'"
    ).get();
    const hasMasterLocations = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_locations'"
    ).get();
    if (!hasSubLocations || !hasMasterLocations) return;

    db.exec(`
      UPDATE player_state
      SET current_sub_location = COALESCE(
        (
          SELECT s.name_vi FROM location_sublocations s
          WHERE s.name_vi = player_state.current_location
             OR s.name_vi LIKE '%' || player_state.current_location || '%'
             OR player_state.current_location LIKE '%' || s.name_vi || '%'
          ORDER BY length(s.name_vi) ASC
          LIMIT 1
        ),
        (
          SELECT m.default_sub_loc FROM master_locations m
          WHERE m.location_id = player_state.current_location
             OR lower(m.name_vi) = lower(player_state.current_location)
             OR m.name_vi LIKE '%' || player_state.current_location || '%'
          LIMIT 1
        )
      )
      WHERE current_sub_location IS NULL;
    `);
  }
};
