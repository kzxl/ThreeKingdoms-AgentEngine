# Architectural Decisions (DECISIONS.md)

This document records the architectural choices, rationale, and alternatives considered for `ThreeKingdoms-AgentEngine`.

---

## ADR-001: SQLite as Single Source of Truth, Markdown as Projection View (Hybrid CQRS)

- **Date**: 2026-10-27
- **Context**: The simulation engine originally stored all state across dozens of Markdown files. This caused $O(N)$ token context inflation, regex parsing fragility (e.g. `3,500` parsed as `3`), and risk of state drift.
- **Decision**: Adopt SQLite as the single transactional write store (`saves/session.db`). Markdown files (`game/PROGRESS.md`) are auto-generated read projections.
- **Consequences**:
  - Positive: Sub-millisecond queries, ACID guarantees, parameterized safety, zero regex drift, ~90% token reduction.
  - Negative: Requires a SQLite binding. Runtime code uses `better-sqlite3` in-process (`DatabaseService` / `engine/db-adapter.js`); the `sqlite3` CLI is only used by the one-off markdown ingest bootstrap.

---

## ADR-002: Repository Framework vs. Local Playthrough Decoupling

- **Date**: 2026-10-27
- **Context**: Git tracking session progress files mutated base entity dossiers, preventing clean game restarts or parallel campaigns.
- **Decision**:
  - The Git repository tracks **only the engine skeleton**: rules (`RULES.md`, `ECONOMY.md`, `TECHNIQUES.md`), master seed world data (`game/master/`), and tools (`tools/`).
  - Active playthrough files (`saves/`, `*.db`, `game/PROGRESS.md`, `game/ledger/`) are isolated locally and ignored by `.gitignore`.
- **Consequences**:
  - Positive: Clean, reproducible repository. Anyone can clone and start turn 0 immediately without stale campaign baggage.

---

## ADR-003: Pure Double-Entry Accounting Journal

- **Date**: 2026-10-27
- **Context**: The original ledger only tracked single-entry cash inflows/outflows, creating ambiguity between cash balances, inventory assets, revenues, and operating expenses.
- **Decision**: Implement a double-entry `account_journal` in SQLite where every transaction records balanced debits and credits:
  $$\sum \text{Debit} = \sum \text{Credit}$$
  Canonical chart of accounts (`src/shared/account-codes.ts`):
  - `1001_CASH_MOBILE` (Asset)
  - `1002_CASH_SAFE` (Asset)
  - `1003_ACCOUNTS_RECEIVABLE` (Asset)
  - `1201_INVENTORY` (Asset)
  - `2001_ACCOUNTS_PAYABLE` (Liability)
  - `3001_OWNER_EQUITY` (Equity)
  - `4001_SALES_REVENUE` (Revenue)
  - `4002_FINANCIAL_INCOME` (Revenue)
  - `5002_FINANCIAL_EXPENSE` (Expense)
  - `6001_OPERATING_EXPENSE` (Expense)
  - `7001_BOUNTY_INCOME` (Other Income)

  Legacy codes (`CASH-ON-HAND`, `REV-SALES`, `101_TIEN_MAT`, …) are mapped by
  `ACCOUNT_ALIASES`; migration 009 rewrote existing rows.
- **Consequences**:
  - Positive: Mathematically impossible to create "phantom wealth" or unbalanced ledger books.

---

## ADR-004: Unified Simulation Core Pipeline

- **Date**: 2026-10-27
- **Context**: LLM agents must not directly alter financial, inventory, or military balances without rule checks.
- **Decision**: Implement `engine/sim-core.js` enforcing the pipeline:
  `Action Proposal -> Validate Schema -> Condition Check -> Rule Resolver -> Atomic SQLite -> Invariant Check -> Event Log`
- **Consequences**:
  - Positive: Deterministic simulation rules are authoritatively enforced. Invalid actions are rejected with clear error codes.

---

## ADR-005: Zero-Token Autonomous NPC & Enterprise Utility Engine with Strategic Escalation

- **Date**: 2026-10-27
- **Context**: In a long-running campaign, background workshops, artisan retainers, and apprentice staff perform repetitive monthly operations (purchasing bamboo/twine, manufacturing mats/baskets/shields, disbursing wages, paying rent). Invoking LLM inference prompts for routine administrative operations wastes tokens, introduces non-deterministic variance, and creates latency.
- **Decision**:
  - Implement a deterministic utility AI scoring engine (`engine/workshop-engine.js`) to handle monthly background enterprise operations with zero LLM token cost.
  - Product mix targets are calculated based on labor capacity, hourly margin yields, warehouse inventory levels, and foreman artisan traits (`Master Artisan`, `Meticulous`, `Frugal`).
  - Differentiate routine operations from strategic dilemmas: the engine autonomously runs routine cycles, but escalates to the player/LLM via a dilemma event if critical thresholds are met:
    1. Critical Liquidity Warning: safe cash below 500 quan (or outstanding debt).
    2. Labor Discontent: Workforce morale < 55%.
    3. Rare Strategic Requisitions: Garrison military procurement contracts.
- **Consequences**:
  - Positive: High-speed, 100% reproducible background simulation. Zero token waste for routine workshop cycles.
  - Positive: High-agency gameplay where the player only intervenes when meaningful strategic decisions are required.

---

## ADR-006: Vanilla Shared UI Primitives Instead of Ant Design

- **Date**: 2026-10-29
- **Context**: Components drifted across screens: 47 legacy button classes, ~1,000 inline `style` attributes, four modal implementations, and nine native `confirm()` calls. The client is vanilla TypeScript + Vite with ~20k lines of legacy DOM scripts and no React runtime.
- **Decision**:
  - Build `src/client/core/ui/` (button, badge, toast, confirm-on-modal-shell) on the existing `:root` design tokens, and expose the same contract to legacy scripts as `window.UI`.
  - Do **not** adopt Ant Design for now. antd requires React plus roughly 1 MB of bundle, and every screen would have to be rewritten before it paid off.
  - Ratchet the debt with `npm run lint:ui`: legacy button classes, legacy class usages, inline styles and native confirms may only shrink; shared primitive usage is reported to grow.
- **Consequences**:
  - Positive: One visual contract for both UI layers without a new framework; migration can proceed screen by screen.
  - Positive: The ratchet prevents new per-screen one-off styles.
  - Negative: Ant Design's form/table/data-grid components are not available; if the client later moves to React, ADR-006 should be revisited and the primitive API maps cleanly onto antd equivalents.

---

## ADR-007: Server-Authoritative Action Time (2026-10-31)

- **Context**: `SimulationCore` and quest/exploration charged calendar days, but duels, social interactions, banquets, crafting, caravans and enterprise actions only charged fatigue. Their days came from a best-effort client call to `/api/time/spend`, so a direct API call could farm fame or production without the calendar moving.
- **Decision**: Add `src/shared/action-time.ts` and charge every player mutation at the HTTP boundary before its service runs. `engine/action-policy.js` remains the only cost table. `/api/time/spend` and `apiSpendActionTime` become clock-refresh shims.
- **Consequences**:
  - Positive: One authoritative clock; rejected actions cost nothing; a new endpoint that forgets the charge fails review.
  - Negative: Controllers own one extra precondition call, and service-level unit tests do not advance the calendar unless they call the charge explicitly.

---

## ADR-008: Enterprise Monthly P&L with Debt (2026-10-31)

- **Context**: The month close computed `tier * 260 * efficiency + workforce * 25` against a `businesses` table with no `tier` column, ignored rent, and clamped a loss to zero. A staffed workshop with 3,900 in wages could never go into debt, and an unstaffed business produced revenue for free.
- **Decision**: Migration 042 adds `tier` and `debt`. `engine/business-economics.js` is the pure settlement: staffing scales output, wages and rent are costs, profit repays debt, a loss consumes safe cash and then becomes debt. Owner withdrawals are blocked while debt is outstanding.
- **Consequences**:
  - Positive: Enterprise play has real risk and a recoverable failure state; the monthly report is an auditable P&L.
  - Negative: Existing saves may show a workshop in debt at the next close. Content must tune tier, wages or headcount instead of relying on the old clamp.

---

## ADR-009: One Career-Path Resolver (2026-10-31)

- **Context**: The progression API computed five career scores and advertised bonuses inline, but no service read them. `spatial-guard` also counted `session_duels.outcome`, a column that does not exist (the schema uses `outcome_type`), so duel wins were always zero.
- **Decision**: `engine/career-paths.js` owns scores and modifiers; the API and gameplay call it. Only the highest-scoring path applies, and its modifiers are wired into attribute EXP, training, quest rewards, trade margin, crafting defect and lineage prestige.
- **Consequences**:
  - Positive: The screen cannot promise a bonus the simulation does not apply; changing a path is one file.
  - Negative: The active path is derived, not chosen; a player can drift between paths as stats change. An explicit path commitment remains a later design option.

---

## ADR-010: Data Repairs Belong in Migrations (2026-10-31)

- **Context**: Six player skill names and two medicine items carried a broken code page, and old narrative rows still used numeric `Tiền`/`Qian` labels. Source lint cannot see database rows, so these defects survived normal verification.
- **Decision**: Fix them with an idempotent migration (043) that resyncs display names from `master_skills`, rewrites the two item records, and normalises numeric currency labels across the narrative tables. A verification suite seeds dirty rows and runs the migration twice.
- **Consequences**:
  - Positive: Existing saves are repaired without a manual SQL session, and the repair is replayable.
  - Negative: A new content defect needs a new numbered migration; editing the database by hand remains out of policy.

---

## ADR-011: Local Market Has a Write Side (2026-10-31)

- **Context**: `settlement_market_state` was read by trade quotes and drifted monthly, but no trade wrote to it. Buying 100 grain left the local price unchanged, so arbitrage and scarcity were decorative.
- **Decision**: `SettlementMarketService.applyTrade` books every fill (buy = negative stock delta, sell = positive). `SimulationCore`, `/api/trade` and caravan claim call it; the monthly drift remains the slow mean-reversion layer. The CJS bridge caches one context per database path.
- **Consequences**:
  - Positive: Player trades move the next quote and create real local scarcity/glut; cross-settlement arbitrage has a cost on both ends.
  - Negative: A large single trade can move a price sharply; content must seed enough stock to keep small trades sane.

---

## ADR-012: Obligations Are Player Decisions, Not Hidden Deductions (2026-10-31)

- **Context**: Enterprise rent and wages were automatic, but the player had no recurring personal cost. Hiding a tax deduction in month close would add a number without adding a decision.
- **Decision**: Migration 044 adds `obligations`. Month close issues the next month's tax bill (due day 15); the player pays explicitly through the API/UI. An unpaid bill becomes `OVERDUE` with a 10% late fee and a 5-point credibility loss.
- **Consequences**:
  - Positive: Every month has a "pay, defer or raise cash" decision with a visible consequence; payments go through the single ledger writer.
  - Negative: A player who ignores the modal accumulates overdue bills and credibility loss; the UI must surface the section prominently.

---

## ADR-013: Contract Board for Repeatable Content (2026-10-31)

- **Context**: Five questlines × three steps exhausted all authored quest content. The game needed a repeatable loop that consumed real inventory and paid real rewards without hand-authoring every month.
- **Decision**: Migration 045 adds rotating `contract_offers` and `player_contracts`. Each settlement posts three deterministic offers per month; delivery consumes stock through `consumeInventoryItem`, pays through the ledger and awards fame. Expiry creates a `CONTRACT_PENALTY` obligation.
- **Consequences**:
  - Positive: The game has infinite low-authoring content tied to the local economy; delivery and expiry both have real consequences.
  - Negative: Offers are generated, not hand-written, so narrative variety is limited until a content pass adds templates.

---

## ADR-014: Combat Leaves Permanent Marks (2026-10-31)

- **Context**: Single combat floored health at 20 and pre-battle enemy death was only a sentence. A duel had no lasting cost beyond fatigue, and a named officer could "die" and remain in the roster.
- **Decision**: Migration 046 adds `conditions`. Injuries reduce `effectiveWar` until the next month close; NPC death sets `is_alive = 0`, clears the business assignment and removes the faction officer row. Death chances are context-specific (sparring 0, arena 0, caravan/pre-battle small).
- **Consequences**:
  - Positive: ROTK officers become a scarce, mortal resource; wounds create a reason to rest or avoid a fight.
  - Negative: A seeded campaign can lose a favourite officer permanently; tests and saves must read `is_alive` rather than assume the roster is static.

---

## ADR-015: Scenario Seeds Carry War and Alliance (2026-10-31)

- **Context**: 184 and 190 used the same seed, and 208 opened at war with the Han court regardless of the historical coalition. Choosing a scenario changed the date and little else.
- **Decision**: `config/scenario-seeds.json` gains `allies` next to `wars`; both appliers write `WAR`/`ALLY` diplomacy rows. The four dates now have distinct holdings, enemies and allies.
- **Consequences**:
  - Positive: The start date changes the strategic problem, not only the calendar.
  - Negative: The seed file is now balance data; changing it affects every new campaign and needs a test update (`verify-scenario-seed`).

---

## ADR-016: Intel Is a Report, Not a Database Read (2026-10-31)

- **Context**: The UI could read exact prices and garrisons, so scouting had no value and every market was transparent.
- **Decision**: Migration 047 adds `intel_reports`. Monthly claims carry confidence and error; `POST /api/intel/verify` costs two exploration days and reveals the truth, with a 20% error threshold marking a claim false.
- **Consequences**:
  - Positive: Information becomes a resource and a reason to spend days; false reports create real planning risk.
  - Negative: Players who ignore the intel board are not blocked, just less informed; the UI must keep the section visible.

---

## ADR-017: Farming Is Land, Not a Gathering Node (2026-10-31)

- **Context**: The `FARM` gathering node only paid the player as a hired labourer. There was no land to rent, no crop choice, no season and no harvest cycle, so the agricultural half of the economy was missing.
- **Decision**: Migration 048 adds `master_crops` and four rentable parcels per settlement. The player pays rent (to the ruling faction), plants an in-season crop, waits 20–60 days, and harvests grain through the inventory writer. Yield depends on area, soil, crisis penalty, lateness and a crop-risk roll.
- **Consequences**:
  - Positive: Land, season and crop choice create a real mid-term plan; rent is a second recurring cash sink after tax.
  - Negative: A parcel can sit idle if the player misses the season; the UI must show the current season and the harvest date clearly.

---

## ADR-018: A Cashflow Row Without a Journal Pair Is a Bug (2026-10-31)

- **Context**: Wage, dividend and capital paths wrote `cashflow_ledger` without `account_journal`, and the auditor only checked Dr/Cr parity for rows that happened to exist. Eleven live rows were already unexplained.
- **Decision**: `postDoubleEntry` writes both sides under one transaction; migration 049 backfills historical orphans; the audit fails on any cashflow row without a pair, any pair without cashflow, or a missing journal table.
- **Consequences**:
  - Positive: The player ledger is now complete in both directions; the audit can prove it.
  - Negative: A new money path that forgets journal accounts fails the gate, so adding a transaction takes one more explicit decision.

---

## ADR-019: Time and Idempotency Are HTTP-Boundary Contracts (2026-10-31)

- **Context**: Trade, reinforcement, military, politics and household actions were free of calendar cost, and service-level mutations had no retry protection. SimCore had both; the newer modules did not.
- **Decision**: Every time-consuming player mutation calls `chargePlayerAction` at the HTTP boundary. Financial actions accept an `idempotencyKey` and replay the stored result; every successful mutation records in `action_log`.
- **Consequences**:
  - Positive: The calendar cannot be skipped from the UI or a direct API call, and a retried request cannot double-charge.
  - Negative: Controllers carry the charge and journal calls explicitly; a forgotten call is a review finding, covered by the core time/idempotency tests for the main paths.

---

## ADR-020: Runtime Schema Is Migration-Owned (2026-10-31)

- **Context**: Services created family, loan, equipment, expedition, intel and duel tables on first use, so a fresh database had 68 tables while the live campaign had 94. A service could run before its table existed and silently fall back.
- **Decision**: Migration 050 creates the runtime tables and columns; a fresh `schema.sql + migrations` database is the complete contract. Services may keep `IF NOT EXISTS` as a defensive no-op, but they no longer own schema creation.
- **Consequences**:
  - Positive: Fresh checkout, tests and live campaigns share one runtime schema; missing tables are caught by `verify-schema-contract` instead of a first request.
  - Negative: Schema changes now require a numbered migration, even for a small service-owned table.

---

## ADR-021: No Silent Catch (2026-10-31)

- **Context**: Nineteen empty catch blocks hid optional-schema probes, JSON fallbacks and projection writes; one of them masked a double-quoted SQL literal that silently returned zero.
- **Decision**: Every catch either handles the failure or carries a comment explaining the best-effort fallback. The `silent-catch` ratchet is locked at 0.
- **Consequences**:
  - Positive: A reader can distinguish a deliberate fallback from a hidden failure; a new empty catch fails lint.
  - Negative: Best-effort paths still do not surface a user-facing warning; the comment is the contract, not a runtime log.

---

## ADR-022: The World Has a Treasury Ledger Too (2026-10-31)

- **Context**: The player ledger was closed, but faction treasuries were updated directly in eight places. The auditor only checked that a treasury was non-negative, so world money could appear or vanish.
- **Decision**: Migration 051 adds `faction_ledger` with an `OPENING` row per faction. `postFactionEntry` owns every treasury change; the audit proves `opening + inflow − outflow = treasury_cash`.
- **Consequences**:
  - Positive: The world economy is now auditable; tax, tribute, caravan settlement and rent cannot drift silently.
  - Negative: Every new faction or treasury mutation must create/use the ledger; a direct SQL update is reported as drift.

---

## ADR-023: Idempotency Covers Every Key Mutation (2026-10-31)

- **Context**: The first idempotency pass covered trade, caravans, obligations, contracts, intel and farm. Politics, lineage, wage labor, expeditions, sieges and caravan claims could still double-apply on retry.
- **Decision**: The same `action-journal` contract now covers those paths: accept an optional key, replay the stored result, record every success.
- **Consequences**:
  - Positive: A retried request cannot move troops twice, declare the same war twice or settle a caravan twice.
  - Negative: Callers that want a deliberate repeat must omit the key; the journal records the repeat with a null key.

---

## ADR-024: Settlement Treasuries Join the World Ledger (2026-10-31)

- **Context**: Faction treasuries had a ledger after 051, but settlement treasuries could still be looted or seeded without a counterpart. The auditor only checked that they were non-negative.
- **Decision**: Migration 052 adds `settlement_ledger`; `postSettlementEntry` owns every settlement treasury change; the audit proves `opening + inflow − outflow = treasury_cash`.
- **Consequences**:
  - Positive: Loot, local revenue and seeded cash are auditable end to end.
  - Negative: A new settlement or treasury mutation must seed/use the ledger; a direct update is reported as drift.

---

## ADR-025: Month Close Is Atomic per World Module (2026-10-31)

- **Context**: World modules ran outside the core batch; a module failure aborted the close by design, but writes made before the throw were not rolled back as one unit, and AI war failure was only logged.
- **Decision**: `engine/world-transaction.js` wraps NPC lifecycle, politics, ecology and AI war each in one DatabaseService transaction. A throw rolls back that module; AI war errors now abort the close instead of being skipped.
- **Consequences**:
  - Positive: A failed module leaves no partial writes; retry is safe and `world_turn_ledger` skips completed modules.
  - Negative: This is per-module atomicity, not one transaction across the core batch and every module; the retry ledger remains the cross-module contract.

---

## ADR-026: Day Phases Are an Administrative Resource (2026-10-31)

- **Context**: Every action spent whole days, so bookkeeping actions (accepting a quest, paying a bill, accepting a contract) were free and could be repeated without any calendar cost.
- **Decision**: A day has three phases (morning/afternoon/evening). `ADMIN_ACTION` costs one phase; field actions keep whole-day costs and reset the phase. `campaign_meta.current_phase` is persisted by migration 053.
- **Consequences**:
  - Positive: Administrative work has a small, real time cost and three such actions fill a day; field actions remain chunky by design.
  - Negative: Only administrative actions use phases for now; a future pass can move social or market actions to phases if balance supports it.

---

## ADR-027: Core Contracts Extend to Every Feature Group (2026-10-31)

- **Context**: After 1.29.0 the core money, time, idempotency and ledger rules were closed, but loans, ecology, professions, social actions, progression, duels and lineage still had player-facing mutations without a key or with direct cash writes.
- **Decision**: Apply the same contracts to those groups: optional `idempotencyKey` with stored-result replay, one `chargePlayerAction` per action at the HTTP boundary, and `postDoubleEntry` for every cash reward (including bandit loot). `/api/ecology/transport` delegates to the single caravan writer instead of inserting a caravan manually.
- **Consequences**:
  - Positive: A retried request cannot double a loan, a crafted batch, a banquet, a quest step, a duel round, a mentorship session or a succession transfer; the `action_log` records each successful mutation once.
  - Negative: Every new mutation must decide its time cost and key policy; repeatable actions must omit the key deliberately.

---

## ADR-028: Life Layer Uses Existing Needs, One Service (2026-10-31)

- **Context**: Life-sim content existed but was disconnected: kizuna mentorship computed `expGained` without persisting it, three of four household roles were descriptive, `growth_focus` was inert, and there was no LIFE skill domain or daily routine.
- **Decision**: Add `player_life_state` (stress, meal/rest dates, upkeep month) and nine `LIFE` skills. `LifeService` owns six actions (eat, sleep, tea, upkeep, study, leisure); `POST /api/life/act` charges one phase or one day, requires an idempotency key, and routes every money move through `postDoubleEntry`. The Personal Journal gains a `Gia Đạo` tab. Existing `fatigue`, `morale` and `health` remain the needs; only `stress` is new.
- **Consequences**:
  - Positive: Daily phases now have a life-sim sink; social, household and self-care actions train real skills and the four spouse roles apply real bonuses.
  - Negative: The life loop is deliberately small (three needs, six actions); festivals, illness, child skills and the twelve livelihood skills remain later phases.

---

## ADR-029: Livelihood Depth Is Data-Driven (2026-10-31)

- **Context**: Agriculture had a decent loop, but forestry, fishing and hunting were the same gather formula with different item names. Adding a new resource required editing `gatherResource`, and nodes never depleted.
- **Decision**: Migration 055 adds twelve livelihood skills plus `resource_node_rules` (skill, tool, max stock, respawn, minimum tier) and `gathering_node_state` (per-node stock). `ResourceNodeService` refreshes stock lazily from elapsed campaign days; gather consumes stock in the same transaction. A missing tool cuts yield by 30% instead of hard-blocking basic nodes. Crops gain `skill_code`, `rotation_group` and `soil_impact`; parcels remember `last_crop_code`, so rotation, depletion and legume recovery are data-driven.
- **Consequences**:
  - Positive: A new fish, timber, game or crop is a seed-data change (rule + node + optional tool), not a new code path; every direction already shares time, idempotency, ledger and audit.
  - Negative: The first pass still shares one gather UI and one item per node; species-specific quality grades, boats, replanting and NPC labour are later phases.

---

## ADR-030: Species and Processing Are Data, Not Branches (2026-10-31)

- **Context**: After the node rules, one fishing node still produced one generic fish, one hunting node one generic meat, and one forest one generic timber. Recipes could not use the outputs because no fish/game processing existed.
- **Decision**: Migration 056 adds `resource_yield_variants` (weighted item, min skill tier, season, quality, quantity multiplier, optional byproduct) and five processing recipes. Gather picks a variant from the deterministic `resource-variant` stream, writes byproducts as their own stock movements, and returns quality/byproduct fields. Craft enforces `required_skill_code`/`required_skill_tier` and awards EXP to the recipe skill.
- **Consequences**:
  - Positive: A new species or processed good is one row plus its item/recipe; fish, game and timber now have distinct economic identities and sinks.
  - Negative: Rare variants need balance monitoring; recipes still consume only the base common item, so variant-specific cuisine remains a later content pass.

---

## ADR-031: Depleted Nodes Are Restored by Players, Not Only Time (2026-10-31)

- **Context**: Lazy stock regeneration made nodes finite, but the player could only wait. Rare variants and processing added demand, while forestry/fishing had no active way to invest in their resource base.
- **Decision**: Migration 058 adds restoration columns to `resource_node_rules` and four stock items (fish fry, sapling, salt lick, herb seedling). `POST /api/professions/nodes/restore` charges one `RESTORE_NODE` day, consumes one stock item, pays a cash fee through `postDoubleEntry` (`Livelihood/NodeRestore`), refills stock up to the cap and awards the restoration skill. The legacy gather screen shows stock, tool/skill requirements, a disabled empty state and a restore button.
- **Consequences**:
  - Positive: Fishing, forestry, hunting and herb gathering now have an input → restoration → output loop; restoration costs are real and auditable.
  - Negative: Restoration is per-node and manual; NPC-driven restoration and per-warehouse transport remain later phases.

---

## ADR-032: Tools Are Consumed or Worn, Not Permanent Keys (2026-10-31)

- **Context**: `TOOL-NET`, `TOOL-AXE` and friends were checked as inventory keys and never consumed, so a single net fished forever and tool crafting had no economic role.
- **Decision**: `tool_rules` declares `CONSUMABLE` (net, trap: one item per successful gather) or `DURABLE` (axe, pick, hoe, bow: `character_tool_uses`). The last durable use removes one item; a failed gather spends no tool. Six tool recipes build them from fibre, twine, timber and iron.
- **Consequences**:
  - Positive: Gathering has a real operating cost; tool demand feeds the crafting and market loops.
  - Negative: Players must restock nets/traps; the UI shows uses and breakage but does not repair durable tools yet.

---

## ADR-033: The Market Has Both a Bid and an Ask (2026-10-31)

- **Context**: `/api/trade` used an abstract counterparty. There was no stall, no named NPC buyer and no NPC offer to buy from, so the player could not participate in a two-sided local market.
- **Decision**: Add `player_stalls`, `stall_listings`, `stall_sales`, `npc_market_offers` and `npc_market_sales`. NPC buyers pay up to 115% of the local quote; NPC sellers ask 85–125% of it. Sales and purchases move NPC personal cash, player cash through `postDoubleEntry`, local market stock and an append-only sale row. Offers expire after 30 days and are generated lazily from settlement surplus.
- **Consequences**:
  - Positive: Price discovery is two-sided; the player can produce, buy low and sell high, and the local quote reacts to both flows.
  - Negative: Balance now depends on NPC cash seeding and offer frequency; relationship-based haggling and per-NPC demand profiles are later phases.

---

## ADR-034: Named NPCs Price Goods Differently (2026-10-31)

- **Context**: Every buyer used the same 115% cap and every seller the same 85–125% band, so a close ally and a stranger paid the same.
- **Decision**: `npc_trade_preferences` stores bid/ask modifiers per NPC and item category. Affinity comes from baseline sentiment + relationship deltas; category preference is derived once from WAR/INT/COM/CRA/LDR and stored. Buyer cap becomes `1.15 × relationship × preference` (0.95–1.30); ask becomes `band / relationship × preference.ask` (0.75–1.35).
- **Consequences**:
  - Positive: Relationships and NPC identity now have economic value; the same fish is worth different amounts to different people.
  - Negative: Balance must account for high-affinity buyers; faction and personality-specific pricing remain later layers.

---

## ADR-035: Durable Tools Are Repaired, Consumables Are Replaced (2026-10-31)

- **Context**: Durable tools broke permanently and consumables had no replacement path except crafting/buying.
- **Decision**: `tool_rules` gains `repair_cash`, `repair_skill_code` and `repair_min_tier`. `POST /api/professions/tools/repair` charges one phase and the cash fee through `postDoubleEntry`, resets uses to max and awards the repair skill. Consumables are rejected.
- **Consequences**:
  - Positive: Axe/pick/hoe/bow ownership has maintenance cost, while nets/traps stay a recurring consumable sink.
  - Negative: Repair is API-only for now; a tool panel can surface it later.

---

## ADR-036: Warehouses Are Per Settlement, Not Global (2026-10-31)

- **Context**: `inventory_items` was one global row per item, so a stall in Chengdu could sell fish caught in Jiangdong without any transport. That made freight and local supply meaningless.
- **Decision**: Migration 064 adds `warehouses` and `warehouse_stock`; one warehouse per owner per settlement, rented (300/90 days) or owned (2,000). Deposit/withdraw are explicit moves between the bag and the warehouse. Migration 065 lets stall listings source from the warehouse and return there on close.
- **Consequences**:
  - Positive: Local supply, capacity, transport and stall stock now have a real location dimension.
  - Negative: The personal bag remains global; carrying goods across the map still has no per-hex inventory until a later pass.

---

## ADR-037: Two Merchant Modes Share One Ledger (2026-10-31)

- **Context**: A single “caravan sells cargo for cash” loop cannot express either NPC logistics or an automated trading house.
- **Decision**: Add `freight_contracts`/`freight_shipments` for NPC-owned cargo and `merchant_routes`/`merchant_shipments` for player-owned automated supply chains. Freight pays a fee and risk; company routes buy from NPC offers, store, ship, unload and sell on a fixed daily order.
- **Consequences**:
  - Positive: The player can earn fee income without capital, or run a capital-intensive trading house with warehouses and routes.
  - Negative: Both modes depend on warehouse capacity and NPC cash; route automation is capped by price ceiling/floor and frequency.

---

## ADR-038: Perishables Make Fresh vs Processed a Real Choice (2026-10-31)

- **Context**: Fresh fish, dried fish, grain and timber all travelled identically.
- **Decision**: Migration 068 adds shelf life/spoil rate to `master_items`; shipment tables record initial quantity, total days and spoiled quantity. Fresh fish/meat spoil per travel day; dried/salted goods are near-stable. `SKL-LOG-COLD` reduces loss, `SKL-LOG-FREIGHT` cuts escort fees, and `TRAVEL_SPEED` shortens freight/company travel.
- **Consequences**:
  - Positive: Processing and cold-chain skills have a clear economic role; long-haul fresh fish is profitable but risky.
  - Negative: Spoilage is applied at arrival, not continuously; insurance and partial-route sales are later layers.

---

## ADR-039: Supply-Chain Hardening Before New Content (2026-10-31)

- **Context**: The 1.37.0 Gia Thương layer worked on happy paths but lacked instance isolation, audit coverage, atomicity, a single price resolver and stall identity. New content would have amplified those gaps.
- **Decision**: Add all new tables to `HISTORY_TABLES`; add audit block 9; wrap the merchant day in `merchant_day_ledger` and one transaction; make `calculateSettlementPrice` the one quote; require stall identity; reserve freight source stock/issuer cash and enforce penalties; tag route cargo with `merchant_route_stock`; enforce warehouse leases; deposit NPC purchases into the local warehouse; stop retail sales from inflating market stock; use item-level preservation skills and alternate tools; add endowment/consumption pricing.
- **Consequences**:
  - Positive: New games are clean, goods/cargo are auditable, a retried merchant day is safe, and wholesale/retail prices agree.
  - Negative: Freight/merchant UI is still API-first; route optimisation, insurance and partial-route sales remain.

---

## ADR-040: Freight Reserves Source Stock at Accept (2026-11-01)

- **Context**: ADR-039 said freight reserved source stock, but `accept` only charged the guard fee and `deliver` credited the destination. Two contracts could draw the same supply and delivery created goods.
- **Decision**: Migration 075 adds `source_reserved_quantity`. `accept` checks and debits the source market inside the same transaction that charges the fee and inserts the shipment. `deliver` credits the destination; `failContract` returns the unspoiled quantity still held.
- **Consequences**:
  - Positive: Total settlement stock is conserved across accept, delivery and failure; parallel contracts cannot oversubscribe a source.
  - Negative: A contract can fail at accept when the source has been drained since the board was generated; the UI must show that error.

---

## ADR-041: One Endowment-Aware Local Multiplier (2026-11-01)

- **Context**: `calculateSettlementPrice` included regional endowment, but `getLocalMultiplier` (used by trade, stall, contract board, intel and contextual actions) did not. Farm/fishing endowment never reached those prices.
- **Decision**: `getLocalMultiplier` becomes `specialisation × stock pressure × endowment` clamped to `0.5..2`. `calculateSettlementPrice` composes the same multiplier with the world season/crisis layer, and `quoteFromReference` adds fame/spread on top. A parity suite pins the two paths.
- **Consequences**:
  - Positive: A fish-rich town is cheap for every consumer, not only on one screen; price disputes have one answer.
  - Negative: Extreme specialisation × stock × endowment combinations are capped at 2 instead of the previous uncapped product.

---

## ADR-042: One Day Ledger per World System (2026-11-01)

- **Context**: Merchant routes had `merchant_day_ledger`, but stalls looped `N` days with one fixed date, freight had no transaction or day marker, and essential consumption had no per-date key. Replaying a day could sell, spoil or consume twice.
- **Decision**: Migration 076 adds `world_day_ledger(system, game_date)` with a unique key. Stall, freight, merchant and consumption check and mark their day inside one transaction. Day arithmetic uses the 30-day campaign calendar in `src/shared/game-date.ts`.
- **Consequences**:
  - Positive: Every day tick is retry-safe and auditable; a failed day rolls back whole.
  - Negative: A subsystem that forgets to mark its day can still double-run, so new daily systems must use `hasProcessedDay`/`markProcessedDay`.

---

## ADR-043: Stall Listings Are Local Supply (2026-11-01)

- **Context**: A listing removed goods from the player's bag/warehouse, but the municipal market never saw them. Selling from a stall neither added supply when listed nor consumed it when sold, so the stall was economically invisible.
- **Decision**: `stall_listings.market_effect` tracks the net local stock held by a listing. Listing adds `+quantity`, each sale subtracts `-sold`, and closing subtracts the unsold remainder before returning goods to storage. The audit requires `market_effect = quantity` for ACTIVE listings and `0` for closed/sold-out listings.
- **Consequences**:
  - Positive: A player importing goods can lower local prices while listed; the audit catches drift.
  - Negative: A fully sold imported listing leaves municipal stock unchanged, which is correct but can look surprising in a naive report.

---

## ADR-044: New Features Follow One Module Contract (2026-11-01)

- **Context**: The engine already uses UA v4.0 modules and an event bus, but new code could still copy the legacy patterns (SQL in controllers, routes in `sim-web.js`, god services). Feature growth needed one folder contract and a scaffold.
- **Decision**: `docs/FEATURE_MODULE_STANDARD.md` defines `src/modules/<domain>/<feature>/` with module/controller/service/types/index and one autodiscovered suite. Controllers own HTTP only; services own rules and transactions; modules own lifecycle and route registration. `npm run scaffold:feature` creates the folder. Existing debt (legacy gateway, legacy scripts, god services, `PLY-0001`) is retired slice by slice, never as a big-bang rewrite.
- **Consequences**:
  - Positive: New features start from one shape; ownership is explicit; a feature folder can be removed without another feature importing its internals.
  - Negative: Manual module registration in `src/server/main.ts` remains until modules adopt `registerRoutes`; the scaffold prints the two lines to add.

---

## ADR-045: Logistics Risk Is Deterministic, Insurance Is Optional (2026-11-01)

- **Context**: Freight and company routes paid a guard fee but the guard tier never affected the outcome; cargo moved safely through active bandit territory.
- **Decision**: `resolveLogisticsAmbush` checks an active lair near either endpoint against the guard tier. Militia is below the deterrence threshold for a typical lair; veterans and elite retinues deter weaker lairs and lose 15%/10% instead of 25%. The check is deterministic, runs once per shipment (`ambush_resolved`), and credits the lair's `plundered_wealth`. Freight can buy insurance at 4% of cargo value for a 75% loss claim; company routes carry risk without insurance for now.
- **Consequences**:
  - Positive: Guard tiers have a real economic effect; insurance is a meaningful choice; replaying a day cannot double-ambush.
  - Negative: Risk is threshold-based, not a per-day probability, so a militia convoy on a threatened route always loses cargo.

---

## ADR-046: Warehouse Renewal Extends the Existing Lease (2026-11-01)

- **Context**: Re-renting or renewing an active warehouse charged the full 300 and reset the lease to `today + 90`, discarding the remaining days.
- **Decision**: Both `rent` and `renew` start from `max(existing lease_until, today)` and add 90 days using the 30-day campaign calendar.
- **Consequences**:
  - Positive: The player never loses paid lease time; month boundaries follow the game calendar.
  - Negative: A renewal near expiry produces a longer total lease than a fresh 90-day term; the price remains the full 90-day rent.

---

## ADR-047: One Player Damage Path, One Death Transition (2026-11-01)

- **Context**: Damage paths clamped health differently (`MAX(1)`, `MAX(20)`, `MAX(25)`), so the player could be immortal in one system and dead in another. A zero-health result did not always reach succession/defeat.
- **Decision**: `src/modules/military/player-vitals.ts` (`applyPlayerDamage`) owns health loss, fatigue/morale side effects and the zero-health transition. Every damage path calls it. At 0 it invokes `BattleDuelService.applyPlayerDeath` once; an heir continues the campaign, otherwise the campaign becomes `DEFEATED`. The transition is skipped when the campaign is already non-`ACTIVE`.
- **Consequences**:
  - Positive: One rule for immortality, death and succession; every path is testable through the same helper.
  - Negative: Combat balance can now actually kill the protagonist; heirs become a real progression requirement rather than a optional feature.

---

## ADR-048: NPC Value Is Conserved Through One Ledger (2026-11-01)

- **Context**: `npc-lifecycle` added commerce income and recruited troops without a counterparty, while market, freight and loan services updated `personal_cash` directly. NPC wealth and troops were not auditable.
- **Decision**: Migration 080 adds `npc_ledger`. `postNpcEntry` appends an entry and `postNpcMutation` updates the progression row plus its balance. Commerce transfers cash from a named buyer; bandit bounty comes from the lair and recruits come from the local garrison (minimum 50 left). The audit checks the latest balance and the sum of deltas against `npc_personal_progression`.
- **Consequences**:
  - Positive: NPC cash/troop changes are explainable and conserved; the whole NPC economy is covered by the 2,307-invariant audit.
  - Negative: Every new NPC writer must use the ledger helper; a direct SQL update will fail the audit.
