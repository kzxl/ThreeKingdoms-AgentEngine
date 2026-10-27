# Physical Inventory & Stock Ledger (ledger/inventory.md)

## 1. Current Warehouse Stock (`BIZ-0001` East Storeroom - Month 3 Day 24, 184 AD)

| Item Code | Category | Description | Quantity | Unit Cost Basis (Qian) | Total Value (Qian) | Minimum Threshold |
|---|---|---|---|---|---|---|
| `COM-BAMBOO` | Raw Material | Bundles of cured bamboo & river reeds | 12.5 bundles | 15 | 188 | 20 |
| `COM-TWINE`  | Raw Material | Spools of durable spun hemp twine | 11 spools | 20 | 220 | 5 |
| `COM-LEATH`  | Raw Material | Tanned sheep & cattle hide cuttings | 12.5 hides | 100 | 1,250 | 2 |
| `COM-TIMBER` | Raw Material | Cured hardwood timber planks | 2.5 bundles | 40 | 100 | 2 |
| `COM-GRAIN`  | Provisions | Unmilled millet & wheat (Strategic Reserve)| 9.60 Dan | 160 | 1,536 | 5.00 |
| `PROD-MAT`   | Finished Good | Standard woven straw sleeping mats | 12 units | 17 | 204 | 10 |
| `PROD-BASK`  | Finished Good | Reinforced military grain pack baskets | 16 units | 35 | 560 | 5 |
| `COM-SPEAR`  | Military Spoils| Captured iron-tipped spears (Serviceable) | 15 units | 400 | 6,000 | 0 |
| `COM-SWORD`  | Military Spoils| Captured standard Dao swords (Good condition)| 5 units | 800 | 4,000 | 0 |
| `COM-HORSE-D`| Livestock | Captured sturdy northern pack mules | 2 head | 3,500 | 7,000 | 0 |
| **Total Inventory Value** | | | | | **21,058 Qian** | |

---

## 2. Stock Movement History

| MOV ID | Date | Item Code | Movement Type | Quantity | Unit Cost (Qian) | Balance After | Ref TXN / Batch |
|---|---|---|---|---|---|---|---|
| `MOV-01840201-0001` to `0023` | Prev | Various | Historical Movements | — | — | — | Turn 0 to Turn 2 Init |
| `MOV-01840315-0024` | 184-03-15 | `COM-BAMBOO` | Batch 1 Production Out | -60 | 15 | 35 | BATCH-018403-01 |
| `MOV-01840315-0025` | 184-03-15 | `COM-LEATH`  | Batch 1 Production Out | -6 | 100 | 14 | BATCH-018403-01 |
| `MOV-01840315-0026` | 184-03-15 | `COM-TIMBER` | Batch 1 Production Out | -2.5 | 40 | 2.5 | BATCH-018403-01 |
| `MOV-01840315-0027` | 184-03-15 | `COM-TWINE`  | Batch 1 Production Out | -3 | 20 | 12 | BATCH-018403-01 |
| `MOV-01840316-0028` | 184-03-16 | `PROD-SHIELD-BAM`| Batch 1 Finished In | +10 | 76 | 10 | BATCH-018403-01 |
| `MOV-01840316-0029` | 184-03-16 | `PROD-BASK`  | Batch 1 Finished In | +22 | 35 | 31 | BATCH-018403-01 |
| `MOV-01840316-0030` | 184-03-16 | `PROD-MAT`   | Batch 1 Finished In | +3 | 17 | 22 | BATCH-018403-01 |
| `MOV-01840317-0031` | 184-03-17 | `PROD-SHIELD-BAM`| Delivery to Liu Bei | -10 | 76 | 0 | CTR-01840311-0001 |
| `MOV-01840317-0032` | 184-03-17 | `PROD-BASK`  | Delivery to Liu Bei | -30 | 35 | 1 | CTR-01840311-0001 |
| `MOV-01840317-0033` | 184-03-17 | `PROD-MAT`   | Delivery to Liu Bei | -20 | 17 | 2 | CTR-01840311-0001 |
| `MOV-01840320-0034` | 184-03-20 | `COM-BAMBOO` | Autonomous Run Out | -22.5 | 15 | 12.5 | BATCH-018403-02 (Foreman Chen) |
| `MOV-01840320-0035` | 184-03-20 | `COM-LEATH`  | Autonomous Run Out | -1.5 | 100 | 12.5 | BATCH-018403-02 (Foreman Chen) |
| `MOV-01840320-0036` | 184-03-20 | `COM-TWINE`  | Autonomous Run Out | -1 | 20 | 11 | BATCH-018403-02 (Foreman Chen) |
| `MOV-01840322-0037` | 184-03-22 | `PROD-BASK`  | Autonomous Finished In | +15 | 35 | 16 | BATCH-018403-02 |
| `MOV-01840322-0038` | 184-03-22 | `PROD-MAT`   | Autonomous Finished In | +10 | 17 | 12 | BATCH-018403-02 |
| `MOV-01840324-0039` | 184-03-24 | `COM-SPEAR`  | Battle Spoils (Daxing) | +15 | 400 | 15 | SPOIL-01840321-01 |
| `MOV-01840324-0040` | 184-03-24 | `COM-SWORD`  | Battle Spoils (Daxing) | +5 | 800 | 5 | SPOIL-01840321-01 |
| `MOV-01840324-0041` | 184-03-24 | `COM-HORSE-D`| Battle Spoils (Daxing) | +2 | 3,500 | 2 | SPOIL-01840321-01 |
