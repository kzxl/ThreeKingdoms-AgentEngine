/**
 * Migration 082: wilderness and city scopes for the map registry.
 *
 * Adds `map_scope`, normalized local coordinates, icon/scene keys and the
 * player's current sub-location. Only `URBAN` rows are city hotspots; the other
 * kinds are wilderness locations served by the local map.
 */

module.exports = {
  id: '082-map-scopes',
  description: 'Add map scope, local coordinates and current_sub_location',
  up(db) {
    const hasSubLocations = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='location_sublocations'"
    ).get();
    if (hasSubLocations) {
      const columns = db.prepare('PRAGMA table_info(location_sublocations)').all().map(row => row.name);
      const add = (name, ddl) => {
        if (!columns.includes(name)) db.exec(`ALTER TABLE location_sublocations ADD COLUMN ${name} ${ddl};`);
      };
      add('map_scope', "TEXT NOT NULL DEFAULT 'CITY'");
      add('local_x', 'REAL');
      add('local_y', 'REAL');
      add('icon_key', 'TEXT');
      add('scene_key', 'TEXT');

      const rows = db.prepare(
        `SELECT s.sub_location_id, s.location_id, s.name_vi, s.kind, p.scene_key
         FROM location_sublocations s
         LEFT JOIN master_poi_scenes p ON p.poi_name = s.name_vi
         ORDER BY s.location_id, s.sort_order;`
      ).all();
      const byLocation = new Map();
      for (const row of rows) {
        if (!byLocation.has(row.location_id)) byLocation.set(row.location_id, []);
        byLocation.get(row.location_id).push(row);
      }

      const iconFor = (name, kind) => {
        const text = String(name || '');
        if (kind === 'URBAN') {
          if (/Chợ|Thị|Thương/.test(text)) return 'market';
          if (/Tửu|Trà/.test(text)) return 'tavern';
          if (/Thiết|Lò|Rèn|Xưởng/.test(text)) return 'forge';
          if (/Lôi Đài|Giáo Trường/.test(text)) return 'arena';
          if (/Phủ|Trạch|Vườn|Nhà/.test(text)) return 'residence';
          if (/Nha|Cung|Điện|Doanh|Trấn|Thự/.test(text)) return 'government';
          return 'city';
        }
        if (/Sơn|Đạo|Cốc|Lĩnh|Đèo|Quan|Ải|Hiểm/.test(text)) return 'mountain';
        if (/Giang|Hồ|Thủy|Bến|Cảng|Suối|Đầm|Phà/.test(text)) return 'water';
        if (/Rừng|Lâm/.test(text)) return 'forest';
        if (/Trại|Doanh|Đồn|Lũy/.test(text)) return 'lair';
        if (/Trang|Viên|Điền/.test(text)) return 'farm';
        return 'wild';
      };

      const update = db.prepare(`
        UPDATE location_sublocations
        SET map_scope = ?, local_x = ?, local_y = ?, icon_key = ?, scene_key = ?
        WHERE sub_location_id = ?;
      `);
      for (const [locationId, list] of byLocation.entries()) {
        const wilderness = list.filter(row => row.kind !== 'URBAN');
        const urban = list.filter(row => row.kind === 'URBAN');
        urban.forEach((row, index) => {
          const x = 0.28 + (index % 3) * 0.22;
          const y = 0.30 + Math.floor(index / 3) * 0.22;
          update.run('CITY', Number(x.toFixed(3)), Number(y.toFixed(3)), iconFor(row.name_vi, row.kind), row.scene_key || null, row.sub_location_id);
        });
        wilderness.forEach((row, index) => {
          const count = Math.max(1, wilderness.length);
          const angle = (Math.PI * 2 * index) / count;
          const radius = count === 1 ? 0.18 : 0.34;
          const x = 0.5 + Math.cos(angle) * radius;
          const y = 0.5 + Math.sin(angle) * radius;
          update.run('WILDERNESS', Number(x.toFixed(3)), Number(y.toFixed(3)), iconFor(row.name_vi, row.kind), row.scene_key || null, row.sub_location_id);
        });
      }
    }

    const hasPlayer = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_state'"
    ).get();
    const hasMasterLocations = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_locations'"
    ).get();
    if (hasPlayer) {
      const columns = db.prepare('PRAGMA table_info(player_state)').all().map(row => row.name);
      if (!columns.includes('current_sub_location')) {
        db.exec('ALTER TABLE player_state ADD COLUMN current_sub_location TEXT;');
      }
      if (hasMasterLocations) {
        db.exec(`
          UPDATE player_state
          SET current_sub_location = (
            SELECT default_sub_loc FROM master_locations
            WHERE location_id = player_state.current_location
               OR location_id = (
                 SELECT location_id FROM master_locations
                 WHERE lower(name_vi) = lower(player_state.current_location)
                 LIMIT 1
               )
            LIMIT 1
          )
          WHERE current_sub_location IS NULL;
        `);
      }
    }
  }
};
