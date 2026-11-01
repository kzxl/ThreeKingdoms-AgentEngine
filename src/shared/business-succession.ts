/**
 * NPC business succession.
 *
 * When an NPC owner/manager dies, the enterprise passes to an adult heir, then
 * to a senior foreman as trustee; if neither exists it is liquidated into the
 * settlement treasury. Safe cash is never deleted without a destination.
 */

import { DatabaseService } from '../core/database';
import { LOC_TO_NODE_MAP } from '../modules/ecology-logistics/spatial-registry';
import { postSettlementEntry } from './settlement-ledger';

export type BusinessSuccessionMode = 'HEIR' | 'FOREMAN' | 'LIQUIDATED';

export interface BusinessSuccessionResult {
  businessId: string;
  mode: BusinessSuccessionMode;
  successorId: string | null;
  safeCash: number;
  settlementId: string | null;
}

export function resolveBusinessSuccession(
  db: DatabaseService,
  npcId: string,
  gameDate: string
): BusinessSuccessionResult[] {
  let businesses: any[] = [];
  try {
    businesses = db.query<any>(
      `SELECT * FROM businesses
       WHERE status = 'ACTIVE' AND (manager_npc_id = ? OR owner_character_id = ?);`,
      [npcId, npcId]
    );
  } catch {
    return [];
  }

  const results: BusinessSuccessionResult[] = [];
  for (const business of businesses) {
    const heir = db.queryOne<{ child_id: string; age: number }>(
      `SELECT child_id, age FROM family_children
       WHERE father_id = ? AND status NOT IN ('DECEASED')
       ORDER BY is_heir DESC, age DESC LIMIT 1;`,
      [npcId]
    );
    const foreman = db.queryOne<{ npc_id: string }>(
      `SELECT npc_id FROM npc_state
       WHERE assigned_business_id = ? AND npc_id <> ? AND is_alive = 1
       ORDER BY cra_attr DESC, com_attr DESC, npc_id ASC LIMIT 1;`,
      [business.business_id, npcId]
    );

    const heirReady = heir && Number(heir.age) >= 16;
    const successorId = heirReady ? heir!.child_id : (foreman?.npc_id || heir?.child_id || null);
    const mode: BusinessSuccessionMode = successorId
      ? (heirReady && successorId === heir!.child_id ? 'HEIR' : 'FOREMAN')
      : 'LIQUIDATED';

    if (successorId) {
      // The businesses.manager_npc_id foreign key requires the successor row
      // to exist before the business is reassigned.
      db.execute(
        `INSERT OR IGNORE INTO npc_state (npc_id, name, assigned_business_id, is_alive)
         VALUES (?, ?, ?, 1);`,
        [successorId, successorId, business.business_id]
      );
      db.execute(
        'UPDATE npc_state SET assigned_business_id = ?, is_alive = 1 WHERE npc_id = ?;',
        [business.business_id, successorId]
      );
      db.execute(
        `UPDATE businesses
         SET manager_npc_id = ?,
             owner_character_id = CASE WHEN owner_character_id = ? THEN ? ELSE owner_character_id END
         WHERE business_id = ?;`,
        [successorId, npcId, successorId, business.business_id]
      );
      results.push({
        businessId: business.business_id,
        mode,
        successorId,
        safeCash: Number(business.safe_cash || 0),
        settlementId: null
      });
      continue;
    }

    const settlementId = LOC_TO_NODE_MAP[business.location_id] || business.location_id || null;
    const safeCash = Math.max(0, Number(business.safe_cash || 0));
    const settlement = settlementId
      ? db.queryOne<{ settlement_id: string }>(
        'SELECT settlement_id FROM session_settlements WHERE settlement_id = ? LIMIT 1;',
        [settlementId]
      )
      : null;
    if (settlement && safeCash > 0) {
      postSettlementEntry(db, {
        settlementId: settlement.settlement_id,
        gameDate,
        category: 'BUSINESS_LIQUIDATION',
        counterparty: business.business_id,
        inflow: safeCash,
        memo: `Thanh lý ${business.name || business.business_id}`
      });
    }
    db.execute(
      `UPDATE businesses
       SET status = 'LIQUIDATED', manager_npc_id = NULL, owner_character_id = NULL,
           safe_cash = 0
       WHERE business_id = ?;`,
      [business.business_id]
    );
    results.push({
      businessId: business.business_id,
      mode: 'LIQUIDATED',
      successorId: null,
      safeCash,
      settlementId: settlement?.settlement_id || null
    });
  }
  return results;
}
