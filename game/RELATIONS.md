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
| `NPC-0001` | Liu Bei (Xuande) | Volunteer Militia Leader | **+38** (+14) (Sworn Benefactor & Ally) | Key Strategic Patron | Signed equipment contract `CTR-01840311-0001`; pledges official backing |
| `NPC-0002` | Zhang Fei (Yide) | Butcher & Militia Co-founder | **+35** (+11) (Sworn Martial Brother) | Commercial ally & military guard | Tested prototype shield with fury; delighted with Liang Yan's craftsmanship |
| `NPC-0003` | Guan Yu (Yunchang) | Militia Co-founder | **+26** (+12) (Respectful Esteem) | Senior Military Advisor | Praised Liang Yan's logistical foresight and fair dealing |
| `NPC-0004` | Zhang Jue | Taiping Dao Celestial Master | **0** (Unknown) | Target of imperial suppression | Unaware of player's existence |
| `NPC-0005` | Zhang Shiping | Zhongshan Horse Merchant | **+40** (Valued Trading Partner) | Commercial associate | Awaiting next caravan stop; satisfied with previous supply delivery |
| `NPC-0006` | Master Lu Zhirong | Senior Woodwright / Elder | **+50** (Devoted Elder Mentor) | Guild Elder & Mentor | Pleased to see Liang Yan putting timber into productive shield-craft |
| `NPC-0007` | Chen Bao | Senior Workshop Craftsman | **+70** (Loyal Employee) | Chief Artisan | Leading production of 35 pack baskets and 10 bamboo shields |
| `NPC-0008` | Zhao An | Workshop Apprentice / Porter | **+60** (Obedient Apprentice) | Retainer | Proudly drove contract sample handcart to Liu Bei's camp |
