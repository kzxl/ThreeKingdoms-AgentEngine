# Physical Inventory & Stock Ledger (ledger/inventory.md)

## 1. Current Warehouse & Expedition Stock (Month 4 Day 24, 184 AD)

| Item Code | Category | Description | Quantity | Unit Cost Basis (Qian) | Total Value (Qian) | Minimum Threshold |
|---|---|---|---|---|---|---|
| `COM-BAMBOO` | Raw Material | Bundles of cured bamboo & river reeds | 12.5 bundles | 15 | 188 | 20 |
| `COM-TWINE`  | Raw Material | Spools of durable spun hemp twine | 11 spools | 20 | 220 | 5 |
| `COM-LEATH`  | Raw Material | Tanned sheep & cattle hide cuttings | 12.5 hides | 100 | 1,250 | 2 |
| `COM-TIMBER` | Raw Material | Cured hardwood timber planks | 2.5 bundles | 40 | 100 | 2 |
| `COM-GRAIN`  | Provisions | Unmilled millet & wheat (Strategic Reserve)| 9.60 Dan | 160 | 1,536 | 5.00 |
| `PROD-MAT`   | Finished Good | Standard woven straw sleeping mats | 12 units | 17 | 204 | 10 |
| `PROD-BASK`  | Finished Good | Reinforced military grain pack baskets | 16 units | 35 | 560 | 5 |
| `COM-SPEAR`  | Military Spoils| Serviceable iron-tipped spears | 15 units | 400 | 6,000 | 0 |
| `COM-SWORD`  | Military Spoils| Standard Han Dao swords | 5 units | 800 | 4,000 | 0 |
| `COM-HORSE-D`| Livestock | Sturdy northern pack mules (Expedition) | 2 head | 3,500 | 7,000 | 0 |
| `COM-SALT`   | Commodity Gift | Refined Qingzhou Sea Salt (Expedition)| 10 Dou | 52 | 520 | 0 |
| **Total Inventory Value** | | | | | **21,578 Qian** | |

---

## 2. Stock Movement History

| MOV ID | Date | Item Code | Movement Type | Quantity | Unit Cost (Qian) | Balance After | Ref TXN / Batch |
|---|---|---|---|---|---|---|---|
| `MOV-01840201-0001` to `0041` | Prev | Various | Historical Movements | — | — | 21,058 | Turn 0 to Turn 2 & Spoils |
| `MOV-01840408-0042` | 184-04-08 | `COM-SALT` | Governor Gong Gift | +10 Dou | 65 | 10 Dou | GIFT-QINGZHOU-01 |
| `MOV-01840409-0043` | 184-04-09 | `COM-SALT` | Wholesale Purchase | +70 Dou | 52 | 80 Dou | `TXN-01840409-0011` |
| `MOV-01840416-0044` | 184-04-16 | `COM-SALT` | Pingyuan Wholesale | -40 Dou | 52 | 40 Dou | `TXN-01840416-0012` |
| `MOV-01840424-0045` | 184-04-24 | `COM-SALT` | Imperial Camp Sale | -25 Dou | 52 | 15 Dou | `TXN-01840424-0013` |
| `MOV-01840424-0046` | 184-04-24 | `COM-SALT` | Lu Zhi Tribute Gift| -5 Dou | 52 | 10 Dou | DIPLOMATIC-LUZHI-01 |
