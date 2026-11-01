/**
 * Logistics ambush risk for freight shipments and company routes.
 *
 * Risk is deterministic: an active bandit stronghold near either endpoint
 * threatens the cargo, and the guard tier decides whether it is deterred and
 * how much is lost. No unseeded roll is involved.
 */

import { DatabaseService } from '../core/database';

const GUARD_TROOPS: Record<string, number> = {
  MILITIA: 10,
  VETERAN: 25,
  ELITE_RETINUE: 40
};

const LOSS_RATIO: Record<string, number> = {
  MILITIA: 0.25,
  VETERAN: 0.15,
  ELITE_RETINUE: 0.10
};

export interface LogisticsRiskInput {
  fromSettlementId: string;
  toSettlementId: string;
  guardTier: string;
  quantity: number;
}

export interface LogisticsRiskResult {
  ambushed: boolean;
  strongholdId: string | null;
  strongholdNameVi: string | null;
  lostQuantity: number;
  lossRatio: number;
}

export function resolveLogisticsAmbush(
  db: DatabaseService,
  input: LogisticsRiskInput
): LogisticsRiskResult {
  const safe: LogisticsRiskResult = {
    ambushed: false,
    strongholdId: null,
    strongholdNameVi: null,
    lostQuantity: 0,
    lossRatio: 0
  };
  let strongholds: any[] = [];
  try {
    strongholds = db.query<any>(
      "SELECT * FROM bandit_strongholds WHERE status = 'ACTIVE';"
    );
  } catch {
    return safe;
  }
  const nearby = strongholds.find(row =>
    row.location_near === input.fromSettlementId
    || row.location_near === input.toSettlementId
  );
  if (!nearby) return safe;

  const tier = String(input.guardTier || 'MILITIA').toUpperCase();
  const troops = GUARD_TROOPS[tier] || GUARD_TROOPS.MILITIA;
  const power = Math.max(1, Number(nearby.bandit_power) || 200);
  // The same guard/power ratio as the caravan encounter: enough guards deter
  // the lair; a thin escort is ambushed and loses a tier-dependent share.
  if (troops >= Math.ceil(power / 8)) return safe;

  const ratio = LOSS_RATIO[tier] || LOSS_RATIO.MILITIA;
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const lostQuantity = Math.min(quantity, Math.max(0.1, Math.round(quantity * ratio * 10) / 10));
  return {
    ambushed: true,
    strongholdId: nearby.stronghold_id,
    strongholdNameVi: nearby.name_vi,
    lostQuantity,
    lossRatio: ratio
  };
}
