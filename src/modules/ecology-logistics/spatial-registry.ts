/**
 * ThreeKingdoms-AgentEngine: Regional Spatial & Geography Registry
 * (src/modules/ecology-logistics/spatial-registry.ts)
 *
 * Centralizes world map nodes, database location IDs, coordinate projections,
 * and spatial distance heuristics for TypeScript modular services.
 */

export const NODE_TO_LOC_MAP: Record<string, string> = {
  'zhuo_xian': 'LOC-0001',
  'luo_yang': 'LOC-0002',
  'guang_zong': 'LOC-0003',
  'ping_yuan': 'LOC-0004',
  'chang_an': 'LOC-0005',
  'ye_cheng': 'LOC-0006',
  'xu_chang': 'LOC-0007',
  'ji_cheng': 'LOC-0008',
  'xia_pi': 'LOC-0009',
  'xiang_yang': 'LOC-0010',
  'chi_bi': 'LOC-0011',
  'jiang_ling': 'LOC-0012',
  'jian_ye': 'LOC-0013',
  'han_zhong': 'LOC-0014',
  'cheng_du': 'LOC-0015',
  'wan_cheng': 'LOC-0016',
  'shou_chun': 'LOC-0017',
  'shang_dang': 'LOC-0018',
  'wu_wei': 'LOC-0019',
  'xi_liang': 'LOC-0019',
  'jiao_zhi': 'LOC-0020'
};

export const LOC_TO_NODE_MAP: Record<string, string> = Object.entries(NODE_TO_LOC_MAP).reduce(
  (acc, [node, loc]) => {
    acc[loc] = node;
    return acc;
  },
  {} as Record<string, string>
);

export interface Point2D {
  x: number;
  y: number;
}

export const NODE_COORDINATES: Record<string, Point2D> = {
  'zhuo_xian': { x: 330, y: 70 },
  'ji_cheng': { x: 440, y: 55 },
  'ye_cheng': { x: 320, y: 155 },
  'guang_zong': { x: 375, y: 165 },
  'ping_yuan': { x: 460, y: 165 },
  'shang_dang': { x: 280, y: 190 },
  'xi_liang': { x: 80, y: 200 },
  'wu_wei': { x: 80, y: 200 },
  'luo_yang': { x: 260, y: 250 },
  'chang_an': { x: 160, y: 250 },
  'xu_chang': { x: 350, y: 265 },
  'xia_pi': { x: 460, y: 275 },
  'wan_cheng': { x: 300, y: 310 },
  'shou_chun': { x: 410, y: 315 },
  'han_zhong': { x: 130, y: 345 },
  'xiang_yang': { x: 280, y: 355 },
  'jian_ye': { x: 490, y: 380 },
  'chi_bi': { x: 380, y: 410 },
  'jiang_ling': { x: 270, y: 430 },
  'cheng_du': { x: 75, y: 435 },
  'jiao_zhi': { x: 340, y: 500 }
};

/**
 * Resolves a location identifier into a canonical database location ID (e.g. 'LOC-0001').
 */
export function resolveLocationId(nodeOrLocId: string): string {
  if (!nodeOrLocId) return 'LOC-0001';
  if (NODE_TO_LOC_MAP[nodeOrLocId]) return NODE_TO_LOC_MAP[nodeOrLocId];
  if (LOC_TO_NODE_MAP[nodeOrLocId]) return nodeOrLocId;
  return nodeOrLocId;
}

/**
 * Resolves a database location ID or node ID into the corresponding world map node ID.
 */
export function resolveNodeId(nodeOrLocId: string): string {
  if (!nodeOrLocId) return 'zhuo_xian';
  if (LOC_TO_NODE_MAP[nodeOrLocId]) return LOC_TO_NODE_MAP[nodeOrLocId];
  if (NODE_TO_LOC_MAP[nodeOrLocId]) return nodeOrLocId;
  return nodeOrLocId;
}

/**
 * Retrieves the 2D SVG canvas coordinates for a given node or location ID.
 */
export function getNodeCoordinates(nodeOrLocId: string): Point2D {
  const nodeId = resolveNodeId(nodeOrLocId);
  return NODE_COORDINATES[nodeId] || { x: 300, y: 250 };
}

/**
 * Calculates Euclidean straight-line distance in Chinese Li (Dặm)
 * between two nodes when a direct master_routes row is not present.
 */
export function calculateDirectDistanceLi(fromNodeOrLoc: string, toNodeOrLoc: string): number {
  const p1 = getNodeCoordinates(fromNodeOrLoc);
  const p2 = getNodeCoordinates(toNodeOrLoc);
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  return Math.max(50, Math.round(dist * 1.5));
}
