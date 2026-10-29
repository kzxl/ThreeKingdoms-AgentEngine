/**
 * Migration 010: complete the market catalog.
 *
 * `master_items` is the only price source, so every item a server action can
 * trade must have a row. Three contextual actions sold licenses and the
 * workshop BOM needs twine, none of which were in the catalog; the actions
 * would 404 and the workshop could not value its own procurement.
 */

const ITEMS = [
  {
    itemCode: 'COM-TWINE',
    nameVi: 'Chỉ Gai Bện',
    nameEn: 'Hemp Twine',
    category: 'Raw Material',
    unitVi: 'Cuộn',
    unitEn: 'Spool',
    baseline: 20,
    current: 20,
    source: 'Nông hộ trồng gai'
  },
  {
    itemCode: 'LIC-LUOYANG',
    nameVi: 'Môn Bài Lương Gia Thương Hội Kinh Sư',
    nameEn: 'Liang Merchant Guild Capital License',
    category: 'License',
    unitVi: 'Bản',
    unitEn: 'Permit',
    baseline: 1000,
    current: 1000,
    source: 'Thị lệnh nha môn Lạc Dương'
  },
  {
    itemCode: 'LIC-JIANYE',
    nameVi: 'Giấy Phép Mậu Dịch Biển & Khai Thác Đan Dương',
    nameEn: 'Maritime Trade & Danyang Mining Permit',
    category: 'License',
    unitVi: 'Bản',
    unitEn: 'Permit',
    baseline: 1000,
    current: 1000,
    source: 'Ngô Đô Thị Lệnh'
  },
  {
    itemCode: 'LIC-JIANGE',
    nameVi: 'Lộ Bài Thông Hành Kiếm Các',
    nameEn: 'Jiange Pass Transit Permit',
    category: 'License',
    unitVi: 'Bản',
    unitEn: 'Permit',
    baseline: 500,
    current: 500,
    source: 'Quan ải Hán Trung'
  }
];

module.exports = {
  id: '010-complete-market-catalog',
  description: 'Add the twine and license rows the trade actions quote',
  up(db) {
    const table = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'")
      .get();
    if (!table) {
      console.log('      (master_items absent — nothing to seed)');
      return;
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO master_items (
        item_code, name_vi, name_en, category, unit_vi, unit_en,
        baseline_peace_price, current_market_price, volatility_index,
        weight_kg, is_contraband, production_source_vi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'LOW', 1.0, 0, ?)
    `);

    let added = 0;
    for (const item of ITEMS) {
      added += insert.run(
        item.itemCode,
        item.nameVi,
        item.nameEn,
        item.category,
        item.unitVi,
        item.unitEn,
        item.baseline,
        item.current,
        item.source
      ).changes;
    }
    console.log(`      added ${added} market catalog row(s)`);
  }
};
