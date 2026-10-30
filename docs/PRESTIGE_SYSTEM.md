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

## Wired systems (1.6.10)

1. **Recruitment:** `getAvailableSpecialists` exposes `effectiveSigningBonus`,
   `fameDiscount`, `minFame`, `eligible` and a locked reason; `hireSpecialist`
   ignores the client price, charges the server quote and rejects a candidate
   below the fame gate. Gates: worker 0, weaver 300, escort 500, smith 800,
   manager 1,200.
2. **Market:** `quoteFromReference` applies a 10% merchant spread plus a fame
   buy discount (max 5%) and sell bonus (max 4%). Buy stays above sell, so
   same-settlement arbitrage is impossible. Used by `SimulationCore`, `/api/trade`,
   `/api/inventory` price hints and contextual action descriptions.
3. **Duels:** sparring never shames the loser (+5/+10); arena/caravan duels award
   +60/+40 for a win and -15/-10 for a loss. Both characters change fame and the
   result carries `fameDelta`, `fameAfter`, `fameTierCode`.
4. **Inactivity decay:** month close reads the last `prestige_events` date for
   the player and applies `decayInactive` when six or more months passed. The
   monthly report shows fame and the decay delta.

4. **Item discovery (1.6.11):** `POST /api/explore` spends one day at the current
   POI. Success chance is `3% + fameRatio × 20%` (cap 35%); the item comes from
   `discovery_items`, weighted and gated by `min_fame` (tier 1 at 0, tier 2 at
   1,000, tier 3 at 3,000, tier 4 at 5,000/9,000). Ten consecutive failures
   guarantee a tier-1 find. Every roll lands in `exploration_log`; a find adds
   a `Discovery` stock movement and an `EXPLORE_POI` action log.

5. **Fame arrivals (1.6.12):** month close invites 0–3 visitors by tier. Volunteers
   add `player_state.militia`, merchants add grain, scholars add fame; every
   arrival is logged in `fame_arrivals` and shown in the report.
6. **World prices (1.6.12):** `world-price` applies the grain season (0.85 at
   harvest, 1.15 in lean months) and active crises (drought/locust/flood/plague,
   cap 3×) to the reference before the fame spread.

## Defeat states (1.6.12)

- Battle: civil officers negotiate before combat; a duel can trigger at 20%;
  death is 1% for the player, 2% for an enemy, capped at 8%, and is logged.
- Player death sets `campaign_meta.status = 'DEFEATED'`; all day-consuming
  actions then return `CAMPAIGN_OVER`.
- Bankruptcy: two consecutive closes below 100 cash and 1 grain set `BANKRUPT`.
- Fame 0 is still *not* a defeat.

## Still staged

1. Guest auto-assignment needs an owned business and a met fame gate; otherwise
   the guest stays `GUEST` until the player hires them.
2. Supply shocks are visible as per-item badges and drive prices; a dedicated
   market-pulse screen with historical curves is still minimal.
3. Officer coups and retainer departures share one risk formula and one unrest
   log, but their consequences remain domain-specific (territory transfer vs
   post vacancy).
4. The will supports charity, per-child cash shares, businesses and equipment;
   equipment is assigned by item code, so duplicate items need a dedicated
   instance id.

