/**
 * Perishable cargo helpers.
 *
 * Fresh fish/meat spoil by `spoil_rate_per_day × travel_days`; dried/salted
 * goods are near-stable. `SKL-LOG-COLD` reduces spoilage and
 * `SKL-LOG-FREIGHT` reduces escort fees.
 */

import { DatabaseService } from '../../core/database';
import { SkillService } from '../progression/skill.service';

export interface SpoilageResult {
  quantity: number;
  lost: number;
  rate: number;
  reductionPct: number;
  shelfLifeDays: number;
}

export function computeSpoilage(
  db: DatabaseService,
  itemCode: string,
  quantity: number,
  travelDays: number
): SpoilageResult {
  const item = db.queryOne<{ spoil_rate_per_day: number; shelf_life_days: number; preserve_skill_code: string | null; preserve_min_tier: number }>(
    'SELECT spoil_rate_per_day, shelf_life_days, preserve_skill_code, preserve_min_tier FROM master_items WHERE item_code = ? LIMIT 1;',
    [itemCode]
  );
  const rate = Number(item?.spoil_rate_per_day || 0);
  const shelfLifeDays = Number(item?.shelf_life_days || 180);
  if (rate <= 0 || quantity <= 0 || travelDays <= 0) {
    return { quantity, lost: 0, rate, reductionPct: 0, shelfLifeDays };
  }

  let reductionPct = 0;
  try {
    reductionPct = Math.max(0, Math.min(80, SkillService.forDatabase(db).getEffectTotal(
      'SPOIL_REDUCTION',
      ['SKL-LOG-COLD']
    )));
  } catch {
    reductionPct = 0;
  }

  // Item-specific cargo skill: fresh fish with the boat skill, game with skinning.
  if (item?.preserve_skill_code) {
    try {
      const tier = Number(db.queryOne<{ tier: number }>(
        'SELECT tier FROM player_skills WHERE skill_code = ? LIMIT 1;',
        [item.preserve_skill_code]
      )?.tier || 0);
      if (tier >= Number(item.preserve_min_tier || 0)) {
        reductionPct += 15;
      }
    } catch {
      // Missing skill table keeps only the global cold-chain reduction.
    }
  }
  reductionPct = Math.max(0, Math.min(80, reductionPct));

  const effectiveRate = rate * (1 - reductionPct / 100);
  const lost = Math.min(
    Math.max(0, quantity - 0.1),
    Math.round(quantity * effectiveRate * travelDays * 10) / 10
  );
  return {
    quantity: Math.max(0.1, Math.round((quantity - lost) * 10) / 10),
    lost,
    rate: Number(effectiveRate.toFixed(4)),
    reductionPct,
    shelfLifeDays
  };
}

export function freightDiscountPct(db: DatabaseService): number {
  try {
    return Math.max(0, Math.min(30, SkillService.forDatabase(db).getEffectTotal(
      'FREIGHT_DISCOUNT',
      ['SKL-LOG-FREIGHT']
    )));
  } catch {
    return 0;
  }
}
