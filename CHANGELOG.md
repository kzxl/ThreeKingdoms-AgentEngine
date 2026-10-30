# Changelog (CHANGELOG.md)

All notable changes to the `ThreeKingdoms-AgentEngine` simulation engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.18] - 2026-10-30

Equipment instance bequests, market history and consequence strategies.

### Changed
- Equipment bequests now use `character_equipment.id` (instance id) instead of
  `item_code`, so duplicate weapons are transferred individually.
- Migration `023-settlement-market-history`: every monthly stock drift appends a
  history point. `GET /api/economy/settlement-market` returns current stock,
  demand, multipliers and the last 12 points; the **Chợ & Giá** button opens a
  market-pulse table.
- `UnrestConsequence` strategy interface with `RetainerDepartureConsequence`
  (retainer SQL) and `OfficerUnrestConsequence` (shared log + faction action
  signal). Faction and retainer paths no longer duplicate their consequence
  bookkeeping; territory SQL remains in faction-politics by design.

### Verification
`npm run verify` green: 29/29 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. Tests cover equipment
instance transfer, market history points/pulse and the 23-migration schema.

---

## [1.6.17] - 2026-10-30

Asset bequests, supply-shock badges and a shared unrest decision model.

### Changed
- Migration `022-will-assets`: businesses and equipment can be assigned to a
  child. A non-heir child takes ownership (business `owner_character_id`,
  equipment `character_id`); the Succession tab lists available assets with a
  child selector.
- `/api/inventory` returns per-item `stockPressure` (`SCARCE`/`SURPLUS`/`NORMAL`)
  and `stockMultiplier`; the inventory deck shows a **Khan/Dư** badge next to
  the unit cost.
- `UnrestService.calculateRisk` remains the single risk formula for officer
  betrayal and retainer departure. Consequence handlers stay domain-specific
  because a coup transfers territory while a departure only frees a post.

### Verification
`npm run verify` green: 29/29 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. Tests cover the 25% sibling
cash share plus business ownership transfer and the 22-migration schema.

---

## [1.6.16] - 2026-10-30

Per-child wills, ancestor chronicle and one unrest risk model.

### Changed
- Migration `021-will-allocations`: `family_will_allocations` plus
  `family_children.inheritance_cash`. The will now assigns basis-point shares to
  each child; non-heir shares are paid into their inheritance ledger and the
  heir keeps the remainder. Charity and child payouts post one ledger outflow.
- The Succession tab lists every child with a percentage input; Save Will
  validates that charity + child shares do not exceed 100%.
- The Gia Phả tab renders the full ancestor chronicle: posthumous title,
  generation, reign dates/turns, age, final net worth and achievements.
- `UnrestService.calculateRisk` is now the single loyalty/ambition/prestige/fame
  formula used by both officer betrayal and retainer departure; the shared
  `unrest_events` log records both consequences.

### Verification
`npm run verify` green: 29/29 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. Tests cover a 25% charity +
25% sibling will (50% heir), sibling inheritance cash, the ancestor schema and
the unified unrest risk.

---

## [1.6.15] - 2026-10-30

Legacy local prices, inheritance will and a unified unrest stream.

### Changed
- `SimulationCore` and contextual action quotes now include the settlement
  specialisation × stock multiplier, matching `/api/trade`; the legacy action
  test expectations moved accordingly.
- Migration `019-family-will`: the player can leave 0–50% of liquid capital to
  charity. Succession posts the charity as a ledger outflow, keeps the rest for
  the heir, adds family prestige and exposes the will in the Succession tab.
- Migration `020-unrest-events`: retainer departures and officer coups/defections
  feed one append-only unrest stream for report/audit.
- Legacy schema, instance reset and bootstrap tests cover migrations 019–020.

### Verification
`npm run verify` green: 29/29 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. Tests cover the 25% will
transfer, the charity ledger outflow, retainer unrest logging and the 20-migration
fresh schema.

---

## [1.6.14] - 2026-10-30

Guest assignment, persisted local stock, retainer departures and succession UI.

### Changed
- Named fame guests are auto-assigned to the first player business with a waived
  signing bonus when their fame gate is met; otherwise they remain `GUEST`.
- Migration `017-settlement-market-state` persists stock/demand per settlement
  and item. `SettlementMarketService` lazily seeds surplus/deficit profiles,
  applies a stock multiplier and drifts monthly; `/api/trade` uses the combined
  specialisation × stock multiplier.
- Migration `018-retainer-departures`: low fame erodes retainer loyalty; below
  30 loyalty a retainer can leave, losing the assignment and writing
  `retainer_departures`. The monthly report lists departures.
- The lineage Succession tab now lists adult children, lets the player designate
  an heir and execute succession through the existing audited service.

### Verification
`npm run verify` green: 29/29 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. Tests cover auto-assigned
guests, stock/demand multipliers and drift, and retainer departure logging.

---

## [1.6.13] - 2026-10-30

Named guests, heir succession, local prices and fame deterrence.

### Changed
- Migration `016-fame-arrival-npcs` links arrivals to `master_characters`.
  Fame now pulls real specialists from the unhired NPC-02xx pool into
  `npc_state` with role `GUEST`, so the normal workforce hire flow can assign
  them to a business; generic volunteers/merchants/scholars remain for the rest.
- Player death with a designated heir now runs
  `DynastySuccessionService`, keeps the campaign `ACTIVE`, transfers identity
  and resets personal fame to 500. Without an heir the campaign is `DEFEATED`.
- A full-screen defeat overlay explains death/bankruptcy and returns to title.
- `RegionalMarketService.getSpecializationMultiplier` feeds local surplus/deficit
  (0.7×/1.5×) into `/api/trade` quotes using the player's settlement mapping;
  season/crisis multipliers still apply on top.
- Fame now deters betrayal: 500 fame is neutral, higher fame lowers officer
  betrayal risk, lower fame raises it.

### Verification
`npm run verify` green: 29/29 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. Tests cover named guests,
heir succession, local specialization and the defeat overlay contract.

---

## [1.6.12] - 2026-10-30

Fame arrivals, world prices and defeat states.

### Added
- Migration `014-fame-arrivals`: `player_state.militia` and `fame_arrivals`.
  Month close attracts 0–3 visitors by fame tier; volunteers add militia,
  merchants add grain, scholars add fame. The monthly report lists arrivals.
- Migration `015-defeat-states`: `campaign_meta.status/defeat_reason/distress_months`,
  `npc_state.is_alive` and `battle_duels`.
- `BattleDuelService`: civil-officer negotiation, 20% champion-duel trigger,
  1–3% (cap 8%) death roll, morale shifts, fame changes and an audit log.
  Stronghold battles call it before `TacticalBattleEngine`; a player death sets
  `DEFEATED` and blocks all day-consuming actions with `CAMPAIGN_OVER`.
- Bankruptcy: two consecutive months below 100 cash and 1 grain set `BANKRUPT`;
  recovery resets the counter.
- `world-price` season/crisis multipliers (grain cheap at harvest, expensive in
  lean months; active droughts/locusts/floods/plague raise the effective
  reference) layered into the fame-aware quote in both TS and the engine.
- A client toast announces a defeated or bankrupt campaign.

### Verification
`npm run verify` green: 29/29 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. New `verify-battle-duel.ts`
and `verify-world-price.ts` cover death/defeat/action gates, bankruptcy,
season/crisis multipliers and TS/CJS parity.

---

## [1.6.11] - 2026-10-30

Fame-driven rare item discovery.

### Added
- Migration `013-item-discovery`: `discovery_items` (weighted, fame-gated) and
  `exploration_log` (every roll, chance, fame and pity flag).
- `ExplorationService` + `POST /api/explore`: one day per search, chance
  `3% + fameRatio × 20%` (cap 35%), weighted item pick, ten-failure pity floor,
  inventory/stock movement and action log.
- Local header button **Khảo Sát** calls the endpoint and refreshes status/inventory.

### Verification
`npm run verify` green: 27/27 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. New `verify-exploration.ts`
covers the 3% fame-0 chance, pity find, one-day cost, grain upkeep, stock
movement, action log and the day-30 block.

---

## [1.6.10] - 2026-10-30

Fame gates and inactivity decay.

### Changed
- Specialist candidates expose `minFame`, `eligible` and a locked reason; role
  gates are worker 0, weaver 300, escort 500, smith 800, manager 1,200.
- `hireSpecialist` rejects a candidate below the gate before any cash moves.
- Month close reads the player's last `prestige_events` date and applies
  `decayInactive` after six inactive months; the report shows the delta.
- The monthly report adds a Danh vọng row.

### Verification
`npm run verify` green: 26/26 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. `verify-prestige` covers the
locked manager at 500 fame and the eligible hire after recovery.

---

## [1.6.9] - 2026-10-30

Prestige effects wired into recruitment, prices and duels.

### Changed
- `config/market-pricing.json` + `src/shared/market-quote.ts` (CJS mirror
  `engine/market-quote.js`): 10% merchant spread, fame buy discount up to 5%,
  fame sell bonus up to 4%; the buy price is always at least the sell price.
- `SimulationCore` and `/api/trade` settle at the quote; client `unit_price`
  remains ignored. `/api/inventory` returns `estimatedBuyPrice` /
  `estimatedSellPrice` and the deck uses them.
- Every contextual action quotes the side-specific buy/sell price.
- Specialist hiring ignores the client signing bonus, derives the base price
  from the candidate role and applies the fame discount; results expose
  `baseSigningBonus`, `fameDiscount`, `fameTierCode`.
- Duels award/penalize fame: sparring +5/+10, arena +60/-15, caravan +40/-10;
  results expose `fameDelta`, `fameAfter`, `fameTierCode`.

### Verification
`npm run verify` green: 26/26 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. `verify-market-price-book`
now checks CJS/TS quote parity, buy > sell and side-specific action quotes;
`verify-prestige` checks the hire discount and server-owned signing price.

---

## [1.6.8] - 2026-10-30

ROTK XIII-like prestige scale.

### Changed
- `config/prestige.json` defines a 0–10,000 soft-capped fame scale (hard ceiling
  99,999), nine tiers from `NOBODY` to `HEARTS_OF_THE_REALM`, diminishing gains,
  inactivity decay and effect coefficients.
- Migration `012-prestige-scale` adds `player_state.fame/credibility/virtue`,
  rescales legacy NPC and family prestige by 10 once, and creates
  `prestige_events` plus the `character_prestige` view.
- `PrestigeService` is the only fame writer: player fame lives in
  `player_state.fame`, NPC fame stays in `npc_personal_progression.prestige`;
  every change appends an audit event.
- Legacy thresholds moved with the data: courtship 150→1,500, NPC career
  milestones 90/190/250→900/1,900/2,500, family gains +15/+25/+50→+150/+250/+500,
  family default 100→1,000.
- Fame 0 is the `NOBODY` tier, not a defeat.

### Verification
`npm run verify` green: 26/26 suites, 28/28 contracts, 8/8 write smokes;
`npm run audit` 1,358 invariants, 0 discrepancies. New `verify-prestige.ts`
covers tier boundaries, diminishing returns, decay, the audit ledger and the
unified view.

---

## [1.6.7] - 2026-10-30

Month-close correctness, UI readability floor and CI.

### Changed
- Month close counts skipped days as `31 - current day` (the jump from day D to the next
  month's day 1) instead of `30 - day`, which was one day short.
- Skipped days now consume grain upkeep and emit `WORLD_DAY_TICK` for every elapsed day except
  the new month's first day (the month tick covers that one). Tasks and caravans advance by the
  same count.
- A failing world module renders a dedicated month-close error panel with the module error and a
  retry button; the toast is no longer the only signal.
- The monthly report labels each business settlement as `WORKSHOP` or `PASSIVE` and shows skipped
  days / grain upkeep.
- `advanceTurn` refuses a clock outside the 180–300 era; migration `011-repair-campaign-clock`
  snaps an implausible clock back to the latest `turn_log` date.
- Typography: all 170 declarations at or below 10.5px are now 11px; the UI ratchet tracks
  `tinyFontSizes = 0` so the regression cannot return.
- CI: `.github/workflows/verify.yml` bootstraps the ignored session DB, runs `verify`, `audit`
  and the client build.
- Perf baseline re-recorded (11 endpoints, 12 iterations).

### Verification
`npm run verify` green: 25/25 suites, 28/28 contracts, 8/8 write smokes; `npm run audit` 1,358
invariants, 0 discrepancies.

---

## [1.6.6] - 2026-10-30

Single market-price source.

### Changed
- `master_items` is the only market price. `engine/market-price-book.js` and
  `src/shared/market-price-book.ts` are the read paths; the `COMMODITY_PRICE_INDEX` table in
  `engine/rules.js` is deleted.
- `SimulationCore` trades and production valuation read `master_items`; a client-supplied
  `unit_price` is ignored and an unpriced item returns `ITEM_NOT_FOUND` /
  `MARKET_PRICE_MISSING` instead of a local fallback.
- `/api/trade` resolves `current_market_price` server-side; the request price is no longer read.
- The workshop sells, values stock and procures materials at catalog prices.
- Every contextual action quotes the catalog price it settles at, including grain, salt, mats,
  shields, leather, herbs, horses and licenses.
- Migration `010-complete-market-catalog` adds the four rows the actions needed but the catalog
  lacked: `COM-TWINE`, `LIC-LUOYANG`, `LIC-JIANYE`, `LIC-JIANGE`.
- `market-elasticity.ts` is documented as a scenario model; it does not settle trades.

### Verification
`npm run verify` green: 25/25 suites (4 legacy + 21 modern), 28/28 contracts, 8/8 write smokes
(the BUY smoke now sends a spoofed price and still charges the catalog price); `npm run audit`
1,358 invariants, 0 discrepancies. New `verify-market-price-book.ts` checks TS/engine parity,
action-catalog coverage, spoof rejection and price-less rejection.

---

## [1.6.5] - 2026-10-30

Chart-of-accounts unification.

### Changed
- Migration `009-unify-account-codes` rewrites 124 historical `account_journal` rows from the
  legacy labels (`CASH-ON-HAND`, `EXP-OPERATING`, `REV-SALES`, `REV-TRADING`, `ASSET-CASH`,
  `101_TIEN_MAT`, `301_VON_CHU_SO_HUU`, `5001_SALES_REVENUE`) to the numeric chart.
- `ACCOUNT_CODES` now exposes only the numeric canonical set; `ACCOUNT_ALIASES` /
  `canonicalAccountCode()` remain as the reporting bridge.
- Every journal writer (caravan, daily interaction, tavern banquet, military, workforce, event
  manager, new-game seed) emits canonical codes. `verify-logic-ownership` asserts every distinct
  `account_journal.account_code` is declared in `ACCOUNT_CODES`.
- `sim-db init` applies migrations 001–009.

### Verification
`npm run verify` green: 24/24 suites, 28/28 contracts, 8/8 write smokes; `npm run audit` 1,358
invariants, 0 discrepancies (journal Dr/Cr parity unchanged).

---

## [1.6.4] - 2026-10-29

Extensibility pass: one cashflow writer, a canonical account-code map, and fresh-schema
bootstrap coverage.

### Changed
- **All cashflow postings go through one writer.** The 18 remaining direct
  `INSERT INTO cashflow_ledger` sites (promissory notes, economy buy/sell/loans, enterprise labour
  and dividends, dynasty succession, dowry, arena prize, stronghold loot, instance bootstrap) now
  use `postCashflowEntry` / `postCashflowEntryRaw`. The `cashflow-direct-insert` ratchet is **0**.
- **`src/shared/account-codes.ts`** provides `ACCOUNT_CODES`, `ACCOUNT_ALIASES` and
  `canonicalAccountCode()`; the canonical writer, instance bootstrap and economy journal calls use
  the constants. Historical journal rows are not rewritten.
- **Instance bootstrap** seeds NPC-0007/NPC-0008 when `npc_state` is empty and adapts to optional
  columns (`owner_character_id`, exp columns), so a `sim-db init` database is bootstrappable.
  `verify-instance-bootstrap` covers that path.
- **`startNewGame`** derives a deterministic campaign id from scenario + archetype instead of
  `Date.now()`.
- **Caravan wait button** shows the day-30 `MONTH_END` error instead of silently doing nothing.
- README documents the fresh-checkout bootstrap (`ingest-markdown-master.js` + `sim-db init`) and
  the Quan/Thạch units; suite counts are now 4 legacy + 20 modern.

### Verification
`npm run verify` green: **24/24** suites, 28/28 contracts, 8/8 write smokes; `npm run audit`
1,358 invariants, 0 discrepancies; arch guard 10 rules, `cashflow-direct-insert 0`.

---

## [1.6.3] - 2026-10-29

Post-review hardening of the data flows the first gate could not see.

### Fixed
- **New games inherited the live playthrough.** `instance-bootstrap.ts` now clears every history
  and runtime table (turn/action logs, chronicle, tasks, caravans, duels, loans, family, equipment,
  NPC progression/journeys/relations, world-turn markers, player/ledger/stock) and reseeds the
  player, starting stock, workshop, NPC assignments, opening ledger and first turn. New instances
  pass the clock/cash/inventory/journal audits; a commoner starts without owning the workshop.
  `tests/verify-instance-bootstrap.ts` covers both archetypes and foreign-key integrity.
- **Fresh schema was behind migrations.** `tools/schema.sql` now declares
  `trade_caravans.dispatched_by_player`, `chat_chronicle` with its dedupe trigger,
  `active_tasks.last_tick_date` and `world_turn_ledger`; `tools/sim-db.js init` applies all 8
  migrations after seeding.
- **Task progress could double on a failed month close.** `progressTasks` is idempotent per
  campaign date (`last_tick_date`) and `advanceTurn` now writes it after the core turn batch
  commits; the report uses a pure projection.
- **Instance switching could write the wrong database.** The gateway no longer keeps the previous
  request's instance sticky and returns `409 INSTANCE_NOT_ACTIVE` for modular routes when the
  selected DB is not the startup campaign. `/api/instances/select` reports `restartRequired`.
- **Day-30 caravan tick reported a day that never passed.** It now returns `409 MONTH_END`.
- **Archived grain units.** Migration `008-normalize-grain-unit` rewrites `master_items` `Dan`
  cells to `Thạch`/`piculs` (applied to the live DB).

### Verification
`npm run verify` green: **24/24** suites, 28/28 contracts, 8/8 write smokes; `npm run audit`
1,358 invariants, 0 discrepancies. Arch guard: 10 rules, silent-catch 26 → 19.

---

## [1.6.2] - 2026-10-29

Currency unit standard: **Quan** (VI) / **quan** (EN), replacing the mixed `Tiền` / `Qian`
labels. Decision and historical caveat: `docs/CURRENCY_UNIT_STANDARD.md`.

### Changed
- 500+ user-facing currency labels across 39 files now use `Quan`/`quan` (contextual actions,
  agent narration, caravans, trade, enterprise, journal, NPC dossier, world map, modal reports,
  battle loot, wages, succession, tools projections, PROGRESS.md and the auditor/checkpoint
  parsers that read it).
- `public/js/config.js` exposes `CURRENCY_UNIT`, `GRAIN_UNIT`, `formatMoney(amount, lang)` and
  `formatGrain(amount, lang)`; the header cash, inventory-value, net-worth and grain chips use
  them, so Vietnamese shows `6.586 Quan` / `9,60 Thạch` and English `6,586 quan` / `9.60 piculs`.
- Legacy wording fixed while converting: `140 Quan đồng` → `140 Quan`, `100 Quan mặt` →
  `100 Quan tiền mặt`, `Rút Tiền` → `Rút Quan`, `Thu Tiền` claim button → `Nhận Quan`.
- Grain unit normalized to **Thạch** (VI) / **piculs** (EN): removed the remaining `Dan` labels
  from projections, contextual actions, commodity rules, military errors and ingest seeds.

### Added — shared constants
- `config/game-constants.json` is now the single source for currency/grain units, the 30-day
  calendar, daily grain upkeep, daily fatigue recovery, fatigue cap and the fallback date.
  `src/shared/constants.ts` re-exports it for TypeScript; `engine/time-manager.js` and
  `engine/date-utils.js` require it; `public/js/config.js` keeps the classic-script copy.
- `tests/verify-shared-constants.ts` fails if the JSON, TS surface, engine numbers or client copy
  drift (calendar roll-over is asserted too). Docs: `docs/SHARED_CONSTANTS.md`.

### Added
- Anti-slop hard rule `legacyCurrency`: `N Tiền`, `N Qian` and `Tiền/đơn vị` may not reappear in
  `public/`, `src/`, `engine/` or `tools/`. Names (`Tao Qian`, `Tiền Phong`, `Tiền Tuyến`),
  concepts (`tiền mặt`, `tiền công`) and API identifiers (`costQian`) are intentionally exempt.

### Docs
- New root `AGENTS.md`: Markdown documentation must be English (token-efficient agent context),
  cross-cutting constants live in `config/game-constants.json`, and `npm run verify` is the gate.
  Dated `docs/*_2026-*.md` analyses may remain as archived snapshots in their original language.
- `docs/CURRENCY_UNIT_STANDARD.md`, `docs/SHARED_CONSTANTS.md` and
  `docs/REFACTOR_REVIEW_2026-10-29.md` are now English.

### Verification
`npm run verify` green: **23/23** suites, 28/28 contracts, 8/8 write smokes; anti-slop reports
`legacyCurrency 0`. Client bundle rebuilt; `npm run audit` still 1,358 invariants after PROGRESS.md
switched to `quan`. Historical note: the Han coin is 五銖錢 and one 貫 (quan) is strictly 1,000
coins; the game's amounts are an abstract scale, so `Quan` is a genre convention — use `văn` as the
base unit only if the whole economy is rescaled.

---

## [1.6.1] - 2026-10-29

Standardisation pass after `docs/REFACTOR_REVIEW_2026-10-29.md`: one implementation per
remaining duplicate (ledger postings, date math, travel randomness, equipment, shifts, trade UI)
and removal of dead code.

### Changed — one implementation
- **Cashflow postings:** `postCashflowEntry` in `src/shared/ledger.ts` is the single INSERT with the
  canonical balance (`capital + inflow - outflow`). Caravan dispatch/claim, daily interactions,
  wage labour and banquet procurement now use it. A new arch rule `cashflow-direct-insert` freezes
  the 18 remaining direct INSERTs so the count can only shrink.
- **Date math:** `engine/time-manager.js` no longer carries its own parser/formatter; it delegates
  to `engine/date-utils.js` (`parseGameDate` / `formatGameDate` / `addDaysToDate`).
- **Travel randomness:** `engine/travel-manager.js` uses a seeded `SeededRandom` derived from
  `campaign_meta.random_seed`, the active month and the route/event/choice keys. Encounter
  selection and the d20 roll now replay identically; `Math.random` is gone from the engine's
  travel path.
- **Event ids:** `TXN-EVT-*` / `CHRON-EVT-*` are derived from `eventId + choiceId` instead of
  `Date.now()`, so replaying a resolved event cannot post a second ledger row.
- **Equipment:** `EquipmentSystemService.equipItem/unequipItem` delegate to
  `BlacksmithForgeService` (one mutation path, one stock movement, one projection sync). The forge
  gained `options.requireStock` for simulation fixtures; real equips still require warehouse stock.
- **Labour shifts:** `enterprise-labor.service.ts` imports `CANONICAL_LABOR_SHIFTS` instead of its
  own 111-line copy (wages/fatigue were identical; the forge-hand profession now correctly maps to
  `PROF_BLACKSMITH`).
- **Trade UI:** the legacy `openQuickTrade()` delegates to the TS `QuickTradeModal`; the legacy
  modal markup remains only as an offline fallback. The TS modal's payload was wrong
  (`action/item/qty/price`) and is now the SimulationCore contract
  (`type/item_code/quantity/unit_price/counterparty`), routed through `dispatchDirectAction` when
  present. Client bundle rebuilt.

### Removed
- `public/js/grand-command-hub-ui.js` (2.3k lines, unloaded since 1.6.0). Legacy script count
  22 → 21; legacy inline styles 1,012 → 790; native confirms 9 → 8.
- Unused `ctx` fields in `economy.module.ts` and `utility-ai.module.ts`.

### Verification
`npm run verify` green: 22/22 suites, 28/28 contracts, 8/8 write smokes; arch guard now runs
**10 rules** (cashflow ratchet 18, legacy scripts 21). `tests/verify-logic-ownership.ts` adds the
ledger-definition check and seeded-travel replay (same encounter, same d20).

---

## [1.6.0] - 2026-10-29

Đợt 2 and 3 of `docs/LOGIC_DUPLICATION_AUDIT_2026-10-29.md`: one owner per data path
(caravan, business, world turn, ledger, hub) and the remaining client/server clock drift.

### Changed — ownership
- **Caravan has one state machine.** `CaravanLogisticsService.advanceByDays(days)` is the only
  progression implementation; the day clock (`advanceCampaignDays`) and month close both call it,
  and `/api/caravans/tick-progress` now spends one campaign day instead of moving caravans for free.
  Progress per day is derived from route distance (`ceil(distance / 120)` days). Player-dispatched
  caravans stop at `ARRIVED` and are claimed once; faction caravans settle once into the owner
  treasury. `claimCaravan` rejects `SUCCESS_TRADED` and any caravan the player did not dispatch.
  Migration `007-caravan-player-ownership` adds `dispatched_by_player` (15 existing `CRV-*` rows
  backfilled; 6 settled rows left terminal). The ecology module no longer touches caravans.
- **Business has one monthly settlement.** Workshop cycles and `advanceTurn`'s passive accrual share
  the `BIZ_CYCLE_<business>_<YYYYMM>` idempotency key, so whichever runs first in a month pays and
  the other is skipped. A workshop cycle no longer rewrites `player_state.safe_cash`, and
  business-internal revenue/expense no longer enter the player cashflow ledger.
- **World turn simulation is retry-safe.** New `world_turn_ledger(campaign_id, turn_number,
  module_id)` records completion *after* each module's transaction (the old in-memory flag was set
  before its writes). Each world module runs inside one transaction, and a module failure aborts the
  month close before the core batch commits instead of silently losing that module's work.
  `TURN_ADVANCED` is now published after commit; the dead `AUTUMN_HARVEST_CYCLE` and
  `LOD1_WEEKLY_TICK` publishers are gone.
- **One ledger balance definition.** New `src/shared/ledger.ts` defines
  `balance = liquid_cash + safe_cash`. `collectProfits` and the bandit-stronghold loot writer used
  the previous ledger row or liquid cash alone (double-counting or dropping the vault); both now
  use the shared helper.
- **Hub/Journal has one owner.** `personal-journal-ui.js` (4 tabs, matching the static markup and
  the journal test) owns `#grand-command-hub-modal`; `grand-command-hub-ui.js` is no longer loaded.

### Fixed — clock drift
- Removed the hardcoded `game_date: '184-05-02'` from the trade modal, reward action, tavern drink
  and world-map travel payloads; the server clock is authoritative.
- `POST /api/trade` ignores a client-supplied date and uses `campaign_meta.current_date`.
- `npc_relationship_deltas` uses the campaign date instead of a hardcoded one.
- `getActionDayCost` now prefers the `policy` returned by `/api/time/clock`; the local table is an
  offline fallback only.
- `GET /api/caravans/player` returns both camelCase and snake_case aliases — the legacy caravan
  panels read raw column names and were showing `undefined` for every row field.

### Verification
`npm run verify` green: 22/22 suites, 28/28 contracts, 8/8 write smokes. `npm run audit`: 1,358
invariants, 0 discrepancies. `tests/verify-logic-ownership.ts` now also covers business-month
idempotency, the ledger balance identity, world-turn markers with failure-abort, and the caravan
claim rules. HTTP end-to-end: dispatch → 2 clock days → `ARRIVED` → claim 105 Qian once → repeat
claim and faction-caravan claim rejected.

---

## [1.5.9] - 2026-10-29

Đợt 1 of `docs/LOGIC_DUPLICATION_AUDIT_2026-10-29.md`: ownership collisions and the
day-clock chokepoint. Everything below was reproduced or measured at HEAD before the fix.

### Fixed
- **POI modals opened with an empty body.** The bundled TS `SpatialPoiModalsManager` ran
  `new …()` during import and `ModalShell.mountDom()` replaced the whole `innerHTML` of
  `#spatial-tavern-modal`, deleting the legacy `#tavern-modal-body`; the legacy renderer then
  returned early and showed header + tabs only. The manager is now lazily created (it is no
  longer in the shipped bundle at all), `ModalShell` refuses to mount legacy-owned ids
  (`LEGACY_OWNED_MODAL_IDS`), and each legacy `ensure*ModalDom()` rebuilds its own markup when
  its body id is missing. Verified with a DOM reproduction: tavern body 2,215 chars, arena
  2,742, residence 1,485.
- **Fractional campaign dates and double grain on a march.** `completeMarch()` now advances the
  clock itself by whole days and charges the route provision cost once; the client no longer
  calls `/api/time/spend` afterwards. `advanceCampaignDays` normalizes days with `ceil`, so
  `marchDays: 1.4` writes `+2` days instead of `184-05-2.5`, and `planTravel` rounds the archived
  estimate once so the plan matches the charge. Later assertions in the same path read
  `184-05-2.5`-safe regex, and the auditor now rejects non-integer dates.
- **Daily ticks never fired for real actions.** `time-manager` is now the single writer of
  `campaign_meta.current_date` and publishes one `WORLD_DAY_TICK` per elapsed day, after the
  date write. `GameplayManager.advanceDays()` delegates to the same helper, deleting its
  duplicate month math.
- **Double stamina deduction.** `KIZUNA_INTERACT`, `WORK_SHIFT` and `PRODUCTION_BATCH` declared
  fatigue in `action-policy` while their feature services already deducted it. The policy entry
  is now the only owner for actions without a feature-level stamina effect; those three are 0.
- **Equipment could create or destroy stock.** Both equip paths now go through
  `consumeInventoryItem`/`restoreInventoryItem` in `src/shared/inventory-movement.ts`, so every
  quantity change writes a matching `stock_movements` row (the forge path already did; the
  equipment-system path now does too).

### Added
- **`tests/verify-logic-ownership.ts`**: modal ownership, whole-day march with a single grain
  charge, one tick per day, inventory conservation, and chronicle de-duplication.
- **Migration `006-dedupe-chat-chronicle`**: collapses identical chronicle rows (live session
  39 → 15) and installs a `BEFORE INSERT` trigger that skips an exact repeat.
- **Auditor clock checks**: `current_date` must match whole-day `YYYY-MM-DD` with month 1–12 /
  day 1–30, and `active_turn` must track `turn_log`.

### Changed
- **Player header**: removed the developer telemetry badges (`AI Bridge: LIVE`,
  `Universe TS: n Modules`, `100% Khớp`); integrity status stays in the diagnostics panel.
- **Header date**: one formatter (`formatGameDateChip`) prints
  `Ngày 3 Tháng 1 Năm 185 SCN • Ngày 3/30` instead of the raw ISO string plus a second clock.

### Verification
`npm run verify` green: 22/22 suites, 28/28 contracts, 8/8 write smokes. `npm run audit`:
1,358 invariants, 0 discrepancies. HTTP end-to-end on a sandbox DB: march `1.4` days →
`185-01-03 → 185-01-05`, grain `9.56 → 7.56` (charged once), 2 ticks; `/api/audit` reports the
same 1,358 as the CLI.

---

## [1.5.8] - 2026-10-29

In-game Time panel, real-world comparison, and clock consistency fixes.

### Added
- **Time panel** from the header (`Thời Gian`): game date, day X/30, turn, season, day progress, fatigue/grain/health/morale, active tasks, action time budget, recent time log and a live real-world clock.
- **`GET /api/time/clock`** now returns the full clock snapshot, active tasks, recent actions for the current game month, action policy and server real time/timezone.
- **`tests/verify-action-economy.ts`** covers day advance, day-30 block and multi-day task progress/reward.

### Fixed
- **Stale ledger dates**: `SimulationCore` now overrides client `game_date` with `campaign_meta.current_date`, so new ledger/action-log rows match the campaign clock instead of old modal constants like `184-05-02`.
- **Checkpoint/date read**: `time-manager` quotes `"current_date"` so SQLite returns the stored game date instead of `CURRENT_DATE`.
- **Passive daily recovery**: 1 fatigue recovered per advanced day, applied in the same clock transaction as action fatigue and grain upkeep.

### Verification
`npm run verify` green: 21/21 suites, 28/28 API contracts, 8/8 write smoke. Browser: Time panel shows `185-01-03 • Ngày 3/30 • Lượt 14 • Mùa Xuân`, real clock UTC+7, 7 action-cost rows and the recent timeline.

---

## [1.5.7] - 2026-10-29

Day-based action economy, multi-day tasks, and daily upkeep.

### Added
- **`engine/action-policy.js` + `engine/time-manager.js`**: one cost table for actions, day-clamped clock, fatigue/grain spend, and a hard `MONTH_END` guard at day 30. Actions never roll the month; only **Qua Tháng** does.
- **`SimulationCore` time gateway**: every successful action now advances the clock by its policy cost (1 day for trade/production/training/travel, 0 for bookkeeping), and returns a `time` payload with `prevDate`, `nextDate`, fatigue and grain.
- **Multi-day tasks**: `active_tasks` table, `engine/task-manager.js`, `GET /api/tasks`, `POST /api/tasks/start`, `POST /api/tasks/cancel`. Tasks progress when the clock moves, continue across month closure, and grant skill EXP once on completion.
- **UI**: header now reads `date • Ngày X/30 • Lượt N`; action cards carry a `1 ngày` chip; an active-task strip shows `elapsed/duration`, a progress bar and a cancel button; the month report has a multi-day task card.
- **New action**: “Bế quan khổ luyện thương pháp 7 ngày” in the Peach Garden, rewarding +70 Spear EXP.

### Changed
- **Direct player actions now spend days too**: social Kizuna, work shifts, long marches (route `marchDays`), caravan dispatch, specialist/hero recruitment, banquets, blood brotherhood and arena challenges. Internal tick/claim/status endpoints stay free.
- **Daily upkeep**: 0.02 thạch/day consumed by the clock; missing grain adds fatigue.
- **Month close**: progresses active tasks through the days remaining in the month before running the monthly simulation.

### Verification
`npm run verify` green with **21/21 suites** (new `tests/verify-action-economy.ts`), 28/28 contracts, 8/8 write smoke. Browser: header day chip, five action cards with day chips, starting a 7-day task advanced the date to 185-01-02 and the strip showed `1/7`; a second action advanced to `2/7`; cancel removed the strip.

---

## [1.5.6] - 2026-10-29

Turn UI consolidation, month report repair, and action-economy analysis.

### Fixed
- **Duplicate month button**: removed the header `#btn-advance-turn`; the command dock `#btn-turn-dock` is now the single entry, labelled “Qua Tháng”.
- **Empty month report**: `apiAdvanceTurn()` returned the `{ success, result }` envelope while the modal read `nextTurn`, `bizReports` directly. It now unwraps `data.result`.
- **Wrong report fields**: political events use `titleVi`/`narrativeVi`, NPC logs use `titleVi`/`narrativeVi`, and ecology returns `events`/`processedCaravans`; the report now maps those instead of printing empty strings.
- **Modal shell layout**: added the missing `.modal-dialog.modal-md`, shell title/subtitle and body/footer primitives. The month modal now has a bounded 860px dialog and scrollable body instead of an unstyled shell.

### Added
- **Monthly digest**: 6 KPI tiles plus 7 detail blocks — personal status/cash flow, enterprise ledger, player actions, hero activity, court politics, ecology/caravans, and active crises.
- **Backend report fields**: `playerStatus`, `playerLocationName`, `financeSummary`, `recentActions`, `caravanStatus`, `activeCrises`, `ecologyEvents` and `worldDigest`.
- **`docs/ACTION_ECONOMY_ANALYSIS_2026-10-29.md`**: verified current-state audit and the proposed day-based action economy (1 action = 1 day, multi-day tasks, month close only via “Qua Tháng”).

### Verification
`npm run verify` green after the report changes; browser check: one “Qua Tháng” button, 860px modal, symbols rendered via `uiIcon`, report shows 6 KPIs / 7 cards with real NPC and political text.

---

## [1.5.5] - 2026-10-29

Functional icons replace Hanzi glyphs; decorative seals stay.

### Added
- **Shared SVG sprite + `uiIcon()` helper** (`public/index.html`, `public/js/config.js`): 34 line icons on a 24×24 grid using `currentColor`, sized at `1em` so the same icon works in a 10px badge, an 11px path dot, an 18px avatar or a 34px empty state.
- **`docs/UI_ICON_AUDIT_2026-10-29.md`**: full inventory of the 452 remaining Hanzi occurrences, classified into decorative seals, data seals and functional icons still to migrate (P1 modal surfaces, P2 chat avatars).

### Changed
- **Character card**: avatar, inspect button, career-stage badge and all five path indicators now use `person`, `eye`, `sprout`/`house`/`castle`/`crown`, `hammer`/`coin`/`sword`/`scroll`/`users`.
- **Header and command dock**: turn (hourglass), inner-town picker (route), hero avatar (person), Residence (house), Wage Labor (hammer), Journal (book), Courier (mail), Turn Advance (hourglass), courier drawer (mail).
- **Grand Command Hub / Personal Journal**: tab seals, four life stages, six shift types, five career branches, family sub-nav, equipment slots, locks and the domain filter now use icons.
- **Map**: view modes (map/sword/grain/layers), living-layer toggles (cart/soldier/mask/alert), token glyphs, seven resource types (sprout/fish/leaf/pickaxe/tree/paw/salt), resource filters/zones/legend and intel actions (person/shield/flame/cart/route/sword/grain/users/scroll/flag). Map badges now read “Binh / Thủ / Lương” instead of 武/盾/糧.
- **Local POI picker and spatial action dock** use type-based icons instead of Hanzi seals.
- **Kept intentionally**: the 20 citadel seals, modal title seals, chat speaker initials and historical lore glyphs — all are decorative and always paired with readable text.

### Fixed
- `.world-map-canvas-container svg { width:100%; height:100% }` also stretched the new inline icons inside resource filters and legends to full-map size. The sizing rule now targets `#world-map-svg` only.

### Verification
`npm run verify` green (typecheck, arch guard, 20/20 suites, 28 contracts, 8/8 write smoke, UI/slop/route gates). Browser: avatar 18px, inspect 11px, stage 10px, five 11px path icons; map contains 4 view-mode, 4 layer, 7 filter, 23 zone and 5 token icon references; Grand Hub renders 4 icon tabs with no console errors.

---

## [1.5.4] - 2026-10-29

Farming / fishing / hunting resource families and the resource-distribution map layer.

### Added
- **16 new gathering nodes** across FARM (4), FISH (8), GAME (2), MINERAL (1), HERB (1): East Gate rice fields, Pingyuan farmland, Yingchuan tuntian, Dujiangyan rice, Bohai/Yishui/Huai/Yushui/Yangtze/Taihu/Baqiu/Panyu fisheries, White Horse and Qinling hunting grounds, Taihang iron, Lingnan agarwood. New items `COM-FISH-FRESH`, `COM-GAME-MEAT`, `RAW-HIDE`.
- **`PROF_FARMER`, `PROF_FISHER`, `PROF_HUNTER`** are mapped from FARM/FISH/GAME and auto-unlock on first harvest, matching the existing miner/herbalist/carpenter/salt-maker flow.
- **Resource mode on the map**: a fourth view mode draws colour-coded resource zones around each citadel (農/漁/藥/礦/木/獵/鹽), with a seven-type filter bar, site counts, node dimming for non-matching settlements, and subdued routes. The generic legend is hidden in this mode because the filter bar is the legend.
- **Spatial grounding for gathering**: `gatherResource()` now resolves `player_state.current_location` to a settlement via `master_locations` (with Trác Huyện aliases) and rejects remote nodes with a clear Vietnamese error. The Game Manager gathering list filters to the current settlement.
- **Skill expansion analysis** in `docs/PROFESSION_RESOURCE_WILDERNESS_ANALYSIS_2026-10-29.md`: 12 proposed livelihood skills, three new domains (AGRICULTURE/FISHING/SURVIVAL), yield/fatigue formulas, learning paths and phased acceptance criteria.

### Verification
`npm run verify` green (typecheck, arch guard, 20/20 suites, 28 contracts, 8/8 write smoke, UI/slop/route gates). Browser: 23 resource nodes / 7 types; resource mode 23 zones; FARM filter 4 zones + 16 dimmed nodes; FISH 8 + 12 dimmed; remote gather rejected with “Bạn đang ở Trác Huyện, không thể khai thác Ruộng Lúa Đô Giang Yển tại Thành Đô…” while local Trác nodes remain available.

---

## [1.5.3] - 2026-10-29

Action gates, live route merge, and the living map layer.

### Added
- **A6 — real action requirements.** `GET /api/caravans/guard-tiers` exposes the actual militia/veteran/elite costs; `/api/status`, `/api/inventory` and `/api/workforce/specialists` feed the map. "Lập thương đoàn" is disabled unless cash covers the cheapest guard tier and the warehouse has cargo; "Chiêu Mộ" is disabled when the specialist is already hired or cash is below the signing bonus, with the exact reason in the tooltip.
- **A7 — live routes.** `GET /api/locations` exposes `master_locations`; the live service maps `LOC-0001…` to map node ids and merges all 41 `/api/military/routes` entries by endpoint. Route tooltips, the selected-route card and connected-route rows now use the server's distance/march days/grain/risk/description instead of the static blueprint.
- **B — living layer tokens.** Caravans (`EN_ROUTE`, interpolated along the curved route by `routeProgress`), marching expeditions, active bandit lairs and active crises render as counter-scaled 貨/兵/賊/災 tokens. A bottom-right layer toolbar toggles each layer with live counts.
- **Token actions.** Caravan → opens the caravan ledger; army → focuses the destination citadel; bandit/crisis → selects the citadel and reports name, power/bounty or severity.
- **Resident specialist roster.** The Workforce accordion no longer uses the static `hireableNpcs` names. `/api/workforce/specialists` + `/api/workforce/businesses` resolve each specialist's effective location (baseline, or the assigned business location when hired) and filter by the selected citadel. Unhired candidates sort first; hired ones show "Đang phục vụ"; settlements with no residents show "Không có nhân tài đang lưu trú tại thành này." instead of invented names.
- **Legacy caravan UI restored.** The TS caravan shell was overriding the complete legacy `caravan-ui.js` (which owns real guard tiers, inventory projection and cost preview). The bridge no longer replaces it; the map's "Lập thương đoàn" and caravan tokens open the working legacy surface.

### Changed
- The map now loads 15 live endpoints on open; partial failures are reported in the LIVE chip tooltip.
- `verify-map-live-contracts.ts` now also checks every `gathering_nodes` settlement and every `master_routes` LOC endpoint.

### Verification
`npm run verify` green (typecheck, arch guard, 20/20 suites, 28 contracts, 8/8 write smoke, UI/slop/route gates). Browser: caravan gate 6,586 cash / 13 cargo kinds / 100 minimum guard; recruit gate shows "Cần 300/200 tiền" at 10 cash; live route `Trác Huyện → Kế Thành` renders 180 dặm / 1.2 ngày / 0.8 thạch; 5 bandit tokens toggle 5 → 0 → 5; fake 55% caravan and 1,200-troop army tokens render and respond; caravan modal opens with `ji_cheng` preselected; no console errors.

---

## [1.5.2] - 2026-10-29

Live map binding, compact intel panel, and travel-modal repair.

### Fixed
- **Travel / "Hành quân" opened an empty dialog.** `travel-transit-modal` is owned by `ModalShell` since the client migration, so the legacy `#travel-transit-content` no longer existed. The multi-stage renderer is now mounted inside `#travel-transit-modal-body`; open/close route through `TravelTransitUI.openLegacy/closeLegacy`, and the shell owns Escape/backdrop state.
- **Turn advance ("Qua Lượt") had the same empty-dialog bug.** `#turn-advance-content` is now mounted inside `#turn-advance-modal-body`, with `TurnAdvanceUI.openLegacy/closeLegacy`; the confirm and monthly report render again.
- Travel modal titles use the canonical short settlement names (`Trác Huyện → Kế Thành`) instead of the long blueprint names.

### Added
- **`map-live.service.ts`** (TypeScript, bundled): resolves the 23 database settlements onto the 20 map nodes (`wu_wei → xi_liang`, `he_fei → shou_chun`, `pu_yang → ye_cheng`, `wu_ling → jiang_ling`) and merges `/api/garrisons`, `/api/factions/settlements`, `/api/factions`, `/api/military/status`, `/api/logistics/strongholds` and `/api/ecology/crises`.
- **Live intel data**: garrison, defense, public order, grain, treasury, ruling faction, governor and faction color now come from the campaign state; a `LIVE` / `BLUEPRINT` / `LỖI DỮ LIỆU` chip makes the source explicit.
- **Live status & threat**: status is derived from ownership, public order, grain and garrison (An Định / Suy Yếu / Ngoại Bang); threat aggregates nearby bandit lairs, active crises, thin garrisons and low public order, with the reasons in the metric tooltip.
- **Refresh control**: the LIVE chip is a button that reloads the live state; `sim:turn-advanced` refreshes the cache automatically after a simulated month, and partial endpoint failures are shown in the chip tooltip.
- **`verify-map-live-contracts.ts`**: fails the build if any caravan, expedition, bandit lair, active crisis or settlement cannot resolve to a rendered map node.
- **NPC dossier links in the Workforce accordion**: `/api/npcs` is indexed by name in the live service; a hireable specialist with a real NPC record renders as a keyboard-focusable name button that opens the existing NPC dossier with stats. Generic settlement personas that have no spawned NPC show a tooltip that the dossier unlocks when the NPC appears; the spawn algorithm is intentionally deferred.
- **Progressive-disclosure intel panel**: header, travel metrics, primary actions and connected routes stay visible; Military, Economy, Workforce and Lore are collapsed `<details>` sections.
- **Capability gate for military orders**: "Điều Binh Đồn Trú" (reinforce/recruit) appears only for settlements you control, preserving the early recruitment path; "Công Thành" (siege) requires a field army and a foreign settlement. Enemy citadels show no military buttons when you have no army, with an explicit hint instead of unusable actions.

### Changed
- Military/economy map badges use live troop and grain values (e.g. Nghiệp Thành now shows 285 troops instead of the 9,000 blueprint).
- Node stroke and influence wash prefer the live faction color; the static theme remains the fallback.
- Adding the live service as a 24th legacy script would have broken the architecture ratchet, so it lives in the TypeScript feature slice instead.

### Verification
`npm run verify` green (typecheck, arch guard, 20/20 suites including the new live-contract gate, 28 contracts, 8/8 write smoke, UI/slop/route gates). Browser: LIVE chip on all 20 nodes, Trác Huyện 1,875 troops / 639 grain / 15,000 cash, Nghiệp Thành 285 troops / threat Cao (2 lairs + thin garrison), travel dialog renders 2.5KB of route content, turn-advance dialog renders 2KB, no console errors.

---

## [1.5.1] - 2026-10-29

Citadel titles and seals standardized; the map surface is fully bilingual.

### Changed
- **Canonical `SETTLEMENT_LABELS` in `map-data.js`**: one Vietnamese name, one English name and one Traditional Chinese seal per settlement. `getShortNodeName()` now reads this table instead of stripping parentheses, `&` and status prefixes, so map labels, intel titles, route cards, connected-route rows and tooltips all use the same `Tên • Châu` format.
- **Seals are Traditional Chinese and unique**: Quảng Tông 廣 (was 宗), Hứa Xương 許 (was 昌), Thọ Xuân 壽 (was 春), Vũ Uy 威 (was 涼). The old 涼 appeared on both the Wuwei and Xiliang alias.
- **Historical long names moved out of titles** (e.g. "Kinh Đô Lạc Dương (Kinh Sư)"); hover titles now use the same `Tên • Châu` structure as the intel header, and the lore text keeps the historical detail.
- **Full bilingual data**: `descEn` for all 24 routes; `primaryCommodityEn` / `exportGoodEn` / `importNeedEn` for all 20 settlements; `rulerNameEn` / `governorEn` for all 20 factions; `MAP_ROLE_EN` for 44 hireable-specialist occupations. English mode no longer falls back to Vietnamese for routes, economy, the faction banner or NPC roles.
- Intel header, selected-route card and connected-route rows now show the citadel seal, matching the map marker.

### Verification
`npm run verify` green (19/19 suites, 28 contracts, 8/8 write smoke). Browser check at 1920×1000: 20/20 unique seals, no node missing label/seal/hover text, VI↔EN titles share the same structure (`Trác Huyện • U Châu` / `Zhuo County • Youzhou`), no console errors.

---

## [1.5.0] - 2026-10-29

Strategic map overhaul — semantic zoom, route decisions, and navigation.

### Added
- **Semantic zoom (world / region / local).** At 65–85% only the nine province names plus capitals, current and selected citadels are labelled; 85–160% shows all twenty names with collision declutter; above 160% adds province subtitles and live military/economy badges.
- **Route objects.** Every route now has a 14px hit area with a hover tooltip (`distanceLi`, `marchDays`, `grainCost`, `ambushRisk`, `descVi`), click-to-select, an animated flow overlay for the chosen route, and a "Tuyến đang chọn" card in the intel panel with march and caravan actions.
- **Connected-routes list** in the intel panel: every route touching the selected citadel with its distance, march time, grain cost and risk colour.
- **Minimap** with a live viewport rectangle and click-to-jump, plus **Fit** and **Focus** controls next to the zoom buttons.
- **Mode-aware legend** and encoding: military routes colour by ambush risk, economy routes thicken by grain cost, overview keeps the terrain palette.
- **Capital hierarchy and influence wash.** Capitals use larger markers with a ring; major centres get a layered flat influence wash (no blur filter, no gradients).
- **Keyboard access.** All twenty citadels are focusable, Enter/Space selects, focus is restored after the re-render, and labels carry a dark halo for contrast.

### Changed
- **Markers and labels keep a constant screen size** (28px diameter, 15px label height at every zoom) and routes use `vector-effect="non-scaling-stroke"`; zoom now changes distance and visible area instead of inflating symbols.
- **Zoom is anchored at the cursor** (0px drift measured), pan is clamped to the populated citadel bounds, and the 65–300% range is usable at every tier.
- Opening the map now selects and fits the player's current settlement instead of jumping to the front line.
- Routes curve slightly; water routes bend toward the river bands instead of cutting straight across land.
- Node icon glyphs are now light (`#f1f5f9`); they previously rendered black on dark fills and were effectively invisible.

### Verification
`npm run verify` green (typecheck, arch guard, 19/19 suites, 28 contracts, 8/8 write smoke, UI/slop/route gates). Browser checks at 1600×900 and 1280×720: 20 nodes / 24 routes, 28px markers and 2.2px route strokes at 75–300%, 7/19/20 visible labels per tier, 0px cursor-zoom drift, tooltip and route card populated, VI↔EN toggle re-renders the map and legend.

---

## [1.4.14] - 2026-10-29

Location banner decluttered; world map restored after the ModalShell migration.

### Fixed
- **Dư Đồ Tam Quốc opened as an empty dialog.** The standardized `ModalShell` for `world-map-modal` replaced the static mount points on boot, so `openWorldMap()` rendered into a missing `#world-map-canvas-container`. `mountWorldMapLegacyView()` now re-creates the canvas and intel panel inside `#world-map-modal-body` before rendering; the shell owns open/close (stack, Escape, backdrop) and the legacy renderer draws into it.
- **World map dialog was 15% narrower than before** (900px shell vs 1060px legacy). Added `.world-map-dialog` so the strategic map keeps a 96vw / 1120px footprint.
- **Map title/subtitle did not follow the language toggle** because `i18n.js` still targeted the pre-shell ids. It now updates `#world-map-modal-title` / `#world-map-modal-subtitle` with a legacy fallback.

### Changed
- **Local walking destinations no longer render as an inline chip row.** `renderLocalPoiNav()` populates a single "行 Nội Thành (n) ▾" trigger plus a popover menu (`public/js/map-data.js`); each item keeps its Hanzi seal, full name and walking distance. The banner drops from two rows (~72px) to one row (36px) at 1280–1920 without horizontal overflow.
- **Alias destinations are de-duplicated** by display name, so `Chợ Đông Môn & Sạp Trà` and `Chợ Đông Môn` no longer appear as two identical entries (8 → 7 items).
- **Picker interaction**: closes on outside click, `Escape`, and destination choice; exposes `aria-haspopup` / `aria-expanded` / `aria-controls`, `role="menu"`, and focuses the first item on open.

### Added
- **`docs/UX_UI_REVIEW_2026-10-29.md`** — game/UX-UI design review with measured layout data and a P0–P3 backlog (duplicate chronicle rows, mismatched in-game dates, developer telemetry in the header, dock/chat height imbalance).

### Verification
`npm run verify` green (typecheck, arch guard, 19/19 suites, 28 contracts, 8/8 write smoke, UI/slop/route gates). Browser check at 1920/1440/1366/1280: banner 36px, menu inside viewport, 7 unique destinations.

---

## [1.4.13] - 2026-10-29

Full UI audit — client/server contract and modal ownership.

### Fixed
- **Unknown `/api/*` returned `index.html` with HTTP 200**, so every client failure surfaced as "Unexpected token '<'" and routing mistakes were hidden. Unknown API paths now return a JSON `404 { code: "NOT_FOUND" }`.
- **Equipment modal was empty**: the client called `/api/equipment/overview` (no such route) and posted bespoke forges to `/api/equipment/forge/bespoke`; both now use the real `/api/equipment` and `/api/professions/forge/bespoke`.
- **Caravan**: arbitrage now reads `/api/economy/arbitrage`; dispatch maps its payload onto `/api/caravans/dispatch`.
- **Lineage actions**: paths and payloads aligned (`courtship/propose` with `spouseNpcId`, `household/rest` with `marriageId`, `household/set-role`, `children/assign-mentor` with `mentorNpcId`, `children/designate-heir`, `succession/execute` with `heirChildId`). Removed the unused `heirs` and `succession-preview` calls.
- **Grand Command Hub tabs did nothing**: the TS shell mounted over the static legacy modal and rendered the overview for every tab. Removed the TS hub export and bridge override; the legacy journal/hub owns the modal again and all four tabs render distinct content.
- **Personal Journal**: the bridge proxy lacked `switchTab` and closed the wrong modal, producing `PersonalJournalUI.switchTab is not a function`. Restored legacy ownership.
- **Tavern / Arena / Residence**: the TS spatial-POI slice called endpoints that do not exist (`/api/arena/*`, `/api/banquet/drink`, `/api/character/rest`). Restored the legacy modals, which use existing duel/banquet/lineage APIs.

### Added
- **`npm run lint:api`** (`tools/client-api-contract.js` + `tools/client-api-allowlist.json`): compares the 31 paths the TS client calls against 179 router/gateway routes; unaccounted gaps fail the build, and known gaps carry a reason.

### Audit result
12 modal surfaces opened and closed cleanly with no JS errors, no native-default buttons and no horizontal overflow. Remaining allowlisted gaps: arena roster/duel, banquet drink, character rest, enterprise safe-cash transfer, aggregated NPC dossier, career-paths, and the TS new-game path.

---

## [1.4.12] - 2026-10-29

Anti-AI-Slop compliance pass (AS-01…AS-12).

### Changed
- **AS-05 — emoji purged from UI and payload sources.** 239 occurrences across `public/`, `src/`, and `engine/` were replaced with authentic Hanzi seals (武, 府, 工, 志, 信, 時, 卷, 錢, 糧, …) or typographic symbols (`×`, `→`, `◆`). Emoji count in the shipped UI is **0**.
- **AS-06 — gradients removed.** All 43 `linear-gradient` declarations were replaced with flat token fills; accents that carried meaning (turn action, choice execution, hero pill, progress fills) were restored as flat colours.
- **AS-02 — elevation only.** 48 coloured glow shadows were replaced with `--elevation-1`; the serif brand family was folded into the Inter stack, leaving **two families** (Inter + JetBrains Mono). Main-screen weights are limited to 400/600 and key text to the 11/12.5/13.5/14 scale.
- **AS-04 — radius tokens.** Buttons and inputs use `--radius-md`, chips/badges `--radius-sm`, cards `--radius-lg` (previously 3px buttons and pill badges).
- **AS-09 — focus.** A global `:focus-visible` ring now covers every button, link and input.
- **AS-01 — colour restraint.** Pillar/impact chips keep their semantic text colour on a neutral fill instead of four coloured blocks.
- **AS-11 — verb-first Vietnamese labels.** "Menu Chính" → "Hành Dinh", "Logs" → "Nhật Ký", "Phiên Chơi" → "Đổi Phiên"; header controls stay on one line.

### Added
- **`npm run lint:slop`** (`tools/anti-slop-lint.js` + `tools/anti-slop-baseline.json`), part of `npm run verify`: hard-fails on any emoji, gradient, coloured shadow, or more than two font families; the font-size scale is ratcheted (currently 24 declarations globally, main screen limited to four roles).

### Verification
`npm run verify` green (19/19 suites, 28 contracts, 8/8 smoke, UI + slop + route gates). Browser check: dashboard shows Hanzi seals, flat amber primary, 12px cards, 6px badges, no emoji.

---

## [1.4.11] - 2026-10-29

TypeScript modal styling repair.

### Fixed
- **The TS feature modals were authored with Tailwind-style utilities, but the project has no Tailwind build.** Roughly 176 distinct classes (`flex`, `grid grid-cols-*`, `gap-*`, `p-*`, `mb-*`, `text-xs/sm`, `bg-slate-900`, `border-amber-*`, `h-2`, `line-clamp-2`, …) were no-ops, so the personal journal rendered tabs as white browser buttons, progress bars had zero height, cards had no surfaces, and the lineage candidates stacked instead of forming a grid.
- **`.modal-tab-btn` / `.modal-tab-bar` had no styles at all**, so every shell modal showed default white tab buttons.

### Added
- A zero-dependency utility compatibility layer in `public/styles.css`, mapped onto the existing `:root` tokens (layout, spacing, typography scale, slate/amber surfaces, borders, progress height, line clamp).
- Tab bar styling with a dark surface, amber active underline and badge counter.

### Changed
- Personal journal now shows real progress bars, two-column path cards and perk rows; lineage shows a three-column candidate grid with badges and full-width dowry actions; the other TS modals (enterprise, equipment, spatial POI, caravan, tactical battle, transit, title) inherit the same utilities.

### Verification
`npm run verify` green (19/19 suites, 28 contracts, 8/8 smoke, UI ratchet clean); browser screenshots of the journal and lineage modals confirm the intended layouts.

---

## [1.4.10] - 2026-10-29

Main screen visual hierarchy and a UI review pass.

### Fixed
- **Missing generic `.hidden` rule.** Only modal/toast-specific rules existed, so the historical-event placeholder ("Đang quét sự kiện lịch sử...") stayed visible with no active event and consumed ~100 px. Added `.hidden { display: none !important }`; modals, tabs and toasts were re-verified to still open.
- **Header content overflowed its own bar**: a 52 px header held 70 px / 58 px children, forcing the brand and date chip into three lines.

### Changed
- Header: 68 px, single-line brand with full text in `title`, date/turn pill on one line, resource metrics with small uppercase labels, compact AI/audit badges. The duplicated header turn button is hidden at ≤1400 px where the dock already exposes the primary action.
- Typography: base 13.5 px, story text 14 px/1.62, choice titles 13.5 px, notes 12 px, and `--text-muted` lightened for contrast.
- Cards: larger padding/radius, clearer section headers, calmer story bubbles.
- Command dock: secondary actions share one neutral surface; the turn action is the single amber primary. Duplicate location pill removed and labels shortened ("Phi Thư", "Quân Cơ", "Qua Lượt") so the bar is one row.
- Layout: the chronicle keeps at least 160 px, choices scroll inside a dock capped at 48 vh, and location chips wrap instead of clipping.
- Responsive: ≤1180 px stacks the deck under the chronicle and lets the header wrap.

### Measured
| Metric | Before | After |
| :--- | ---: | ---: |
| Header child height vs bar | 70 px vs 52 px | fits 68 px |
| Story chronicle height | 19 px | **187 px** |
| Command bar | 94 px / 2 rows | **52 px / 1 row** |
| Story text / choice title | 13 / 11.5 px | **14 / 13.5 px** |

### Verification
`npm run verify` green; browser screenshots at 1280×720 confirm the hierarchy, and the lineage modal still opens after the `.hidden` change.

---

## [1.4.9] - 2026-10-29

Legacy UI migration to the shared primitives.

### Changed
- **190 `tactical-btn` usages** across `public/index.html` and eight legacy scripts migrated to `ui-btn` variants (`--primary`, `--success`, `--danger`, `--accent`, `--sm`, `--xs`, `--disabled`). The dead `.tactical-btn*` CSS block was removed.
- **13 `modal-close-btn` buttons** replaced with `ui-btn ui-btn--ghost ui-btn--icon`; the dead rule was removed.
- **48 button usages in TypeScript feature modals** (lineage, spatial POI, enterprise, equipment, caravan, tactical battle, transit, trade, title) migrated from `btn btn-xs btn-*` to `ui-btn`. Those classes had no CSS, which is why several buttons rendered as unstyled white boxes. `w-full` / `flex-1` (also undefined) became `ui-btn--block` / `ui-btn--grow`.
- `ModalShell` close button now uses the shared icon button, so every modal has the same close affordance.

### Fixed
- **Lineage modal crashed on open**: the client type expected `CourtshipCandidate.dowryCash` while the server DTO sends `recommendedDowryCash`, so `undefined.toLocaleString()` threw. Client type and renderer now use the server field.

### Metrics (`npm run lint:ui`)
| Metric | Before | After |
| :--- | ---: | ---: |
| Legacy button classes defined in CSS | 47 | **42** |
| Legacy button class usages (public) | 179 | **94** |
| Legacy button classes in TS client | 48 | **0** |
| Shared primitive usages | 18 | **400** |

### Verification
`npm run verify` green; browser check of the lineage modal shows consistent filter/action buttons and a full-width accent action.

---

## [1.4.8] - 2026-10-29

Instance-selection gate is now the default entry point.

### Changed
- **Every load of the game address opens the instance chooser.** `title-screen-ui.js` now always opens the title screen on boot (`ALWAYS_SHOW_INSTANCE_GATE = true`), with the close button hidden so an instance must be chosen. The previously saved `current_instance_id` is still used to highlight the last-played instance and to preselect it when selecting.
- The gate lists the saved playthrough(s) with "Tiếp Tục" / "Sao Lưu" plus the new-campaign panel ("Khởi Lập Phiên Mới & Vào Bản Đồ").

### Verification
Browser: reload → chooser visible, close hidden; "Tiếp Tục" closes the gate and the dashboard shows `184-11-08 (Lượt 12)`; reload again → chooser returns. `npm run verify` green.

---

## [1.4.7] - 2026-10-29

Shared UI primitives and consistency ratchet.

### Added
- **`src/client/core/ui/`**: one contract for common controls — `buttonHTML` / `createButton` (primary, secondary, accent, ghost, danger; sm/md/lg; icon), `badgeHTML` / `createBadge` (success, warn, danger, info, neutral), `toast`, and a promise-based `confirmDialog` built on the standard modal shell.
- **Legacy bridge exposes `window.UI`**, so `public/js` scripts render the same components as TS slices.
- **Primitive styles** (`.ui-btn`, `.ui-badge`, `.ui-toolbar`, `.ui-confirm`) built on the existing `:root` tokens rather than new colours.
- **`npm run lint:ui`** (`tools/ui-consistency-report.js` + `tools/ui-baseline.json`): ratchets legacy UI debt. Baseline: 47 legacy button classes, 179 legacy class usages, 1,018 inline `style="` attributes, 9 native confirms — all may only shrink; shared primitive usage is reported to grow.

### Changed
- Header buttons ("Hành Dinh", "Đổi Phiên Chơi") use shared buttons; the ad-hoc inline orange style is gone.
- Title-screen launch/continue/clone buttons and the delete confirmation use shared primitives.
- `ModalShell` footer actions render `.ui-btn` variants instead of the old `btn btn-primary` family.

### Decision
- **Ant Design was evaluated and not adopted.** The client is vanilla TypeScript + Vite with ~20k lines of legacy DOM scripts and no React; antd would add a React runtime plus roughly 1 MB of bundle and require rewriting every screen to use it. Recorded as ADR-006 in `DECISIONS.md`; the shared layer uses the project's own tokens and can be migrated to antd later if the client moves to React.

### Verification
`npm run verify` green (19/19 suites, 28 contracts, 8/8 smoke, 23/23 client scripts, UI ratchet clean). Browser check: header, title screen and confirm dialog render the shared styles.

---

## [1.4.6] - 2026-10-29

Audit latency and performance-gate calibration.

### Changed
- **`tools/sim-audit.js` uses the in-process SQLite adapter** instead of spawning the `sqlite3` CLI per query. `GET /api/audit` (which runs all eight sections in-process) dropped from **1.1–2.7 s to ~6 ms** on the same data; the total CLI audit went from ~1,150 ms to ~16 ms.
- **`perf:compare` thresholds recalibrated** for desktop noise: default 12 iterations, 3 warm-up, 50% p95 tolerance and an 8 ms absolute floor (was 8/2/30%/2 ms). Sub-10 ms endpoints were jittering by 100%+ between adjacent runs while heavy-endpoint regressions are still caught.

### Verification
`npm run verify` green; audit 1,356 / 0; `perf:compare` 11 endpoints, logic unchanged.

---

## [1.4.5] - 2026-10-29

Client boot repair (title-screen regression).

### Fixed
- **`public/app.js` had a duplicate `const isEn`** inside `loadStatus` (lines 231 and 389), a SyntaxError that prevented the entire classic script from executing. The page rendered static HTML only, `window.loadAllData` was undefined, the date chip stayed at its placeholder, and no game data loaded. Removed the duplicate declaration.
- **Two title screens collided.** The TypeScript bundle mounts `ModalShell` DOM at import, so it created `#title-screen-modal` before the legacy gate ran, and `legacy-bridge.ts` overwrote `window.TitleScreenUI`. Result: the legacy instance manager never ran, the gate opened an empty modal (it looks for `#title-screen-body`, the shell has `title-screen-modal-body`), and `current_instance_id` was never persisted — so every visit fell back to the title screen. The bridge no longer overrides the legacy API, and the TS scenario modal uses `#title-screen-scenario-modal`.
- **Normalized 43 records** that carried real-world dates from the older `current_date` keyword bug (chat chronicle 9, NPC journeys 21, career shifts 4, political events 2, innovations 1, relationship deltas 3, stock movements 3) via migration `005-normalize-wallclock-dates`.

### Added
- **`npm run lint:client`** (`tools/client-syntax-check.js`): parses all 23 classic client scripts with V8 classic-script rules, because one parse error silently disables a whole file. Included in `npm run verify`.

### Verification
Browser check: first visit shows the full legacy title screen; returning visit goes straight to the dashboard with `184-11-08 (Lượt 12)`, 6,586 Qian, and zero `2026-` dates in the UI. `npm run verify` green; audit 1,356 / 0.

---

## [1.4.4] - 2026-10-29

Legacy gateway slimming (P2/P7).

### Removed
- **618 lines of dead handlers** from `tools/sim-web.js`: every route the modular Router already served (professions gather/synthesize/innovations/forge, equipment unequip, enterprise work/open/collect, ecology crises/relief/simulate-turn, logistics caravans/strongholds/attack-stronghold). A shadow report is now the first step before touching that file.
- **`globalThis` service locator in controllers** (8 sites). Controllers resolve modules from `ModuleRegistry` only; the blacksmith module no longer auto-attaches itself to a global router. `global-service-locator` ratchet **12 → 4** (the remaining four are the composition root's intentional publication for the legacy gateway).

### Added
- **`src/modules/faction-politics/faction.controller.ts`**: `/api/factions`, `/api/factions/officers`, `/api/factions/settlements`, `/api/factions/events` now live with their module instead of the gateway if-chain. API contract unchanged (verified by `golden:verify`).

### Changed
- `tools/sim-web.js` **3,916 → 3,205 lines** (from 4,475 before the refactor waves), 46 live legacy handlers remaining.

### Verification
`npm run verify` green (19/19 suites, 28 contracts, 8/8 write smoke).

---

## [1.4.3] - 2026-10-29

Determinism completed across the domain layer.

### Added
- **`id_sequence` table** (migration `004`, also in `tools/schema.sql`): a durable per-scope counter backing `nextId()` and `nextSequenceValue()`.
- **`src/shared/game-clock.ts`**: `getGameDate(db)` returning the quoted `"current_date"`, so new code cannot reintroduce the wall-clock bug.

### Changed
- **All remaining domain randomness is seeded.** Tavern banquets, bespoke forging, autonomous NPC life, travel encounters, crafting, wage labour, military expeditions, courtship, dynasty succession, mentorship, context dialogues, promissory notes and the agent bridge now use `RngService` or deterministic counters. `Math.random()` in `src/modules` and `src/shared` is **0**.
- **All persisted identifiers are deterministic.** `Date.now()` in domain modules is **0**; ids use `nextSequentialId` / `nextId` / `nextSequenceValue`. Instance folder ids use `randomUUID` because they are filesystem artifacts, not simulation state.
- `financial-transaction.ts` no longer hardcodes `campaignId`; it reads it from `campaign_meta`.
- Daily interaction ledger rows now use the real campaign date and campaign id instead of `'184-05-02'` / `'CMP-184-ZHOU-01'`.
- Architecture ratchet: `Math.random()` **35 → 0**, `Date.now()` **37 → 0**; all nine rules now sit at zero except the legacy UI count and the engine's reviewed SQL-interpolation budget.

### Verification
`npm run verify` green (19/19 suites, 28 contracts, 8/8 write smoke), audit 1,356 / 0, perf 11 endpoints with unchanged logic.

---

## [1.4.2] - 2026-10-29

Determinism and projection consolidation (P3/P4).

### Added
- **`src/core/rng.ts`**: `SeededRandom` (Mulberry32) + `RngService`. Domain streams are seeded from `hash(campaign.random_seed, active_turn, domain)` and reset when the turn advances, so replays are reproducible.
- **`src/shared/id-generator.ts`**: `nextSequentialId(table, prefix, gameDate)` replaces wall-clock identifiers.
- **`src/shared/projection-sync.ts`**: single in-process entry point for refreshing `game/PROGRESS.md`.
- **Migration `003-add-campaign-random-seed`**: adds `campaign_meta.random_seed` to playthroughs created before the column existed.

### Changed
- **Zero child processes in `src/`.** Six remaining `execSync('node tools/sim-db.js export-progress')` calls (ecology ×2, caravan ×2, professions, daily interaction) now render the projection in-process.
- **Deterministic combat and crafting**: `single-combat-duel` (14 rolls + duel/arena IDs), `tactical-battle` (seeded per `battleId`/`randomSeed`, deterministic battle ID), `blacksmith-forge` (10 rolls + 5 item/movement IDs), `reproduction-genetics` (name, mutation, gender, child ID), `enterprise-labor` (7 business/transaction IDs).
- Architecture baseline ratcheted down: `Math.random()` in domain modules **78 → 35**, `Date.now()` **53 → 37**, `child_process` in `src/` **4 → 0**.
- `arch-guard` SQL-interpolation rule supports an explicit, reviewed
  `arch-guard:allow-sql-interpolation` marker (used by the table-name constant in
  `id-generator.ts`).

### Verification
`npm run verify` green (19/19 suites, 28 contracts, 8/8 write smoke), audit 1,356 invariants / 0 discrepancies, perf 11 endpoints unchanged.

---

## [1.4.1] - 2026-10-29

Gameplay write-path repair. Found by API-level playtests and the new write smoke gate.

### Fixed
- **`current_date` read as the SQLite keyword.** Every unqualified `SELECT ... current_date FROM campaign_meta` returned the real-world date instead of the in-game date, so trades, loans, equipment, lineage and travel flows stamped `2026-10-29` into the campaign. All reads now use a quoted identifier (`"current_date"`), and `arch-guard` rule `unquoted-current-date` makes this a hard failure if it reappears.
- **`POST /api/trade` and `POST /api/economy/loans` were dead.** Four journal inserts used a removed `account_journal` column set (`debit_account`, `credit_account`, `amount`, `description`, `ref_txn`) and failed to prepare. They now write the canonical schema through one `insertJournalPair` helper (Dr == Cr), and the ledger balance is computed as liquid + safe cash like every other transaction path.
- **`/api/economy/loans` REPAY used double quotes** for a string literal (`status = "ACTIVE"`), which SQLite treats as an identifier. The query is now parameterized.
- **Idempotent replay returned a different shape** than the first call for every SimulationCore action: the stored `action_log.result` used different keys than the handler's return value. The stored payloads now match the returned `data` exactly.
- **Equip/unequip broke inventory conservation**: the warehouse quantity changed without a `stock_movements` row, so `npm run audit` failed immediately after equipping. Both paths now go through `src/shared/inventory-movement.ts` and refresh the `PROGRESS.md` projection.
- **Back-dated ledger writes are rejected.** Financial actions whose `game_date` precedes the latest ledger entry now return `INVALID_PARAMS`; out-of-order rows made the chronological balance replay fail.

### Added
- **Write-path smoke gate (`npm run smoke:write`, part of `npm run verify`)**: boots the real composition root on a sandbox DB and exercises buy, sell, borrow, repay, equip, unequip, idempotent replay, input rejection, and a post-write audit (8 checks).
- **Campaign clock invariant** in `sim-audit` (section 8): the game date must be inside 180–300, must not precede the newest turn, and must not drift more than 45 days past it. `GET /api/audit` now runs all eight sections instead of five (270 → ~1,367 checks).
- **Migration `002-repair-campaign-clock`** snaps an implausible clock back to the latest `turn_log` date.

---

## [1.4.0] - 2026-10-29

Data & Runtime Consolidation Wave 1. Full rationale and measurements: `docs/REFACTOR_2026-10.md`.

### Added
- **Unified verification gate (`npm run verify`)**: typecheck → architecture guard → 19 verification suites → 28-endpoint API contract check.
- **`tools/test-runner.js`**: single entry point for 4 legacy suites and 15 `verify-*.ts` suites, each modern suite against an isolated DB copy, with generated Markdown projections restored afterwards.
- **`tools/arch-guard.js` + `tools/arch-baseline.json`**: ratcheting architecture linter (SQLite-CLI spawns, `child_process` in `src/`, SQL interpolation, unseeded RNG, wall-clock IDs, silent catches, service locator, legacy UI count). Debt may only shrink.
- **`tools/api-golden.js` + `tests/golden/api-shape.json`**: boots the real composition root and diffs response contracts, including behavioural assertions for `/api/strategy/modules` and `/api/audit`.
- **`tools/perf-probe.js` + `tools/lib/server-harness.js`**: per-feature performance and logic gate. Records p95 latency and a normalised body fingerprint against a captured database fixture (`npm run perf:record`), then re-measures and fails on logic drift or p95 regression (`npm run perf:compare`). Shared boot/sandbox plumbing is used by both the contract and performance probes.
- **`refactor-feature-gate` skill**: reusable baseline → refactor → re-probe protocol for a single feature, with a decision table and rollback rules (`~/.zcode/skills/refactor-feature-gate`).
- **`tools/migrations/`**: versioned, idempotent data migrations with a `schema_migrations` ledger and `npm run migrate`.
- **`engine/action-validation.js`**: strict normalization of every agent/API action before SQL composition (identifier alphabet, numeric bounds, date shape, text escaping).

### Changed
- **`src/core/database.ts`**: path-keyed registry replaces the close-and-reopen singleton; concurrent playthrough instances stay open; `busy_timeout` and `DatabaseQueryError` added.
- **`engine/db-adapter.js`**: connection cache, bound-parameter reads, throwing errors with DB/statement context. Removed the `sqlite3` CLI fallback and the silent `[]` policy.
- **`tools/sim-web.js`**: DB access goes through the in-process adapter; `npm start` now boots `src/server/main.ts` so feature modules are actually initialized.
- **`src/mcp/tools.ts`**: uses `DatabaseService` instead of spawning the SQLite CLI.
- **`src/shared/financial-transaction.ts`**: refreshes `game/PROGRESS.md` in-process instead of spawning `node tools/sim-db.js` per transaction.
- **Test isolation**: three suites now honour `SIM_DB_PATH`; sandbox cleanups release cached handles and WAL sidecars.

### Removed
- **537 lines of shadowed legacy handlers** from `tools/sim-web.js` (`/api/ledger`, `/api/professions/nodes`, `/api/professions/character`, `/api/equipment` GET, `/api/equipment/equip`, `/api/enterprise/status`, `/api/strategy/supply-check`, `/api/strategy/price-check`) — already served by the modular Router.

### Fixed
- Duplicate `changan` / `chang_an` settlement rows (migration `001`), which broke world-map verification and could shadow settlement lookups.
- `UNIQUE constraint failed: action_log.action_id` when two actions ran in the same millisecond: action and stock-movement IDs are now deterministic sequence IDs instead of `Date.now()`.
- Legacy suites failing with `EBUSY` / `database disk image is malformed` after connection caching (stale WAL sidecars).
- `verify-strategic-world-map.ts` asserting immutable seed constants against mutable campaign state.

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
