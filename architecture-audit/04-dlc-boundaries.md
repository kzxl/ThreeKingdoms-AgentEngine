# 04 — DLC Boundaries

**Purpose:** define the module catalog, ownership, contracts, independence level, and extraction order.

A module here is a **business boundary**, not a folder and not a project. Several proposed modules already map 1:1 to a folder; two do not exist yet (`base.player`, `base.content`) and are proposed because the current code distributes their responsibility across many folders.

---

## 1. Module catalog

### B1 — `base.player`

| Field | Value |
| --- | --- |
| Module ID | `base.player` |
| Module Name | Player Character, Wallet & Inventory |
| Category | Base |
| Current Location | No folder. Responsibility scattered across `src/shared/player-bag.ts`, `src/shared/inventory-movement.ts`, `src/shared/ledger.ts`, `src/modules/*` direct writes |
| Responsibilities | Player identity and vitals; liquid/safe cash; inventory and per-location bag; carrying capacity; equipment slots (with `dlc.equipment`); campaign metadata |
| Owned Features | Wallet, inventory, personal bag, character sheet |
| Owned Data | `player_state`, `inventory_items`, `player_bag_by_location`, `stock_movements`, `campaign_meta`, `campaign_legacy`, `chat_chronicle`, `action_log` |
| Dependencies | Core (ledger, time, ids) |
| Provided Contracts | `player.cash.post`, `player.capital.query`, `inventory.stock.query`, `inventory.stock.issue`, `inventory.stock.receive`, `player.location.get` |
| Required Contracts | `core.ledger`, `core.time` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Very high** — `player_state` has 12 writing units; `inventory_items` has 9 |
| Extraction Risk | **Critical** — a mistake corrupts money and goods |
| Independence | Level 1 only. Never a separately deployable DLC; it is a base module every product includes |

**Why it is first in the catalog but last in the schedule:** you cannot extract other modules cleanly until cash and inventory writes are mediated. The capability list above is the *first* thing to build, even before moving code.

---

### B2 — `base.world`

| Field | Value |
| --- | --- |
| Module ID | `base.world` |
| Module Name | World Map, Settlements & Ecology |
| Category | Base |
| Current Location | `src/modules/ecology-logistics/` (map registry, city/wilderness maps, travel, spatial registry, ecology) + `engine/travel-manager.js` + `engine/spatial-registry.js` |
| Responsibilities | Location graph (20 citadel nodes, 133 sub-locations, 132 POIs), distance and travel, settlement state (owner, garrison, defense, public order), regional crises, encounter rates |
| Owned Features | World map, city mini-map, wilderness map, travel/transit, POI discovery, regional crises |
| Owned Data | `session_settlements`, `location_sublocations`, `location_encounter_rates`, `regional_ecological_crises`, `session_events`, `settlement_ledger`; read view `current_player_location` |
| Dependencies | Core; `base.content` (read-only geography), `base.player` (location) |
| Provided Contracts | `world.location.get`, `world.route.distance`, `world.route.reachable`, `world.settlement.query`, `world.settlement.garrison.adjust`, `world.crisis.active` |
| Required Contracts | `content.location`, `player.location` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Medium** — 2,654 lines, but `session_settlements` has 8 writers |
| Extraction Risk | **High** — military and politics also mutate settlements |
| Independence | Level 1; Level 2 possible after settlement writes are mediated |

---

### B3 — `base.npc`

| Field | Value |
| --- | --- |
| Module ID | `base.npc` |
| Module Name | NPC Lifecycle & Living World |
| Category | Base |
| Current Location | `src/modules/npc-lifecycle/` |
| Responsibilities | NPC state, ambition, career shifts, journey logs, peer relations, monthly lifecycle simulation, NPC ledger |
| Owned Features | NPC roster, autonomous career progression, NPC journey, peer relations |
| Owned Data | `npc_state`, `npc_ledger`, `npc_career_shifts`, `npc_journey_logs`, `npc_peer_relations` |
| Dependencies | Core; `base.content` (characters); `base.world` (locations) |
| Provided Contracts | `npc.query`, `npc.ledger.transfer`, `npc.career.advance`, `npc.lifecycle.tick` |
| Required Contracts | `content.character`, `world.location` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Medium** — 895 lines, but `npc_state` has 9 writers |
| Extraction Risk | **High** — progression, politics, lineage, and market all mutate NPCs |
| Independence | Level 1 |

---

### B4 — `base.content`

| Field | Value |
| --- | --- |
| Module ID | `base.content` |
| Module Name | Master Catalog & Content Pipeline |
| Category | Base |
| Current Location | `master_*` tables in `session.db` / `master.db`; `tools/ingest-markdown-master.js`, `tools/enrich-master-database.js`, `tools/expand-world-master-data.js`, `tools/distill-rotk-master-data.js` |
| Responsibilities | Immutable reference data: items, recipes, skills, perks, talents, locations, routes, characters, factions, quests, scenarios, archetypes, dialogue templates |
| Owned Features | Content import, enrichment, seed data |
| Owned Data | 19 of the 21 `master_*` tables (the other two, `master_context_dialogues` and `master_relations_baseline`, are runtime-owned by `dlc.social`) |
| Dependencies | None at runtime (read-only) |
| Provided Contracts | `content.item.get`, `content.recipe.list`, `content.character.get`, `content.location.get`, `content.catalog.query` |
| Required Contracts | — |
| Runtime Requirement | Embedded (read), offline (write) |
| Extraction Difficulty | **Low** — read-only if the runtime dual-write is removed |
| Extraction Risk | **Medium** — many modules read `master_items` (12 units) |
| Independence | Level 1; can become a content package (Level 2) |

**Rule:** `master.db` and `master_*` tables are written only by the content pipeline, never by a gameplay module. Two modules violate this today: `ContextDialogueService` dual-writes `master_context_dialogues` (`context-dialogue.service.ts:216-235`) and `seedMasterRecipes` inserts into `master_items`/`master_recipes` (`recipes-seed.ts:272-300` via `enterprise-labor.service.ts:399`).

---

### D1 — `dlc.economy`

| Field | Value |
| --- | --- |
| Module ID | `dlc.economy` |
| Module Name | Regional Economy, Prices & Contracts |
| Category | Business |
| Current Location | `src/modules/economy/` + `engine/career-paths.js` (read), `engine/settlement-market-bridge.js` |
| Responsibilities | Price elasticity, local supply/demand/endowment, consumption, obligations, loan/promissory notes, intel reports, contract board |
| Owned Features | Market prices, regional trade, loans, obligations, contract board, intel |
| Owned Data | `settlement_market_state`, `settlement_market_history`, `settlement_consumption`, `settlement_consumption_log`, `settlement_item_endowment`, `contract_offers`, `player_contracts`, `obligations`, `financial_loans`, `intel_reports`, `merchant_promissory_notes` |
| Dependencies | `base.world` (geography), `base.player` (cash), `base.content` (items) |
| Provided Contracts | `market.price.quote`, `market.stock.local`, `market.contract.list`, `economy.obligation.settle`, `economy.loan.apply` |
| Required Contracts | `world.location`, `player.cash.post`, `content.item` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **High** — 4,055 lines, 40 routes, writes `player_state` and `account_journal` directly |
| Extraction Risk | **High** — every price in the game depends on it |
| Independence | Level 1; Level 2 after price API stabilises |

---

### D2 — `dlc.market`

| Field | Value |
| --- | --- |
| Module ID | `dlc.market` |
| Module Name | Trade, Warehousing & Logistics |
| Category | Business |
| Current Location | `src/modules/market/` + `engine/stall-bridge.js`, `freight-bridge.js`, `merchant-bridge.js` |
| Responsibilities | Player stall (ask), NPC offers (bid), warehouses per city, freight contracts, merchant company routes, perishables/cold chain, logistics risk/insurance, caravans |
| Owned Features | Market, stall, warehouse, freight, merchant company, caravan |
| Owned Data | `warehouses`, `warehouse_stock`, `player_stalls`, `stall_listings`, `stall_sales`, `freight_contracts`, `freight_shipments`, `merchant_routes`, `merchant_route_items`, `merchant_route_stock`, `merchant_shipments`, `merchant_events`, `merchant_day_ledger`, `npc_market_offers`, `npc_market_sales`, `npc_trade_preferences`, `trade_caravans` |
| Dependencies | `dlc.economy` (quotes), `base.world` (distances), `base.player` (inventory/cash), `base.npc` (merchant actors) |
| Provided Contracts | `logistics.warehouse.store`, `logistics.route.plan`, `logistics.shipment.reserve`, `market.stall.list`, `market.npc_offer.query` |
| Required Contracts | `market.price.quote`, `world.route`, `inventory.stock.*`, `player.cash.post` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Medium** — 3,055 lines, 21 routes, 17 tables, but 3 cross-boundary writes |
| Extraction Risk | **Medium** — self-contained flows; one accepted invariant already exists for per-city bags |
| Independence | **Level 2 candidate**; the warehouse slice can be Level 2 earliest |

**Cross-boundary writes to fix before extraction:**

- `market/npc-market.service.ts:205` and `merchant-company.service.ts:411-574` update `player_state.liquid_cash` → `player.cash.post`.
- `market/freight.service.ts:602` and `merchant-company.service.ts:359` update `bandit_strongholds` → `bandit.raid` capability owned by `dlc.military` or a neutral `base.world` threat service.
- `market/*` reads/writes `inventory_items` directly → `inventory.stock.*`.

---

### D3 — `dlc.professions`

| Field | Value |
| --- | --- |
| Module ID | `dlc.professions` |
| Module Name | Livelihoods, Gathering, Farming & Workshops |
| Category | Business |
| Current Location | `src/modules/professions/` + `engine/workshop-engine.js`, `business-economics.js`, `farm-bridge.js` |
| Responsibilities | Gathering nodes and yields, tool wear/repair, farming parcels/crops/rotation, recipes and processing, workshops/businesses P&L, wage labour, specialist workforce, bespoke forge |
| Owned Features | Craft professions, farm, workshop, trade, labour |
| Owned Data | `businesses`, `character_professions`, `character_tool_uses`, `gathering_nodes`, `gathering_node_state`, `resource_node_rules`, `resource_yield_variants`, `land_parcels`, `tool_rules`, `emergent_innovations` |
| Dependencies | `dlc.progression` (skill EXP), `base.player` (inventory/cash), `base.world` (nodes/land), `base.content` (recipes/items) |
| Provided Contracts | `profession.node.harvest`, `profession.crop.plant`, `profession.workshop.settle`, `profession.labor.hire`, `profession.tool.wear` |
| Required Contracts | `progression.skill.award`, `inventory.stock.*`, `player.cash.post` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Very high** — 7,576 lines, 21 routes, 44 `inventory_items` write sites |
| Extraction Risk | **High** — monthly settlement is entangled with the turn loop |
| Independence | Level 1; Level 2 only after the inventory contract lands |

---

### D4 — `dlc.progression`

| Field | Value |
| --- | --- |
| Module ID | `dlc.progression` |
| Module Name | Skills, Fame, Prestige & Quests |
| Category | Business |
| Current Location | `src/modules/progression/` + `src/shared/character-stats/`, `src/shared/skill-exp.ts`, `src/shared/prestige.ts`, `engine/career-paths.js` |
| Responsibilities | Skill trees and EXP, perks, talents, attribute growth, fame 0–10,000, prestige events, fame arrivals, quests, exploration, retainer loyalty, career paths |
| Owned Features | Skills, fame, quests, exploration, career |
| Owned Data | `player_skills`, `player_perks`, `player_talents`, `npc_skills`, `npc_perks`, `prestige_events`, `fame_arrivals`, `player_quests`, `exploration_log`, `discovery_items` |
| Dependencies | `base.player`, `base.npc`, `base.content` (skills/perks/talents/quests) |
| Provided Contracts | `progression.skill.award`, `progression.fame.award`, `progression.talent.query`, `progression.quest.start`, `progression.career.paths` |
| Required Contracts | `player.state`, `npc.query`, `content.skill` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **High** — 2,843 lines but imported by 8 other modules |
| Extraction Risk | **High** — fame and skill awards are cross-cutting |
| Independence | Level 1; contract-first only |

---

### D5 — `dlc.social`

| Field | Value |
| --- | --- |
| Module ID | `dlc.social` |
| Module Name | Kizuna, Dialogue & Social Life |
| Category | Business |
| Current Location | `src/modules/social-kizuna/` + `src/modules/contextual-actions/` (partly) |
| Responsibilities | Affinity/respect network, sworn brotherhood, hooks, dialogue selection, daily interaction, tavern banquets, intel fog |
| Owned Features | Relations, dialogue, banquet, daily interaction |
| Owned Data | `npc_relationship_deltas`, `npc_intel_fog`, `master_context_dialogues` (runtime copy) |
| Dependencies | `dlc.progression` (skills), `base.npc`, `base.player`, `base.content` (dialogue), `dlc.lineage` (optional) |
| Provided Contracts | `social.relation.adjust`, `social.dialogue.pick`, `social.banquet.hold`, `social.intel.reveal` |
| Required Contracts | `npc.query`, `progression.skill.award` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Medium** — 3,098 lines, 21 routes |
| Extraction Risk | **Medium** — inventory gifts and faction officers cross boundaries |
| Independence | Level 1; Level 2 after gifts go through inventory contract |

---

### D6 — `dlc.lineage`

| Field | Value |
| --- | --- |
| Module ID | `dlc.lineage` |
| Module Name | Family, Marriage & Succession |
| Category | Business |
| Current Location | `src/modules/lineage-succession/` + `engine/lineage-bridge.js`, `src/shared/business-succession.ts` |
| Responsibilities | Courtship/betrothal, marriage roles, pregnancy/genetics, children, mentorship, wills, dynasty succession, ancestor archive, civilian maiden pool |
| Owned Features | Household, marriage, children, succession |
| Owned Data | `family_lineage`, `family_spouses`, `family_children`, `family_genealogy_tree`, `family_mentorship_logs`, `family_will`, `family_will_allocations`, `family_will_assets`, `family_ancestors_archive`, `civilian_maidens` |
| Dependencies | `base.player`, `base.npc`, `dlc.progression` (career modifiers), `dlc.social` (affinity), `dlc.professions` (business inheritance) |
| Provided Contracts | `lineage.spouse.query`, `lineage.child.birth`, `lineage.heir.designate`, `lineage.will.execute`, `lineage.ancestor.record` |
| Required Contracts | `npc.query`, `social.relation.adjust`, `progression.career.paths` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Medium** — 4,033 lines, 19 routes |
| Extraction Risk | **Low–medium** — **all 10 owned tables are single-writer**, the cleanest ownership in the repository |
| Independence | **Level 2 candidate**, second after `market` |

---

### D7 — `dlc.politics`

| Field | Value |
| --- | --- |
| Module ID | `dlc.politics` |
| Module Name | Factions, Offices & Unrest |
| Category | Business |
| Current Location | `src/modules/faction-politics/` |
| Responsibilities | Faction state, officers and court ranks, diplomacy (war/peace/alliance), political events, unrest and retainer departures, governor appointment, titles |
| Owned Features | Factions, court, diplomacy, unrest |
| Owned Data | `session_factions`, `faction_officers`, `faction_diplomacy`, `faction_political_events`, `faction_ledger`, `unrest_events`, `retainer_departures` |
| Dependencies | `dlc.progression` (prestige), `dlc.military` (war outcomes), `base.world` (settlements), `base.npc` |
| Provided Contracts | `politics.faction.query`, `politics.diplomacy.state`, `politics.office.appoint`, `politics.unrest.apply` |
| Required Contracts | `world.settlement.query`, `progression.fame.award`, `npc.query` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Medium** — 1,327 lines, 6 routes |
| Extraction Risk | **Medium** — shares settlement ownership with military |
| Independence | Level 1 |

---

### D8 — `dlc.military`

| Field | Value |
| --- | --- |
| Module ID | `dlc.military` |
| Module Name | Warfare, Sieges & Duels |
| Category | Business |
| Current Location | `src/modules/military/` + `engine/ai-war-bridge.js`, `siege-bridge.js`, `field-battle-bridge.js`, `battle-duel-bridge.js`, `expedition-bridge.js`, `condition-bridge.js` |
| Responsibilities | Supply graph, expeditions, sieges, field battles, tactical battle rounds, single combat, duels, injuries/death, bandit strongholds, AI war simulation |
| Owned Features | Campaigns, sieges, field battles, duels, injuries |
| Owned Data | `military_expeditions`, `session_sieges`, `battle_duels`, `session_duels`, `conditions`, `bandit_strongholds` |
| Dependencies | `dlc.progression` (skills/fame), `dlc.lineage` (death/heir), `base.world` (routes/settlements), `base.player` (vitals), `dlc.equipment` |
| Provided Contracts | `military.supply.reachable`, `military.expedition.order`, `military.siege.resolve`, `military.duel.resolve`, `condition.apply`, `bandit.raid` |
| Required Contracts | `world.route`, `progression.skill.award`, `player.vitals`, `equipment.loadout` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **High** — 5,544 lines, 40 routes across two controllers, strongest engine coupling |
| Extraction Risk | **High** — 8 writers on `session_settlements`, prebattle death path |
| Independence | Level 1; Level 2 only after settlement and condition contracts |

---

### D9 — `dlc.life`

| Field | Value |
| --- | --- |
| Module ID | `dlc.life` |
| Module Name | Daily Life & Self-Care |
| Category | Business |
| Current Location | `src/modules/life/` |
| Responsibilities | Player life state (hygiene, mood, virtue), daily self-care actions, growth focus, spouse roles, LIFE skills integration |
| Owned Features | Daily life, rest, self-cultivation |
| Owned Data | `player_life_state` |
| Dependencies | `dlc.progression` (skills), `dlc.social` (spouse), `base.player` |
| Provided Contracts | `life.state.get`, `life.action.perform` |
| Required Contracts | `player.state`, `progression.skill.award` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Low** — 528 lines, 2 routes, 1 table |
| Extraction Risk | **Low** |
| Independence | Level 2 candidate, but low business value; extract as a pattern proof, not as a product |

---

### D10 — `dlc.equipment`

| Field | Value |
| --- | --- |
| Module ID | `dlc.equipment` |
| Module Name | Equipment & Loadout |
| Category | Business |
| Current Location | `src/modules/equipment/` + `src/modules/professions/blacksmith-forge.service.ts` (overlap) |
| Responsibilities | Equip/unequip, slot rules, equipment-derived combat stats, repair hooks |
| Owned Features | Equipment, forging |
| Owned Data | `character_equipment` |
| Dependencies | `base.player`, `dlc.professions` (forge), `dlc.progression` (stats) |
| Provided Contracts | `equipment.loadout.get`, `equipment.equip`, `equipment.unequip` |
| Required Contracts | `inventory.stock.query`, `progression.stats` |
| Runtime Requirement | Embedded |
| Extraction Difficulty | **Low** — 499 lines, 1 table |
| Extraction Risk | **Low–medium** — forge overlap |
| Independence | Level 2; **candidate to merge into `dlc.professions`** if forge remains there |

---

### I1 — `int.mcp`

| Field | Value |
| --- | --- |
| Module ID | `int.mcp` |
| Module Name | Model Context Protocol Server |
| Category | Integration |
| Current Location | `src/mcp/` |
| Responsibilities | JSON-RPC 2.0 over stdio; expose simulation tools to agents/IDEs |
| Owned Features | MCP tool surface |
| Owned Data | None |
| Dependencies | Core capabilities |
| Provided Contracts | MCP tool schemas |
| Required Contracts | `player.*`, `market.*`, `military.*`, `social.*`, `npc.*` |
| Runtime Requirement | **Isolated (separate process, stdio)** — already true |
| Extraction Difficulty | **Low** |
| Extraction Risk | **Low** |
| Independence | **Level 3 already achieved** |

---

### I2 — `int.agent-bridge`

| Field | Value |
| --- | --- |
| Module ID | `int.agent-bridge` |
| Module Name | Semantic Memory & Agent Bridge |
| Category | Integration |
| Current Location | `src/modules/agent-bridge/` + `src/modules/social-kizuna/context-dialogue.service.ts` |
| Responsibilities | Episodic NPC memory, semantic intervention requests, dialogue harvesting and caching |
| Owned Features | NPC memory, AI dialogue cache |
| Owned Data | `npc_episodic_memories`; writes `master_context_dialogues` (should be publish-only) |
| Dependencies | `base.npc`, `base.content` |
| Provided Contracts | `agent.memory.record`, `agent.memory.query`, `agent.intervention.request` |
| Required Contracts | `npc.query`, `content.dialogue.publish` |
| Runtime Requirement | Embedded now; **Isolated optional** if LLM calls become long-running |
| Extraction Difficulty | **Low** — 198 lines |
| Extraction Risk | **Low** |
| Independence | Level 3 optional |

---

### U1 — `ui.web-ts`

| Field | Value |
| --- | --- |
| Module ID | `ui.web-ts` |
| Module Name | TypeScript Client Slices |
| Category | UI |
| Current Location | `src/client/` (17 feature folders + core) |
| Responsibilities | Modal shell, UI primitives, typed API client, feature slices |
| Owned Features | Lineage, equipment, enterprise, caravan, trade, tactical battle, title screen, transit, world map, market stall, workforce, onboarding, quests, journal, spatial POI |
| Owned Data | None (browser cache only) |
| Dependencies | HTTP API contracts |
| Provided Contracts | `window.*` bridge (temporary) |
| Required Contracts | 216 HTTP routes |
| Runtime Requirement | Browser |
| Extraction Difficulty | **Medium** |
| Extraction Risk | **Medium** — `legacy-bridge` and duplicate modal ids |
| Independence | Level 1; can ship as a bundle per product |

---

### U2 — `ui.web-legacy`

| Field | Value |
| --- | --- |
| Module ID | `ui.web-legacy` |
| Module Name | Legacy Browser Scripts |
| Category | UI |
| Current Location | `public/js/` (21 files), `public/app.js`, `public/index.html`, `public/styles.css` |
| Responsibilities | Dossiers, world map, modals, journal, turn advance, story/deck, i18n, traversal |
| Owned Features | Most of the current play screen |
| Owned Data | None |
| Dependencies | `window` globals, `/api/*` |
| Provided Contracts | none |
| Required Contracts | legacy and modular HTTP routes |
| Runtime Requirement | Browser |
| Extraction Difficulty | **Very high** — 17,820 lines, 64 inline handlers, frozen count |
| Extraction Risk | **High** — user-visible regressions |
| Independence | **Not a DLC.** Freeze, replace slice by slice, then delete |

---

### P1 — `platform.instances`

| Field | Value |
| --- | --- |
| Module ID | `platform.instances` |
| Module Name | Campaign Instances & Session Reset |
| Category | Platform |
| Current Location | `src/modules/instances/` + `tools/sim-web.js` `/api/instances/*` + `/api/game/new-session` |
| Responsibilities | Instance listing/clone/delete, template bootstrap, single-active-DB enforcement, backup before reset |
| Owned Features | Title screen new/continue, instance management |
| Owned Data | `saves/instances/*.db`, backup files |
| Dependencies | Core data, content bootstrap |
| Provided Contracts | `session.new`, `session.reset`, `session.list` |
| Required Contracts | `core.data`, `base.content` |
| Runtime Requirement | Embedded process management |
| Extraction Difficulty | **Low** — already isolated |
| Extraction Risk | **Medium** — destructive operations |
| Independence | Level 1 platform service |

---

### P2 — `platform.tooling`

| Field | Value |
| --- | --- |
| Module ID | `platform.tooling` |
| Module Name | Verification, Audit & Content Tooling |
| Category | Platform |
| Current Location | `tools/`, `tests/` |
| Responsibilities | Migration runner, audit invariants, golden API contracts, write smokes, architecture guard, scaffold |
| Owned Features | The gate |
| Owned Data | `schema_migrations` (shared with Core) |
| Dependencies | Core contracts |
| Provided Contracts | CLI + invariant registration |
| Required Contracts | `core.data`, `core.ledger` |
| Runtime Requirement | Build/CI only |
| Extraction Difficulty | **Low** |
| Extraction Risk | **Low** |
| Independence | Level 1; not shipped to players |

---

## 2. Independence level per module

| Level | Definition | Modules |
| --- | --- | --- |
| **L1 — Feature modularization** | Separate source boundary, compiled and deployed together | `base.player`, `base.world`, `base.npc`, `base.content`, `dlc.economy`, `dlc.professions`, `dlc.progression`, `dlc.social`, `dlc.politics`, `dlc.military`, `ui.web-ts`, `platform.tooling` |
| **L2 — Package modularization** | Can be packaged, registered and enabled independently | `dlc.market`, `dlc.lineage`, `dlc.life`, `dlc.equipment`, `platform.instances` |
| **L3 — Runtime independence** | Separate process or machine | `int.mcp` (today), `int.agent-bridge` (optional) |

**Do not push business DLC to L3.** The single-file ledger, turn atomicity, and player-facing latency all argue against it. The only measured reason for L3 is a long-running external integration (MCP/LLM).

---

## 3. Extraction scoring

Scores 1–5; higher is better. Coupling, complexity, and risk are inverted (5 = low).

| Module | Cohesion | Low coupling | Data ownership | Contract stability | Runtime independence | Low complexity | Low risk | Total /35 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `int.mcp` | 5 | 4 | 5 | 4 | 5 | 4 | 5 | **32** |
| `dlc.life` | 3 | 4 | 5 | 3 | 4 | 4 | 4 | **27** |
| `int.agent-bridge` | 3 | 4 | 4 | 3 | 5 | 4 | 4 | **27** |
| `dlc.lineage` | 5 | 3 | 5 | 4 | 3 | 3 | 3 | **26** |
| `dlc.market` | 5 | 3 | 4 | 4 | 3 | 3 | 3 | **25** |
| `dlc.equipment` | 3 | 3 | 3 | 3 | 4 | 4 | 4 | **24** |
| `dlc.social` | 5 | 3 | 3 | 4 | 2 | 3 | 3 | **23** |
| `base.world` | 4 | 3 | 2 | 3 | 3 | 3 | 3 | **21** |
| `base.npc` | 4 | 3 | 2 | 3 | 3 | 3 | 3 | **21** |
| `dlc.politics` | 4 | 3 | 3 | 3 | 2 | 3 | 3 | **21** |
| `dlc.professions` | 4 | 2 | 4 | 3 | 3 | 2 | 2 | **20** |
| `dlc.progression` | 4 | 2 | 3 | 3 | 2 | 3 | 3 | **20** |
| `dlc.economy` | 4 | 2 | 3 | 3 | 3 | 2 | 2 | **19** |
| `dlc.military` | 4 | 2 | 4 | 3 | 2 | 2 | 2 | **19** |
| `ui.web-ts` | 4 | 2 | 1 | 2 | 5 | 2 | 2 | **18** |
| `ui.web-legacy` | 4 | 2 | 1 | 2 | 5 | 2 | 2 | **18** |
| `base.player` | 4 | 1 | 1 | 2 | 2 | 2 | 2 | **14** |

---

## 4. Recommended extraction order

| Order | Module | Why | Target level |
| --- | --- | --- | --- |
| 0 | **Contracts + capability broker + ownership guard** | Nothing can move safely before this | — |
| 1 | **`dlc.market` / `warehouse` slice** | 7 routes, 2 owned tables, clean flows, immediate product value; proves the pattern | L1 → L2 |
| 2 | **Full `dlc.market`** | Completes a recognisable DLC with stall/freight/merchant routes | L2 |
| 3 | **`dlc.lineage`** | Cleanest data ownership (10 single-writer tables), second-domain proof | L2 |
| 4 | **`dlc.life` + `dlc.equipment`** | Small, low-risk consolidations; reduce folder sprawl | L2 |
| 5 | **`dlc.military`** | High value, high risk; do after condition/settlement contracts | L1 |
| 6 | **`dlc.professions`** | Largest module; needs inventory contract first | L1 |
| 7 | **`dlc.economy`** | Price API becomes the stable economic contract | L2 |
| 8 | **`base.player`, `base.world`, `npcs`** | These are base modules, not DLC; stabilize after 3–4 DLCs prove the contracts | L1 |
| 9 | **Product manifests** | Enable merchant/warlord/sandbox compositions | — |

The order deliberately starts with **market**, not with the easiest module (`life`) and not with the largest (`professions`). Market gives business value, stress-tests cash/inventory/logistics contracts, and can be unbundled in useful slices.

---

## 5. What must not be split

| Candidate | Reason |
| --- | --- |
| `contextual-actions` (2,105 lines) | An aggregator/BFF over market, economy, social, ecology, progression. Splitting it creates a hub with edges to everything |
| `instances` (1,085 lines) | Session/deployment infrastructure, not a business domain |
| The 18 `engine/*-bridge.js` files | Adapters; one project per bridge would be wrapper hell |
| `src/client/core` modal shell/UI primitives | Shared UI kernel, not a product feature |
| Each individual feature inside a DLC | Do not create a project per `warehouse`, `stall`, `freight`, `merchant`; they are folders inside one DLC package |
| The legacy UI | Freeze and replace; do not modularize |

---

## 6. Boundary tests (how to know a module is really separate)

A module is only "extracted" when all of these pass:

1. **Build test:** the module's `index.ts` imports only `@platform/contracts`, `@platform/core`, and declared capability clients. A dependency scan fails on any other import.
2. **Ownership test:** the SQL ownership guard finds zero writes outside the module's table list.
3. **Composition test:** disabling the module in a product manifest boots the rest of the product and returns a typed `CAPABILITY_UNAVAILABLE` for its endpoints.
4. **Data test:** uninstalling the module leaves its tables intact and the rest of the game playable.
5. **Contract test:** the module's capability contract has a version and at least one consumer test using a fake provider.
6. **UI test:** removing the module's UI slice leaves no dangling `onclick` or `window.*` reference.

Today, only `int.mcp` passes a meaningful subset (separate process, no shared table writes). `dlc.lineage` is the closest business candidate on ownership; `dlc.market.warehouse` is the closest on surface area.
