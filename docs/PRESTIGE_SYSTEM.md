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

## Not wired yet

The scale, service and ledger are live. Effects that consume fame are staged:

1. Recruitment pool/cost and NPC self-arrival.
2. Rare item discovery (`discoveryChance = 3% + fameRatio × 20%`, tier gates).
3. Merchant buy/sell spread via `MarketQuoteService`.
4. Duel/battle fame rewards and civil-officer negotiation penalties.
