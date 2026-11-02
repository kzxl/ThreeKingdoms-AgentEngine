/**
 * Dossier DB-first verification:
 * - master roster values (personality/motivation) win over narrative fallbacks;
 * - portrait/illustration URLs are exposed by the dossier service;
 * - both dossier UIs render the illustration frame.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.dossier-db');
const TEST_DB = path.join(TEST_DIR, 'session.db');
process.env.SIM_DB_PATH = TEST_DB;

function seed() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_characters (
      npc_id TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_han TEXT,
      style_name_vi TEXT,
      style_name_en TEXT,
      baseline_age INTEGER,
      baseline_location TEXT,
      baseline_position_vi TEXT,
      baseline_position_en TEXT,
      int_attr INTEGER DEFAULT 50,
      pol_attr INTEGER DEFAULT 50,
      war_attr INTEGER DEFAULT 50,
      ldr_attr INTEGER DEFAULT 50,
      dip_attr INTEGER DEFAULT 50,
      com_attr INTEGER DEFAULT 50,
      log_attr INTEGER DEFAULT 50,
      cra_attr INTEGER DEFAULT 50,
      personality TEXT,
      motivation TEXT,
      bio_vi TEXT,
      bio_en TEXT,
      portrait_url TEXT,
      illustration_url TEXT
    );
    CREATE TABLE IF NOT EXISTS master_relations_baseline (
      id TEXT PRIMARY KEY,
      source_entity_id TEXT,
      target_entity_id TEXT,
      entity_type TEXT,
      relationship_type_vi TEXT,
      relationship_type_en TEXT,
      baseline_sentiment INTEGER DEFAULT 50,
      notes_vi TEXT,
      notes_en TEXT
    );
  `);
  db.prepare(`
    INSERT INTO master_relations_baseline
      (id, source_entity_id, target_entity_id, entity_type, baseline_sentiment)
    VALUES ('REL-1', 'PLY-0001', 'NPC-0001', 'NPC', 60)
  `).run();
  db.prepare(`
    INSERT INTO master_characters
      (npc_id, name_vi, name_en, name_han, baseline_location, personality, motivation,
       bio_vi, bio_en, portrait_url, illustration_url)
    VALUES ('NPC-0001', 'Lưu Bị', 'Liu Bei', '劉備', 'LOC-0001', 'DB_CALM', 'DB_RESTORE_HAN',
            'Tiểu sử DB', 'DB bio', '/assets/portraits/liu-bei.webp', '/assets/illustrations/peach-garden.webp')
  `).run();
  db.close();
}

function run() {
  seed();
  const { DailyInteractionEngine } = require('../src/modules/social-kizuna/daily-interaction.engine');
  const engine = DailyInteractionEngine.getInstance();

  const profile = engine.getNpcMasterProfile('NPC-0001');
  assert.strictEqual(profile.personality, 'DB_CALM', 'DB personality must beat the hardcoded persona');
  assert.strictEqual(profile.motivation, 'DB_RESTORE_HAN', 'DB motivation must beat the hardcoded persona');
  assert.strictEqual(profile.portraitUrl, '/assets/portraits/liu-bei.webp');
  assert.strictEqual(profile.illustrationUrl, '/assets/illustrations/peach-garden.webp');

  const dossier = engine.getNpcDossier('NPC-0001');
  assert.strictEqual(dossier.portraitUrl, '/assets/portraits/liu-bei.webp');
  assert.strictEqual(dossier.illustrationUrl, '/assets/illustrations/peach-garden.webp');

  const npcUi = fs.readFileSync(path.join(ROOT, 'public', 'js', 'npc-dossier-modal.js'), 'utf8');
  const playerUi = fs.readFileSync(path.join(ROOT, 'public', 'js', 'protagonist-dossier-modal.js'), 'utf8');
  assert(npcUi.includes('dossier-portrait-frame'), 'NPC dossier must render a portrait frame');
  assert(npcUi.includes('dossier-illustration-frame'), 'NPC dossier must render an illustration slot');
  assert(playerUi.includes('dossier-illustration-frame'), 'protagonist dossier must render an illustration slot');
  assert(npcUi.includes('dossier-stats-layout'), 'NPC dossier must use the compact stats layout');
  assert(npcUi.includes('dossier-radar-svg'), 'NPC dossier must use the short-label radar');
  assert(!npcUi.includes('displayVi || s.display'), 'the stat value slot must not print the rank label');

  console.log('✅ Dossier DB-first: roster fields win, portrait/illustration URLs flow to both UIs.');
}

run();
