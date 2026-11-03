# 07 — Data Ownership

**Purpose:** decide who owns each table, how writes are mediated, and why the database should (and should not) be split.

---

## 1. Current database facts

| Fact | Value | Evidence |
| --- | --- | --- |
| Database file | `saves/session.db` (SQLite, WAL) | `src/core/database.ts:47-52` |
| Tables | 125 | live schema query |
| Views | 2 (`character_prestige`, `current_player_location`) | live schema query |
| Numbered migrations | 89 | `tools/migrations/001…089` |
| Foreign keys | 11 across 125 tables | `PRAGMA foreign_key_list` |
| Second database | `saves/master.db` (397 KB) | filesystem |
| Runtime content writes | `ContextDialogueService` writes `session.db` **and** `master.db`; `seedMasterRecipes` inserts `master_items`/`master_recipes` | `context-dialogue.service.ts:188-235`, `recipes-seed.ts:272-300` |
| Ownership metadata | none | no owner column, no schema registry, no guard |

**Consequence:** integrity is application-level, not database-level. Only 11 FKs exist, so nothing in SQLite prevents one module from writing another module's rows.

---

## 2. Write-sharing statistics

A table is "shared" when more than one unit (module, `shared`, `engine`, `instances`) contains `INSERT`/`UPDATE`/`DELETE` for it.

| Metric | Value |
| --- | --- |
| Tables with exactly one writing unit | 67 / 125 |
| Tables with more than one writing unit | **30 / 125** |
| Tables with no direct write in `src/` or `engine/` | 28 / 125 (content tools and helpers write some of these) |

### Top hotspots

| Table | Writers | Writing units |
| --- | --- | --- |
| `player_state` | **12** | professions (84 sites), progression (56), market (52), economy (44), military (40), ecology-logistics (32), engine (32), life (24), social-kizuna (16), lineage-succession (12), shared (8), instances (4) |
| `inventory_items` | **9** | professions, engine, social-kizuna, economy, instances, progression, shared, ecology-logistics, lineage-succession |
| `npc_state` | **9** | instances, progression, engine, military, npc-lifecycle, professions, shared, faction-politics, lineage-succession |
| `account_journal` | **8** | economy, engine, shared, ecology-logistics, lineage-succession, military, social-kizuna, instances |
| `session_settlements` | **8** | military, faction-politics, ecology-logistics, economy, instances, npc-lifecycle, shared, engine |
| `stock_movements` | **8** | professions, engine, economy, progression, social-kizuna, ecology-logistics, lineage-succession, shared |
| `businesses` | 6 | professions, shared, engine, instances, lineage-succession, npc-lifecycle |
| `npc_relationship_deltas` | 6 | social-kizuna, lineage-succession, life, military, professions, engine |
| `bandit_strongholds` | 4 | ecology-logistics, market, military, npc-lifecycle |
| `campaign_meta` | 4 | military, engine, instances, shared |
| `chat_chronicle` | 4 | engine, instances, professions, ecology-logistics |
| `faction_officers` | 4 | faction-politics, social-kizuna, lineage-succession, military |
| `session_factions` | 4 | faction-politics, instances, shared, engine |

**[V]** — counts are SQL statement occurrences, not distinct call paths. They establish ownership absence, not exact transaction volume.

**Reading:** `player_state`, `inventory_items`, and `npc_state` are the three shared aggregates that make independent DLC impossible today. They are also the three that must never be split across databases.

---

## 3. Ownership map (all 125 tables)

Legend: **W** = sole write owner after extraction; **R** = read consumers use a contract; **M** = currently multi-writer and must be mediated.

### Core

| Owner | Tables | Notes |
| --- | --- | --- |
| `core.data` | `schema_migrations`, `id_sequence` | Migration registry and ID sequence |
| `core.time` | `campaign_meta`, `active_tasks`, `turn_log`, `world_day_ledger`, `world_turn_ledger` | Clock, tasks, tick idempotency |
| `core.ledger` | `cashflow_ledger`, `account_journal` | Only the ledger port writes |

### Base modules

| Owner | Tables | Notes |
| --- | --- | --- |
| `base.player` | `player_state` **M**, `inventory_items` **M**, `player_bag_by_location`, `stock_movements` **M**, `campaign_legacy`, `chat_chronicle` **M**, `action_log` **M** | The hottest aggregate; every write must go through `player.cash.*` / `inventory.*` |
| `base.world` | `session_settlements` **M**, `location_sublocations`, `location_encounter_rates`, `regional_ecological_crises`, `session_events`, `settlement_ledger` | Settlement writes from military/politics must become `world.settlement.*` capabilities |
| `base.npc` | `npc_state` **M**, `npc_ledger`, `npc_career_shifts`, `npc_journey_logs`, `npc_peer_relations` | NPC state is mutated by 9 units; contract-first |
| `base.content` | 19 `master_*` tables: `master_characters`, `master_crops`, `master_events`, `master_factions`, `master_items`, `master_locations`, `master_perks`, `master_player_archetypes`, `master_poi_scenes`, `master_quest_steps`, `master_quests`, `master_quick_chips`, `master_recipes`, `master_routes`, `master_scenarios`, `master_skill_effects`, `master_skills`, `master_talent_effects`, `master_talents` | Read-only at runtime; written only by the content pipeline |
| Views | `character_prestige` (player + progression), `current_player_location` (player + world + content) | Cross-module read models; own them in a read-model layer, not a business module |

### Business DLC

| Owner | Tables | Notes |
| --- | --- | --- |
| `dlc.economy` | `settlement_market_state`, `settlement_market_history`, `settlement_consumption`, `settlement_consumption_log`, `settlement_item_endowment`, `contract_offers`, `player_contracts`, `obligations`, `financial_loans`, `intel_reports`, `merchant_promissory_notes` | 11 tables, all single-writer except journal/cash side effects |
| `dlc.market` | `warehouses`, `warehouse_stock`, `player_stalls`, `stall_listings`, `stall_sales`, `freight_contracts`, `freight_shipments`, `merchant_routes`, `merchant_route_items`, `merchant_route_stock`, `merchant_shipments`, `merchant_events`, `merchant_day_ledger`, `npc_market_offers`, `npc_market_sales`, `npc_trade_preferences`, `trade_caravans` | 17 tables; clean except `inventory_items`, `player_state`, `bandit_strongholds` side effects |
| `dlc.professions` | `businesses` **M**, `character_professions`, `character_tool_uses`, `gathering_nodes`, `gathering_node_state`, `resource_node_rules`, `resource_yield_variants`, `land_parcels`, `tool_rules`, `emergent_innovations` | `businesses` is also written by lineage/npc-lifecycle (succession) |
| `dlc.progression` | `player_skills`, `player_perks`, `player_talents`, `npc_skills`, `npc_perks`, `npc_personal_progression` **M**, `prestige_events`, `fame_arrivals`, `player_quests`, `exploration_log`, `discovery_items` | `npc_personal_progression` is written by npc-lifecycle too; mediate through `npc.*` |
| `dlc.social` | `npc_relationship_deltas` **M**, `npc_intel_fog`, `master_context_dialogues`, `master_relations_baseline` | Dialogue content should publish to `base.content`, not dual-write master.db |
| `dlc.lineage` | `family_lineage`, `family_spouses`, `family_children`, `family_genealogy_tree`, `family_mentorship_logs`, `family_will`, `family_will_allocations`, `family_will_assets`, `family_ancestors_archive`, `civilian_maidens` | **10/10 single-writer** — the cleanest module |
| `dlc.politics` | `session_factions` **M**, `faction_officers` **M**, `faction_diplomacy`, `faction_political_events`, `faction_ledger`, `unrest_events`, `retainer_departures` | Officers also written by social/lineage/military |
| `dlc.military` | `military_expeditions`, `session_sieges`, `battle_duels`, `session_duels`, `conditions`, `bandit_strongholds` **M** | Strongholds also written by market/ecology/npc |
| `dlc.life` | `player_life_state` | 1/1 single-writer |
| `dlc.equipment` | `character_equipment` **M** | Also written by lineage on inheritance; mediate through `equipment.*` |

### Integration

| Owner | Tables | Notes |
| --- | --- | --- |
| `int.agent-bridge` | `npc_episodic_memories` | Created at module init today; must move to a migration |

---

## 4. Special cases

### 4.1 `master_context_dialogues` and `master_relations_baseline`

They are prefixed `master_` but written by `dlc.social` at runtime. Two valid resolutions:

- **Preferred:** runtime rows live in a new `session_context_dialogues` table owned by `dlc.social`; the content pipeline merges curated rows into `master_context_dialogues` offline.
- **Minimum:** declare `dlc.social` as the runtime writer of these two `master_*` tables and forbid `master.db` dual-writes.

### 4.1b `master_items` and `master_recipes`

`seedMasterRecipes` (`src/modules/professions/recipes-seed.ts:272-300`, called from `enterprise-labor.service.ts:399`) inserts missing commodities and recipes into the master catalog at service runtime. This makes `dlc.professions` a writer of `base.content` tables. Move the seed into a content migration or the content build; the runtime module should only read.

### 4.2 Views

`character_prestige` unions `player_state` and `npc_personal_progression`; `current_player_location` joins `player_state`, `location_sublocations`, and `master_locations`. They are **read models spanning modules**. Put them in a `readmodels/` package owned by the composition layer, or redefine them as capabilities (`progression.prestige.query`, `player.location.get`). Do not assign them to a single business module.

### 4.3 `stock_movements`

It is the inventory audit trail. It must be written by `base.player` only, as part of the same transaction as the `inventory_items` change. Today 8 units write it; that is the clearest symptom of missing inventory ownership.

### 4.4 `action_log` and idempotency

`action_log` is written by `engine/sim-core`, `engine/gameplay-manager`, `src/shared/action-journal`, and `progression`. Idempotency is a platform concern; consider moving `action_log` to `core.time` and making the journal write part of the mutation transaction.

---

## 5. Options for the target data architecture

| Option | Description | Pros | Cons | Fit |
| --- | --- | --- | --- | --- |
| **1. Shared DB, shared schema** | Current: one file, all tables, no ownership | Simple; ACID across modules; one backup | No isolation; foreign writes; uninstall unsafe | **Not acceptable as target**, but the ACID property is required |
| **2. Shared DB, separate schema** | SQLite has no schemas; emulate with table prefixes + ownership manifest | Keeps ACID; makes ownership visible | No DB-level enforcement; prefix churn | **Recommended as the enforcement model** |
| **3. Separate DB per module** | Each DLC gets its own file | Strong isolation; independent migration | Loses cross-module atomicity; N connections; backup/restore complex; cross-file transactions unsafe on crash | **Rejected** for gameplay |
| **4. Hybrid** | One file, ownership manifest, capability-mediated writes, optional separate file for content/telemetry | ACID + ownership + independent migrations | Requires discipline and tooling | **Recommended target** |

**Verdict: Option 4 (Hybrid).** Keep `session.db` as the transactional core. Keep `master.db` as an offline-built content artifact. Add a schema-ownership manifest and enforce it. Do **not** split business DLC into separate databases.

---

## 6. Consistency model

| Concern | Current | Target |
| --- | --- | --- |
| Player cash + inventory + time in one action | One SQLite transaction | Same transaction through Core ports |
| Cross-module reaction (e.g. loot → inventory + journal + fame) | Direct writes in one function | One capability call chain inside the caller's transaction, or an explicitly non-transactional event |
| Event delivery | Broken in production; fire-and-forget | Typed capability calls for consistency; events for notifications only |
| Content updates | Runtime dual-write to `master.db` | Offline content build; versioned content package |
| Module disabled | Not supported | Inert data; capabilities return `CAPABILITY_UNAVAILABLE` |
| Eventual consistency | Not used | Only for Level-3 integrations (MCP/agent), via outbox + idempotency keys |
| Outbox / Saga | Absent | **Not needed now.** Revisit only if a module runs in another process |

**Rule:** if two writes must both succeed or both fail, they belong to the same capability and the same database transaction. Do not solve that with events.

---

## 7. Migration ownership

Today `schema_migrations` has `(migration_id, description, applied_at)` and every migration can touch any table.

Target:

```sql
ALTER TABLE schema_migrations ADD COLUMN module_id TEXT NOT NULL DEFAULT 'core';
ALTER TABLE schema_migrations ADD COLUMN checksum TEXT;
```

| Rule | Detail |
| --- | --- |
| Naming | `NNN-<module>-<slug>.js`, e.g. `090-market-warehouse-index.js` |
| Ownership | A migration may only create/alter/drop tables listed in its module's manifest |
| Ordering | Global numeric order remains, so upgrades stay deterministic |
| Runner | Validates the file's declared `module_id` against the target table ownership before executing |
| Content | `master_*` migrations belong to `base.content` and run from the content build, not the game boot |
| Rollback | Restore backup; no automatic down migrations |

Existing 89 migrations are grandfathered as `module_id = 'core'`; new ones declare their owner.

---

## 8. Enforcement design

### 8.1 Ownership manifest

```json
{
  "version": 1,
  "modules": {
    "dlc.market": {
      "writes": ["warehouses", "warehouse_stock", "player_stalls", "stall_listings", "..."],
      "reads": ["inventory_items", "player_state", "session_settlements", "master_items"]
    },
    "base.player": {
      "writes": ["player_state", "inventory_items", "player_bag_by_location", "stock_movements"],
      "reads": ["master_items"]
    }
  }
}
```

### 8.2 Guard rules

| Rule | Severity | How |
| --- | --- | --- |
| `foreign-table-write` | hard (new code), ratchet (existing) | Parse SQL literals for `INSERT/UPDATE/DELETE <table>` and compare to manifest |
| `unowned-table` | hard | Every table must appear in exactly one manifest |
| `cross-module-fk` | warn | An FK from module A's table to module B's table requires a read contract |
| `runtime-ddl` | hard | `CREATE TABLE` outside `tools/migrations` fails |
| `master-db-runtime-write` | hard | No `new Database(master.db)` outside `tools/` and `base.content` |
| `direct-cash-write` | hard | Already enforced (budget 0) |

The existing `tools/arch-guard.js` is the right home: it already scans `src` + `engine`, has a baseline mechanism, and runs in CI.

### 8.3 Write mediation

| Aggregate | Required path |
| --- | --- |
| Player cash | `ledger.cash.post` / `player.cash.post` |
| Inventory | `inventory.stock.issue/receive/reserve/move` |
| NPC state | `npc.*` capabilities |
| Settlement | `world.settlement.*` |
| Business P&L | `profession.workshop.settle` |
| Faction treasury | `politics.treasury.*` |

The first three eliminate most of the 30 shared tables.

---

## 9. Path to ownership without a big rewrite

| Step | Action | Risk | Gate |
| --- | --- | --- | --- |
| 1 | Generate the ownership manifest from this document; add a **report-only** guard | None | Guard prints foreign writes, build stays green |
| 2 | Introduce `inventory.*` capabilities; migrate `market`, `social`, `progression` (3 of 9 writers) | Medium | Inventory conservation invariants green; `stock_movements` still one writer path |
| 3 | Introduce `player.cash.post`; migrate `market`, `economy`, `military`, `life` | Medium–high | Cashflow + journal invariants green; `balance = liquid + safe` unchanged |
| 4 | Introduce `world.settlement.*`; migrate military/politics | High | Settlement ownership audit green |
| 5 | Introduce `npc.*`; migrate progression/politics/lineage/market | High | NPC ledger conservation green |
| 6 | Flip the guard from report-only to hard for migrated modules | Low | CI green |
| 7 | Add `module_id` to migrations; move one table set at a time | Medium | Migration status + schema contract green |
| 8 | Remove runtime `master.db` writes; add a content publish command | Medium | Master checksum test green |

Do not flip the guard to hard globally before step 5; that would block all development. Use a ratchet per module: a migrated module must have zero foreign writes; unmigrated modules keep their baseline.

---

## 10. Retention and uninstall

| Case | Policy |
| --- | --- |
| Disable DLC | Keep tables; stop writes; endpoints return `CAPABILITY_UNAVAILABLE` |
| Uninstall DLC | Keep tables and rows; remove code/routes/capabilities |
| Purge DLC | Backup, then drop its owned tables; refuse if another module declares a read of them in the manifest |
| Content update | Build a new `master.db`; keep the previous file for rollback |
| Campaign reset | Backup `session.db`, recreate from bootstrap (existing behavior) |
| Data export | Per module, using its owned tables only |

Because there are only 11 FKs, dropping a table will not cascade; the guard must check foreign reads before purge.

---

## 11. Data ownership verdict

1. **Keep one transactional database.** The game's core loop (time + cash + inventory + obligation + journal) must remain atomic.
2. **Add ownership as metadata and enforcement, not as physical partitioning.** The manifest + guard is cheap and sufficient.
3. **Mediate the three shared aggregates first**: player cash/inventory, NPC state, settlement state. They account for most of the 30 shared tables.
4. **Separate content from runtime.** `master.db` is an artifact; modules read it, never write it.
5. **Give each module its own migration namespace** before any module is packaged.
6. **Uninstall keeps data by default.** Destructive removal is an explicit, backed-up operation.

---

## Appendix A — Per-table ownership record (125 tables)

Writers and readers are units detected by scanning `src/` and `engine/`; `TOOL` is excluded here because content tooling is offline. Unit prefixes: `M:` = module folder, `S` = `src/shared`, `ENG` = `engine/`, `C` = `src/core`, `UI` = `src/client`, `MCP` = `src/mcp`, `SV` = `src/server`. FK = foreign keys declared on the table in the live schema.

Every row whose Write units column lists more than one unit currently relies on a cross-module transaction: the units write the same table outside the owner's control. After extraction, the owner's capability must own that transaction and the other units must call it. The last column records whether the table could move to a separate schema or database; "No — shared txn" means it participates in the player/economy atomic boundary.

| Table | Business owner | Write units | Non-writer read units (top 4) | FKs | Migration owner | Separate schema? |
| --- | --- | --- | --- | --- | --- | --- |
| `master_characters` | `base.content` | — | M:contextual-actions, M:equipment, M:faction-politics, M:instances +7 | 0 | `base.content` | Content DB only |
| `master_crops` | `base.content` | — | M:professions | 0 | `base.content` | Content DB only |
| `master_events` | `base.content` | — | ENG | 0 | `base.content` | Content DB only |
| `master_factions` | `base.content` | — | — | 0 | `base.content` | Content DB only |
| `master_items` | `base.content` | M:professions | UI, M:contextual-actions, M:ecology-logistics, M:economy +7 | 0 | `base.content` | No — runtime seed; move to content |
| `master_locations` | `base.content` | — | M:contextual-actions, M:ecology-logistics, M:economy, M:lineage-succession +4 | 0 | `base.content` | Content DB only |
| `master_perks` | `base.content` | — | M:progression | 0 | `base.content` | Content DB only |
| `master_player_archetypes` | `base.content` | — | M:instances, ENG | 0 | `base.content` | Content DB only |
| `master_poi_scenes` | `base.content` | — | M:ecology-logistics | 0 | `base.content` | Content DB only |
| `master_quest_steps` | `base.content` | — | M:progression | 0 | `base.content` | Content DB only |
| `master_quests` | `base.content` | — | UI, M:progression | 0 | `base.content` | Content DB only |
| `master_quick_chips` | `base.content` | — | — | 0 | `base.content` | Content DB only |
| `master_recipes` | `base.content` | M:professions | M:professions | 1 | `base.content` | No — runtime seed; move to content |
| `master_routes` | `base.content` | — | C, M:ecology-logistics, M:military, ENG | 0 | `base.content` | Content DB only |
| `master_scenarios` | `base.content` | — | M:instances, ENG | 0 | `base.content` | Content DB only |
| `master_skill_effects` | `base.content` | — | M:progression | 0 | `base.content` | Content DB only |
| `master_skills` | `base.content` | — | M:instances, M:life, M:progression, ENG | 0 | `base.content` | Content DB only |
| `master_talent_effects` | `base.content` | — | M:progression | 0 | `base.content` | Content DB only |
| `master_talents` | `base.content` | — | M:progression | 0 | `base.content` | Content DB only |
| `npc_career_shifts` | `base.npc` | M:npc-lifecycle | M:instances | 0 | `base.npc` | No — shared txn |
| `npc_journey_logs` | `base.npc` | M:npc-lifecycle | M:instances | 0 | `base.npc` | No — shared txn |
| `npc_ledger` | `base.npc` | M:npc-lifecycle | M:instances, M:social-kizuna | 0 | `base.npc` | No — shared txn |
| `npc_peer_relations` | `base.npc` | M:npc-lifecycle | M:instances | 0 | `base.npc` | No — shared txn |
| `npc_state` | `base.npc` | M:faction-politics, M:instances, M:lineage-succession, M:military, M:npc-lifecycle, M:professions, M:progression, S, ENG | M:economy, M:equipment, M:faction-politics, M:professions +2 | 0 | `base.npc` | No — shared txn |
| `action_log` | `base.player` | M:progression, S, ENG | M:instances | 0 | `base.player` | No — shared txn |
| `campaign_legacy` | `base.player` | S | M:instances, S | 0 | `base.player` | No — shared txn |
| `chat_chronicle` | `base.player` | M:ecology-logistics, M:instances, M:professions, ENG | — | 0 | `base.player` | No — shared txn |
| `inventory_items` | `base.player` | M:ecology-logistics, M:economy, M:instances, M:lineage-succession, M:professions, M:progression, M:social-kizuna, S, ENG | MCP, M:economy, M:market | 0 | `base.player` | No — shared txn |
| `player_bag_by_location` | `base.player` | — | M:economy, M:instances, S, ENG | 0 | `base.player` | No — shared txn |
| `player_state` | `base.player` | M:ecology-logistics, M:economy, M:instances, M:life, M:lineage-succession, M:market, M:military, M:professions, M:progression, M:social-kizuna, S, ENG | UI, MCP, M:equipment, M:market +1 | 0 | `base.player` | No — shared txn |
| `stock_movements` | `base.player` | M:ecology-logistics, M:economy, M:lineage-succession, M:professions, M:progression, M:social-kizuna, S, ENG | M:instances | 1 | `base.player` | No — shared txn |
| `location_encounter_rates` | `base.world` | — | M:lineage-succession | 0 | `base.world` | No — shared txn |
| `location_sublocations` | `base.world` | — | M:ecology-logistics, M:economy, S | 0 | `base.world` | No — shared txn |
| `regional_ecological_crises` | `base.world` | M:ecology-logistics | M:economy, M:professions, S, ENG | 1 | `base.world` | No — shared txn |
| `session_events` | `base.world` | ENG | M:instances | 0 | `base.world` | No — shared txn |
| `session_settlements` | `base.world` | M:ecology-logistics, M:economy, M:faction-politics, M:instances, M:military, M:npc-lifecycle, S, ENG | M:ecology-logistics, M:economy, M:lineage-succession, M:military +2 | 1 | `base.world` | No — shared txn |
| `settlement_ledger` | `base.world` | S | — | 0 | `base.world` | No — shared txn |
| `id_sequence` | `core.data` | S | — | 0 | `core.data` | No — shared txn |
| `schema_migrations` | `core.data` | — | M:instances | 0 | `core.data` | No — shared txn |
| `account_journal` | `core.ledger` | M:ecology-logistics, M:economy, M:instances, M:lineage-succession, M:military, M:social-kizuna, S, ENG | — | 1 | `core.ledger` | No — shared txn |
| `cashflow_ledger` | `core.ledger` | M:lineage-succession, S, ENG | M:ecology-logistics, M:economy, M:instances, M:life +3 | 0 | `core.ledger` | No — shared txn |
| `active_tasks` | `core.time` | ENG | M:instances | 0 | `core.time` | No — shared txn |
| `campaign_meta` | `core.time` | M:instances, M:military, S, ENG | C, M:ecology-logistics, M:economy, M:faction-politics +7 | 0 | `core.time` | No — shared txn |
| `turn_log` | `core.time` | M:instances, ENG | — | 0 | `core.time` | No — shared txn |
| `world_day_ledger` | `core.time` | S | M:instances | 0 | `core.time` | No — shared txn |
| `world_turn_ledger` | `core.time` | S | M:instances, ENG | 0 | `core.time` | No — shared txn |
| `contract_offers` | `dlc.economy` | M:economy | M:instances | 0 | `dlc.economy` | No — shared txn |
| `financial_loans` | `dlc.economy` | M:economy | M:instances | 0 | `dlc.economy` | No — shared txn |
| `intel_reports` | `dlc.economy` | M:economy | — | 0 | `dlc.economy` | No — shared txn |
| `merchant_promissory_notes` | `dlc.economy` | M:economy, ENG | M:instances | 0 | `dlc.economy` | No — shared txn |
| `obligations` | `dlc.economy` | M:economy | UI, M:instances, S, ENG | 0 | `dlc.economy` | No — shared txn |
| `player_contracts` | `dlc.economy` | M:economy | M:instances | 0 | `dlc.economy` | No — shared txn |
| `settlement_consumption` | `dlc.economy` | — | M:economy, M:market | 0 | `dlc.economy` | No — shared txn |
| `settlement_consumption_log` | `dlc.economy` | M:economy | M:instances | 0 | `dlc.economy` | No — shared txn |
| `settlement_item_endowment` | `dlc.economy` | — | M:economy, M:market | 0 | `dlc.economy` | No — shared txn |
| `settlement_market_history` | `dlc.economy` | M:economy | M:instances | 0 | `dlc.economy` | No — shared txn |
| `settlement_market_state` | `dlc.economy` | M:economy | M:economy, M:instances, M:market | 0 | `dlc.economy` | No — shared txn |
| `character_equipment` | `dlc.equipment` | M:lineage-succession, M:professions | M:equipment, M:instances | 0 | `dlc.equipment` | No — shared txn |
| `player_life_state` | `dlc.life` | M:life | M:instances | 0 | `dlc.life` | No — shared txn |
| `civilian_maidens` | `dlc.lineage` | M:lineage-succession | — | 1 | `dlc.lineage` | No — shared txn |
| `family_ancestors_archive` | `dlc.lineage` | M:lineage-succession | M:instances | 0 | `dlc.lineage` | No — shared txn |
| `family_children` | `dlc.lineage` | M:lineage-succession | M:instances, M:life, M:military, S +1 | 0 | `dlc.lineage` | No — shared txn |
| `family_genealogy_tree` | `dlc.lineage` | M:lineage-succession | M:instances | 0 | `dlc.lineage` | No — shared txn |
| `family_lineage` | `dlc.lineage` | M:lineage-succession | M:instances, S | 0 | `dlc.lineage` | No — shared txn |
| `family_mentorship_logs` | `dlc.lineage` | M:lineage-succession | M:instances, M:lineage-succession | 0 | `dlc.lineage` | No — shared txn |
| `family_spouses` | `dlc.lineage` | M:lineage-succession | M:ecology-logistics, M:instances, M:life, ENG | 0 | `dlc.lineage` | No — shared txn |
| `family_will` | `dlc.lineage` | M:lineage-succession | M:instances | 0 | `dlc.lineage` | No — shared txn |
| `family_will_allocations` | `dlc.lineage` | M:lineage-succession | M:instances | 0 | `dlc.lineage` | No — shared txn |
| `family_will_assets` | `dlc.lineage` | M:lineage-succession | M:instances | 0 | `dlc.lineage` | No — shared txn |
| `freight_contracts` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `freight_shipments` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `merchant_day_ledger` | `dlc.market` | — | M:instances | 0 | `dlc.market` | No — shared txn |
| `merchant_events` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `merchant_route_items` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `merchant_route_stock` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `merchant_routes` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `merchant_shipments` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `npc_market_offers` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `npc_market_sales` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `npc_trade_preferences` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `player_stalls` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `stall_listings` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `stall_sales` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `trade_caravans` | `dlc.market` | M:ecology-logistics, M:military | M:economy, M:instances, ENG | 1 | `dlc.market` | No — shared txn |
| `warehouse_stock` | `dlc.market` | M:market | M:instances | 0 | `dlc.market` | No — shared txn |
| `warehouses` | `dlc.market` | M:market | UI, M:instances, M:lineage-succession, M:market | 0 | `dlc.market` | No — shared txn |
| `bandit_strongholds` | `dlc.military` | M:ecology-logistics, M:market, M:military, M:npc-lifecycle | S | 0 | `dlc.military` | No — shared txn |
| `battle_duels` | `dlc.military` | M:military | M:instances | 0 | `dlc.military` | No — shared txn |
| `conditions` | `dlc.military` | M:military | M:instances, M:military, M:professions, M:progression | 0 | `dlc.military` | No — shared txn |
| `military_expeditions` | `dlc.military` | M:military, ENG | M:instances, M:lineage-succession | 0 | `dlc.military` | No — shared txn |
| `session_duels` | `dlc.military` | M:military | M:instances, M:progression, ENG | 0 | `dlc.military` | No — shared txn |
| `session_sieges` | `dlc.military` | M:military | M:instances, M:military, ENG | 0 | `dlc.military` | No — shared txn |
| `faction_diplomacy` | `dlc.politics` | M:faction-politics, M:instances, ENG | M:military | 0 | `dlc.politics` | No — shared txn |
| `faction_ledger` | `dlc.politics` | S | — | 0 | `dlc.politics` | No — shared txn |
| `faction_officers` | `dlc.politics` | M:faction-politics, M:lineage-succession, M:military, M:social-kizuna | M:lineage-succession | 1 | `dlc.politics` | No — shared txn |
| `faction_political_events` | `dlc.politics` | M:faction-politics, M:military | M:instances | 1 | `dlc.politics` | No — shared txn |
| `retainer_departures` | `dlc.politics` | M:faction-politics | M:instances | 0 | `dlc.politics` | No — shared txn |
| `session_factions` | `dlc.politics` | M:faction-politics, M:instances, S, ENG | M:ecology-logistics, M:economy, M:military | 0 | `dlc.politics` | No — shared txn |
| `unrest_events` | `dlc.politics` | M:faction-politics | M:instances | 0 | `dlc.politics` | No — shared txn |
| `businesses` | `dlc.professions` | M:instances, M:lineage-succession, M:npc-lifecycle, M:professions, S, ENG | UI, M:economy, M:professions, M:progression +2 | 1 | `dlc.professions` | No — shared txn |
| `character_professions` | `dlc.professions` | M:professions | M:instances, ENG | 0 | `dlc.professions` | No — shared txn |
| `character_tool_uses` | `dlc.professions` | M:professions | M:instances | 0 | `dlc.professions` | No — shared txn |
| `emergent_innovations` | `dlc.professions` | M:professions | M:instances, M:professions | 0 | `dlc.professions` | No — shared txn |
| `gathering_node_state` | `dlc.professions` | M:professions | M:instances | 0 | `dlc.professions` | No — shared txn |
| `gathering_nodes` | `dlc.professions` | M:professions | M:contextual-actions, M:ecology-logistics, M:professions | 0 | `dlc.professions` | No — shared txn |
| `land_parcels` | `dlc.professions` | M:professions | M:instances | 0 | `dlc.professions` | No — shared txn |
| `resource_node_rules` | `dlc.professions` | — | M:professions | 0 | `dlc.professions` | No — shared txn |
| `resource_yield_variants` | `dlc.professions` | — | M:professions | 0 | `dlc.professions` | No — shared txn |
| `tool_rules` | `dlc.professions` | — | M:professions | 0 | `dlc.professions` | No — shared txn |
| `discovery_items` | `dlc.progression` | — | M:progression | 0 | `dlc.progression` | No — shared txn |
| `exploration_log` | `dlc.progression` | M:progression | M:instances | 0 | `dlc.progression` | No — shared txn |
| `fame_arrivals` | `dlc.progression` | M:progression | M:instances | 0 | `dlc.progression` | No — shared txn |
| `npc_perks` | `dlc.progression` | M:progression, ENG | M:instances | 0 | `dlc.progression` | No — shared txn |
| `npc_personal_progression` | `dlc.progression` | M:npc-lifecycle, M:progression | M:faction-politics, M:instances, M:lineage-succession, M:market +1 | 0 | `dlc.progression` | No — shared txn |
| `npc_skills` | `dlc.progression` | M:progression, ENG | M:instances | 1 | `dlc.progression` | No — shared txn |
| `player_perks` | `dlc.progression` | M:progression, ENG | M:instances | 0 | `dlc.progression` | No — shared txn |
| `player_quests` | `dlc.progression` | M:progression | UI, M:instances | 0 | `dlc.progression` | No — shared txn |
| `player_skills` | `dlc.progression` | M:instances, M:progression, ENG | M:market, M:professions | 0 | `dlc.progression` | No — shared txn |
| `player_talents` | `dlc.progression` | M:instances, ENG | M:progression | 0 | `dlc.progression` | No — shared txn |
| `prestige_events` | `dlc.progression` | M:progression | M:instances, ENG | 0 | `dlc.progression` | No — shared txn |
| `master_context_dialogues` | `dlc.social` | M:social-kizuna | — | 0 | `dlc.social` | No — runtime rows; publish to content |
| `master_relations_baseline` | `dlc.social` | M:social-kizuna | M:market, M:social-kizuna | 0 | `dlc.social` | No — runtime rows; publish to content |
| `npc_intel_fog` | `dlc.social` | M:lineage-succession, M:social-kizuna | M:instances | 0 | `dlc.social` | No — shared txn |
| `npc_relationship_deltas` | `dlc.social` | M:life, M:lineage-succession, M:military, M:professions, M:social-kizuna, ENG | M:instances, M:market | 0 | `dlc.social` | No — shared txn |
| `npc_episodic_memories` | `int.agent-bridge` | M:agent-bridge, M:military | M:instances | 0 | `int.agent-bridge` | Isolatable with integration |
