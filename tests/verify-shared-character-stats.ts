/**
 * ThreeKingdoms-AgentEngine: Shared Character Stats & Formulas Verification Suite
 * (tests/verify-shared-character-stats.ts)
 */

import assert from 'assert';
import {
  calculateVitals,
  calculatePlayerStamina,
  calculatePassiveRecoveryInterval,
  clampStatModifier,
  parseAndClampModifiers,
  calculateEffectiveAttributes,
  calculateMasteryRates,
  getRequiredExpForStat,
  calculateExpAdvancement,
  CANONICAL_STAT_KEYS
} from '../src/shared/character-stats';

async function runStatsVerification() {
  console.log('======================================================================');
  console.log('   SHARED CHARACTER STATS ENGINE: VERIFICATION SUITE                  ');
  console.log('======================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Vitals & Canonical Stamina Formula
  // --------------------------------------------------------------------------
  console.log('>>> [TEST 1] Vitals & Canonical Stamina Calculations...');
  // Base case: WAR 50, Health 100, Fatigue 0
  const v1 = calculateVitals({ war_attr: 50, health: 100, fatigue: 0 });
  assert.strictEqual(v1.maxStamina, 110, `Expected maxStamina 110, got ${v1.maxStamina}`);
  assert.strictEqual(v1.currentStamina, 110, `Expected currentStamina 110, got ${v1.currentStamina}`);
  assert.strictEqual(v1.staminaPct, 100, 'Expected staminaPct 100%');
  assert.strictEqual(v1.isExhausted, false, 'Expected isExhausted false');

  // Martial Hero case: WAR 68, Health 100, Fatigue 54
  // maxStamina = 100 + round(18 * 1.5) + 10 = 100 + 27 + 10 = 137
  // currentStamina = 137 - 54 = 83
  const v2 = calculateVitals({ war_attr: 68, health: 100, fatigue: 54 });
  assert.strictEqual(v2.maxStamina, 137, `Expected maxStamina 137, got ${v2.maxStamina}`);
  assert.strictEqual(v2.currentStamina, 83, `Expected currentStamina 83, got ${v2.currentStamina}`);
  assert.strictEqual(v2.fatigue, 54, 'Expected fatigue 54');

  // Exhaustion gate
  const vExhausted = calculateVitals({ war_attr: 50, fatigue: 96 });
  assert.strictEqual(vExhausted.isExhausted, true, 'Expected isExhausted true when fatigue >= 95');

  // Passive Recovery Ticker interval
  const int50 = calculatePassiveRecoveryInterval(50);
  const int80 = calculatePassiveRecoveryInterval(80);
  const int100 = calculatePassiveRecoveryInterval(100);
  assert.strictEqual(int50, 30, `WAR 50 should have 30s recovery interval, got ${int50}`);
  assert(int80 < int50, 'Higher WAR must recover faster');
  assert.strictEqual(int80, 18, `WAR 80 should have 18s interval, got ${int80}`);
  assert(int100 >= 8, 'Interval must not fall below 8s floor');

  // Verify backward compatibility alias
  const aliasRes = calculatePlayerStamina({ war_attr: 50, health: 100, fatigue: 0 });
  assert.strictEqual(aliasRes.maxStamina, v1.maxStamina, 'calculatePlayerStamina alias must match calculateVitals');
  console.log('  ✓ Passed: Vitals, Max Stamina, HP, Exhaustion and Passive intervals verified.');

  // --------------------------------------------------------------------------
  // TEST 2: Clamping & Equipment Stacking
  // --------------------------------------------------------------------------
  console.log('\n>>> [TEST 2] Stat Modifiers Clamping & Effective Attributes...');
  assert.strictEqual(clampStatModifier(-5), 1, 'Value below minimum +1 should clamp to +1');
  assert.strictEqual(clampStatModifier(3), 3, 'Valid bonus within [+1..+5] should preserve value');
  assert.strictEqual(clampStatModifier(10), 5, 'Bonus > 5 must strictly clamp to maximum +5');
  assert.strictEqual(clampStatModifier(1), 1, 'Bonus of 1 must be preserved');

  // parseAndClampModifiers
  const parsedMap = parseAndClampModifiers(JSON.stringify({ war: 4, ldr: 8, int: 2, invalid_stat: 99 }));
  assert.strictEqual(parsedMap.war, 4, 'WAR modifier should be 4');
  assert.strictEqual(parsedMap.ldr, 5, 'LDR modifier should clamp from 8 to 5');
  assert.strictEqual(parsedMap.int, 2, 'INT modifier should be 2');
  assert.strictEqual(parsedMap.cra, 0, 'Unspecified modifier should be 0');

  // calculateEffectiveAttributes & Golden Cap (>100)
  const basePlayer = { war_attr: 98, ldr_attr: 85, int_attr: 70, pol_attr: 60, dip_attr: 50, com_attr: 50, log_attr: 50, cra_attr: 50 };
  const equipment = [
    { stat_modifiers: JSON.stringify({ war: 5 }) }, // Guan Yu Green Dragon Blade (+5)
    { stat_modifiers: JSON.stringify({ ldr: 3 }) }
  ];
  const eff = calculateEffectiveAttributes(basePlayer, equipment);
  assert.strictEqual(eff.base.war, 98, 'Base WAR should be 98');
  assert.strictEqual(eff.equipmentBuffs.war, 5, 'WAR gear bonus should be 5');
  assert.strictEqual(eff.effective.war, 103, 'Effective WAR should be 98 + 5 = 103');
  assert.strictEqual(eff.isOver100.war, true, 'WAR > 100 must have isOver100 flag true');
  assert.strictEqual(eff.effective.ldr, 88, 'Effective LDR should be 85 + 3 = 88');
  assert.strictEqual(eff.isOver100.ldr, false, 'LDR 88 must have isOver100 flag false');
  console.log('  ✓ Passed: Strict [+1..+5] clamping and Golden Cap (>100) verified.');

  // --------------------------------------------------------------------------
  // TEST 3: Mastery Roll & S-Score Formulas
  // --------------------------------------------------------------------------
  console.log('\n>>> [TEST 3] Mastery Rolls & Quality Probability Matrix...');
  const rates = calculateMasteryRates({
    statType: 'cra',
    baseStat: 75,
    threshold: 60,
    fatigue: 15,
    craftsmanTier: 2
  });

  assert.strictEqual(rates.canExecute, true, 'Character should be allowed to execute action');
  assert(rates.effectiveMasteryScore > 0, 'Mastery score should be positive');
  assert.strictEqual(rates.tiers.length, 4, 'Should yield 4 tiers');
  const sumP = rates.tiers.reduce((acc, t) => acc + t.probabilityPercent, 0);
  assert(Math.abs(sumP - 100) <= 0.5, `Tiers probability must sum to ~100%, got ${sumP}`);

  // Test exhaustion rejection
  const exhaustedRates = calculateMasteryRates({
    statType: 'cra',
    baseStat: 75,
    threshold: 60,
    fatigue: 85,
    fatigueCost: 25
  });
  assert.strictEqual(exhaustedRates.canExecute, false, 'Must reject execution when fatigue + cost > 100');
  assert(exhaustedRates.reasonCannotExecute?.includes('mệt mỏi'), 'Reason should cite fatigue exhaustion');
  console.log('  ✓ Passed: S-Score formula and 100% probability normalization verified.');

  // --------------------------------------------------------------------------
  // TEST 4: Progression & EXP Advancements
  // --------------------------------------------------------------------------
  console.log('\n>>> [TEST 4] Diminishing Returns EXP Curve & Advancement...');
  assert.strictEqual(getRequiredExpForStat(70), 100, 'Stat <= 90 requires 100 EXP');
  assert.strictEqual(getRequiredExpForStat(95), 150, 'Stat 91-99 requires 150 EXP');
  assert.strictEqual(getRequiredExpForStat(105), 250, 'Stat >= 100 requires 250 EXP');

  // Advancement: stat 89, exp 50 + 80 exp gained -> stat 90, remaining exp 30
  const adv1 = calculateExpAdvancement('war', 89, 50, 80);
  assert.strictEqual(adv1.leveledUp, true, 'Should level up');
  assert.strictEqual(adv1.newValue, 90, 'New stat value should be 90');
  assert.strictEqual(adv1.currentExp, 30, 'Remaining exp should be 30');

  // Soft cap enforcement (max 120)
  const advCap = calculateExpAdvancement('war', 119, 200, 300, 120);
  assert.strictEqual(advCap.newValue, 120, 'Stat must not exceed soft cap 120');
  assert.strictEqual(advCap.currentExp, 0, 'Excess EXP at cap should be 0');
  console.log('  ✓ Passed: Progression scaling (100 -> 150 -> 250) and soft cap verified.');

  console.log('\n======================================================================');
  console.log('   SHARED CHARACTER STATS ENGINE: ALL 4 TEST GROUPS PASSED (100%)    ');
  console.log('======================================================================\n');
}

runStatsVerification().catch(err => {
  console.error('\n❌ STATS VERIFICATION SUITE FAILED:', err);
  process.exit(1);
});
