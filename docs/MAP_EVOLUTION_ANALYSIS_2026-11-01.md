# Map Evolution Analysis — Node Graph vs ROTK XIV-Style Tile Layer

Date: 2026-11-01
Scope: `public/js/map-data.js`, `public/js/world-map.js`,
`src/client/features/world-map/map-live.service.ts`,
`src/modules/ecology-logistics/spatial-registry.ts`, `master_locations`,
`master_poi_scenes`, `gathering_nodes`, `master_routes`.

## 1. Current state

| Layer | Reality |
| :--- | :--- |
| Rendered nodes | 20 citadel nodes in `map-data.js`; only `.map-node` has `onclick` |
| Routes | 24 curved paths with tooltip and intel; `vector-effect: non-scaling-stroke` |
| Settlements in DB | 23 `session_settlements`; 3 snap to the nearest node (`he_fei`, `pu_yang`, `wu_ling`) |
| Sub-locations | 133 in `master_locations`; only 40 in `map-data.js`; 15/20 cities expose one |
| POI scenes | 132 `master_poi_scenes` rows; one endpoint, no runtime scene consumer |
| Resource nodes | 23 `gathering_nodes`; resource layer is read-only and `pointer-events: none` |
| Passes | Hổ Lao / Đồng Quan / Kiếm Các are decorative `<g class="map-pass">` with no click |
| Data sources | 4: `map-data.js`, `map-live.service.ts`, `spatial-registry.ts`, SQLite |

The map is a **strategic node graph with a painted background**. It is good at
what it does: 20 nodes and 24 routes render fluidly and the intel panel is live.
It is not a spatial world: a location either is one of the 20 citadels, or it
cannot be clicked, travelled to, or taxed.

## 2. What a ROTK XIV-style tile map would add

A continuous tile/terrain layer under the settlement nodes would provide:

- **Terrain as data**: plains, hills, forest, river, marsh, pass. Movement cost,
  ambush risk, supply attrition and farm/fish yields can read one field instead
  of per-feature heuristics.
- **Spatial sub-locations**: a wilderness scene is a tile cluster, not a name in
  a list. POIs, resource nodes and local encounters become map objects.
- **Real pathfinding**: A* over tiles with roads, rivers and passes; multi-leg
  waypoints and blockade become natural.
- **Fog and intelligence**: visibility by tile radius; `settlement_intel` can
  record discovered tiles, not only city-level confidence.
- **Consistent profession layer**: farm, fishing bank, hunting ground, mine and
  herb slope are placed on the same grid the army marches over.

These are exactly the remaining Level 4–5 map features and several profession
Phase 2–4 items. A tile layer is therefore a good **target architecture**.

## 3. Why a full tile rewrite now is the wrong next step

1. **The immediate defect is ownership, not resolution.** Four map data sources
   already disagree (20 vs 23 settlements, 40 vs 133 sub-locations). A tile map
   on top of that would multiply the disagreement.
2. **The feature backlog does not depend on tiles.** Market, freight, NPC
   succession, quests and the life layer work on the node graph. Only movement,
   fog, terrain combat and wilderness scenes need finer space.
3. **Art and UI cost is high.** ROTK XIV’s map is a bespoke art asset. A
   tile-based SVG/Canvas map needs terrain tiles, transitions, labels at three
   zoom levels, and a new panel model; that is weeks of visual work before the
   first feature benefits.
4. **Determinism and save compatibility.** Tile coordinates, pathfinding and
   visibility must be seeded and versioned; a rewrite invalidates existing
   save positions and route data.
5. **Performance is already adequate.** 20 nodes / 24 routes at 60 fps is a
   solved problem. A 200–400 tile layer is also feasible, but only after the
   data model is canonical.

Verdict: **adopt a hybrid tile layer, not a full ROTK XIV rewrite.**

## 4. Recommended target: three-layer map

```text
Layer 1 — World graph (strategic)
  20–23 settlement nodes, 41 master_routes, faction ownership, armies, caravans.

Layer 2 — Tile/terrain field (spatial)
  map_tiles: terrain, movement cost, ambush modifier, supply yield,
  settlement_id, sub_location_id, resource_node_id.

Layer 3 — Scene objects (narrative)
  POIs, resource nodes, passes, wilderness encounters; each resolves to a tile
  and a sub-location.
```

The existing SVG map keeps its 20 nodes and 24 routes. Tiles are rendered only
at local zoom (or as a terrain wash at region zoom). A click on a tile/POI
resolves to `sub_location_id`; a click on a city resolves to the city node.

### Proposed schema

```sql
map_regions(region_id, name_vi, name_en, terrain_default)
map_tiles(tile_id, region_id, x, y, terrain, movement_cost, ambush_modifier,
          supply_yield, settlement_id, sub_location_id, resource_node_id)
map_edges(edge_id, from_tile, to_tile, edge_type, distance_li)
location_sublocations(sub_location_id, location_id, name_vi, name_en,
                      kind, tile_id, scene_key)
```

- `master_locations` remains the city/sub-location catalog.
- `map_tiles` references `sub_location_id`; it does not duplicate names.
- `master_routes` stays the strategic edge list; `map_edges` is only the local
  path graph.
- `master_poi_scenes` gets a `sub_location_id` foreign key; the scene key is
  resolved from the tile, not from a hardcoded list.

### Migration path

| Step | Work | Risk | Value |
| :--- | :--- | :--- | :--- |
| A | One map registry: DB is authoritative, `map-data.js` keeps coordinates/art only, `spatial-registry` becomes a query, all 133 sub-locations resolve | Low | Fixes the 4-source defect; makes POIs reachable |
| B | Clickable passes/POIs/resources; Nội Thành / Dã Ngoại picker; 8–12 wilderness scenes | Low–medium | First playable spatial content |
| C | Terrain tiles at local zoom; movement cost, supply, ambush read `map_tiles` | Medium | Level 4 command layer; professions Phase 3 |
| D | Fog of war, multi-leg waypoints, diplomacy mode, army token interpolation | Medium | Level 4 complete |
| E | Full terrain art, seasons, timeline replay | High | Level 5; only after A–D are stable |

Do A and B before any tile rendering. They are prerequisites and are useful even
if the tile layer never ships.

## 5. Feature impact

| Feature | Node graph now | Tile layer benefit |
| :--- | :--- | :--- |
| Market/freight | Works; distance from `master_routes` | Better route risk, terrain surcharge, per-road ambush |
| Professions | Farm/fish/hunt nodes are settlement-level | Nodes become tile objects; spatial gather is natural |
| Military | March by route, supply BFS | Terrain combat, chokepoints, real multi-leg movement |
| Quests | POI scene key is cosmetic | Scene resolved from tile/sub-location; local encounters |
| Fog/intel | City-level confidence | Tile discovery and stale beliefs |
| UI | One SVG, 20 clickable nodes | Local zoom, tile hover, POI picker, minimap |
| Performance | Solved at 20/24 | 200–400 tiles needs culling and a spatial index |

## 6. Recommendation

1. **Do not start with a new map.** Start with **Step A**: one registry and 133
   reachable sub-locations. This directly fixes the current defect and unlocks
   wilderness/POI content.
2. **Do Step B** next: clickable passes/resources and a Nội Thành / Dã Ngoại
   picker. This gives most of the perceived “living map” without tile art.
3. **Add tiles only for mechanics that need them**: movement cost, supply,
   ambush, fog. Render them as a local-zoom layer, not a replacement for the
   strategic node map.
4. **Do not adopt ROTK XIV’s full continuous map** until field movement and
   terrain combat are core loops. The current economy/RPG loop does not justify
   the art and migration cost.

The decision record is ADR-052; the implementation steps belong to Wave 5
(Level 4–5) and the profession Phase 2–3 plan.
