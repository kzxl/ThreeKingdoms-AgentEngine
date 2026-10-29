/**
 * Logic ownership regression suite (docs/LOGIC_DUPLICATION_AUDIT_2026-10-29.md).
 *
 * Locks in the P0/P1 fixes:
 * 1. Modal ids have exactly one renderer; the TS slice never mounts a
 *    legacy-owned id at import time.
 * 2. March days are whole calendar days and grain is charged once.
 * 3. Every calendar advance publishes one WORLD_DAY_TICK per day.
 * 4. Equipment changes conserve warehouse stock and record a movement.
 * 5. Chronicle de-duplication migration collapses and blocks repeats.
 * 6. Caravan/business/world-turn ownership and the single ledger balance.
 * 7. Travel encounters and d20 rolls are seeded (replayable).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { EquipmentSystemService } from '../src/modules/equipment/equipment-system.service';
import { CaravanLogisticsService } from '../src/modules/ecology-logistics/caravan-logistics.service';
import { ensureTurnLedger, isTurnModuleDone, markTurnModuleDone } from '../src/shared/turn-ledger';
import { getPlayerCapital, postCashflowEntry } from '../src/shared/ledger';
import { ACCOUNT_CODES, canonicalAccountCode } from '../src/shared/account-codes';

const { applyActionTime, getClock, normalizeDays } = require('../engine/time-manager');
const { TravelManager } = require('../engine/travel-manager');
const dedupeMigration = require('../tools/migrations/006-dedupe-chat-chronicle');

const ROOT = path.resolve(__dirname, '..');
const LIVE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TEST_DIR = path.join(ROOT, 'tests', '.logic-ownership');
const TEST_DB = path.join(TEST_DIR, 'session.db');
const DATE_PATTERN = /^\d{3,4}-\d{2}-\d{2}$/;
const PROGRESS_MD = path.join(ROOT, 'game', 'PROGRESS.md');
let progressSnapshot: string | null = null;

function sandboxDatabase(): void {
  if (fs.existsSync(PROGRESS_MD)) progressSnapshot = fs.readFileSync(PROGRESS_MD, 'utf8');
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.copyFileSync(LIVE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${LIVE_DB}${suffix}`)) fs.copyFileSync(`${LIVE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
}

function withFakeEventBus<T>(fn: (ticks: Array<{ day: number; month: number; year: number }>) => T): T {
  const ticks: Array<{ day: number; month: number; year: number }> = [];
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = {
    registry: { ctx: { eventBus: { publish: (event: string, payload: any) => {
      if (event === 'WORLD_DAY_TICK') ticks.push(payload);
    } } } }
  };
  try {
    return fn(ticks);
  } finally {
    delete (globalThis as any).__GRAND_STRATEGY_MODULES__;
  }
}

function verifyModalOwnership(): void {
  const source = fs.readFileSync(path.join(ROOT, 'src/client/features/spatial-poi/spatial-poi.modal.ts'), 'utf8');
  assert(
    !/^export const spatialPoiModals = new SpatialPoiModalsManager\(\);/m.test(source),
    'Spatial POI manager must be lazy; an eager singleton mounts legacy-owned modal ids at bundle import'
  );
  assert(
    /export function getSpatialPoiModals\(/.test(source),
    'Spatial POI manager must expose a lazy accessor'
  );

  const legacy = fs.readFileSync(path.join(ROOT, 'public/js/spatial-poi-modals.js'), 'utf8');
  for (const bodyId of ['tavern-modal-body', 'arena-modal-body', 'residence-modal-body']) {
    assert(
      new RegExp(`querySelector\\('#${bodyId}'\\)`).test(legacy),
      `Legacy renderer must rebuild its DOM when #${bodyId} is missing (foreign shell owns the id)`
    );
  }

  const shell = fs.readFileSync(path.join(ROOT, 'src/client/core/modal-shell/modal-shell.ts'), 'utf8');
  for (const id of ['spatial-tavern-modal', 'spatial-arena-modal', 'spatial-residence-modal']) {
    assert(shell.includes(`'${id}'`), `ModalShell must reserve legacy-owned id ${id}`);
  }
  console.log('   ✅ modal ownership: TS slice lazy, legacy rebuilds its own body');
}

function runMarchAndTickChecks(): void {
  const db = new Database(TEST_DB);
  db.prepare(`UPDATE player_state SET strategic_grain = 10, fatigue = 0 WHERE player_id = 'PLY-0001';`).run();
  db.prepare(`UPDATE campaign_meta SET "current_date" = '184-05-02';`).run();
  db.close();

  const manager = new TravelManager(TEST_DB);
  const before = getClock(TEST_DB);
  const observations: any[] = [];
  withFakeEventBus(() => {
    const result = manager.completeMarch({
      targetSubLoc: 'Logic Ownership Test Camp',
      grainCost: 2,
      marchDays: 1.4,
      distanceFromZhuo: 300,
      targetNameVi: 'Trại Kiểm Thử'
    });
    observations.push(result);
  });

  const result = observations[0];
  const after = getClock(TEST_DB);
  assert.strictEqual(result.success, true, 'completeMarch must succeed');
  assert.strictEqual(result.time.advancedDays, 2, '1.4 march days must advance two whole calendar days');
  assert(DATE_PATTERN.test(after.currentDate), `campaign date must be whole days, got ${after.currentDate}`);
  assert.strictEqual(after.currentDate, '184-05-04', `expected 184-05-04, got ${after.currentDate}`);
  assert.strictEqual(Number(after.grain.toFixed(2)), 8, 'route grain must be charged exactly once (10 - 2)');
  assert(after.currentDate !== before.currentDate, 'march must move the clock');

  const dbCheck = new Database(TEST_DB);
  const movementCount = dbCheck.prepare(
    `SELECT COUNT(*) AS c FROM chat_chronicle WHERE game_date = ? AND title = 'Chiến Tuyến Viễn Chinh'`
  ).get(after.currentDate) as any;
  dbCheck.close();
  assert(Number(movementCount.c) === 1, 'march must write exactly one chronicle row on the post-march date');

  // Direct action-time advance: one tick per day, integer date.
  const tickStart = getClock(TEST_DB);
  const ticks: any[] = [];
  withFakeEventBus(bus => {
    const time = applyActionTime(TEST_DB, 'TRADE_BUY', null, 'regression', 3);
    assert.strictEqual(time.advancedDays, 3, 'three requested days must advance three days');
    ticks.push(...bus);
  });
  assert.strictEqual(ticks.length, 3, `expected 3 WORLD_DAY_TICK events, got ${ticks.length}`);
  assert(ticks[0].day === Number(tickStart.currentDate.split('-')[2]) + 1, 'first tick must be the next calendar day');
  assert(DATE_PATTERN.test(getClock(TEST_DB).currentDate), 'action-time date must stay a whole-day date');

  // normalizeDays must never produce a fraction.
  for (const input of [0.5, 1.4, 2.5, '1.2']) {
    const normalized = normalizeDays(input as any);
    assert(Number.isInteger(normalized), `normalizeDays(${input}) must be an integer`);
    assert(normalized >= 1, `normalizeDays(${input}) must consume at least one day`);
  }
  console.log('   ✅ march: whole days, single grain charge, one tick per day');
}

function runInventoryConservation(): void {
  const dbService = DatabaseService.getInstance(TEST_DB);
  const equipment = EquipmentSystemService.getInstance(dbService);

  const itemCode = 'TEST-CONSERVE-BLADE';
  dbService.execute(`DELETE FROM stock_movements WHERE item_code = ?;`, [itemCode]);
  dbService.execute(`DELETE FROM inventory_items WHERE item_code = ?;`, [itemCode]);
  dbService.execute(`DELETE FROM character_equipment WHERE character_id = 'PLY-0001' AND item_code = ?;`, [itemCode]);
  dbService.execute(`DELETE FROM master_items WHERE item_code = ?;`, [itemCode]);
  dbService.execute(
    `INSERT INTO master_items
       (item_code, name_vi, name_en, category, unit_vi, unit_en, baseline_peace_price, current_market_price, stat_modifiers)
     VALUES (?, 'Bảo Đao Kiểm Thử', 'Conservation Test Blade', 'MILITARY_EQUIPMENT', 'Thanh', 'Blade', 100, 100, '{"war":3}');`,
    [itemCode]
  );
  dbService.execute(
    `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
     VALUES (?, 'MILITARY_EQUIPMENT', 'Conservation Test Blade', 1, 100, 'Zhuo Workshop');`,
    [itemCode]
  );

  equipment.equipItem('PLY-0001', 'WEAPON', itemCode);
  const afterEquip = dbService.queryOne<{ quantity: number }>(
    'SELECT quantity FROM inventory_items WHERE item_code = ?;', [itemCode]
  );
  const equipMovement = dbService.queryOne<{ balance_after: number }>(
    'SELECT balance_after FROM stock_movements WHERE item_code = ? ORDER BY rowid DESC LIMIT 1;', [itemCode]
  );
  assert.strictEqual(Number(afterEquip?.quantity), 0, 'equip must remove the item from the warehouse');
  assert.strictEqual(Number(equipMovement?.balance_after), 0, 'equip movement balance must match stock');

  equipment.unequipItem('PLY-0001', itemCode);
  const afterUnequip = dbService.queryOne<{ quantity: number }>(
    'SELECT quantity FROM inventory_items WHERE item_code = ?;', [itemCode]
  );
  const unequipMovement = dbService.queryOne<{ balance_after: number }>(
    'SELECT balance_after FROM stock_movements WHERE item_code = ? ORDER BY rowid DESC LIMIT 1;', [itemCode]
  );
  assert.strictEqual(Number(afterUnequip?.quantity), 1, 'unequip must return the item to the warehouse');
  assert.strictEqual(Number(unequipMovement?.balance_after), 1, 'unequip movement balance must match stock');

  dbService.execute(`DELETE FROM stock_movements WHERE item_code = ?;`, [itemCode]);
  dbService.execute(`DELETE FROM inventory_items WHERE item_code = ?;`, [itemCode]);
  dbService.execute(`DELETE FROM character_equipment WHERE character_id = 'PLY-0001' AND item_code = ?;`, [itemCode]);
  dbService.execute(`DELETE FROM master_items WHERE item_code = ?;`, [itemCode]);
  console.log('   ✅ inventory: equip/unequip conserve stock and write movements');
}

function runChronicleDedupe(): void {
  const memory = new Database(':memory:');
  memory.exec(`
    CREATE TABLE chat_chronicle (
      id TEXT PRIMARY KEY,
      turn_number INTEGER DEFAULT 1,
      game_date TEXT DEFAULT '184-05-02',
      type TEXT NOT NULL,
      speaker TEXT,
      title TEXT,
      avatar TEXT,
      text TEXT NOT NULL
    );
  `);
  const insert = memory.prepare(
    `INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, text) VALUES (?, 6, '184-05-02', 'npc', ?, ?)`
  );
  for (let i = 0; i < 5; i++) insert.run(`dup-${i}`, 'Trương Phi', 'Cạn ly!');

  dedupeMigration.up(memory);
  const remaining = memory.prepare('SELECT COUNT(*) AS c FROM chat_chronicle').get() as any;
  assert.strictEqual(Number(remaining.c), 1, 'migration must collapse identical chronicle rows');
  assert.doesNotThrow(() => insert.run('dup-late', 'Trương Phi', 'Cạn ly!'));
  const afterTrigger = memory.prepare('SELECT COUNT(*) AS c FROM chat_chronicle').get() as any;
  assert.strictEqual(Number(afterTrigger.c), 1, 'duplicate insert trigger must skip identical rows');
  memory.close();
  console.log('   ✅ chronicle: duplicates collapsed and re-inserts blocked');
}

function runCaravanOwnership(): void {
  const dbService = DatabaseService.getInstance(TEST_DB);
  const logistics = CaravanLogisticsService.getInstance(dbService);
  const itemCode = 'TEST-CARAVAN-GOODS';
  const treasury = (factionId: string): number =>
    Number(dbService.queryOne<{ treasury_cash: number }>(
      'SELECT treasury_cash FROM session_factions WHERE faction_id = ?;', [factionId]
    )?.treasury_cash || 0);

  dbService.execute(`DELETE FROM master_items WHERE item_code = ?;`, [itemCode]);
  dbService.execute(
    `INSERT INTO master_items
       (item_code, name_vi, name_en, category, unit_vi, unit_en, baseline_peace_price, current_market_price)
     VALUES (?, 'Hàng Kiểm Thử', 'Test Cargo', 'FINISHED_GOOD', 'Kiện', 'Bale', 100, 100);`,
    [itemCode]
  );
  dbService.execute(
    `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
     VALUES (?, 'Finished Good', 'Test Cargo', 10, 100, 'Zhuo Warehouse')
     ON CONFLICT(item_code) DO UPDATE SET quantity = 10;`,
    [itemCode]
  );
  dbService.execute(`UPDATE player_state SET liquid_cash = 5000 WHERE player_id = 'PLY-0001';`);

  // --- Player-dispatched caravan: ARRIVED, paid by claim exactly once. ---
  const ownerBefore = treasury('FAC-LIANG-CLAN');
  const dispatched = logistics.dispatchCaravan({
    cargoItemCode: itemCode,
    cargoQuantity: 5,
    fromSettlementId: 'zhuo_xian',
    toSettlementId: 'ye_cheng',
    guardTier: 'VETERAN'
  }, 'PLY-0001');
  const caravanId = dispatched.caravanId;
  const inserted = dbService.queryOne<any>('SELECT * FROM trade_caravans WHERE caravan_id = ?;', [caravanId]);
  assert.strictEqual(Number(inserted.dispatched_by_player), 1, 'dispatched caravans must be marked player-owned');

  let status = String(inserted.status);
  for (let day = 0; day < 15 && status !== 'ARRIVED'; day++) {
    logistics.advanceByDays(1);
    status = String(dbService.queryOne<any>(
      'SELECT status FROM trade_caravans WHERE caravan_id = ?;', [caravanId]
    )?.status);
  }
  assert.strictEqual(status, 'ARRIVED', 'a player caravan must stop at ARRIVED for the player to claim');
  assert.strictEqual(treasury('FAC-LIANG-CLAN'), ownerBefore, 'player caravans must not auto-pay the owner faction');

  const cashBefore = Number(dbService.queryOne<{ liquid_cash: number }>(
    `SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';`
  )?.liquid_cash || 0);
  const claim = logistics.claimCaravan(caravanId, 'PLY-0001');
  const cashAfter = Number(dbService.queryOne<{ liquid_cash: number }>(
    `SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';`
  )?.liquid_cash || 0);
  assert(claim.grossRevenue > 0, 'claim must liquidate the cargo');
  assert.strictEqual(cashAfter, cashBefore + claim.grossRevenue, 'claim must credit the player exactly the gross revenue');
  assert.strictEqual(
    String(dbService.queryOne<any>('SELECT status FROM trade_caravans WHERE caravan_id = ?;', [caravanId])?.status),
    'COMPLETED',
    'claimed caravan must become COMPLETED'
  );
  assert.throws(() => logistics.claimCaravan(caravanId, 'PLY-0001'), 'a caravan cannot be claimed twice');

  // --- Faction caravan: settles once, claim is refused. ---
  // FAC-HAN is distinct from the destination ruler (FAC-YUAN-SHAO), so the
  // treasury transfer is observable instead of netting to zero.
  const factionId = 'FAC-HAN';
  const buyerRow = dbService.queryOne<{ ruler_faction_id: string }>(
    `SELECT ruler_faction_id FROM session_settlements WHERE settlement_id = 'ye_cheng';`
  );
  const buyerId = buyerRow?.ruler_faction_id || 'FAC-HAN';
  assert.notStrictEqual(buyerId, factionId, 'test fixture needs owner and destination ruler to differ');
  dbService.execute(`UPDATE session_factions SET treasury_cash = 10000 WHERE faction_id IN (?, ?);`, [factionId, buyerId]);
  const factionBefore = treasury(factionId);
  const buyerBefore = treasury(buyerId);

  dbService.execute(
    `INSERT OR REPLACE INTO trade_caravans
       (caravan_id, caravan_name, owner_faction_id, from_settlement_id, to_settlement_id,
        cargo_item_code, cargo_quantity, cargo_value_qian, guard_troops, route_progress,
        status, created_turn, dispatched_by_player)
     VALUES ('CARAVAN-TEST-FACTION', 'Faction Test', ?, 'zhuo_xian', 'ye_cheng', ?, 10, 1000, 45, 0.95,
             'EN_ROUTE', 1, 0);`,
    [factionId, itemCode]
  );

  assert.throws(
    () => logistics.claimCaravan('CARAVAN-TEST-FACTION', 'PLY-0001'),
    'a faction-owned caravan cannot be claimed by the player'
  );

  logistics.advanceByDays(1);
  const factionRow = dbService.queryOne<any>(
    `SELECT status FROM trade_caravans WHERE caravan_id = 'CARAVAN-TEST-FACTION';`
  );
  assert.strictEqual(String(factionRow?.status), 'SUCCESS_TRADED', 'faction caravans settle on arrival');
  assert.strictEqual(treasury(factionId), factionBefore + 1350, 'owner treasury must receive the 1.35x payout once');
  assert.strictEqual(treasury(buyerId), buyerBefore - 1350, 'destination treasury must fund the payout');
  assert.throws(
    () => logistics.claimCaravan('CARAVAN-TEST-FACTION', 'PLY-0001'),
    'settled faction cargo must never pay the player'
  );

  // --- Clock hook: one progression call per clock advance, never two. ---
  const advancedDays: number[] = [];
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = {
    registry: { ctx: { eventBus: { publish: () => {} } } },
    caravanLogistics: {
      advanceByDays: (days: number) => {
        advancedDays.push(days);
        return { tickedCaravansCount: 0, arrivedCaravansCount: 0, encounters: [], updatedCaravans: [] };
      }
    }
  };
  try {
    applyActionTime(TEST_DB, 'TRADE_BUY', null, 'clock-caravan-hook', 2);
  } finally {
    delete (globalThis as any).__GRAND_STRATEGY_MODULES__;
  }
  assert.deepStrictEqual(advancedDays, [2], 'the clock must advance caravans once, by the elapsed days');

  // The sandbox database is deleted after the run; no teardown deletes needed.
  console.log('   ✅ caravan: one progression, ARRIVED-only player claim, faction settle once');
}

function runBusinessSettlement(): void {
  const { WorkshopEngine } = require('../engine/workshop-engine');
  const { GameplayManager } = require('../engine/gameplay-manager');
  const db = DatabaseService.getInstance(TEST_DB);
  const engine = new WorkshopEngine(TEST_DB);
  const manager = new GameplayManager(TEST_DB);

  const businessId = 'BIZ-MVRXXHXA-426';
  const gameDate = getClock(TEST_DB).currentDate;
  db.execute('UPDATE businesses SET safe_cash = 10000 WHERE business_id = ?;', [businessId]);

  const playerSafeBefore = Number(db.queryOne<{ safe_cash: number }>(
    `SELECT safe_cash FROM player_state WHERE player_id = 'PLY-0001';`
  )?.safe_cash || 0);
  const movementCountBefore = Number(db.queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM stock_movements;'
  )?.c || 0);
  const cashflowCountBefore = Number(db.queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM cashflow_ledger;'
  )?.c || 0);

  const first = engine.simulateMonth(businessId, gameDate, 424242);
  assert(first.success, `workshop cycle must run: ${first.error || ''}`);
  assert(!first.idempotent, 'first workshop cycle of a month must execute');
  assert.strictEqual(
    Number(db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM cashflow_ledger;')?.c),
    cashflowCountBefore,
    'business-internal workshop flows must not enter the player cashflow ledger'
  );
  const safeAfterFirst = Number(db.queryOne<{ safe_cash: number }>(
    'SELECT safe_cash FROM businesses WHERE business_id = ?;', [businessId]
  )?.safe_cash || 0);
  const movementsAfterFirst = Number(db.queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM stock_movements;'
  )?.c || 0);

  const playerSafeAfter = Number(db.queryOne<{ safe_cash: number }>(
    `SELECT safe_cash FROM player_state WHERE player_id = 'PLY-0001';`
  )?.safe_cash || 0);
  assert.strictEqual(playerSafeAfter, playerSafeBefore, 'a business cycle must never rewrite the player safe vault');

  const second = engine.simulateMonth(businessId, gameDate, 424242);
  assert(second.success && second.idempotent === true, 'a second cycle in the same month must be skipped');
  const safeAfterSecond = Number(db.queryOne<{ safe_cash: number }>(
    'SELECT safe_cash FROM businesses WHERE business_id = ?;', [businessId]
  )?.safe_cash || 0);
  const movementsAfterSecond = Number(db.queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM stock_movements;'
  )?.c || 0);
  assert.strictEqual(safeAfterSecond, safeAfterFirst, 'idempotent cycle must not pay twice');
  assert.strictEqual(movementsAfterSecond, movementsAfterFirst, 'idempotent cycle must not produce twice');

  // Closing the same month must not add passive income on top of the cycle.
  const close = manager.advanceTurn({ notes: 'business settlement check' });
  const bizReport = (close.bizReports || []).find((r: any) => r.businessId === businessId);
  assert(bizReport, 'month close must report every business');
  assert.strictEqual(bizReport.skipped, true, 'month close must skip a business already settled by its workshop cycle');
  assert.strictEqual(
    Number(db.queryOne<{ safe_cash: number }>('SELECT safe_cash FROM businesses WHERE business_id = ?;', [businessId])?.safe_cash),
    safeAfterFirst,
    'skipped month close must not change business safe cash'
  );

  // The next month is a new key and settles normally.
  const nextMonth = engine.simulateMonth(businessId, close.nextDate, 424242);
  assert(nextMonth.success && !nextMonth.idempotent, 'a new month must settle again');

  // Dividend withdrawal: one ledger writer, balance = liquid + personal vault.
  const { EnterpriseLaborService } = require('../src/modules/professions/enterprise-labor.service');
  const enterprise = EnterpriseLaborService.getInstance(db);
  const collected = enterprise.collectProfits(businessId, 100);
  assert(collected.success && collected.collectedAmount > 0, 'dividend withdrawal must move business cash to the player');
  const lastRow = db.queryOne<{ balance: number }>(
    'SELECT balance FROM cashflow_ledger ORDER BY rowid DESC LIMIT 1;'
  );
  assert.strictEqual(
    Number(lastRow?.balance),
    getPlayerCapital(db).total,
    'cashflow balance must equal player liquid + personal vault'
  );

  console.log('   ✅ business: one settlement per (business, month), player vault untouched');
}

function runWorldTurnGuards(): void {
  const { GameplayManager } = require('../engine/gameplay-manager');
  const db = DatabaseService.getInstance(TEST_DB);
  ensureTurnLedger(db);

  const turn = 999;
  assert(!isTurnModuleDone(db, turn, 'module.regression'), 'a fresh module turn must not be marked done');
  markTurnModuleDone(db, turn, 'module.regression');
  assert(isTurnModuleDone(db, turn, 'module.regression'), 'completed modules must be recorded in the database');
  markTurnModuleDone(db, turn, 'module.regression');
  assert.strictEqual(
    Number(db.queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM world_turn_ledger WHERE turn_number = 999;`
    )?.c),
    1,
    'marking a module turn twice must not duplicate rows'
  );

  // Static contract: each world module checks the DB ledger and marks completion
  // only after its transaction body.
  const modules = [
    'src/modules/npc-lifecycle/npc-lifecycle.module.ts',
    'src/modules/faction-politics/faction-politics.module.ts',
    'src/modules/ecology-logistics/ecology-logistics.module.ts'
  ];
  for (const relative of modules) {
    const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
    assert(source.includes('isTurnModuleDone(this.db, turnNumber, this.id)'), `${relative} must read the DB guard`);
    const txIndex = source.indexOf('this.db.transaction(() => {', source.indexOf('simulate'));
    const markIndex = source.indexOf('markTurnModuleDone(this.db, turnNumber, this.id)');
    assert(txIndex >= 0 && markIndex > txIndex, `${relative} must mark completion after the transaction body`);
  }

  // A world-module failure aborts the month close without advancing the clock.
  const dateBefore = getClock(TEST_DB).currentDate;
  const manager = new GameplayManager(TEST_DB);
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = {
    registry: { ctx: { eventBus: { publish: () => {} } } },
    npcLifecycle: {
      simulateAllActiveNpcs: () => { throw new Error('regression world failure'); }
    }
  };
  try {
    assert.throws(() => manager.advanceTurn(), /World simulation failed/, 'a world failure must abort the month close');
  } finally {
    delete (globalThis as any).__GRAND_STRATEGY_MODULES__;
  }
  assert.strictEqual(getClock(TEST_DB).currentDate, dateBefore, 'an aborted month close must not advance the campaign clock');

  db.execute('DELETE FROM world_turn_ledger WHERE turn_number = 999;');
  console.log('   ✅ world turn: DB completion markers, failure aborts without advancing');
}

function runStandardizationChecks(): void {
  const { TravelManager } = require('../engine/travel-manager');
  const db = DatabaseService.getInstance(TEST_DB);

  // 1. Ledger helper: one definition (capital + flow), and it writes that row.
  const capitalBefore = getPlayerCapital(db).total;
  const txnId = 'TXN-TEST-LEDGER-DEFINITION';
  const balance = postCashflowEntry(db, {
    txnId,
    gameDate: getClock(TEST_DB).currentDate,
    counterparty: 'Regression',
    category: 'TEST',
    inflow: 25,
    memo: 'ledger definition check'
  });
  assert.strictEqual(balance, capitalBefore + 25, 'postCashflowEntry must default to capital + inflow - outflow');
  const ledgerRow = db.queryOne<{ balance: number }>(
    'SELECT balance FROM cashflow_ledger WHERE txn_id = ?;', [txnId]
  );
  assert.strictEqual(Number(ledgerRow?.balance), capitalBefore + 25, 'ledger row must store the computed balance');
  db.execute('DELETE FROM cashflow_ledger WHERE txn_id = ?;', [txnId]);

  // 2. Travel randomness is seeded: same campaign state + route = same encounter
  //    and same d20, so a run can be replayed.
  const travel = new TravelManager(TEST_DB);
  const firstStart = travel.startTravel('zhuo_xian', 'guang_zong');
  const secondStart = travel.startTravel('zhuo_xian', 'guang_zong');
  assert.strictEqual(firstStart.hasEncounter, secondStart.hasEncounter, 'seeded encounter roll must repeat');
  assert.strictEqual(
    firstStart.encounter?.id,
    secondStart.encounter?.id,
    'seeded encounter selection must repeat'
  );

  if (firstStart.encounter && firstStart.encounter.choices?.length > 0) {
    const choiceId = firstStart.encounter.choices[0].id;
    const resolveArgs = {
      eventId: firstStart.encounter.id,
      choiceId,
      fromNodeId: 'zhuo_xian',
      toNodeId: 'guang_zong'
    };
    const rollA = travel.resolveEncounterChoice({ ...resolveArgs });
    const rollB = travel.resolveEncounterChoice({ ...resolveArgs });
    assert.strictEqual(rollA.d20Roll, rollB.d20Roll, 'seeded d20 must repeat for the same choice');
  }

  console.log('   ✅ standardization: one ledger balance, seeded travel encounters');
}

function runAccountingChecks(): void {
  const db = DatabaseService.getInstance(TEST_DB);
  const legacyCodes = ['CASH-ON-HAND', 'EXP-OPERATING', 'REV-SALES', 'REV-TRADING', 'ASSET-CASH', '101_TIEN_MAT', '301_VON_CHU_SO_HUU', '5001_SALES_REVENUE'];
  for (const code of legacyCodes) {
    assert.notStrictEqual(canonicalAccountCode(code), code, `${code} must map to a canonical account code`);
  }

  const allowed = new Set<string>(Object.values(ACCOUNT_CODES));
  const rows = db.query<{ account_code: string }>('SELECT DISTINCT account_code FROM account_journal;');
  for (const row of rows) {
    assert(allowed.has(row.account_code), `account_journal contains non-canonical code ${row.account_code}`);
  }
  console.log(`   ✅ accounting: ${rows.length} distinct codes, all canonical`);
}

function run(): void {
  console.log('=== Logic ownership & duplication regression ===');
  sandboxDatabase();
  try {
    verifyModalOwnership();
    runMarchAndTickChecks();
    runInventoryConservation();
    runChronicleDedupe();
    runCaravanOwnership();
    runBusinessSettlement();
    runWorldTurnGuards();
    runStandardizationChecks();
    runAccountingChecks();
    console.log('=== PASSED ===');
  } finally {
    // Caravan dispatch/claim sync game/PROGRESS.md from the sandbox; restore the
    // live projection so a direct run (outside test-runner) cannot desync it.
    if (progressSnapshot !== null) fs.writeFileSync(PROGRESS_MD, progressSnapshot, 'utf8');
    DatabaseService.closePath(TEST_DB);
    require('../engine/db-adapter').closeConnections();
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch (error: any) {
      // Windows may still hold a handle for a moment; the directory is
      // gitignored, so a leftover copy is harmless.
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
    }
  }
}

run();
