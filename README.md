# ThreeKingdoms-AgentEngine

[![Audit Status](https://img.shields.io/badge/Audit-193%2F193%20Passed-emerald.svg)](tools/sim-audit.js)
[![Architecture](https://img.shields.io/badge/Architecture-Universe%20v4.0%20Modular-blueviolet.svg)](src/core/module-registry.ts)
[![Stack](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Vite%20%7C%20SQLite%20%7C%20MCP-blue.svg)](package.json)
[![License](https://img.shields.io/badge/License-MIT-gray.svg)](LICENSE)

An autonomous, deterministic grand strategy simulation engine and character-driven RPG modeling the Three Kingdoms era (beginning 184 AD). Engineered with **AgentOption Universe Modular Architecture v4.0**, fullstack **TypeScript & Vite**, an authoritative **SQLite** double-entry ledger, distilled **Romance of the Three Kingdoms (ROTK)** historical data, an autonomous **Living World** progression engine, and a native **Model Context Protocol (MCP)** bridge for AI Agents.

---

## Table of Contents

1. [Core Architectural Philosophy](#core-architectural-philosophy)
2. [Technology Stack & Repository Layout](#technology-stack--repository-layout)
3. [AgentOption Universe Modular Systems](#agentoption-universe-modular-systems)
4. [ROTK Master Distillation & Strategic World Map](#rotk-master-distillation--strategic-world-map)
5. [Grand Strategy Gameplay Loops](#grand-strategy-gameplay-loops)
6. [Autonomous Living World & NPC Lifecycle](#autonomous-living-world--npc-lifecycle)
7. [Interactive Historical Event Engine](#interactive-historical-event-engine)
8. [Model Context Protocol (MCP) Integration](#model-context-protocol-mcp-integration)
9. [Getting Started & Operational Commands](#getting-started--operational-commands)
10. [Auditing & Zero-Drift Invariants (193/193)](#auditing--zero-drift-invariants-193193)
11. [Mathematical & Economic Formulas](#mathematical--economic-formulas)

---

## Core Architectural Philosophy

- **Zero Ephemeral Hallucination**: No wealth, weapon, army, relationship, or historical event exists unless it is substantiated in the database/ledger and verified via deterministic formulas.
- **Auditable Double-Entry Bookkeeping**: Money and inventory are strictly conserved. Every copper coin (`Qian`) and bundle of grain (`Dan`) is tracked via unique transaction IDs (`TXN-`) and stock movements (`MOV-`) with exact $Debit == Credit$ parity.
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
│   │   └── financial-transaction.ts   # Double-Entry Atomic Ledger Engine (Dr == Cr)
│   │
│   ├── server/                        # Backend Server Composition Root
│   │   ├── router.ts                  # Lightweight REST Router & JSON Dispatcher
│   │   └── main.ts                    # Bootstraps modular engine & exposes REST API (:3300)
│   │
│   └── mcp/                           # Native Model Context Protocol (MCP) Suite
│       ├── types.ts                   # JSON-RPC 2.0 & MCP protocol schemas
│       ├── tools.ts                   # Authoritative tool execution handlers
│       └── server.ts                  # Standard stdio MCP server for AI Agents
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
│   ├── sim-audit.js                   # Independent double-entry auditor (193/193 Invariants)
│   ├── sim-db.js                      # Fast SQLite CLI bridge & progress exporter
│   └── sim-web.js                     # High-performance HTTP server
│
├── tests/                             # E2E & Architectural Integration Test Suites
│   ├── verify-rotk-grand-loop.ts      # End-to-end verification of 3 grand strategy loops
│   ├── verify-strategic-world-map.ts  # Verification of distilled ROTK master data & map
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
| **Progression & Ranks** | 4-Tier Societal Progression (Plain Clothes → Estate Master → Grand Merchant → Hegemonic Lord) and skill attribute ladders. | `/api/progression/*` |
| **Agent Bridge & MCP** | Continuous knowledge harvesting: records episodic memory reflections after major decisions; native stdio MCP tools for AI Agents. | `/api/agent/prompt`, `/api/agent/logs` |

---

## ROTK Master Distillation & Strategic World Map

### 1. Distilled Master Catalog
- **120+ Master Items**: Spanning unique national treasures (Green Dragon Crescent Blade, Red Hare Steed, Serpent Spear, Mengde's New Book), tactical equipment, and regional trade commodities across all ancient provinces.
- **30+ Master Talents**: Explicit perks categorized into Combat (`God of War`, `Iron General`), Strategy (`Fierce Ambition`), Crafting (`Master Metallurgist`, `Silk Weaver`), and Commerce (`Grand Arbitrage`).
- **150+ Historical Characters & 20 Auxiliary Retainers**: Complete stat distributions across 8 canonical attributes (INT, POL, WAR, LDR, DIP, COM, LOG, CRA) with specific talent affiliations.

### 2. 20 Historical ROTK Citadels & Provincial Centers
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
- **24 Historical Connecting Routes**: Categorized into 4 ROTK terrain profiles with realistic travel days and grain consumption:
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
- Double-entry accounting atomically journals signing bonus outflows (`EXP-OPERATING` / `CASH-ON-HAND`) without audit drift.

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

The engine includes 41 comprehensive ROTK historical events (184 AD to 234 AD), spanning the Oath of the Peach Garden to the Wuzhang Plains:
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
| `sim_audit_invariants` | `{}` | Execute independent verification of all 193/193 database invariants. |

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
- [Node.js](https://nodejs.org/) v20.13.0 or higher
- [SQLite3](https://www.sqlite.org/) CLI

### Installation
```bash
# Clone the repository
git clone https://github.com/kzxl/ThreeKingdoms-AgentEngine.git
cd ThreeKingdoms-AgentEngine

# Install development tooling & dependencies
npm install
```

### NPM Command Reference

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run audit` | Verification | Executes independent verification of all 193/193 SQLite invariants. |
| `npm run typecheck` | TypeScript | Performs compile-time strict type-checking across all `.ts` files. |
| `npm run dev:server` | Fullstack Server | Starts Node.js + `tsx` Hot Reload server on `http://localhost:3300`. |
| `npm run dev:client` | Frontend UI | Starts Vite 5 HMR dev server on `http://localhost:5173` (proxies `/api` to `:3300`). |
| `npm run build:client`| Production Build| Compiles and minifies frontend static assets into `dist/`. |
| `npm run test:mcp` | MCP Verification | Tests JSON-RPC handshake and executes all MCP tools against live database. |
| `npm run mcp` | MCP Server | Launches the standalone MCP server on `stdio` for agent connections. |

---

## Auditing & Zero-Drift Invariants (193/193)

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
[5] NPC & ENTERPRISE STATE (P4 Integrity)      : ✅ Passed (Attributes, skills, and safe cash verified)
====================================================
 🟢 AUDIT VERDICT: PASSED
    Total Invariants Verified: 193
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
- 1 Soldier consumes **0.1 Dan of grain/month** (~3 kg/day).
- 1,000 Soldiers require **100 Dan of grain/month**.
- 1 War Horse consumes **0.3 Dan of grain and fodder/month**.
- Severed supply lines induce a **15-point daily morale collapse** with exponential troop desertion within 7–10 days.

---

## License

MIT License. Designed and engineered for high-performance deterministic simulation and agentic AI pair programming.

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

The engine includes 41 comprehensive ROTK historical events (184 AD to 234 AD), spanning the Oath of the Peach Garden to the Wuzhang Plains:
- **Atmospheric Amber Alert Banner**: Automatically highlights major historical crises occurring in the player's current location and campaign era.
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
| `sim_audit_invariants` | `{}` | Execute independent verification of all 80/80 database invariants. |

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
- [Node.js](https://nodejs.org/) v20.13.0 or higher
- [SQLite3](https://www.sqlite.org/) CLI

### Installation
```bash
# Clone the repository
git clone https://github.com/kzxl/ThreeKingdoms-AgentEngine.git
cd ThreeKingdoms-AgentEngine

# Install development tooling & dependencies
npm install
```

### NPM Command Reference

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run audit` | Verification | Executes independent verification of all 80/80 SQLite invariants. |
| `npm run typecheck` | TypeScript | Performs compile-time strict type-checking across all `.ts` files. |
| `npm run dev:server` | Fullstack Server | Starts Node.js + `tsx` Hot Reload server on `http://localhost:3300`. |
| `npm run dev:client` | Frontend UI | Starts Vite 5 HMR dev server on `http://localhost:5173` (proxies `/api` to `:3300`). |
| `npm run build:client`| Production Build| Compiles and minifies frontend static assets into `dist/`. |
| `npm run test:mcp` | MCP Verification | Tests JSON-RPC handshake and executes all 7 MCP tools against live database. |
| `npm run mcp` | MCP Server | Launches the standalone MCP server on `stdio` for agent connections. |

---

## Auditing & Zero-Drift Invariants

The engine enforces strict conservation laws across every transaction:

```bash
npm run audit
```

```text
====================================================
 ⚡ ThreeKingdoms-AgentEngine: Invariant & State Auditor
====================================================
[1] CASHFLOW LEDGER (SQLite Primary Truth)     : ✅ Passed (22 Txns balanced)
[2] PHYSICAL INVENTORY (SQLite Conservation)   : ✅ Passed (13 SKUs conserved)
[3] DOUBLE-ENTRY JOURNAL (Dr/Cr Parity)        : ✅ Passed (22 Sets Dr == Cr)
[4] PROJECTION SYNCHRONIZATION (PROGRESS.md)   : ✅ Passed (Matches SQLite)
[5] NPC & ENTERPRISE STATE (P4 Integrity)      : ✅ Passed (Attributes & Safe cash verified)
====================================================
 🟢 AUDIT VERDICT: PASSED
    Total Invariants Verified: 80
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
- 1 Soldier consumes **0.1 Dan of grain/month** (~3 kg/day).
- 1,000 Soldiers require **100 Dan of grain/month**.
- 1 War Horse consumes **0.3 Dan of grain and fodder/month**.
- Severed supply lines induce a **15-point daily morale collapse** with exponential troop desertion within 7–10 days.

---

## License

MIT License. Designed and engineered for high-performance deterministic simulation and agentic AI pair programming.
