/**
 * ThreeKingdoms-AgentEngine: Regional Spatial & Geography Registry (engine/spatial-registry.js)
 *
 * Centralizes world map nodes, database location IDs, coordinate projections,
 * and spatial distance heuristics across the simulation runtime.
 */

const NODE_TO_LOC_MAP = {
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
  'xi_liang': 'LOC-0019',
  'wu_wei': 'LOC-0019',
  'jiao_zhi': 'LOC-0020'
};

const LOC_TO_NODE_MAP = Object.entries(NODE_TO_LOC_MAP).reduce((acc, [node, loc]) => {
  acc[loc] = node;
  return acc;
}, {});

const NODE_COORDINATES = {
  'zhuo_xian': { x: 330, y: 70 },
  'ji_cheng': { x: 440, y: 55 },
  'ye_cheng': { x: 320, y: 155 },
  'guang_zong': { x: 375, y: 165 },
  'ping_yuan': { x: 460, y: 165 },
  'luo_yang': { x: 260, y: 250 },
  'chang_an': { x: 160, y: 250 },
  'xu_chang': { x: 350, y: 265 },
  'xia_pi': { x: 460, y: 275 },
  'xiang_yang': { x: 280, y: 355 },
  'jiang_ling': { x: 270, y: 430 },
  'chi_bi': { x: 380, y: 410 },
  'jian_ye': { x: 490, y: 380 },
  'han_zhong': { x: 130, y: 345 },
  'cheng_du': { x: 75, y: 435 },
  'wan_cheng': { x: 300, y: 310 },
  'shou_chun': { x: 410, y: 315 },
  'shang_dang': { x: 280, y: 190 },
  'xi_liang': { x: 80, y: 200 },
  'wu_wei': { x: 80, y: 200 },
  'jiao_zhi': { x: 340, y: 520 }
};

/**
 * Resolves a location identifier into a canonical database location ID (e.g. 'LOC-0001').
 * Accepts either a map node ID ('zhuo_xian') or an already canonical ID ('LOC-0001').
 *
 * @param {string} nodeOrLocId
 * @returns {string}
 */
function resolveLocationId(nodeOrLocId) {
  if (!nodeOrLocId || typeof nodeOrLocId !== 'string') return 'LOC-0001';
  if (NODE_TO_LOC_MAP[nodeOrLocId]) return NODE_TO_LOC_MAP[nodeOrLocId];
  if (LOC_TO_NODE_MAP[nodeOrLocId]) return nodeOrLocId;
  return nodeOrLocId;
}

/**
 * Resolves a database location ID or node ID into the corresponding world map node ID.
 *
 * @param {string} nodeOrLocId
 * @returns {string}
 */
function resolveNodeId(nodeOrLocId) {
  if (!nodeOrLocId || typeof nodeOrLocId !== 'string') return 'zhuo_xian';
  if (LOC_TO_NODE_MAP[nodeOrLocId]) return LOC_TO_NODE_MAP[nodeOrLocId];
  if (NODE_TO_LOC_MAP[nodeOrLocId]) return nodeOrLocId;
  return nodeOrLocId;
}

/**
 * Retrieves the 2D SVG canvas coordinates for a given node or location ID.
 *
 * @param {string} nodeOrLocId
 * @returns {{ x: number, y: number }}
 */
function getNodeCoordinates(nodeOrLocId) {
  const nodeId = resolveNodeId(nodeOrLocId);
  return NODE_COORDINATES[nodeId] || { x: 300, y: 250 };
}

/**
 * Calculates Euclidean straight-line distance in Chinese Li (Dặm)
 * between two nodes when a direct master_routes row is not present.
 *
 * @param {string} fromNodeOrLoc
 * @param {string} toNodeOrLoc
 * @returns {number}
 */
function calculateDirectDistanceLi(fromNodeOrLoc, toNodeOrLoc) {
  const p1 = getNodeCoordinates(fromNodeOrLoc);
  const p2 = getNodeCoordinates(toNodeOrLoc);
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  return Math.max(50, Math.round(dist * 1.5));
}

module.exports = {
  NODE_TO_LOC_MAP,
  LOC_TO_NODE_MAP,
  NODE_COORDINATES,
  resolveLocationId,
  resolveNodeId,
  getNodeCoordinates,
  calculateDirectDistanceLi
};
