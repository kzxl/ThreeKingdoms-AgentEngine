# Relations & Sentiment Matrix (RELATIONS.md)

## 1. Faction-to-Faction Diplomatic Status

| Source Faction | Target Faction | Diplomatic Status | Trust Score (-100 to +100) | Notes |
|---|---|---|---|---|
| `FACTION-0001` (Han Court) | `FACTION-0002` (Yellow Turbans) | **War** (Total Eradication) | -100 | Imperial decree declares all rebels outlaws |
| `FACTION-0001` (Han Court) | `FACTION-0003` (Youzhou Gov) | **Vassal / Subordinate** | +70 | Liu Yan holds imperial commission |
| `FACTION-0003` (Youzhou Gov) | `FACTION-0004` (Zhuo County) | **Administrative Superior** | +85 | Celebrates Daxing Mountain victory |
| `FACTION-0002` (Yellow Turbans) | `FACTION-0004` (Zhuo County) | **Crushed / In Disarray** | -95 | Northern invasion army shattered |

---

## 2. Key NPC Sentiments toward Player (`player`)

| NPC ID | Name | Affiliation / Role | Sentiment (-100 to +100) | Relationship Type | Notes |
|---|---|---|---|---|---|
| `NPC-0001` | Liu Bei (Xuande) | Victorious Militia Commander | **+52** (+14) (Sworn Benefactor & Core Pillar) | Senior Military & Political Patron | Fully settled `CTR-01840311-0001`; credits Liang Yan with tactical victory |
| `NPC-0002` | Zhang Fei (Yide) | Vanguard Hero of Daxing Mtn | **+50** (+15) (Life-and-Death Sworn Brother) | Blood Brother & Frontline Shield | Impressed by Liang Yan repelling rebel flankers with ashwood spear |
| `NPC-0003` | Guan Yu (Yunchang) | Slayer of Cheng Yuanzhi | **+42** (+16) (Deep Martial & Tactician Respect) | Senior Commander & Protector | Values Liang Yan's precise map reconnaissance that enabled decapitation strike |
| `NPC-0004` | Zhang Jue | Taiping Dao Celestial Master | **0** (Unknown) | Leader of Rebellion | Shaken by loss of Cheng Yuanzhi and Deng Mao in northern front |
| `NPC-0005` | Zhang Shiping | Zhongshan Horse Merchant | **+45** (+5) (Valued Trading Partner) | Commercial associate | Delighted to see his sponsored militia triumph; eager for further supply orders |
| `NPC-0006` | Master Lu Zhirong | Senior Woodwright & Guild Head | **+55** (+5) (Paternal Guild Mentor) | District Defense Leader | Successfully maintained East Gate security during the expedition |
| `NPC-0007` | Chen Bao | Workshop Foreman (`BIZ-0001`) | **+75** (+5) (Devoted Workshop Deputy) | Chief Foreman | Successfully ran autonomous batch production, producing 15 baskets & 10 mats |
| `NPC-0008` | Zhao An | Workshop Apprentice / Porter | **+65** (+5) (Loyal Retainer) | Retainer | Assisted Foreman Chen Bao diligently; earned performance bonus |
