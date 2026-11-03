# 12 — Architecture Decisions

**Status legend:** **Proposed** = recommended by this audit, awaiting owner approval. **Accepted** = already true in the repository (recorded for continuity). **Superseded** = replaced by a later decision.

All decisions are read-only outcomes of the audit. Nothing here changes source, schema, or configuration.

---

## Decision index

| ID | Decision | Status | Impact |
| --- | --- | --- | --- |
| AUD-001 | Audit is read-only; extraction starts only after approval | Accepted | No source/DB changes |
| AUD-002 | Target is a modular monolith, not microservices | Proposed | Runtime stays one process |
| AUD-003 | Core owns mechanisms, not gameplay | Proposed | Kernel scope |
| AUD-004 | Manifest + resolver before module splitting | Proposed | Phase order |
| AUD-005 | Capability contracts replace cross-module imports | Proposed | Contract surface |
| AUD-006 | One SQLite file + ownership manifest (hybrid) | Proposed | Data architecture |
| AUD-007 | Content is immutable at runtime | Proposed | `master.db` policy |
| AUD-008 | Events are notifications, not transactions | Proposed | Consistency model |
| AUD-009 | Modules own their routes; transport at the edge | Proposed | HTTP layering |
| AUD-010 | Product composition via manifest, not code | Proposed | Multi-product |
| AUD-011 | Module-owned migrations with `module_id` | Proposed | Upgrade safety |
| AUD-012 | Embedded runtime by default; isolation only at edges | Proposed | Runtime |
| AUD-013 | First DLC is `market.warehouse` | Proposed | Extraction order |
| AUD-014 | No project per feature; folders inside a DLC | Proposed | Source layout |
| AUD-015 | Separate Installed/Enabled/Licensed; defer licensing | Proposed | Commercial gating |
| AUD-016 | Freeze legacy UI and replace slice by slice | Accepted (policy already in arch guard) | UI scope |
| AUD-017 | Kill criteria for the extraction program | Proposed | Governance |

---

## AUD-001 — Audit is read-only

**Context:** the brief forbids source, database, and refactor changes during analysis. The repository has a 112-suite gate and a live save; an exploratory write would invalidate both.

**Decision:** this audit creates only files under `architecture-audit/`. No source file, migration, config, or database row is modified. Measurements are taken from read-only queries and existing tooling.

**Consequences:**

- All recommendations are proposals, not applied changes.
- The live `saves/session.db` remains the user's campaign state.
- One read-only execution of `tools/api-golden.js` was used to measure 28 contracts; it booted against `tests/.golden-run/session.db`, not the live save.

**Status:** Accepted.

---

## AUD-002 — Target is a modular monolith, not microservices

**Context:** single-player, one campaign per process, one SQLite file, cross-cutting ACID transactions for cash + inventory + time. No multi-tenant or scaling evidence.

**Decision:** keep one deployable Node process. Use module boundaries for code ownership, packaging, and product selection — not for network distribution. Isolated runtime is allowed only for integrations (`mcp`, optional `agent-bridge`).

**Consequences:**

- Business DLCs share one transaction; no saga/outbox for gameplay.
- A module cannot be scaled independently; that is acceptable.
- The design remains open to per-request database scoping later via `DbSession`.

**Alternatives rejected:** microservices, separate process per DLC, separate database per DLC.

**Status:** Proposed.

---

## AUD-003 — Core owns mechanisms, not gameplay

**Context:** `src/core` and `src/shared` currently mix kernel primitives (DB, ledger, time) with business rules (market quotes, character stats, prestige).

**Decision:** Core contains only: config, data access + unit of work, clock/calendar/action policy, ledger + account codes, IDs + seeded RNG, module runtime, capability broker, transport contract, logging/audit. Business rules move to base modules or DLC.

**Consequences:**

- `shared` is not automatically Core; each file is classified.
- Core must compile without any `modules/*` import.
- Some currently "shared" files move to `dlc.economy`, `dlc.progression`, `base.player`.

**Status:** Proposed.

---

## AUD-004 — Manifest + resolver before module splitting

**Context:** nine modules register in insertion order with no dependency declaration; seven route-owning folders have no module object.

**Decision:** implement `ModuleManifest` (id, version, apiVersion, kind, requires, optional, provides, consumes, tables, migrations, routes, failurePolicy) and a resolver that validates the graph before any `init`. Do this before moving any business code.

**Consequences:**

- Boot order becomes deterministic and explainable.
- Missing/incompatible dependencies fail with aggregated errors.
- Existing modules need an adapter, not a rewrite.

**Status:** Proposed.

---

## AUD-005 — Capability contracts replace cross-module imports

**Context:** six module-level cycles; 20 controllers import the transport; 100 direct DB access sites.

**Decision:** modules communicate through versioned capabilities (`inventory.stock.issue`, `market.price.quote`, …). Contracts contain DTOs and typed errors, never SQL rows, `Router`, DOM types, or service classes. Events are not used for consistency.

**Consequences:**

- A capability is added only with a real second consumer.
- The broker enforces declared `consumes`; undeclared calls fail in strict mode.
- Some existing cross-module calls must be batched to avoid chatty interfaces.

**Status:** Proposed.

---

## AUD-006 — One SQLite file + ownership manifest (hybrid)

**Context:** 125 tables, 30 with multiple writers, only 11 FKs. Cross-module transactions are essential (cash + inventory + time).

**Decision:** keep one `session.db`. Add a schema-ownership manifest and an architecture-guard rule. Writes go only through the owning module's capabilities; other modules read through contracts or read models. Do not split the database per DLC. Keep `master.db` as an offline content artifact.

**Consequences:**

- ACID is preserved.
- Ownership becomes enforceable without physical partitioning.
- Module uninstall keeps data by default; purge is explicit.

**Alternatives rejected:** separate schema (SQLite has none), separate DB per module (breaks atomicity), shared schema with no ownership (status quo).

**Status:** Proposed.

---

## AUD-007 — Content is immutable at runtime

**Context:** `ContextDialogueService` writes `master_context_dialogues` to `session.db` and `master.db` at runtime; `master_*` tables exist in both files.

**Decision:** gameplay modules never write `master.db`. Curated content is built offline and versioned. Runtime-generated content goes to session tables owned by the producing module; a publish command can promote it to the next content build.

**Consequences:**

- `master.db` can be checksummed and rolled back.
- Dialogue harvesting needs a session table and a publish step.
- Content updates become a release artifact, not a side effect of play.

**Status:** Proposed.

---

## AUD-008 — Events are notifications, not transactions

**Context:** the current bus is fire-and-forget and disconnected; tests fake its wiring.

**Decision:** use capability calls for anything that must succeed or fail with the caller. Use events only for notifications and optional side effects, with an `EventEnvelope` carrying id, type, version, producer, correlation ID, and game date. Fix delivery and inject the publisher through `ModuleContext`; remove `globalThis` discovery.

**Consequences:**

- No "eventually consistent" gameplay.
- Event handlers can fail without corrupting state.
- If an isolated integration is ever added, the same envelope can be written to an outbox.

**Status:** Proposed.

---

## AUD-009 — Modules own their routes; transport at the edge

**Context:** `IFeatureModule` has no route method; `main.ts` registers 19 route groups; controllers import the HTTP router.

**Decision:** modules declare `routes: true` and register their own controllers through a transport-neutral `RouteRegistrar` contract. The HTTP adapter is one implementation; MCP is another. Business modules must not import `src/server`.

**Consequences:**

- Installing a DLC installs its endpoints.
- Disabling a DLC removes its routes without touching the composition root.
- The legacy gateway keeps its 49 handlers until replaced.

**Status:** Proposed.

---

## AUD-010 — Product composition via manifest, not code

**Context:** product selection is hardcoded in `main.ts`.

**Decision:** a `product.json` lists modules, version ranges, capability bindings, config, runtime mode, UI bundle, and licensing mode. The composition root resolves and boots it. Three initial products: merchant, warlord, sandbox.

**Consequences:**

- Adding a product is data, not a fork.
- Product-specific behaviour must live in module config, not in product code.
- The manifest must stay declarative; no expressions.

**Status:** Proposed.

---

## AUD-011 — Module-owned migrations with `module_id`

**Context:** 89 global migrations; modules still run DDL at init (`agent-bridge`); a module upgrade cannot be isolated.

**Decision:** extend `schema_migrations` with `module_id` and `checksum`; a migration may only touch its module's owned tables. Runtime DDL is forbidden. Content migrations run in the content build, not at game boot.

**Consequences:**

- Module install/uninstall/upgrade becomes traceable.
- Existing migrations are grandfathered as `core`.
- Rollback remains restore-backup; no automatic down migrations.

**Status:** Proposed.

---

## AUD-012 — Embedded runtime by default; isolation only at edges

**Context:** MCP is already a separate stdio process; everything else shares one process and one DB.

**Decision:** all base modules and business DLC run embedded. `int.mcp` stays isolated. `int.agent-bridge` may become isolated only if measured LLM latency/retry behaviour threatens the turn loop. No distributed runtime.

**Consequences:**

- Transactional simplicity.
- A failing provider can fail the caller; that is desired for money/inventory.
- Integration failures are contained at the edge.

**Status:** Proposed.

---

## AUD-013 — First DLC is `market.warehouse`

**Context:** scoring in `04-dlc-boundaries.md`: market has high cohesion, 17 owned tables, 21 routes, an existing UI slice, and three manageable foreign writes.

**Decision:** extract the warehouse slice first (7 routes, `warehouses`, `warehouse_stock`), then complete `dlc.market`. `lineage` is second because 10/10 of its tables are single-writer.

**Consequences:**

- The first proof exercises inventory and cash contracts, the hardest shared aggregates.
- If the pilot fails the kill criteria, the program stops before touching military/economy.
- `life` is not chosen despite being easier, because it does not exercise the real boundaries.

**Status:** Proposed.

---

## AUD-014 — No project per feature; folders inside a DLC

**Context:** the repository already has feature folders (`features/bespoke-forge`, `workforce`, `wage-labor`) and 16 domain folders. Creating a project per feature would produce dozens of packages.

**Decision:** a module is a DLC-level package/folder. Inside it, features are folders with controller/service/repository/types. A new package requires a deployment or independent-versioning reason.

**Consequences:**

- The layout stays navigable.
- `warehouse`, `stall`, `freight`, `merchant` are folders, not packages.
- Package count stays around 14 modules, not 50 features.

**Status:** Proposed.

---

## AUD-015 — Separate Installed / Enabled / Licensed; defer licensing

**Context:** there is no install/enable distinction and no license concept. The product is single-player.

**Decision:** model three states. Implement Installed and Enabled now. Implement `licensing.mode = none` by default and optional `static`; do not build a licensing server unless a commercial requirement appears.

**Consequences:**

- Enabling a DLC is a manifest concern.
- A license never affects gameplay correctness, only start permission.
- No network dependency for single-player.

**Status:** Proposed.

---

## AUD-016 — Freeze legacy UI and replace slice by slice

**Context:** 21 legacy scripts (17,820 lines), 64 inline handlers, 24 script tags, a frozen file-count ratchet, and a TS layer that deliberately does not replace several modals.

**Decision:** do not modularize or rewrite the legacy UI as part of the Core/DLC program. Freeze it; replace one modal/feature at a time when its route moves to a module. One renderer per modal id; no duplicate shells.

**Consequences:**

- The extraction program stays server-focused.
- UI DLC composition is deferred.
- Route moves must preserve legacy endpoints until their UI slice ships.

**Status:** Accepted (already enforced by `legacy-ui-script-count` baseline 21).

---

## AUD-017 — Kill criteria for the extraction program

**Context:** architecture programs fail by continuing after the evidence says stop.

**Decision:** stop the program if, after Phase 2 (warehouse pilot):

1. The warehouse slice needs more than 15 capabilities, or
2. The ownership guard cannot reach zero foreign writes for its two tables without rewriting more than 10 call sites, or
3. `verify`/`audit` cannot stay green without raising a ratchet baseline, or
4. Boot time or event delivery becomes less reliable than today.

On stop: keep the modular monolith, document the boundary, and invest in gameplay.

**Status:** Proposed.

---

## Decision log summary

| Area | Decision | Reversible? |
| --- | --- | --- |
| Runtime | Modular monolith, embedded | Yes, but no reason to |
| Kernel | Mechanisms only | Yes |
| Module runtime | Manifest + resolver | Yes (additive) |
| Communication | Capabilities; events for notifications | Yes per capability |
| Data | One DB + ownership manifest | Yes (manifest is metadata) |
| Content | Immutable `master.db` | Yes, with a migration |
| Transport | Module-owned routes | Yes per module |
| Products | Manifest-driven | Yes |
| Migrations | Module-owned | Yes (grandfathering) |
| First DLC | Market warehouse | Yes, but re-scoring required |
| Packaging | Folders first, workspaces later | Yes |
| Licensing | Deferred | Yes |

---

## Open decisions (owner input required)

| ID | Question | Needed before |
| --- | --- | --- |
| O-01 | Is one campaign per process permanent, or is per-request session switching a goal? | Phase 1 `DbSession` design |
| O-02 | Is `master.db` a build artifact or a runtime store? | Phase 2 content work |
| O-03 | Will DLC be commercial (license) or purely compositional? | Phase 4 manifest |
| O-04 | Is the legacy UI allowed to be replaced incrementally, or must it remain pixel-identical? | Phase 2 route moves |
| O-05 | Which product ships first: merchant or warlord? | Phase 4 manifests |
| O-06 | Is third-party DLC a goal within 12 months? | Package/dynamic-import decision |

Until these are answered, the program can proceed with Phases 1–3, which do not depend on them.
