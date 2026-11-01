/**
 * NPC income/troop conservation: a commerce turn transfers cash from a buyer,
 * a bandit expedition moves bounty from the lair and recruits from the local
 * garrison, and every mutation has a ledger entry whose balance matches.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { EventBus } from '../src/core/event-bus';
import { NpcLifecycleModule } from '../src/modules/npc-lifecycle/npc-lifecycle.module';
import { postNpcEntry } from '../src/modules/npc-lifecycle/npc-ledger';
import { LOC_TO_NODE_MAP } from '../src/modules/ecology-logistics/spatial-registry';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-npc-conservation-'));
const TEST_DB = path.join(TMP, 'session.db');
const DATE = '185-06-01';
const ACTOR = 'NPC-0011';
const BUYER = 'NPC-0002';

function resetNpc(db: DatabaseService, npcId: string, cash: number, troops: number, ambition: string): void {
  db.execute('DELETE FROM npc_ledger WHERE npc_id = ?;', [npcId]);
  db.execute('DELETE FROM npc_personal_progression WHERE npc_id = ?;', [npcId]);
  db.execute(
    `INSERT INTO npc_personal_progression
      (npc_id, life_ambition, current_focus, personal_cash, prestige, personal_troops, milestone_title)
     VALUES (?, ?, 'Test', ?, 0, ?, 'Test');`,
    [npcId, ambition, cash, troops]
  );
  postNpcEntry(db, {
    npcId,
    gameDate: DATE,
    category: 'OPENING',
    deltaCash: cash,
    deltaTroops: troops,
    balanceCash: cash,
    balanceTroops: troops,
    memoVi: 'Số dư đầu kỳ'
  });
}

function cash(db: DatabaseService, npcId: string): number {
  return Number(db.queryOne<{ c: number }>(
    'SELECT personal_cash AS c FROM npc_personal_progression WHERE npc_id = ?;',
    [npcId]
  )?.c || 0);
}

function troops(db: DatabaseService, npcId: string): number {
  return Number(db.queryOne<{ c: number }>(
    'SELECT personal_troops AS c FROM npc_personal_progression WHERE npc_id = ?;',
    [npcId]
  )?.c || 0);
}

async function run(): Promise<void> {
  console.log('=== NPC income and troop conservation ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute(`UPDATE campaign_meta SET status = 'ACTIVE', "current_date" = ?, active_turn = 16 WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);`, [DATE]);
  db.execute("UPDATE master_characters SET baseline_location = 'LOC-0001' WHERE npc_id = ?;", [ACTOR]);
  const settlementId = LOC_TO_NODE_MAP['LOC-0001'] || 'zhuo_xian';
  db.execute('UPDATE session_settlements SET garrison_troops = 200 WHERE settlement_id = ?;', [settlementId]);

  const npcModule = new NpcLifecycleModule();
  await npcModule.init({ dbPath: TEST_DB, eventBus: EventBus.getInstance() });
    // 1. Commerce transfers cash from a buyer instead of minting it.
    resetNpc(db, ACTOR, 0, 0, 'COMMERCE_TYCOON');
    resetNpc(db, BUYER, 10000, 0, 'MERCHANT');
    const cashBefore = cash(db, ACTOR) + cash(db, BUYER);
    const commerce = npcModule.simulateNpcTurn(ACTOR, 16, DATE, 'COMMERCE_ARBITRAGE');
    assert(commerce, 'commerce turn must return a journey log');
    assert.strictEqual(commerce!.actionType, 'COMMERCE_ARBITRAGE');
    assert(cash(db, ACTOR) > 0, 'the seller must earn cash');
    assert(cash(db, BUYER) < 10000, 'the buyer must pay');
    assert.strictEqual(cash(db, ACTOR) + cash(db, BUYER), cashBefore, 'commerce must conserve NPC cash');
    const sellerEntry = db.queryOne<any>(
      "SELECT * FROM npc_ledger WHERE npc_id = ? AND category = 'COMMERCE_INCOME' ORDER BY rowid DESC LIMIT 1;",
      [ACTOR]
    );
    const buyerEntry = db.queryOne<any>(
      "SELECT * FROM npc_ledger WHERE npc_id = ? AND category = 'COMMERCE_PURCHASE' ORDER BY rowid DESC LIMIT 1;",
      [BUYER]
    );
    assert(sellerEntry && buyerEntry, 'both sides of the transfer must be in npc_ledger');
    assert.strictEqual(Number(sellerEntry.delta_cash), -Number(buyerEntry.delta_cash));
    assert.strictEqual(Number(sellerEntry.balance_cash), cash(db, ACTOR));

    // 2. Bandit bounty comes from the lair and recruits from the garrison.
    resetNpc(db, ACTOR, 0, 0, 'RIGHTEOUS_VANGUARD');
    db.execute('DELETE FROM bandit_strongholds;');
    db.execute(
      `INSERT INTO bandit_strongholds
        (stronghold_id, name_vi, location_near, bandit_chief_name, bandit_power, plundered_wealth, bounty_reward, status)
       VALUES ('SH-NPC', 'Ổ Phỉ Kiểm Thử', ?, 'Thử Tướng', 200, 1000, 100, 'ACTIVE');`,
      [settlementId]
    );
    const wealthBefore = Number(db.queryOne<{ w: number }>(
      "SELECT plundered_wealth AS w FROM bandit_strongholds WHERE stronghold_id = 'SH-NPC';"
    )?.w || 0);
    const garrisonBefore = Number(db.queryOne<{ g: number }>(
      'SELECT garrison_troops AS g FROM session_settlements WHERE settlement_id = ?;',
      [settlementId]
    )?.g || 0);
    const raid = npcModule.simulateNpcTurn(ACTOR, 16, DATE, 'BANDIT_EXPEDITION');
    assert(raid, 'bandit turn must return a journey log');
    assert.strictEqual(raid!.actionType, 'BANDIT_EXPEDITION');
    const raidEntry = db.queryOne<any>(
      "SELECT * FROM npc_ledger WHERE npc_id = ? AND category = 'BANDIT_BOUNTY' ORDER BY rowid DESC LIMIT 1;",
      [ACTOR]
    );
    assert(raidEntry, 'the raid must append a ledger entry');
    const bounty = Number(raidEntry.delta_cash);
    const recruited = Number(raidEntry.delta_troops);
    assert(bounty > 0 && recruited > 0);
    assert.strictEqual(cash(db, ACTOR), bounty);
    assert.strictEqual(troops(db, ACTOR), recruited);
    assert.strictEqual(
      Number(db.queryOne<{ w: number }>("SELECT plundered_wealth AS w FROM bandit_strongholds WHERE stronghold_id = 'SH-NPC';")?.w),
      wealthBefore - bounty,
      'bounty must come from the lair'
    );
    assert.strictEqual(
      Number(db.queryOne<{ g: number }>('SELECT garrison_troops AS g FROM session_settlements WHERE settlement_id = ?;', [settlementId])?.g),
      garrisonBefore - recruited,
      'recruits must come from the garrison'
    );
    assert.strictEqual(Number(raidEntry.balance_troops), troops(db, ACTOR));

    db.close();
    DatabaseService.resetInstance();
    console.log('  ✅ PASSED: commerce cash transfer and bandit troop conservation.');
}

function cleanup(): void {
  try {
    DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

let chain: Promise<void>;
try {
  chain = Promise.resolve(run());
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
chain.then(cleanup).catch(error => {
  console.error(error);
  cleanup();
  process.exit(1);
});
