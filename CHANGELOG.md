# Changelog (CHANGELOG.md)

All notable changes to the `ThreeKingdoms-AgentEngine` simulation engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
