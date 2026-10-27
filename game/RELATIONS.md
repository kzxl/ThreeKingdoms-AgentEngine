# Relations & Sentiment Matrix (RELATIONS.md)

## 1. Faction-to-Faction Diplomatic Status

| Source Faction | Target Faction | Diplomatic Status | Trust Score (-100 to +100) | Notes |
|---|---|---|---|---|
| `FACTION-0001` (Han Court) | `FACTION-0002` (Yellow Turbans) | **War** (Total Eradication) | -100 | Imperial decree declares all rebels outlaws |
| `FACTION-0001` (Han Court) | `FACTION-0003` (Youzhou Gov) | **Vassal / Subordinate** | +75 | Commended for rescuing Qingzhou |
| `FACTION-0003` (Youzhou Gov) | `FACTION-0004` (Zhuo County) | **Administrative Superior** | +85 | Garrison and merchant guild praised |
| `FACTION-0002` (Yellow Turbans) | `LOC-0004` (Qingzhou) | **Shattered Siege** | -100 | 30,000 insurgents routed from Qingzhou |

---

## 2. Key NPC Sentiments toward Player (`player`)

| NPC ID | Name | Affiliation / Role | Sentiment (-100 to +100) | Relationship Type | Notes |
|---|---|---|---|---|---|
| `NPC-0001` | Liu Bei (Xuande) | Acclaimed Volunteer Commander | **+65** (+13) (Sworn Confidant & Chief Strategist) | Core Strategic Patron | Considers Liang Yan his indispensable right hand & chief strategist |
| `NPC-0002` | Zhang Fei (Yide) | Vanguard Hero of Qingzhou | **+60** (+10) (Life-and-Death Sworn Brother) | Blood Brother & Frontline Shield | Proud of Liang Yan's spear combat mastery and field courage |
| `NPC-0003` | Guan Yu (Yunchang) | Vanguard Hero of Qingzhou | **+55** (+13) (Deep Intellectual & Martial Respect) | Senior Commander & Protector | Praised Liang Yan's pincer timing as worthy of Sun Tzu |
| `NPC-0004` | Zhang Jue | Taiping Dao Celestial Master | **-10** (Hostile / Alarmed) | Rebel Leader | Infuriated by destruction of both northern vanguard and eastern siege |
| `NPC-0005` | Zhang Shiping | Zhongshan Horse Merchant | **+45** (Valued Trading Partner) | Commercial associate | Anticipating northern horse/salt trade exchange |
| `NPC-0006` | Master Lu Zhirong | Senior Woodwright & Guild Head | **+55** (Paternal Guild Mentor) | District Defense Leader | Successfully maintained East Gate security and workshop patronage |
| `NPC-0007` | Chen Bao | Workshop Foreman (`BIZ-0001`) | **+75** (Devoted Workshop Deputy) | Chief Foreman | Managing expanded 4-man workshop team autonomously in Zhuo |
| `NPC-0008` | Zhao An | Workshop Apprentice / Porter | **+65** (Loyal Retainer) | Retainer | Diligent assistant at Zhuo workshop |
| `NPC-0011` | Gong Jing | Imperial Governor of Qingzhou | **+60** (Eternal Life-Saving Benefactor) | High Imperial Patron | Awarded Liang Yan 2,000 Qian cash bounty + Qingzhou Sea Salt Monopoly Permit |
