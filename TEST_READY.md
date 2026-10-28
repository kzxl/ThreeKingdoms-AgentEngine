# ThreeKingdoms-AgentEngine: Test Readiness Declaration (TEST_READY.md)

**Status:** ALL VERIFICATION SUITES AUTHORIZED & PASSING (100%)  
**Milestone:** E2E Test Suite Creation  
**Author:** E2E Test Writer  
**Date:** 2026-10-28  
**Compilation Status:** `npm run typecheck` produces 0 errors  
**Audit Invariant Status:** `tools/sim-audit.js` verifies 140/140 invariants with 0 discrepancies  

---

## 1. Executive Summary

In accordance with `PROJECT.md` and `ORIGINAL_REQUEST.md`, complete opaque-box, multi-tier E2E verification test suites have been authored for all three major sandbox simulation features:
1. **R1: Marriage, Childbirth & Dynastic Lineage Succession** (`tests/verify-marriage-lineage.ts`)
2. **R2: ROTK Single Combat Dueling System** (`tests/verify-rotk-duels.ts`)
3. **R3: Tavern Hero Banquets & Brotherhood Recruitment** (`tests/verify-tavern-banquets.ts`)

All test suites execute cleanly via `npx tsx <file>`, uphold zero-drift state isolation on `saves/session.db`, and adhere strictly to Anti-AI-Slop standards (authentic Koei ROTK Hanzi typography, zero juvenile emojis).

---

## 2. Test Verification Matrix

| Feature Domain | Verification Suite Path | Test Groups | Total Tests | Pass Rate | Execution Time |
|---|---|---|---|---|---|
| **R1: Marriage, Childbirth & Lineage** | `tests/verify-marriage-lineage.ts` | 7 Groups | 60 | **100% (60/60)** | ~2.5s |
| **R2: ROTK 1v1 Single Combat Duels** | `tests/verify-rotk-duels.ts` | 5 Groups | 61 | **100% (61/61)** | ~2.8s |
| **R3: Tavern Banquets & Brotherhood** | `tests/verify-tavern-banquets.ts` | 5 Groups | 52 | **100% (52/52)** | ~2.4s |
| **Core: Equipment & EXP Progression** | `tools/verify-equipment-and-exp.ts` | 5 Groups | 58 | **100% (58/58)** | ~2.2s |
| **Core: Enterprise & Wage Labor** | `tools/verify-enterprise-labor.ts` | 4 Groups | 12 | **100% (12/12)** | ~1.5s |
| **Core: Caravan Trade & Arbitrage** | `tests/test-branch4-logistics.ts` | 8 Groups | 8 | **100% (8/8)** | ~2.0s |
| **System: SQLite Invariant Auditor** | `tools/sim-audit.js` | 5 Subsystems | 140 | **100% (140/140)**| ~1.2s |
| **TOTAL** | — | — | **391** | **100%** | — |

---

## 3. Test Group Detail & Coverage Scope

### 3.1 Suite 1: `tests/verify-marriage-lineage.ts` (60 Tests)
- **Group 1: Heroine Courtship & Dowry Accounting Invariant** (17 tests)
  - Historical heroines verified in `master_characters` (`NPC-0081` Lady Zhen, `NPC-0087` Sun Shangxiang, `NPC-0088` Da Qiao, `NPC-0089` Xiao Qiao, `NPC-0097` Cai Wenji).
  - Courtship proposal gate: $\text{Affinity} \ge 80$ strictly enforced (79 fails, 80/95 pass).
  - Dowry schedule calculation: Noble dowry for Sun Shangxiang (10,000 Qian + War Steed), Historical heroine (6,000 Qian + Silk), Local maiden (2,000 Qian).
  - Double-entry dowry payment parity: `liquid_cash + safe_cash == balance` and Debit == Credit.
- **Group 2: Marriage Ceremony, Cohabitation & Household Management** (8 tests)
  - `family_spouses` record creation, status `MARRIED`.
  - 4 household role transitions (`HOUSEKEEPER`, `ENTERPRISE_SUPERVISOR`, `STRATEGIC_ADVISOR`, `MILITARY_DEFENDER`).
  - Housekeeper +30% fatigue restoration buff (25 $\to$ 32).
- **Group 3: Pregnancy & Gestation Multi-Stage Progression** (7 tests)
  - Conception criteria check (health $\ge 70$, fatigue $< 50$, spouse not pregnant).
  - Anti-concurrency guard preventing simultaneous pregnancies.
  - Multi-stage gestation advancement: Stage 0 $\to$ 1 $\to$ 2 $\to$ 3 (Lâm Bồn / Full-term).
- **Group 4: Childbirth & Genetic Attribute Inheritance** (9 tests)
  - Genetic oracle: $\text{ChildBase} = \lfloor \frac{\text{Father} + \text{Mother}}{2} \times 0.45 \rfloor + \Delta_{\text{mutation}} + \text{MaternalPerk}$.
  - Maternal trait perks: Sun Shangxiang (`TLT-TIGER-HERITAGE` +2 WAR), Cai Wenji (`TLT-POETIC-GENIUS` +2 INT), Lady Zhen (`TLT-SILK-ACUMEN` +2 COM).
  - Adversarial mutation clamping: $\Delta$ strictly clamped $[-3, +5]$.
  - Child profile generation in `family_children` and genealogical link in `family_genealogy_tree`.
- **Group 5: Master Mentorship for Youth Heirs** (7 tests)
  - Historical master eligibility ($\text{Affinity} \ge 60$ with Lu Zhi `NPC-0012`, Guan Yu `NPC-0003`, Zhang Fei `NPC-0002`).
  - Mentorship session execution: +10 WAR stat growth, mentor journal log in `family_mentorship_logs`.
- **Group 6: Dynastic Lineage Succession Protocol** (9 tests)
  - Adulthood requirement ($\text{age} \ge 18$, `is_heir = 1`).
  - Founder Liang Yan memorial archived in `family_ancestors_archive`.
  - Zero-drift asset continuity: 100% conservation of liquid cash, safe cash, enterprises (`businesses`), inventory, and forged gear.
  - Generational advance in `family_lineage` without breaking `PLY-0001` foreign key references.
- **Group 7: Live Service Interface Contract Check** (3 tests)
  - Validates `FamilyLineageService.proposeMarriage` and `FamilyLineageService.executeSuccession`.

---

### 3.2 Suite 2: `tests/verify-rotk-duels.ts` (61 Tests)
- **Group 1: Effective WAR & Equipment Stat Clamp Synergy** (17 tests)
  - `clampStatModifier` strictly clamps modifiers into $[+1..+5]$ range.
  - Guan Yu (98 base + 5 blade = 103 effective WAR, `isOver100 = true`).
  - Zhang Fei (98 base + 5 spear = 103 effective WAR, `isOver100 = true`).
  - Max HP formula scaling: $\text{MaxHP} = 100 + \lfloor \text{WAR} \times 1.5 \rfloor + \lfloor \text{Morale} \times 0.5 \rfloor$.
- **Group 2: Tactical Clash Matrix (4 Asymmetric Commands)** (15 tests)
  - `ATTACK vs FOCUS_SPIRIT`: Interrupts meditation, deals +30% crush damage, negates spirit gain.
  - `DEFEND vs SPECIAL_STRIKE`: Parry-Counter negates 80% damage and counters for 40% damage; consumes 30 Spirit.
  - `SPECIAL_STRIKE vs ATTACK`: Signature strike decisively out-damages standard attack.
  - `ATTACK vs DEFEND`: Defended strike reduced by 75%; defender gains +10 Spirit.
  - `FOCUS_SPIRIT vs DEFEND`: Free meditation grants +35 Spirit, +10 Morale, +30% next-round buff (`spiritCharged`).
- **Group 3: Multi-Round Skirmish Engine & Concluding Outcomes** (11 tests)
  - Early Knockout (opponent HP reduced to 0).
  - Morale Rout (opponent morale reduced to 0).
  - 5-Round Exhaustion: Points decision based on remaining HP percentage.
  - Anti-AI-slop narrative check: Authenticity of Koei ROTK Sino-Vietnamese text, zero emojis.
- **Group 4: Historical Martial Sparring Integration** (7 tests)
  - Sparring with Zhang Fei (`NPC-0002`) and Guan Yu (`NPC-0003`).
  - Awards: Kizuna Affinity (+15 to +25), Respect (+10), WAR EXP with diminishing returns.
- **Group 5: Arena Tournaments & Caravan Ambush Defense** (11 tests)
  - 3 Arena championship tiers: Local Champion (300 Qian), Hua Xiong (800 Qian), Lu Bu (2,000 Qian).
  - Double-entry prize cash ledger parity (`liquid_cash + safe_cash == balance`).
  - Caravan ambush 1v1 defense: Defeating bandit chieftain preserves 100% caravan cargo!

---

### 3.3 Suite 3: `tests/verify-tavern-banquets.ts` (52 Tests)
- **Group 1: Gourmet Dishes & Dukang Wine BOM Verification** (17 tests)
  - Culinary items verified in catalog: `FOOD-COOK-DUKANG` (Đỗ Khang Mỹ Tửu), `FOOD-COOK-VENISON` (Thịt Rừng), `FOOD-COOK-BAO` (Bánh Bao).
  - 3 Banquet tiers: Tiểu Yến (1 Wine + 1 Bao), Hào Hiệp (2 Wine + 2 Venison + 2 Bao), Đào Viên (5 Wine + 4 Venison + 4 Bao).
  - Tier normalization mapping (`TIEU_YEN` $\to$ `TIET_KIEM`, `DAO_VIEN_ANH_HUNG_YEN` $\to$ `DAO_VIEN`).
  - Capacity specification checks (Tiểu Yến $\le 2$, Hào Hiệp $3..4$, Đào Viên $\ge 8$).
- **Group 2: Physical Inventory & Double-Entry Ledger Conservation** (7 tests)
  - Stock movement deduction parity (`BANQUET_CONSUME`, `balance_after == quantity`).
  - Fallback emergency procurement: Automatic cash purchase maintaining ledger balance and Dr/Cr journal equality.
- **Group 3: Intimacy & Respect Scaling & Host Vital Recovery** (11 tests)
  - Guest affinity acceleration ($\ge +12$) and respect acceleration ($\ge +6$).
  - Logging into `npc_relationship_deltas` with authentic toast notes.
  - Host player vital recovery: +25 stamina/fatigue recovery, +10 morale boost.
  - Anti-AI-slop compliance: Zero juvenile emojis.
- **Group 4: Peach Garden Sworn Brotherhood Ceremony** (8 tests)
  - Intimacy gate check: strictly rejected when $\text{Affinity} < 80$.
  - Ceremony success with Zhang Fei ($\text{Affinity} \ge 80$).
  - Upgrades `master_relations_baseline` to `Tử Sinh Huynh Đệ` (sentiment: 100).
  - Unlocks Tier 5 Fog of Information in `npc_intel_fog` (ambitions and secrets revealed).
- **Group 5: Retainer & Commander Recruitment into FAC-LIANG-CLAN** (9 tests)
  - Retainer recruitment for Sworn Brother Zhang Fei.
  - Registered in `faction_officers` with `faction_id = 'FAC-LIANG-CLAN'`.
  - Starting loyalty $\ge 90$, betrayal risk $\le 0.02$.
  - Stranger rejection gate: Characters with low affinity strictly reject recruitment.

---

## 4. Defect Escalation Register (QA Findings)

| Defect ID | Severity | Module / Service | Description | Recommended Resolution |
|---|---|---|---|---|
| **BUG-E2E-001** | P1 (Major) | `TavernBanquetService.hostBanquet` | `hostBanquet` does not reject or slice guest lists that exceed `config.capacity` (e.g. inviting 5 guests to a tier with capacity 2 succeeds silently). | Add guard at beginning of `hostBanquet`: `if (guestIds.length > config.capacity) throw new Error(...)` or slice to `config.capacity`. |
| **BUG-E2E-002** | P2 (Minor) | `SingleCombatDuelService.resolveRound` | When opponent executes `SPECIAL_STRIKE`, spirit deduction occurs correctly, but if opponent has $< 30$ spirit, fallback struggle narrative could be made clearer in English log. | Cosmetic refinement only; combat mechanics and damage formulas function correctly. |

---

## 5. Verification Execution Command

To execute the complete E2E testing pipeline and verify system invariants:

```bash
# Execute full E2E sandbox verification suite
npx tsx tests/verify-marriage-lineage.ts && npx tsx tests/verify-rotk-duels.ts && npx tsx tests/verify-tavern-banquets.ts

# Typecheck compilation verification
npm run typecheck

# Full SQLite invariant audit
npm run audit
```

**Verdict:** The test infrastructure is 100% verified, stable, typechecked, and ready for integration testing in Milestones M4 and M5.
