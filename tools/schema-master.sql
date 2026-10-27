-- ============================================================================
-- ThreeKingdoms-AgentEngine: Master Blueprint & Lore Database Schema
-- Standard: IMMUTABLE MASTER DATA (Read-Only during active gameplay)
-- Provides authoritative game rules, item index, NPC dossiers, locations & recipes.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Master Scenarios Catalog
CREATE TABLE IF NOT EXISTS master_scenarios (
    scenario_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    start_date TEXT NOT NULL DEFAULT '184-02-01',
    historical_epoch TEXT NOT NULL,
    description_vi TEXT,
    description_en TEXT,
    initial_factions_count INTEGER DEFAULT 4,
    default_active_turn INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
);

-- 2. Master Player Archetypes (Character Creation Templates)
CREATE TABLE IF NOT EXISTS master_player_archetypes (
    archetype_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    default_player_name TEXT NOT NULL,
    default_style_name TEXT,
    starting_age INTEGER NOT NULL,
    starting_location TEXT NOT NULL,
    initial_liquid_cash INTEGER NOT NULL,
    int_attr INTEGER NOT NULL,
    pol_attr INTEGER NOT NULL,
    war_attr INTEGER NOT NULL,
    ldr_attr INTEGER NOT NULL,
    dip_attr INTEGER NOT NULL,
    com_attr INTEGER NOT NULL,
    log_attr INTEGER NOT NULL,
    cra_attr INTEGER NOT NULL,
    starting_assets TEXT, -- JSON array of initial equipment/facilities
    innate_talents TEXT,  -- JSON array of talents
    initial_perks TEXT,
    bio_vi TEXT,
    bio_en TEXT
);

-- 3. Master Historical Characters Dossier
CREATE TABLE IF NOT EXISTS master_characters (
    npc_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_han TEXT,
    style_name_vi TEXT,
    style_name_en TEXT,
    birth_year INTEGER,
    baseline_age INTEGER,
    baseline_location TEXT NOT NULL,
    baseline_position_vi TEXT,
    baseline_position_en TEXT,
    int_attr INTEGER NOT NULL,
    pol_attr INTEGER NOT NULL,
    war_attr INTEGER NOT NULL,
    ldr_attr INTEGER NOT NULL,
    dip_attr INTEGER NOT NULL,
    com_attr INTEGER NOT NULL,
    log_attr INTEGER NOT NULL,
    cra_attr INTEGER NOT NULL,
    personality TEXT,
    motivation TEXT,
    baseline_sentiment_player INTEGER DEFAULT 0,
    core_associates TEXT, -- JSON array of NPC IDs
    talents TEXT,         -- JSON array of talents
    bio_vi TEXT,
    bio_en TEXT
);

-- 4. Master Strategic Citadels & Geographical Nodes
CREATE TABLE IF NOT EXISTS master_locations (
    location_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_han TEXT,
    province_vi TEXT NOT NULL,
    province_en TEXT NOT NULL,
    coord_x INTEGER NOT NULL,
    coord_y INTEGER NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'METROPOLIS',
    controlling_faction_id TEXT,
    distance_from_zhuo INTEGER NOT NULL DEFAULT 0,
    march_days REAL NOT NULL DEFAULT 1.0,
    grain_cost REAL NOT NULL DEFAULT 1.0,
    threat_level_vi TEXT,
    threat_level_en TEXT,
    status_vi TEXT,
    status_en TEXT,
    default_sub_loc TEXT,
    sub_locations TEXT,   -- JSON array of sub-locations
    key_figures_vi TEXT,
    key_figures_en TEXT,
    strategic_intel_vi TEXT,
    strategic_intel_en TEXT
);

-- 5. Master Factions Registry
CREATE TABLE IF NOT EXISTS master_factions (
    faction_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    leader_name_vi TEXT NOT NULL,
    leader_name_en TEXT NOT NULL,
    capital_location_id TEXT,
    military_strength_desc TEXT,
    estimated_treasury_qian INTEGER,
    strategic_stance_vi TEXT,
    strategic_stance_en TEXT,
    doctrine_vi TEXT,
    doctrine_en TEXT,
    overview_vi TEXT,
    overview_en TEXT
);

-- 6. Master Commodity & Product Catalog
CREATE TABLE IF NOT EXISTS master_items (
    item_code TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL, -- 'RAW_MATERIAL', 'FOOD_STUFF', 'FINISHED_GOOD', 'MILITARY_EQUIPMENT', 'LIVESTOCK'
    unit_vi TEXT NOT NULL,
    unit_en TEXT NOT NULL,
    baseline_peace_price INTEGER NOT NULL,
    current_market_price INTEGER NOT NULL,
    volatility_index TEXT,
    weight_kg REAL DEFAULT 1.0,
    is_contraband INTEGER DEFAULT 0,
    production_source_vi TEXT,
    description_vi TEXT,
    description_en TEXT
);

-- 7. Master Crafting Recipes & Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS master_recipes (
    recipe_code TEXT PRIMARY KEY,
    product_item_code TEXT NOT NULL,
    product_name_vi TEXT NOT NULL,
    product_name_en TEXT NOT NULL,
    category TEXT NOT NULL,
    standard_labor_hours REAL NOT NULL,
    base_defect_rate REAL NOT NULL DEFAULT 0.08,
    required_skill_code TEXT,
    required_skill_tier INTEGER DEFAULT 1,
    bom_inputs TEXT NOT NULL, -- JSON array of [{ item_code, quantity, unit }]
    description_vi TEXT,
    FOREIGN KEY (product_item_code) REFERENCES master_items(item_code)
);

-- 8. Master Skills & Progression Tree
CREATE TABLE IF NOT EXISTS master_skills (
    skill_code TEXT PRIMARY KEY,
    skill_name_vi TEXT NOT NULL,
    skill_name_en TEXT NOT NULL,
    domain TEXT NOT NULL,
    primary_attr TEXT NOT NULL,
    secondary_attr TEXT,
    tier_1_effect_vi TEXT,
    tier_2_effect_vi TEXT,
    tier_3_effect_vi TEXT,
    tier_4_effect_vi TEXT,
    tier_5_effect_vi TEXT
);

-- 9. Master Baseline Diplomatic & Inter-Character Relationships
CREATE TABLE IF NOT EXISTS master_relations_baseline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'NPC_TO_PLAYER', 'FACTION_TO_FACTION', 'NPC_TO_NPC'
    relationship_type_vi TEXT,
    relationship_type_en TEXT,
    baseline_sentiment INTEGER NOT NULL DEFAULT 0,
    notes_vi TEXT,
    notes_en TEXT
);

-- 10. Master Contextual Quick Chips
CREATE TABLE IF NOT EXISTS master_quick_chips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_key TEXT NOT NULL,
    chip_type TEXT NOT NULL,
    icon TEXT,
    label_vi TEXT NOT NULL,
    label_en TEXT NOT NULL,
    prompt_vi TEXT NOT NULL,
    prompt_en TEXT NOT NULL,
    display_order INTEGER DEFAULT 0
);

-- 11. Master Innate Talents & Hero Traits
CREATE TABLE IF NOT EXISTS master_talents (
    talent_code TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL, -- 'LEADERSHIP', 'MARTIAL', 'STRATEGY', 'COMMERCE', 'GOVERNANCE'
    rarity TEXT NOT NULL DEFAULT 'RARE', -- 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'
    effect_vi TEXT NOT NULL,
    effect_en TEXT NOT NULL,
    exclusive_to_npc_id TEXT
);

-- 12. Master Inter-Citadel Geographic & March Routes
CREATE TABLE IF NOT EXISTS master_routes (
    route_id TEXT PRIMARY KEY,
    source_location_id TEXT NOT NULL,
    target_location_id TEXT NOT NULL,
    distance_li INTEGER NOT NULL,
    terrain_type TEXT NOT NULL, -- 'PLAINS', 'MOUNTAIN_PASS', 'RIVER_WATERWAY', 'PLANK_ROAD'
    standard_march_days REAL NOT NULL,
    grain_provision_cost REAL NOT NULL,
    ambush_risk_level TEXT NOT NULL DEFAULT 'LOW', -- 'LOW', 'MODERATE', 'HIGH', 'EXTREME'
    description_vi TEXT,
    description_en TEXT
);

-- 13. Master Historical Events & ROTK Chronicles
CREATE TABLE IF NOT EXISTS master_events (
    event_id TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    historical_year INTEGER NOT NULL,
    season TEXT NOT NULL DEFAULT 'SPRING', -- 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER'
    location_id TEXT,
    primary_character_id TEXT,
    secondary_character_id TEXT,
    involved_factions TEXT, -- JSON array of faction IDs
    prerequisites TEXT,
    summary_vi TEXT NOT NULL,
    summary_en TEXT NOT NULL,
    historical_outcome_vi TEXT,
    historical_outcome_en TEXT,
    gameplay_trigger_type TEXT DEFAULT 'STORY_MILESTONE', -- 'STORY_MILESTONE', 'CHOICE_EVENT', 'BATTLE_DUEL', 'DIPLOMACY'
    gameplay_effects TEXT -- JSON object with reputation, sentiment deltas, item rewards
);

-- Master Indices for Rapid Lookups
CREATE INDEX IF NOT EXISTS idx_master_char_loc ON master_characters(baseline_location);
CREATE INDEX IF NOT EXISTS idx_master_loc_prov ON master_locations(province_vi);
CREATE INDEX IF NOT EXISTS idx_master_items_cat ON master_items(category);
CREATE INDEX IF NOT EXISTS idx_master_recipes_prod ON master_recipes(product_item_code);
CREATE INDEX IF NOT EXISTS idx_master_chips_loc ON master_quick_chips(location_key);
CREATE INDEX IF NOT EXISTS idx_master_routes_src ON master_routes(source_location_id);
CREATE INDEX IF NOT EXISTS idx_master_routes_tgt ON master_routes(target_location_id);
CREATE INDEX IF NOT EXISTS idx_master_talents_npc ON master_talents(exclusive_to_npc_id);
CREATE INDEX IF NOT EXISTS idx_master_events_year ON master_events(historical_year);
CREATE INDEX IF NOT EXISTS idx_master_events_loc ON master_events(location_id);
CREATE INDEX IF NOT EXISTS idx_master_events_char ON master_events(primary_character_id);
