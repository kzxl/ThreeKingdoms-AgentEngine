/**
 * Map node aliases shared by the client map and the server registry.
 *
 * The database has 23 settlements while the rendered map has 20 nodes; the
 * extra rows resolve to their nearest rendered citadel.
 */

export const SETTLEMENT_ALIASES: Record<string, string> = {
  wu_wei: 'xi_liang',
  he_fei: 'shou_chun',
  pu_yang: 'ye_cheng',
  wu_ling: 'jiang_ling'
};

export function resolveMapNodeId(settlementId: string): string {
  return SETTLEMENT_ALIASES[settlementId] || settlementId;
}
