/**
 * Per-NPC market pricing: affinity raises the bid and lowers the ask; attribute
 * preferences make weapons worth more to a warrior and food worth more to a
 * merchant.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-npc-pricing-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare("DELETE FROM npc_relationship_deltas WHERE npc_id IN ('NPC-0002','NPC-0003');").run();
  db.prepare("DELETE FROM npc_trade_preferences WHERE npc_id IN ('NPC-0002','NPC-0003');").run();
  const insertDelta = db.prepare(`
    INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
    VALUES (?, '185-06-01', ?, ?, 'Friend', 'pricing test');
  `);
  insertDelta.run('NPC-0002', 75, 100);
  insertDelta.run('NPC-0003', -20, 20);
  db.close();
}

async function run(): Promise<void> {
  console.log('=== NPC pricing ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pricing = require('../src/modules/market/npc-pricing');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);

  const friendly = pricing.npcAffinity(db, 'NPC-0002');
  const cold = pricing.npcAffinity(db, 'NPC-0003');
  assert(friendly > cold, 'affinity must follow relationship deltas');
  assert(pricing.relationshipMultiplier(friendly) > pricing.relationshipMultiplier(cold));

  // Warrior preference: weapons/tools bid above food; ask below food.
  const weapon = pricing.npcTradePreference(db, 'NPC-0002', 'MILITARY_EQUIPMENT');
  const food = pricing.npcTradePreference(db, 'NPC-0002', 'FOOD_STUFF');
  assert(weapon.bidMultiplier > food.bidMultiplier, 'warrior must prefer weapons');
  assert(weapon.askMultiplier < food.askMultiplier, 'warrior must discount weapons');

  const friendlyBid = pricing.npcBidMultiplier(db, 'NPC-0002', 'MILITARY_EQUIPMENT');
  const coldBid = pricing.npcBidMultiplier(db, 'NPC-0003', 'MILITARY_EQUIPMENT');
  assert(friendlyBid >= coldBid, 'friendly NPC must bid at least as high');
  assert(friendlyBid <= 1.30 && coldBid >= 0.95, 'bid must stay inside the cap');

  const friendlyAsk = pricing.npcAskMultiplier(db, 'NPC-0002', 'MILITARY_EQUIPMENT');
  const coldAsk = pricing.npcAskMultiplier(db, 'NPC-0003', 'MILITARY_EQUIPMENT');
  assert(friendlyAsk <= coldAsk, 'friendly NPC must ask no more than a cold one');
  assert(friendlyAsk >= 0.75 && coldAsk <= 1.35, 'ask must stay inside the band');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: affinity and category preferences price the same good differently.');
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
  run().then(() => cleanup()).catch(error => {
    console.error(error);
    cleanup();
    process.exit(1);
  });
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
