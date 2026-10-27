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
    liquid_cash INTEGER NOT NULL DEFAULT 15000,
    safe_cash INTEGER NOT NULL DEFAULT 0,
    strategic_grain REAL NOT NULL DEFAULT 0.0,
    fixed_capital INTEGER NOT NULL DEFAULT 0,
    special_licenses TEXT DEFAULT '[]',
    health INTEGER NOT NULL DEFAULT 100,
    fatigue INTEGER NOT NULL DEFAULT 0,
    morale INTEGER NOT NULL DEFAULT 100
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

-- 4. Double-Entry Cashflow Ledger (Strict Invariant: Balance = Prev + Inflow - Outflow)
CREATE TABLE IF NOT EXISTS cashflow_ledger (
    txn_id TEXT PRIMARY KEY,
    game_date TEXT NOT NULL,
    counterparty TEXT NOT NULL,
    category TEXT NOT NULL,
    inflow INTEGER NOT NULL DEFAULT 0 CHECK (inflow >= 0),
    outflow INTEGER NOT NULL DEFAULT 0 CHECK (outflow >= 0),
    balance INTEGER NOT NULL,
    memo TEXT,
    status TEXT NOT NULL DEFAULT 'Confirmed'
);

-- 5. Inventory Items (Warehouse & Traveling Packs)
CREATE TABLE IF NOT EXISTS inventory_items (
    item_code TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity >= 0),
    unit_cost_basis INTEGER NOT NULL DEFAULT 0,
    location TEXT NOT NULL DEFAULT 'Zhuo Workshop'
);

-- 6. Physical Stock Movements (MOV Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    mov_id TEXT PRIMARY KEY,
    game_date TEXT NOT NULL,
    item_code TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_cost INTEGER NOT NULL DEFAULT 0,
    balance_after REAL NOT NULL,
    ref_txn TEXT,
    FOREIGN KEY(item_code) REFERENCES inventory_items(item_code)
);

-- 7. NPC Relationship Deltas (Overlay on Immutable Master Dossiers)
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

-- 8. Turn Log & Journal
CREATE TABLE IF NOT EXISTS turn_log (
    turn_number INTEGER PRIMARY KEY,
    game_date TEXT NOT NULL,
    turn_title TEXT NOT NULL,
    location TEXT NOT NULL,
    summary TEXT NOT NULL,
    dilemma_choice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_cashflow_date ON cashflow_ledger(game_date);
CREATE INDEX IF NOT EXISTS idx_stock_mov_item ON stock_movements(item_code);
CREATE INDEX IF NOT EXISTS idx_npc_delta_npc ON npc_relationship_deltas(npc_id);
