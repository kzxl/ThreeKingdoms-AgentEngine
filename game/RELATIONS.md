# Relations & Sentiment Matrix (RELATIONS.md)

## 1. Faction-to-Faction Diplomatic Status

| Source Faction | Target Faction | Diplomatic Status | Trust Score (-100 to +100) | Notes |
|---|---|---|---|---|
| `FACTION-0001` (Han Court) | `FACTION-0002` (Yellow Turbans) | **War** (Total Eradication) | -100 | Imperial decree declares all rebels outlaws |
| `FACTION-0001` (Han Court) | `FACTION-0003` (Youzhou Gov) | **Vassal / Subordinate** | +75 | Commended for rescuing Qingzhou |
| `FACTION-0003` (Youzhou Gov) | `FACTION-0004` (Zhuo County) | **Administrative Superior** | +85 | Garrison and merchant guild praised |
| `FACTION-0002` (Yellow Turbans) | `LOC-0003` (Guangzong) | **Under Siege** | -100 | 100,000 rebels surrounded by 50,000 Imperial troops |

---

## 2. Key NPC Sentiments toward Player (`player`)

| NPC ID | Name | Affiliation / Role | Sentiment (-100 to +100) | Relationship Type | Notes |
|---|---|---|---|---|---|
| `NPC-0001` | Liu Bei (Xuande) | Volunteer Commander at Guangzong | **+70** (+5) | Sworn Confidant & Chief Strategist | Fully entrusts treasury and supply logistics to Liang Yan |
| `NPC-0002` | Zhang Fei (Yide) | Vanguard Hero of Guangzong | **+65** (+5) | Life-and-Death Sworn Brother | Delighted by plentiful sea salt rations; enraged by Zuo Feng's bribery demands |
| `NPC-0003` | Guan Yu (Yunchang) | Vanguard Hero of Guangzong | **+60** (+5) | Deep Intellectual & Martial Respect | Deeply respects Liang Yan's operational discipline and strategic vision |
| `NPC-0004` | Zhang Jue | Taiping Dao Celestial Master | **-15** | Rebel Supreme Leader | Besieged inside Guangzong Citadel |
| `NPC-0005` | Zhang Shiping | Zhongshan Horse Merchant | **+45** | Commercial associate | Anticipating northern trade exchange |
| `NPC-0006` | Master Lu Zhirong | Senior Woodwright & Guild Head | **+55** | Paternal Guild Mentor | Overseeing Zhuo workshop patronage |
| `NPC-0007` | Chen Bao | Workshop Foreman (`BIZ-0001`) | **+75** | Chief Foreman | Managing expanded 4-man workshop team autonomously in Zhuo |
| `NPC-0008` | Zhao An | Workshop Senior Carpenter | **+65** | Loyal Retainer | Crafting shields and baskets diligently at Zhuo workshop |
| `NPC-0011` | Gong Jing | Imperial Governor of Qingzhou | **+60** | High Imperial Patron | Granted 2,000 Qian bounty & Qingzhou Sea Salt Wholesale Permit |
| `NPC-0012` | Lu Zhi (Zigan) | Northern General of the Household | **+50** (New) | Revered Imperial Mentor | Praised Liang Yan's logistics leadership; received salt gifts |
| `NPC-0013` | Zuo Feng | Imperial Palace Attendant / Inspector| **0** (New) | Extortionist Court Eunuch | Seething after Lu Zhi refused to pay 1,000 Gold bribe |
