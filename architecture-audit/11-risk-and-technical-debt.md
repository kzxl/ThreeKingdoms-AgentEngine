# 11 — Risk & Technical Debt

**Purpose:** record the debt that blocks Core/DLC extraction, and the risks created by the extraction program itself. Every item has evidence and a concrete disposition.

---

## 1. Debt register

Severity considers both correctness and the cost of leaving it in place.

| ID | Debt | Severity | Evidence | Impact | Disposition |
| --- | --- | --- | --- | --- | --- |
| D-01 | Event bus is disconnected in production | **Critical** | `time-manager.js:56-60`, `gameplay-manager.js:545`; runtime probe: no `ctx` on registry or utility-ai; tests inject fake global (`verify-logic-ownership.ts:44-55`) | Any event-based module contract is a lie; `WORLD_DAY_TICK`/`WORLD_MONTH_TICK`/`TURN_ADVANCED` never reach subscribers in a normal boot | Fix in Phase 1 before any event contract |
| D-02 | Module registry is a registration list | **Critical** | `module-registry.ts:39-58`; `IFeatureModule` has 4 fields | No dependency resolution, version checks, enable/disable, or partial failure policy | Add manifest + resolver (Phase 1) |
| D-03 | Player aggregate has 12 writers | **Critical** | `player_state`: 12 units, 84+56+52… write sites; concrete examples in `07-data-ownership.md` §2 | Cannot remove, version, or license any module that touches cash | Mediate with `player.cash.post` / `inventory.*` |
| D-04 | Engine ↔ modules cycle | **High** | 18 `engine/*-bridge.js`; 15 module→engine imports; `shared/action-time.ts:54` | No one-way core; a DLC package still needs the legacy engine | Move time/date/policy into Core; convert bridges to adapters |
| D-05 | Transport embedded in business modules | **High** | 20 controllers import `src/server/router`; `blacksmith-forge.service.ts:25` | DLC cannot be hosted by MCP/CLI; transport change touches every module | Move router types to contracts; modules own routes |
| D-06 | Hardcoded product composition | **High** | `main.ts:20-39, 52-68, 91-111` | Multi-product requires a code fork | Product manifest (Phase 4) |
| D-07 | Runtime DDL in module init | **High** | `agent-bridge.module.ts:47-57` creates `npc_episodic_memories` | Migrations are not the only schema source; partial boot can leave schema | Move DDL to a migration; arch-guard rule |
| D-08 | Runtime writes to master content | **High** | `context-dialogue.service.ts:216-235` dual-writes `master.db`; `recipes-seed.ts:272-300` inserts `master_items`/`master_recipes` from `enterprise-labor.service.ts:399` | Master data is mutable at runtime; two files can diverge | Publish to content build; runtime writes session only |
| D-09 | Two SQLite policy implementations | **Medium** | `src/core/database.ts` vs `engine/db-adapter.js`; missing-file behaviour differs | Two bug surfaces; divergent pragmas/errors | Converge behind one `Db` contract |
| D-10 | Tests encode fake runtime wiring | **Medium** | fake `registry.ctx` in tests; `tests/verify-audit-recommendations.ts:56-58` | Green tests hide a broken production path | Add a real-boot event test; remove fakes |
| D-11 | Legacy UI is 17.8k lines and frozen | **Medium** | 21 scripts, 64 inline handlers, arch baseline 21 | UI DLC cannot be composed; route moves risk breakage | Freeze, replace slice by slice |
| D-12 | Two client architectures | **Medium** | `public/js` + `src/client`; `legacy-bridge.ts:52-72` leaves legacy modals | Duplicate renderers; inconsistent UX | One renderer per modal id; shrink legacy |
| D-13 | No dependency-direction enforcement | **High** | `arch-guard.js` has 10 rules; none checks module→module or module→server | Cycles can grow silently | Add dependency rule to the guard |
| D-14 | 83 SQL template interpolations | **Medium** | `tools/arch-baseline.json` rule `sql-interpolation: 83` | Injection/quoting risk; blocks prepared-statement refactor | Ratchet down per module |
| D-15 | Global service locator in engine | **Medium** | `globalThis.__GRAND_STRATEGY_MODULES__` in 3 engine files; 4 `globalThis` in `src` | Hidden runtime contract; no isolation | Inject a kernel handle |
| D-16 | 38 singletons, 100 `getInstance` sites | **Medium** | `grep "private static instance"`; `DatabaseService.getInstance` | Parallel tests and per-request scoping are fragile | Constructor/context injection incrementally |
| D-17 | Single active database per process | **Medium** | `sim-web.js:256-266` returns 409 | One campaign per process; no per-request tenancy | Accept; document; keep `DbSession` seam |
| D-18 | No auth, permissive CORS | **Low (product)** | `sendJson` sets `*`; no auth anywhere | Anyone on LAN can play or reset a campaign | Deployment guidance; revisit if multiplayer |
| D-19 | No module/contract versioning | **High** | `IFeatureModule.version` is a string, never checked | Upgrades and third-party DLC are unsafe | `apiVersion` + ranges (Phase 1) |
| D-20 | Documentation drift | **Low** | `ARCHITECTURE.md` §7–23; memory says numbers changed repeatedly | Agents and humans act on stale facts | This audit; re-verify before citing |
| D-21 | Test suites depend on a live save | **Medium** | five suites historically red on stale dev save; memory notes drift | Flaky gate; hard to isolate module tests | Sandbox per suite; `SIM_DB_PATH` fixtures |
| D-22 | `tsx` is a dev dependency used at runtime | **Low** | `package.json`; `engine/*-bridge.js` | Production install must include dev deps | Move `tsx` to dependencies or compile the server |
| D-23 | Native `better-sqlite3` ABI | **Low** | single runtime dependency | Node upgrade breaks the binary | Pin Node; CI matrix |
| D-24 | No observability beyond `console.*` | **Low** | no logger package | Hard to diagnose module failures in production | Add scoped logger in Core |

---

## 2. Debt that must be paid before extraction

Only these block Phase 1–2:

| Order | Debt | Why it blocks |
| --- | --- | --- |
| 1 | D-01 event delivery | Any event contract would be untestable in production |
| 2 | D-02 registry | No dependency graph to resolve |
| 3 | D-19 versioning | No compatibility check |
| 4 | D-05 transport | Modules cannot own routes or be hosted elsewhere |
| 5 | D-03 player aggregate | The first DLC (market) writes cash and inventory |
| 6 | D-13 dependency guard | Without it, old cycles reappear during the move |

D-04, D-06, D-07, D-08, D-09 can be paid in parallel or after the pilot.

---

## 3. Program risks

These are risks **created by doing the extraction**, not existing defects.

| ID | Risk | Probability | Impact | Mitigation | Trigger to stop |
| --- | --- | --- | --- | --- | --- |
| R-01 | Over-modularization / project explosion | High | High | Folders first; packages only for deployment/versioning reasons; no project per feature | More than ~20 packages for 14 modules |
| R-02 | Registry becomes a service locator | High | High | Constructor/context injection; broker only for declared capabilities; no `get('anything')` | Modules call arbitrary IDs at runtime |
| R-03 | Event-driven architecture makes debugging hard | Medium | High | Capabilities for consistency; events for notifications only; correlation IDs | A bug requires replaying a chain of 5+ events |
| R-04 | Contract version matrix explodes | Medium | Medium | Version capabilities, not DTOs; current + previous major only | More than 2 supported Core majors |
| R-05 | Hot reload and dynamic plugins creep in | Medium | Medium | Explicit non-goal; `tsx watch` only | A PR adds a module loader |
| R-06 | Package manager built without need | Medium | Medium | Manifest + folder discovery first; no registry server | A "marketplace" appears before 3 products exist |
| R-07 | Distributed runtime temptation | Low | Critical | Embedded by default; only MCP/agent isolated | A gameplay module gets an HTTP client |
| R-08 | Splitting the database | Low | Critical | Hybrid single-file; explicit ADR | A proposal to give a DLC its own DB |
| R-09 | UI rewrite scope creep | High | High | Legacy UI is out of scope; replace only when a route moves | The program starts restyling screens |
| R-10 | Test gate erosion | Medium | High | Every step keeps `verify` + `audit` green; no baseline increases | A ratchet baseline is raised to land a refactor |
| R-11 | Contract abstraction without consumers | High | Medium | Add a capability only with 2 consumers or 1 integration | A capability has zero callers after a release |
| R-12 | Module extraction changes gameplay | Medium | Critical | Refactor-only commits; behaviour tests and golden contracts; perf compare | Any gameplay diff in a structural PR |
| R-13 | Ownership guard blocks delivery | Medium | Medium | Ratchet per module; report-only first | Guard goes hard before migration |
| R-14 | Product manifests diverge from code | Medium | Medium | Generate `/api/system/modules` from runtime truth; CI validates manifests | Manifest lists a module that cannot boot |
| R-15 | Team treats folders as DLC | High | Medium | Definition of "module" in `04`; manifest + capability required | A "DLC" PR has no manifest |

---

## 4. Decision classification

Per the brief, each architectural choice is classified as **Necessary**, **Recommended**, **Optional**, or **Not Recommended**.

| Decision | Classification | Rationale |
| --- | --- | --- |
| Module manifest + dependency resolver | **Necessary** | Without it, DLC selection and boot safety are impossible |
| Capability broker with typed contracts | **Necessary** | The only way to remove cross-module source imports |
| Table ownership manifest + guard | **Necessary** | Uninstall/versioning requires it |
| Module-owned migrations | **Necessary** | Runtime DDL and shared migrations break upgrade safety |
| Transport-neutral route registration | **Necessary** | Modules must not import the HTTP server |
| Fixing event delivery | **Necessary** | Current events are test-only |
| Product manifest | **Recommended** | Enables multi-product without a fork; can start minimal |
| Contract versioning (`apiVersion` + semver) | **Recommended** | Needed before third-party or independent DLC releases |
| Separate `DbSession` per module | **Recommended** | Enables ownership and future per-request scoping |
| npm workspaces / packages | **Optional** | Only when products release independently |
| Outbox / dispatcher | **Optional** | Only for isolated integrations; not for gameplay |
| Isolated runtime for `agent-bridge` | **Optional** | Only if LLM I/O threatens the loop |
| Licensing (`static`) | **Optional** | Commercial decision; not architectural |
| Licensing server | **Not Recommended** | Availability/privacy cost with no current need |
| DI container | **Not Recommended** | Constructor/context injection is enough |
| ORM | **Not Recommended** | The audited SQL layer is an asset |
| Hot reload of modules | **Not Recommended** | Unsafe with SQLite state and in-flight transactions |
| Distributed runtime / microservices | **Not Recommended** | Breaks ACID; no scaling/multi-tenant need |
| Separate database per DLC | **Not Recommended** | Same |
| Package marketplace / dynamic third-party loader | **Not Recommended (now)** | Premature contract freeze; no ecosystem |
| UI framework migration in this program | **Not Recommended** | Separate, larger project; dilutes the goal |
| Rewriting `engine/` from scratch | **Not Recommended** | Highest risk, no product value; extract gradually |
| Versioning every DTO | **Not Recommended** | Type explosion with no compatibility gain |
| One capability per service method | **Not Recommended** | Registry becomes a remote control |

---

## 5. Cost of doing nothing

If the repository stays as-is:

- Every new feature adds writers to `player_state`, `inventory_items`, and `npc_state`; the 30 shared tables grow.
- The engine/module cycle deepens with each bridge.
- The second product remains a code fork.
- Module removal stays impossible; so does commercial DLC separation.
- The event bus remains a test-only illusion, so cross-module reactions keep being implemented as direct calls, reinforcing the coupling.

This is a **slow architectural erosion**, not an immediate failure. The game still runs; the cost is paid in every future feature and in the inability to package anything.

---

## 6. Cost of over-correcting

If the team adopts the full target at once:

- 14 modules × 4 layers × manifests × migrations creates a large amount of structure for a single-player game.
- Contract ceremony can exceed the code it protects (`warehouse` is 7 routes; a full capability stack is disproportionate).
- Debugging becomes indirect exactly when gameplay needs fast iteration.
- The legacy UI and engine still dominate runtime behaviour, so the new structure may describe a system that does not exist yet.

**Therefore:** extract **two** modules end-to-end before generalizing. Use the pilot to calibrate the number of capabilities, the granularity of ownership, and the manifest schema.

---

## 7. Risk-adjusted recommendation

1. Pay D-01, D-02, D-19, D-05, D-13 in Phase 1. They are small, local, and unlock everything.
2. Build the inventory/cash contracts and extract `market.warehouse` (Phase 2). If this exceeds the kill criteria, stop.
3. Extract full `market`, then `lineage`. Two different domains prove the pattern.
4. Add product manifests only after two DLCs work.
5. Leave `military`, `professions`, and `economy` for last; they are the highest-risk moves.
6. Never split the database, never distribute gameplay, never build a marketplace.

---

## 8. Risk verdict

The technical debt is **real but concentrated**: six items block extraction, and they are all in the kernel/transport/ownership layer, not spread across the 40k lines of gameplay. The program's biggest risk is not the existing code; it is **over-engineering the target**. The mitigation is a small kernel, two pilot DLCs, and explicit kill criteria.
