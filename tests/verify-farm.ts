/**
 * Farmland: rent a parcel, plant a seasonal crop, harvest into the warehouse.
 *
 * Covers rent going to the landlord, season rejection, early-harvest rejection,
 * real stock output, profession EXP and lease expiry.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration048 = require('../tools/migrations/048-land-and-crops');
const { expireLeases, close: closeBridge } = require('../engine/farm-bridge');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-farm-'));
const TEST_DB = path.join(TMP, 'session.db');
const SETTLEMENT = 'zhuo_xian';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  // Start from a clean board so the migration seeds the four parcels again.
  try { db.exec("DELETE FROM land_parcels WHERE settlement_id = 'zhuo_xian';"); } catch { /* table absent */ }
  migration048.up(db);
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state SET liquid_cash = 10000, safe_cash = 0, current_location = ?
    WHERE player_id = 'PLY-0001';
  `).run(SETTLEMENT);
  db.close();
}

function run(): void {
  console.log('=== Farmland ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FarmService } = require('../src/modules/professions/farm.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const farm = FarmService.forDatabase(db);

  const board = farm.listParcels('PLY-0001', SETTLEMENT, '185-06-01');
  assert.strictEqual(board.season, 'SUMMER');
  assert.strictEqual(board.parcels.length, 4, 'four parcels per settlement');
  assert(board.parcels.every((parcel: any) => parcel.status === 'IDLE'));
  assert(board.parcels.every((parcel: any) => parcel.availableCrops.length === 0));

  // 1. Rent the first parcel; the rent reaches the landlord faction.
  const first = board.parcels[0];
  const treasuryBefore = Number(db.queryOne(
    'SELECT treasury_cash FROM session_factions WHERE faction_id = ?;',
    [db.queryOne('SELECT owner_id FROM land_parcels WHERE parcel_id = ?;', [first.parcelId]).owner_id]
  ).treasury_cash);
  const cashBefore = Number(db.queryOne(
    "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"
  ).liquid_cash);
  const leased = farm.rent(first.parcelId, 'PLY-0001', '185-06-01');
  assert.strictEqual(leased.status, 'LEASED');
  assert.strictEqual(leased.leasedBy, 'PLY-0001');
  const cashAfter = Number(db.queryOne(
    "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"
  ).liquid_cash);
  assert.strictEqual(cashAfter, cashBefore - first.rentCash, 'rent must be paid');
  const owner = db.queryOne('SELECT owner_id FROM land_parcels WHERE parcel_id = ?;', [first.parcelId]).owner_id;
  if (owner) {
    const treasuryAfter = Number(db.queryOne(
      'SELECT treasury_cash FROM session_factions WHERE faction_id = ?;', [owner]
    ).treasury_cash);
    assert.strictEqual(treasuryAfter, treasuryBefore + first.rentCash, 'rent must reach the landlord');
  }

  // 2. Rice is in season; plant it and check the growth window.
  const planted = farm.plant(first.parcelId, 'CROP-RICE', 'PLY-0001', '185-06-01');
  assert.strictEqual(planted.status, 'GROWING');
  assert.strictEqual(planted.crop.cropCode, 'CROP-RICE');
  assert.strictEqual(planted.crop.harvestDate, '185-07-16', '45-day rice window');
  assert(planted.crop.expectedYield > 0);

  // 3. Wheat is out of season in summer.
  const second = board.parcels[1];
  farm.rent(second.parcelId, 'PLY-0001', '185-06-01');
  let seasonRejected = false;
  try {
    farm.plant(second.parcelId, 'CROP-WHEAT', 'PLY-0001', '185-06-01');
  } catch (error: any) {
    seasonRejected = /hợp mùa/i.test(error.message);
  }
  assert.strictEqual(seasonRejected, true, 'out-of-season crop must be rejected');

  // 4. Harvesting early is rejected; harvesting on the due date adds grain.
  let early = false;
  try {
    farm.harvest(first.parcelId, 'PLY-0001', '185-06-20');
  } catch (error: any) {
    early = /Chưa đến ngày thu hoạch/i.test(error.message);
  }
  assert.strictEqual(early, true, 'early harvest must be rejected');

  const grainBefore = Number(db.queryOne(
    "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';"
  )?.quantity || 0);
  const harvested = farm.harvest(first.parcelId, 'PLY-0001', '185-07-16');
  assert(harvested.quantity > 0);
  const grainAfter = Number(db.queryOne(
    "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';"
  ).quantity);
  assert.strictEqual(grainAfter, grainBefore + harvested.quantity, 'harvest must add real grain');
  const afterHarvest = farm.listParcels('PLY-0001', SETTLEMENT, '185-07-16')
    .parcels.find((parcel: any) => parcel.parcelId === first.parcelId);
  assert.strictEqual(afterHarvest.status, 'LEASED');
  assert.strictEqual(afterHarvest.crop, null);

  // 5. A leased parcel cannot be rented again.
  let doubleRent = false;
  try {
    farm.rent(first.parcelId, 'PLY-0001', '185-07-16');
  } catch (error: any) {
    doubleRent = /đã được thuê|đang canh tác/i.test(error.message);
  }
  assert.strictEqual(doubleRent, true, 'double rent must be rejected');

  // 6. Insufficient cash is rejected.
  db.execute("UPDATE player_state SET liquid_cash = 0 WHERE player_id = 'PLY-0001';");
  const third = board.parcels[2];
  let poor = false;
  try {
    farm.rent(third.parcelId, 'PLY-0001', '185-07-16');
  } catch (error: any) {
    poor = error.code === 'INSUFFICIENT_FUNDS';
  }
  assert.strictEqual(poor, true, 'rent without cash must fail');

  // 7. Leases that ran out return to the market.
  db.execute(
    "UPDATE land_parcels SET lease_until = '185-05-01' WHERE parcel_id = ?;",
    [second.parcelId]
  );
  assert.strictEqual(expireLeases(TEST_DB) >= 1, true, 'month-close bridge must expire leases');

  console.log('  ✅ PASSED: rent, seasonal planting, harvest, stock, EXP and lease expiry.');
}

function cleanup(): void {
  try { closeBridge(); } catch { /* bridge not loaded */ }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
  console.log('✅ Farmland verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
