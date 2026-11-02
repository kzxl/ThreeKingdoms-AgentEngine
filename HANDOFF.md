# Agent Handoff Guide (HANDOFF.md)

> Current as of 2026-11-01 on `feat/remaining-systems` at `c775225` (1.39.0).
> Historical phase logs and dated audits are snapshots; this file points to the
> current gates and structure.

## 1. What this repository is

A deterministic Three Kingdoms simulation and character-driven RPG. SQLite
(`saves/session.db`) is the only source of truth; Markdown projections and the
web UI are read models.

- **Runtime**: TypeScript modules under `src/modules/`, a CommonJS engine under
  `engine/`, and a Vite client under `src/client/`.
- **Entry point**: `src/server/main.ts` composes the module registry, router and
  HTTP server.
- **Legacy surface**: `tools/sim-web.js` still serves 48 handlers that have not
  moved to module controllers; `public/js/*.js` still contains 21 classic
  scripts loaded alongside the TS bundle.
- **Data**: `tools/schema.sql` plus 83 numbered migrations in
  `tools/migrations/`. `saves/` is local and gitignored.

## 2. Verified gate (2026-11-01)

| Gate | Result |
| :--- | :--- |
| `npm run verify` | 100/100 suites (4 legacy + 96 modern), 28/28 API contracts, 8/8 write smokes |
| `npm run audit` | 2,313 SQLite invariants, 0 discrepancies |
| `npm run routes:shadow` | 48 live legacy handlers, 0 shadowed |

Run `npm run verify` before and after every change. A feature is not done until
its regression suite and the invariant audit are green.

## 3. Essential commands

```bash
npm run verify          # typecheck, five lints, route shadow, 100 suites, golden, write smokes
npm run audit           # 2,313 invariants against saves/session.db
npm run migrate         # apply pending migrations (currently through 083)
npm run migrate:status  # list applied/pending
npm test                # suites only
npm run build:client    # rebuild the TS client bundle after src/client changes
npm start               # start the server (default port 3300)
node tools/sim-db.js status
```

After a client change, rebuild the bundle and restart the server before a browser
check; an old server keeps serving the old bundle.

## 4. Current economic rules (1.45.0)

- **Freight**: `accept` reserves source settlement stock inside the transaction;
  `deliver` credits the destination; `failContract` returns unspoiled cargo.
  `freight_shipments.source_reserved_quantity` is audited. Contract demand comes
  from `settlement_consumption` plus static deficits.
- **Price**: `SettlementMarketService.getLocalMultiplier` is
  `specialisation × stock × endowment` (0.5–2). `calculateSettlementPrice`,
  trade, stalls, contract board, intel and contextual actions use it.
- **Stall**: listing adds goods to municipal stock, a sale consumes them and
  closing removes unsold goods; `stall_listings.market_effect` is audited.
- **Risk**: a lair near an endpoint can ambush a shipment; guard tier decides
  deterrence and loss. Freight insurance is 4% premium / 75% claim.
- **Death**: every damage path calls `applyPlayerDamage`; health can reach 0 and
  the first zero either succeeds an heir or sets `DEFEATED`.
- **NPC**: every cash/troop change writes `npc_ledger`; commerce transfers from
  a buyer and raids draw bounty from the lair and recruits from the garrison.
- **Succession**: an NPC owner's enterprise goes to an adult heir, then a senior
  foreman, then the settlement treasury.
- **Terminal**: month close checks victory before bankruptcy; a terminal campaign
  rejects player actions with `CAMPAIGN_OVER`.
- **Hiring**: affinity + fame + virtue gate; a low-standing stranger is refused
  with `NPC_REFUSED` and a 30-day retry date.
- **Map**: `GET /api/map/registry` is the single source for 20 nodes, 133
  sub-locations, 132 POIs and 23 resource nodes; every row resolves, zero
  orphans. Wilderness travel updates `current_sub_location` through
  `/api/map/wilderness/travel` and costs one day.
- **Day ledger**: `world_day_ledger(system, game_date)` makes stall, freight,
  merchant and consumption ticks idempotent. Day arithmetic uses
  `src/shared/game-date.ts` (30-day months).

## 5. Where to look next

- Architecture and gates: `ARCHITECTURE.md` §6.4, §20–§29.
- Map direction: `docs/MAP_EVOLUTION_ANALYSIS_2026-11-01.md` (Step A done) and
  `docs/MAP_TWO_SCALE_DESIGN_2026-11-01.md` (wilderness done; city next).
- Feature folder contract and scaffold: `docs/FEATURE_MODULE_STANDARD.md`,
  `npm run scaffold:feature`.
- Decisions: `DECISIONS.md` ADR-040–042.
- Current verified baseline: `PROJECT.md` §Current Baseline.
- Remaining analysis phases and wave order:
  `docs/IMPLEMENTATION_PLAN_2026-11-01.md`.
- Test inventory: `TEST_INFRA.md`.

## 6. Known structural debt

- 48 legacy handlers in `tools/sim-web.js`; 21 legacy scripts in `public/js/`.
- Five services above 1,000 lines (`context-action`, `blacksmith-forge`,
  `single-combat-duel`, `enterprise-labor`, `courtship-betrothal`).
- 366 `'PLY-0001'` literals across 65 files; no injected `ExecutionContext` yet.
- True per-request multi-instance is not built; selecting another instance still
  returns 409 and requires a restart.
- Map still has four data sources; only 20 citadel nodes are clickable and 132
  POI scene rows have no runtime consumer.

These are scheduled in the implementation plan; do not start a big-bang refactor
of them without a characterization test.
