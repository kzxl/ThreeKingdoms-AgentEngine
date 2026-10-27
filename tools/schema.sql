-- ThreeKingdoms-AgentEngine: Session Database Schema
-- Provides ACID-compliant transactional persistence, invariant validation, and zero-drift state calculation.

PRAGMA foreign_keys = ON;

-- 1. Campaign Metadata
CREATE TABLE IF NOT EXISTS campaign_meta (
    campaign_id TEXT PRIMARY KEY,
    campaign_name TEXT NOT NULL,
    start_date TEXT NOT NULL DEFAULT '184-02-01',
    current_date TEXT NOT NULL DEFAULT '184-02-01',
    active_turn INTEGER NOT NULL DEFAULT 0,
    rules_version TEXT NOT NULL DEFAULT '1.1.0',
    random_seed INTEGER NOT NULL DEFAULT 1840201,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Character & Player State (Active Session Overlay)
CREATE TABLE IF NOT EXISTS player_state (
    player_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    style_name TEXT,
    age INTEGER NOT NULL,
    current_location TEXT NOT NULL DEFAULT 'LOC-0001',
    permanent_base TEXT NOT NULL DEFAULT 'LOC-0001',
    int_attr INTEGER NOT NULL DEFAULT 50,
    pol_attr INTEGER NOT NULL DEFAULT 50,
    war_attr INTEGER NOT NULL DEFAULT 50,
    ldr_attr INTEGER NOT NULL DEFAULT 50,
    dip_attr INTEGER NOT NULL DEFAULT 50,
    com_attr INTEGER NOT NULL DEFAULT 50,
    log_attr INTEGER NOT NULL DEFAULT 50,
    cra_attr INTEGER NOT NULL DEFAULT 50,
    liquid_cash INTEGER NOT NULL DEFAULT 15000 CHECK (liquid_cash >= 0),
    safe_cash INTEGER NOT NULL DEFAULT 0 CHECK (safe_cash >= 0),
    strategic_grain REAL NOT NULL DEFAULT 0.0 CHECK (strategic_grain >= 0),
    fixed_capital INTEGER NOT NULL DEFAULT 0 CHECK (fixed_capital >= 0),
    special_licenses TEXT DEFAULT '[]',
    health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    fatigue INTEGER NOT NULL DEFAULT 0 CHECK (fatigue >= 0 AND fatigue <= 100),
    morale INTEGER NOT NULL DEFAULT 100 CHECK (morale >= 0 AND morale <= 100)
);

-- 3. Player Skills Ladder
CREATE TABLE IF NOT EXISTS player_skills (
    skill_code TEXT PRIMARY KEY,
    skill_name TEXT NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1,
    current_exp INTEGER NOT NULL DEFAULT 0,
    max_exp INTEGER NOT NULL DEFAULT 40,
    notes TEXT
);

-- 4. Single-Entry Cash Flow Log (Running balance cache)
CREATE TABLE IF NOT EXISTS cashflow_ledger (
    txn_id TEXT PRIMARY KEY,
    game_date TEXT NOT NULL,
    counterparty TEXT NOT NULL,
    category TEXT NOT NULL,
    inflow INTEGER NOT NULL DEFAULT 0 CHECK (inflow >= 0),
    outflow INTEGER NOT NULL DEFAULT 0 CHECK (outflow >= 0),
    balance INTEGER NOT NULL CHECK (balance >= 0),
    memo TEXT,
    status TEXT NOT NULL DEFAULT 'Confirmed'
);

-- 5. True Double-Entry Account Journal (Pure Debit == Credit Accounting)
CREATE TABLE IF NOT EXISTS account_journal (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    txn_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL DEFAULT 'CMP-184-ZHOU-01',
    game_date TEXT NOT NULL,
    account_code TEXT NOT NULL,
    debit INTEGER NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit INTEGER NOT NULL DEFAULT 0 CHECK (credit >= 0),
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(txn_id) REFERENCES cashflow_ledger(txn_id)
);

-- 6. Inventory Items (Warehouse & Traveling Packs)
CREATE TABLE IF NOT EXISTS inventory_items (
    item_code TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity >= 0),
    unit_cost_basis INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_basis >= 0),
    location TEXT NOT NULL DEFAULT 'Zhuo Workshop'
);

-- 7. Physical Stock Movements (MOV Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    mov_id TEXT PRIMARY KEY,
    game_date TEXT NOT NULL,
    item_code TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_cost INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    balance_after REAL NOT NULL CHECK (balance_after >= 0),
    ref_txn TEXT,
    FOREIGN KEY(item_code) REFERENCES inventory_items(item_code)
);

-- 8. NPC Relationship Deltas (Overlay on Immutable Master Dossiers)
CREATE TABLE IF NOT EXISTS npc_relationship_deltas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id TEXT NOT NULL,
    game_date TEXT NOT NULL,
    sentiment_delta INTEGER NOT NULL DEFAULT 0,
    sentiment_total INTEGER NOT NULL,
    relationship_type TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Idempotent Action Log (Prevents duplicate agent execution & enables replay)
CREATE TABLE IF NOT EXISTS action_log (
    action_id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE,
    campaign_id TEXT NOT NULL DEFAULT 'CMP-184-ZHOU-01',
    turn_number INTEGER NOT NULL,
    game_date TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    result TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Turn Log & Journal
CREATE TABLE IF NOT EXISTS turn_log (
    turn_number INTEGER PRIMARY KEY,
    game_date TEXT NOT NULL,
    turn_title TEXT NOT NULL,
    location TEXT NOT NULL,
    summary TEXT NOT NULL,
    dilemma_choice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. NPC Active State (Attributes, Loyalty, Roles, Work Assignments)
CREATE TABLE IF NOT EXISTS npc_state (
    npc_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    loyalty INTEGER NOT NULL DEFAULT 75 CHECK (loyalty >= 0 AND loyalty <= 100),
    morale INTEGER NOT NULL DEFAULT 80 CHECK (morale >= 0 AND morale <= 100),
    fatigue INTEGER NOT NULL DEFAULT 0 CHECK (fatigue >= 0 AND fatigue <= 100),
    int_attr INTEGER NOT NULL DEFAULT 50,
    pol_attr INTEGER NOT NULL DEFAULT 50,
    war_attr INTEGER NOT NULL DEFAULT 50,
    ldr_attr INTEGER NOT NULL DEFAULT 50,
    dip_attr INTEGER NOT NULL DEFAULT 50,
    com_attr INTEGER NOT NULL DEFAULT 50,
    log_attr INTEGER NOT NULL DEFAULT 50,
    cra_attr INTEGER NOT NULL DEFAULT 50,
    talents TEXT DEFAULT '[]',
    personality TEXT NOT NULL DEFAULT 'PRAGMATIC',
    motivation TEXT NOT NULL DEFAULT 'SECURITY',
    assigned_business_id TEXT,
    assigned_role TEXT NOT NULL DEFAULT 'UNASSIGNED',
    monthly_wage INTEGER NOT NULL DEFAULT 750 CHECK (monthly_wage >= 0),
    management_exp INTEGER NOT NULL DEFAULT 0,
    craft_exp INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. NPC Skills Ladder (Tiers, EXP, Upgrades)
CREATE TABLE IF NOT EXISTS npc_skills (
    npc_id TEXT NOT NULL,
    skill_code TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 5),
    current_exp INTEGER NOT NULL DEFAULT 0 CHECK (current_exp >= 0),
    max_exp INTEGER NOT NULL DEFAULT 40 CHECK (max_exp > 0),
    notes TEXT,
    PRIMARY KEY (npc_id, skill_code),
    FOREIGN KEY(npc_id) REFERENCES npc_state(npc_id)
);

-- 13. Businesses & Autonomous Enterprise Facilities
CREATE TABLE IF NOT EXISTS businesses (
    business_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location_id TEXT NOT NULL DEFAULT 'LOC-0001',
    manager_npc_id TEXT,
    safe_cash INTEGER NOT NULL DEFAULT 3000 CHECK (safe_cash >= 0),
    delegation_level INTEGER NOT NULL DEFAULT 2, -- 1: Routine, 2: Autonomous SOP, 3: Full Strategic
    efficiency_multiplier REAL NOT NULL DEFAULT 0.85,
    current_workforce INTEGER NOT NULL DEFAULT 4,
    monthly_capacity_hours INTEGER NOT NULL DEFAULT 800,
    monthly_rent INTEGER NOT NULL DEFAULT 200,
    auto_procure INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    FOREIGN KEY(manager_npc_id) REFERENCES npc_state(npc_id)
);

-- 14. Session Historical Events & Player Choice Chronicle
CREATE TABLE IF NOT EXISTS session_events (
    event_id TEXT PRIMARY KEY,
    triggered_turn INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RESOLVED', 'IGNORED'
    player_choice TEXT,                      -- 'OPTION_A', 'OPTION_B', 'OPTION_C'
    outcome_type TEXT DEFAULT 'CANON',       -- 'CANON', 'ALTERNATE'
    choice_narrative TEXT,
    resolution_narrative TEXT,
    rewards_claimed TEXT,
    resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. NPC Personal Progression & Living World Ambitions
CREATE TABLE IF NOT EXISTS npc_personal_progression (
    npc_id TEXT PRIMARY KEY,
    life_ambition TEXT NOT NULL DEFAULT 'VANGUARD_HERO',
    current_focus TEXT NOT NULL DEFAULT 'MARTIAL_TRAINING',
    personal_cash INTEGER NOT NULL DEFAULT 500,
    prestige INTEGER NOT NULL DEFAULT 50,
    personal_troops INTEGER NOT NULL DEFAULT 0,
    milestone_title TEXT DEFAULT 'Trác Huyện Hào Hiệp',
    growth_stats_json TEXT DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. NPC Autonomous Journey Chronicle & Life Events
CREATE TABLE IF NOT EXISTS npc_journey_logs (
    id TEXT PRIMARY KEY,
    npc_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    game_date TEXT NOT NULL,
    action_type TEXT NOT NULL,
    title_vi TEXT NOT NULL,
    narrative_vi TEXT NOT NULL,
    stat_changes_json TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. NPC Career Paradigm Shifts (Đột Phá Thân Phận & Bước Ngoặt Cuộc Đời)
CREATE TABLE IF NOT EXISTS npc_career_shifts (
    shift_id TEXT PRIMARY KEY,
    npc_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    game_date TEXT NOT NULL,
    shift_category TEXT NOT NULL, -- 'PROMOTION', 'INDEPENDENCE', 'WARLORD_COMMISSION', 'DEFECT_RIVAL', 'MASTERWORK_ELEVATION'
    old_tier TEXT NOT NULL,
    new_tier TEXT NOT NULL,
    old_role TEXT NOT NULL,
    new_role TEXT NOT NULL,
    title_vi TEXT NOT NULL,
    narrative_vi TEXT NOT NULL,
    consequences_json TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Cross-NPC Peer Relationships (Mạng Lưới Tương Tác Chéo Giữa Các NPC)
CREATE TABLE IF NOT EXISTS npc_peer_relations (
    id TEXT PRIMARY KEY,
    npc_id_a TEXT NOT NULL,
    npc_id_b TEXT NOT NULL,
    affinity INTEGER NOT NULL DEFAULT 0 CHECK (affinity >= -100 AND affinity <= 100),
    respect INTEGER NOT NULL DEFAULT 10 CHECK (respect >= 0 AND respect <= 100),
    relation_type TEXT NOT NULL DEFAULT 'ACQUAINTANCE', -- 'SWORN_BROTHERS', 'COMRADES', 'INTERNAL_RIVAL', 'MASTER_DISCIPLE', 'BITTER_FEUD', 'DEBTOR_CREDITOR'
    interaction_history_json TEXT DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(npc_id_a, npc_id_b)
);

-- 19. Session Factions & Warlord Domains
CREATE TABLE IF NOT EXISTS session_factions (
    faction_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    leader_id TEXT NOT NULL,
    capital_settlement_id TEXT NOT NULL,
    treasury_cash INTEGER NOT NULL DEFAULT 50000 CHECK (treasury_cash >= 0),
    granary_grain REAL NOT NULL DEFAULT 2000.0 CHECK (granary_grain >= 0),
    military_power INTEGER NOT NULL DEFAULT 1000 CHECK (military_power >= 0),
    prestige INTEGER NOT NULL DEFAULT 100 CHECK (prestige >= 0),
    ideology TEXT NOT NULL DEFAULT 'WARLORD', -- 'ROYALIST', 'REBEL', 'WARLORD', 'MERCHANT_GUILD'
    color_hex TEXT NOT NULL DEFAULT '#c53030',
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. Session Settlement Control & Regional Governance
CREATE TABLE IF NOT EXISTS session_settlements (
    settlement_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    province_vi TEXT NOT NULL,
    province_en TEXT NOT NULL,
    ruler_faction_id TEXT NOT NULL,
    governor_id TEXT,
    public_order INTEGER NOT NULL DEFAULT 80 CHECK (public_order >= 0 AND public_order <= 100),
    garrison_troops INTEGER NOT NULL DEFAULT 500 CHECK (garrison_troops >= 0),
    agriculture INTEGER NOT NULL DEFAULT 60 CHECK (agriculture >= 0 AND agriculture <= 100),
    commerce INTEGER NOT NULL DEFAULT 60 CHECK (commerce >= 0 AND commerce <= 100),
    defense INTEGER NOT NULL DEFAULT 70 CHECK (defense >= 0 AND defense <= 100),
    granary_grain REAL NOT NULL DEFAULT 500.0 CHECK (granary_grain >= 0),
    treasury_cash INTEGER NOT NULL DEFAULT 10000 CHECK (treasury_cash >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ruler_faction_id) REFERENCES session_factions(faction_id)
);

-- 21. Faction Officers & Ambition / Loyalty Mechanics
CREATE TABLE IF NOT EXISTS faction_officers (
    officer_id TEXT NOT NULL,
    faction_id TEXT NOT NULL,
    court_rank TEXT NOT NULL DEFAULT 'OFFICER', -- 'RULER', 'CHIEF_COMMANDER', 'CHIEF_ADVISOR', 'GOVERNOR', 'GENERAL', 'OFFICER', 'RETAINER'
    loyalty INTEGER NOT NULL DEFAULT 75 CHECK (loyalty >= 0 AND loyalty <= 100),
    ambition INTEGER NOT NULL DEFAULT 50 CHECK (ambition >= 0 AND ambition <= 100),
    appointed_settlement_id TEXT,
    betrayal_risk REAL NOT NULL DEFAULT 0.0 CHECK (betrayal_risk >= 0.0 AND betrayal_risk <= 1.0),
    secret_faction_sympathy TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (officer_id, faction_id),
    FOREIGN KEY(faction_id) REFERENCES session_factions(faction_id)
);

-- 22. Faction Political Intrigues & Historical Crises
CREATE TABLE IF NOT EXISTS faction_political_events (
    event_id TEXT PRIMARY KEY,
    turn_number INTEGER NOT NULL,
    game_date TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'COUP_ATTEMPT', 'SECESSION_WARLORD', 'OFFICER_DEFECT', 'GOVERNOR_APPOINTED', 'TITLE_INVESTED', 'ASSASSINATION_PLOT', 'FACTION_FOUNDED'
    source_faction_id TEXT NOT NULL,
    target_faction_id TEXT,
    instigator_officer_id TEXT NOT NULL,
    title_vi TEXT NOT NULL,
    narrative_vi TEXT NOT NULL,
    consequences_json TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_faction_id) REFERENCES session_factions(faction_id)
);

-- Indices for rapid querying & integrity checks
CREATE INDEX IF NOT EXISTS idx_cashflow_date ON cashflow_ledger(game_date);
CREATE INDEX IF NOT EXISTS idx_stock_mov_item ON stock_movements(item_code);
CREATE INDEX IF NOT EXISTS idx_npc_delta_npc ON npc_relationship_deltas(npc_id);
CREATE INDEX IF NOT EXISTS idx_account_journal_txn ON account_journal(txn_id);
CREATE INDEX IF NOT EXISTS idx_action_idempotency ON action_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_npc_business ON npc_state(assigned_business_id);
CREATE INDEX IF NOT EXISTS idx_npc_skills_npc ON npc_skills(npc_id);
CREATE INDEX IF NOT EXISTS idx_session_events_status ON session_events(status);
CREATE INDEX IF NOT EXISTS idx_journey_npc ON npc_journey_logs(npc_id);
CREATE INDEX IF NOT EXISTS idx_journey_turn ON npc_journey_logs(turn_number);
CREATE INDEX IF NOT EXISTS idx_shifts_npc ON npc_career_shifts(npc_id);
CREATE INDEX IF NOT EXISTS idx_peer_rel_pair ON npc_peer_relations(npc_id_a, npc_id_b);
CREATE INDEX IF NOT EXISTS idx_settlement_faction ON session_settlements(ruler_faction_id);
CREATE INDEX IF NOT EXISTS idx_officer_faction ON faction_officers(faction_id);
CREATE INDEX IF NOT EXISTS idx_officer_risk ON faction_officers(betrayal_risk);
CREATE INDEX IF NOT EXISTS idx_political_turn ON faction_political_events(turn_number);

