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

    // With a designated heir, death hands the campaign to the successor.
    db.execute("UPDATE campaign_meta SET status = 'ACTIVE', defeat_reason = NULL;");
    db.execute("UPDATE player_state SET health = 100 WHERE player_id = 'PLY-0001';");
    db.execute("UPDATE family_children SET is_heir = 1, status = 'HEIR' WHERE child_id = 'CHILD-TEST-HEIR-01';");
    db.execute(`
      INSERT OR REPLACE INTO family_children
        (child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, style_name, gender,
         birth_date, birth_turn, age, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr,
         cra_attr, log_attr, is_heir, status)
      SELECT 'CHILD-TEST-SIBLING', father_id, mother_id, mother_name_vi, 'Lương Thứ Tử', name_en,
             style_name, gender, birth_date, birth_turn, 18, war_attr, int_attr, com_attr, ldr_attr,
             pol_attr, dip_attr, cra_attr, log_attr, 0, 'ADULT_OFFICER'
      FROM family_children WHERE child_id = 'CHILD-TEST-HEIR-01';
    `);
    const beforeCash = db.queryOne<any>('SELECT liquid_cash + safe_cash AS total FROM player_state WHERE player_id = ?;', ['PLY-0001']);
    const { DynastySuccessionService } = require('../src/modules/lineage-succession/dynasty-succession.service');
    new DynastySuccessionService(db).setWill({
      charityShareBps: 2500,
      allocations: [{ childId: 'CHILD-TEST-SIBLING', shareBps: 2500 }],
      assets: [{ assetType: 'BUSINESS', assetId: 'BIZ-0001', childId: 'CHILD-TEST-SIBLING' }]
    });
    const succession = service.applyPlayerDeath('PLY-0001', 'TEST_DEATH_WITH_HEIR');
    assert.strictEqual(succession.succession, true, 'death with an heir must run succession');
    assert.strictEqual(succession.heirId, 'CHILD-TEST-HEIR-01', 'succession must name the heir');
    const revived = db.queryOne<any>('SELECT status FROM campaign_meta LIMIT 1;');
    assert.strictEqual(revived.status, 'ACTIVE', 'succession must keep the campaign active');
    const heirName = db.queryOne<any>('SELECT name, health, liquid_cash + safe_cash AS total FROM player_state LIMIT 1;');
    assert.strictEqual(heirName.name, 'Lương Anh Hào', 'player identity must transfer to the heir');
    assert.strictEqual(Number(heirName.health), 100, 'heir must start at full health');
    assert(
      Math.abs(Number(heirName.total) - Number(beforeCash.total) * 0.5) <= 1,
      '25% charity + 25% sibling share must leave 50% for the heir'
    );
    const sibling = db.queryOne<any>('SELECT inheritance_cash FROM family_children WHERE child_id = ?;', ['CHILD-TEST-SIBLING']);
    assert(
      Math.abs(Number(sibling.inheritance_cash) - Number(beforeCash.total) * 0.25) <= 1,
      'sibling must receive the allocated 25% share'
    );
    const bequeathedBusiness = db.queryOne<any>('SELECT owner_character_id FROM businesses WHERE business_id = ?;', ['BIZ-0001']);
    assert.strictEqual(bequeathedBusiness.owner_character_id, 'CHILD-TEST-SIBLING', 'business bequest must transfer ownership');
    const charityLedger = db.queryOne<any>(
      "SELECT * FROM cashflow_ledger WHERE category = 'DYNASTY_SUCCESSION' ORDER BY rowid DESC LIMIT 1;"
    );
    assert(charityLedger && Number(charityLedger.outflow) > 0, 'charity share must be posted as a ledger outflow');
    db.execute("UPDATE family_children SET is_heir = 0, status = 'ADULT_OFFICER' WHERE child_id = 'CHILD-TEST-HEIR-01';");

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
