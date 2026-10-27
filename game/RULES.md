# Simulation Engine Rules & Mechanics (RULES.md)

## 1. Character Attributes & Aptitudes

Every character possesses 8 Core Attributes rated from 1 to 100 (Historical human baseline: 30-50; Competent: 51-70; Exceptional: 71-85; Legendary: 86-100):

| Attribute | Code | Domain | Practical Effect |
|---|---|---|---|
| Intelligence | `INT` | Strategy, deduction, medicine, scholarship | Research rate, stratagem defense, insight |
| Politics | `POL` | Administration, governance, law, taxation | Public order recovery, tax collection efficiency |
| Martial Prowess | `WAR` | Personal combat, archery, duel, physical vigor | Duel victory, physical survival, bodyguard efficacy |
| Leadership | `LDR` | Command, military tactics, formation, morale | Troop battle effectiveness, discipline, rout resistance |
| Diplomacy | `DIP` | Persuasion, negotiation, rhetoric, manners | Diplomatic success, pact durability, alliance trust |
| Commerce | `COM` | Trade, bargaining, enterprise, market reading | Profit margins, wholesale discounts, route yields |
| Logistics | `LOG` | Supply chain, transport, provisioning, storage | Supply loss reduction, travel speed, inventory spoilage |
| Craftsmanship | `CRA` | Manufacturing, metallurgy, carpentry, engineering | Defect reduction, item quality tier, production speed |

---

## 2. Skills vs. Talents

- **Talents (Innate)**: Static traits assigned at birth or acquired through profound life events. They grant passive multipliers or unlock special actions. Cannot be leveled up normally.
- **Skills (Acquired)**: Practical competencies gained through deliberate practice, mentoring, and trial.
  - Ranked in 5 Tiers:
    - **Novice (Cấp 1: Sơ học)**: 1 – 20 EXP. Basic comprehension, high error rate under stress.
    - **Competent (Cấp 2: Thành thạo)**: 21 – 40 EXP. Independent execution without supervision.
    - **Proficient (Cấp 3: Tinh thông)**: 41 – 60 EXP. Reliable efficiency, handles standard non-trivial problems.
    - **Expert (Cấp 4: Chuyên gia)**: 61 – 80 EXP. Capable of training others, low error rate, high innovation.
    - **Master (Cấp 5: Đại sư)**: 81 – 100 EXP. Defining authority in the domain, unlocks unique masterpiece products or stratagems.

### Skill Check Resolution
```text
Check Score = (Relevant_Attribute * 0.5) + (Relevant_Skill_Level * 0.5) + Modifiers + d20 Roll
```
- **Difficulty Classes (DC)**:
  - DC 30: Routine / Trivial task.
  - DC 45: Moderate professional task under normal conditions.
  - DC 60: Challenging task; failure yields moderate setbacks.
  - DC 75: Formidable task; requires exceptional expertise.
  - DC 90: Masterstroke / Legendary feat.
- **Critical Outcomes**:
  - Natural 20 on d20: +15 bonus score and unexpected opportunity.
  - Natural 1 on d20: -15 penalty score and immediate complication.

---

## 3. Time & Turn Scales

- **Primary Turn Cycle**: 1 Month (approx. 30 days / 3 Dekads: Early Xun, Mid Xun, Late Xun).
- **Sub-cycles**:
  - Daily: Used for micro-actions, local tactical skirmishes, or negotiation encounters.
  - Seasonal (Quarterly): Spring (Months 1-3), Summer (Months 4-6), Autumn (Months 7-9), Winter (Months 10-12).
  - Annual: Tax collection (Autumn), conscription assessments, imperial decrees.

---

## 4. Enterprise & Economic Mechanics

### 4.1 Production & Scrap Formula
For any manufacturing enterprise:
- **Maximum Output Capacity** = `Worker_Count * Hours_Per_Day * Days_In_Period / Standard_Labor_Hours_Per_Unit`
- **Material Bottleneck** = `Raw_Materials_Available / Raw_Material_Per_Unit`
- **Actual Units Started** = `min(Maximum_Output_Capacity, Material_Bottleneck)`
- **Defect / Scrap Rate (%)** = `max(2%, Base_Defect_Rate - (Lead_Artisan_CRA * 0.15%) + Fatigue_Penalty)`
- **Finished Good Units** = `floor(Actual_Units_Started * (1 - Defect_Rate))`
- **Scrap Units** = `Actual_Units_Started - Finished_Good_Units`

### 4.2 Accounting Definitions
1. **Gross Revenue**: `Units_Sold * Realized_Sale_Price`.
2. **Cost of Goods Sold (COGS)**: `(Direct_Materials_Consumed + Direct_Labor_Wages + Scrap_Loss)`.
3. **Gross Profit**: `Gross Revenue - COGS`.
4. **Operating Expenses (OPEX)**: `Workshop_Rent + Retainer_Salaries + Transport_Fees + Local_Taxes/Bribes`.
5. **Net Operating Income**: `Gross Profit - OPEX`.
6. **Cash Balance Delta**: `Cash_Inflows (Collected) - Cash_Outflows (Paid)`.
   *Note: Accounts Receivable (AR) is recognized when products are delivered on credit, but is NOT added to Cash until paid.*

---

## 5. Military & Supply Mechanics

- **Soldier Consumption**: 1 infantryman consumes **0.1 Dan (approx. 3 kg) of grain per month**.
  - 1,000 soldiers require **100 Dan of grain/month**.
  - War horses consume **0.3 Dan of grain and fodder per month**.
- **Morale Scale (0 - 100)**:
  - Morale > 75: High discipline, bonus to combat checks.
  - Morale 40 - 74: Standard standing army.
  - Morale 20 - 39: Wavering, susceptible to rout if commander falls.
  - Morale < 20: Desertion begins; army risks disintegration.
- **Logistics Loss Formula**:
  - Supplies transported suffer attrition: `Monthly_Loss% = 2% + (Distance_Li / 100) * 1.5% - (Officer_LOG * 0.05%)`.

---

## 6. Audit & Data Integrity Guarantees

Before any turn is finalized, the engine executes four validation gates:
1. **Cash Balance Gate**: `Ending_Cash == Starting_Cash + Total_Receipts - Total_Disbursements`.
2. **Inventory Balance Gate**: `Ending_Stock == Starting_Stock + Produced + Purchased - Sold - Consumed - Damaged`.
3. **Transaction Immutability**: Every transaction must have a unique identifier `TXN-YYYYMMDD-xxxx` and be logged once.
4. **Entity Linkage Gate**: Every referenced ID (`NPC-xxxx`, `LOC-xxxx`, `BIZ-xxxx`, etc.) must resolve to an existing dossier.
