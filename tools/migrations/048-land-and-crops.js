/**
 * Migration 048: rented farmland and seasonal crops.
 *
 * Farming was only a gathering node (work as a labourer). This migration adds
 * land parcels in every settlement and a small crop catalog: rent a parcel,
 * plant a crop in its season, wait for the growth window, then harvest grain
 * into the warehouse.
 */

const CROPS = [
  {
    code: 'CROP-RICE', nameVi: 'Lúa Nước', nameEn: 'Paddy Rice', seasons: 'SPRING,SUMMER',
    growth: 45, seedCost: 30, yieldPerMu: 8, risk: 0.08,
    descriptionVi: 'Lúa nước truyền thống, cần mùa xuân hoặc hạ và đủ nước tưới.'
  },
  {
    code: 'CROP-WHEAT', nameVi: 'Lúa Mì', nameEn: 'Wheat', seasons: 'AUTUMN,SPRING',
    growth: 60, seedCost: 25, yieldPerMu: 7, risk: 0.10,
    descriptionVi: 'Lúa mì phương bắc, gieo mùa thu hoặc xuân, chịu lạnh tốt.'
  },
  {
    code: 'CROP-BEANS', nameVi: 'Đậu Tương', nameEn: 'Soybeans', seasons: 'SUMMER,AUTUMN',
    growth: 30, seedCost: 20, yieldPerMu: 5, risk: 0.06,
    descriptionVi: 'Đậu tương ngắn ngày, cải tạo đất và bổ sung lương thực.'
  },
  {
    code: 'CROP-VEG', nameVi: 'Rau Củ', nameEn: 'Vegetables', seasons: 'SPRING,SUMMER,AUTUMN',
    growth: 20, seedCost: 15, yieldPerMu: 4, risk: 0.05,
    descriptionVi: 'Rau củ ngắn ngày, quay vòng nhanh nhưng sản lượng thấp.'
  }
];

function hasTable(db, table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(table));
}

module.exports = {
  id: '048-land-and-crops',
  description: 'Add seasonal crops and rentable land parcels',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_crops (
        crop_code TEXT PRIMARY KEY,
        name_vi TEXT NOT NULL,
        name_en TEXT NOT NULL,
        seasons TEXT NOT NULL,
        growth_days INTEGER NOT NULL CHECK (growth_days > 0),
        seed_cost_per_mu INTEGER NOT NULL CHECK (seed_cost_per_mu >= 0),
        yield_per_mu REAL NOT NULL CHECK (yield_per_mu > 0),
        yield_item_code TEXT NOT NULL DEFAULT 'COM-GRAIN',
        risk_rate REAL NOT NULL DEFAULT 0.05,
        description_vi TEXT
      );

      CREATE TABLE IF NOT EXISTS land_parcels (
        parcel_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        owner_id TEXT,
        name_vi TEXT NOT NULL,
        name_en TEXT NOT NULL,
        area_mu REAL NOT NULL CHECK (area_mu > 0),
        soil_quality REAL NOT NULL DEFAULT 1.0,
        rent_cash INTEGER NOT NULL CHECK (rent_cash >= 0),
        status TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'LEASED', 'GROWING')),
        leased_by TEXT,
        lease_until TEXT,
        crop_code TEXT,
        planted_date TEXT,
        harvest_date TEXT,
        seed_invested INTEGER NOT NULL DEFAULT 0,
        expected_yield REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_land_parcels_settlement
        ON land_parcels(settlement_id, status, leased_by);
    `);

    const insertCrop = db.prepare(`
      INSERT OR REPLACE INTO master_crops
        (crop_code, name_vi, name_en, seasons, growth_days, seed_cost_per_mu,
         yield_per_mu, yield_item_code, risk_rate, description_vi)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COM-GRAIN', ?, ?);
    `);
    for (const crop of CROPS) {
      insertCrop.run(
        crop.code, crop.nameVi, crop.nameEn, crop.seasons, crop.growth,
        crop.seedCost, crop.yieldPerMu, crop.risk, crop.descriptionVi
      );
    }

    if (!hasTable(db, 'session_settlements')) return;
    const settlements = db.prepare('SELECT settlement_id, ruler_faction_id FROM session_settlements;').all();
    const insertParcel = db.prepare(`
      INSERT OR IGNORE INTO land_parcels
        (parcel_id, settlement_id, owner_id, name_vi, name_en, area_mu, soil_quality, rent_cash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IDLE');
    `);
    const areas = [2, 3, 5, 8];
    const soils = [0.9, 1.0, 1.1, 1.2];
    const rents = [60, 90, 140, 220];
    for (const settlement of settlements) {
      for (let index = 0; index < 4; index += 1) {
        insertParcel.run(
          `LOT-${settlement.settlement_id}-${index + 1}`,
          settlement.settlement_id,
          settlement.ruler_faction_id || null,
          `Thửa Ruộng ${index + 1} ${settlement.settlement_id}`,
          `Farm Parcel ${index + 1}`,
          areas[index],
          soils[index],
          rents[index]
        );
      }
    }
  }
};
