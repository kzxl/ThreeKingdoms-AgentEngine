/**
 * NPC skill verification: migration seeding, deterministic perk selection,
 * shared effect resolution and master-only aptitude fallback.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { NpcSkillService } from '../src/modules/progression/npc-skill.service';
import { expRequiredForTier } from '../src/shared/skill-exp';

const migration040 = require('../tools/migrations/040-npc-skills');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.npc-skills');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seed() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS master_skills (
      skill_code TEXT PRIMARY KEY,
      skill_name_vi TEXT NOT NULL,
      skill_name_en TEXT NOT NULL,
      domain TEXT NOT NULL,
      primary_attr TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS master_skill_effects (
      skill_code TEXT NOT NULL,
      tier INTEGER NOT NULL,
      effect_type TEXT NOT NULL,
      value REAL NOT NULL,
      PRIMARY KEY (skill_code, tier, effect_type)
    );
    CREATE TABLE IF NOT EXISTS master_perks (
      perk_code TEXT PRIMARY KEY,
      skill_code TEXT NOT NULL,
      tier INTEGER NOT NULL,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_vi TEXT,
      description_en TEXT,
      effect_type TEXT NOT NULL,
      value REAL NOT NULL,
      UNIQUE(skill_code, tier)
    );
    CREATE TABLE IF NOT EXISTS master_characters (
      npc_id TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      baseline_location TEXT NOT NULL,
      int_attr INTEGER NOT NULL DEFAULT 50,
      pol_attr INTEGER NOT NULL DEFAULT 50,
      war_attr INTEGER NOT NULL DEFAULT 50,
      ldr_attr INTEGER NOT NULL DEFAULT 50,
      dip_attr INTEGER NOT NULL DEFAULT 50,
      com_attr INTEGER NOT NULL DEFAULT 50,
      log_attr INTEGER NOT NULL DEFAULT 50,
      cra_attr INTEGER NOT NULL DEFAULT 50
    );
  `);

  const skill = db.prepare('INSERT INTO master_skills VALUES (?, ?, ?, ?, ?)');
  skill.run('SKL-WAR-DUEL', 'Đơn Đả', 'Duel', 'MARTIAL', 'WAR');
  skill.run('SKL-TAC-STRAT', 'Mưu Lược', 'Stratagem', 'TACTICS', 'INT');
  skill.run('SKL-LDR-DRILL', 'Luyện Binh', 'Drill', 'LEADERSHIP', 'LDR');
  skill.run('SKL-CRA-SMITH', 'Rèn', 'Smithing', 'CRAFT', 'CRA');

  const effect = db.prepare('INSERT INTO master_skill_effects VALUES (?, ?, ?, ?)');
  effect.run('SKL-WAR-DUEL', 3, 'DUEL_POWER', 2);
  effect.run('SKL-TAC-STRAT', 3, 'SIEGE_POWER', 2);
  effect.run('SKL-LDR-DRILL', 3, 'MORALE_BONUS', 1);

  const perk = db.prepare(`
    INSERT INTO master_perks
      (perk_code, skill_code, tier, name_vi, name_en, description_vi, description_en, effect_type, value)
    VALUES (?, ?, ?, ?, ?, '', '', ?, ?);
  `);
  perk.run('PRK-DUEL-3', 'SKL-WAR-DUEL', 3, 'Sát Chiêu', 'Killing Blow', 'DUEL_POWER', 2);
  perk.run('PRK-DUEL-5', 'SKL-WAR-DUEL', 5, 'Vô Song', 'Peerless', 'DUEL_POWER', 3);
  perk.run('PRK-STRAT-3', 'SKL-TAC-STRAT', 3, 'Kỳ Mưu', 'Stratagem', 'SIEGE_POWER', 2);
  perk.run('PRK-DRILL-3', 'SKL-LDR-DRILL', 3, 'Nghiêm Quân', 'Iron Drill', 'MORALE_BONUS', 2);

  db.prepare(`
    INSERT INTO npc_state (npc_id, name, war_attr, int_attr, ldr_attr, com_attr, cra_attr, log_attr, pol_attr, dip_attr, assigned_role)
    VALUES ('NPC-9001', 'Test Commander', 80, 70, 75, 60, 55, 60, 50, 50, 'UNASSIGNED')
  `).run();
  db.prepare(`
    INSERT INTO master_characters
      (npc_id, name_vi, name_en, baseline_location, int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr)
    VALUES ('MC-9002', 'Lữ Bố Thử', 'Test Lu Bu', 'LOC-0001', 90, 50, 100, 90, 60, 50, 60, 50)
  `).run();

  migration040.up(db);
  db.close();
}

function run(): void {
  console.log('=== NPC skills and perks ===');
  seed();
  const service = NpcSkillService.forDatabase(DatabaseService.getInstance(TEST_DB));

  const skills = service.listSkills('NPC-9001');
  const duel = skills.find(skill => skill.skillCode === 'SKL-WAR-DUEL');
  assert(duel, 'migration must seed the commander duel skill from WAR');
  assert.strictEqual(duel!.tier, 3);
  assert.strictEqual(duel!.maxExp, expRequiredForTier(3), 'NPC skills must use the shared EXP curve');
  assert.strictEqual(duel!.perks.length, 1, 'the reached tier 3 perk must resolve');
  assert.strictEqual(duel!.perks[0].perkCode, 'PRK-DUEL-3');

  // Tier 3 effect 2 + auto perk 2.
  assert.strictEqual(service.effectTotal('NPC-9001', 'DUEL_POWER'), 4);
  assert.strictEqual(service.combatBonuses('NPC-9001').duelPower, 4);
  assert.strictEqual(service.ensurePerks('NPC-9001'), 0, 'perks are already persisted by the migration');

  // A later tier-up must gain its perk even though tier 3 is already persisted.
  const db = new Database(TEST_DB);
  db.prepare(`UPDATE npc_skills SET tier = 5 WHERE npc_id = 'NPC-9001' AND skill_code = 'SKL-WAR-DUEL';`).run();
  db.close();
  const atFive = service.listSkills('NPC-9001').find(skill => skill.skillCode === 'SKL-WAR-DUEL');
  assert.strictEqual(atFive!.perks.length, 2, 'tier 5 must add its perk beside the persisted tier 3 perk');
  assert.strictEqual(atFive!.perks[1].perkCode, 'PRK-DUEL-5');
  assert.strictEqual(service.effectTotal('NPC-9001', 'DUEL_POWER'), 2 + 2 + 3);
  assert.strictEqual(service.ensurePerks('NPC-9001'), 1, 'the new tier perk must persist');

  // Master-only generals have no npc_skills rows and fall back to aptitude.
  assert.strictEqual(service.listSkills('MC-9002').length, 0);
  const master = service.combatBonuses('MC-9002');
  assert.strictEqual(master.duelPower, 4, 'WAR 100 must grade to legendary duel power');
  assert.strictEqual(master.siegePower, 3, 'INT 90 must grade to epic siege power');
  assert.strictEqual(master.moraleBonus, 3, 'LDR 90 must grade to epic morale');

  // A commander with no data contributes nothing.
  assert.deepStrictEqual(service.combatBonuses('NPC-MISSING'), { duelPower: 0, siegePower: 0, moraleBonus: 0 });

  console.log('✅ NPC skills: seeded ladders, deterministic perks and mastery fallback verified.');
}

run();
