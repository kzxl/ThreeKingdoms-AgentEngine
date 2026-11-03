# 00 — Executive Summary

**Repository:** `ThreeKingdoms-AgentEngine` (`E:\15. Other\Simulation`)
**Branch / HEAD:** `feat/remaining-systems` / `069cd8c`
**Audit date:** 2026-11-03
**Audit type:** read-only architecture assessment and Core/DLC extraction strategy
**Code changes in this audit:** none outside `architecture-audit/`

---

## Evidence legend

| Tag | Meaning |
| --- | --- |
| **[V]** | Verified in this audit by reading source, running the repository's own tooling, or querying the live schema. |
| **[I]** | Inferred from structure or usage; consistent with the code but not directly asserted by a test. |
| **[P]** | Proposed target design; not present in the repository today. |
| **[?]** | Unknown; requires runtime data, product intent, or a decision the repository does not record. |

Unless a statement carries a tag, assume **[V]**.

---

## Verdict

**The repository is a modular monolith with a module facade, not yet a Core + DLC platform.**

It already has the *shape* of the target architecture: a `ModuleRegistry`, an `IFeatureModule` contract, an `EventBus`, 16 domain folders, a shared ledger/time layer, versioned migrations, and a 216-route HTTP composition root. What it does not have is the *enforcement*: modules are registered by hand, declare no dependencies, expose no capabilities, share one writable data model, and reach into each other through direct imports, singletons, and `globalThis`.

| Dimension | Current state | Core/DLC readiness |
| --- | --- | --- |
| Module lifecycle | `init` / `destroy` only; no discovery, dependency resolution, enable/disable, upgrade, licensing | **2 / 10** |
| Module contract | 4 fields (`id`, `name`, `version`, `init`) | **2 / 10** |
| Dependency direction | Bidirectional across `engine` ↔ `src/modules`; cycles between business domains | **3 / 10** |
| Data ownership | One SQLite file, 125 tables, 30 tables written by more than one unit | **2 / 10** |
| Transport separation | 19 controllers import `src/server/router` directly | **4 / 10** |
| Product composition | `src/server/main.ts` hardcodes 9 modules and 19 route registrars | **1 / 10** |
| Runtime isolation | One Node process; the only genuinely separate runtime is the MCP stdio server | **3 / 10** |
| Backward compatibility | No contract versioning; `IFeatureModule` has no `apiVersion` | **2 / 10** |
| Overall | | **≈ 2.4 / 10** |

The good news: **no rewrite is required**. The folder boundaries, the shared ledger/time contracts, and the test gate are strong enough to extract modules incrementally at **Level 1 (source modularization)** and then **Level 2 (registered package)**. Level 3 (separate process) is justified for exactly one component today — the MCP server — and should not be applied to business DLC.

---

## Measured baseline

All numbers below were measured in this audit, not copied from documentation.

| Metric | Value | How measured |
| --- | --- | --- |
| TypeScript/JavaScript under `src/` | 203 files, 52,056 lines | `find` + `wc -l` |
| Domain code under `src/modules/` | 16 folders, 39,612 lines | same |
| Shared code under `src/shared/` | 33 files, 2,577 lines | same |
| Legacy engine under `engine/` | 42 files, 6,588 lines | same |
| Legacy browser UI under `public/js/` | 21 files, 17,820 lines | same |
| Browser shell | `index.html` 1,059 lines, `styles.css` 11,619 lines, `app.js` 1,254 lines | `wc -l` |
| Tooling under `tools/` | 125 files, 19,195 lines | `find` + `wc -l` |
| Tests | 108 `verify-*.ts`, 4 legacy suites, 28 API contracts | `ls`, `tools/test-runner.js`, `tools/api-golden.js` |
| Runtime dependencies | `better-sqlite3` only | `package.json` |
| Session database tables | 125 tables (excluding `sqlite_*`) | live `saves/session.db` via `better-sqlite3` |
| Migration files | 89 numbered migrations + `run.js` | `tools/migrations/` |
| Modular HTTP routes | 216 across 20 controller files | AST-less count of `router.<verb>(` |
| Legacy HTTP handlers | 49 | `tools/route-shadow-report.js` |
| Shadowed/dead routes | 0 | `tools/route-shadow-report.js` |
| `IFeatureModule` implementations | 9 | `grep "implements IFeatureModule"` |
| Route registration functions | 19 | `grep "export function register.*Routes"` |
| Singleton classes | 38 | `grep "private static instance"` |
| Direct `DatabaseService.getInstance` call sites | 100 | `grep` |
| Tables with more than one writing unit | 30 / 125 | SQL-write scan over `src/` + `engine/` |
| `player_state` writing units | 12 | same |

---

## What is already right

1. **One database driver, one failure policy.** `src/core/database.ts` and `engine/db-adapter.js` both wrap `better-sqlite3`, keep one cached connection per path, enable WAL, foreign keys, and a busy timeout, and throw context-rich errors instead of returning empty arrays. This is a real kernel seam.
2. **One ledger writer.** `src/shared/ledger.ts` defines `postCashflowEntry`, `postDoubleEntry`, and `postCashflowEntryRaw`; the architecture guard freezes direct `INSERT INTO cashflow_ledger` at zero.
3. **One time authority.** `src/shared/action-time.ts` charges every player mutation at the HTTP boundary, rejects before mutation, and delegates the cost table to `engine/action-policy.js`.
4. **Versioned data migrations.** 89 numbered migrations with a runtime schema contract (`050-runtime-schema-contract.js`) are a solid base for per-module ownership.
5. **A real verification gate.** `npm run verify` combines typecheck, four ratchets, route-shadow detection, 112 suites, 28 contracts, and write smokes; `npm run audit` runs 1,000+ invariants. A migration program without this gate would be reckless; with it, incremental extraction is tractable.
6. **Domain folders already match business boundaries.** `market`, `professions`, `military`, `lineage-succession`, `social-kizuna`, `economy`, `progression`, `faction-politics` are recognisable DLC candidates. The problem is not the map; it is the missing border controls.

---

## Ten findings that determine the program

### F1. The module registry is a registration list, not a runtime [V]

`ModuleRegistry.initAll` builds one `ModuleContext` and calls `mod.init(ctx)` in insertion order. There is no dependency declaration, no topological sort, no version compatibility check, no enable/disable, no upgrade, and no partial failure policy beyond `throw`. Evidence: `src/core/module-registry.ts:39-58`, `src/core/types.ts:110-123`.

**Impact:** DLC composition cannot be expressed; a missing dependency is discovered as a runtime exception inside `init`, not at validation time.

### F2. Modules do not own their routes [V]

`IFeatureModule` does not declare `registerRoutes`. `src/server/main.ts` imports 19 free functions and calls them manually (`src/server/main.ts:20-39, 91-111`). Nine classes implement `IFeatureModule`; seven other domain folders (`market`, `progression`, `lineage-succession`, `life`, `equipment`, `contextual-actions`, `instances`) own routes without being modules at all.

**Impact:** Installing a DLC cannot install its HTTP surface. Route ownership is a property of the composition root, not the module.

### F3. The EventBus is effectively disconnected in production [V]

`engine/time-manager.js:56-60` and `engine/gameplay-manager.js:545` obtain the bus from `__GRAND_STRATEGY_MODULES__.registry.ctx.eventBus` or `.utilityAi.ctx.eventBus`.

A runtime probe shows neither object has a `ctx` property: `ModuleRegistry` never assigns one, and `UtilityAiModule.init(_ctx)` discards its argument. Both lookups therefore return `undefined`, so `WORLD_DAY_TICK`, `WORLD_MONTH_TICK`, and `TURN_ADVANCED` are never published in a normal server boot.

The tests pass because they inject a fake `{ registry: { ctx: { eventBus } } }` (`tests/verify-logic-ownership.ts:44-55`, `tests/verify-audit-recommendations.ts:56-58`).

**Impact:** Cross-module reactions that look implemented are test-only. Any DLC contract based on events must first fix event delivery or replace it with an outbox/command bus.

### F4. Data ownership is nominal [V]

30 of 125 tables have more than one writing unit. `player_state` is written by 12 units (`professions`, `progression`, `market`, `economy`, `military`, `ecology-logistics`, `engine`, `life`, `social-kizuna`, `lineage-succession`, `shared`, `instances`). `inventory_items`, `npc_state`, and `account_journal` each have 8–9 writers. Concrete examples:

- `src/modules/market/npc-market.service.ts:205` updates `player_state.liquid_cash`.
- `src/modules/economy/promissory-note.service.ts:106` updates `player_state.liquid_cash`.
- `src/modules/progression/exploration.service.ts:138` inserts `inventory_items`.
- `src/modules/social-kizuna/tavern-banquet.service.ts:414-419` updates and inserts `inventory_items`.
- `src/modules/market/freight.service.ts:602` updates `bandit_strongholds`.

**Impact:** A module cannot be removed, versioned, or licensed while another module writes its aggregate directly.

### F5. `engine/` and `src/modules/` are mutually dependent [V]

18 `engine/*-bridge.js` files lazily `require('tsx/cjs')` and then require TypeScript services (e.g. `engine/prestige-bridge.js:12-18`). In the other direction, 15 TypeScript files require engine modules (`time-manager`, `career-paths`, `date-utils`) and `src/shared/action-time.ts:54` requires `engine/time-manager`.

**Impact:** There is no one-way core; the "engine" and the "modules" are one distributed unit. Extraction must treat this seam explicitly, not pretend it is already layered.

### F6. Business modules depend on the HTTP transport [V]

All 20 controller files import `Router`, `sendJson`, and `RouteContext` from `src/server/router`. Services also import the router when a service file doubles as a controller (`src/modules/professions/blacksmith-forge.service.ts:25`).

**Impact:** A DLC cannot be hosted by MCP, CLI, or another transport without importing the web layer.

### F7. Product composition is hardcoded [V]

`bootstrapGrandStrategy()` constructs nine concrete modules and registers them unconditionally; `createGrandStrategyRouter()` registers all 19 route groups unconditionally (`src/server/main.ts:52-111`). There is no manifest, no feature flag, no `enabledModules` list, no license check.

**Impact:** "Product A uses modules 1-5, Product B uses 1,2,6,7" is a code fork today, not configuration.

### F8. The client is split across two incompatible architectures [V]

`public/index.html` loads 24 scripts: one ES-module bundle (`/dist/client-bundle.es.js`), one IIFE fallback, 21 legacy scripts, and `app.js`, plus 64 inline `onclick=` attributes. The TS client has 17 feature folders and a `legacy-bridge.ts` that deliberately does **not** replace several legacy modals because the TS slices target endpoints that do not exist (`src/client/features/legacy-bridge.ts:52-72`).

**Impact:** UI DLC cannot be composed independently of a frozen 17.8k-line legacy surface.

### F9. Template migrations and migrations-at-runtime coexist [V]

`tools/migrations/` owns schema evolution, but modules still execute DDL during `init` (e.g. `src/modules/agent-bridge/agent-bridge.module.ts:47-57` creates `npc_episodic_memories`). Content is also mutated at runtime: the `social-kizuna` dialogue service writes `master_context_dialogues` into both `session.db` and `master.db` (`src/modules/social-kizuna/context-dialogue.service.ts:188-235`), and `seedMasterRecipes` inserts into `master_items`/`master_recipes` from `enterprise-labor.service.ts:399` (`recipes-seed.ts:272-300`).

**Impact:** "Migration owner = module" is not yet true; master data is mutable at runtime.

### F10. The runtime is single-tenant by construction [V]

`tools/sim-web.js:256-266` returns HTTP 409 `INSTANCE_NOT_ACTIVE` when a request addresses a database other than the boot-time `DB_PATH`. The 2026-11-02 decision (commit `069cd8c`) removed the worker/proxy experiment and reset one `saves/session.db` in place. `DatabaseService` supports multiple open paths, but the server binds one active path.

**Impact:** Per-product or per-campaign isolation is a deployment concern (one process per campaign, `SIM_DB_PATH`), not a module-runtime concern. Do not design distributed DLC around a multi-tenant assumption the product does not have.

---

## Answers to the mandatory questions

### A. Can the current architecture be converted to Core + DLC?

**Yes — incrementally, at Level 1 first, without a rewrite.** The folder boundaries and the shared contracts are already close to the target. The blockers are enforcement gaps (F1–F7), not missing technology. A full rewrite would be the highest-risk path and is not justified.

### B. What should the Core actually contain?

Only mechanisms that every product needs and that no domain owns: configuration and constants; the SQLite driver plus unit-of-work; the calendar/clock and action-cost authority; the ledger primitives and account codes; ID generation and seeded RNG; the module runtime (manifest, registry, dependency resolver, capability broker); the transport-neutral router; logging/audit hooks; and the schema-ownership registry. **Not** in Core: `player_state`, inventory rules, market pricing, combat resolution, quests, factions, NPC lifecycle, or any `master_*` content.

### C. Which modules should become DLC?

Business DLC: `economy`, `market`, `professions`, `progression`, `social-kizuna`, `lineage-succession`, `faction-politics`, `military`, `life`, `equipment`. Base modules: `player`, `world` (map/settlements/ecology), `npc`, `content` (master catalog). Integrations: `mcp`, `agent-bridge`. UI DLC: `web-ts`, frozen `web-legacy`. Platform extensions: `instances`, verification/content tooling.

### D. Which modules should not be split?

- `contextual-actions` (2,105 lines): it is a cross-domain action aggregator, effectively a read-model/BFF; splitting it creates a hub that depends on everything.
- `instances` (1,085 lines): it is deployment/session infrastructure, not a business capability; keep it in the platform.
- The 18 `engine/*-bridge.js` files: they are an adapter layer; splitting each into a project would create wrapper hell.
- The legacy UI: freeze and shrink; do not modularize a codebase scheduled for replacement.

### E. Where should contract boundaries be?

At **capability names**, not table names and not HTTP paths. A module publishes a small set of versioned capabilities (`inventory.stock.issue`, `ledger.cash.post`, `world.route.reachable`, `market.price.quote`); other modules consume them through a typed broker. HTTP controllers live at the edge and call capabilities. Contracts contain DTOs and errors, never SQL, ORM entities, `Router`, or DOM types.

### F. Which runtime fits each module?

Embedded (same process) for every business DLC and base module. Isolated process for `mcp` (already true) and optionally `agent-bridge` if LLM calls become long-running. Distributed runtime: **not recommended** — there is no measured need and it would break the single-file ACID ledger that the product depends on.

### G. How should database ownership work?

**Hybrid within one SQLite file.** Keep one database for ACID guarantees, but make ownership explicit: one owning module per table, writes only through that module's capabilities, read contracts for everyone else, and a schema-ownership manifest enforced by the architecture guard. Do not split databases per DLC; SQLite cross-file atomicity, migrations, and backups would all become harder for no product benefit.

### H. Can multiple products share one Core?

**Yes, once the composition root reads a manifest.** The repository already contains three plausible product shapes: a merchant campaign, a warlord campaign, and a full sandbox. Today they are code-level variants; with a manifest they become configuration plus module selection.

### I. Which module should be extracted first, and why?

**`market`, starting with its `warehouse` slice.** It has the best combination of business cohesion (5/5), data ownership (15 of its 17 tables are single-writer), route volume (21 routes), an existing TypeScript UI slice, and a low blast radius. It also produces an immediately useful contract set (`inventory.reserve`, `inventory.move`, `player.cash.post`, `logistics.route`). `lineage-succession` scores slightly higher on ownership but has lower product value; it should be the second extraction, used to prove the pattern on a second domain.

### J. What must change before DLCs can run independently?

1. A `ModuleManifest` with `requires` / `provides` / `consumes` and `apiVersion`.
2. A resolver that validates the graph before any `init` runs.
3. Route registration moved into the module contract.
4. A capability broker with typed, versioned contracts.
5. A fixed event/command delivery path (or explicit removal of the EventBus from module contracts).
6. A table-ownership manifest plus an architecture-guard rule that fails on foreign writes.
7. A product manifest and a composition root that reads it.
8. A module-aware migration runner and a compatibility check against the Core API version.

### K. Can the target become a Universal Application Platform?

**A universal *simulation* platform: yes. A generic enterprise application platform: no — not without replacing the domain data and the single-player assumptions.** The reusable primitives (time, ledger, capability runtime, module lifecycle, map/POI graph, NPC lifecycle) are genuinely portable to other simulation products (trade, city-building, logistics, political strategy). They are not a substitute for identity, authorization, multi-tenancy, or enterprise integration, none of which exist here.

---

## Recommended program in one page

| Phase | Outcome | Effort (engineer-days) | Risk |
| --- | --- | --- | --- |
| 0 | This audit, ownership map, dependency rules | done | — |
| 1 | Core contracts + manifest + resolver + route ownership | 6–9 | Medium |
| 2 | Fix event delivery; introduce capability broker; first module (`market.warehouse`) at Level 1 | 8–12 | Medium |
| 3 | Full `market` DLC + table-ownership guard + module migrations | 10–15 | Medium |
| 4 | Product manifests (merchant / warlord / sandbox) and composition root | 5–8 | Low |
| 5 | Second and third DLC (`lineage`, `military`) at Level 2 | 15–25 | High |
| 6 | Optional isolated runtime for `agent-bridge`; never for business DLC | 5–10, only if needed | Low |

Total to a credible Level-2 platform for three DLCs: **≈ 50–80 engineer-days**, with no big-bang rewrite.

**Kill criteria:** if after Phase 2 the capability boundary requires more than ~15 capabilities for `market.warehouse`, or if the ownership guard cannot be made green without rewriting more than 10 write sites, stop and keep the modular monolith. The architecture is not the product; the game is.

---

## Document map

| File | Question answered |
| --- | --- |
| `01-repository-inventory.md` | What exists, where, and how it boots |
| `02-dependency-analysis.md` | What depends on what, and which cycles hurt |
| `03-core-boundaries.md` | What is genuinely Core |
| `04-dlc-boundaries.md` | Module catalog, independence levels, extraction order |
| `05-contract-capability-design.md` | Contracts, capabilities, versioning |
| `06-runtime-lifecycle.md` | Runtime options and module lifecycle |
| `07-data-ownership.md` | Table ownership and consistency strategy |
| `08-product-composition.md` | Manifests and multi-product composition |
| `09-target-architecture.md` | Target source layout |
| `10-migration-roadmap.md` | Phased, reversible migration |
| `11-risk-and-technical-debt.md` | Debt register and program risks |
| `12-architecture-decisions.md` | ADR log for the program |
