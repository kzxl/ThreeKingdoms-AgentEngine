/**
 * Prestige scale verification (ROTK XIII-like).
 *
 * Fame is 0..99999 with a 10,000 soft cap; 0 is a weak state, not a loss.
 * The suite checks the pure math, the service writer/ledger and the unified
 * player+NPC view introduced by migration 012.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { PrestigeService } from '../src/modules/progression/prestige.service';
import { SpecialistWorkforceService } from '../src/modules/professions/features/workforce/specialist-workforce.service';
import { FameAttractionService } from '../src/modules/progression/fame-attraction.service';
import { RetainerLoyaltyService } from '../src/modules/progression/retainer-loyalty.service';
import {
  applyFameDecay,
  effectiveFameGain,
  fameRatio,
  getFameTier,
  getNextFameTier
} from '../src/shared/prestige';

const ROOT = path.resolve(__dirname, '..');
const LIVE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-prestige-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== Prestige scale (0–10,000) ===');

  fs.copyFileSync(LIVE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${LIVE_DB}${suffix}`)) fs.copyFileSync(`${LIVE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }

  // 1. Tier boundaries from config/prestige.json.
  assert.strictEqual(getFameTier(0).code, 'NOBODY');
  assert.strictEqual(getFameTier(499).code, 'VILLAGER_RESPECT');
  assert.strictEqual(getFameTier(500).code, 'RIGHTEOUS');
  assert.strictEqual(getFameTier(4999).code, 'FAMOUS_GENERAL');
  assert.strictEqual(getFameTier(5000).code, 'HERO');
  assert.strictEqual(getFameTier(9000).code, 'HEARTS_OF_THE_REALM');
  assert.strictEqual(getNextFameTier(5000)?.minFame, 7000);

  // 2. Normalisation and diminishing returns.
  assert.strictEqual(effectiveFameGain(600, 0), 600);
  assert(effectiveFameGain(600, 5000) < 400, 'high fame must reduce raw gain');
  assert(effectiveFameGain(-5, 100) === 0, 'gains must be positive');
  assert(fameRatio(5000) > 0.7 && fameRatio(5000) < 0.72, '5,000 fame is about 0.71 of the curve');

  // 3. Decay: grace period, then percentage, never below zero.
  assert.strictEqual(applyFameDecay(6000, 6), 6000);
  const decayed = applyFameDecay(6000, 18);
  assert(decayed < 6000 && decayed > 0, 'decay must reduce but not erase fame');
  assert.strictEqual(applyFameDecay(0, 24), 0);

  const db = DatabaseService.getInstance(TEST_DB);
  const service = PrestigeService.forDatabase(db);
  try {
    // 4. The view unifies the player and every NPC without duplicating storage.
    const view = db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM character_prestige;');
    const npcCount = db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM npc_personal_progression;');
    assert.strictEqual(Number(view?.c), Number(npcCount?.c) + 1, 'view must contain player + NPC rows');

    const playerBefore = service.getFame('PLY-0001');
    assert(playerBefore >= 500, 'player starts at the 500 fame baseline');

    // A top-tier manager is visible but locked until fame 1,200.
    const gateWorkforce = new SpecialistWorkforceService(db);
    const lockedManager = gateWorkforce
      .getAvailableSpecialists(undefined, 'PLY-0001')
      .find(candidate => candidate.recommendedRole === 'ACCOUNTANT_MANAGER' && !candidate.isHired);
    if (lockedManager) {
      assert.strictEqual(lockedManager.eligible, false, 'manager must be fame-gated at 500 fame');
      assert(lockedManager.minFame > playerBefore, 'locked reason must name a higher threshold');
      assert.throws(
        () => gateWorkforce.hireSpecialist({
          characterId: 'PLY-0001',
          npcId: lockedManager.npcId,
          businessId: 'BIZ-0001',
          role: lockedManager.recommendedRole
        }),
        /Danh vọng chưa đủ/,
        'hiring below the fame gate must fail'
      );
    }

    const award = service.award('PLY-0001', {
      rawGain: 600,
      reason: 'TEST_CIVIC_DEED',
      sourceId: 'TEST-1',
      gameDate: '184-05-02'
    });
    assert(award.after > playerBefore, 'award must increase fame');
    assert(award.delta < 600, 'diminishing returns must reduce the raw gain');
    assert.strictEqual(service.getFame('PLY-0001'), award.after, 'player fame must persist');

    const event = db.queryOne<any>(
      'SELECT * FROM prestige_events WHERE character_id = ? ORDER BY rowid DESC LIMIT 1;',
      ['PLY-0001']
    );
    assert(event, 'award must append a prestige event');
    assert.strictEqual(Number(event.after_fame), award.after, 'event must record the new fame');

    // 5. Zero fame is not a defeat: the row stays and play continues.
    const drop = service.penalize('PLY-0001', {
      rawGain: 999999,
      reason: 'TEST_TOTAL_LOSS',
      gameDate: '184-05-03'
    });
    assert.strictEqual(drop.after, 0, 'fame floors at zero');
    assert.strictEqual(service.getFame('PLY-0001'), 0, 'zero fame persists');
    assert.strictEqual(getFameTier(0).code, 'NOBODY', 'zero fame is the Unknown tier, not a defeat');

    // Rebuild fame so the hiring gate can be exercised after the zero test.
    service.award('PLY-0001', { rawGain: 2000, reason: 'TEST_RECOVERY', gameDate: '184-05-03' });

    // 6. NPC fame is written to the existing progression table.
    const npcId = db.queryOne<any>('SELECT npc_id FROM npc_personal_progression LIMIT 1;')?.npc_id;
    assert(npcId, 'need at least one NPC progression row');
    const npcBefore = service.getFame(npcId);
    const npcAward = service.award(npcId, { rawGain: 100, reason: 'TEST_NPC_DEED', gameDate: '184-05-04' });
    assert.strictEqual(service.getFame(npcId), npcAward.after, 'NPC fame must persist in the progression row');
    assert(npcAward.after >= npcBefore, 'NPC fame must not decrease on an award');

    // 7. Fame lowers the hiring price; the client cannot set it.
    const workforce = new SpecialistWorkforceService(db);
    const candidates = workforce.getAvailableSpecialists(undefined, 'PLY-0001');
    assert(candidates.length > 0, 'workforce catalog must have candidates');
    for (const candidate of candidates) {
      assert(candidate.effectiveSigningBonus <= candidate.signingBonus, 'fame discount must not raise the price');
      assert(candidate.effectiveSigningBonus >= 1, 'fame discount must not make hiring free');
    }
    const hireable = candidates.find(candidate => !candidate.isHired);
    if (hireable) {
      const hired = workforce.hireSpecialist({
        characterId: 'PLY-0001',
        npcId: hireable.npcId,
        businessId: 'BIZ-0001',
        role: hireable.recommendedRole,
        signingBonus: 1
      });
      assert.strictEqual(hired.signingBonusPaid, hireable.effectiveSigningBonus, 'hire must charge the server quote');
      assert.strictEqual(hired.fameTierCode, getFameTier(service.getFame('PLY-0001')).code, 'hire result must expose the fame tier');
    }

    // 8. Fame attracts people: at hero-tier fame three arrivals appear and are logged.
    service.award('PLY-0001', { rawGain: 8000, reason: 'TEST_FAME_FOR_ARRIVALS', gameDate: '184-05-05' });
    const militiaBefore = Number(db.queryOne<any>('SELECT militia FROM player_state WHERE player_id = ?;', ['PLY-0001'])?.militia || 0);
    const arrivals = FameAttractionService.forDatabase(db).simulateMonthly('PLY-0001', '184-05-30');
    assert.strictEqual(arrivals.arrivals.length, 3, 'hero-tier fame must attract three arrivals');
    assert(arrivals.totalMilitia >= 0, 'arrivals may bring militia');
    assert(arrivals.totalGrain >= 0, 'arrivals may bring grain');
    const militiaAfter = Number(db.queryOne<any>('SELECT militia FROM player_state WHERE player_id = ?;', ['PLY-0001'])?.militia || 0);
    assert.strictEqual(militiaAfter, militiaBefore + arrivals.totalMilitia, 'volunteer militia must be added to player state');
    const logged = db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM fame_arrivals WHERE character_id = ?;', ['PLY-0001']);
    assert.strictEqual(logged?.c, 3, 'every arrival must be logged');
    const specialist = arrivals.arrivals.find(arrival => arrival.kind === 'SPECIALIST');
    assert(specialist, 'fame must attract at least one named specialist from the available pool');
    assert(specialist!.assignedBusinessId, 'a named guest must be auto-assigned when a business exists');
    const guest = db.queryOne<any>('SELECT assigned_role, assigned_business_id FROM npc_state WHERE npc_id = ?;', [specialist!.npcId]);
    assert(guest, 'named guest must become an npc_state retainer');
    assert.strictEqual(guest.assigned_business_id, specialist!.assignedBusinessId, 'guest must be assigned to the business');

    // 9. Low fame can drive an assigned retainer away; every departure is logged.
    const retainer = db.queryOne<any>(
      "SELECT npc_id, name FROM npc_state WHERE assigned_business_id IS NOT NULL AND assigned_role != 'DEPARTED' LIMIT 1;"
    );
    assert(retainer, 'test database must have at least one assigned retainer');
    db.execute('UPDATE player_state SET fame = 0 WHERE player_id = ?;', ['PLY-0001']);
    db.execute('UPDATE npc_state SET loyalty = 20 WHERE npc_id = ?;', [retainer.npc_id]);
    const loyalty = RetainerLoyaltyService.forDatabase(db);
    let departed = false;
    for (let month = 0; month < 60 && !departed; month += 1) {
      const report = loyalty.evaluateMonthly('PLY-0001', '184-05-30');
      departed = report.departures.some(item => item.npcId === retainer.npc_id);
    }
    assert(departed, 'low fame must be able to drive a retainer away');
    const departedNpc = db.queryOne<any>('SELECT assigned_role FROM npc_state WHERE npc_id = ?;', [retainer.npc_id]);
    assert.strictEqual(departedNpc.assigned_role, 'DEPARTED', 'departing retainer must lose the assignment');
    const departureLog = db.queryOne<any>('SELECT * FROM retainer_departures WHERE npc_id = ?;', [retainer.npc_id]);
    assert(departureLog, 'departure must be logged');
    const unrest = db.queryOne<any>(
      "SELECT * FROM unrest_events WHERE npc_id = ? AND source = 'RETAINER' AND event_type = 'DEPARTURE';",
      [retainer.npc_id]
    );
    assert(unrest, 'retainer departure must feed the unified unrest log');
  } finally {
    db.close();
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
    }
  }

  console.log('   ✅ fame tiers, diminishing gains, decay, ledger and unified view agree');
}

run();
