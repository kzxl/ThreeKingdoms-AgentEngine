# Physical Inventory & Stock Ledger (ledger/inventory.md)

## 1. Current Warehouse Stock (`BIZ-0001` East Storeroom - Month 3 Day 17, 184 AD)

| Item Code | Category | Description | Quantity | Unit Cost Basis (Qian) | Total Value (Qian) | Minimum Threshold |
|---|---|---|---|---|---|---|
| `COM-BAMBOO` | Raw Material | Bundles of cured bamboo & river reeds | 35 bundles | 15 | 525 | 20 |
| `COM-TWINE`  | Raw Material | Spools of durable spun hemp twine | 12 spools | 20 | 240 | 5 |
| `COM-LEATH`  | Raw Material | Tanned sheep & cattle hide cuttings | 14 hides | 100 | 1,400 | 2 |
| `COM-TIMBER` | Raw Material | Cured hardwood timber planks | 2.5 bundles | 40 | 100 | 2 |
| `COM-GRAIN`  | Provisions | Unmilled millet & wheat (Strategic Reserve)| 9.60 Dan | 160 | 1,536 | 5.00 |
| `PROD-MAT`   | Finished Good | Standard woven straw sleeping mats | 2 units | 17 | 34 | 10 |
| `PROD-BASK`  | Finished Good | Reinforced military grain pack baskets | 1 unit | 35 | 35 | 5 |
| `PROD-SHIELD-BAM`| Finished Good | Leather-bound bamboo shields | 0 units | 76 | 0 | 0 |
| **Total Inventory Value** | | | | | **3,870 Qian** | |

---

## 2. Stock Movement History

| MOV ID | Date | Item Code | Movement Type | Quantity | Unit Cost (Qian) | Balance After | Ref TXN / Batch |
|---|---|---|---|---|---|---|---|
| `MOV-01840201-0001` | 184-02-01 | `COM-BAMBOO` | Opening Balance | +60 | 15 | 60 | INIT-0001 |
| `MOV-01840201-0002` | 184-02-01 | `COM-TWINE` | Opening Balance | +10 | 20 | 10 | INIT-0001 |
| `MOV-01840201-0003` | 184-02-01 | `COM-LEATH` | Opening Balance | +5 | 100 | 5 | INIT-0001 |
| `MOV-01840201-0004` | 184-02-01 | `PROD-MAT` | Opening Balance | +40 | 17 | 40 | INIT-0001 |
| `MOV-01840201-0005` | 184-02-01 | `PROD-BASK` | Opening Balance | +15 | 36 | 15 | INIT-0001 |
| `MOV-01840205-0006` | 184-02-05 | `COM-GRAIN` | Purchase | +10.00 | 160 | 10.00 | TXN-01840205-0001 |
| `MOV-01840206-0007` | 184-02-06 | `COM-BAMBOO` | Purchase | +50 | 15 | 110 | TXN-01840206-0002 |
| `MOV-01840207-0008` | 184-02-07 | `COM-LEATH` | Purchase | +8 | 100 | 13 | TXN-01840207-0003 |
| `MOV-01840215-0009` | 184-02-15 | `COM-BAMBOO` | Production Out (Mats)| -50 | 15 | 60 | BATCH-018402-01 |
| `MOV-01840215-0010` | 184-02-15 | `COM-TWINE` | Production Out (Mats)| -2 | 20 | 8 | BATCH-018402-01 |
| `MOV-01840215-0011` | 184-02-15 | `PROD-MAT` | Production In | +49 | 17 | 89 | BATCH-018402-01 (1 scrap) |
| `MOV-01840218-0012` | 184-02-18 | `PROD-MAT` | Retail Sale | -50 | 17 | 39 | TXN-01840218-0004 |
| `MOV-01840220-0013` | 184-02-20 | `COM-BAMBOO` | Production Out (Bask)| -45 | 15 | 15 | BATCH-018402-02 |
| `MOV-01840220-0014` | 184-02-20 | `COM-LEATH` | Production Out (Bask)| -3 | 100 | 10 | BATCH-018402-02 |
| `MOV-01840220-0015` | 184-02-20 | `COM-TWINE` | Production Out (Bask)| -1 | 20 | 7 | BATCH-018402-02 |
| `MOV-01840220-0016` | 184-02-20 | `PROD-BASK` | Production In | +29 | 36 | 44 | BATCH-018402-02 (1 scrap) |
| `MOV-01840220-0017` | 184-02-20 | `PROD-BASK` | Wholesale Sale | -35 | 36 | 9 | TXN-01840220-0005 |
| `MOV-01840225-0018` | 184-02-25 | `PROD-MAT` | Yamen Militia Sale | -20 | 17 | 19 | TXN-01840225-0006 |
| `MOV-01840228-0019` | 184-02-28 | `COM-GRAIN` | Rations Paid/Consumed| -0.40 | 160 | 9.60 | TXN-01840228-0007 |
| `MOV-01840309-0020` | 184-03-09 | `COM-BAMBOO` | Purchase (Balanced) | +80 | 15 | 95 | TXN-01840309-0002 |
| `MOV-01840309-0021` | 184-03-09 | `COM-TWINE`  | Purchase (Balanced) | +8 | 20 | 15 | TXN-01840309-0002 |
| `MOV-01840309-0022` | 184-03-09 | `COM-LEATH`  | Purchase (Zhang Fei)| +10 | 100 | 20 | TXN-01840309-0003 |
| `MOV-01840309-0023` | 184-03-09 | `COM-TIMBER` | Purchase (Master Lu)| +5 | 40 | 5 | TXN-01840309-0004 |
| `MOV-01840315-0024` | 184-03-15 | `COM-BAMBOO` | Batch Production Out| -60 | 15 | 35 | BATCH-018403-01 |
| `MOV-01840315-0025` | 184-03-15 | `COM-LEATH`  | Batch Production Out| -6 | 100 | 14 | BATCH-018403-01 |
| `MOV-01840315-0026` | 184-03-15 | `COM-TIMBER` | Batch Production Out| -2.5 | 40 | 2.5 | BATCH-018403-01 |
| `MOV-01840315-0027` | 184-03-15 | `COM-TWINE`  | Batch Production Out| -3 | 20 | 12 | BATCH-018403-01 |
| `MOV-01840316-0028` | 184-03-16 | `PROD-SHIELD-BAM`| Production In | +10 | 76 | 10 | BATCH-018403-01 |
| `MOV-01840316-0029` | 184-03-16 | `PROD-BASK`  | Production In | +22 | 35 | 31 | BATCH-018403-01 |
| `MOV-01840316-0030` | 184-03-16 | `PROD-MAT`   | Production In | +3 | 17 | 22 | BATCH-018403-01 |
| `MOV-01840317-0031` | 184-03-17 | `PROD-SHIELD-BAM`| Delivery (Liu Bei) | -10 | 76 | 0 | CTR-01840311-0001 |
| `MOV-01840317-0032` | 184-03-17 | `PROD-BASK`  | Delivery (Liu Bei) | -30 | 35 | 1 | CTR-01840311-0001 |
| `MOV-01840317-0033` | 184-03-17 | `PROD-MAT`   | Delivery (Liu Bei) | -20 | 17 | 2 | CTR-01840311-0001 |
