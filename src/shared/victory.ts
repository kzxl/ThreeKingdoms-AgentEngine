/**
 * ThreeKingdoms-AgentEngine: Hegemony Victory Rule
 * (src/shared/victory.ts)
 *
 * One victory condition, checked after a month close and after a conquest:
 * the player faction holds at least 12 settlements, the protagonist reached
 * ambition stage 4 and fame is at least 5,000.
 */

import { DatabaseService } from '../core/database';

export interface VictoryCheck {
  victorious: boolean;
  settlements: number;
  fame: number;
  stage: number;
  reasonVi: string;
  reasonEn: string;
}

const REQUIRED_SETTLEMENTS = 12;
const REQUIRED_FAME = 5000;

export function evaluateVictory(db: DatabaseService, playerId = 'PLY-0001'): VictoryCheck {
  const player = db.queryOne<any>(
    `SELECT liquid_cash, safe_cash, ldr_attr, fame FROM player_state WHERE player_id = ? LIMIT 1;`,
    [playerId]
  ) || {};
  const faction = db.queryOne<{ faction_id: string }>(
    `SELECT faction_id FROM session_factions WHERE leader_id = ? AND is_active = 1 LIMIT 1;`,
    [playerId]
  );
  const settlements = faction
    ? Number(db.queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM session_settlements WHERE ruler_faction_id = ?;`,
      [faction.faction_id]
    )?.c || 0)
    : 0;
  const fame = Number(player.fame || 0);
  const netWorth = Number(player.liquid_cash || 0) + Number(player.safe_cash || 0);
  const ldr = Number(player.ldr_attr || 50);
  const stage = (netWorth >= 50000 || ldr >= 85) ? 4
    : (netWorth >= 10000 ? 3 : 2);

  const victorious = settlements >= REQUIRED_SETTLEMENTS && fame >= REQUIRED_FAME && stage >= 4;
  return {
    victorious,
    settlements,
    fame,
    stage,
    reasonVi: victorious
      ? `Thiên hạ quy tâm: phe của bạn giữ ${settlements} thành, danh vọng ${fame}, đã lên bậc Hùng Chủ.`
      : `Chưa đủ điều kiện bá nghiệp (${settlements}/${REQUIRED_SETTLEMENTS} thành, ${fame}/${REQUIRED_FAME} danh vọng).`,
    reasonEn: victorious
      ? `Hearts of the realm: your faction holds ${settlements} settlements at ${fame} fame and has reached Hegemon stage.`
      : `Hegemony not yet achieved (${settlements}/${REQUIRED_SETTLEMENTS} settlements, ${fame}/${REQUIRED_FAME} fame).`
  };
}

/** Writes VICTORIOUS once; a campaign that already ended is left untouched. */
export function applyVictoryIfEligible(db: DatabaseService, playerId = 'PLY-0001'): VictoryCheck {
  const check = evaluateVictory(db, playerId);
  if (!check.victorious) return check;

  const meta = db.queryOne<{ status: string }>('SELECT status FROM campaign_meta LIMIT 1;');
  if (meta && meta.status && meta.status !== 'ACTIVE') return check;

  db.execute(
    `UPDATE campaign_meta
     SET status = 'VICTORIOUS', defeat_reason = ?
     WHERE status = 'ACTIVE';`,
    [`UNIFIED_THE_REALM|${check.settlements}|${check.fame}`]
  );
  recordLegacy(db, 'VICTORIOUS', 'Thiên hạ quy tâm');
  return check;
}

/**
 * Stores one legacy row for NG+. Called on victory, and on a final defeat with
 * no heir; called again for the same campaign it replaces the same row.
 */
export function recordLegacy(
  db: DatabaseService,
  outcome: 'VICTORIOUS' | 'DEFEATED',
  titleVi = ''
): void {
  try {
    const meta = db.queryOne<any>('SELECT campaign_id, active_turn FROM campaign_meta LIMIT 1;') || {};
    const player = db.queryOne<any>(
      `SELECT liquid_cash, safe_cash, fame FROM player_state WHERE player_id = 'PLY-0001' LIMIT 1;`
    ) || {};
    const faction = db.queryOne<{ faction_id: string }>(
      `SELECT faction_id FROM session_factions WHERE leader_id = 'PLY-0001' AND is_active = 1 LIMIT 1;`
    );
    const settlements = faction
      ? Number(db.queryOne<{ c: number }>(
        `SELECT COUNT(*) AS c FROM session_settlements WHERE ruler_faction_id = ?;`,
        [faction.faction_id]
      )?.c || 0)
      : 0;
    let generation = 1;
    try {
      generation = Number(db.queryOne<{ current_generation: number }>(
        'SELECT current_generation FROM family_lineage LIMIT 1;'
      )?.current_generation || 1);
    } catch { /* family tables absent */ }

    const campaignId = String(meta.campaign_id || 'CMP-UNKNOWN');
    db.execute(
      `INSERT OR REPLACE INTO campaign_legacy
         (legacy_id, campaign_id, generation, fame, net_worth, settlements, outcome, title_vi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        `LEG-${campaignId}`,
        campaignId,
        generation,
        Number(player.fame || 0),
        Number(player.liquid_cash || 0) + Number(player.safe_cash || 0),
        settlements,
        outcome,
        titleVi || (outcome === 'VICTORIOUS' ? 'Bá Nghiệp' : 'Tử Chiến')
      ]
    );
  } catch (error) {
    console.warn('[victory] legacy record failed:', (error as Error).message);
  }
}
