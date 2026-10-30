# Prestige System

Status: 1.6.8. `config/prestige.json` is the single source for the fame scale,
tier thresholds and balance numbers.

## Scale

Fame is a social score, not a health bar:

- `0 .. 99999`, soft cap `10000` (ROTK XIII-like; 5,000 is a milestone, not a ceiling).
- Reaching `0` means **Unknown** — it removes bonuses, it does not end the campaign.
- Positive gains use diminishing returns: `raw / (1 + fame / 4000)`.
- Decay only after six inactive months and only above fame 2,000: 0.5%/month, 1%/month above 5,000.

## Tiers

| Min fame | Code | Vietnamese | English |
|---:|---|---|---|
| 0 | `NOBODY` | Vô danh | Unknown |
| 200 | `VILLAGER_RESPECT` | Hương dân kính trọng | Village Esteem |
| 500 | `RIGHTEOUS` | Nghĩa sĩ | Righteous Warrior |
| 1,000 | `CHAMPION` | Hào kiệt | Champion |
| 2,000 | `RENOWNED_SCHOLAR` | Danh sĩ | Renowned Scholar |
| 3,000 | `FAMOUS_GENERAL` | Danh tướng | Famous General |
| 5,000 | `HERO` | Anh hùng | Hero |
| 7,000 | `GRAND_CHAMPION` | Quán quân | Grand Champion |
| 9,000 | `HEARTS_OF_THE_REALM` | Thiên hạ quy tâm | Hearts of the Realm |

## Storage

There is no duplicate fame table:

- Player: `player_state.fame` (default 500).
- NPC: `npc_personal_progression.prestige` (default 500).
- `character_prestige` is a view that unions both with a `kind` column.
- `prestige_events` is the append-only ledger (`before_fame`, `after_fame`, `delta`, `reason`, `source_id`).

`PrestigeService` (`src/modules/progression/prestige.service.ts`) is the only writer.
It exposes `getFame`, `getTier`, `award`, `penalize`, `decayInactive` and
`forDatabase()` for tests/per-instance use.

## Migration 012

- Adds `player_state.fame`, `credibility`, `virtue`.
- On a legacy database (no `fame` column yet) multiplies NPC prestige and family
  prestige by 10 once, so the existing 0–1,000 values land on the new scale.
- Fresh schemas already ship the new defaults and are not multiplied again.
- Legacy thresholds were scaled with the data: courtship `150 → 1,500`, NPC
  career milestones `90/190/250 → 900/1,900/2,500`, family gains `+15/+25/+50 →
  +150/+250/+500`, family default `100 → 1,000`.

## Wired systems (1.6.9)

1. **Recruitment:** `getAvailableSpecialists` exposes `effectiveSigningBonus` and
   `fameDiscount`; `hireSpecialist` ignores the client price and charges the
   server quote. Fame lowers the signing bonus by up to 10%.
2. **Market:** `quoteFromReference` applies a 10% merchant spread plus a fame
   buy discount (max 5%) and sell bonus (max 4%). Buy stays above sell, so
   same-settlement arbitrage is impossible. Used by `SimulationCore`, `/api/trade`,
   `/api/inventory` price hints and contextual action descriptions.
3. **Duels:** sparring never shames the loser (+5/+10); arena/caravan duels award
   +60/+40 for a win and -15/-10 for a loss. Both characters change fame and the
   result carries `fameDelta`, `fameAfter`, `fameTierCode`.

## Still staged

1. NPC self-arrival and a fame-gated recruitment pool.
2. Rare item discovery (`discoveryChance = 3% + fameRatio × 20%`, tier gates).
3. World/regional price multipliers (crisis, season, local stock) on top of the
   reference quote.
4. Battle duel trigger/death, civil-officer negotiation, bankruptcy.

