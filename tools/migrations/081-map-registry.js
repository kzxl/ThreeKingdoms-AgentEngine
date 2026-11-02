/**
 * Migration 081: normalize sub-locations into one map registry table.
 *
 * `master_locations.sub_locations` was a JSON array consumed by one client file
 * and one API. `location_sublocations` gives every place a stable id, a parent
 * location and a URBAN/WILDERNESS kind so the map, POIs and resource nodes can
 * resolve through one source.
 */

module.exports = {
  id: '081-map-registry',
  description: 'Normalize location sub-locations into location_sublocations',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS location_sublocations (
        sub_location_id TEXT PRIMARY KEY,
        location_id TEXT NOT NULL,
        name_vi TEXT NOT NULL,
        name_en TEXT,
        kind TEXT NOT NULL DEFAULT 'URBAN'
          CHECK (kind IN ('URBAN','WILDERNESS','WATER','ROAD','RUINS')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        tile_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_location_sublocations_parent
        ON location_sublocations(location_id, sort_order);
    `);

    const hasMaster = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_locations'"
    ).get();
    if (!hasMaster) return;

    db.exec('DELETE FROM location_sublocations;');
    const insert = db.prepare(`
      INSERT OR REPLACE INTO location_sublocations
        (sub_location_id, location_id, name_vi, name_en, kind, sort_order)
      VALUES (?, ?, ?, NULL, ?, ?);
    `);
    const rows = db.prepare(
      'SELECT location_id, sub_locations FROM master_locations ORDER BY location_id;'
    ).all();
    for (const row of rows) {
      let names = [];
      try { names = JSON.parse(row.sub_locations || '[]'); } catch { names = []; }
      if (!Array.isArray(names)) continue;
      names.forEach((name, index) => {
        const text = String(name || '').trim();
        if (!text) return;
        const kind = /Sơn|Đạo|Cốc|Lĩnh|Giang|Hồ|Thủy|Rừng|Quan|Ải|Bến|Cảng|Đèo|Suối|Đầm|Trại|Hiểm/i.test(text)
          ? 'WILDERNESS'
          : 'URBAN';
        insert.run(
          `SUB-${row.location_id}-${String(index + 1).padStart(2, '0')}`,
          row.location_id,
          text,
          kind,
          index
        );
      });
    }
  }
};
