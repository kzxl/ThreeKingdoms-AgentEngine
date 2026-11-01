# Project: ThreeKingdoms-AgentEngine Feature Expansion

## Architecture
ThreeKingdoms-AgentEngine is an autonomous Three Kingdoms simulation engine powered by TypeScript (Node.js/Vite/ES6) and an ACID SQLite persistence engine (`saves/session.db`). The architecture enforces double-entry bookkeeping, strict physical inventory conservation, diminishing returns attribute progression, and high-density, Anti-AI-Slop vanilla DOM frontend design.

```
                    +------------------------------------+
                    |       sim-web.js / Vite SPA        |
                    | (Grand Command Hub - Quân Cơ Xứ)   |
                    +-----------------+------------------+
                                      | HTTP REST APIs
                                      v
  +--------------------------------------------------------------------------+
  |                             Core Services                                |
  |  +--------------------+  +----------------------+  +------------------+  |
  |  | FamilyLineage-     |  | SingleCombatDuel-    |  | TavernBanquet-   |  |
  |  | Service (R1)       |  | Service (R2)         |  | Service (R3)     |  |
  |  +--------------------+  +----------------------+  +------------------+  |
  |             |                       |                        |           |
  |  +--------------------+  +----------------------+  +------------------+  |
  |  | AttributeProgress- |  | EquipmentSystem-     |  | DailyInteraction-|  |
  |  | ionService         |  | Service (clamped +5) |  | Engine (Kizuna)  |  |
  |  +--------------------+  +----------------------+  +------------------+  |
  +--------------------------------------------------------------------------+
                                      | ACID Transactions
                                      v
  +--------------------------------------------------------------------------+
  |                       SQLite Database (session.db)                       |
  | - player_state / master_characters / faction_officers                    |
  | - businesses / inventory_items / stock_movements                         |
  | - cashflow_ledger / account_journal (Double-Entry Dr/Cr)                 |
  | - family_lineage / family_spouses / family_children / family_ancestors   |
  +--------------------------------------------------------------------------+
```

## Current Baseline (2026-10-31)

The milestone tables below are the original expansion history. Current verified state:

- **Gate**: `npm run verify` — 76/76 suites (4 legacy + 72 modern), 28 API contracts,
  8 write smokes; `npm run audit` — 1,546 invariants, 0 discrepancies.
- **Data**: 153 master items, 33 talents, 57 skills, 168 master characters, 20
  locations, 41 routes, 132 POI scenes; 58 versioned migrations.
- **P0 systems**: server-authoritative action time, enterprise P&L with debt,
  one career-path resolver, and migration-based text repair (see
  `ARCHITECTURE.md` §7–10 and `DECISIONS.md` ADR-007–010).

## Code Layout
- **Core Database & Models**: `src/core/database.ts`, `tools/schema.sql`
- **Action Time**: `src/shared/action-time.ts`, `engine/action-policy.js`, `engine/time-manager.js`
- **Enterprise Economics**: `engine/business-economics.js`, `tools/migrations/042-business-economics.js`
- **Career Paths**: `engine/career-paths.js`, `src/modules/progression/progression.controller.ts`
- **Data Repair**: `tools/migrations/043-text-cleanup.js`, `tests/verify-data-cleanup.ts`
- **R1 (Lineage & Succession)**:
  - Service: `src/modules/lineage-succession/family-lineage.service.ts`
  - Controller: `src/modules/lineage-succession/lineage.controller.ts`
  - Tests: `tests/verify-marriage-lineage.ts`
- **R2 (Single Combat Duels)**:
  - Service: `src/modules/military/single-combat-duel.service.ts`
  - Integration: `src/modules/social-kizuna/daily-interaction.engine.ts`, `src/modules/ecology-logistics/caravan-logistics.service.ts`
  - Tests: `tests/verify-rotk-duels.ts`
- **R3 (Tavern Banquets & Brotherhood)**:
  - Service: `src/modules/social-kizuna/tavern-banquet.service.ts`
  - Integration: `src/modules/social-kizuna/daily-interaction.engine.ts`, `src/modules/professions/enterprise-labor.service.ts`
  - Tests: `tests/verify-tavern-banquets.ts`
- **R4 (Grand Command Hub UI & Anti-AI-Slop)**:
  - UI Component: `public/js/grand-command-hub-ui.js`
  - Master Template: `public/index.html`
  - Styling Tokens: `public/styles.css`
  - Web Server & REST Dispatcher: `tools/sim-web.js`
  - Sanitized Assets: `public/js/map-data.js`, `public/js/caravan-ui.js`, `public/js/equipment-ui.js`, `src/modules/contextual-actions/context-action.engine.ts`
- **Audit & Invariants**:
  - `tools/sim-audit.js` (1,546 invariants in eight blocks: Cashflow, Inventory,
    Double-Entry, Projection, NPC/Enterprise, Grand Strategy, Life-Sim, Clock)

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Heroine Courtship & Dowry | Court prominent heroines (Zhen Ji, Sun Shangxiang, Da Qiao, Xiao Qiao, Cai Wenji) when Affinity $\ge 80$ with cashflow & double-entry journaled dowry gifts | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Marriage & Cohabitation | Official wedding ceremony, spouse cohabitation, and family lineage registry | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Pregnancy & Childbirth | Conception simulation, gestational progress, and childbirth event generating heir dossiers | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Genetic Stat Inheritance | Stat genetics based on parental averages with mutation rolls $[-3, +5]$ and unique maternal trait perks | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Master Mentorship | Child mentorship under historical masters (Lu Zhi, Guan Yu, Zhang Fei, Zhang Shiping, Chen Bao) awarding stat growth | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Lineage Succession Protocol | Inherit treasury, enterprises, warehouses, and legendary gear upon aging/retirement, archiving ancestor without breaking `PLY-0001` FK integrity | M1 | ORIGINAL_REQUEST §R1 |
| 7 | 1v1 Tactical Duel Mini-game | Turn-based 3-5 round martial skirmish with 4 tactical commands (Attack, Defend, Special Strike, Focus Spirit) and priority resolution | M2 | ORIGINAL_REQUEST §R2 |
| 8 | WAR & Equipment Power Calc | Duel combat power derived from effective WAR boosted by forged legendary gear (+1 to +5 stats clamped) and Morale | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Contextual Duel Triggers | Friendly sparring with Zhang Fei / Guan Yu, tournament challenges in Diễn Võ, and caravan ambush defense | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Tavern Banquet Hosting | Grand banquets at player's tavern enterprise consuming crafted gourmet dishes and Dukang wine across 3 tiers (Tiểu Yến, Hào Hiệp Yến, Đào Viên Anh Hùng Yến) | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Affinity Acceleration | Massive intimacy and respect boosts with visiting historical heroes and scholars upon feasting | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Sworn Brotherhood & Oath | Peach Garden sworn brotherhood oath (Affinity $\ge 80$, Tier 5 fog unlock, life-and-death bond) | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Hero & Retainer Recruitment | Recruit high-affinity heroes as loyal family retainers and commanders into `FAC-LIANG-CLAN` (`faction_officers`) | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Grand Command Hub Shell | Reorganize fragmented buttons in `.cmd-bar-right` and purge dynamic injections in `equipment-ui.js` / `enterprise-ui.js` into single Master Hub `#grand-command-hub-modal` | M4 | ORIGINAL_REQUEST §R4 |
| 15 | 6 High-Density Tabs | Tab 1 Quân Trang `[武]`, Tab 2 Sản Nghiệp `[業]`, Tab 3 Thương Đoàn `[商]`, Tab 4 Gia Thất `[家]`, Tab 5 Diễn Võ `[演]`, Tab 6 Tụ Nghĩa `[義]` | M4 | ORIGINAL_REQUEST §R4 |
| 16 | Codebase-wide Anti-AI-Slop | Purge all emojis in UI and REST payloads (`map-data.js`, `caravan-ui.js`, `sim-web.js`, `context-action.engine.ts`), replace with authentic Hanzi seals | M4 | ORIGINAL_REQUEST §R4 |
| 17 | E2E Testing Runner & Verification | Full gate across all feature suites; current state is 76/76 suites, 28 API contracts, 8 write smokes and 1,546 SQLite audit invariants | M5 | ORIGINAL_REQUEST §Acceptance |
| 18 | Historical Master Catalog & 20-Settlement Strategic Map | Enriched 129 master items, 33 talents, 168 characters, 20 historical citadels, 41 tactical routes across 4 terrain profiles (`HIGHWAY`, `WATERWAY`, `MOUNTAIN_PASS`, `PLANK_ROAD`), 3 view modes (`overview`, `military`, `economy`), and route pulse animation | M6 | GRAND_STRATEGY_EXPANSION |
| 19 | Specialist Workforce Recruitment (Loop 1) | 20 auxiliary specialists (`NPC-0201` to `NPC-0220`), recruitment signing bonus via double-entry journal, assignment to businesses boosting efficiency by +15% to +25% | M6 | GRAND_STRATEGY_EXPANSION |
| 20 | 20-Settlement Arbitrage & Caravans (Loop 2) | Full price profile coverage for all 20 citadels, long-distance trade caravans with 3 guard tiers (`MILITIA`, `VETERAN`, `ELITE_RETINUE`), bandit ambushes, and destination liquidation | M6 | GRAND_STRATEGY_EXPANSION |
| 21 | Garrisons & Citadel Siege Assaults (Loop 3) | Recruit and station garrison troops, wall defense ratings (10-100), vanguard siege assaults with defense destruction and war loot plundering (`WAR_LOOT`) | M6 | GRAND_STRATEGY_EXPANSION |
| 22 | Double-Entry Transaction Engine | `src/shared/financial-transaction.ts`, atomic Dr == Cr accounting, `game/PROGRESS.md` synchronization, and the current 1,546 audit invariants | M6 | GRAND_STRATEGY_EXPANSION |
| 23 | Server-Authoritative Action Time | `src/shared/action-time.ts` charges days at the HTTP boundary for duels, social, banquets, recruitment, caravans, gathering, crafting, forging and enterprise actions; `/api/time/spend` is a clock refresh | M7 | P0 1.23.1 |
| 24 | Enterprise P&L with Debt | Migration 042 adds `businesses.tier/debt`; `engine/business-economics.js` settles output, wages, rent and debt; owner withdrawals are blocked while insolvent | M7 | P0 1.23.2 |
| 25 | Career-Path Resolver | `engine/career-paths.js` computes five scores and applies the active path's EXP, trade, crafting and clan-prestige modifiers; `duelWins` now reads `session_duels.outcome_type` | M7 | P0 1.23.3 |
| 26 | Text and Currency Repair | Migration 043 resyncs player skill names from the master catalog, repairs two medicine items and rewrites numeric legacy currency labels to Quan | M7 | P0 1.23.4 |
| 27 | Local Market Write Side | `SettlementMarketService.applyTrade` books every buy/sell into `settlement_market_state`; SimCore, `/api/trade` and caravan claims move the next local quote | M8 | P1 1.24.0 |
| 28 | Periodic Obligations | Migration 044 adds monthly tax bills due day 15; the player pays explicitly, and an unpaid bill becomes OVERDUE with a late fee and credibility loss | M8 | P1 1.24.1 |
| 29 | Repeatable Contract Board | Migration 045 posts three delivery contracts per settlement per month; delivery consumes real stock, expiry creates a penalty obligation | M8 | P1 1.24.2 |
| 30 | Combat Injuries and NPC Death | Migration 046 adds `conditions`; injuries reduce effective WAR, NPC officers die permanently, and one month of rest heals | M9 | RPG 1.25.0 |
| 31 | Scenario War and Alliance Seeds | 184/190/200/208 now differ in holdings, wars and allies; both scenario appliers write `WAR`/`ALLY` diplomacy | M9 | ROTK 1.25.1 |
| 32 | Intel Reports | Migration 047 posts monthly price/garrison rumors with confidence; verifying costs two days and can expose a false claim | M9 | RPG 1.25.2 |
| 33 | Rented Farmland and Crops | Migration 048 adds a seasonal crop catalog and four parcels per settlement; rent, plant in season, harvest real grain, with late/risk losses | M10 | RPG 1.26.0 |
| 34 | Ledger Completeness | `postDoubleEntry` plus migration 049 guarantee every cashflow row has a balanced journal pair; the audit fails otherwise | M11 | Core 1.26.1 |
| 35 | Core Time Coverage | Trade, military, politics, household and movement actions charge days server-side through `chargePlayerAction` | M11 | Core 1.26.2 |
| 36 | Idempotency and Action Journal | `action-journal` replays keyed financial actions without double effects and records every success in `action_log` | M11 | Core 1.26.3 |
| 37 | Runtime Schema Contract | Migration 050 owns the runtime tables/columns; a fresh schema + migrations database matches the live contract | M11 | Core 1.26.4 |
| 38 | Zero Silent Catch | All empty catch blocks documented; the architecture ratchet is locked at 0 | M11 | Core 1.26.5 |
| 39 | World Treasury Ledger | Migration 051 adds `faction_ledger`; every tax, tribute, caravan, reward and rent flow updates treasury through the ledger | M12 | Core 1.27.0 |
| 40 | Full Mutation Idempotency | Politics, lineage, wage labor, expeditions, sieges and caravan claims accept idempotency keys and record in `action_log` | M12 | Core 1.27.1 |
| 41 | Settlement Treasury Ledger | Migration 052 adds `settlement_ledger`; siege loot and local flows update treasury through the ledger | M13 | Core 1.28.0 |
| 42 | Atomic World Month Close | Each world module runs in one transaction; a failure rolls back its writes and aborts the close before the clock moves | M13 | Core 1.28.1 |
| 43 | Day Phases | Three phases per day; administrative actions spend one phase, field actions spend whole days | M13 | Core 1.29.0 |
| 44 | Loan Contracts | Borrow/repay charge one phase, replay without double cash, and book through `postDoubleEntry` | M14 | Extended 1.30.0 |
| 45 | Ecology Mutation Contracts | Relief, stronghold assault and transport replay cleanly; loot is ledgered and transport uses the caravan writer | M14 | Extended 1.30.0 |
| 46 | Profession Mutation Contracts | Gather, craft, forge, hire, open and collect accept idempotency keys without double stock or cash | M14 | Extended 1.30.0 |
| 47 | Social Mutation Contracts | Kizuna, banquet, brotherhood and recruitment replay without double affinity, dishes or days | M14 | Extended 1.30.0 |
| 48 | Progression Mutation Contracts | Move, quest accept/step, perk and explore replay without extra days or rewards | M14 | Extended 1.30.0 |
| 49 | Duel Mutation Contracts | Duel initiation and rounds resolve once per key, including spar, arena and ambush | M14 | Extended 1.30.0 |
| 50 | Lineage Mutation Contracts | Pregnancy, birth, mentorship, aging and succession replay without duplicate children or assets | M14 | Extended 1.30.0 |
| 51 | Life Wiring | Kizuna mentorship EXP, growth focus, spouse role bonuses and virtue discount are applied | M15 | Life 1.31.0 |
| 52 | Life Layer Core Loop | `player_life_state`, 9 LIFE skills, six daily actions, upkeep ledger and Gia Đạo tab | M15 | Life 1.31.0 |
| 53 | Livelihood Skills | 12 agriculture/fishing/foraging/survival skills with effects, perks, tool and node rules | M16 | Livelihood 1.32.0 |
| 54 | Resource & Farm Depth | Node stock/regrowth, tool yield penalty, crop skill/rotation/soil and rent discount | M16 | Livelihood 1.32.0 |
| 55 | Resource Variants | Skill/season-weighted fish, game and timber outputs with hide/roe/antler byproducts | M17 | Livelihood 1.33.0 |
| 56 | Processing Chains | Dried fish, fish sauce, game jerky, cured hide and sawn planks with skill gates | M17 | Livelihood 1.33.0 |
| 57 | Rare Variant Recipes | Carp, caviar, shrimp paste, venison jerky, antler tonic, pine/ebony boards | M18 | Livelihood 1.34.0 |
| 58 | Active Node Restoration | Replant/restock action with stock item, cash fee, skill gate, ledger and UI | M18 | Livelihood 1.34.0 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test harness, test runners, and multi-tier test specifications for all 17 features | none | DONE |
| M1 | Marriage, Childbirth & Lineage Succession (R1) | Features 1-6: SQLite schemas, `FamilyLineageService`, courtship, genetics, mentorship, succession protocol | none | DONE |
| M2 | Three Kingdoms Single Combat Dueling System (R2) | Features 7-9: `SingleCombatDuelService`, 4 tactical commands, 3-5 round loop, equipment WAR scaling, contextual triggers | none | DONE |
| M3 | Tavern Hero Banquets & Brotherhood (R3) | Features 10-13: `TavernBanquetService`, gourmet dishes/Dukang wine consumption, brotherhood oath, retainer recruitment | none | DONE |
| M4 | Grand Command Hub UI & Anti-AI-Slop (R4) | Features 14-16: Unified `#grand-command-hub-modal`, 6 tabs, REST wiring in `sim-web.js`, emoji eradication | M1, M2, M3 | DONE |
| M5 | Final E2E Suite Pass & Adversarial Hardening | Feature 17: pass the full E2E gate (currently 76 suites and 1,546 invariants), forensic auditor review, Tier 5 hardening | E2E, M1-M4 | DONE |
| M6 | Grand Strategy & 3-Loop Expansion | Features 18-22: 20-settlement 3-layer world map, specialist workforce, 20-city arbitrage caravans, siege assaults, and the invariant auditor | M1-M5 | DONE |
| M7 | Realistic-RPG P0 Foundation | Features 23-26: server-authoritative action time, enterprise P&L with debt, one career-path resolver, and migration-based data repair | M1-M6 | DONE |
| M8 | P1 Local Economy Loop | Features 27-29: local market write side, periodic obligations and the repeatable contract board | M1-M7 | DONE |
| M9 | RPG/ROTK Consequence Layer | Features 30-32: injuries and NPC death, scenario war/alliance identity, and confidence-based intel reports | M1-M8 | DONE |
| M10 | Agriculture Loop | Feature 33: rented farmland, seasonal crops and real harvest output | M1-M9 | DONE |
| M11 | Core Hardening | Features 34-38: ledger completeness, time coverage, idempotency/journal, schema contract and zero silent catch | M1-M10 | DONE |
| M12 | World Ledger & Full Idempotency | Features 39-40: faction treasury ledger and idempotency on every key mutation | M1-M11 | DONE |
| M13 | Core Completion | Features 41-43: settlement ledger, per-module atomic world close and day phases | M1-M12 | DONE |
| M14 | Extended Feature Contracts | Features 44-50: loans, ecology, professions, social, progression, duels and lineage follow time/idempotency/ledger contracts | M1-M13 | DONE |
| M15 | Life Layer Core Loop | Features 51-52: life wiring plus daily needs, nine LIFE skills and the Gia Đạo tab | M1-M14 | DONE |
| M16 | Livelihood Depth Foundation | Features 53-54: livelihood skills, node rules/state, tools and farm rotation/soil | M1-M15 | DONE |
| M17 | Resource Variants & Processing | Features 55-56: weighted species, byproducts and fish/jerky/hide/plank recipes | M1-M16 | DONE |
| M18 | Rare Recipes & Restoration | Features 57-58: rare-variant sinks plus replant/restock action and UI | M1-M17 | DONE |

---

## Interface Contracts

### 1. Family Lineage Module (`src/modules/lineage-succession/`)
```typescript
export interface ProposeMarriageParams {
  playerId: string;
  spouseNpcId: string;
  dowryCash: number;
}

export interface GeneticAttributeRoll {
  fatherStat: number;
  motherStat: number;
  mutationDelta: number; // clamped [-3, +5]
  maternalTraitBonus?: number;
  finalStat: number;
}

export interface MentorshipSessionResult {
  childId: string;
  mentorNpcId: string;
  statGained: 'WAR' | 'INT' | 'POL' | 'COM' | 'CRA';
  expDelta: number; // +8 to +12
}

export interface SuccessionExecutionParams {
  heirChildId: string;
  retirementReason: 'AGE' | 'INJURY' | 'VOLUNTARY';
}
```

### 2. Single Combat Duel Module (`src/modules/military/`)
```typescript
export type TacticalCommand = 'ATTACK' | 'DEFEND' | 'SPECIAL_STRIKE' | 'FOCUS_SPIRIT';

export interface DuelCombatant {
  characterId: string;
  name: string;
  effectiveWar: number; // Base WAR + equipment clamped [+1..+5]
  morale: number; // 0 - 100
  currentHp: number; // Max HP scaled by War & Morale
  maxHp: number;
  spirit: number; // 0 - 100 (charges via Focus Spirit)
}

export interface DuelRoundResolution {
  roundNumber: number;
  playerCommand: TacticalCommand;
  opponentCommand: TacticalCommand;
  playerDamageDealt: number;
  opponentDamageDealt: number;
  narrativeVi: string;
  isDuelConcluded: boolean;
  winnerId?: string;
}
```

### 3. Tavern Banquet Module (`src/modules/social-kizuna/`)
```typescript
export type BanquetTier = 'TIET_KIEM' | 'HAO_HIEP' | 'DAO_VIEN';

export interface HostBanquetParams {
  playerId: string;
  tavernEnterpriseId: string;
  tier: BanquetTier;
  guestNpcIds: string[];
}

export interface BanquetResult {
  dishesConsumed: { itemCode: string; quantity: number }[];
  wineConsumed: { itemCode: string; quantity: number }[];
  affinityGainPerGuest: number;
  respectGainPerGuest: number;
  unlockedBrotherhoodNpcIds: string[];
}

export interface RecruitRetainerParams {
  playerId: string;
  heroNpcId: string;
  assignedRole: 'COMMANDER' | 'COMMERCIAL_AGENT' | 'ESTATE_GUARDIAN';
}
```

### 4. Grand Command Hub REST Endpoints (`tools/sim-web.js`)
- `GET /api/lineage/status` -> Family tree, current spouses, children, heirs
- `POST /api/lineage/courtship` -> Propose marriage with dowry
- `POST /api/lineage/mentor` -> Assign child to historical master
- `POST /api/lineage/succeed` -> Execute dynasty succession
- `POST /api/duel/initiate` -> Start 1v1 duel (sparring, arena, or ambush)
- `POST /api/duel/round` -> Submit command for round
- `POST /api/banquet/host` -> Host banquet with dishes & wine
- `POST /api/banquet/brotherhood` -> Swear peach garden brotherhood
- `POST /api/banquet/recruit` -> Recruit hero to `FAC-LIANG-CLAN`
