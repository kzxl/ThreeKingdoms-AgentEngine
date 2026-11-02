# Implementation Plan — Remaining Analysis Phases

Date: 2026-11-01
Branch: `feat/remaining-systems`
Baseline HEAD: `c775225` (1.39.0; clean working tree)
Source analyses: `docs/audit/*`, `docs/*_2026-10-29.md`, `docs/REFACTOR_2026-10.md`,
`docs/PRESTIGE_SYSTEM.md`, plus the 2026-11-01 supply-chain re-check.

Baseline gate after Wave 0–2, W3-1, Map Step A and the wilderness slice:

| Gate | Result |
| :--- | :--- |
| `npm run verify` | 100/100 suites, 28/28 API contracts, 8/8 write smokes |
| `npm run audit` | 2,313 invariants, 0 discrepancies |
| Route shadow report | 48 live legacy handlers, 0 shadowed |

Wave 0 (`c775225`), W1-1/W1-2/W1-6 (`43f22da`, `5346294`), W1-4 (`ea945f9`),
W1-3 (`e4bb051`), the W1-7 warehouse/boat part (`d4228d9`), W2-1 (`e106118`),
W2-2 (`6ed8c5f`), W2-3 (`71a3d5d`), W2-4 (`3ca03b2`), W3-1 (`08f2ec4`),
Map Step A (`a6abaf6`) and the wilderness local map (`c8a8168`) are complete.
W1-5, multi-item routes, the city mini-map and W3-2–W3-7 remain.

Map Step A (`a6abaf6`) and the wilderness local map (`c8a8168`) are done. The
city mini-map is the next map UI phase; tiles stay in Wave 5.
The rule for every item below: one feature per commit, `npm run verify` and
`npm run audit` green before the commit, only task-scoped files staged.

---

## 1. Verified status of every analysis round

This table replaces the stale status banners in the dated analyses. "Open" means
the item is still reproducible at `bb48ac7`, not merely undocumented.

| Source analysis | Done | Still open |
| :--- | :--- | :--- |
| `docs/LOGIC_DUPLICATION_AUDIT_2026-10-29.md` | 15/16 findings closed (modals, date, day tick, caravan, business, ledger, hub, costs, trade UI, dead events, helpers, wages) | #10 map still has four data sources: `public/js/map-data.js`, `src/client/features/world-map/map-live.service.ts`, `src/modules/ecology-logistics/spatial-registry.ts`, and SQLite |
| `docs/ACTION_ECONOMY_ANALYSIS_2026-10-29.md` | P0 time/cost, P1 bypass coverage, P2 multi-day tasks, P3 upkeep/recovery; attribute progression already has diminishing returns; the month-close digest already carries dated action rows | P4 verification only: confirm the monthly report renders that digest as a day-by-day timeline; no blocking work |
| `docs/DAY_UNIT_REST_MONTH_ANALYSIS_2026-10-29.md` | P0 label, P1 skipped days, P2 unified clock, P3 month boundary | P4 remaining label sweep (`Lượt` in a few panels) |
| `docs/audit/DEEP_ARCHITECTURE_AUDIT.md` | REC-01 seeded RNG; REC-03 atomic turn; faction/settlement ledgers; true secession; crisis → agriculture; supply graph; Utility AI in NPC lifecycle; episodic memory; rival workshop founding | NPC commerce income is still thin-air; GOAP planner; Bayesian belief/fog model; NPC-owned business succession |
| `docs/audit/PLAYER_AGENCY_AND_WORLD_INTERACTION_AUDIT.md` | Player can reach health 0 in `battle-duel.service.ts`; NPC secession transfers settlement sovereignty; rival workshops exist | Health clamps still disagree across damage paths; NPCs cannot refuse a hire or counter-bid; player cannot defect; seven-stage intent engine; 366 `'PLY-0001'` literals in 65 files |
| `docs/REFACTOR_2026-10.md` | Waves 1–1.5, P3 determinism, P4 tick pipeline; equipment/forge duplication folded into `BlacksmithForgeService` | P5 client consolidation; P6 five god services; P7 48 live legacy gateway handlers; true per-request multi-instance |
| `docs/WORLD_MAP_DESIGN_ANALYSIS_2026-10-29.md` | All P0 and most P1: semantic zoom, constant-size markers, cursor-anchored zoom, minimap, route tooltips, keyboard/ARIA | Faction territory polygons, fog of war, multi-leg waypoints; army tokens blocked on march progress |
| `docs/WORLD_MAP_DEEP_UPGRADE_PLAN_2026-10-29.md` | Level 2 Live Map; A6/A7; Level 3 living tokens | Level 4 command layer; Level 5 cartographic depth; planned map module split (`map-registry`, `map-projection`, `map-layers/*`, `map-intel`, `map-actions`, `map-ui`) |
| `docs/PROFESSION_RESOURCE_WILDERNESS_ANALYSIS_2026-10-29.md` | Phase 0 settlement-level spatial gate; FISH/FARM/GAME nodes; `PROF_FARMER/FISHER/HUNTER`; Phase 1 farmland rent/plant/harvest; resource overlay read-only | Phase 2 wilderness scenes are generic only; Phase 3 overlay is not clickable and cannot travel; Phase 4 NPC tenants/fishers/loggers, weather, regional tax |
| `docs/UX_UI_REVIEW_2026-10-29.md` | All P0 (duplicate chronicle, one date source, telemetry hidden, ledger labels) | P1–P3: dock height, navigation groups, header vitals, typography floor, `Intl.NumberFormat`, onboarding |
| `docs/UI_ICON_AUDIT_2026-10-29.md` | Completed icon/ratchet pass | Maintenance only |
| `docs/PRESTIGE_SYSTEM.md` | Fame scale, tiers, decay, prestige events, succession, wills | Market-pulse long chart; officer territory transfer through the consequence strategy; equipment-instance uniqueness |
| Supply-chain re-check 2026-11-01 | **Wave 0 closed (`c775225`)** and **W1-1/W1-2/W1-6 closed (`43f22da`, `5346294`)**: freight reserves stock, one endowment-aware price resolver, per-system day ledger, stall local supply, consumption-driven freight | W1-3/W1-4/W1-5/W1-7 and the rest of the list in §4 |

### 1.1 The three live P0 defects (verified in code)

1. **Freight conjures stock.** `FreightService.accept`
   (`src/modules/market/freight.service.ts:222-303`) only charges the guard fee and
   inserts a shipment; it never reserves or debits the source. `deliver`
   (`:305-379`) credits the destination through
   `SettlementMarketService.applyTrade(..., +quantity)` at `:367`. Two contracts
   can draw the same source stock and the destination gains goods from nowhere.
2. **Dual price formula.** `RegionalMarketService.calculateSettlementPrice`
   (`src/modules/economy/regional-market.service.ts:517-551`) includes
   specialization × stock × endowment × world. `SettlementMarketService.getLocalMultiplier`
   (`src/modules/economy/settlement-market.service.ts:71-77`) includes only
   specialization × stock. Direct trade, contract board, intel, contextual actions
   and market pulse use the latter
   (`economy.controller.ts:289`, `contract-board.service.ts:169`,
   `intel.service.ts:126`, `intel.service.ts:200`, `context-action.engine.ts:220`),
   so farm/fishing endowment never reaches those prices.
3. **Day ticks are not idempotent.** `StallService.advanceByDays`
   (`src/modules/market/stall.service.ts:448-466`) loops `dayCount` times with the
   same `date`; `FreightService.advanceByDays` (`freight.service.ts:416-465`) has no
   transaction or day ledger; `SettlementMarketService.consumeEssentials`
   (`settlement-market.service.ts:158-196`) has no per-date key. Only merchant
   routes use `merchant_day_ledger` (`tools/migrations/069-merchant-day-ledger.js`).

---

## 2. Sequencing

The order is driven by blast radius, not by feature appeal:

1. **Wave 0** stops silent economic corruption. Nothing else should ship first.
2. **Wave 1** finishes the supply-chain loop that Wave 0 makes correct.
3. **Wave 2** makes NPC/world money and death follow the same rules as the player.
4. **Wave 3** gives the player real pushback and political agency.
5. **Wave 4** makes the world run and plan without the player clicking.
6. **Wave 5** turns the map from a viewer into a command surface.
7. **Wave 6** removes structural debt that slows every later change.
8. **Wave 7** is the UX backlog, safe to interleave once Waves 0–1 are green.
9. **Wave 8** is polish that can be scheduled opportunistically.

Waves 5–7 are independent of Waves 2–4. They can run in parallel with separate
owners, but only after Wave 0 is merged because both touch the market layer.

---

## 3. Wave 0 — P0 economic correctness — DONE (`c775225`)

Implemented in 1.39.0:

- **W0-1 Freight conservation** — migration 075 adds
  `freight_shipments.source_reserved_quantity`; `accept` debits the source,
  `deliver` credits the destination, `failContract` returns unspoiled cargo.
- **W0-2 One price resolver** — `getLocalMultiplier` includes endowment and
  `calculateSettlementPrice` composes the same value; a parity suite pins them.
- **W0-3 Day ledger** — migration 076 adds `world_day_ledger(system, game_date)`
  for stall, freight, merchant and consumption; `src/shared/game-date.ts` uses
  the 30-day campaign calendar.

Suites added: `verify-freight-conservation.ts`,
`verify-market-price-parity.ts`, `verify-day-tick-idempotency.ts`.
Gate: 89/89 suites, 28/28 contracts, 8/8 write smokes; 1,961 invariants, 0
discrepancies.

The original design notes are kept below for history.

### W0-1 Freight stock conservation

**Goal:** every shipment moves stock that already exists.

**Design (implemented):**
- Add `freight_shipments.source_reserved_quantity` (migration 075). The contract
  row does not need a second column because the shipment owns the reservation.
- In `accept`, inside the existing transaction: re-read source market stock,
  reject when `stock < quantity`, then `applyTrade(fromSettlementId, itemCode, -quantity)`
  and persist the reservation.
- In `deliver`, keep the destination `applyTrade(+quantity)`; pass only the
  delivered quantity (spoiled units are a real loss, not returned).
- In `failContract`, return the still-held quantity to the source market:
  `applyTrade(fromSettlementId, itemCode, +heldQuantity)`.
- `refresh` may keep its advisory check but must not be the only guard.

**Files:** `src/modules/market/freight.service.ts`,
`src/modules/economy/settlement-market.service.ts`,
`tools/migrations/075-freight-stock-reservation.js`.

**Tests:** `tests/verify-freight-conservation.ts`
- accept rejects when source stock is insufficient;
- accept + deliver conserves total stock (`source + destination + in-transit`);
- two parallel contracts cannot reserve the same units;
- a failed shipment returns unspoiled stock to the source.

**Audit:** extend block 9 in `tools/sim-audit.js` with a
`shipment quantity ≤ reserved quantity` invariant and a global stock conservation
check.

**Acceptance:** new suite green; audit catches an artificially inflated shipment.

### W0-2 One price resolver with endowment

**Goal:** one formula decides every buy/sell/quote price.

**Design:**
- Move the multiplier composition into one function, e.g.
  `resolveLocalMultiplier(settlementId, itemCode, gameDate)` in
  `SettlementMarketService`, including specialization × stock × endowment × world.
- Either make `getLocalMultiplier` call that function, or delete it and make every
  consumer call `RegionalMarketService.calculateSettlementPrice`. Prefer the first
  to keep `quoteFromReference` stable.
- Keep `quoteFromReference` as the fame/spread layer; it must receive the same
  local multiplier everywhere.
- Update the five consumers listed in §1.1.

**Files:** `src/modules/economy/settlement-market.service.ts`,
`src/modules/economy/regional-market.service.ts`,
`src/modules/economy/economy.controller.ts`,
`src/modules/economy/contract-board.service.ts`,
`src/modules/economy/intel.service.ts`,
`src/modules/contextual-actions/context-action.engine.ts`,
`src/shared/market-quote.ts`.

**Tests:** `tests/verify-market-price-parity.ts`
- for a fish-heavy and a grain-heavy settlement, direct trade, contract board,
  intel, contextual action and stall return the same reference for the same
  item/date;
- changing endowment moves all five in the same direction;
- buy price ≥ sell price is preserved.

**Acceptance:** no consumer calls a multiplier path that omits endowment.

### W0-3 Idempotent, atomic day ticks

**Goal:** advancing the same campaign day twice is a no-op for every subsystem.

**Design:**
- Generalize `merchant_day_ledger` into `world_day_ledger(system, game_date)`
  with primary key `(system, game_date)` (migration 076). Keep merchant rows
  readable via a compatibility view or migrate them.
- Stall, freight and monthly consumption each:
  1. open one transaction;
  2. check/insert their `world_day_ledger` row;
  3. process the day;
  4. commit.
- `advanceByDays` iterates real calendar dates derived from the campaign clock
  (`addDays(startDate, i)`), never `N × same date`.
- `consumeEssentials` records the date it consumed; a second call for the same
  date returns the stored result.

**Files:** `src/modules/market/stall.service.ts`,
`src/modules/market/freight.service.ts`,
`src/modules/economy/settlement-market.service.ts`,
`engine/stall-bridge.js`, `engine/freight-bridge.js`,
`engine/time-manager.js`, `tools/migrations/076-world-day-ledger.js`.

**Tests:** `tests/verify-day-tick-idempotency.ts`
- two advances for the same date produce one sale/spoilage/consumption set;
- a mid-transaction failure leaves no partial day;
- `advanceByDays(7)` produces seven distinct ledger dates.

**Acceptance:** audit has no duplicate `(system, date)` rows; replay of the same
day is byte-identical.

**Wave 0 commit split:** three commits, one per defect, each with its own test.

---

## 4. Wave 1 — Supply-chain depth (4–6 days)

| ID | Task | Files | Test / acceptance |
| :--- | :--- | :--- | :--- |
| W1-1 | ✅ **Done (`43f22da`).** Stall listings add `+quantity` to municipal stock, each sale subtracts `-sold`, closing subtracts the unsold remainder. `stall_listings.market_effect` makes the three steps auditable. | `stall.service.ts`, migration 077 | `verify-market-stall.ts`, audit block 9 |
| W1-2 | ✅ **Done (`5346294`).** Freight demand unions `settlement_consumption` with `deficitItems`, highest demand first; source falls back from surplus to highest stock to endowment. | `freight.service.ts` | `verify-freight-demand.ts` |
| W1-3 | ✅ **Done (`e4bb051`).** Fourth market tab shows freight contracts (guard tier + insurance), active shipments with delivery and merchant routes with pause/resume. | `market-stall.modal.ts`, `market-stall.service.ts` | `lint:api`, client build |
| W1-4 | ✅ **Done (`ea945f9`).** Deterministic lair/guard risk, 25/15/10% cargo loss by tier, freight 4% premium / 75% claim, one ambush per shipment, route cargo loss. | `logistics-risk.ts`, migration 078 | `verify-logistics-risk.ts`, audit |
| W1-5 | ✅ **Done (1.53.0).** `player_bag_by_location` + migration 084 mirror every inventory change into the current city; trade/warehouse/caravan reject goods held elsewhere. | migration 084, `player-bag.ts`, trade/warehouse/stall/caravan paths, deck UI | `verify-player-bag.ts`; audit bag ≤ aggregate |
| W1-6 | ✅ **Done (`43f22da`).** Audit block 9 checks `market_effect = quantity` for ACTIVE listings and `0` for closed/sold-out listings; freight reservation is checked too. | `tools/sim-audit.js` | deliberately corrupt a row; audit fails |
| W1-7 | ✅ **Done (1.53.0).** Warehouse lease extension, `TOOL-BOAT` + FISH tool, and multi-item merchant routes (`merchant_route_items`, migration 085). | `warehouse.service.ts`, migration 079/085, `merchant-company.service.ts`, logistics form | `verify-warehouse.ts`, `verify-tool-boat.ts`, `verify-merchant-route.ts` |

Wave 1 is complete. Remaining work is Wave 3 (W3-2…W3-7).

---

## 5. Wave 2 — World conservation and failure consistency (4–6 days)

### W2-1 NPC income conservation — DONE (`e106118`)

Migration 080 adds `npc_ledger`; `postNpcEntry`/`postNpcMutation` are the only
writers of NPC cash/troops. Commerce transfers cash from a named buyer, a bandit
raid takes bounty from the lair and recruits from the local garrison, and every
market/freight/loan/dowry/faction-reward writer appends an entry. The audit
checks the latest balance and the sum of deltas: 2,307 invariants.

The original finding is kept below for history:

### W2-2 One health/death rule — DONE (`6ed8c5f`)

All damage paths now call `applyPlayerDamage`
(`src/modules/military/player-vitals.ts`): injury, siege defeat, tactical
assault, duel ambush and bandit assault. Health may reach 0, and the first zero
calls `BattleDuelService.applyPlayerDeath` once (heir succession or `DEFEATED`).
The test runner gives every suite its own `SIM_LEGACY_PATH`, so a death test
cannot overwrite the shared NG+ profile. Gate: 94/94 suites.

The original clamp table is kept below for history.

| Path | Old clamp |
| :--- | :--- |
| `ecology-logistics.module.ts:340` | `MAX(0, health - 20)` |
| `condition.service.ts:104` | `MAX(1, ...)` |
| `military.module.ts:510` | `MAX(25, ...)` |
| `military.controller.ts:721` | `MAX(20, ...)` |
| `single-combat-duel.service.ts:1367` | `MAX(20, ...)` |

### W2-3 NPC-owned business succession — DONE (`71a3d5d`)

`src/shared/business-succession.ts` resolves every business managed/owned by a
dead NPC: adult heir → senior foreman trustee → settlement liquidation. The
successor row is inserted before the foreign-key update, and
`ConditionService.applyNpcDeath` calls the resolver before clearing the NPC.

### W2-4 Defeat/victory state consistency — DONE (`3ca03b2`)

Month close checks victory before bankruptcy, and a terminal status
(`VICTORIOUS`, `DEFEATED`, `BANKRUPT`) makes `chargePlayerAction` throw
`CAMPAIGN_OVER`. `verify-terminal-state.ts` covers both paths and the guard.

---

## 6. Wave 3 — Player agency and NPC pushback (6–10 days)

| ID | Task | Design | Test |
| :--- | :--- | :--- | :--- |
| W3-1 | ✅ **Done (`08f2ec4`).** Hiring reads baseline affinity + deltas, fame and virtue; low-standing strangers and proud officers refuse with `NPC_REFUSED` + 30-day retry date. | `verify-npc-refusal.ts` |
| W3-2 | NPC counter-bid: when the player buys the last units of a scarce item, a nearby NPC with cash and need bids; resolve by price/priority and re-plan the loser | `verify-npc-competition.ts` |
| W3-3 | Player defection | New action `JOIN_FACTION`/`DEFECT`; validate faction exists, reputation gate, transfer officers/enterprises, update `player_state.faction_id` | `verify-player-defection.ts` |
| W3-4 | Diplomacy HTTP route | Wrap `FactionPoliticsModule.getDiplomacyRelations()` as `GET /api/factions/diplomacy`; map diplomacy mode consumes it | `lint:api` contract |
| W3-5 | Delegated garrison/caravan | Appoint a marshal/master with a delegation level, like enterprise managers; monthly autonomous orders | `verify-delegation.ts` |
| W3-6 | `ExecutionContext` | Inject `{ characterId, campaignId, date }` into controllers/services; replace `'PLY-0001'` defaults incrementally; add an arch ratchet on the literal count (currently 366 in 65 files) | ratchet decreases, no behavior change |
| W3-7 | Seven-stage intent engine | Start with deterministic decomposition + feasibility preview (stages 2–4); LLM only for free-text parsing; execute through existing actions | `verify-intent-planner.ts` |

W3-6 should be split per module (market, professions, military, social) so each
commit is reviewable. Never combine it with a balance change.

---

## 7. Wave 4 — Autonomous world and planning (10–15 days)

### W4-1 GOAP planner

Add `npc_goals` and `npc_plans` (migration), action primitives with
preconditions/effects, and backward A* over a bounded action set. The merchant
case is the acceptance scenario: buy → escort → sell without bespoke scripting.
**Test:** `verify-goap-merchant.ts` — a merchant with enough capital forms and
executes a multi-hop plan; an impossible plan falls back to loan/smaller batch.

### W4-2 Beliefs and fog

Add `npc_beliefs(npc_id, subject, value, confidence, observed_date)` and
`settlement_intel`. Planners read beliefs, not ground truth. A stale belief must
produce the SCN-09 blunder (attack a reinforced citadel).
**Test:** `verify-beliefs-fog.ts`.

### W4-3 Background world clock

A scheduler or on-load catch-up that advances world modules when the player is
idle, with LOD budgets:
- LOD 0/1 monthly < 50 ms/character;
- LOD 2 weekly < 2 ms/character;
- full 1,000-NPC/20-settlement turn < 350 ms.
**Test:** `verify-world-clock.ts`; perf probe in `tests/perf`.

### W4-4 Autonomous organizations

NPC-founded enterprises delegate, hire, pay payroll and pass succession without
player input; faction treasuries and settlement taxes balance through ledgers.

---

## 8. Wave 5 — Map Level 4–5 and one registry (15–20 days)

### W5-1 Map registry from the database

Delete the four-source split:
- `master_locations` (20 rows, 133 sub-locations) becomes the only location
  registry; `map-data.js` keeps only coordinates, seals and route geometry;
- `src/modules/ecology-logistics/spatial-registry.ts` becomes a thin query over
  the DB instead of a second name table;
- `map-live.service.ts` keeps live-state merging only.
**Test:** every DB settlement, route endpoint, expedition, caravan and POI
resolves to one rendered node; zero orphans (extend
`tests/verify-map-live-contracts.ts`).

### W5-2 Clickable wilderness and local POI picker

- Read `sub_locations` from `/api/locations` instead of the 20 hardcoded blocks.
- Split the picker into Nội Thành / Dã Ngoại, with terrain icons.
- Make pass/resource nodes clickable; remove `pointer-events: none` from
  `.map-resource-layer`.
- First 8–12 wilderness scenes: Bắc Mang Sơn, Thái Hành Sơn Đạo, Kiếm Các,
  Đô Giang Yển, Thái Hồ, Hoài Thủy, Dục Thủy, Trường Giang, Rừng Trầm Hương,
  Long Trung.
**Test:** `verify-wilderness-poi.ts` — every listed wilderness sub-location is
reachable and opens a non-generic scene.

### W5-3 Level 4 command layer

- Multi-leg waypoints with total cost and per-leg risk.
- Supply reachability and ambush on the chosen route (reuse
  `evaluateArmySupply`).
- `military_expeditions.arrival_date` already exists; add or derive `departure_date`
  from `game_date`/`march_days` so army tokens interpolate.
- Diplomacy mode over `GET /api/factions/diplomacy`.
- Fog of war on `settlement_intel`; level-0 nodes expose no numbers.
**Acceptance:** the deep-upgrade §10 criteria, including 60 fps with 20 nodes /
24 routes / 30 tokens and VI/EN labels.

### W5-4 Level 5 cartographic depth

Terrain layers, seasons and timeline replay. Keep SVG; do not move to WebGL.

### W5-5 Map module split

`map-registry`, `map-projection`, `map-live-service`, `map-layers/*`,
`map-intel`, `map-actions`, `map-ui`, a layer registry and a `MapViewModel`.
`public/js/world-map.js` is now the largest legacy file; split it only behind
characterization tests (`verify-strategic-world-map.ts` and
`verify-map-live-contracts.ts`).

### W5-6 POI scene consumer

All 132 `master_poi_scenes` rows are currently exposed by one endpoint
(`tools/sim-web.js:1544`) and consumed by nobody. Wire `scene_key` into
`ContextActionEngine.generateGenericChoices` so a named POI opens its own scene
instead of the generic fallback.

---

## 9. Wave 6 — Structural consolidation (15–20 days)

### W6-0 True per-request multi-instance

`tools/sim-web.js:270-300` returns 409 for a non-startup instance and asks for a
restart. Rebind `ModuleRegistry` and per-path service singletons per request (or
per instance worker) so the 409 disappears.
**Test:** `verify-instance-manager.ts` two instances in one process, no cross-write.

### W6-1 P5 client consolidation

21 legacy scripts plus `public/app.js` are still loaded from
`public/index.html:1017-1040`. Migrate into the existing TS feature slices, delete
the legacy bridge, reduce `index.html` to one module script.
**Gate:** `lint:client`, browser walkthrough, `legacy-script-count` ratchet.

### W6-2 P6 god-service split

| Service | Lines |
| :--- | ---: |
| `src/modules/contextual-actions/context-action.engine.ts` | 2,105 |
| `src/modules/professions/blacksmith-forge.service.ts` | 1,582 |
| `src/modules/military/single-combat-duel.service.ts` | 1,481 |
| `src/modules/professions/enterprise-labor.service.ts` | 1,328 |
| `src/modules/lineage-succession/courtship-betrothal.service.ts` | 1,035 |

Split only a slice that a feature already touches; write a characterization test
first. Equipment/forge duplication is already folded into `BlacksmithForgeService`
— do not redo it.

### W6-3 P7 gateway remainder

48 live legacy handlers remain. Extract cluster by cluster (instances, status/
inventory/NPC reads, faction writes, chat/agent, game slots, travel, events,
action/workshop), running `npm run routes:shadow` after each step. Target:
`sim-web.js` serves static files and `listen()` only.

### W6-4 UI debt

`public/` still has 777 inline `style=` attributes and 8 native `confirm()` calls.
Move to the token/utility layer and the `ModalShell` confirm component; ratchet
both counts down.

---

## 10. Wave 7 — UX/UI backlog (8–12 days)

| ID | Task | Source | Acceptance |
| :--- | :--- | :--- | :--- |
| W7-1 | One-row command dock + decision accordion | UX P1 | dock ≤ 25% stage height at 1440×900; decisions collapsed by default |
| W7-2 | Remove duplicate turn CTA in the header; change default right-panel tab from raw ledger to relations | UX P1 | one primary amber CTA; ledger stays in the Journal |
| W7-3 | Navigation: three groups + Ctrl+K | UX P1 | ≤ 3 entry points; keyboard opens command palette |
| W7-4 | Vitals to header; merge money indicators | UX P2 | one stamina and one money value |
| W7-5 | Typography floor 11 px; five-step scale; global `Intl.NumberFormat('vi-VN')` | UX P2 | `tinyFontSizes` ratchet stays 0; no ad-hoc `toLocaleString()` |
| W7-6 | Onboarding/tutorial | game-quality audit | a new player can complete the first day without external docs |

---

## 11. Wave 8 — Progression and endgame polish (3–5 days)

- Market-pulse long chart (12 historical points already stored in
  `settlement_market_history`).
- Officer territory transfer through the `UnrestConsequence` strategy instead of
  direct faction-politics SQL.
- Equipment-instance uniqueness (last-write-wins is still possible).
- Monthly report day-by-day timeline (ACTION_ECONOMY P4 residual).
- Era guard: `engine/gameplay-manager.js:342-343` hard-stops at year 300. Decide
  between a soft warning and an extended calendar before long campaigns are tested.
- Remaining `Lượt` labels in panels (DAY_UNIT P4).
- Documentation sync is done: `HANDOFF.md` and `PROGRESS.md` now point at the
  current 98-suite / 2,313-invariant gate instead of the 20-test snapshot.

---

## 12. Cross-wave protocol

1. **Baseline first.** Run `npm run verify` and `npm run audit`; record counts.
2. **One feature per commit**, Vietnamese conventional message, body lists files
   and verification result.
3. **Tests are part of the feature.** Every wave item above names its suite; a
   feature without a regression test is not done.
4. **Audit invariants grow with the feature.** Any new conserved resource needs a
   block in `tools/sim-audit.js`; total must stay at 0 discrepancies.
5. **Client changes** require `npm run build:client` and a browser check against a
   restarted dev server.
6. **No balance changes during determinism or refactor work.** Split them.
7. **Do not delete `engine/` or legacy UI until the replacement passes the same
   browser and contract checks.**

## 13. Recommended next slice

Wave 2 is complete and W3-1 (hire refusal) is done. Continue with:

1. `W3-2 NPC counter-bid` — a nearby NPC competes for scarce stock.
2. `W3-3 player defection` — join/leave a faction with reputation and asset rules.
3. `W3-4 diplomacy HTTP route`, `W3-5 delegated garrison/caravan`,
   `W3-6 ExecutionContext` ratchet, `W3-7 intent planner`.
4. `W1-5 per-city bag` and multi-item merchant routes when transport is the
   active focus.

`W2-1` through `W2-4` and `W3-1` are done.

New features should follow `docs/FEATURE_MODULE_STANDARD.md` and start from
`npm run scaffold:feature <name> --domain=<domain>`.
