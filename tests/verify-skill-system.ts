/**
 * Skill system verification: structured effects, tier resolution, quest check
 * bonus, and starting-skill seeding on a new campaign.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { SkillService } from '../src/modules/progression/skill.service';
import { QuestService } from '../src/modules/progression/quest.service';
import { applySkillExpGain, expRequiredForTier, gainMultiplierForTier } from '../src/shared/skill-exp';
import { initializeInstanceDatabase } from '../src/modules/instances/instance-bootstrap';
import { ARCHETYPE_PRESETS } from '../src/modules/instances/instances.constants';
const migration034 = require('../tools/migrations/034-quest-engine');
const migration036 = require('../tools/migrations/036-skill-effects');
const migration037 = require('../tools/migrations/037-skill-perks');
const migration038 = require('../tools/migrations/038-player-talents');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.skill-system');
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
    CREATE TABLE IF NOT EXISTS master_talents (
      talent_code TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL
    );
  `);
  db.prepare(`INSERT INTO master_talents VALUES ('TLT-TEST', 'Thiên Phú Thử', 'Test Talent', 'MARTIAL')`).run();
  const skill = db.prepare('INSERT INTO master_skills VALUES (?, ?, ?, ?, ?)');
  skill.run('SKL-WAR-DUEL', 'Đơn Đả Độc Đấu', 'Duel', 'MARTIAL', 'WAR');
  skill.run('SKL-CRA-SMITH', 'Rèn Đúc Binh Khí', 'Smithing', 'CRAFT', 'CRA');
  skill.run('SKL-CRA-WEAVE', 'Biên Dệt Tre Trúc', 'Weaving', 'CRAFT', 'CRA');
  skill.run('SKL-COM-APPRAISE', 'Giám Định Hàng Hóa', 'Appraisal', 'COMMERCE', 'COM');
  skill.run('SKL-LOG-PROV', 'Lương Thảo Vận Trù', 'Provisioning', 'LOGISTICS', 'LOG');
  migration034.up(db);
  migration036.up(db);
  migration037.up(db);
  migration038.up(db);
  db.prepare(`INSERT INTO player_talents (talent_code) VALUES ('TLT-TEST');`).run();

  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-SKILL', 'Skill', '184-02-01', '184-05-01', 4)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain,
      war_attr, int_attr, pol_attr, dip_attr, com_attr, cra_attr, ldr_attr)
    VALUES ('PLY-0001', 'Skill Tester', 21, 2000, 0, 50, 50, 50, 50, 50, 50, 50, 50)
  `).run();
  db.prepare(`
    INSERT INTO player_skills (skill_code, skill_name, tier, current_exp, max_exp)
    VALUES ('SKL-WAR-DUEL', 'Đơn Đả Độc Đấu', 3, 10, 60)
  `).run();
  db.close();
}

function run() {
  seed();
  const service = SkillService.forDatabase(DatabaseService.getInstance(TEST_DB));

  const skills = service.list();
  assert.strictEqual(skills.length, 1);
  assert.strictEqual(skills[0].tier, 3);
  assert.strictEqual(service.getCheckBonus(['SKL-WAR-DUEL']), 2, 'tier 3 must give +2, not the sum of tiers');
  assert.strictEqual(service.getEffectTotal('DUEL_POWER', ['SKL-WAR-DUEL']), 4, 'tier effect 2 + innate talent 2');

  // Quest step uses the linked skill: roll 10 + mod 0 + skill 2 = 12 at DC 12.
  const quests = QuestService.forDatabase(DatabaseService.getInstance(TEST_DB));
  quests.accept('Q-MARTIAL-01');
  const step = quests.advance('Q-MARTIAL-01', 'PLY-0001', { roll: 10 });
  assert.strictEqual(step.success, true, 'skill bonus must turn a 10 into a DC 12 success');
  assert.strictEqual(step.skillBonus, 2);
  assert.strictEqual(step.total, 12);

  // Perks and innate talents join the same resolver.
  const beforePerk = service.getEffectTotal('DUEL_POWER', ['SKL-WAR-DUEL']);
  assert.strictEqual(beforePerk, 4, 'tier effect 2 + innate talent 2');
  const perk = service.choosePerk('SKL-WAR-DUEL-P3');
  assert.strictEqual(perk.tier, 3);
  assert.strictEqual(service.getEffectTotal('DUEL_POWER', ['SKL-WAR-DUEL']), 6, 'perk must add +2');
  assert.throws(() => service.choosePerk('SKL-WAR-DUEL-P3'), /Đã chọn perk/);
  assert.throws(() => service.choosePerk('SKL-WAR-DUEL-P5'), /bậc 5/);
  assert(service.listTalents().some(talent => talent.talentCode === 'TLT-TEST'));

  // A fresh campaign seeds the archetype's three opening skills.
  const db = new Database(TEST_DB);
  db.pragma('foreign_keys = OFF');
  initializeInstanceDatabase(db, {
    preset: ARCHETYPE_PRESETS['ARCH-COMMONER-YOUTH'],
    playerName: 'New Skill Owner',
    playerStyle: 'Sơ Học'
  });
  db.pragma('foreign_keys = ON');
  const seeded = db.prepare('SELECT COUNT(*) AS c FROM player_skills;').get() as any;
  assert.strictEqual(Number(seeded.c), 3, 'a new campaign must start with three skills');
  const known = db.prepare(
    `SELECT COUNT(*) AS c FROM player_skills WHERE skill_code IN ('SKL-CRA-WEAVE','SKL-COM-APPRAISE','SKL-LOG-PROV');`
  ).get() as any;
  assert.strictEqual(Number(known.c), 3);
  db.close();

  const ui = fs.readFileSync(path.join(ROOT, 'public', 'js', 'protagonist-dossier-modal.js'), 'utf8');
  assert(ui.includes('dossier-skill-list'), 'dossier must render the skill sheet');
  assert(ui.includes('/api/skills'), 'dossier must load skills from the API');

  // The EXP curve is shared by the TS service and the CommonJS engine writers.
  assert.strictEqual(expRequiredForTier(1), 40);
  assert.strictEqual(expRequiredForTier(3), 180);
  assert.strictEqual(expRequiredForTier(5), 320);
  assert.strictEqual(gainMultiplierForTier(2), 0.8);
  const rankUp = applySkillExpGain(1, 30, 20);
  assert.strictEqual(rankUp.tier, 2, '40 EXP at tier 1 must reach tier 2');
  assert.strictEqual(rankUp.currentExp, 10, 'remainder must carry across the tier-up');
  assert.strictEqual(rankUp.maxExp, 90);
  const slowed = applySkillExpGain(2, 0, 20);
  assert.strictEqual(slowed.gained, 16, 'tier 2 must convert only 80% of the award');
  const capped = applySkillExpGain(5, 310, 100);
  assert.strictEqual(capped.tier, 5);
  assert.strictEqual(capped.currentExp, 320, 'EXP must clamp at the final tier');
  const cjsExp = require('../engine/skill-exp.js');
  assert.strictEqual(cjsExp.expRequiredForTier(4), expRequiredForTier(4));
  assert.deepStrictEqual(cjsExp.applySkillExpGain(2, 80, 40), applySkillExpGain(2, 80, 40));

  console.log('✅ Skill system: structured effects, tier resolution, quest bonus and starting seeds verified.');
}

run();
