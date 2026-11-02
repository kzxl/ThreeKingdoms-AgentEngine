# Remaining UI Features — Analysis and Handling Plan

Date: 2026-11-01
Scope: player-facing UI after 1.48.0. Backend capability exists unless noted.
Companion: `docs/FEATURE_MODULE_STANDARD.md`, `docs/MAP_TWO_SCALE_DESIGN_2026-11-01.md`.

## 1. Verdict

The UI is complete for the main loops (market, freight, farm, quests, lineage,
life, duels, map wilderness). The remaining gaps are **backend features without a
surface**, plus **two map surfaces**: the city mini-map and clickable wilderness
resources/POIs.

Do not start a second frontend. Every item below reuses the existing
`ModalShell`, the feature folder contract, and `apiClient`. Legacy modules keep a
fallback only until their replacement passes the browser check.

## 2. Gap inventory

| # | Gap | Evidence | Priority |
| :--- | :--- | :--- | :--- |
| 1 | Warehouse renewal has no button | `POST /api/warehouses/renew` exists; `market-stall.modal.ts` has rent/buy/deposit/withdraw only | P0 |
| 2 | Merchant route creation has no form | `POST /api/merchant/routes` exists; the logistics tab says “create from API” | P0 |
| 3 | Merchant route events are not shown | `GET /api/merchant/events` and client service exist; no render | P1 |
| 4 | Tool repair has no UI | `POST /api/professions/tools/repair` exists; no client call | P0 |
| 5 | Injuries/conditions are invisible | `GET /api/conditions` exists; no dossier/journal section | P1 |
| 6 | Hire refusal details are not shown | `NPC_REFUSED` returns `affinity` and `retryAfterDate`; legacy prompt shows only the message | P1 |
| 7 | Wilderness resources/POIs are counts only | `wilderness-map.modal.ts` shows counts; only travel is clickable | P1 |
| 8 | No city mini-map | 93 `URBAN` rows have `map_scope/local_x/local_y`; no renderer | P1 |
| 9 | World map still reads static sub-locations | `map-data.js` has 40; registry has 133 | P1 |
| 10 | NPC ledger/succession is not observable | `npc_ledger` and succession exist; no dossier/chronicle surface | P2 |
| 11 | UI debt | 740 inline styles, 8 native confirms, no onboarding | P2 |

P0 means the backend feature cannot be used from the game. P1 means the feature
works but is hidden or incomplete. P2 is observability/polish.

## 3. Implementation status (2026-11-02)

All 11 gaps are closed; this section records what shipped and the commits that
carry it.

| Phase | Item | Commit |
| :--- | :--- | :--- |
| A1/A2 | Warehouse renewal, merchant route form, merchant event feed | `a203e0a` |
| A3 | Durable-tool repair tab in the equipment modal | `2d2edd3` |
| B1 | Wilderness gather badges and POI scene survey | `cd70899` |
| B2 | City mini-map with 93 reachable urban rows | `fcb5493` |
| B3 | Registry-driven local picker and region resolution | `f041e78` |
| C1 | Hire quote modal with refusal retry date | `0a27fa2` |
| C2 | Injury strip in both dossiers and the journal | `8fb0936` |
| C3 | NPC dossier assets tab and merchant event cap | `91af8ac` |
| D | Shared confirms, onboarding card, relationship-first panel | `67fe17e` |
| D+ | Protagonist dossier shares the NPC `.dossier-*` contract; duplicate TS renderer removed | `7a51ab9` |

The frozen `public/js` count is unchanged: onboarding lives in
`src/client/features/onboarding`. `nativeConfirmCalls` is locked at 0 and inline
styles at 681 by `tools/ui-baseline.json`.

The two earlier supply-chain items (per-city personal bag W1-5 and multi-item
merchant routes) are closed in 1.53.0; Wave 1 is complete. The next gameplay
slice is Wave 3 (W3-2…W3-7).

## 4. Handling plan

### Phase A — Unblock backend features (P0)

#### A1. Warehouse renewal

- Add `renewWarehouse(warehouseId)` to `market-stall.service.ts` calling
  `POST /api/warehouses/renew`.
- Warehouse card: show `LEASE_UNTIL`, remaining days, and a **Gia hạn** button
  when `ownershipType === 'RENTED'`; disable while the lease is OWNED.
- The button calls the service, refreshes, and toasts the new date.
- Acceptance: an expired lease can be renewed from the modal; the new date is
  `max(old lease, today) + 90`; 300 Quan is charged once.

#### A2. Merchant route creation

- Add `createMerchantRoute(input)` to the client service.
- Logistics tab: collapsible “Tạo thương lộ” form with:
  from warehouse, to warehouse, item code, quantity/run, max buy, min sell,
  frequency days, guard tier.
- Validate before POST: different warehouses, quantity > 0, max buy < min sell.
- On success, prepend the route card and show the first dispatch date.
- Acceptance: a route created from the form appears in the list and the daily
  tick dispatches it.

#### A3. Tool repair

- Add a small `livelihood-tools` client slice (follow the feature standard) or a
  section in the profession modal:
  - list durable tools from `/api/status`/inventory with `uses_left`;
  - repair button calls `POST /api/professions/tools/repair`;
  - show the skill gate and cash cost before confirming.
- Acceptance: a broken axe/pick/hoe/bow can be repaired from the UI; nets/traps
  are rejected with the server message.

### Phase B — Complete the map surfaces (P1)

#### B1. Wilderness resource and POI actions

- In `wilderness-map.modal.ts`, render resource nodes as small map badges next to
  their wilderness row. Clicking a badge:
  - checks `current_sub_location === spot.nameVi`;
  - calls `POST /api/professions/gather` with the node id;
  - refreshes inventory and the modal.
- Render POI scene keys as a “Khảo sát” action on the spot; opening a scene uses
  the existing contextual scene endpoint.
- Acceptance: standing in a wilderness row allows gather; clicking a POI opens a
  non-generic scene; traveling is still one day.

#### B2. City mini-map

- Add `city-map.modal.ts` using the same registry endpoint, filtered to
  `map_scope === 'CITY'`.
- Render a 2×2/3×2 hotspot grid or a local SVG using `local_x/local_y` (the
  migration already assigned city coordinates).
- Hotspots: market, tavern, forge, arena, residence, government, workshop, gate.
  Click opens the existing `ContextActionEngine` scene through the spatial POI
  bridge; no new scene engine.
- Add **Vào thành** next to **Dã Ngoại** in the world-map intel panel.
- Acceptance: every city opens its mini-map; 93 urban rows are reachable; a
  sparse city still shows gate/market/residence/office; no new data source.

#### B3. Registry-driven world map

- Replace `currentRegion.subLocations` in `map-data.js` with
  `MapLiveService.getSubLocationsForNode(nodeId)` when the registry is ready.
- Keep `map-data.js` for coordinates, seals and route geometry only.
- Acceptance: the local picker lists all 133 sub-locations; no duplicate 40-row
  list remains; orphan test stays green.

### Phase C — Observability (P1/P2)

#### C1. Hire refusal details

- Replace the legacy `confirm()` with a compact hire modal:
  - server quote (no hardcoded 250);
  - affinity, fame, virtue;
  - on `NPC_REFUSED`, show `retryAfterDate` and a “Xây dựng quan hệ” hint.
- Acceptance: a refusal shows the retry date; the confirm price matches the
  server quote.

#### C2. Conditions / injuries

- Add a “Vết thương” strip in the dossier header and a section in the journal:
  severity, penalty, days remaining, source.
- Acceptance: an injury created by a duel appears in both surfaces and disappears
  after recovery.

#### C3. Merchant events and NPC ledger

- Logistics tab: latest 5 `merchant_events` with type/date/item/cash.
- Dossier tab “Tài sản & Kế thừa”: latest `npc_ledger` entries and the business
  succession result when the NPC owns one.
- Acceptance: the event feed matches `/api/merchant/events`; an NPC with a
  business shows its manager/successor.

### Phase D — UI system debt (P2)

- Replace the 8 native `confirm()` calls with `window.UI.confirm`.
- Ratchet inline styles down from 740; migrate dossier tabs 2/3 to the classes
  introduced in 1.48.0.
- Add a first-run onboarding card: day loop, action cost, market, save/load.
- Default the right panel to relations, not the raw ledger.

## 5. Delivery order

1. **A1 warehouse renew** (smallest, removes a hard lock).
2. **A2 merchant route form** + **A3 tool repair**.
3. **B1 wilderness actions**.
4. **B2 city mini-map**.
5. **B3 registry-driven picker**.
6. **C1/C2/C3 observability**.
7. **Phase D polish**.

Each item is one commit with its own suite or browser check. No item may add a
second renderer for an existing modal id.

## 6. Acceptance for the whole program

- Every P0 backend feature is reachable from the UI.
- Every `URBAN`/`WILDERNESS` row has exactly one map surface or a deliberate
  “inside city” parent.
- No modal opened from the map renders underneath it (1.47.1 rule).
- No new inline styles; inline count only decreases.
- `npm run verify` and `npm run audit` stay green after every commit.
