/**
 * Migration 043: repair broken code-page names and legacy currency labels.
 *
 * Skills are resynced from `master_skills`, the two medicine items get clean
 * Vietnamese text, and numeric "Tiền"/"Qian" becomes Quan/quan while ordinary
 * uses of the word money stay untouched.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const migration043 = require('../tools/migrations/043-text-cleanup');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.text-cleanup');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seed(): void {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE master_skills (skill_code TEXT PRIMARY KEY, skill_name_vi TEXT);
    CREATE TABLE player_skills (skill_code TEXT PRIMARY KEY, skill_name TEXT);
    CREATE TABLE master_items (item_code TEXT PRIMARY KEY, name_vi TEXT, description_vi TEXT);
    CREATE TABLE session_events (event_id TEXT PRIMARY KEY, choice_narrative TEXT, resolution_narrative TEXT);
    CREATE TABLE master_events (event_id TEXT PRIMARY KEY, summary_vi TEXT, historical_outcome_vi TEXT);
    CREATE TABLE chat_chronicle (id TEXT PRIMARY KEY, text TEXT);
    CREATE TABLE turn_log (turn_number INTEGER PRIMARY KEY, turn_title TEXT, summary TEXT, dilemma_choice TEXT);
    CREATE TABLE master_quests (quest_id TEXT PRIMARY KEY, description_vi TEXT);
    CREATE TABLE master_quest_steps (step_id TEXT PRIMARY KEY, title_vi TEXT, success_vi TEXT, failure_vi TEXT);
  `);
  db.prepare("INSERT INTO master_skills VALUES ('SKL-X', 'Giám Định Hàng Hóa')").run();
  db.prepare("INSERT INTO player_skills VALUES ('SKL-X', 'Gi�m d?nh H�ng H�a')").run();
  db.prepare("INSERT INTO master_items VALUES ('MED-TRAUMA-SALVE', 'Cao Du?c C?m M�u', 'b?n')").run();
  db.prepare(`
    INSERT INTO session_events VALUES
      ('EVT-1', 'Tài trợ', 'Bạn xuất 1,500 Tiền điều phối xưởng. Nộp tiền mặt tại kho.')
  `).run();
  db.prepare("INSERT INTO master_events VALUES ('EVT-2', 'Nhận 500 Qian thưởng', NULL)").run();
  db.prepare("INSERT INTO chat_chronicle VALUES ('C1', 'Chi 2.000 Tiền mua lương.')").run();
  db.prepare("INSERT INTO turn_log VALUES (1, 'Lượt 1', 'Thu 300 Tiền', 'Giữ tiền mặt')").run();
  db.prepare("INSERT INTO master_quests VALUES ('Q-1', 'Cần 800 Tiền vốn')").run();
  db.prepare("INSERT INTO master_quest_steps VALUES ('S-1', 'Bước 1', 'Được 100 Tiền', NULL)").run();
  db.close();
}

function run(): void {
  console.log('=== Text cleanup migration ===');
  seed();
  let db = new Database(TEST_DB);
  migration043.up(db);

  const skill = db.prepare("SELECT skill_name FROM player_skills WHERE skill_code = 'SKL-X';").get() as any;
  assert.strictEqual(skill.skill_name, 'Giám Định Hàng Hóa', 'skill name must resync from master');

  const item = db.prepare("SELECT name_vi, description_vi FROM master_items WHERE item_code = 'MED-TRAUMA-SALVE';").get() as any;
  assert.strictEqual(item.name_vi, 'Kim Sang Dược Cầm Máu');
  assert(!/\uFFFD/.test(item.description_vi), 'medicine description must be clean');

  const event = db.prepare("SELECT resolution_narrative FROM session_events WHERE event_id = 'EVT-1';").get() as any;
  assert(event.resolution_narrative.includes('1,500 Quan'), 'numeric Tiền becomes Quan');
  assert(event.resolution_narrative.includes('Nộp tiền mặt'), 'ordinary use of tiền stays');
  assert(!/1,500 Tiền/.test(event.resolution_narrative));

  const masterEvent = db.prepare("SELECT summary_vi FROM master_events WHERE event_id = 'EVT-2';").get() as any;
  assert.strictEqual(masterEvent.summary_vi, 'Nhận 500 quan thưởng');

  const chronicle = db.prepare("SELECT text FROM chat_chronicle WHERE id = 'C1';").get() as any;
  assert.strictEqual(chronicle.text, 'Chi 2.000 Quan mua lương.');

  const turn = db.prepare('SELECT summary, dilemma_choice FROM turn_log WHERE turn_number = 1;').get() as any;
  assert.strictEqual(turn.summary, 'Thu 300 Quan');
  assert.strictEqual(turn.dilemma_choice, 'Giữ tiền mặt');

  // Idempotent: a second pass changes nothing.
  migration043.up(db);
  const again = db.prepare("SELECT resolution_narrative FROM session_events WHERE event_id = 'EVT-1';").get() as any;
  assert.strictEqual(again.resolution_narrative, event.resolution_narrative);
  db.close();

  console.log('  ✅ PASSED: skill/item names repaired, currency labels normalised, plain "tiền mặt" preserved.');
}

run();
