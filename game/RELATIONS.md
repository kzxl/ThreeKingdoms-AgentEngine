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
| `NPC-0001` | Liu Bei (Xuande) | Volunteer Militia Leader | **+24** (+2) (Warm Respect) | Fellow townsman & respected merchant | Noticed Liang Yan preparing military shields and pack baskets for militia |
| `NPC-0002` | Zhang Fei (Yide) | Butcher & Militia Co-founder | **+24** (+4) (Trusted Trade Brother) | Commercial supplier & ally | Extremely pleased with prompt 1,000 Qian cash payment for 10 prime hides |
| `NPC-0003` | Guan Yu (Yunchang) | Militia Co-founder | **+14** (+2) (Reserved Respect) | Regular acquaintance | Approves of local merchants aiding neighborhood defense rather than fleeing |
| `NPC-0004` | Zhang Jue | Taiping Dao Celestial Master | **0** (Unknown) | Target of imperial suppression | Unaware of player's existence |
| `NPC-0005` | Zhang Shiping | Zhongshan Horse Merchant | **+40** (Valued Trading Partner) | Commercial associate | Awaiting next caravan stop; satisfied with previous supply delivery |
| `NPC-0006` | Master Lu Zhirong | Senior Woodwright / Elder | **+50** (+2) (Devoted Elder Mentor) | Guild Elder & Mentor | Pleased to see Liang Yan immediately put timber into productive shield-craft |
| `NPC-0007` | Chen Bao | Senior Workshop Craftsman | **+70** (+2) (Loyal Employee) | Chief Artisan | Excited to lead production of prototype bamboo shields with bonus incentives |
| `NPC-0008` | Zhao An | Workshop Apprentice / Porter | **+60** (+2) (Obedient Apprentice) | Retainer | Diligently hauling 80 bamboo bundles and cutting timber braces |
