# 05 — Contract & Capability Design

**Purpose:** define how Core, base modules, DLC, integrations, and UI talk to each other without importing each other's implementations.

---

## 1. Contracts that exist today

### 1.1 `IFeatureModule` and `ModuleContext`

```ts
// src/core/types.ts:110-123 (verbatim structure)
export interface ModuleContext {
  dbPath: string;
  eventBus: import('./event-bus').EventBus;
  loadMasterRoutes?: boolean;
}

export interface IFeatureModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  init(ctx: ModuleContext): Promise<void> | void;
  destroy?(): Promise<void> | void;
}
```

What it does well:

- Gives a stable identity (`id`, `name`, `version`).
- Keeps initialization framework-free.
- Allows optional teardown.

What it cannot express:

| Missing | Consequence |
| --- | --- |
| `apiVersion` | No compatibility check between Core and module |
| `requires` / `provides` | No dependency graph; order is insertion order |
| `consumes` capabilities | No way to declare a provider/consumer relationship |
| `registerRoutes` | Routes are registered outside the module (`main.ts:93-110`) |
| `migrations` | Schema ownership is invisible |
| `configSchema` | Invalid module config fails at first use, not at boot |
| `kind` (core/base/dlc/integration/ui) | Product composition cannot filter |
| `optional` / failure policy | One bad module aborts the whole boot |
| `license` / `entitlement` | No commercial gating |

**[V]**

### 1.2 `Router`

`src/server/router.ts` is a solid transport primitive: route registration, parameter extraction, JSON body parsing, CORS, `matches`, `handle`, `mount`. It is reusable as-is.

The problem is **who imports it**: every controller imports `Router, sendJson, RouteContext` from `src/server/router` (20 files). The contract is fine; its location and direction are wrong.

### 1.3 `EventBus`

API: `subscribe(type, handler) → unsubscribe`, `publish(type, payload)`, `clear()`. Handler errors are logged and swallowed (`src/core/event-bus.ts:37-46`).

Two problems:

1. **Delivery is broken in production** (F3): the bus is discovered through `globalThis` paths that do not exist. Runtime probe: `registry.ctx` absent, `utilityAi.ctx` absent after `init`.
2. **`publish` is fire-and-forget.** `engine/time-manager.js` does not await it; a subscriber failure cannot fail the mutation. That is acceptable for notifications, not for business reactions.

**Conclusion:** keep the bus for notifications, but do **not** make it the primary contract for business workflows. Use capability calls for anything that must be transactional; use events for side effects that may be retried or dropped.

### 1.4 Engine bridges

The 18 `engine/*-bridge.js` files are an **adapter pattern**:

```js
// engine/prestige-bridge.js:11-18
require('tsx/cjs');
const { DatabaseService } = require('../src/core/database.ts');
const { PrestigeService } = require('../src/modules/progression/prestige.service.ts');
cached = PrestigeService.forDatabase(DatabaseService.getInstance(dbPath));
```

They are a legitimate seam, but they are **hard-wired to one implementation and one DB path**, and they silently return `null` on failure. In the target they become capability adapters registered by the runtime.

---

## 2. Contract principles

The brief's seven principles, applied concretely:

1. **No implementation dependency.** Contracts are TypeScript types/interfaces with no imports from `core`, `modules`, `server`, `engine`, or Node built-ins beyond `unknown`.
2. **No UI framework dependency.** No DOM types, no `window`, no `ModalShell`.
3. **No foreign database entities.** A contract exposes DTOs, not rows. `InventoryLine { itemCode, quantity, locationId, qualityTier? }`, never `inventory_items`.
4. **Share DTOs only when necessary.** Prefer capability-specific DTOs; do not create a universal `Entity` type.
5. **Version every contract.** Capability version + module `apiVersion`; ranges validated at resolution.
6. **No abstraction without a consumer.** A capability is added only when at least two modules or one integration consumes it. Otherwise it stays a private method.
7. **Stable, backward-compatible API.** Additive changes only within a major; deprecate before removing.

Additional project-specific rules:

8. **No HTTP types in business contracts.** `HttpRequest`/`Response` stay in the adapter.
9. **No silent failures.** Every capability returns `Result<T, CapabilityError>` or throws a typed error; no `null` meaning "provider missing".
10. **No global lookup.** The caller receives a `CapabilityBroker`; it does not import the provider.

---

## 3. Proposed contract set

### 3.1 `ModuleManifest`

```ts
// platform/contracts/module.ts
export type ModuleKind = 'core' | 'base' | 'business' | 'integration' | 'ui' | 'platform';

export interface ModuleManifest {
  id: string;                    // 'dlc.market'
  name: string;                  // human label
  version: string;               // semver of the module
  apiVersion: number;            // contract major, e.g. 1
  kind: ModuleKind;
  requires?: ModuleRequirement[];      // hard dependencies
  optional?: ModuleRequirement[];      // soft dependencies
  provides?: CapabilityDescriptor[];   // capabilities this module owns
  consumes?: CapabilityRequirement[];  // capabilities it calls
  configSchema?: ConfigSchema;         // validated at registration
  migrations?: MigrationRef[];         // owned by this module
  tables?: TableOwnership[];           // write ownership
  routes?: boolean;                    // registers an HTTP surface
  failurePolicy?: 'fail-boot' | 'disable';
}

export interface ModuleRequirement {
  moduleId: string;
  version: string;               // semver range, e.g. '^2.0.0'
  optional?: boolean;
}
```

### 3.2 `ModuleContext` v2

```ts
export interface ModuleContext {
  readonly moduleId: string;
  readonly config: Readonly<Record<string, unknown>>;
  readonly logger: Logger;
  readonly clock: Clock;                 // game time, not wall clock
  readonly db: DbSession;                // scoped unit of work
  readonly capabilities: CapabilityBroker;
  readonly events: EventPublisher;       // notifications only
  readonly routes: RouteRegistrar;       // transport-neutral
  readonly invariants: InvariantRegistry;
}
```

This replaces `dbPath` and the discoverable `eventBus`. A module that needs another module asks the broker; it never reaches into a global.

### 3.3 Capability descriptor and broker

```ts
export interface CapabilityDescriptor {
  id: string;                    // 'inventory.stock.issue'
  version: string;               // '1.0.0'
  providerModuleId: string;
  description: string;
  input: unknown;                // JSON Schema or zod-like validator descriptor
  output: unknown;
  idempotent: boolean;
  transactional: boolean;        // participates in the caller's transaction
}

export interface CapabilityRequirement {
  id: string;
  version: string;               // semver range
  optional?: boolean;
}

export interface CapabilityBroker {
  get<T>(id: string, version?: string): CapabilityHandle<T>;
  has(id: string, version?: string): boolean;
  list(): CapabilityDescriptor[];
}

export interface CapabilityHandle<T> {
  call(input: T): Promise<unknown>;
  descriptor: CapabilityDescriptor;
}
```

### 3.4 Result and errors

```ts
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: CapabilityError };

export type CapabilityErrorCode =
  | 'CAPABILITY_UNAVAILABLE'
  | 'VERSION_INCOMPATIBLE'
  | 'INVALID_INPUT'
  | 'PRECONDITION_FAILED'
  | 'PROVIDER_ERROR'
  | 'FORBIDDEN';
```

`CAPABILITY_UNAVAILABLE` is a first-class outcome, not an exception. It lets a product boot without an optional DLC and return a precise message.

### 3.5 Data contracts

```ts
export interface DbSession {
  query<T>(sql: string, params?: unknown[]): T[];       // module-owned tables only
  queryOne<T>(sql: string, params?: unknown[]): T | undefined;
  execute(sql: string, params?: unknown[]): void;
  transaction<T>(fn: () => T): T;
  readonly moduleId: string;                            // for ownership checks
}
```

A stricter alternative is a repository interface per aggregate (`PlayerRepository`, `InventoryRepository`). Recommendation: start with `DbSession` + ownership guard, add repositories only for the three hottest aggregates (`player`, `inventory`, `settlement`).

### 3.6 Time and ledger

```ts
export interface Clock {
  today(): GameDate;
  advance(days: number, reason: string): TimeAdvanceResult;
  spend(actionType: string, subType?: string): TimeCharge;
}

export interface LedgerPort {
  post(entry: LedgerEntry): LedgerReceipt;
  postDoubleEntry(entry: DoubleEntry): LedgerReceipt;
  balance(playerId: string): PlayerCapital;
}
```

`chargePlayerAction` remains the enforcement point; the port is the stable surface.

### 3.7 Event envelope

```ts
export interface EventEnvelope<T = unknown> {
  id: string;                 // idempotency key
  type: string;               // 'world.day.tick'
  version: number;
  occurredAt: GameDate;
  producer: string;           // module id
  correlationId?: string;     // turn or request id
  payload: T;
}
```

If Level 3 is ever needed, the same envelope goes into an outbox table; the in-process publisher is then one dispatcher implementation.

### 3.8 Transport contract

```ts
export interface RouteRegistrar {
  get(path: string, handler: HttpHandler): void;
  post(path: string, handler: HttpHandler): void;
  // ...
}

export interface HttpHandler {
  (ctx: HttpContext): Promise<HttpResult>;
}
```

`HttpContext` and `HttpResult` are transport-neutral DTOs. The `Router` class implements the adapter side; a future MCP tool adapter can map capabilities directly.

---

## 4. Capability catalog (initial, not exhaustive)

Only capabilities with at least one external consumer are listed. Private methods stay private.

| Capability ID | Provider | Primary consumers | Transactional | Idempotent |
| --- | --- | --- | --- | --- |
| `time.today` | Core | all | no | yes |
| `time.spend` | Core | all controllers | yes | no |
| `time.advance` | Core | turn loop, travel | yes | no |
| `ledger.cash.post` | Core | player, market, professions, economy, military | yes | keyed by `txnId` |
| `ledger.double.post` | Core | economy, market, military | yes | keyed by `txnId` |
| `ledger.balance.query` | Core | player, UI | no | yes |
| `ids.next` | Core | all writers | no | yes |
| `rng.roll` | Core | combat, events, NPC AI | no | seeded |
| `player.state.get` | `base.player` | almost all | no | yes |
| `player.cash.post` | `base.player` | market, professions, economy | yes | keyed |
| `inventory.stock.query` | `base.player` | professions, market, social, progression | no | yes |
| `inventory.stock.issue` | `base.player` | professions, market, military | yes | keyed |
| `inventory.stock.receive` | `base.player` | professions, progression, social | yes | keyed |
| `inventory.stock.reserve` | `base.player` | market freight/routes | yes | keyed |
| `inventory.move` | `base.player` | market, travel | yes | keyed |
| `world.location.get` | `base.world` | market, economy, military, social | no | yes |
| `world.route.distance` | `base.world` | economy, market, military | no | yes |
| `world.route.reachable` | `base.world` | military supply | no | yes |
| `world.settlement.query` | `base.world` | politics, military, market | no | yes |
| `world.settlement.garrison.adjust` | `base.world` | military, politics | yes | keyed |
| `world.crisis.active` | `base.world` | economy, professions | no | yes |
| `content.item.get` | `base.content` | economy, market, professions | no | yes |
| `content.recipe.list` | `base.content` | professions | no | yes |
| `content.character.get` | `base.content` | npc, social, lineage | no | yes |
| `npc.query` | `base.npc` | social, lineage, politics, market | no | yes |
| `npc.ledger.transfer` | `base.npc` | professions, politics, military | yes | keyed |
| `market.price.quote` | `dlc.economy` | market, professions, military | no | yes |
| `market.stock.local` | `dlc.economy` | market | no | yes |
| `economy.obligation.settle` | `dlc.economy` | turn loop | yes | yes |
| `market.stall.list` | `dlc.market` | UI, economy | yes | no |
| `logistics.warehouse.store` | `dlc.market` | professions, UI | yes | keyed |
| `logistics.shipment.reserve` | `dlc.market` | economy, UI | yes | keyed |
| `progression.skill.award` | `dlc.progression` | professions, social, military | yes | keyed |
| `progression.fame.award` | `dlc.progression` | politics, military, economy | yes | keyed |
| `progression.career.paths` | `dlc.progression` | UI, life | no | yes |
| `social.relation.adjust` | `dlc.social` | lineage, politics, market | yes | keyed |
| `lineage.child.birth` | `dlc.lineage` | turn loop | yes | keyed |
| `lineage.will.execute` | `dlc.lineage` | succession | yes | keyed |
| `politics.diplomacy.state` | `dlc.politics` | military | no | yes |
| `politics.office.appoint` | `dlc.politics` | faction UI | yes | no |
| `military.supply.reachable` | `dlc.military` | UI, AI war | no | yes |
| `military.duel.resolve` | `dlc.military` | siege, field battle | yes | keyed |
| `condition.apply` | `dlc.military` | professions, social, combat | yes | keyed |
| `equipment.loadout.get` | `dlc.equipment` | military, UI | no | yes |
| `life.state.get` | `dlc.life` | UI | no | yes |
| `session.reset` | `platform.instances` | title screen | yes | no |
| `agent.memory.record` | `int.agent-bridge` | npc, social | no | yes |

**Capability count discipline:** 46 capabilities for 16 modules is already generous. If Phase 2 needs more than ~15 capabilities for `market.warehouse`, the boundary is wrong; split by aggregate, not by method.

---

## 5. Provider replacement and multiple providers

| Question | Answer |
| --- | --- |
| Can a capability have multiple providers? | Yes, but only by explicit priority/qualifier. Default: one provider per capability ID per product |
| How is a provider replaced? | A product manifest binds `capabilityId → moduleId`; the resolver registers that provider. No code change |
| How is a missing capability handled? | At validation: required consume → boot fails with a precise list; optional consume → `CAPABILITY_UNAVAILABLE` at call time |
| Does a capability have a version? | Yes: `major.minor.patch`; consumers request a range; resolver refuses incompatible majors |
| Is access controlled? | Yes, by **declaration**: a module may only call capabilities listed in `consumes`. The broker rejects undeclared calls in strict mode. No user-level authorization exists or is needed |

Example: `market.price.quote` could have a `simple` provider (elasticity only) and a `regional` provider (elasticity + endowment + crisis). Product A binds `simple`, Product C binds `regional`. The consumer code is unchanged.

---

## 6. Versioning policy

| Artifact | Scheme | Compatibility rule |
| --- | --- | --- |
| Core API | integer `apiVersion` | A module declares the major it was built against; Core supports the current and previous major during one release cycle |
| Module | semver | Minor = additive; patch = fix; major = breaking |
| Capability | semver | Additive optional fields = minor; removing/renaming/re-typing = major |
| Event | integer version + additive payload | Consumers must ignore unknown fields; a breaking change publishes a new type (`world.day.tick.v2`) |
| Database schema | migration number | Per-module migration namespace; no module edits another module's tables |
| Config | schema version | Unknown keys rejected in strict mode; removed keys need a migration |

**Deprecation window:** a capability is marked `deprecatedSince` and served for at least two minor releases before removal. The broker logs every call to a deprecated capability with the calling module ID.

**What not to do:** do not version every DTO. Version the capability and the event type; DTOs inherit the capability version.

---

## 7. Reuse assessment of existing interfaces

| Existing | Reuse? | Action |
| --- | --- | --- |
| `IFeatureModule` | Yes, as a legacy adapter | Add an adapter that wraps an old module into a `ModuleManifest` + capability provider |
| `ModuleContext` | Partly | Replace `dbPath`/`eventBus` with `db`/`capabilities`/`events`; keep a deprecated shim during migration |
| `EventBus` | Yes, as the in-process publisher | Fix delivery; wrap in `EventPublisher`; do not expose the raw bus to modules |
| `Router` / `sendJson` | Yes | Move types to `contracts/transport`; keep implementation as an adapter |
| `DatabaseService` | Yes | Implement `DbSession`; deprecate direct `getInstance` in module code |
| Engine bridges | Yes, conceptually | Replace `require(tsx)` with runtime-registered capability adapters; keep a compatibility bridge for CLI tools |
| `Result`-less service methods | No | New capabilities return typed results; old services keep throwing until migrated |

---

## 8. Example: the `market.warehouse` pilot contract

This is the smallest end-to-end slice that proves the design.

```ts
// platform/contracts/inventory.ts
export interface StockKey {
  ownerId: string;          // player or business
  itemCode: string;
  locationId: string;       // city or warehouse id
}

export interface StockMove {
  from: StockKey;
  to: StockKey;
  quantity: number;
  reason: 'WAREHOUSE_DEPOSIT' | 'WAREHOUSE_WITHDRAW' | 'STALL_SOURCE';
  idempotencyKey: string;
  gameDate: GameDate;
}

export interface InventoryPort {
  query(key: StockKey): Promise<StockLine[]>;
  move(move: StockMove): Promise<StockMoveReceipt>;
  reserve(key: StockKey, qty: number, key2: string): Promise<Reservation>;
  release(reservationId: string): Promise<void>;
}
```

```ts
// dlc/market/warehouse/warehouse.module.ts (sketch)
export const manifest: ModuleManifest = {
  id: 'dlc.market.warehouse',
  name: 'Per-City Warehousing',
  version: '1.0.0',
  apiVersion: 1,
  kind: 'business',
  requires: [
    { moduleId: 'base.player', version: '^1.0.0' },
    { moduleId: 'base.world', version: '^1.0.0' }
  ],
  consumes: [
    { id: 'inventory.stock.query', version: '^1.0.0' },
    { id: 'inventory.move', version: '^1.0.0' },
    { id: 'player.cash.post', version: '^1.0.0' },
    { id: 'time.spend', version: '^1.0.0' }
  ],
  provides: [
    { id: 'logistics.warehouse.store', version: '1.0.0', providerModuleId: 'dlc.market.warehouse',
      description: 'Store goods in a per-city warehouse', input: {}, output: {}, idempotent: true, transactional: true }
  ],
  tables: [
    { table: 'warehouses', write: true },
    { table: 'warehouse_stock', write: true }
  ],
  failurePolicy: 'disable'
};
```

The warehouse controller calls `ctx.capabilities.get('inventory.move')`; it never imports `base.player`, and `base.player` never imports the warehouse.

---

## 9. Contract anti-patterns to reject

| Anti-pattern | Why it fails here |
| --- | --- |
| One capability per service method | 200+ capabilities; the registry becomes a remote control for the codebase |
| A generic `execute(action, payload)` capability | Loses typing, versioning, and discoverability |
| Sharing database rows as DTOs | Couples consumers to schema changes and leaks ownership |
| Events for transactional workflows | Fire-and-forget; a dropped handler corrupts state |
| Using the registry as a service locator (`ctx.get('anything')`) | Hides dependencies; reintroduces the global problem with better syntax |
| Versioning every DTO class | Explosion of types with no compatibility benefit |
| A capability that returns `any` | No contract at all |

---

## 10. Migration from today's contract

| Step | Change | Compatibility |
| --- | --- | --- |
| 1 | Add `ModuleManifest` and `CapabilityBroker` beside `IFeatureModule` | No behaviour change |
| 2 | Wrap the 9 existing modules in manifests (id/version/kind only) | Boot order unchanged |
| 3 | Add `registerRoutes` to the manifest path; move the 19 registrars into their modules one by one | Routes unchanged; composition root shrinks |
| 4 | Inject `ModuleContext` v2; keep `dbPath` and `eventBus` fields as deprecated getters | Existing modules compile |
| 5 | Convert the highest-value cross-module calls (`market → economy`, `military → progression`, `professions → progression`) to capabilities | Behaviour tests stay green |
| 6 | Freeze direct cross-module imports with a dependency rule | Guard fails on new edges |
| 7 | Remove the deprecated context fields after all modules migrate | Major version bump of Core API |

Each step is reversible. The contract surface grows only when a real second consumer appears.
