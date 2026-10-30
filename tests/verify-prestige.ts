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

    // 6. NPC fame is written to the existing progression table.
    const npcId = db.queryOne<any>('SELECT npc_id FROM npc_personal_progression LIMIT 1;')?.npc_id;
    assert(npcId, 'need at least one NPC progression row');
    const npcBefore = service.getFame(npcId);
    const npcAward = service.award(npcId, { rawGain: 100, reason: 'TEST_NPC_DEED', gameDate: '184-05-04' });
    assert.strictEqual(service.getFame(npcId), npcAward.after, 'NPC fame must persist in the progression row');
    assert(npcAward.after >= npcBefore, 'NPC fame must not decrease on an award');
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
