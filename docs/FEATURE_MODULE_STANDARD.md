# Feature Module Standard (AgentOption UA v4.0)

Date: 2026-11-01
Scope: how to add a feature to this repository without creating a second way to
do the same thing.

## 1. Verdict: standardize new features, do not rewrite the engine

The core already satisfies the AgentOption Universe v4.0 requirements that
matter for feature growth:

| Requirement | Current implementation |
| :--- | :--- |
| Self-registering modules | `src/core/module-registry.ts`, `IFeatureModule` in `src/core/types.ts` |
| Event-driven decoupling | `src/core/event-bus.ts` (`WORLD_DAY_TICK`, `WORLD_MONTH_TICK`, domain events) |
| Layered boundaries | `src/modules/*` services + `*.controller.ts`; `tools/sim-web.js` legacy gateway |
| Parameterized SQL and migrations | `DatabaseService`, `tools/migrations/*` |
| Deterministic server-authoritative ticks | `engine/time-manager.js`, `src/shared/game-date.ts` |
| Test-first regression gate | `tests/verify-*.ts`, `npm run verify`, `npm run audit` |

A wholesale rewrite would not improve feature velocity; it would break the
1,961 invariants and 90 suites. The missing piece is a **single feature-folder
contract** so new modules do not copy the legacy patterns. Existing debt is
retired slice by slice, never as a big-bang refactor.

## 2. Standard feature folder

```text
src/modules/<domain>/<feature>/
├── <feature>.module.ts       # IFeatureModule: id, name, version, init, registerRoutes?
├── <feature>.controller.ts   # register<Feature>Routes(router); HTTP only
├── <feature>.service.ts      # business rules; owns transactions
├── <feature>.repository.ts   # optional; SQL only, parameterized
├── <feature>.types.ts        # DTOs and local domain types
├── <feature>.events.ts       # optional; event names and payload types
└── index.ts                  # public surface; the only import other modules use
tests/verify-<feature>.ts     # one behavioural suite per feature
tools/migrations/NNN-<feature>.js   # only when schema changes
```

A feature may be a single file when it is genuinely small (for example
`src/modules/market/spoilage.ts`), but once it has HTTP, persistence or events,
use the folder.

### Ownership rules

- **Module** owns lifecycle only: `init(ctx)`, optional `destroy()`, optional
  `registerRoutes(router)`. It must not contain business rules.
- **Controller** owns HTTP: parse route/query/body, charge action time, call one
  service method, send JSON. No SQL, no price formulas, no ledger writes.
- **Service** owns business rules and transactions. It receives a
  `DatabaseService` and must be constructible with `forDatabase(db)` for tests.
- **Repository** (optional) owns SQL. Every query is parameterized; dynamic
  placeholders carry the `arch-guard:allow-sql-interpolation` comment and only
  interpolate `?` lists.
- **Types** are feature-local DTOs. Shared contracts live in `src/shared/` or
  `src/core/types.ts`; do not import another feature's service to reuse a type.
- **Events** use `ctx.eventBus` and a named payload type. No module reaches into
  another module's registry instance.

### Cross-module dependencies

Allowed:

- `src/shared/*` (ledger, action time, date, market quote, inventory movement).
- `src/core/*` (database, RNG, event bus, module contract).
- A published contract from another feature's `index.ts`, when the dependency is
  genuinely directional (for example market → economy price resolver).

Not allowed:

- Importing another feature's `*.service.ts` internals.
- Writing another feature's tables directly when a service owns the mutation.
- A circular module import. If two modules need each other, publish an event or
  move the shared rule into `src/shared/`.

## 3. Naming and registration

| Item | Convention |
| :--- | :--- |
| Folder | kebab-case, one feature per folder |
| Class | `PascalCase` + `Module` / `Service` / `Controller` |
| Module id | same as folder, kebab-case, stable |
| Route prefix | `/api/<domain>/<feature>` |
| Migration id | three-digit sequence + kebab feature, never reused |
| Test | `tests/verify-<feature>.ts`; auto-discovered |
| Commit | `feat(<domain>): <Vietnamese summary>` |

Registration today:

1. `src/server/main.ts` instantiates the module, registers it, and calls its
   `registerRoutes(router)` if present.
2. `src/core/module-registry.ts` initializes every registered module with one
   `ModuleContext`.
3. The scaffold prints the exact main.ts lines to add.

Do not edit `tools/sim-web.js` for a new feature. That file is the legacy
gateway; new routes belong in a controller registered by the module.

## 4. Data and migration rules

- Schema changes ship with a numbered migration; never mutate the live DB by hand.
- Add new session tables to `HISTORY_TABLES` in
  `src/modules/instances/instance-bootstrap.ts` so a new game is clean.
- Add required tables/columns to `tests/verify-schema-contract.ts`.
- If the table represents conserved goods, cash or stock, add an invariant to
  `tools/sim-audit.js`; a feature without an invariant is not conserved.
- Money and stock go through `src/shared/ledger.ts` and
  `src/shared/inventory-movement.ts`; direct `INSERT INTO cashflow_ledger` is a
  hard failure.

## 5. Test contract

Every feature suite must:

1. copy the live database to a temp file (never write the live save);
2. set the campaign date and player state explicitly;
3. exercise the controller or the service through the same path the UI uses;
4. assert the state change, the ledger/stock movement and the idempotent replay;
5. restore or delete only its own temp directory.

Use `npm run verify` after the suite is green; the runner discovers the file
automatically.

## 6. Definition of done

- Standard folder, one public `index.ts`.
- Controller has no SQL; service has no HTTP.
- Migration and schema contract updated if schema changed.
- Audit invariant added for conserved state.
- `npm run verify` 90+/90 suites, 28 contracts, 8 write smokes; `npm run audit`
  0 discrepancies.
- `CHANGELOG.md`, `PROJECT.md` feature row, and `ARCHITECTURE.md` section updated
  when the change is user-visible.
- One commit, task-scoped files only.

## 7. Migration path for existing debt

| Debt | Action |
| :--- | :--- |
| 48 handlers in `tools/sim-web.js` | Extract one cluster at a time into a controller; run `npm run routes:shadow` after each step. |
| 21 scripts in `public/js/` | Migrate one screen per feature slice; delete the script only after a browser check. |
| Five services above 1,000 lines | Split only when a feature already touches that service; write a characterization test first. |
| 366 `'PLY-0001'` literals | Inject `ExecutionContext` per feature touched; add an arch ratchet on the literal count. |
| Manual module registration | New modules use `registerRoutes`; existing modules can adopt it one at a time. |

## 8. AgentOption rule mapping

| Rule | Applied here |
| :--- | :--- |
| `R_CORE` | One owner per concept; no duplicate service or price formula. |
| `R_NODE` | Handler/dispatcher router; controller → service → repository. |
| `R_DB` | Parameterized SQL only; migrations for schema. |
| `R_TDD` | Reproduction suite before the production change. |
| `R_GAME` | Server-authoritative, deterministic day/month ticks. |
| `R_PROOF` | Cite the gate counts, not adjectives. |
| `R_ANTI_SLOP` | Quiet UI, self-documenting names, no decorative abstractions. |
| `R_UNIVERSE` | Module isolation, EventBus, `IFeatureModule`; a feature folder can be removed without touching another feature's internals. |
| `R_GIT` | One feature per commit; docs separate. |

Use `node tools/scaffold-feature.js <feature> --domain=<domain>` to create the
folder. The generated test is a passing smoke test; replace it with the first
real behavioural assertion before committing the feature.
