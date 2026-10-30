/**
 * Battle duel, death, negotiation and bankruptcy verification.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../src/core/database';
import { BattleDuelService } from '../src/modules/military/battle-duel.service';

const ROOT = path.resolve(__dirname, '..');
const LIVE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-duel-'));
const TEST_DB = path.join(TMP, 'session.db');

function run(): void {
  console.log('=== Battle duel, death and defeat states ===');

  fs.copyFileSync(LIVE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${LIVE_DB}${suffix}`)) fs.copyFileSync(`${LIVE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }

  const db = DatabaseService.getInstance(TEST_DB);
  try {
    const table = db.queryOne<any>("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='battle_duels';");
    assert(table, 'migration 015 must create battle_duels');
    db.execute(`UPDATE campaign_meta SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0;`);

    const service = BattleDuelService.forDatabase(db);
    const result = service.resolvePreBattle({
      battleId: 'TEST-BATTLE-1',
      gameDate: '184-05-02',
      context: 'STRONGHOLD',
      playerId: 'PLY-0001',
      playerName: 'Lương Diễn',
      playerWar: 80,
      playerLeadership: 50,
      playerDiplomacy: 80,
      enemyName: 'Sơn Tặc',
      enemyWar: 75,
      enemyLeadership: 60
    });

    assert.strictEqual(result.negotiationAttempted, true, 'civil officer must attempt negotiation');
    assert(result.playerMoraleDelta <= 8 && result.playerMoraleDelta >= -20, 'morale delta must be bounded');
    assert(result.deathChance >= 0 && result.deathChance <= 0.08, 'death chance must respect the 8% cap');
    const log = db.queryOne<any>("SELECT * FROM battle_duels WHERE battle_id = 'TEST-BATTLE-1';");
    assert(log, 'every pre-battle duel/negotiation must be logged');

    // Death path: explicit application sets the campaign status and blocks actions.
    service.applyPlayerDeath('PLY-0001', 'TEST_DEATH');
    const deadMeta = db.queryOne<any>('SELECT status, defeat_reason FROM campaign_meta LIMIT 1;');
    assert.strictEqual(deadMeta.status, 'DEFEATED', 'player death must set DEFEATED');
    assert.strictEqual(deadMeta.defeat_reason, 'TEST_DEATH', 'death reason must be recorded');
    const deadHealth = db.queryOne<any>('SELECT health FROM player_state WHERE player_id = ?;', ['PLY-0001']);
    assert.strictEqual(Number(deadHealth.health), 0, 'dead player must have zero health');
    const { canSpendActionTime } = require('../engine/time-manager');
    const blocked = canSpendActionTime(TEST_DB, 'TRADE_BUY');
    assert.strictEqual(blocked.allowed, false, 'a defeated campaign must block actions');
    assert.strictEqual(blocked.code, 'CAMPAIGN_OVER', 'defeat must return CAMPAIGN_OVER');

    // Bankruptcy path: two consecutive distressed closes end the campaign.
    db.execute("UPDATE campaign_meta SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0;");
    db.execute("UPDATE player_state SET health = 100, liquid_cash = 0, safe_cash = 0, strategic_grain = 0 WHERE player_id = 'PLY-0001';");
    const first = service.checkBankruptcy('PLY-0001');
    assert.strictEqual(first.bankrupt, false, 'one distressed month is only a warning');
    const second = service.checkBankruptcy('PLY-0001');
    assert.strictEqual(second.bankrupt, true, 'two distressed months must bankrupt the campaign');
    const bankruptMeta = db.queryOne<any>('SELECT status FROM campaign_meta LIMIT 1;');
    assert.strictEqual(bankruptMeta.status, 'BANKRUPT', 'bankruptcy must set campaign status');

    // Recovery clears the distress counter instead of accumulating forever.
    db.execute("UPDATE campaign_meta SET status = 'ACTIVE', distress_months = 0;");
    db.execute("UPDATE player_state SET liquid_cash = 5000, strategic_grain = 5 WHERE player_id = 'PLY-0001';");
    const recovered = service.checkBankruptcy('PLY-0001');
    assert.strictEqual(recovered.distressMonths, 0, 'recovery must reset distress');
  } finally {
    db.close();
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
    }
  }

  console.log('   ✅ negotiation, duel log, death gate and bankruptcy work');
}

run();
