# Currency Unit Standard

Date: 2026-10-29. Applies to every UI surface, narration, report and log in the Simulation.

## 1. Decision

| Context | Use | Do not use |
|---|---|---|
| Vietnamese | **Quan** | `Tiền` as a unit suffix, `Qian` |
| English | **quan** | `Qian`, `cash` when naming the unit |
| Grain (VI) | **Thạch** | `Dan` |
| Grain (EN) | **piculs** | `dan` |

- Economic values do **not** change; only the unit label does. `21,200 Tiền` becomes
  `21.200 Quan` (VI) or `21,200 quan` (EN).
- Keep a space between number and unit: `6.586 Quan`, `-250 Quan`, `@80 Quan/tấm`.
- Format numbers per language: Vietnamese uses dot thousands and comma decimals; English the
  reverse. Use `formatMoney(amount, lang)` / `formatGrain(amount, lang)` from
  `public/js/config.js` for dynamic values.

## 2. Exemptions (keep as-is)

- **Proper names / titles:** `Tao Qian`, `Tào Qian`, `Tiền Phong` (vanguard), `Tiền Tuyến`
  (front line), `Tiền Đồn`, `Tiền Trang`, `Dòng Tiền` (cash flow). These use 前/錢 with a
  different meaning, not a currency unit.
- **Concepts, not units:** `tiền mặt`, `tiền công`, `tiền vốn`, `tiền thưởng`, `Số Tiền`,
  `Tiền Riêng`, `Tiền Két Sản Nghiệp`.
- **Identifiers and API fields:** `costQian`, `lootQian`, `cargoValueQian` are unchanged to keep
  the JSON contract (`/api/caravans/guard-tiers` returns `costQian`). Only display labels change.

## 3. Why "Quan"

- In Vietnamese Three Kingdoms material, "quan" is the familiar money term ("một quan tiền",
  "ngàn quan"). "Tiền" is generic and collides with `tiền mặt` / `tiền công` on the same screen;
  "Qian" is a pinyin leak into the Vietnamese translation.
- **Historical caveat:** the Eastern Han coin is **五銖錢**; one **quan** (貫) strictly means
  1,000 coins. The game's amounts (21,200 start; 30 for a jar of wine) are an abstract game
  scale, not a literal coin count. "Quan" here is a **genre convention**, not a historical unit.
- If strict historical accuracy is required later: use **văn** (文) as the base unit and
  **quan** = 1,000 văn — but that requires rescaling the whole economy.

## 4. Enforcement

- **Single source:** `config/game-constants.json` (`currency`, `grain`); see
  `docs/SHARED_CONSTANTS.md`. `src/shared/constants.ts` re-exports it for TS; the engine and
  `public/js/config.js` read/copy the same values and a drift test guards them.
- `public/js/config.js`: `CURRENCY_UNIT`, `GRAIN_UNIT`, `formatMoney()`, `formatGrain()`.
- `tools/anti-slop-lint.js`: hard rule `legacyCurrency` = 0, rejecting any `N Tiền`, `N Qian`
  or `Tiền/đơn vị` in `public/`, `src/`, `engine/`, `tools/`. A new string with the old unit
  fails `npm run verify`.
- 500+ labels across 39 files were converted (context actions, sim-web narration, caravans,
  journal, NPC dossier, enterprise, world map, trade modal, PROGRESS.md and its parsers). The
  client bundle was rebuilt afterwards.
