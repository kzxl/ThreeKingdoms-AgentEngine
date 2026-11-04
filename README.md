# [ARCHIVED] ThreeKingdoms-AgentEngine (Simulator)

> [!IMPORTANT]
> ⚠️ **DỰ ÁN ĐÃ CHUYỂN ĐỔI VÀ TIẾP TỤC PHÁT TRIỂN TẠI REPO MỚI**:
> Repository web simulation engine này hiện đã được lưu trữ (archived). Toàn bộ hệ thống mô phỏng đại chiến lược, kinh tế thương gia, nhân duyên, thế thái và võ nghiệp Tam Quốc đã được tái cấu trúc và phát triển toàn diện thành game desktop offline độc lập:
> 👉 **[Một Ngày Ở Tam Quốc (mot-ngay-o-tam-quoc)](https://github.com/kzxl/mot-ngay-o-tam-quoc)** (.NET 8 WPF, Core + DLC Modular Monolith).
>
> Vui lòng truy cập **[https://github.com/kzxl/mot-ngay-o-tam-quoc](https://github.com/kzxl/mot-ngay-o-tam-quoc)** để trải nghiệm phiên bản game hoàn chỉnh mới nhất, tải bản cài đặt và theo dõi lộ trình phát triển.

---

[![Audit Status](https://img.shields.io/badge/Audit-2%2C313%2F2%2C313%20Passed-emerald.svg)](tools/sim-audit.js)
[![Architecture](https://img.shields.io/badge/Architecture-Universe%20v4.0%20Modular-blueviolet.svg)](src/core/module-registry.ts)
[![Stack](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Vite%20%7C%20SQLite%20%7C%20MCP-blue.svg)](package.json)
[![License](https://img.shields.io/badge/License-MIT-gray.svg)](LICENSE)

An autonomous, deterministic grand strategy simulation engine and character-driven RPG modeling the Three Kingdoms era (beginning 184 AD). Engineered with **AgentOption Universe Modular Architecture v4.0**, fullstack **TypeScript & Vite**, an authoritative **SQLite** double-entry ledger, authoritative historical Three Kingdoms data catalogs, an autonomous **Living World** progression engine, and a native **Model Context Protocol (MCP)** bridge for AI Agents.

---

## Table of Contents

1. [Core Architectural Philosophy](#core-architectural-philosophy)
2. [Technology Stack & Repository Layout](#technology-stack--repository-layout)
3. [AgentOption Universe Modular Systems](#agentoption-universe-modular-systems)
4. [Historical Master Catalog & Strategic World Map](#historical-master-catalog--strategic-world-map)
5. [Grand Strategy Gameplay Loops](#grand-strategy-gameplay-loops)
6. [Autonomous Living World & NPC Lifecycle](#autonomous-living-world--npc-lifecycle)
7. [Interactive Historical Event Engine](#interactive-historical-event-engine)
8. [Model Context Protocol (MCP) Integration](#model-context-protocol-mcp-integration)
9. [Getting Started & Operational Commands](#getting-started--operational-commands)
10. [Auditing & Zero-Drift Invariants (2,313)](#auditing--zero-drift-invariants-2313-checks)
11. [Mathematical & Economic Formulas](#mathematical--economic-formulas)

---

## Core Architectural Philosophy

- **Zero Ephemeral Hallucination**: No wealth, weapon, army, relationship, or historical event exists unless it is substantiated in the database/ledger and verified via deterministic formulas.
- **Auditable Double-Entry Bookkeeping**: Money and inventory are strictly conserved. Every `quan` of money and picul (`Thạch`) of grain is tracked via unique transaction IDs (`TXN-`) and stock movements (`MOV-`) with exact $Debit == Credit$ parity.
- **Neuro-Symbolic Dual-Core (Hybrid Architecture)**:
  - **Deterministic Hard Core (TypeScript + SQLite)**: Executes kinetics, military BFS supply paths, thermodynamic price elasticity, utility AI response curves, and double-entry reconciliation in under 15ms per cycle.
  - **Agentic Soft Core (Antigravity LLM + MCP)**: Powers deep character dialogue, unscripted diplomatic intrigue, emergent player stratagems, and episodic memory reflection.
- **Engine Framework vs. Playthrough Decoupling**: Git tracks only the engine skeleton, immutable master seeds (`game/master/`), and tools. Active session databases (`saves/session.db`) and playthrough state are local and git-ignored.

---

## Technology Stack & Repository Layout

```text
ThreeKingdoms-AgentEngine/
├── src/                               # Fullstack TypeScript Architecture
│   ├── core/                          # Micro-kernel & Universal Contracts
│   │   ├── database.ts                # Authoritative SQLite wrapper & transaction context
│   │   ├── event-bus.ts               # In-Memory EventBus (Indirect Communication)
│   │   ├── module-registry.ts         # Module Registry & Lifecycle Management
│   │   └── types.ts                   # Strongly-typed Domain Models & DTOs
│   │
│   ├── modules/                       # Autonomous Feature Modules
│   │   ├── utility-ai/                # Continuous Utility AI & 4-Tier LOD Scheduler
│   │   ├── military/                  # Garrisons, Sieges, Dueling & BFS Supply Graph
│   │   ├── economy/                   # Regional Market Arbitrage, Prices & Double-Entry Ledger
│   │   ├── ecology-logistics/         # Caravans, Road Encounters & Spatial Travel Graph
│   │   ├── social-kizuna/             # 2-Axis Kizuna Mesh, Banquets & Sworn Brotherhood
│   │   ├── professions/               # Workforce Management, Labor Shifts & Bespoke Forging
│   │   ├── lineage-succession/        # Marriage, Courtship, Childbirth & Heritage Succession
│   │   ├── progression/               # Diminishing Returns Attribute & Title Progression
│   │   ├── agent-bridge/              # Episodic Memory Harvesting & Semantic Hook
│   │   └── npc-lifecycle/             # NPC Autonomous Progression & Ambitions
│   │
│   ├── shared/                        # Cross-Cutting Core Utilities
│   │   ├── ledger.ts                  # The only cashflow writer (typed + raw)
│   │   ├── account-codes.ts           # Canonical chart of accounts + legacy aliases
│   │   ├── action-time.ts             # Server-side action time authority
│   │   ├── financial-transaction.ts   # Double-Entry Atomic Ledger Engine (Dr == Cr)
│   │   ├── victory.ts                 # Victory/defeat conditions and NG+ legacy
│   │   └── market-*.ts, prestige.ts   # Shared price, fame and progression rules
│   │
│   ├── client/                        # Modern TypeScript modal/UI bundle
│   ├── server/                        # Backend Server Composition Root
│   │   ├── router.ts                  # Lightweight REST Router & JSON Dispatcher
│   │   └── main.ts                    # Bootstraps modular engine & exposes REST API (:3300)
│   │
│   └── mcp/                           # Native Model Context Protocol (MCP) Suite
│       ├── types.ts                   # JSON-RPC 2.0 & MCP protocol schemas
│       ├── tools.ts                   # Authoritative tool execution handlers
│       └── server.ts                  # Standard stdio MCP server for AI Agents
│
├── engine/                            # CommonJS simulation kernel
│   ├── time-manager.js                # Day clock, month boundary, single time writer
│   ├── action-policy.js               # Day/fatigue cost table
│   ├── business-economics.js          # Pure enterprise monthly settlement
│   ├── career-paths.js                # Five career scores and modifiers
│   ├── gameplay-manager.js            # New game, day loop, month close
│   └── sim-core.js                    # Validate → rule → atomic SQLite → log
│
├── config/                            # Balance and rules data (single source)
│   ├── game-constants.json            # Currency, grain, calendar, fatigue, EXP curve
│   ├── prestige.json                  # Fame tiers, gains, decay, effects
│   ├── battle-duel.json               # Duel, death and negotiation balance
│   └── scenario-seeds.json            # Scenario ownership and starting wars
│
├── saves/                             # Local campaign state (git-ignored)
│   ├── session.db                     # Active campaign
│   ├── master.db                      # Master catalog
│   └── instances/                     # Per-playthrough clone databases
│
├── public/                            # Web UI Dashboard & Canvas Map View
│   ├── index.html                     # Strategy command center & Grand Command Hub
│   ├── styles.css                     # Military-grade responsive dark theme
│   ├── app.js                         # Application lifecycle coordinator
│   └── js/                            # Modular frontend components (World Map, Caravans, etc.)
│
├── tools/                             # Deterministic CLI Verification & Audit Layer
│   ├── schema.sql                     # Active session database schema (ACID tables)
│   ├── schema-master.sql              # Immutable historical master catalog schema
│   ├── sim-audit.js                   # Independent auditor (2,313 invariants in 9 blocks)
│   ├── sim-db.js                      # Fast SQLite CLI bridge & progress exporter
│   └── sim-web.js                     # High-performance HTTP server
│
├── tests/                             # E2E & Architectural Integration Test Suites
│   ├── verify-rotk-grand-loop.ts      # End-to-end verification of 3 grand strategy loops
│   ├── verify-strategic-world-map.ts  # Verification of historical master data & map
│   └── ...                            # Feature-specific verification suites
│
├── vite.config.ts                      # Vite 5 configuration with proxy to backend (:3300)
├── tsconfig.json                       # Strict TypeScript 5.7+ configuration
└── package.json                        # Operational scripts & dependencies
```

---

## AgentOption Universe Modular Systems

The simulation is partitioned into autonomous feature modules adhering to **Universe Architecture v4.0**:

| Module | Core Mechanics | Primary Endpoints |
| :--- | :--- | :--- |
| **Utility AI** | Normalized Sigmoid/Logistic response curves $C(x) = \frac{1}{1 + e^{-k(x - x_0)}}$, dual-threshold hysteresis (anti-flickering), and 30-day round-robin LOD scheduling. | `/api/status`, `/api/action` |
| **Military & Garrisons** | City garrisons, wall defense resilience (10-100), siege vanguard assaults, 1v1 tactical duels, and BFS supply graph reachability. | `/api/garrisons`, `/api/military/assault`, `/api/duels/*` |
| **Regional Economy** | Supply/demand price curves for 20 citadels, inter-city trade arbitrage spreads, double-entry ledger bookkeeping. | `/api/economy/arbitrage`, `/api/economy/regional-prices` |
| **Ecology & Logistics** | Trade caravan dispatching, route transit progression, guard retinue tiers (Militia/Veteran/Elite), and bandit ambush resolutions. | `/api/caravans/dispatch`, `/api/caravans/tick-progress`, `/api/caravans/claim` |
| **Specialist Workforce** | Recruitment of 20 auxiliary specialists, assignment to enterprises, operational efficiency boost (+15% to +25%), and monthly wages. | `/api/workforce/specialists`, `/api/workforce/hire`, `/api/workforce/businesses` |
| **Social Kizuna & Banquets** | 2-Axis relational mesh: Affinity (-100..+100) and Respect (0..100). Sworn Brotherhood, gourmet banquets across 3 tiers, and character recruitment. | `/api/banquets/*`, `/api/social/*` |
| **Lineage & Succession** | Courtship, dowry exchange, marriage, genetic stat inheritance $[-3, +5]$, master mentorship, and ancestral retirement succession. | `/api/lineage/*` |
| **Progression & Ranks** | 4-Tier societal progression, skill/attribute ladders, and five real career paths (Martial, Merchant, Scholar, Artisan, Lineage) whose active-path modifiers feed EXP, trade, crafting and clan prestige. | `/api/progression/*`, `/api/quests/*` |
| **Agent Bridge & MCP** | Continuous knowledge harvesting: records episodic memory reflections after major decisions; native stdio MCP tools for AI Agents. | `/api/agent/prompt`, `/api/agent/logs` |

### Cross-cutting rules (1.23.x–1.25.x)

- **Action time** — every player mutation that consumes a day charges it on the
  server (`src/shared/action-time.ts`) before its service runs. `/api/time/spend`
  is a deprecated clock refresh; the client helper cannot double-charge.
- **Enterprise settlement** — `engine/business-economics.js` computes gross income
  from tier, efficiency and actual staffing, subtracts wages and rent, repays debt
  first and records a loss as debt. `safe_cash` never goes negative.
- **Local market** — `SettlementMarketService.applyTrade` books buys/sells into
  `settlement_market_state`, so player trades move the next local quote instead
  of only drifting on a monthly timer.
- **Periodic obligations** — migration 044 adds tax bills due on day 15. Paying
  is a player decision; an unpaid bill becomes OVERDUE with a late fee and a
  credibility loss.
- **Contract board** — migration 045 posts three rotating delivery contracts per
  settlement per month. Delivery consumes real stock; expiry creates a penalty
  obligation.
- **Combat consequences** — migration 046 adds injuries that reduce effective
  WAR, and NPC officers can die permanently (business/faction roster cleared).
  One month of rest heals active injuries.
- **Scenario identity** — `config/scenario-seeds.json` gives 184/190/200/208
  different holdings, wars and allies; 190 and 208 are no longer copies of 184.
- **Intel reports** — migration 047 posts monthly price/garrison rumors with
  confidence; verifying one costs two exploration days and may expose a false
  claim.
- **Farmland** — migration 048 adds four rentable parcels per settlement and a
  seasonal crop catalog. Rent the land, plant an in-season crop, wait for the
  growth window, then harvest real grain into the warehouse.
- **Ledger completeness** — `postDoubleEntry` writes cashflow + Dr/Cr journal in
  one transaction; the audit fails on any cashflow row without a pair.
- **Time coverage** — trade, military, politics, household and movement actions
  all charge days server-side; quests/exploration charge in their service.
- **Idempotency** — financial actions accept `idempotencyKey` (body or
  `Idempotency-Key` header) and replay the stored result without double effects;
  every successful mutation lands in `action_log`.
- **Schema contract** — a fresh `schema.sql + all migrations` database has the
  same runtime tables/columns as the live campaign (migration 050).
- **World treasury** — faction and settlement treasury changes go through
  `postFactionEntry` / `postSettlementEntry`; migrations 051–052 add `OPENING`
  rows and the audit proves `opening + inflow − outflow = treasury_cash`.
- **Atomic world close** — each world module (NPC, politics, ecology, AI war)
  runs in one transaction; a failing module rolls back its own writes and aborts
  the close before the clock moves.
- **Day phases** — a day has morning/afternoon/evening. Administrative actions
  spend one phase; field actions spend whole days and reset the phase.
- **Career paths** — `engine/career-paths.js` computes the five scores once; only
  the active path's modifiers apply, and the API displays the same numbers.
- **Data repairs** — broken seed text and legacy currency labels are fixed by
  numbered idempotent migrations (042–053), not ad-hoc SQL.

---

## Historical Master Catalog & Strategic World Map

### 1. Historical Master Catalog
- **129 Master Items**: Spanning unique national treasures (Green Dragon Crescent Blade, Red Hare Steed, Serpent Spear, Mengde's New Book), tactical equipment, and regional trade commodities across ancient provinces.
- **30+ Master Talents**: Explicit perks categorized into Combat (`God of War`, `Iron General`), Strategy (`Fierce Ambition`), Crafting (`Master Metallurgist`, `Silk Weaver`), and Commerce (`Grand Arbitrage`).
- **150+ Historical Characters & 20 Auxiliary Retainers**: Complete stat distributions across 8 canonical attributes (INT, POL, WAR, LDR, DIP, COM, LOG, CRA) with specific talent affiliations.

### 2. 20 Historical Citadels & Provincial Centers
Each settlement models authoritative military forces, wall defense integrity, granary reserves, cash treasuries, and regional trade profiles:

```text
U Châu (Youzhou)       : Trác Huyện (Zhuo), Kế Thành / Bắc Bình (Jicheng / Beiping)
Ký Châu (Jizhou)       : Nghiệp Thành (Yecheng), Nam Bì (Nanpi), Quảng Tông (Guangzong)
Thanh Châu (Qingzhou)  : Bình Nguyên (Pingyuan), Bắc Hải (Beihai)
Duyện & Dự Châu        : Hứa Xương (Xuchang), Trần Lưu (Chenliu), Uyển Thành (Wancheng), Thọ Xuân (Shouchun)
Từ Châu (Xuzhou)       : Hạ Phì (Xiapi)
Tư Lệ (Sili)           : Đông Đô Lạc Dương (Luoyang), Tây Đô Trường An (Changan)
Kinh Châu (Jingzhou)   : Tương Dương (Xiangyang), Giang Lăng (Jiangling), Xích Bích (Chibi)
Ba Thục & Lương Châu   : Hán Trung (Hanzhong), Thành Đô (Chengdu), Thượng Đảng (Shangdang), Tây Lương / Vũ Uy (Wuwei)
Giao Châu (Jiaozhou)   : Giao Chỉ (Jiaozhi)
```

### 3. Strategic 3-Layer Interactive Map Engine
- **24 Historical Connecting Routes**: Categorized into 4 ancient historical terrain profiles with realistic travel days and grain consumption:
  - 🛣️ `HIGHWAY`: Low hazard, high marching speed (e.g., Luoyang – Changan, Zhuo – Yecheng).
  - 🌊 `WATERWAY`: River transport along the Yellow River and Yangtze River.
  - 🏔️ `MOUNTAIN_PASS`: Chokepoint fortified gates (Hulao Pass, Tong Pass, Jiameng Pass).
  - 🪵 `PLANK_ROAD`: Treacherous Qinling suspended wooden plank paths into Shu.
- **3 Tactical View Modes**:
  - `Overview`: General political spheres, provincial watermarks, and geographic distance metrics.
  - `Military`: Garrison troop counts, defense integrity badges (Shield rating), and threat levels.
  - `Economy`: Granary reserves, treasuries, export commodities, and import demand markers.
- **Dynamic Route Pulse & Interactive 3-Tab Strategic Dossier**: Clickable citadels display instant intel, garrison breakdown (Infantry/Cavalry/Archers), economic indicators, hireable specialists, and historical lore.

---

## Grand Strategy Gameplay Loops

### Loop 1: Specialist Workforce Recruitment & Enterprise Assignment
- Discover and hire 20 auxiliary specialists (`NPC-0201` to `NPC-0220`) from local inns and guilds across the 20 citadels (Shopkeepers, Master Blacksmiths, Caravan Escort Chiefs, Master Weavers, Mining Overseers).
- Assign hired specialists to player enterprises (`businesses`), increasing operational workforce count and boosting enterprise efficiency multiplier by **+15% to +25%**.
- Double-entry accounting atomically journals signing bonus outflows (`6001_OPERATING_EXPENSE` / `1001_CASH_MOBILE`) without audit drift.

### Loop 2: 20-Settlement Regional Arbitrage & Caravan Logistics
- Exploit inter-regional price disparities calculated dynamically from supply/demand elasticities (e.g., shipping Xuzhou Sea Salt to inland Yecheng, or Liangzhou Warhorses to southern Jianye).
- Form trade caravans with customizable retinue protection tiers (`MILITIA`, `VETERAN`, `ELITE_RETINUE`).
- Physical transit across routes with chance of chokepoint bandit ambushes and combat resolution. Liquidate cargo upon arrival for gross revenues, net profits, and progression EXP.

### Loop 3: Garrison Deployment & Citadel Siege Assault
- **Reinforce Garrisons**: Deploy personal capital to recruit and station garrison troops at friendly/allied citadels, fortifying wall defenses.
- **Citadel Siege Assaults**: Mobilize vanguard assault brigades to storm hostile/neutral citadels.
- Deterministic combat calculations account for commander WAR/LDR attributes, casualty distributions, wall defense destruction, and war loot plundering (`WAR_LOOT` credited directly to player capital).

---

## Autonomous Living World & NPC Lifecycle

NPCs are not passive quest dispensers; they exist in an **unprompted, living ecosystem**:
- **Personal Ambitions**: Each character pursues a core vocation (`HEGEMON_UNIFIER`, `RIGHTEOUS_VANGUARD`, `LOYAL_BROTHERHOOD`, `MASTER_ARTISAN`, `COMMERCE_TYCOON`, `DEVOTED_RETAINER`).
- **Autonomous Monthly Cycles**: Every month, NPCs independently execute actions based on their Utility AI:
  - 🗡️ *Martial Drill*: Daily combat practice at the garrison (+WAR EXP, +Morale).
  - 📜 *Strategy Contemplation*: Studying treatises and historical annals (+INT/POL EXP).
  - ⚔️ *Bandit Expedition*: Leading private retainers to eliminate local outlaws (+Prestige, +Bounty cash, +Recruits).
  - 💰 *Private Commerce*: After-hours trade arbitrage accumulating personal wealth (`personal_cash`).
  - 🔨 *Craft Innovation*: Metallurgical and textile breakthroughs reducing workshop defect rates.
- **Living World Chronicles**: Every achievement is preserved in `npc_journey_logs` and viewable via the interactive web timeline.

---

## Interactive Historical Event Engine

The engine includes 41 comprehensive Three Kingdoms historical events (184 AD to 234 AD), spanning the Oath of the Peach Garden to the Wuzhang Plains:
- **Atmospheric Alert Banner**: Automatically highlights major historical crises occurring in the player's current location and campaign era.
- **Player Decision Modal**: Players can intervene in history across multiple asymmetric vectors:
  - *Canon Path*: Support historical outcomes (e.g., funding Liu Bei's militia and weapons).
  - *Alternate History ("What-If")*: Exploit crises for mercantilist arbitrage or side with rival factions.
- **Zero-Drift Resolution**: Every choice executes atomic SQLite transactions updating cashflow ledgers, double-entry journals, inventory stock, and NPC sentiment.

---

## Model Context Protocol (MCP) Integration

The project includes a native **Model Context Protocol (MCP)** server operating via standard JSON-RPC 2.0 over `stdio`. AI Agents can directly discover and invoke tools to query and mutate the world state without hallucination.

### Available MCP Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `sim_query_player` | `{ playerId?: string }` | Query character attributes, cash balances, grain, location, and inventory. |
| `sim_check_supply_line` | `{ fromNode: string, supplyHub: string, maxHops?: number }` | BFS pathfinding to check logistical supply-line reachability. |
| `sim_calculate_price` | `{ commodity: string, basePrice: number, stockUnits: number, demandUnits: number }` | Calculate dynamic market price elasticity. |
| `sim_get_kizuna` | `{ charA: string, charB: string }` | Query 2-axis social relations (Affinity, Respect), Sworn Brotherhood, and Hooks. |
| `sim_record_memory` | `{ npcId: string, topic: string, lessonLearned: string, emotionalValence?: string }` | Record episodic memory reflections for continuous NPC self-learning. |
| `sim_get_npc_journey` | `{ npcId?: string, limit?: number }` | Retrieve autonomous progression state, ambition, prestige, and journey chronicle. |
| `sim_audit_invariants` | `{}` | Execute independent verification of all 2,313 database invariants. |

### Connecting AI Agents

Add to your MCP client configuration (e.g., `C:\Users\<user>\.gemini\antigravity\mcp\` or Claude Desktop):
```json
{
  "mcpServers": {
    "threekingdoms-sim": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "E:\\15. Other\\Simulation",
      "env": {
        "SIM_DB_PATH": "E:\\15. Other\\Simulation\\saves\\session.db"
      }
    }
  }
}
```

---

## Getting Started & Operational Commands

### Prerequisites
- [Node.js](https://nodejs.org/) v26.13.0 LTS or higher (`.nvmrc` pins 26)
- [SQLite3](https://www.sqlite.org/) CLI

### Installation
```bash
# Clone the repository
git clone https://github.com/kzxl/ThreeKingdoms-AgentEngine.git
cd ThreeKingdoms-AgentEngine

# Install development tooling & dependencies
npm install
```

### Session database bootstrap (fresh checkout)

`saves/session.db` and `saves/master.db` are intentionally git-ignored. On a fresh checkout:

```bash
# Master schema + lore into saves/session.db and saves/master.db (needs the sqlite3 CLI)
node tools/ingest-markdown-master.js

# Session schema, seed, and migrations 001–083
node tools/sim-db.js init

npm start
```

`sim-db init` applies migrations 001–083 to the session database.

`ingest-markdown-master.js` rewrites the `master_*` tables in `saves/session.db`; do not run it
against a live save without a backup. `sim-db init` applies migrations automatically.

### NPM Command Reference

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run verify` | **Full Gate** | Runs typecheck → architecture guard → client syntax → UI ratchet → anti-slop lint → client API contract → route-shadow report → 101 verification suites → API contract check → write-path smoke. |
| `npm run lint:api` | Architecture | Fails when the TS client calls an `/api/*` path that neither the Router nor the gateway serves (known gaps are reasoned in `tools/client-api-allowlist.json`). |
| `npm run lint:slop` | Architecture | Enforces AS-05 (no emoji), AS-06 (no gradients), neutral elevation, two font families; ratchets the font-size scale. |
| `npm run lint:ui` | Architecture | Ratchets legacy UI debt (button classes, class usages, inline styles, native confirms); new surfaces should use `src/client/core/ui` (`window.UI`). |
| `npm run lint:client` | Architecture | Parses every classic client script (`public/app.js`, `public/js/*.js`); one parse error disables a whole UI file. |
| `npm run routes:shadow` | Architecture | Fails if any legacy `sim-web.js` handler is already served by the modular Router (dead code). |
| `npm test` | Verification | Runs all 101 suites (4 legacy self-sandboxed + 97 TypeScript `verify-*.ts`) against isolated DB copies. |
| `npm run smoke:write` | Verification | Boots the app on a sandbox DB and exercises 8 write paths (trade, loans, equip/unequip, idempotency, input rejection, post-write audit). |
| `npm run lint` | Architecture | Ratcheting guard over `tools/arch-baseline.json`: SQLite-CLI spawns, SQL interpolation, unseeded RNG, silent catches, the `current_date` keyword trap, legacy UI growth. |
| `npm run golden:verify` | API Contract | Boots the real composition root and diffs 28 read-only endpoints against `tests/golden/api-shape.json`. |
| `npm run perf:record` | Performance | Captures p95 latency and a normalised body fingerprint per endpoint, plus `tests/perf/fixture.db`. |
| `npm run perf:compare` | Performance | Re-measures against the fixture and fails on logic drift or p95 regression. |
| `npm run audit` | Verification | Executes independent verification of all 2,313 SQLite invariants across nine blocks. |
| `npm run migrate` | Data | Applies versioned, idempotent data migrations to the active session database. |
| `npm run scaffold:feature` | Tooling | Creates `src/modules/<domain>/<feature>/` and a smoke suite following `docs/FEATURE_MODULE_STANDARD.md`. |
| `npm run typecheck` | TypeScript | Performs compile-time strict type-checking across all `.ts` files. |
| `npm run dev:server` | Fullstack Server | Starts Node.js + `tsx` Hot Reload server on `http://localhost:3300`. |
| `npm run start` | Fullstack Server | Starts the same composition root without hot reload. |
| `npm run dev:client` | Frontend UI | Starts Vite 5 HMR dev server on `http://localhost:5173` (proxies `/api` to `:3300`). |
| `npm run build:client`| Production Build| Compiles and minifies frontend static assets into `dist/`. |
| `npm run test:mcp` | MCP Verification | Tests JSON-RPC handshake and executes all MCP tools against live database. |
| `npm run mcp` | MCP Server | Launches the standalone MCP server on `stdio` for agent connections. |

---

## Auditing & Zero-Drift Invariants (2,313 checks)

The engine enforces strict conservation laws across every transaction:

```bash
npm run audit
```

```text
====================================================
 ⚡ ThreeKingdoms-AgentEngine: Invariant & State Auditor
====================================================
[1] CASHFLOW LEDGER (SQLite Primary Truth)     : ✅ Passed (Inflow/Outflow balances exactly)
[2] PHYSICAL INVENTORY (SQLite Conservation)   : ✅ Passed (Non-negative quantity & movements verified)
[3] DOUBLE-ENTRY JOURNAL (Dr/Cr Parity)        : ✅ Passed (Every set Dr == Cr exactly)
[4] PROJECTION SYNCHRONIZATION (PROGRESS.md)   : ✅ Passed (Matches SQLite state across all metrics)
[5] NPC & ENTERPRISE STATE (P4 Integrity)      : ✅ Passed (Attributes, skills, safe cash and debt verified)
[6] GRAND STRATEGY (Factions & Settlements)    : ✅ Passed (Treasuries, garrisons, pacts verified)
[7] LIFE-SIM (Maidens & Encounter Rates)       : ✅ Passed (Dowries, strata, rates verified)
[8] CAMPAIGN CLOCK INTEGRITY                   : ✅ Passed (Date and turn history aligned)
====================================================
 🟢 AUDIT VERDICT: PASSED
    Total Invariants Verified: 2307
    Discrepancies Detected   : 0
====================================================
```

---

## Mathematical & Economic Formulas

### 1. Skill Check Resolution
$$\text{Check Score} = (\text{Attribute} \times 0.5) + (\text{Skill Level} \times 0.5) + \text{Modifiers} + d20$$
- **DC 30**: Routine | **DC 45**: Moderate | **DC 60**: Challenging | **DC 75**: Formidable | **DC 90**: Masterstroke / Legendary.

### 2. Workshop Capacity & Defect Variance
$$\text{Max Capacity} = \frac{\text{Craftsmen} \times \text{Hours/Day} \times \text{Days/Month}}{\text{Labor Hours per Unit}}$$
$$\text{Defect Rate (\%)} = \max\left(2\%,\; \text{Base Defect} - (\text{Lead Artisan CRA} \times 0.15\%) + \text{Fatigue Penalty}\right)$$

### 3. Logistical Provisioning & Consumption
- 1 Soldier consumes **0.1 piculs of grain/month** (~3 kg/day).
- 1,000 Soldiers require **100 piculs of grain/month**.
- 1 War Horse consumes **0.3 piculs of grain and fodder/month**.
- Severed supply lines induce a **15-point daily morale collapse** with exponential troop desertion within 7–10 days.

### 4. Action Time Resolution
$$\text{Action} \rightarrow \text{check campaign ACTIVE} \rightarrow \text{check fatigue headroom} \rightarrow \text{advance days} \rightarrow \text{run service}$$
- Day/fatigue costs live in `engine/action-policy.js`. A rejected action (fatigue cap,
  ended campaign) returns HTTP 400 with `FATIGUE` or `CAMPAIGN_OVER` and does not move
  the clock. A day-consuming action requires fatigue below the cap even when the
  service owns its stamina cost.

### 5. Enterprise Monthly Settlement
$$\text{staffingRatio} = \begin{cases}0 & \text{no staff}\\\min(1, \text{staff} / \text{roster}) & \text{otherwise}\end{cases}$$
$$\text{gross} = \left(\text{tier} \times 260 \times \text{efficiency} + \text{staff} \times 25\right) \times \text{staffingRatio}$$
$$\text{net} = \text{gross} - \sum \text{wages} - \text{rent}$$
- Positive net repays `debt` first, then adds to `safe_cash`. Negative net consumes
  `safe_cash`, then becomes `debt`. `safe_cash` is never negative and owner
  withdrawals are blocked while debt is outstanding.

### 6. Career Path Modifiers
| Path | Condition (highest score wins) | Modifier |
| :--- | :--- | :--- |
| MARTIAL | WAR × 0.75 + min(30, duel wins × 8) | +10% WAR EXP |
| MERCHANT | COM × 0.65 + min(40, liquid cash / 500) | +5% trade margin |
| SCHOLAR | (INT + POL) / 2 | +10% INT/POL EXP |
| ARTISAN | CRA × 0.7 + craft tier × 6 | −2% defect chance per tier |
| LINEAGE | spouse + children + fame | +10% clan prestige |

---

## License

MIT License. Designed and engineered for high-performance deterministic simulation and agentic AI pair programming.
