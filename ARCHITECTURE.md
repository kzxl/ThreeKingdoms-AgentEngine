# Simulation Engine Architecture Specification

This document defines the technical architecture, decoupled storage model, and deterministic SQLite verification engine of the **ThreeKingdoms-AgentEngine**.

---

## 1. Architectural Philosophy: Engine vs. Playthrough Decoupling

A critical architectural distinction governs this system:

- **The Git Repository is Strictly an Engine Framework**:
  Git stores only the core rules, deterministic formulas, master seed data (Year 184 AD initial canvas), and CLI tools.
- **Playthrough Sessions are Isolated Locally**:
  All player saves, character progression, transaction logs, and SQLite database files are strictly ignored by `.gitignore`. This ensures that playing a campaign never pollutes or mutates the core framework, allowing infinite replays, multi-character campaigns, and branching timelines.

---

## 2. Decoupled Hybrid CQRS Architecture

The engine employs a **Command Query Responsibility Segregation (CQRS)** pattern with an embedded SQLite engine for transactional writes and an auto-projected Markdown dashboard for human inspection:

```mermaid
graph TD
    subgraph EngineGit["Engine Framework (Git Tracked / Strictly Immutable)"]
        RULES["game/RULES.md<br/>(Deterministic Formulas)"]
        ECON["game/ECONOMY.md<br/>(184 AD Price Index)"]
        TECH["game/TECHNIQUES.md<br/>(5-Tier Skill Trees)"]
        MASTER["game/master/<br/>• characters/ (Seed NPCs)<br/>• locations/ (Provinces)<br/>• businesses/ (Workshops)"]
        CLI["tools/sim-db.js & schema.sql<br/>(SQLite CLI & Migration Layer)"]
    end

    subgraph SessionLocal["Isolated Playthrough Layer (Local Only / Ignored by Git)"]
        DB["saves/session.db<br/>(ACID SQLite Database)<br/>• player_state<br/>• cashflow_ledger (TXN)<br/>• inventory_items (MOV)<br/>• npc_relationship_deltas"]
    end

    subgraph ReadProjection["Live Session Projection View"]
        PROGRESS["game/PROGRESS.md<br/>(Auto-rendered summary for Player & Agent)"]
    end

    MASTER -->|Seed Baseline| DB
    CLI -->|Executes SQL & ACID Invariants| DB
    DB -->|syncProgressProjection (in-process)| PROGRESS
```

### Component Roles & Access Patterns

| Component | Storage Type | Git Status | Access Pattern | Responsibilities |
|---|---|---|---|---|
| **Core Rules** (`RULES.md`, `ECONOMY.md`, `TECHNIQUES.md`) | Markdown | **Tracked** | Read-Only | Mathematical formulas, DCs, commodity price index, skill progression ladders. |
| **Master Seeds** (`game/master/`) | Markdown | **Tracked** | Read-Only | Immutable baseline state of China in Month 2, 184 AD (characters, locations, starter workshops). |
| **Session DB** (`saves/session.db`) | SQLite | **Ignored** | Read/Write (ACID) | High-speed transactional storage for active campaign: double-entry cashflow, inventory, and NPC deltas. |
| **Progress View** (`game/PROGRESS.md`) | Markdown | **Ignored** | Write-Projected | Single aggregated hot buffer compiled from SQLite for human reading and Agent context. |
| **Progress Template** (`game/PROGRESS.template.md`) | Markdown | **Tracked** | Reference | Blueprint showing the format of an initialized progress buffer. |

---

## 3. SQLite Schema & Invariant Enforcement

All dynamic campaign state is maintained in `saves/session.db` using the schema defined in `tools/schema.sql` (audited across 1,546 invariants in eight blocks):

1. **`player_state`**: Tracks attributes (INT, POL, WAR, LDR, DIP, COM, LOG, CRA), current location, liquid cash, safe cash, fixed capital, grain, and net worth.
2. **`cashflow_ledger`**: Strict double-entry ledger enforcing:
   $$\text{Closing Balance} = \text{Opening Balance} + \sum \text{Inflow} - \sum \text{Outflow}$$
3. **`account_journal`**: Balanced double-entry financial journal ($Debit == Credit$) categorizing operational expenses, revenues, signing bonuses, and war spoils.
4. **`inventory_items` & `stock_movements`**: Enforces physical conservation of goods (bamboo, grain, weapons, salt, leather).
5. **`session_settlements`**: 23 settlements across 20 historical map locations, with authoritative garrisons, wall defenses (10-100), granaries, and treasuries.
6. **`master_routes`**: 41 strategic connecting routes classified by 4 terrain profiles (`HIGHWAY`, `WATERWAY`, `MOUNTAIN_PASS`, `PLANK_ROAD`).
7. **`trade_caravans`**: Long-distance expedition caravans with route transit progression, guard retinue tiers, and settlement liquidation.
8. **`businesses` & `npc_state`**: Enterprise operations with `tier`, `safe_cash` and `debt`; assigned staff drive output, and wages plus rent are real monthly costs (see §8).
9. **`npc_relationship_deltas`**: Stores relational shifts (Affinity, Respect) relative to master character seed dossiers.
10. **`session_duels`**: Duel chronicle; `winner_id` and `outcome_type` are the contract used by career scoring and spatial gates.
11. **`player_skills`, `npc_skills` & `master_skills`**: Progression ladders. Player skill display names are resynced from the master catalog by migration 043.
12. **`obligations`**: Periodic tax/fee bills with a due date, status, breakdown and penalty (migration 044).
13. **`contract_offers` & `player_contracts`**: Rotating delivery board and accepted contracts (migration 045).
14. **`conditions`**: Persistent injuries with combat penalty and recovery (migration 046).
15. **`intel_reports`**: Monthly price/garrison claims with confidence and verification (migration 047).
16. **`master_crops` & `land_parcels`**: Seasonal crop catalog and rentable farmland (migration 048).

---

## 4. Why SQLite Outperforms Raw Markdown Files for State Tracking

1. **Sub-Millisecond Execution**: SQLite queries execute in <1ms without file parsing or disk thrashing.
2. **Zero Regex Fragility**: Eliminates syntax errors caused by pipe delimiter misalignment, commas in numbers, or line-ending mismatches.
3. **90%+ LLM Token Savings**: Instead of feeding 10 separate markdown tables to the LLM, the agent executes targeted queries (`SELECT cash, location FROM player_state`) returning only the requested row.
4. **Multi-Campaign Isolation**: To start a new campaign or character, simply initialize a new database (`saves/campaign_02.db`) without touching engine files.

---

## 5. Tooling Reference: `tools/sim-db.js`

The engine provides a zero-dependency CLI bridge to SQLite (`tools/sim-db.js`):

```bash
# Initialize a new session
node tools/sim-db.js init [campaign_id] [character_name]

# Check current campaign status and net worth
node tools/sim-db.js status

# Execute targeted SQL query
node tools/sim-db.js query "SELECT * FROM cashflow_ledger ORDER BY txn_id DESC LIMIT 3;"

# Re-compile and export game/PROGRESS.md
node tools/sim-db.js export-progress
```

---

## 6. Data Access, Migrations & Verification Gates

### 6.1 One driver, one failure policy

All application code reaches SQLite through `better-sqlite3`, in-process, with a
cached connection per database path:

| Binding | Consumers | Notes |
| :--- | :--- | :--- |
| `src/core/database.ts` (`DatabaseService`) | `src/modules/*`, controllers, MCP | Path-keyed registry; several playthrough instances open at once; `DatabaseQueryError` with DB + statement context. |
| `engine/db-adapter.js` | `engine/*`, `tools/sim-web.js`, legacy CLI tools | CommonJS binding over the same driver and pragmas: bound parameters, cached connections, throwing errors. |

There is **no** `sqlite3` CLI invocation on the request path. Failed statements throw
instead of returning `[]`, so data errors surface at the boundary rather than as
"empty world" symptoms.

### 6.2 Kernel input gate

`engine/action-validation.js` normalizes every agent/API action before it can reach a
composed SQL script: identifiers must match a strict token alphabet, numbers are
coerced and bounded, game dates are shape-checked, and free text is capped and
quote-escaped. `SimulationCore.executeAction()` turns violations into
`{ success: false, code: 'INVALID_PARAMS' }`.

Persisted identifiers use deterministic sequences (`_nextSequenceId`) rather than
wall-clock timestamps, so replays remain comparable and IDs cannot collide inside one
millisecond.

### 6.3 Versioned data migrations

`tools/migrations/` holds idempotent migrations applied inside a transaction and
recorded in `schema_migrations` (53 migrations, through `053-day-phases`). New playthrough instances
are brought to a known data state with `npm run migrate`; `npm run migrate:status` lists
pending work. Migrations also own data repairs that SQL cannot express safely at the
read path: 042 adds `businesses.tier/debt`, 043 repairs legacy text and currency labels.

A migration must be safe to run twice. `verify-instance-bootstrap` derives the expected
migration count from the directory instead of hardcoding it, so adding a migration does
not require editing that test.

### 6.4 Verification gates

| Gate | Command | Guarantee |
| :--- | :--- | :--- |
| Types | `npm run typecheck` | `strict` TypeScript across `src/`, `tests/`, `vite.config.ts`. |
| Architecture | `npm run lint` | Ratchet over `tools/arch-baseline.json`; debt may only shrink. |
| Behaviour | `npm test` | 75 suites (4 legacy + 71 modern); each modern suite runs on an isolated DB copy and projections are restored afterwards. |
| API contract | `npm run golden:verify` | 28 read-only endpoints: status code, response shape, behavioural assertions. |
| Write paths | `npm run smoke:write` | 8 HTTP write paths plus a post-write audit on a sandbox database. |
| Invariants | `npm run audit` | 1,546 SQLite invariants (ledger parity, inventory conservation, projection sync, world/life-sim/clock blocks). |

`npm run verify` chains all of them and is the merge gate.

---

## 7. Action Time Authority (1.23.1)

Calendar time is a server-owned resource. A player action cannot be made free by
skipping a client helper or by calling an endpoint directly.

- **Cost table**: `engine/action-policy.js` (`ACTION_TIME_POLICY`). Rows declare
  `days` and `fatigue`. When a feature service already applies stamina, the row
  declares `fatigue: 0` so the cost is not charged twice.
- **Enforcement**: `src/shared/action-time.ts` (`chargePlayerAction`) calls
  `canSpendActionTime` then `applyActionTime` before the service runs. A rejection
  throws `ActionTimeError` (HTTP 400) with `FATIGUE`, `CAMPAIGN_OVER` or
  `ACTION_TIME_FAILED`; the clock and game state are untouched.
- **Coverage**: duels (initiate, spar, arena, caravan ambush), kizuna interactions
  and natural chat, banquets, brotherhood, retainer/workforce recruitment, caravan
  dispatch, gathering, crafting, both forge paths, work shifts and enterprise
  opening. The controller returns the applied charge as `time` in the response.
- **Legacy path**: `SimulationCore.executeAction` keeps its own server-side charge
  for the eight core action types; `/api/time/spend` and `apiSpendActionTime` are
  now clock-refresh shims and never advance the calendar.
- **Fatigue headroom**: a day-consuming action requires the character to be below
  the fatigue cap even when the policy row has `fatigue: 0`, because the service
  will spend stamina.
- **Adding a mutation**: call `chargePlayerAction` in the controller. An endpoint
  that does not charge is a free action and a bug.
- **Test**: `tests/verify-action-time-authority.ts` proves the day cost, the
  rejection path and that a rejected action leaves the clock unchanged.

---

## 8. Enterprise Monthly Settlement (1.23.2)

`engine/business-economics.js` is the single pure settlement function used by the
month close and its tests. Migration 042 adds `businesses.tier` and
`businesses.debt`.

```
staffingRatio = staffCount == 0 ? 0 : min(1, staffCount / current_workforce)
grossIncome   = round((tier * 260 * efficiency + staffCount * 25) * staffingRatio)
netProfit     = grossIncome - sum(monthly_wage) - monthly_rent
profit        -> repay debt first, remainder to safe_cash
loss          -> consume safe_cash, remainder becomes debt
```

- No staff means no revenue; understaffing scales output down. A zero-staff
  business cannot print money.
- Rent and actual wages are costs. Both are charged once per month: if the
  workshop production cycle already settled the business (`BIZ_CYCLE_*` marker),
  the passive path skips it.
- Losses are carried as `debt`; `safe_cash` never goes negative. Monthly profit
  repays debt before reaching the safe, and `EnterpriseLaborService.collectProfits`
  refuses owner withdrawals while debt is outstanding.
- The monthly report carries `grossIncome`, `totalWages`, `rent`, `netProfit`,
  `newSafeCash`, `debt`, `staffCount`, `staffingRatio` and a health label
  (`PROFITABLE`, `LOSS`, `DISTRESSED`, `CLOSED`).
- **Test**: `tests/verify-workshop-economy.ts` covers the pure settlement and a
  real month close.

---

## 9. Career Path Resolver (1.23.3)

`engine/career-paths.js` is the only implementation of the five career identities.
The progression API displays the same scores and modifiers that gameplay applies.

| Path | Score inputs | Applied modifier |
| :--- | :--- | :--- |
| `MARTIAL` | WAR, duel wins (`session_duels.outcome_type = 'VICTORY'`) | +10% WAR EXP |
| `MERCHANT` | COM, liquid cash | +5% trade margin |
| `SCHOLAR` | INT/POL average | +10% INT/POL EXP |
| `ARTISAN` | CRA, highest craft tier | −2% defect chance per tier |
| `LINEAGE` | spouses, children, fame | +10% clan prestige on marriage/birth/succession |

- The highest score is the active path; only its modifiers apply.
- Consumers: `AttributeProgressionService`, `SimulationCore` training, quest
  rewards, the trade quote, the crafting defect roll, and lineage prestige
  increments.
- `spatial-guard.service.ts` and the resolver count duel wins with
  `outcome_type`; the old `outcome` column does not exist, so this was silently
  zero before 1.23.3.
- **Test**: `tests/verify-career-paths.ts` covers the five scores, the duel
  count, the modifiers and a real WAR EXP award.

---

## 10. Data Repair Policy (1.23.4)

Code linting cannot see rows inside `saves/session.db`, so data defects are fixed
by an idempotent migration rather than an ad-hoc script:

- Migration 043 resyncs `player_skills.skill_name` from
  `master_skills.skill_name_vi`, repairs the two medicine items with broken
  code-page text, and rewrites numeric legacy currency labels to Quan/quan in
  the narrative tables.
- The currency pass only matches a number followed by the old unit, so ordinary
  prose such as "nộp tiền mặt" is preserved.
- New data repairs follow the same rule: a numbered migration, safe to run twice,
  with a verification suite (`tests/verify-data-cleanup.ts` for 043).

---

## 11. P1 Local Economy Loop (1.24.0–1.24.2)

The P1 vertical slice adds three interlocking systems so a month contains real
decisions instead of a passive timer.

### 11.1 Local market write side

`SettlementMarketService.applyTrade(settlementId, itemCode, stockDelta)` books
every physical fill into `settlement_market_state`:

- Buying passes a negative delta and drains local stock, so the next quote is
  higher; selling passes a positive delta and lowers it.
- Writers: `SimulationCore` TRADE_BUY/TRADE_SELL, `POST /api/trade`, and caravan
  claim settlement. The monthly drift stays as the slow mean-reversion layer.
- `driftSettlement` accepts `{ recordHistory: false }`; only the monthly call
  writes `settlement_market_history`.
- The CommonJS bridge keeps one context **per database path**, so an instance or
  sandbox cannot read another campaign's market.

### 11.2 Periodic obligations

Migration 044 creates `obligations`. `ObligationService` issues one monthly tax
for the month being entered: 5% of estimated enterprise gross plus a household
poll tax (10 + 2 per retainer), minimum 20 quan, due on day 15.

- The player pays through `POST /api/obligations/pay`; payment deducts cash or
  grain, writes a `TAX_PAYMENT` ledger entry and a balanced journal pair.
- Month close processes every DUE bill whose due date passed: status `OVERDUE`,
  +10% late fee, −5 credibility. The bill is never silently deducted.
- The quest modal renders an **Obligations** section with a Pay button.

### 11.3 Repeatable contract board

Migration 045 creates `contract_offers` and `player_contracts`.
`ContractBoardService` posts three deterministic delivery offers per settlement
per month from the settlement's surplus/deficit pool.

- Accepting records a deadline (15–25 days); the offer becomes `ACCEPTED`.
- Delivering consumes the real inventory through `consumeInventoryItem`, pays the
  reward through the ledger (`CONTRACT_REWARD`) and awards fame. Insufficient
  stock is rejected.
- Month close expires missed contracts and creates a `CONTRACT_PENALTY`
  obligation; the next month's offers are posted at the same time.
- The quest modal renders a **Contracts** section with accept/deliver actions.

### 11.4 Month-close order

1. Player recovery and enterprise P&L (existing).
2. World modules (NPC, politics, ecology, caravans).
3. `processDue` + next-month tax (044 bridge).
4. Contract expiry + next-month offers (045 bridge).
5. Condition recovery (046 bridge): one month clears active injuries.
6. Fame decay, arrivals, bankruptcy, retainer loyalty, victory check.

The report returned by `GameplayManager.closeMonth` carries `obligations`,
`contracts` and `conditionsRecovered`, so the UI and tests read the same summary
the player sees.

---

## 12. RPG & ROTK Layer (1.25.x)

### 12.1 Injuries, death and recovery

Migration 046 creates `conditions`. `ConditionService` records a wound with
severity 1–3, a combat penalty (3/6/9) and a recovery timer. The duel profile
subtracts `getCombatPenalty` from `effectiveWar`, so a wounded officer really
fights worse.

- Single combat consequences: sparring 8% minor injury; arena 30% severity 1–2;
  caravan defence 25% winner injury / 45% loser injury. A caravan win has a 4%
  chance to kill the bandit chief; a loss has a 1% player-death chance (heir
  succession or `DEFEATED`).
- Pre-battle champion duels kill the enemy officer for real and wound the
  surviving loser.
- NPC death sets `npc_state.is_alive = 0`, clears the business assignment and
  removes the `faction_officers` row; the master catalog keeps the record.
- One month of rest clears active injuries; `GET /api/conditions` exposes the
  list and the current penalty.

### 12.2 Scenario identity

`config/scenario-seeds.json` differentiates the four start dates with
`playerSettlements`, `wars` and `allies`. Both appliers (`engine/scenario-seed.js`
and the instance bootstrap) write `relation_state = 'WAR'` or `'ALLY'` and skip
factions that the current world does not have.

| Scenario | Holdings | War | Ally |
| :--- | :--- | :--- | :--- |
| 184 Yellow Turban | Zhuo | Yellow Turbans | — |
| 190 Coalition | Zhuo | Dong Zhuo | Cao Cao |
| 200 Guandu | Zhuo, Pingyuan | Yuan Shao | — |
| 208 Red Cliffs | Zhuo, Pingyuan, Xuchang | Cao Cao | Sun Jian |

### 12.3 Intel reports

Migration 047 creates `intel_reports`. Each settlement posts three monthly
reports (two price claims, one garrison claim) with a claim error of ±25–30% and
a confidence of 0.4–0.9.

- `GET /api/intel` lists open reports; `POST /api/intel/verify` charges two
  exploration days and reveals the actual value.
- A claim more than 20% away from the truth is `isFalse`; a report can only be
  verified once.
- The quest modal renders an **Intel** section with a Verify button.

---

## 13. Rented Farmland & Seasonal Crops (1.26.0)

Farming was a gathering node: the player worked as a hired labourer. Migration
048 adds `master_crops` and `land_parcels` so the player can rent land, choose a
crop and harvest grain.

| Crop | Seasons | Growth | Seed / mu | Yield / mu | Risk |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Paddy rice | Spring, Summer | 45 d | 30 quan | 8 | 8% |
| Wheat | Autumn, Spring | 60 d | 25 quan | 7 | 10% |
| Soybeans | Summer, Autumn | 30 d | 20 quan | 5 | 6% |
| Vegetables | Spring, Summer, Autumn | 20 d | 15 quan | 4 | 5% |

- Each settlement has four parcels (2/3/5/8 mu; soil 0.9–1.2; rent 60–220 quan).
- `FarmService.rent` charges rent, leases for 90 days and credits the ruling
  faction's treasury. `plant` requires an in-season crop owned by the player and
  charges `seedCostPerMu × area`. Expected yield is:
  `area × yieldPerMu × soilQuality × (1 − min(0.6, crisisPenalty × 0.5))`.
- `harvest` requires the growth date, adds `COM-GRAIN` through
  `restoreInventoryItem`, awards `PROF_FARMER` EXP, and applies a 10% loss per
  15 late days plus a crop-risk roll (20% loss).
- Routes: `GET /api/farm/parcels`, `POST /api/farm/rent|plant|harvest`; actions
  charge `FARM_RENT` (1 day) or `FARM_PLANT`/`FARM_HARVEST` (2 days).
- Month close expires leases; the quest modal renders a **Farmland** section
  with Rent / Plant / Harvest.

---

## 14. Core Contracts (1.26.x)

These are the rules every feature must follow, independent of content.

### 14.1 Ledger completeness

- `src/shared/ledger.ts#postDoubleEntry` writes the cashflow row and the
  matching Dr/Cr journal pair under one `txn_id` in one transaction.
- Migration 049 backfills historical cashflow rows that had no journal.
- `tools/sim-audit.js` fails if the journal table is missing, if a cashflow row
  has no pair, or if a journal row has no cashflow. The audit is no longer
  optional.
- `tests/verify-ledger-completeness.ts` covers both directions.

### 14.2 Time coverage

- Every player mutation that spends time calls `chargePlayerAction` at the HTTP
  boundary. Day-only actions also require fatigue headroom.
- Covered homes: duel, kizuna/banquet, professions (gather/craft/forge/farm),
  workforce, trade, caravan dispatch, garrison reinforcement, expedition start,
  assault/siege start, faction war/peace, courtship, rest, wage labor and
  location movement.
- Quests and exploration keep their service-level `applyActionTime`.
- `tests/verify-core-time-coverage.ts` proves trade +2 days, reinforcement +1
  and movement +1 through the real router.

### 14.3 Idempotency and action journal

- `src/shared/action-journal.ts` reads `idempotencyKey` (body or
  `Idempotency-Key` header), replays the stored result for a known key, and
  records every successful mutation in `action_log`.
- Trade, caravan dispatch, reinforcement, obligation payment, contract
  accept/deliver, intel verification and farm rent/plant/harvest use it.
  Replays do not re-charge cash, inventory, troops or days.
- `tests/verify-idempotency.ts` covers trade, reinforcement and farm rent.

### 14.4 Schema contract

- Services no longer create tables on first use. Migration 050 creates the
  runtime tables (equipment, family, loans, expeditions, intel fog, duels) and
  adds the runtime columns on `businesses` and `npc_state`.
- `tests/verify-schema-contract.ts` builds a fresh `schema.sql + all migrations`
  database and asserts the 18 runtime tables plus the required columns.

### 14.5 Error handling

- No empty `catch` blocks remain in `engine/` or `src/`. The `silent-catch`
  architecture ratchet is locked at 0, so a new silent fallback fails
  `npm run lint`.
- A deliberate best-effort fallback carries a comment explaining why it is safe.

### 14.6 World treasury ledgers

- Migration 051 creates `faction_ledger`; migration 052 creates
  `settlement_ledger`. Both seed an `OPENING` row equal to the current treasury.
- `postFactionEntry` and `postSettlementEntry` update the treasury and append one
  ledger row in a transaction; outflow is clamped to the available treasury.
- Tax pulse, tribute, officer rewards, caravan purchase/revenue, farm rent and
  siege loot go through the helpers. Rebel factions get an opening row;
  secession uses `INSERT OR IGNORE` so a repeat event cannot reset a treasury.
- The auditor proves `opening + sum(inflow) − sum(outflow) = treasury_cash` for
  every faction and settlement; a direct treasury write is reported as drift.

### 14.7 Per-module atomic month close

- `engine/world-transaction.js` runs NPC lifecycle, faction politics, ecology and
  AI war each inside one DatabaseService transaction. A module that throws rolls
  back all of its own writes.
- Module errors abort the close before the core batch commits, so a retry is
  safe; `world_turn_ledger` skips modules that already committed.
- This is per-module atomicity, not one transaction across every module; the
  retry ledger is the cross-module contract.

### 14.8 Day phases

- A day has three phases (`calendar.phasesPerDay = 3`):
  morning, afternoon and evening. `campaign_meta.current_phase` persists the
  slot (migration 053; also in the base schema).
- `getClock` returns `phase`, `phasesPerDay` and `phaseLabel`.
- `advancePhase` spends slots; reaching the end advances one day and resets to
  morning. `advanceCampaignDays` always resets the phase when a day passes.
- `ADMIN_ACTION` costs one phase; quest accept, perk choice, obligation payment,
  contract accept and caravan claim use it. Field actions still consume whole
  days (`days > 0` always wins over `phases`).

### 14.9 Remaining core caveats

- The month close is atomic per module, not one global transaction across the
  core batch and every world module; `world_turn_ledger` + retry is the
  cross-module guarantee.
- Only administrative actions use phases; most field actions still spend whole
  days by design.

### 14.10 Extended feature coverage (1.30.0)

The core contracts above now cover the remaining player-facing feature groups,
not only the original trade/military/farm set:

| Group | Mutations | Time | Idempotency |
| :--- | :--- | :--- | :--- |
| Loans | borrow / repay | 1 phase (`ADMIN_ACTION`) | key + `action_log` |
| Ecology | grain relief / stronghold assault / transport | phase / 1 day / 2 days | key + `action_log` |
| Professions | gather / craft / forge / hire / open / collect | policy row | key + `action_log` |
| Social | kizuna / natural chat / banquet / brotherhood / recruit | policy row | key + `action_log` |
| Progression | move / quest accept / quest step / perk / explore | phase or policy row | key + `action_log` |
| Duels | initiate / round / spar / arena / caravan ambush | policy row | key + `action_log` |
| Lineage | pregnancy tick / birth / mentorship / aging / succession | none or policy row | key + `action_log` |

Two ledger rules close gaps found during this pass:

- A bandit-stronghold victory books loot with `postDoubleEntry`
  (`Combat/BanditLoot`, credit `7001_BOUNTY_INCOME`) instead of updating
  `player_state.liquid_cash` directly.
- `/api/ecology/transport` delegates to `CaravanLogisticsService.dispatchCaravan`
  so cargo is deducted, the guard fee is journaled, and the caravan is marked
  `dispatched_by_player = 1` and can be claimed.

Each group has a dedicated gate: `verify-loan-contracts`, `verify-ecology-contracts`,
`verify-profession-contracts`, `verify-social-contracts`,
`verify-progression-contracts`, `verify-duel-contracts` and
`verify-lineage-contracts`.

---

## 15. Life Layer (1.31.0)

The life systems (kizuna, lineage, banquets, farmland) predate the skill
catalog. Section 14.10 closed their mutation contracts; this section connects
them to a real skill domain and a daily loop.

### 15.1 LIFE domain

Migration 054 adds nine skills under `domain = 'LIFE'`:

| Code | Skill | Attribute | Effect type |
| :--- | :--- | :--- | :--- |
| `SKL-LIF-COOK` | Kitchen & Household Feasts | CRA + INT | `MORALE_RECOVERY` |
| `SKL-LIF-TEA` | Tea Ceremony & Hospitality | DIP + POL | `SOCIAL_GAIN` |
| `SKL-LIF-ETIQ` | Etiquette & Household Rules | POL + DIP | `CREDIBILITY_GAIN` |
| `SKL-LIF-HOUSE` | Household Stewardship | POL + LOG | `UPKEEP_DISCOUNT` |
| `SKL-LIF-PARENT` | Family Instruction & Upbringing | INT + POL | `CHILD_GROWTH` |
| `SKL-LIF-MED` | Medicine & Convalescence | CRA + INT | `HEAL_RATE` |
| `SKL-LIF-MUSIC` | Music, Chess & Letters | CRA + INT | `LEISURE_GAIN` |
| `SKL-LIF-AUSTERE` | Restraint & Vitality | LOG + INT | `FATIGUE_RECOVERY` |
| `SKL-LIF-CIVIC` | Civic Duty & Local Standing | POL + LDR | `VIRTUE_GAIN` |

Each skill has tiered `master_skill_effects` and two `master_perks` (tiers 3
and 5). Effects are read through `SkillService.getEffectTotal`, so caps live in
the service that consumes them, not in the master row.

### 15.2 Daily loop

`player_life_state` (migration 054) stores `stress`, `last_meal_date`,
`last_rest_date`, `last_upkeep_month` and `routine_streak` per character.

`LifeService` owns six actions:

| Action | Time | Effect |
| :--- | :--- | :--- |
| `EAT_MEAL` | 1 phase | 0.1 grain, +morale (COOK), -stress |
| `SLEEP` | 1 day | fatigue recovery (AUSTERE), +morale, -stress |
| `TEA_WITH_NPC` | 1 phase | kizuna TEA_CONVERSE + TEA affinity bonus |
| `HOUSEHOLD_UPKEEP` | 1 phase | monthly household bill through `postDoubleEntry` (HOUSE discount) |
| `STUDY_TRAIN` | 1 phase | +20 skill EXP to any catalog skill |
| `LEISURE` | 1 phase | +morale (MUSIC), -stress, MUSIC EXP |

`POST /api/life/act` validates the action before charging, uses the shared
`action-journal` key, and records every success. `GET /api/life/status` returns
the four needs (`fatigue`, `morale`, `stress`, `health`), the current phase,
household summary, learned LIFE skills and available actions.

### 15.3 Household wiring (1.31.0)

The four spouse roles now have real consumers:

- `HOUSEKEEPER`: +45 fatigue recovery on spouse rest.
- `ENTERPRISE_SUPERVISOR`: +15% efficiency for player-owned businesses at month
  close (`engine/business-economics.js`).
- `STRATEGIC_ADVISOR`: +25% INT/POL gains in mentorship.
- `MILITARY_DEFENDER`: +25% effective guards when a player caravan is ambushed.

`growth_focus` now multiplies the matching mentorship stats by 1.25
(`WARFARE` → WAR/LDR, `INTELLECT` → INT/POL, `COMMERCE` → COM/LOG). `virtue`
reduces specialist signing bonuses by up to 10% (`specialist-workforce`).

### 15.4 UI

The Personal Journal gains a `Gia Đạo` tab: four need bars, current phase,
household summary, six action buttons and the learned LIFE skills. It calls the
life API directly; no new legacy script or contextual-action switch is added.

Gates: `tests/verify-life-layer.ts` and `tests/verify-life-wiring.ts`.

---

## 16. Livelihood Depth Foundation (1.32.0)

Agriculture, forestry, fishing and hunting were previously one generic gather
formula with different item names. Migration 055 makes the differences
data-driven.

### 16.1 Twelve livelihood skills

`master_skills` gains `AGRICULTURE`, `FISHING`, `FORAGING` and `SURVIVAL` skills:

| Group | Skills | Primary effects |
| :--- | :--- | :--- |
| Agriculture | `SKL-AGR-PLANT`, `SKL-AGR-IRRIG`, `SKL-AGR-SOIL` | crop yield, crisis risk reduction, soil recovery |
| Fishing | `SKL-FISH-NET`, `SKL-FISH-BOAT` | gather yield, travel speed |
| Foraging | `SKL-HERB-FORAGE`, `SKL-HERB-PREP` | gather yield, quality, defect reduction |
| Survival | `SKL-HUNT-TRACK`, `SKL-HUNT-SKIN`, `SKL-WILD-SURVIVAL` | gather yield, byproduct bonus, fatigue reduction |
| Tenure | `SKL-LAND-LEASE`, `SKL-FARM-LABOR` | rent discount, crop yield, fatigue reduction |

Each has five tiers, `CHECK_BONUS` plus its specialty effect, and perks at
tiers 3 and 5.

### 16.2 Resource rules and node state

`resource_node_rules` is the per-resource contract:

- `skill_code` — which skill receives EXP and gives the yield bonus.
- `required_tool_code` — a missing tool cuts yield by 30%, it does not block a
  basic node.
- `max_stock`, `respawn_per_day`, `min_skill_tier` — per-type economy limits.

`gathering_node_state` stores mutable stock per node. `ResourceNodeService`
refreshes stock lazily from the elapsed campaign days, so no world tick is
required and a failed gather rolls back inside the same transaction. Adding a
new resource is a data change: insert a rule, a node and optionally a tool item.

Gather yield is now:

```
base × (1 + (professionTier−1)×0.15)
     × (1 + min(0.30, skillTier×0.06))
     × toolMultiplier
     capped at base × 2.2
```

The response carries `skillCode`, `skillTier`, `skillBonus`, `toolMultiplier`,
`toolMissing` and `stockRemaining`, so the UI and audit can explain the number.

### 16.3 Farm rotation, soil and tenure

`master_crops` gains `skill_code`, `rotation_group` and `soil_impact`;
`land_parcels` remembers `last_crop_code`.

- Crop skill and `SKL-FARM-LABOR` raise expected yield.
- `SKL-AGR-IRRIG` reduces crisis and harvest risk.
- Harvest applies `soil_impact` (grain depletes, legumes restore) reduced by
  `SKL-AGR-SOIL`.
- A different `rotation_group` gives ×1.10; repeating the same group gives
  ×0.95.
- `SKL-LAND-LEASE` discounts rent, and the board exposes base rent, effective
  rent and discount.
- Harvest returns `soilBefore`, `soilAfter`, `effectiveRisk` and
  `previousCropCode`.

Gate: `tests/verify-livelihood-depth.ts`.

### 16.4 Resource variants and processing (1.33.0)

`resource_yield_variants` turns one resource type into a weighted table filtered
by skill tier and season. The current families:

| Type | Variants | Byproducts |
| :--- | :--- | :--- |
| FISH | river fish, carp, summer shrimp, autumn sturgeon | sturgeon roe |
| GAME | wild meat, venison, autumn antler | hide / antler |
| TIMBER | oak, pine, ebony | — |

Gather picks one variant with the deterministic `resource-variant` stream,
scales output by `quantity_multiplier`, writes the byproduct as its own stock
movement (`GATHERING_BYPRODUCT`), and returns `variant.quality` plus
`byproductItemCode`/`byproductQuantity`.

Processing recipes (`FOOD_PROCESSING`, `LEATHERWORK`, `WOODWORK`) use the common
outputs: dried fish, fish sauce, game jerky, cured hide and sawn planks.
`required_skill_code` and `required_skill_tier` are enforced by `/api/professions/craft`,
and a successful craft awards EXP to that recipe skill instead of a generic
category skill.

Adding a new species or processed good is still data: one variant row (or one
recipe + items), no gather/craft code change.

Gate: `tests/verify-resource-variants.ts`.





