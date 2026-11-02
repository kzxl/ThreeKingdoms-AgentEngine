/**
 * Migration 028: location-aware discovery loot.
 *
 * `discovery_items` was a flat 10-row table. Exploration now filters by a
 * location/POI keyword, and the table gains regional finds across all tiers.
 */

const EXTRA_ITEMS = [
  { itemCode: 'COM-WINE-ZHUO', tier: 1, minFame: 0, weight: 20, location: 'Tửu Quán', poi: null },
  { itemCode: 'RAW-TIMBER-OAK', tier: 1, minFame: 0, weight: 25, location: 'Long Trung', poi: null },
  { itemCode: 'COM-FISH-FRESH', tier: 1, minFame: 0, weight: 25, location: 'Giang Lăng', poi: null },
  { itemCode: 'RAW-IRON-ORE', tier: 1, minFame: 0, weight: 30, location: 'Quảng Tông', poi: null },
  { itemCode: 'COM-GAME-MEAT', tier: 1, minFame: 0, weight: 20, location: 'Thượng Đảng', poi: null },
  { itemCode: 'COM-SALT-SEA', tier: 2, minFame: 500, weight: 12, location: 'Thanh Châu', poi: null },
  { itemCode: 'COM-TEA-DRIED', tier: 2, minFame: 800, weight: 10, location: 'Kiến Nghiệp', poi: null },
  { itemCode: 'COM-GOLD-INGOT', tier: 3, minFame: 2500, weight: 4, location: 'Lạc Dương', poi: null },
  { itemCode: 'WPN-SKY-PIERCER', tier: 3, minFame: 3500, weight: 2, location: 'Thượng Đảng', poi: null },
  { itemCode: 'STEED-WHITE-DRAGON', tier: 4, minFame: 6000, weight: 0.8, location: 'Bắc Bình', poi: null },
  { itemCode: 'STEED-SHADOW-RUNNER', tier: 4, minFame: 6500, weight: 0.7, location: 'Hán Trung', poi: null }
];

module.exports = {
  id: '028-discovery-location-loot',
  description: 'Add location keywords to discovery_items and regional loot',
  up(db) {
    const table = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'discovery_items';`
    ).get();
    if (!table) {
      console.log('      discovery_items absent; nothing to extend');
      return;
    }

    const columns = db.prepare('PRAGMA table_info(discovery_items)').all().map(column => column.name);
    for (const [name, definition] of [
      ['location_keyword', 'TEXT'],
      ['poi_keyword', 'TEXT']
    ]) {
      if (!columns.includes(name)) {
        db.exec(`ALTER TABLE discovery_items ADD COLUMN ${name} ${definition};`);
        console.log(`      discovery_items.${name} added`);
      }
    }

    const hasMaster = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_items';`
    ).get();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO discovery_items
        (item_code, tier, min_fame, weight, location_keyword, poi_keyword)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    let added = 0;
    for (const item of EXTRA_ITEMS) {
      if (hasMaster) {
        const exists = db.prepare('SELECT 1 AS ok FROM master_items WHERE item_code = ?;').get(item.itemCode);
        if (!exists) continue;
      }
      insert.run(item.itemCode, item.tier, item.minFame, item.weight, item.location, item.poi);
      added += 1;
    }
    console.log(`      ${added} regional discovery items ready`);
  }
};
