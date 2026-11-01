/**
 * Terminal state: victory and bankruptcy share the month-close gate, and a
 * terminal campaign (VICTORIOUS / DEFEATED / BANKRUPT) rejects player actions.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { applyVictoryIfEligible } from '../src/shared/victory';
import { BattleDuelService } from '../src/modules/military/battle-duel.service';
import { chargePlayerAction, ActionTimeError } from '../src/shared/action-time';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-terminal-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== Terminal state consistency ===');
  process.env.SIM_LEGACY_PATH = path.join(TMP, 'legacy.json');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);

  const faction = db.queryOne<{ faction_id: string }>(
    "SELECT faction_id FROM session_factions WHERE leader_id = 'PLY-0001' LIMIT 1;"
  );
  assert(faction, 'the player must lead a faction for the victory test');
  db.execute(
    `UPDATE session_settlements SET ruler_faction_id = ?
     WHERE settlement_id IN (SELECT settlement_id FROM session_settlements LIMIT 12);`,
    [faction!.faction_id]
  );
  db.execute(`
    UPDATE campaign_meta SET status = 'ACTIVE', defeat_reason = NULL, current_date = '185-06-01'
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `);
  db.execute(`
    UPDATE player_state SET fame = 5000, ldr_attr = 90, liquid_cash = 60000, safe_cash = 0,
      strategic_grain = 100
    WHERE player_id = 'PLY-0001';
  `);

  const victory = applyVictoryIfEligible(db);
  assert.strictEqual(victory.victorious, true, JSON.stringify(victory));
  assert.strictEqual(
    db.queryOne<{ status: string }>('SELECT status FROM campaign_meta LIMIT 1;')?.status,
    'VICTORIOUS'
  );

  // Bankruptcy must not overwrite a victory.
  db.execute("UPDATE player_state SET liquid_cash = 0, safe_cash = 0, strategic_grain = 0 WHERE player_id = 'PLY-0001';");
  const afterVictory = BattleDuelService.forDatabase(db).checkBankruptcy('PLY-0001');
  assert.strictEqual(afterVictory.status, 'VICTORIOUS');
  assert.strictEqual(afterVictory.bankrupt, false);

  // A terminal campaign rejects time-consuming player actions.
  assert.throws(
    () => chargePlayerAction(TEST_DB, 'TRADE_BUY', null, 'terminal test'),
    (error: unknown) => error instanceof ActionTimeError && error.code === 'CAMPAIGN_OVER'
  );

  // Bankruptcy is two consecutive distressed closes, and it is terminal.
  db.execute(`
    UPDATE campaign_meta SET status = 'ACTIVE', distress_months = 0, defeat_reason = NULL
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `);
  db.execute("UPDATE player_state SET liquid_cash = 0, safe_cash = 0, strategic_grain = 0 WHERE player_id = 'PLY-0001';");
  const first = BattleDuelService.forDatabase(db).checkBankruptcy('PLY-0001');
  assert.strictEqual(first.bankrupt, false);
  const second = BattleDuelService.forDatabase(db).checkBankruptcy('PLY-0001');
  assert.strictEqual(second.bankrupt, true);
  assert.strictEqual(second.status, 'BANKRUPT');
  assert.throws(
    () => chargePlayerAction(TEST_DB, 'TRADE_BUY', null, 'bankrupt test'),
    (error: unknown) => error instanceof ActionTimeError && error.code === 'CAMPAIGN_OVER'
  );

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: victory, bankruptcy and terminal action guard.');
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
