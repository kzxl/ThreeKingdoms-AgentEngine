# 10 — Migration Roadmap

**Principle:** incremental, reversible, gate-green at every step. No big-bang rewrite, no source changes during this audit, no database changes until a module owns its migration.

**Effort units:** engineer-days for one engineer familiar with the codebase. Estimates are **[P]**, not measured.

---

## Phase overview

| Phase | Name | Effort | Risk | Exit criterion |
| --- | --- | --- | --- | --- |
| 0 | Architecture baseline | done | — | This document set |
| 1 | Core foundation | 6–9 | Medium | Manifest + resolver + route ownership + injected event bus |
| 2 | First DLC pilot | 8–12 | Medium | `market.warehouse` runs as a module with zero foreign writes |
| 3 | Market DLC complete | 10–15 | Medium | Full `dlc.market` at Level 2, ownership guard hard for market |
| 4 | Product composition | 5–8 | Low | Three product manifests boot three module sets |
| 5 | Second and third DLC | 15–25 | High | `lineage` and `military` at Level 1/2 with contracts |
| 6 | Advanced runtime (optional) | 5–10 | Low | Isolated `agent-bridge` only if measured need |

**Total to a credible Level-2 platform for three DLCs: 50–80 engineer-days.**

---

## Phase 0 — Architecture baseline (complete)

**Objective:** establish facts and boundaries before changing code.

**Deliverables:** `architecture-audit/00`–`12`.

**What was verified:**

- 125 tables, 89 migrations, 216 routes, 49 legacy handlers, 0 shadowed routes.
- 30/125 tables have multiple writers; `player_state` has 12.
- The event bus is not delivered in production; tests inject a fake global.
- Nine `IFeatureModule` classes vs 19 route registrars vs 16 domain folders.
- `engine` ↔ `modules` are mutually dependent through 18 bridges and 15 imports.

**Exit criterion:** the program has a shared, evidence-based map. **Met.**

---

## Phase 1 — Core foundation

**Objective:** make the kernel real without changing gameplay.

### Scope

| Work item | Files | Notes |
| --- | --- | --- |
| `ModuleManifest` + validator | new `platform/contracts/module.ts`, `platform/core/kernel` | Add beside `IFeatureModule` |
| Dependency resolver + topological order | new `kernel/resolver.ts` | Cycles and missing deps produce aggregated errors |
| Public `ModuleContext` v2 + injected event publisher | `src/core/module-registry.ts`, `src/core/types.ts` | Fix F3; remove `globalThis` discovery in `engine/time-manager.js`, `engine/gameplay-manager.js` |
| Route ownership | `platform/contracts/transport.ts`, 19 controllers | Move registrar types; modules register their own routes |
| `DbSession` interface | `platform/contracts/data.ts` | Wrap `DatabaseService`; keep `getInstance` as deprecated |
| Config loader | `platform/core/config` | Typed `config/*.json` |
| Schema ownership registry (report-only) | `platform/core/kernel/ownership.ts` + `tools/arch-guard.js` | Reports foreign writes, does not fail |
| Migration namespace | `tools/migrations/run.js`, `schema_migrations` | Add `module_id` (migration 090) |

### Dependencies

- Must land before any module extraction.
- The event-bus fix must land before any event-based contract is proposed.

### Risks

| Risk | Mitigation |
| --- | --- |
| Manifest duplicates `IFeatureModule` and drifts | One adapter: old modules get a generated manifest; deprecate fields |
| Route ownership breaks the 409 instance guard | Keep `matches(req)` behaviour; test the 409 path |
| Resolver reorders init and changes side effects | Log-only mode first; compare boot order to today |
| `DbSession` becomes a wrapper around the same global | Ban `getInstance` inside module code via lint |

### Exit criteria

1. Bootstrap logs a resolved graph and fails on a synthetic missing dependency.
2. `WORLD_DAY_TICK` is published without a fake `globalThis` (new test).
3. All 216 routes still resolve; route-shadow still 0.
4. Ownership guard prints foreign writes with counts.
5. Full `npm run verify` green; `npm run audit` green.

### Tests

- Extend `tests/verify-logic-ownership.ts` to assert a real `ModuleRegistry` boot publishes a day tick (no fake `globalThis`).
- New resolver suite: missing dependency, cycle, incompatible version, duplicate table claim.
- `npm run verify` and `npm run audit` stay green.

### Value

This phase alone makes the system *diagnosable*: you can see the module graph, the owner of each table, and whether events actually flow.

---

## Phase 2 — First DLC pilot: `market.warehouse`

**Objective:** prove the module contract end-to-end on a small, valuable slice.

### Scope

| Work item | Files | Notes |
| --- | --- | --- |
| `base.player` inventory capability | `src/shared/player-bag.ts`, `inventory-movement.ts`, market calls | `inventory.stock.query/move/reserve/release` |
| `base.player` cash capability | `src/shared/ledger.ts`, market calls | `player.cash.post` |
| Warehouse module | `src/modules/market/warehouse.controller.ts`, `warehouse.service.ts` | Manifest, owned tables, routes |
| Retire foreign writes | `market/freight.service.ts:602`, `merchant-company.service.ts:359` | `bandit.raid` or world threat capability |
| Module migration | new `090-market-warehouse` | Owned by `dlc.market.warehouse` |
| UI slice wiring | `src/client/features/market-stall` or legacy modal | No duplicate modal id |

### Dependencies

- Phase 1 complete.
- Inventory capability must preserve conservation invariants.

### Risks

| Risk | Mitigation |
| --- | --- |
| Inventory contract becomes a chatty RPC | Batch operations (`moveMany`) only if measured |
| Cash path changes balance semantics | Reuse `postCashflowEntry`; assert `balance = liquid + safe` |
| Warehouse and stall both touch stock | One owner (`base.player`), two consumers |
| UI opens two modals | One renderer per modal id; `nextModalZIndex` |

### Exit criteria

1. `dlc.market.warehouse` declares 2 owned tables and 4 consumed capabilities.
2. Ownership guard: zero foreign writes inside the warehouse slice.
3. Warehouse routes work with the module enabled and return `CAPABILITY_UNAVAILABLE` when disabled.
4. Inventory conservation and cashflow invariants green.
5. The module can be disabled without breaking other endpoints.

### Tests

- New `tests/verify-market-warehouse.ts`: deposit/withdraw preserves total inventory; reservation cannot over-allocate.
- Cash path: `balance = liquid + safe` after deposit/withdraw; journal pair exists.
- Disable the module and assert `CAPABILITY_UNAVAILABLE` plus unchanged player inventory.

### Value

A working, disableable vertical slice; the pattern for every later DLC.

---

## Phase 3 — Complete `dlc.market`

**Objective:** turn the pilot into a full business DLC at Level 2.

### Scope

- Stall (ask side), NPC offers (bid side), freight, merchant routes, perishables, insurance.
- Replace `market → economy` service imports with `market.price.quote` and `market.stock.local`.
- Replace `market → ecology-logistics` imports with `world.route.*`.
- Own 17 tables; move 4 controllers + 21 routes into the module.
- Add module migrations for any schema change.
- Freeze `market` foreign writes with a hard guard.

### Dependencies

- Phase 2.
- `economy` price contract (can be a thin facade over `SettlementMarketService` at first).

### Risks

| Risk | Mitigation |
| --- | --- |
| Price facade hides a cyclic dependency | Keep the facade pure; no callbacks into market |
| Freight/merchant share stock reservation | One reservation table owned by `base.player`; module-specific keys |
| 21 routes move at once | Move one controller per commit, verify each |
| Perishables/insurance semantics drift | Golden contracts + existing suites |

### Exit criteria

1. `dlc.market` manifest with 17 owned tables, 6+ capabilities, 21 routes.
2. Zero source imports from `market` to `economy`/`ecology` services.
3. Guard: zero foreign writes for `market`.
4. Full gate green; golden contracts unchanged.
5. Module disabled → market endpoints return typed unavailability; other products unaffected.

### Tests

- 28 golden API contracts unchanged.
- Market suites (freight, merchant-route, market-price-book) green against a fixture database.
- Ownership guard hard for `market`: zero foreign writes.
- Module-disabled boot serves all non-market routes.

### Value

The first real DLC: a merchant product can include or exclude trade logistics.

---

## Phase 4 — Product composition

**Objective:** make products data.

### Scope

| Work item | Files |
| --- | --- |
| Product schema + loader | `platform/contracts/product.ts`, `platform/core/kernel/product.ts` |
| Generic composition root | replaces hardcoded `src/server/main.ts` registration |
| Three manifests | `products/merchant`, `products/warlord`, `products/sandbox` |
| `/api/system/modules` diagnostic | new controller |
| Config merge + validation | `platform/core/config` |
| Optional-module disable path | `failurePolicy` implementation |

### Dependencies

- Phase 1 resolver; Phase 3 market.

### Risks

| Risk | Mitigation |
| --- | --- |
| Manifest becomes a second programming language | Keep it declarative; no expressions |
| Product differences leak into module code | Config only through module schemas |
| Legacy routes assume all modules exist | Legacy handler guard: return typed error if its module is disabled |

### Exit criteria

1. Three manifests boot three different module sets from the same build.
2. A missing optional module produces `CAPABILITY_UNAVAILABLE`, not a crash.
3. `/api/system/modules` lists installed/enabled/version/capabilities.
4. All three products pass the same core gate.

### Tests

- Three-manifest boot suite asserting the enabled module set per product.
- `/api/system/modules` snapshot for each product.
- Missing optional module: product boots, endpoint returns `CAPABILITY_UNAVAILABLE`.
- Missing required module: boot fails with aggregated error.

### Value

Multi-product from one Core, without branching the codebase.

---

## Phase 5 — Second and third DLC

**Objective:** prove the pattern outside trade.

### Phase 5a — `dlc.lineage` (10–12 days)

- Cleanest ownership: 10/10 single-writer tables.
- Replace `lineage → social` and `lineage → progression` imports with capabilities.
- Move 19 routes; 4,033 lines.
- Exit: Level 2, guard zero, dynasty flows green.

### Phase 5b — `dlc.military` (15–20 days)

- Hardest: 5,544 lines, 40 routes, supply graph, settlement writes, condition writes.
- Introduce `world.settlement.garrison.adjust`, `condition.apply`, `military.duel.resolve`.
- Move 6 owned tables; keep `bandit_strongholds` single-owner (military) and give market a `bandit.raid` capability.
- Exit: Level 1; Level 2 only if settlement contract is stable.

### Exit criteria

1. Both modules declare manifests, owned tables, and capabilities.
2. Neither module imports the other's services; all crossings go through capabilities.
3. Ownership guard is hard for both, with zero foreign writes.
4. Disabling either module leaves the other product playable.

### Risks

| Risk | Mitigation |
| --- | --- |
| Lineage cross-reads NPC/family state | Read-only capabilities; no direct SQL |
| Military writes settlements | World owns the table; military calls the contract |
| Combat determinism breaks | Seeded RNG only; replay test before/after |
| Death/succession paths | End-to-end NG+ suite before moving |

### Tests

- Lineage: courtship, succession, will, NG+ suites green; 10/10 owned tables single-writer.
- Military: siege, field-battle, duel, condition, victory suites green; deterministic replay produces identical results.
- Ownership guard hard for both modules; disable test for each.

### Value

A platform that supports at least three genuinely different products (trade, dynasty, war).

---

## Phase 6 — Advanced runtime (optional)

**Objective:** isolate only what benefits from isolation.

### Scope

- `int.mcp`: formalize as an isolated adapter over capabilities (already separate).
- `int.agent-bridge`: optional isolated process if LLM latency/retries threaten the game loop.
- Outbox + idempotency keys for cross-process calls.

### Explicit non-goals

- No business DLC in a separate process.
- No distributed runtime.
- No hot reload.

### Exit criteria

- MCP tools call capabilities, not services.
- Agent bridge failure cannot block the turn loop.
- No business module imports the MCP server.

---

## First ten PR-sized steps

Each step should be a separate commit, verified independently.

| # | Step | Files | Verify |
| --- | --- | --- | --- |
| 1 | Add `ModuleManifest` types + adapter for existing modules | new contracts; `src/core/types.ts` | `npm run typecheck` |
| 2 | Resolver in log-only mode | new `kernel/resolver.ts`; `module-registry.ts` | boot log; `npm test` |
| 3 | Expose `ModuleRegistry.context`; inject event publisher | `module-registry.ts`, `time-manager.js`, `gameplay-manager.js` | new event test; `npm run verify` |
| 4 | Move router types to contracts; keep implementation | `server/router.ts`, 1 controller | `npm run routes:shadow`, `lint:api` |
| 5 | Add `registerRoutes` to module contract; migrate one module (`life`) | `life.module.ts`, `main.ts` | routes reachable |
| 6 | Add `DbSession` + ownership manifest (report-only) | `contracts/data.ts`, `arch-guard.js` | guard report |
| 7 | Add inventory capabilities + migrate one market call | `shared/player-bag.ts`, `market/warehouse.service.ts` | conservation suites |
| 8 | Move warehouse slice into a module with manifest | `market/warehouse.*` | warehouse suite; disable test |
| 9 | Add cash capability + migrate market cash writes | `shared/ledger.ts`, market services | cashflow + journal audit |
| 10 | Add product schema + merchant manifest (sandbox still all-on) | `products/merchant`, boot | three-manifest boot test |

---

## Sequencing rationale

1. **Core before modules.** Splitting modules first produces packages that still import each other.
2. **Fix events before event contracts.** Otherwise the contract is a lie.
3. **Inventory/cash before market.** Market is the first DLC; it needs both.
4. **Market before lineage/military.** It has the best value/risk ratio and exercises the hardest shared aggregates.
5. **Product manifests before second DLC.** Composition pressure reveals missing contracts early.
6. **Military last.** Highest complexity, highest risk, most engine coupling.

---

## Rollback plan

| Phase | Rollback |
| --- | --- |
| 1 | Manifest/resolver are additive; revert the commit; old boot path remains |
| 2 | Keep the old service call behind a config flag until the pilot is green |
| 3 | Move one controller per commit; revert the controller, not the module |
| 4 | Keep the hardcoded boot as a fallback `products/legacy.json` |
| 5 | Each DLC move is a separate branch; revert the module, keep Core |
| 6 | Stop the isolated process; fall back to embedded |

Database rollback always means restore backup. No automatic down migrations.

---

## Program metrics

Track these to know whether the migration is real:

| Metric | Baseline | Target |
| --- | --- | --- |
| Multi-writer tables | 30 | ≤ 5 |
| `player_state` writers | 12 | 1 |
| `inventory_items` writers | 9 | 1 |
| Modules with manifests | 0 | 14 |
| Routes owned by modules | 0 | 216 |
| Module source imports of `src/server` | 20 files | 0 |
| Import cycles (module-level) | 6 | 0 |
| `globalThis` runtime contracts | 3 | 0 |
| Products booted from manifest | 0 | 3 |
| DLCs pass disable/uninstall test | 0 | 3 |

### Tests

- MCP tool contract test calls capabilities without importing server internals.
- Failure injection: kill the isolated process; the turn loop continues and reports `CAPABILITY_UNAVAILABLE`.
- Outbox idempotency: replaying an envelope does not duplicate a mutation.

### Value

External integrations can fail without threatening the single-player game loop.

---

## What would make this roadmap fail

| Failure mode | Early warning | Response |
| --- | --- | --- |
| Contract explosion | > 15 capabilities for the warehouse slice | Stop; re-scope the aggregate |
| Ownership guard cannot go green | > 10 foreign write sites in the pilot | Stop; the aggregate boundary is wrong |
| Boot becomes slower/unstable | Startup time or test flakiness rises | Revert resolver to log-only; fix side effects |
| Product manifest grows logic | Expressions/conditions appear in JSON | Move the logic into module config or code |
| Team treats folders as DLC | New "DLC" without a manifest/capability | Reject the PR; a folder is not a module |
| Legacy UI blocks route moves | Inline handlers call removed endpoints | Keep compatibility routes until the UI slice ships |

**Kill switch:** after Phase 2, if the pilot needs more than 15 capabilities or cannot reach zero foreign writes for 2 tables, the modular target is not worth the cost. Keep the monolith, document the boundary, and invest in gameplay instead.
