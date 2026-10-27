# Relations & Sentiment Matrix (RELATIONS.md)

## 1. Faction-to-Faction Diplomatic Status

| Source Faction | Target Faction | Diplomatic Status | Trust Score (-100 to +100) | Notes |
|---|---|---|---|---|
| `FACTION-0001` (Han Court) | `FACTION-0002` (Yellow Turbans) | **War** (Total Eradication) | -100 | Imperial decree declares all rebels outlaws |
| `FACTION-0001` (Han Court) | `FACTION-0003` (Youzhou Gov) | **Vassal / Subordinate** | +70 | Liu Yan holds imperial commission |
| `FACTION-0003` (Youzhou Gov) | `FACTION-0004` (Zhuo County) | **Administrative Superior** | +80 | Direct commandery authority |
| `FACTION-0002` (Yellow Turbans) | `FACTION-0004` (Zhuo County) | **Hostile Raid Target** | -90 | Rebel splinter bands advancing north |

---

## 2. Key NPC Sentiments toward Player (`player`)

| NPC ID | Name | Affiliation / Role | Sentiment (-100 to +100) | Relationship Type | Notes |
|---|---|---|---|---|---|
| `NPC-0001` | Liu Bei (Xuande) | Volunteer Militia Leader | **+22** (Warm Respect) | Fellow townsman & respected merchant | Heard of Liang Yan's fair business dealings; preparing volunteer militia |
| `NPC-0002` | Zhang Fei (Yide) | Butcher & Militia Co-founder | **+20** (Cordial Partner) | Commercial supplier & acquaintance | Pleased with prompt 800 Qian payment for butchery hides (`TXN-01840207-0003`) |
| `NPC-0003` | Guan Yu (Yunchang) | Militia Co-founder | **+12** (Reserved Respect) | Regular acquaintance | Observed Liang Yan's dignified treatment of retainers |
| `NPC-0004` | Zhang Jue | Taiping Dao Celestial Master | **0** (Unknown) | Target of imperial suppression | Unaware of player's existence |
| `NPC-0005` | Zhang Shiping | Zhongshan Horse Merchant | **+40** (Valued Trading Partner) | Commercial associate | Highly satisfied with timely delivery of 35 reinforced pack baskets |
| `NPC-0006` | Master Lu Zhirong | Senior Woodwright / Elder | **+48** (+8) (Devoted Elder Mentor) | Guild Elder & Mentor | Honored by Liang Yan's formal apprenticeship in enterprise management |
| `NPC-0007` | Chen Bao | Senior Workshop Craftsman | **+68** (Loyal Employee) | Chief Artisan | Gratified by prompt monthly wage and grain ration disbursement |
| `NPC-0008` | Zhao An | Workshop Apprentice / Porter | **+58** (Obedient Apprentice) | Retainer | Proud of mastering basket lining and cart transport |
