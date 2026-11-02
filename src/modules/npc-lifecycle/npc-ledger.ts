/**
 * NPC cash/troop ledger writer.
 *
 * Every mutation goes through `postNpcMutation`: it updates the progression row
 * and appends one ledger entry with the resulting balance. `postNpcEntry` is for
 * callers that already wrote the balance (the lifecycle's single UPDATE).
 */

import { DatabaseService } from '../../core/database';
import { nextSequenceValue } from '../../shared/id-generator';

export interface NpcLedgerInput {
  npcId: string;
  gameDate: string;
  category: string;
  counterparty?: string | null;
  deltaCash?: number;
  deltaTroops?: number;
  balanceCash: number;
  balanceTroops: number;
  memoVi?: string;
}

export function postNpcEntry(db: DatabaseService, input: NpcLedgerInput): void {
  const compact = String(input.gameDate || '184-05-02').replace(/-/g, '');
  const seq = String(nextSequenceValue(db, 'npc_ledger')).padStart(6, '0');
  const entryId = `NPL-${compact}-${seq}`;
  db.execute(
    `INSERT INTO npc_ledger
      (entry_id, npc_id, game_date, category, counterparty, delta_cash, delta_troops,
       balance_cash, balance_troops, memo_vi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      entryId,
      input.npcId,
      input.gameDate,
      input.category,
      input.counterparty || null,
      Number(input.deltaCash || 0),
      Number(input.deltaTroops || 0),
      Number(input.balanceCash || 0),
      Number(input.balanceTroops || 0),
      input.memoVi || null
    ]
  );
}

export function postNpcMutation(
  db: DatabaseService,
  input: Omit<NpcLedgerInput, 'balanceCash' | 'balanceTroops'>
): { cash: number; troops: number } {
  const row = db.queryOne<{ personal_cash: number; personal_troops: number }>(
    'SELECT personal_cash, personal_troops FROM npc_personal_progression WHERE npc_id = ? LIMIT 1;',
    [input.npcId]
  );
  if (!row) {
    db.execute(
      'INSERT INTO npc_personal_progression (npc_id, personal_cash, personal_troops) VALUES (?, 0, 0);',
      [input.npcId]
    );
    postNpcEntry(db, {
      npcId: input.npcId,
      gameDate: input.gameDate,
      category: 'OPENING',
      deltaCash: 0,
      deltaTroops: 0,
      balanceCash: 0,
      balanceTroops: 0,
      memoVi: 'Số dư đầu kỳ'
    });
  }
  const current = row || { personal_cash: 0, personal_troops: 0 };
  const cash = Number((Number(current.personal_cash || 0) + Number(input.deltaCash || 0)).toFixed(2));
  const troops = Math.max(0, Number(current.personal_troops || 0) + Number(input.deltaTroops || 0));
  if (cash < 0) throw new Error(`NPC ${input.npcId} không đủ tiền cho ${input.category}.`);
  db.execute(
    'UPDATE npc_personal_progression SET personal_cash = ?, personal_troops = ?, updated_at = CURRENT_TIMESTAMP WHERE npc_id = ?;',
    [cash, troops, input.npcId]
  );
  postNpcEntry(db, { ...input, balanceCash: cash, balanceTroops: troops });
  return { cash, troops };
}
