# Two-Scale Map Design — City Mini-Map + Wilderness Tile Layer

Date: 2026-11-01
Status: **Wilderness slice implemented in 1.47.0 (`c8a8168`).** 40 WILDERNESS
rows have local coordinates, `current_sub_location` is server-owned, and the
wilderness modal/travel API are live. The city mini-map (93 URBAN rows) remains
the next phase.

## 1. Verdict

The proposed split is the right direction:

- **Out-of-city locations** (`WILDERNESS`, `WATER`, `ROAD`, `RUINS`) belong on a
  local tile/terrain map where movement, supply, ambush and resource nodes have
  spatial meaning.
- **In-city locations** (`URBAN`) belong on a **city mini-map**: a compact
  district/hotspot scene, not a tile simulation. The player clicks the market,
  tavern, forge, arena, residence or workshop and gets the existing contextual
  scene.
- The **20-node strategic world map** stays on top as the political layer.

This is better than one continuous ROTK XIV-style map because it matches the
actual content split and keeps art cost bounded.

## 2. What the data says

Migration 081 normalized 133 sub-locations:

| Kind | Count |
| :--- | ---: |
| `URBAN` | 93 |
| `WILDERNESS` | 40 |

Per city, the urban count ranges from 2 to 7:

| Urban POIs | Cities |
| :--- | :--- |
| 7 | Zhuo, Pingyuan, Ye, Xuchang (4) |
| 6 | Luoyang, Jicheng (2) |
| 5 | Guangzong, Chang'an, Xiapi, Chengdu, Shangdang (5) |
| 4 | Chibi, Jianye, Wan, Xi Liang (4) |
| 3 | Xiangyang, Jiaozhi (2) |
| 2 | Jiangling, Hanzhong, Jiao Province (3) |

Implications:

- A city mini-map is viable for every city because every city has at least two
  urban hotspots.
- Five cities are sparse; they need a shared district template (gate, market,
  residence, government office) rather than bespoke art.
- 40 wilderness points are enough for 8–12 hand-authored scenes plus generic
  terrain around every city.
- 132 POI scenes already exist; they should be attached to sub-locations, not
  duplicated per map mode.

## 3. Three surfaces

```text
1. World map (strategic, 20 nodes, 24 routes)
   Click a city → city intel → enter city or leave the city.

2. City mini-map (URBAN, 2–7 hotspots per city)
   Market, tavern, forge, arena, residence, workshop, gate, government office.
   Click a hotspot → existing ContextActionEngine scene. No free walking.

3. Wilderness local map (WILDERNESS/WATER/ROAD/RUINS, 40 points)
   Tile/terrain layer around the city: farms, fishing banks, mines, passes,
   bandit lairs, POIs. Movement costs days/fatigue; ambush and supply apply.
```

Navigation breadcrumb:

```text
Thiên Hạ → Trung Nguyên → Trác Huyện → Nội Thành / Dã Ngoại → POI
```

Back and “return to city” must be one click at every level.

## 4. Why not a single continuous tile map

- City interaction is menu/spatial-hotspot work; making the player walk a tile
  grid to reach the market adds clicks without adding decisions.
- 93 urban POIs across 20 cities need 20 readable scenes. A hotspot diagram is
  cheap and legible; 20 tile cities are expensive.
- Wilderness needs tiles because movement, terrain and supply are the
  mechanics. That is 40 points, not 20 full cities.
- A continuous map would still need the 20-node political graph for armies,
  caravans and diplomacy; keeping the graph avoids rewriting those systems.

## 5. Data model

### 5.1 Extend the registry

```sql
location_sublocations(
  sub_location_id, location_id, name_vi, name_en,
  kind, sort_order, map_scope, local_x, local_y, icon_key, scene_key, tile_id
)
```

- `map_scope`: `CITY` for URBAN, `WILDERNESS` for the other kinds. A row may
  override in data.
- `local_x`, `local_y`: normalized 0–1 coordinates inside the city mini-map or
  the local tile map.
- `icon_key`: market / tavern / forge / arena / residence / workshop / gate /
  farm / fish / mine / pass / lair.
- `scene_key`: joins `master_poi_scenes` for a named POI.
- `tile_id`: only for wilderness rows that get a tile.

### 5.2 Track the player's sub-location on the server

```sql
player_state.current_sub_location TEXT NULL
```

Backfill to `master_locations.default_sub_loc`; update on city/wilderness
transitions. This is required for the split to be authoritative: gathering,
trading, resting and quests must validate the sub-location, not only the
settlement.

### 5.3 City map content

No new city table is needed for the first pass. A city mini-map is a layout over
`location_sublocations` rows where `map_scope='CITY'`. A `city_map_layouts` table
is only needed if cities get multiple visual themes or custom background art:

```sql
city_map_layouts(location_id, theme_key, background_asset, viewbox)
```

Start without it; add when the second bespoke city art arrives.

## 6. UI and state

- One map shell with three view modes: World / City / Wilderness. The mode is
  derived from `map_scope` and the current node.
- City mode renders hotspots from `subLocationsByNode[nodeId]` filtered to
  `map_scope='CITY'`; each hotspot opens the existing context scene.
- Wilderness mode renders `map_scope='WILDERNESS'` rows plus resource nodes and
  POIs; travel uses the action-time/fatigue path.
- The legacy `local-poi-picker` becomes a fallback only; the primary entry is
  the city mini-map / wilderness map.
- A city with fewer than 4 urban rows gets the shared template: gate, market,
  residence and government office.

## 7. Feature impact

| Feature | City mini-map | Wilderness layer |
| :--- | :--- | :--- |
| Market/stall/warehouse | Hotspots at market and warehouse | Routes and freight use world graph |
| Tavern/banquet/arena | Hotspots with existing scenes | Bandit lair encounters |
| Forge/workshop | Hotspot and workforce entry | Mines and timber camps |
| Farm/fish/hunt | City gate to local map | Farm, fishing bank, hunting ground |
| Quest/POI | Named POI scene | 8–12 wilderness scenes |
| Military | Siege districts and walls (later) | Field movement, supply, ambush |
| Fog | District discovery | Tile discovery and stale intel |
| NPC location | District-level placement | Tile/node-level placement |

## 8. Content plan

### City tiers

| Tier | Cities | Approach |
| :--- | :--- | :--- |
| A | Zhuo, Luoyang, Chang'an, Ye, Xuchang | Bespoke mini-map, 5–7 hotspots |
| B | Jicheng, Pingyuan, Guangzong, Xiapi, Chengdu, Shangdang, Chibi, Jianye, Wan, Xi Liang | Shared template + unique labels/scene keys |
| C | Xiangyang, Jiaozhi, Jiangling, Hanzhong, Jiao | Template + direct link to their wilderness points |

### Wilderness first pass

Use the eight to twelve points already named in the profession plan: Bắc Mang
Sơn, Thái Hành Sơn Đạo, Kiếm Các, Đô Giang Yển, Thái Hồ, Hoài Thủy, Dục Thủy,
Trường Giang, Rừng Trầm Hương, Long Trung. Each gets a tile cluster, one
resource node, one POI scene and one risk (bandit, weather or terrain).

## 9. Risks and mitigations

| Risk | Mitigation |
| :--- | :--- |
| Two coordinate systems drift | `location_sublocations` is the only id; world nodes keep coordinates only in `map-data.js` |
| Sparse cities feel empty | shared district template; gate opens the wilderness map |
| Too many clicks | breadcrumb + “return to city” + default city entry from the world node |
| Art cost | hotspot diagrams for cities; tile rendering only for wilderness |
| Server/client disagreement | `player_state.current_sub_location` and the registry endpoint |
| Duplicate scenes | one `scene_key` per POI row, shared by city and wilderness |
| Save migration | backfill `current_sub_location` to `default_sub_loc` |

## 10. Phased plan

1. **Phase 1 — data and guard.** Add `map_scope`, `local_x/y`, `icon_key`,
   `scene_key`, `tile_id`; backfill from `kind`; add `current_sub_location` and
   a server spatial guard. Extend `verify-map-registry`.
2. **Phase 2 — city mini-map.** Build the map shell and hotspot renderer for
   Tier A cities. Clicking a hotspot opens the existing contextual scene.
3. **Phase 3 — wilderness map.** Render the 8–12 wilderness points as a local
   tile prototype; movement costs days/fatigue; resource/POI clicks.
4. **Phase 4 — city breadth.** Apply the shared template to Tier B/C cities;
   add bespoke art only for the cities players visit most.
5. **Phase 5 — fog/waypoints.** Tile fog, multi-leg route, supply and ambush
   read `map_tiles`; diplomacy mode stays on the world graph.

## 11. Acceptance criteria

- Every URBAN row appears on exactly one city mini-map; every wilderness row on
  exactly one local map; zero orphans.
- Entering a city opens its mini-map without loading the wilderness tile layer.
- Clicking a hotspot opens the same scene the contextual engine already serves.
- `current_sub_location` is written on every local transition and survives a
  save/reload.
- A city with only two urban rows still has gate, market, residence and office.
- The world map remains 20 nodes / 24 routes and 60 fps; local maps lazy-load.
- `npm run verify` and `npm run audit` stay green after each phase.
