# Changelog (CHANGELOG.md)

All notable changes to the `ThreeKingdoms-AgentEngine` simulation engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-10-28

### Added
- **Historical Three Kingdoms Master Data Synthesis**: Enriched SQLite databases (`saves/master.db` & `saves/session.db`) with 120+ master items (weapons, steeds, treatises, commodities), 30+ master talents (combat, strategy, crafting, commerce), 150+ historical characters, and 20 auxiliary hireable specialists (`NPC-0201` to `NPC-0220`).
- **Strategic 3-Layer Interactive World Map (`public/js/world-map.js`, `public/js/map-data.js`)**:
  - Modeled 20 historical citadels across ancient provinces with authoritative garrison troop breakdowns, wall defense ratings (10-100), granary reserves, treasuries, and regional trade profiles.
  - Plotted 24 tactical routes across 4 ancient terrain profiles (`HIGHWAY`, `WATERWAY`, `MOUNTAIN_PASS`, `PLANK_ROAD`) with travel duration and grain provisioning metrics.
  - Implemented 3 interactive View Modes (`Overview`, `Military`, `Economy`), route pulse SVG animations, and a rich 3-tab Intel Dossier panel.
- **Loop 1: Specialist Workforce Recruitment & Enterprise Assignment (`src/modules/professions/features/workforce/`)**:
  - Implemented `SpecialistWorkforceService` and REST endpoints (`/api/workforce/specialists`, `/api/workforce/hire`, `/api/workforce/businesses`).
  - Added hiring signing bonus mechanism with balanced double-entry accounting (`EXP-OPERATING` / `CASH-ON-HAND`).
  - Assigning hired specialists to enterprises increases operational workforce and boosts enterprise efficiency multiplier by +15% to +25%.
- **Loop 2: 20-Settlement Regional Arbitrage & Caravan Logistics (`src/modules/economy/regional-market.service.ts`, `src/modules/ecology-logistics/caravan-logistics.service.ts`)**:
  - Configured economic profiles and commodity price elasticities for all 20 settlements.
  - Supported long-distance caravan dispatch with 3 guard protection tiers (`MILITIA`, `VETERAN`, `ELITE_RETINUE`), chokepoint bandit ambushes, and liquidation at destination.
- **Loop 3: Garrison Deployment & Citadel Siege Assault (`src/modules/military/military.controller.ts`)**:
  - Added `/api/garrisons/reinforce` allowing players to recruit and station troops at friendly/allied citadels, reinforcing defense ratings.
  - Added `/api/military/assault` resolving siege battles against hostile citadels with wall defense destruction, casualty calculations, and war loot plundering (`WAR_LOOT`).
- **Double-Entry Financial Transaction Engine (`src/shared/financial-transaction.ts`)**: Atomic transaction helper recording `cashflow_ledger`, Dr == Cr `account_journal`, updating player liquid cash, and synchronizing `game/PROGRESS.md`.
- **E2E Grand Strategy Test Suite (`tests/verify-rotk-grand-loop.ts`)**: Comprehensive integration test suite verifying all 3 strategic loops and audit invariants.

### Changed
- **Audit Suite Expansion (`tools/sim-audit.js`)**: Expanded verified database invariants from 140 to 193/193 with zero discrepancies.
- **Spatial Registry Synchronization (`src/modules/ecology-logistics/spatial-registry.ts`)**: Synchronized TypeScript spatial registry with all 20 settlements and regional coordinates.

---

## [1.2.0] - 2026-10-27

### Added
- **Tactical Narrative & Simulation Deck Web UI (`public/`, `tools/sim-web.js`)**: Implemented a responsive 2-column layout (70% Left Tabletop Narrative & Choices, 30% Right State Deck & SQLite Ledger) conforming to Anti-AI-Slop and AgentOption UI design standards.
- **Live Agent Bridge (`/api/scene`, `/api/agent/prompt`)**: Natural language tactical dispatcher routing player agency commands directly to `SimulationCore` while maintaining literary narrative context.
- **Deterministic D20 Dice-Check Formula Visualizer**: Transparent breakdown of player attributes, skill proficiencies, d20 rolls, and target DC thresholds (e.g. `[WAR 58 * 0.5 = 29] + [Kỹ năng +10] + [D20: 9] = 48 >= DC 35`).
- **Interactive Branching Choice Cards**: 4 responsive decision cards with dual-dispatch modes (`+ Chọn -` for instant mechanical execution, `AI` for narrative agent evaluation).
- **Omni Command Prompt Bar**: Freeform natural language tactical input for unconstrained player agency.
- **SimulationCore Actions**: Added `REWARD_NPC` (retainer morale/loyalty boost with double-entry balancing) and `MOVE_LOCATION` (geographic movement).

### Changed
- **Workshop Engine Transaction Chronology**: Transaction IDs in `engine/workshop-engine.js` prefixed with `01_WS_REV` and `02_WS_EXP` ensuring chronological revenue-before-expense audit sorting.

---

## [1.1.0] - 2026-10-27

### Added
- **Simulation Core Engine (`engine/sim-core.js`)**: Authoritative action dispatcher enforcing `Validate -> Condition Check -> Rule Resolver -> Atomic SQLite -> Invariant Check`.
- **Deterministic Rules & Formulas (`engine/rules.js`)**: Mathematical models for Eastern Han commodity prices, bill of materials (BOM), workshop capacity formulas, defect rate equations, and d20 skill check equations.
- **Seeded Mulberry32 PRNG (`engine/random.js`)**: Centralized pseudorandom number generator for 100% reproducible rolls, checks, and event generation.
- **Auto-Projector (`engine/projector.js`)**: Compiles primary SQLite state directly into human-readable `game/PROGRESS.md`.
- **Double-Entry Accounting (`account_journal`)**: True debit/credit balance constraint ($\sum Dr = \sum Cr$) tracking assets, liabilities, equity, revenues, and operating expenses.
- **Idempotency Protection (`action_log`)**: Action journal with unique `idempotency_key` preventing duplicate execution upon agent retries.
- **Autonomous NPC & Workshop Engine (`engine/workshop-engine.js`)**: Zero-token utility AI simulating monthly background enterprise production, material procurement, defect rate mitigation, wholesale liquidation, payroll disbursements, and safe cash solvency guards.
- **NPC Attributes & Multi-Tier Skills Ladder (`npc_state`, `npc_skills`)**: Integrated support for NPC traits/talents (`Meticulous`, `Master Artisan`, `Frugal`), personalities, motivations, and tier-based skill progression.
- **Autonomous Enterprise Management (`businesses`)**: Structured facility modeling with delegation levels, workforce tracking, capacity hours, and rent overhead.
- **Comprehensive Automated Test Suite (`tests/`)**:
  - `tests/test-audit.js`: Verifies negative test cases (corrupted cash, stock mismatch, missing projection, CHECK constraints).
  - `tests/test-core-actions.js`: Verifies trade buy/sell, BOM production, insufficient funds, and idempotency.
  - `tests/test-reproducibility.js`: Verifies PRNG determinism, DC check reproducibility, and multi-action replay parity.
  - `tests/test-npc-ai.js`: Verifies monthly workshop cycle, inventory conservation, double-entry parity, skill promotion, and insolvency blocking.
  - `tests/run-all-tests.js`: Central test runner verifying 4/4 test suites (20/20 tests passed).
- **CLI Commands (`tools/sim-db.js`)**: Added `list-npcs`, `show-business`, and `simulate-workshop`.
- **Interactive Web UI Dashboard (`tools/sim-web.js`, `public/`)**: Zero-dependency HTTP server and modern dark-mode SPA providing real-time financial metrics, inventory filtering, retainer/NPC management, one-click autonomous monthly workshop cycles, double-entry ledger explorer, live action dispatcher, and real-time 63-invariant auditor.

### Changed
- **Direct SQLite Auditor (`tools/sim-audit.js`)**: Refactored to inspect SQLite directly instead of regex parsing markdown files. Added dynamic invariant counters (63 invariants verified).
- **Session Decoupling**: Updated `.gitignore` to strictly isolate local campaign databases (`saves/*.db`) and generated progress files (`game/PROGRESS.md`) from engine git repository.

### Fixed
- **Latent Cash Discrepancy**: Corrected missing Month 2 operational expenses in `cashflow_ledger` and restored chronological balance alignment.
- **Machine Path Dependencies**: Removed hardcoded workstation paths from `tools/sim-checkpoint.js`.
- **False Pass Elimination**: Auditor actively fails if `PROGRESS.md` is missing or corrupted.
