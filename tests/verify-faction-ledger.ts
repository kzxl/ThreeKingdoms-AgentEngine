/**
 * Faction/world treasury ledger: opening + inflow - outflow equals treasury.
 *
 * Also covers a real rent flow and shows that a direct treasury write breaks
 * the equation (the auditor would reject it).
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration051 = require('../tools/migrations/051-faction-ledger');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-faction-ledger-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  migration051.up(db);
  db.prepare(`
    UPDATE campaign_meta SET "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state SET liquid_cash = 1000000, current_location = 'zhuo_xian'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.close();
}

function equation(db: Database.Database, factionId: string): { expected: number; actual: number } {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN category = 'OPENING' THEN inflow ELSE 0 END), 0) AS opening,
      COALESCE(SUM(CASE WHEN category <> 'OPENING' THEN inflow ELSE 0 END), 0) AS inflow,
      COALESCE(SUM(outflow), 0) AS outflow
    FROM faction_ledger WHERE faction_id = ?;
  `).get(factionId) as any;
  const actual = Number((db.prepare(
    'SELECT treasury_cash FROM session_factions WHERE faction_id = ?;'
  ).get(factionId) as any).treasury_cash);
  return {
    expected: Number(row.opening || 0) + Number(row.inflow || 0) - Number(row.outflow || 0),
    actual
  };
}

function run(): void {
  console.log('=== Faction ledger ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  const raw = new Database(TEST_DB);
  // 1. Every faction starts with an opening that matches its treasury.
  const factions = raw.prepare('SELECT faction_id FROM session_factions;').all() as Array<{ faction_id: string }>;
  for (const faction of factions) {
    const { expected, actual } = equation(raw, faction.faction_id);
    assert.strictEqual(actual, expected, `${faction.faction_id} opening must equal treasury`);
  }

  // 2. A real rent flow posts LAND_RENT and keeps the equation.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FarmService } = require('../src/modules/professions/farm.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const board = FarmService.forDatabase(db).listParcels('PLY-0001', 'zhuo_xian', '185-06-01');
  const parcel = board.parcels[0];
  const ownerId = (raw.prepare('SELECT owner_id FROM land_parcels WHERE parcel_id = ?;').get(parcel.parcelId) as any).owner_id;
  FarmService.forDatabase(db).rent(parcel.parcelId, 'PLY-0001', '185-06-01');
  const rentEntry = raw.prepare(
    "SELECT inflow FROM faction_ledger WHERE faction_id = ? AND category = 'LAND_RENT' ORDER BY rowid DESC LIMIT 1;"
  ).get(ownerId) as any;
  assert(rentEntry, 'rent must create a LAND_RENT ledger row');
  assert.strictEqual(Number(rentEntry.inflow), parcel.rentCash);
  const afterRent = equation(raw, ownerId);
  assert.strictEqual(afterRent.actual, afterRent.expected, 'rent must keep the world ledger balanced');

  // 3. A direct treasury write breaks the equation (what the audit rejects).
  raw.prepare('UPDATE session_factions SET treasury_cash = treasury_cash + 1 WHERE faction_id = ?;').run(ownerId);
  const drifted = equation(raw, ownerId);
  assert.notStrictEqual(drifted.actual, drifted.expected, 'direct write must show as drift');
  raw.prepare('UPDATE session_factions SET treasury_cash = treasury_cash - 1 WHERE faction_id = ?;').run(ownerId);

  // 4. Outflow is clamped to the available treasury.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { postFactionEntry } = require('../src/shared/faction-ledger');
  raw.prepare('UPDATE session_factions SET treasury_cash = 10 WHERE faction_id = ?;').run(ownerId);
  raw.prepare("INSERT INTO faction_ledger (entry_id, faction_id, game_date, category, inflow, outflow, balance_after, memo) VALUES ('FLE-TEST-CLAMP', ?, '185-06-01', 'TEST', 0, 0, 10, 'reset');").run(ownerId);
  const clamped = postFactionEntry(db, {
    factionId: ownerId,
    gameDate: '185-06-01',
    category: 'TEST_OUTFLOW',
    outflow: 999,
    memo: 'clamp test'
  });
  assert.strictEqual(clamped.outflow, 10, 'outflow cannot exceed treasury');
  assert.strictEqual(clamped.balance, 0);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: opening, rent flow, drift detection and outflow clamp.');
}

function cleanup(): void {
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
  console.log('✅ Faction ledger verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
