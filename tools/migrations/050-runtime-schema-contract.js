/**
 * Migration 050: runtime schema contract.
 *
 * Several services used to `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` on
 * first use (family tables, loans, equipment, expeditions, intel fog, duels,
 * business columns, NPC exp columns). A fresh `schema.sql + migrations` database
 * therefore had 68 tables while the live campaign had 94. This migration makes
 * the runtime schema reproducible without waiting for a service to run.
 */

const RUNTIME_TABLES = `
  CREATE TABLE IF NOT EXISTS character_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    slot_type TEXT NOT NULL,
    item_code TEXT NOT NULL,
    custom_name TEXT,
    stat_modifiers TEXT NOT NULL,
    equipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_lineage (
    family_id TEXT PRIMARY KEY DEFAULT 'FAM-LIANG',
    family_name_vi TEXT NOT NULL DEFAULT 'Lương Thị Gia Tộc',
    family_name_en TEXT NOT NULL DEFAULT 'Liang Clan Dynasty',
    founding_year INTEGER NOT NULL DEFAULT 184,
    current_generation INTEGER NOT NULL DEFAULT 1,
    family_prestige INTEGER NOT NULL DEFAULT 100 CHECK (family_prestige >= 0),
    family_motto_vi TEXT DEFAULT 'Đôn Bản Khởi Gia • Trạch Bị Thiên Hạ',
    family_motto_en TEXT DEFAULT 'Cultivate Foundations • Extend Prosperity Under Heaven',
    residence_location TEXT NOT NULL DEFAULT 'LOC-0001',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_spouses (
    marriage_id TEXT PRIMARY KEY,
    husband_id TEXT NOT NULL DEFAULT 'PLY-0001',
    wife_id TEXT NOT NULL,
    wife_name_vi TEXT NOT NULL,
    wife_name_en TEXT NOT NULL,
    marriage_date TEXT NOT NULL,
    marriage_turn INTEGER NOT NULL,
    dowry_cash INTEGER NOT NULL DEFAULT 0 CHECK (dowry_cash >= 0),
    dowry_items_json TEXT DEFAULT '[]',
    intimacy INTEGER NOT NULL DEFAULT 80 CHECK (intimacy >= 0 AND intimacy <= 100),
    status TEXT NOT NULL DEFAULT 'MARRIED',
    pregnancy_stage INTEGER NOT NULL DEFAULT 0 CHECK (pregnancy_stage >= 0 AND pregnancy_stage <= 3),
    conception_turn INTEGER DEFAULT NULL,
    household_role TEXT NOT NULL DEFAULT 'HOUSEKEEPER',
    role_effect_desc_vi TEXT DEFAULT 'Tăng 30% tốc độ hồi phục thể lực khi nghỉ ngơi.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_children (
    child_id TEXT PRIMARY KEY,
    father_id TEXT NOT NULL DEFAULT 'PLY-0001',
    mother_id TEXT NOT NULL,
    mother_name_vi TEXT NOT NULL,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    style_name TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    birth_date TEXT NOT NULL,
    birth_turn INTEGER NOT NULL,
    age INTEGER NOT NULL DEFAULT 0 CHECK (age >= 0),
    war_attr INTEGER NOT NULL DEFAULT 25 CHECK (war_attr >= 0 AND war_attr <= 120),
    int_attr INTEGER NOT NULL DEFAULT 25 CHECK (int_attr >= 0 AND int_attr <= 120),
    com_attr INTEGER NOT NULL DEFAULT 25 CHECK (com_attr >= 0 AND com_attr <= 120),
    ldr_attr INTEGER NOT NULL DEFAULT 25 CHECK (ldr_attr >= 0 AND ldr_attr <= 120),
    pol_attr INTEGER NOT NULL DEFAULT 25 CHECK (pol_attr >= 0 AND pol_attr <= 120),
    dip_attr INTEGER NOT NULL DEFAULT 25 CHECK (dip_attr >= 0 AND dip_attr <= 120),
    cra_attr INTEGER NOT NULL DEFAULT 25 CHECK (cra_attr >= 0 AND cra_attr <= 120),
    log_attr INTEGER NOT NULL DEFAULT 25 CHECK (log_attr >= 0 AND log_attr <= 120),
    war_exp INTEGER NOT NULL DEFAULT 0,
    int_exp INTEGER NOT NULL DEFAULT 0,
    com_exp INTEGER NOT NULL DEFAULT 0,
    innate_talents_json TEXT DEFAULT '[]',
    growth_focus TEXT NOT NULL DEFAULT 'BALANCED',
    mentor_npc_id TEXT DEFAULT NULL,
    mentorship_turns_completed INTEGER NOT NULL DEFAULT 0 CHECK (mentorship_turns_completed >= 0),
    is_heir INTEGER NOT NULL DEFAULT 0 CHECK (is_heir IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'INFANT',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    inheritance_cash INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS family_genealogy_tree (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ancestor_id TEXT NOT NULL,
    descendant_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    generation INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_mentorship_logs (
    log_id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    mentor_npc_id TEXT NOT NULL,
    mentor_name_vi TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    game_date TEXT NOT NULL,
    subject TEXT NOT NULL,
    narrative_vi TEXT NOT NULL,
    stat_gains_json TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_ancestors_archive (
    ancestor_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    style_name TEXT,
    generation INTEGER NOT NULL,
    reign_start_date TEXT NOT NULL,
    reign_end_date TEXT NOT NULL,
    reign_turns INTEGER NOT NULL,
    retirement_age INTEGER NOT NULL,
    final_net_worth INTEGER NOT NULL,
    posthumous_title TEXT,
    achievements_json TEXT DEFAULT '[]',
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS financial_loans (
    loan_id TEXT PRIMARY KEY,
    borrower_id TEXT NOT NULL,
    lender_name TEXT NOT NULL,
    principal INTEGER NOT NULL,
    interest_rate REAL NOT NULL DEFAULT 0.05,
    outstanding_balance INTEGER NOT NULL,
    created_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  );

  CREATE TABLE IF NOT EXISTS military_expeditions (
    expedition_id TEXT PRIMARY KEY,
    commander_id TEXT NOT NULL,
    origin_settlement_id TEXT NOT NULL,
    target_settlement_id TEXT NOT NULL,
    troop_count INTEGER NOT NULL,
    grain_supply_days REAL NOT NULL,
    is_supplied INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'MARCHING',
    created_turn INTEGER NOT NULL,
    game_date TEXT NOT NULL,
    route_id TEXT,
    march_days INTEGER NOT NULL DEFAULT 5,
    days_remaining INTEGER NOT NULL DEFAULT 0,
    arrival_date TEXT
  );

  CREATE TABLE IF NOT EXISTS npc_intel_fog (
    npc_id TEXT PRIMARY KEY,
    intel_level INTEGER DEFAULT 1,
    revealed_hobbies TEXT DEFAULT '[]',
    revealed_dislikes TEXT DEFAULT '[]',
    revealed_stats TEXT DEFAULT '[]',
    revealed_ambition INTEGER DEFAULT 0,
    revealed_secrets INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    last_topic TEXT,
    last_outcome TEXT,
    current_mood TEXT DEFAULT 'NORMAL',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS session_duels (
    duel_id TEXT PRIMARY KEY,
    game_date TEXT NOT NULL,
    context TEXT NOT NULL,
    player_id TEXT NOT NULL,
    opponent_id TEXT NOT NULL,
    winner_id TEXT NOT NULL,
    outcome_type TEXT NOT NULL,
    total_rounds INTEGER NOT NULL,
    rewards_json TEXT NOT NULL,
    narrative_summary TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_family_children_father ON family_children(father_id);
  CREATE INDEX IF NOT EXISTS idx_family_spouses_husband ON family_spouses(husband_id);
  CREATE INDEX IF NOT EXISTS idx_financial_loans_status ON financial_loans(status);
  CREATE INDEX IF NOT EXISTS idx_military_expeditions_status ON military_expeditions(status);
  CREATE INDEX IF NOT EXISTS idx_session_duels_player ON session_duels(player_id, game_date);
`;

const BUSINESS_COLUMNS = [
  ['business_type', "TEXT DEFAULT 'WORKSHOP'"],
  ['owner_character_id', "TEXT DEFAULT 'PLY-0001'"],
  ['daily_revenue', 'INTEGER DEFAULT 0'],
  ['accumulated_profit', 'INTEGER DEFAULT 0']
];

const NPC_COLUMNS = [
  'int_exp', 'war_exp', 'ldr_exp', 'pol_exp', 'dip_exp', 'com_exp', 'log_exp', 'cra_exp'
];

function hasColumn(db, table, column) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
  } catch {
    return false;
  }
}

module.exports = {
  id: '050-runtime-schema-contract',
  description: 'Create runtime tables and columns that services used to create lazily',
  up(db) {
    db.exec(RUNTIME_TABLES);

    if (hasColumn(db, 'businesses', 'business_id')) {
      for (const [column, ddl] of BUSINESS_COLUMNS) {
        if (!hasColumn(db, 'businesses', column)) {
          db.exec(`ALTER TABLE businesses ADD COLUMN ${column} ${ddl};`);
        }
      }
    }

    if (hasColumn(db, 'npc_state', 'npc_id')) {
      for (const column of NPC_COLUMNS) {
        if (!hasColumn(db, 'npc_state', column)) {
          db.exec(`ALTER TABLE npc_state ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0;`);
        }
      }
    }
  }
};
