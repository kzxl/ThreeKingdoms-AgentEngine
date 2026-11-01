/**
 * Logistics risk: a thin escort near an active bandit lair loses cargo; a
 * stronger escort deters it. Freight insurance pays a claim once, and replaying
 * the same day does not ambush twice.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { FreightService } from '../src/modules/market/freight.service';
import { SettlementMarketService } from '../src/modules/economy/settlement-market.service';
import { resolveLogisticsAmbush } from '../src/shared/logistics-risk';
import { addGameDays } from '../src/shared/game-date';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-logistics-risk-'));
const TEST_DB = path.join(TMP, 'session.db');
const DATE = '185-06-01';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = ?, active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run(DATE);
  db.prepare(`
    UPDATE player_state SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
      current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare('DELETE FROM freight_contracts;').run();
  db.prepare('DELETE FROM freight_shipments;').run();
  db.prepare('DELETE FROM bandit_strongholds;').run();
  db.prepare("DELETE FROM world_day_ledger WHERE system = 'freight';").run();
  db.prepare("DELETE FROM cashflow_ledger WHERE category IN ('Logistics/FreightInsurance','Logistics/InsuranceClaim');").run();
  db.close();
}

function run(): void {
  console.log('=== Logistics risk and freight insurance ===');
  seed();

  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const freight = FreightService.forDatabase(db);
  const market = SettlementMarketService.forDatabase(db);

  const contracts = freight.listContracts('zhuo_xian', DATE);
  assert(contracts.length > 0, 'a freight contract must be available');
  const contract = contracts.find(row => Number(row.travelDays) >= 4) || contracts[0];
  market.getState(contract.fromSettlementId, contract.itemCode);
  db.execute(
    'UPDATE settlement_market_state SET stock = ? WHERE settlement_id = ? AND item_code = ?;',
    [Number(contract.quantity) + 20, contract.fromSettlementId, contract.itemCode]
  );

  db.execute(
    `INSERT INTO bandit_strongholds
      (stronghold_id, name_vi, location_near, bandit_chief_name, bandit_power, plundered_wealth, bounty_reward, status)
     VALUES ('SH-TEST', 'Ổ Phỉ Thử Nghiệm', ?, 'Thử Tướng', 350, 0, 100, 'ACTIVE');`,
    [contract.toSettlementId]
  );

  const cashBefore = Number(db.queryOne<{ c: number }>(
    "SELECT liquid_cash AS c FROM player_state WHERE player_id = 'PLY-0001';"
  )?.c || 0);
  const shipment = freight.accept('PLY-0001', contract.contractId, 'MILITIA', DATE, true);
  assert.strictEqual(shipment.insured, true);
  assert(shipment.insurancePremium > 0, 'insurance must charge a premium');
  const cashAfterAccept = Number(db.queryOne<{ c: number }>(
    "SELECT liquid_cash AS c FROM player_state WHERE player_id = 'PLY-0001';"
  )?.c || 0);
  assert(cashAfterAccept < cashBefore, 'guard + insurance must be paid upfront');
  assert(db.queryOne("SELECT 1 AS ok FROM cashflow_ledger WHERE category = 'Logistics/FreightInsurance' LIMIT 1;"));

  const arrival = addGameDays(DATE, shipment.daysRemaining);
  // A day before the midpoint must not resolve or damage the shipment.
  if (shipment.daysRemaining >= 4) {
    freight.advanceByDays(1, addGameDays(DATE, 1));
    const early = db.queryOne<any>(
      'SELECT ambush_resolved, ambush_loss_quantity FROM freight_shipments WHERE shipment_id = ?;',
      [shipment.shipmentId]
    );
    assert.strictEqual(Number(early.ambush_resolved), 0, 'risk must not resolve before the midpoint');
    assert.strictEqual(Number(early.ambush_loss_quantity), 0);
  }

  freight.advanceByDays(shipment.daysRemaining, arrival);
  const after = db.queryOne<{
    quantity: number;
    initial_quantity: number;
    ambush_loss_quantity: number;
    insurance_claim: number;
    ambush_resolved: number;
  }>(
    `SELECT quantity, initial_quantity, ambush_loss_quantity, insurance_claim, ambush_resolved
     FROM freight_shipments WHERE shipment_id = ?;`,
    [shipment.shipmentId]
  );
  assert(after, 'shipment must exist');
  assert.strictEqual(Number(after!.ambush_resolved), 1);
  assert(Number(after!.ambush_loss_quantity) > 0, 'a militia escort must lose cargo');
  assert(Number(after!.quantity) < Number(after!.initial_quantity));
  assert(Number(after!.insurance_claim) > 0, 'insured cargo must pay a claim');
  assert(db.queryOne("SELECT 1 AS ok FROM cashflow_ledger WHERE category = 'Logistics/InsuranceClaim' LIMIT 1;"));
  const stronghold = db.queryOne<{ wealth: number }>(
    "SELECT plundered_wealth AS wealth FROM bandit_strongholds WHERE stronghold_id = 'SH-TEST';"
  );
  assert(Number(stronghold?.wealth) > 0, 'the lair must gain the lost cargo value');

  // Replaying the same arrival day must not ambush or pay a second claim.
  const lossBeforeReplay = Number(after!.ambush_loss_quantity);
  const claimBeforeReplay = Number(after!.insurance_claim);
  freight.advanceByDays(shipment.daysRemaining, arrival);
  const replayed = db.queryOne<any>(
    'SELECT ambush_loss_quantity, insurance_claim FROM freight_shipments WHERE shipment_id = ?;',
    [shipment.shipmentId]
  );
  assert.strictEqual(Number(replayed.ambush_loss_quantity), lossBeforeReplay);
  assert.strictEqual(Number(replayed.insurance_claim), claimBeforeReplay);

  // Guard matrix: 25 veterans deter a 200-power lair; 10 militia do not.
  db.execute("UPDATE bandit_strongholds SET bandit_power = 200 WHERE stronghold_id = 'SH-TEST';");
  const militia = resolveLogisticsAmbush(db, {
    fromSettlementId: contract.toSettlementId,
    toSettlementId: contract.fromSettlementId,
    guardTier: 'MILITIA',
    quantity: 10
  });
  const veteran = resolveLogisticsAmbush(db, {
    fromSettlementId: contract.toSettlementId,
    toSettlementId: contract.fromSettlementId,
    guardTier: 'VETERAN',
    quantity: 10
  });
  assert.strictEqual(militia.ambushed, true);
  assert.strictEqual(veteran.ambushed, false);

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: ambush loss, insurance claim and guard deterrence.');
}

function cleanup(): void {
  try {
    DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
