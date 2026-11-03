# 03 — Core Boundaries

**Question:** which parts of this repository are genuinely platform, and which only look generic because they live in `src/shared/`?

**Method.** Every candidate was read and scored against the seven criteria from the brief. Scores are 1–5; for criteria phrased negatively (business coupling, runtime coupling) the score is inverted so that **5 is always good**.

| # | Criterion | 5 means |
| --- | --- | --- |
| C1 | Business independence | No domain concept in the code |
| C2 | Multi-product reuse | Useful to a merchant game, a war game and a non-game simulation |
| C3 | Module independence | Works if every business module is deleted |
| C4 | Abstraction stability | Interface unlikely to change when gameplay changes |
| C5 | UI/DB independence | No DOM, no product schema |
| C6 | Replaceability | Implementation can be swapped without touching consumers |
| C7 | Extensibility | New modules can use it without modifying it |

---

## 1. What is called "core" today

| Path | Lines | Actual responsibility | Verdict |
| --- | --- | --- | --- |
| `src/core/database.ts` | 170 | One cached `better-sqlite3` connection per path; WAL/FK/busy timeout; typed query/execute/transaction; contextual errors | **Core** |
| `src/core/module-registry.ts` | 72 | Singleton list of `IFeatureModule`; sequential `initAll`; `destroyAll` | **Core seed**, insufficient |
| `src/core/event-bus.ts` | 54 | In-memory pub/sub with sync/async handlers; swallows handler errors | **Core seed**, currently disconnected |
| `src/core/types.ts` | 303 | Domain interfaces (`SettlementState`, `ArmyState`, `KizunaRelation`, …) plus `IFeatureModule` | **Mixed** — split into contracts vs domain |
| `src/core/rng.ts` | small | Seeded RNG | **Core** |
| `src/server/router.ts` | 318 | Framework-free HTTP router | **Core mechanism**, wrong package |
| `src/shared/ledger.ts` | 148 | Player capital, cashflow writer, double-entry writer | **Core** |
| `src/shared/account-codes.ts` | — | Chart of accounts + aliases | **Core** |
| `src/shared/action-time.ts` | 98 | Server-authoritative action cost enforcement | **Core** |
| `src/shared/constants.ts` | — | Currency/grain/calendar/fatigue constants | **Core** |
| `src/shared/id-generator.ts` | — | Deterministic sequence IDs | **Core** |
| `src/shared/game-clock.ts`, `game-date.ts` | — | Date math helpers | **Core** |
| `src/shared/action-journal.ts` | — | Idempotency journal | **Core** |
| `src/shared/day-ledger.ts`, `turn-ledger.ts` | — | Per-module day/turn completion ledgers | **Core** (time) |
| `src/shared/projection-sync.ts` | — | Markdown projection bridge (spawns process) | **Platform tooling**, not Core |
| `src/shared/market-quote.ts`, `world-price.ts`, `market-price-book.ts` | — | Pricing formulas and catalog lookups | **DLC (economy)** |
| `src/shared/character-stats/*` | 5 files | Attributes, vitals, mastery, progression calculators | **DLC (progression)** |
| `src/shared/player-bag.ts`, `inventory-movement.ts` | — | Player inventory rules | **Base module (player)** |
| `src/shared/logistics-risk.ts` | — | Ambush/insurance resolver | **DLC (market)** |
| `src/shared/prestige.ts`, `victory.ts`, `business-succession.ts`, `legacy-store.ts` | — | Fame, victory, succession, NG+ | **DLC (progression / lineage)** |
| `src/shared/settlement-ledger.ts`, `faction-ledger.ts` | — | Treasury ledgers for world entities | **Base world / DLC politics** |
| `engine/time-manager.js` | 541 | Calendar advance, day/month ticks, grain upkeep, fatigue | **Core (time)** |
| `engine/action-policy.js` | 71 | Action cost table | **Core data**, module-extensible |
| `engine/date-utils.js` | 159 | 30-day calendar math | **Core** |
| `engine/rules.js` | 115 | BOM and defect rate | **DLC (professions)** |
| `engine/projector.js` | 71 | Markdown projection | **Platform tooling** |
| `engine/db-adapter.js` | 169 | CJS twin of `DatabaseService` | **Core adapter** (must converge) |
| `engine/gameplay-manager.js` | 1,044 | Turn loop and month close | **Runtime orchestration**, not Core |

**Conclusion:** the folder named `core` is only part of the Core. Several business rules live in `shared`, and two mechanisms live in `engine`.

---

## 2. Candidate scoring

| Candidate | C1 | C2 | C3 | C4 | C5 | C6 | C7 | Total /35 | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SQLite driver + connection registry | 5 | 5 | 5 | 5 | 4 | 5 | 5 | **34** | Core Kernel |
| Unit of work / transaction wrapper | 5 | 5 | 5 | 5 | 4 | 5 | 5 | **34** | Core Kernel |
| Calendar & clock authority | 5 | 5 | 4 | 5 | 5 | 4 | 4 | **32** | Core Kernel |
| Action-time policy enforcement | 4 | 5 | 4 | 4 | 5 | 4 | 5 | **31** | Core Kernel |
| Ledger writer + chart of accounts | 4 | 5 | 5 | 5 | 4 | 4 | 4 | **31** | Core Kernel |
| Deterministic ID + seeded RNG | 5 | 5 | 5 | 5 | 5 | 5 | 4 | **34** | Core Kernel |
| Module registry / resolver | 5 | 5 | 5 | 4 | 5 | 4 | 5 | **33** | Core Kernel |
| Capability broker (proposed) | 5 | 5 | 5 | 4 | 5 | 5 | 5 | **34** | Core Kernel |
| Event bus / outbox (proposed fix) | 5 | 5 | 4 | 3 | 5 | 5 | 4 | **31** | Core Kernel |
| Config loader + constants | 4 | 5 | 5 | 5 | 5 | 4 | 4 | **32** | Core Services |
| Logging / audit hooks | 5 | 5 | 5 | 5 | 5 | 4 | 4 | **33** | Core Services |
| HTTP router | 4 | 5 | 4 | 5 | 5 | 5 | 4 | **32** | Core Adapter |
| Schema-ownership registry (proposed) | 5 | 5 | 5 | 4 | 4 | 4 | 5 | **32** | Core Services |
| Migration runner | 4 | 5 | 4 | 5 | 5 | 4 | 4 | **31** | Core Services |
| Market price formulas | 2 | 3 | 1 | 3 | 5 | 4 | 3 | **21** | DLC (economy) |
| Character stats calculators | 2 | 3 | 1 | 3 | 5 | 4 | 3 | **21** | DLC (progression) |
| Inventory/bag rules | 2 | 4 | 2 | 3 | 4 | 3 | 3 | **21** | Base (player) |
| Prestige/fame rules | 2 | 3 | 1 | 3 | 5 | 3 | 3 | **20** | DLC (progression) |
| Victory conditions | 1 | 2 | 1 | 2 | 4 | 2 | 2 | **14** | Product/DLC |
| Logistics risk | 2 | 3 | 1 | 3 | 4 | 3 | 3 | **19** | DLC (market) |
| Markdown projection | 3 | 4 | 3 | 4 | 3 | 4 | 3 | **24** | Platform tooling |
| Turn/month orchestration | 3 | 4 | 2 | 3 | 5 | 2 | 4 | **23** | Runtime services |

**Cut line:** ≥ 31 = Core; 24–30 = platform service/adapter or base module; ≤ 23 = domain/DLC.

---

## 3. A. Core Kernel (required)

The kernel is the minimum that must exist for a module to be installable. It owns **no gameplay rule**.

### K1. Data access and unit of work

- One `Db` abstraction over `better-sqlite3`, with `query`, `queryOne`, `execute`, `transaction`, and error context (already exists in `database.ts`).
- A `UnitOfWork`/`DbSession` object passed to a module, scoped to one request or one turn. It exposes `transaction(fn)` and forbids global `getInstance` inside module code.
- One connection registry keyed by resolved path (exists).
- **Must not** contain table names, SQL for a domain, or module-specific pragmas.

### K2. Clock and calendar

- `GameDate` value object (year/month/day, 30-day month, 12-month year).
- `Clock` port: `today()`, `advance(days)`, `phase()`, `monthBoundary()`.
- `ActionCostPolicy` as data (from `engine/action-policy.js`), extensible by modules but stored in Core.
- Day/month tick publication with idempotency keys (the `world_day_ledger` / `world_turn_ledger` tables already model this).

### K3. Ledger and accounting

- `Ledger.post(entry)` and `Ledger.postDoubleEntry(entry)` with the existing `balance = liquid + safe` definition.
- `AccountCode` registry and canonicalisation.
- A `LedgerError` for unbalanced/backdated entries.
- **Must not** know about businesses, trade, salaries, or loot categories; those supply account codes.

### K4. Identity and determinism

- `IdGenerator` with `next(prefix, scope)` backed by `id_sequence`.
- `Rng` with explicit seed propagation; `Math.random` banned in `src/modules` and `src/shared` (already enforced by arch-guard).
- `Clock.now()` is **not** allowed inside domain logic; callers pass the game date.

### K5. Module runtime

- `ModuleManifest`, `ModuleRegistry`, `DependencyResolver`, `Lifecycle`, `CapabilityBroker`.
- Validation before `init`: required modules present, API versions compatible, capabilities resolvable, migrations pending, config schema valid.
- Deterministic topological order; optional modules may fail with a recorded reason; required modules fail fast.

### K6. Event/command delivery

Choose **one** of:

- **K6a. In-process publisher with explicit subscriber registration** (cheapest), or
- **K6b. Transactional outbox + dispatcher** (needed only if modules can run in another process).

For the current product, **K6a is sufficient**, but it must be injected, not discovered through `globalThis`. The existing `EventBus` is acceptable as an implementation if `ModuleContext` carries it and the bus is owned by the runtime, not by a module.

### K7. Transport contract

- A `RouteRegistrar` interface (`register(router: HttpRouter)`), with the router type in contracts.
- Business modules do not import `src/server`.
- The HTTP adapter is one implementation; an MCP adapter can reuse the same capability broker.

### K8. Configuration

- Typed access to `config/game-constants.json` and module config sections.
- Module-scoped config is validated at registration; unknown keys are rejected in strict mode.

### K9. Observability

- `Logger` with module scope and correlation ID (turn, request, txn).
- Audit hook: every mutation records actor, module, action, entity, before/after hash.
- Invariant runner registration: modules contribute checks; `sim-audit` consumes them.

---

## 4. B. Core Services (recommended, not all mandatory)

| Service | Needed now? | Why | Notes |
| --- | --- | --- | --- |
| Configuration | Yes | Constants already exist | Promote `config/*.json` + module sections |
| Logging | Yes | Currently `console.*` everywhere | Small interface, no framework |
| Audit infrastructure | Yes | 1,000+ invariants already exist | Expose `registerInvariant` |
| Caching | No | No measured hot path requiring it | Add only with a benchmark |
| Scheduling | Partly | Day/month ticks + `active_tasks` exist | Keep in clock, not a general scheduler |
| Security/auth abstraction | No | Single-player, no auth | Do not build |
| Authorization abstraction | No | No roles/permissions | Do not build |
| Localization | No | UI has `i18n.js`; server strings are Vietnamese | Keep UI-local until a product needs server i18n |
| Notification | No | No push/email | Do not build |
| Storage abstraction beyond SQLite | No | SQLite is the product's source of truth | Do not abstract for its own sake |

**Principle:** Core provides *mechanisms*; a Base Module provides *policy*. Authorization is a mechanism; roles and permissions are a base module (not present today, and not needed for this product).

---

## 5. C. Infrastructure Adapters (implementation, not contract)

| Adapter | Current file | Contract it should implement |
| --- | --- | --- |
| SQLite driver (TS) | `src/core/database.ts` | `Db` |
| SQLite driver (CJS) | `engine/db-adapter.js` | Same `Db` shape, one implementation path |
| HTTP server | `src/server/router.ts` + `tools/sim-web.js` | `HttpAdapter` |
| MCP transport | `src/mcp/server.ts` | `ToolAdapter` over capabilities |
| Filesystem/projection | `engine/projector.js`, `src/shared/projection-sync.ts` | `ProjectionWriter` |
| Master content loader | `tools/ingest-markdown-master.js` | `ContentImporter` |
| LLM/semantic memory | `src/modules/agent-bridge`, `context-dialogue.service.ts` | `MemoryStore` (integration) |
| ORM | none | **No adapter needed**; the SQL layer is deliberate |
| Message broker | none | **No adapter needed**; no async messaging in the product |
| Cache provider | none | **No adapter needed**; add only with a measured hot path |
| External HTTP client | none in gameplay | Keep integrations at the edge; do not add a generic client to Core |

Adapters are replaceable; contracts are not. Today `engine/db-adapter.js` and `src/core/database.ts` are two independent implementations of the same policy with subtle differences (e.g. missing-file handling). **[V]** They should converge behind one contract before DLC packaging.

---

## 6. What is explicitly NOT Core

| Thing | Why not | Where it belongs |
| --- | --- | --- |
| `player_state` schema and cash/inventory updates | Product-specific aggregate | Base module `player` |
| Market price elasticities, endowment, crisis multipliers | Gameplay rules | DLC `economy` |
| Recipes, crops, tool wear, workshop P&L | Gameplay rules | DLC `professions` |
| Skills, perks, talents, fame, quests | Gameplay rules | DLC `progression` |
| NPC lifecycle, ambition, career shifts | Gameplay rules | Base module `npc` |
| Family, marriage, genetics, wills | Gameplay rules | DLC `lineage` |
| Factions, diplomacy, unrest | Gameplay rules | DLC `politics` |
| Combat, sieges, duels, supply graph | Gameplay rules | DLC `military` |
| Map POIs, routes, sub-locations | Content + world model | Base module `world` |
| `master_*` catalog | Content | Base module `content` |
| Victory conditions, NG+ | Product rules | Product manifest / DLC |
| Instances, session reset | Deployment/session management | Platform extension |

---

## 7. Proposed Core package shape

```text
platform/
  contracts/
    module.ts          # ModuleManifest, ModuleContext, LifecycleState
    capability.ts      # CapabilityDescriptor, CapabilityToken, Broker
    data.ts            # DbSession, UnitOfWork, Query/Command result
    time.ts            # GameDate, Clock, ActionCost
    ledger.ts          # LedgerEntry, AccountCode, LedgerPort
    events.ts          # EventEnvelope, EventPublisher, Outbox
    transport.ts       # HttpRouter, RouteRegistrar, HttpResult
    config.ts          # ConfigSchema, ModuleConfig
    errors.ts          # DomainError, Result
  core/
    data/sqlite.ts     # the only driver wrapper
    data/migrations.ts # module-aware runner
    time/clock.ts
    time/action-policy.ts
    ledger/ledger.ts
    ledger/accounts.ts
    ids/id-generator.ts
    ids/rng.ts
    events/bus.ts
    kernel/registry.ts
    kernel/resolver.ts
    kernel/capabilities.ts
    kernel/lifecycle.ts
    kernel/ownership.ts
    config/loader.ts
    observability/logger.ts
    observability/invariants.ts
```

**Size target:** 2,500–4,000 lines, of which ~1,200 already exist in `src/core`, `src/shared`, and four engine files.

---

## 8. Core extraction sequence (no behaviour change)

| Step | Action | Verification |
| --- | --- | --- |
| 1 | Copy `engine/time-manager`, `date-utils`, `action-policy` behind a TS facade; keep the engine calling the facade | All time suites green; no change in `advanceTime` results |
| 2 | Move `Router` type to contracts; keep implementation in `server/` | `lint:api`, route shadow, 216 routes unchanged |
| 3 | Give `ModuleRegistry` a public `context` and inject it into modules; delete `globalThis` discovery in engine | New test asserting tick publication without a fake global |
| 4 | Add `DbSession` injection; keep `getInstance` as a deprecated shortcut | Typecheck + suites; no SQL changes |
| 5 | Split `src/core/types.ts` into contracts (module/capability) and domain types per base module | Typecheck |
| 6 | Add manifest and resolver alongside the old registration path | New resolver tests; old boot unchanged |
| 7 | Add schema-ownership manifest and a warning-only guard | Guard reports foreign writes, does not fail |

Each step is independently revertible. The Core never changes gameplay in this phase.

---

## 9. Core invariants (must hold forever)

1. **No business noun in Core.** A class in Core must not mention cash, market, crop, sword, faction, quest, or family.
2. **No module imports in Core.** Core compiles with only `contracts`.
3. **No global lookup in Core.** Dependencies arrive through constructors/context.
4. **No hidden time.** Every mutation takes an explicit `GameDate`; `Date.now()` is for logs only.
5. **One ledger writer.** All cash paths use the ledger port; the arch-guard rule stays at zero.
6. **One driver.** TS and CJS must not implement SQLite policy twice.
7. **Determinism.** Same seed + same inputs = same outputs; RNG and IDs are injected.
8. **Fail loud.** No empty catch in Core; errors carry module, entity, and operation.

---

## 10. Core boundary verdict

The Core is **real but scattered**: roughly 60% of a solid kernel already exists across `src/core`, `src/shared`, and four engine files. The missing 40% is not exotic technology; it is the **module runtime and the contract surface**:

- manifest + dependency resolution,
- capability broker,
- transport-neutral routes,
- module-scoped data session,
- schema ownership,
- event delivery that actually works.

Everything else currently labelled "core" or "shared" must be sorted into base modules (`player`, `world`, `npc`, `content`) or DLC (`economy`, `progression`, `market`, …). Doing that is the prerequisite for `04-dlc-boundaries.md`.
