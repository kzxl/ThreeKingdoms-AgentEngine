/**
 * Migration 033: DB-driven POI scene registry.
 *
 * Copies every `master_locations.sub_locations` entry into a flat registry with
 * the scene key the runtime should use. The server then reads this table
 * instead of relying on a hardcoded keyword chain.
 */

const LOCATION_SCENE = {
  'LOC-0001': 'Vườn Đào',
  'LOC-0002': 'Kinh Đô Lạc Dương',
  'LOC-0003': 'Quảng Tông Quân Doanh',
  'LOC-0004': 'Bình Nguyên Trọng Trấn',
  'LOC-0005': 'Trường An Cung Phủ',
  'LOC-0006': 'Nghiệp Thành Đại Phủ',
  'LOC-0007': 'Hứa Xương Tướng Phủ',
  'LOC-0008': 'Bắc Bình Soái Phủ',
  'LOC-0009': 'Hạ Phì Thành Lũy',
  'LOC-0010': 'Tương Dương Châu Phủ',
  'LOC-0011': 'Xích Bích Thủy Trại',
  'LOC-0012': 'Giang Lăng Thủy Doanh',
  'LOC-0013': 'Kiến Nghiệp Đô Thành',
  'LOC-0014': 'Hán Trung Thiên Sư Phủ',
  'LOC-0015': 'Thành Đô Ích Châu Phủ',
  'LOC-0016': 'Uyển Thành Nha Môn',
  'LOC-0017': 'Hoài Nam Ngụy Đế Cung',
  'LOC-0018': 'Thượng Đảng Trọng Trấn',
  'LOC-0019': 'Tây Lương Tướng Phủ',
  'LOC-0020': 'Giao Châu Thái Thú Phủ'
};

const KEYWORD_SCENE = [
  ['thiết điếm', 'Thiết Điếm Trác Huyện'],
  ['lò rèn', 'Thiết Điếm Trác Huyện'],
  ['tửu quán', 'Tửu Quán Trác Huyện'],
  ['lôi đài', 'Lôi Đài Giáo Trường'],
  ['giáo trường', 'Lôi Đài Giáo Trường'],
  ['dịch trạm', 'Mã Xa Dịch Trạm'],
  ['mã xa', 'Mã Xa Dịch Trạm'],
  ['tư trạch', 'Tư Trạch Vườn Đào'],
  ['vườn đào', 'Tư Trạch Vườn Đào'],
  ['chợ', 'Chợ Đông Môn'],
  ['xưởng', 'Xưởng Lương Thị'],
  ['chức tác', 'Xưởng Lương Thị']
];

function sceneKeyFor(locationId, poiName) {
  const lower = String(poiName || '').toLowerCase();
  for (const [keyword, scene] of KEYWORD_SCENE) {
    if (lower.includes(keyword)) return scene;
  }
  return LOCATION_SCENE[locationId] || poiName;
}

module.exports = {
  id: '033-poi-scene-registry',
  description: 'Create and seed the DB-driven POI scene registry',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_poi_scenes (
        poi_name TEXT PRIMARY KEY,
        location_id TEXT NOT NULL,
        scene_key TEXT NOT NULL
      );
    `);

    const hasLocations = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_locations';`
    ).get();
    if (!hasLocations) {
      console.log('      master_locations absent; registry left empty');
      return;
    }

    const insert = db.prepare(`
      INSERT OR REPLACE INTO master_poi_scenes (poi_name, location_id, scene_key)
      VALUES (?, ?, ?);
    `);
    let count = 0;
    for (const row of db.prepare(
      'SELECT location_id, sub_locations FROM master_locations;'
    ).all()) {
      let names = [];
      try {
        names = JSON.parse(row.sub_locations || '[]');
      } catch {
        names = [];
      }
      for (const name of names) {
        if (!name) continue;
        insert.run(String(name), row.location_id, sceneKeyFor(row.location_id, name));
        count += 1;
      }
    }
    console.log(`      ${count} POI scene mappings ready`);
  }
};
