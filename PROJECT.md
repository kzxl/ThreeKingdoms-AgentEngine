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

## Code Layout
- **Core Database & Models**: `src/core/database.ts`, `tools/schema.sql`
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
  - `tools/sim-audit.js` (193/193 invariants: Cashflow, Inventory, Double-Entry, Projection, State)

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
| 17 | E2E Testing Runner & Verification | 100% pass across Marriage, Single Combat Duels, Tavern Banquets, existing suites (`verify-equipment-and-exp.ts`, `verify-enterprise-labor.ts`, `test-branch4-logistics.ts`), and 140/140 SQLite audit invariants | M5 | ORIGINAL_REQUEST §Acceptance |
| 18 | Historical Master Catalog & 20-Settlement Strategic Map | Enriched 120+ master items, 30+ talents, 150+ characters, 20 historical citadels, 24 tactical routes across 4 terrain profiles (`HIGHWAY`, `WATERWAY`, `MOUNTAIN_PASS`, `PLANK_ROAD`), 3 view modes (`overview`, `military`, `economy`), and route pulse animation | M6 | GRAND_STRATEGY_EXPANSION |
| 19 | Specialist Workforce Recruitment (Loop 1) | 20 auxiliary specialists (`NPC-0201` to `NPC-0220`), recruitment signing bonus via double-entry journal, assignment to businesses boosting efficiency by +15% to +25% | M6 | GRAND_STRATEGY_EXPANSION |
| 20 | 20-Settlement Arbitrage & Caravans (Loop 2) | Full price profile coverage for all 20 citadels, long-distance trade caravans with 3 guard tiers (`MILITIA`, `VETERAN`, `ELITE_RETINUE`), bandit ambushes, and destination liquidation | M6 | GRAND_STRATEGY_EXPANSION |
| 21 | Garrisons & Citadel Siege Assaults (Loop 3) | Recruit and station garrison troops, wall defense ratings (10-100), vanguard siege assaults with defense destruction and war loot plundering (`WAR_LOOT`) | M6 | GRAND_STRATEGY_EXPANSION |
| 22 | Double-Entry Transaction Engine & 193 Invariants | `src/shared/financial-transaction.ts`, atomic Dr == Cr accounting, `game/PROGRESS.md` synchronization, and 193/193 audit invariants verified | M6 | GRAND_STRATEGY_EXPANSION |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test harness, test runners, and multi-tier test specifications for all 17 features | none | DONE |
| M1 | Marriage, Childbirth & Lineage Succession (R1) | Features 1-6: SQLite schemas, `FamilyLineageService`, courtship, genetics, mentorship, succession protocol | none | DONE |
| M2 | Three Kingdoms Single Combat Dueling System (R2) | Features 7-9: `SingleCombatDuelService`, 4 tactical commands, 3-5 round loop, equipment WAR scaling, contextual triggers | none | DONE |
| M3 | Tavern Hero Banquets & Brotherhood (R3) | Features 10-13: `TavernBanquetService`, gourmet dishes/Dukang wine consumption, brotherhood oath, retainer recruitment | none | DONE |
| M4 | Grand Command Hub UI & Anti-AI-Slop (R4) | Features 14-16: Unified `#grand-command-hub-modal`, 6 tabs, REST wiring in `sim-web.js`, emoji eradication | M1, M2, M3 | DONE |
| M5 | Final E2E Suite Pass & Adversarial Hardening | Feature 17: Pass 100% E2E tests, verify 140/140 audit invariants, forensic auditor review, Tier 5 hardening | E2E, M1-M4 | DONE |
| M6 | Grand Strategy & 3-Loop Expansion | Features 18-22: 20-settlement 3-layer world map, specialist workforce, 20-city arbitrage caravans, siege assaults, and 193/193 audit invariants | M1-M5 | DONE |

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
