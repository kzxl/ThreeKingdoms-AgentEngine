/**
 * WORLD MAP & CARTOGRAPHY MODULE
 * Interactive SVG Map, Multi-scale Zoom & Pan, Strategic Intel, and Expedition Marching
 * Supports 3 View Modes: Overview, Military (Garrison & Defense), Economy (Grain & Commodities)
 */

let selectedMapNodeId = 'guang_zong';
let selectedMapRoute = null; // { from, to } — the route explicitly picked on the map
let currentMapViewMode = 'overview'; // 'overview' | 'military' | 'economy'
let worldMapZoom = 1.0;
let worldMapPanX = 0;
let worldMapPanY = 0;
let isWorldMapPanning = false;
let mapPanStartX = 0;
let mapPanStartY = 0;
let mapPanStartPanX = 0;
let mapPanStartPanY = 0;
let hasAttachedMapEvents = false;
let lastMapZoomTier = '';
let mapLayerVisibility = { caravans: true, armies: true, bandits: true, crises: true };
let resourceFilter = 'ALL';

const RESOURCE_META = {
  FARM: { color: '#84cc16', icon: 'sprout', labelVi: 'Nông sản', labelEn: 'Farm' },
  FISH: { color: '#38bdf8', icon: 'fish', labelVi: 'Ngư sản', labelEn: 'Fish' },
  HERB: { color: '#34d399', icon: 'leaf', labelVi: 'Dược liệu', labelEn: 'Herb' },
  MINERAL: { color: '#fbbf24', icon: 'pickaxe', labelVi: 'Khoáng sản', labelEn: 'Mineral' },
  TIMBER: { color: '#d97706', icon: 'tree', labelVi: 'Lâm sản', labelEn: 'Timber' },
  GAME: { color: '#f87171', icon: 'paw', labelVi: 'Săn bắn', labelEn: 'Game' },
  SALT_WELL: { color: '#e2e8f0', icon: 'salt', labelVi: 'Muối', labelEn: 'Salt' }
};

const MAP_VIEWBOX = { w: 600, h: 550 };
const MAP_ZOOM_MIN = 0.65;
const MAP_ZOOM_MAX = 3.0;
const MAP_CAPITALS = new Set(['luo_yang', 'chang_an', 'jian_ye', 'cheng_du', 'ye_cheng', 'xu_chang']);

const MAP_NODE_THEMES = {
  'zhuo_xian': { fill: '#064e3b', stroke: '#10b981', icon: '涿' },
  'ji_cheng': { fill: '#0f172a', stroke: '#38bdf8', icon: '薊' },
  'ye_cheng': { fill: '#1e1b4b', stroke: '#818cf8', icon: '鄴' },
  'guang_zong': { fill: '#450a0a', stroke: '#ef4444', icon: '廣' },
  'ping_yuan': { fill: '#0f172a', stroke: '#06b6d4', icon: '平' },
  'luo_yang': { fill: '#451a03', stroke: '#f59e0b', icon: '洛' },
  'chang_an': { fill: '#3b0764', stroke: '#a855f7', icon: '長' },
  'xu_chang': { fill: '#1e293b', stroke: '#3b82f6', icon: '許' },
  'xia_pi': { fill: '#042f2e', stroke: '#14b8a6', icon: '邳' },
  'xiang_yang': { fill: '#0c4a6e', stroke: '#0284c7', icon: '襄' },
  'jiang_ling': { fill: '#164e63', stroke: '#06b6d4', icon: '陵' },
  'chi_bi': { fill: '#450a0a', stroke: '#f97316', icon: '壁' },
  'jian_ye': { fill: '#14532d', stroke: '#22c55e', icon: '建' },
  'han_zhong': { fill: '#292524', stroke: '#a8a29e', icon: '漢' },
  'cheng_du': { fill: '#064e3b', stroke: '#10b981', icon: '成' },
  'wan_cheng': { fill: '#450a0a', stroke: '#e11d48', icon: '宛' },
  'shou_chun': { fill: '#451a03', stroke: '#f59e0b', icon: '壽' },
  'shang_dang': { fill: '#1e293b', stroke: '#94a3b8', icon: '黨' },
  'wu_wei': { fill: '#451a03', stroke: '#d97706', icon: '威' },
  'xi_liang': { fill: '#451a03', stroke: '#d97706', icon: '威' },
  'jiao_zhi': { fill: '#064e3b', stroke: '#059669', icon: '交' }
};

const MAP_RISK_META = {
  LOW: { color: '#34d399', labelVi: 'Thấp', labelEn: 'Low', weight: 0.4 },
  MODERATE: { color: '#fbbf24', labelVi: 'Vừa', labelEn: 'Moderate', weight: 0.7 },
  HIGH: { color: '#f87171', labelVi: 'Cao', labelEn: 'High', weight: 1.0 },
  EXTREME: { color: '#c084fc', labelVi: 'Cực cao', labelEn: 'Extreme', weight: 1.3 }
};

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMapTier(zoom = worldMapZoom) {
  if (zoom <= 0.85) return 'world';
  if (zoom <= 1.6) return 'region';
  return 'local';
}

function mergeLiveRoute(route) {
  if (!window.MapLiveService || typeof MapLiveService.getRoute !== 'function') return route;
  const live = MapLiveService.getRoute(route.from, route.to);
  if (!live) return route;
  const merged = { ...route, from: route.from, to: route.to };
  Object.keys(live).forEach(key => {
    const value = live[key];
    if (value !== undefined && value !== null && value !== '') merged[key] = value;
  });
  return merged;
}

function getRouteControl(route, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const seed = (route.from + route.to).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const direction = seed % 2 === 0 ? 1 : -1;

  let bend = 0.05;
  if (route.terrainType === 'WATERWAY') bend = 0.13;
  else if (route.terrainType === 'MOUNTAIN_PASS') bend = 0.17;
  else if (route.terrainType === 'PLANK_ROAD') bend = 0.11;

  let controlX = (from.x + to.x) / 2 + normalX * length * bend * direction;
  let controlY = (from.y + to.y) / 2 + normalY * length * bend * direction;

  if (route.terrainType === 'WATERWAY') {
    const riverY = ((from.y + to.y) / 2) > 320 ? 425 : 205;
    controlY = controlY * 0.35 + riverY * 0.65;
  }

  return { x: controlX, y: controlY };
}

function quadraticPoint(from, control, to, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y
  };
}

function toggleMapLayer(layer) {
  if (!(layer in mapLayerVisibility)) return;
  mapLayerVisibility[layer] = !mapLayerVisibility[layer];
  renderWorldMapSvg();
}

function setMapViewMode(mode) {
  if (['overview', 'military', 'economy', 'resources'].includes(mode)) {
    currentMapViewMode = mode;
    renderWorldMapSvg();
    renderWorldMapIntel(selectedMapNodeId);
  }
}

function toggleResourceFilter(type) {
  resourceFilter = type;
  renderWorldMapSvg();
}

function zoomWorldMap(delta) {
  setWorldMapZoom(worldMapZoom + delta);
}

function clientToMapPoint(clientX, clientY) {
  const svg = document.getElementById('world-map-svg');
  if (!svg || !svg.getScreenCTM) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const mapped = point.matrixTransform(svg.getScreenCTM().inverse());
  return { x: mapped.x, y: mapped.y };
}

function setWorldMapZoom(nextZoom, clientX, clientY) {
  const previous = worldMapZoom;
  const clamped = clampNumber(Number(nextZoom.toFixed(2)), MAP_ZOOM_MIN, MAP_ZOOM_MAX);
  if (clamped === previous) return;

  if (typeof clientX === 'number' && typeof clientY === 'number') {
    const anchor = clientToMapPoint(clientX, clientY);
    if (anchor) {
      // Keep the point under the cursor anchored while scaling around the map centre.
      worldMapPanX += (previous - clamped) * (anchor.x - MAP_VIEWBOX.w / 2);
      worldMapPanY += (previous - clamped) * (anchor.y - MAP_VIEWBOX.h / 2);
    }
  }

  worldMapZoom = clamped;
  clampWorldMapPan();
  applyWorldMapTransform(true);
}

function clampWorldMapPan() {
  const halfW = MAP_VIEWBOX.w / 2;
  const halfH = MAP_VIEWBOX.h / 2;
  const z = worldMapZoom;

  if (z <= 1) {
    const slackX = halfW * (1 - z);
    const slackY = halfH * (1 - z);
    worldMapPanX = clampNumber(worldMapPanX, -slackX, slackX);
    worldMapPanY = clampNumber(worldMapPanY, -slackY, slackY);
    return;
  }

  // Clamp against the citadel bounds, not the empty canvas: at least 35% of the
  // populated map must stay inside the viewport so panning cannot reach a blank area.
  const bounds = getMapContentBounds();
  const keepVisible = 0.35;
  const scaledW = z * Math.max(1, bounds.maxX - bounds.minX);
  const scaledH = z * Math.max(1, bounds.maxY - bounds.minY);

  worldMapPanX = clampNumber(
    worldMapPanX,
    keepVisible * scaledW - halfW - z * (bounds.maxX - halfW),
    MAP_VIEWBOX.w - keepVisible * scaledW - halfW - z * (bounds.minX - halfW)
  );
  worldMapPanY = clampNumber(
    worldMapPanY,
    keepVisible * scaledH - halfH - z * (bounds.maxY - halfH),
    MAP_VIEWBOX.h - keepVisible * scaledH - halfH - z * (bounds.minY - halfH)
  );
}

let cachedMapContentBounds = null;

function getMapContentBounds() {
  if (cachedMapContentBounds) return cachedMapContentBounds;
  const keys = Object.keys(WORLD_MAP_NODES || {}).filter(key => key !== 'wu_wei');
  if (keys.length === 0) {
    cachedMapContentBounds = { minX: 0, maxX: MAP_VIEWBOX.w, minY: 0, maxY: MAP_VIEWBOX.h };
    return cachedMapContentBounds;
  }
  const xs = keys.map(key => WORLD_MAP_NODES[key].coords.x);
  const ys = keys.map(key => WORLD_MAP_NODES[key].coords.y);
  cachedMapContentBounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
  return cachedMapContentBounds;
}

function resetWorldMapZoom() {
  worldMapZoom = 1.0;
  worldMapPanX = 0;
  worldMapPanY = 0;
  applyWorldMapTransform(true);
}

function fitWorldMap() {
  const keys = Object.keys(WORLD_MAP_NODES).filter(key => key !== 'wu_wei');
  if (keys.length === 0) return;

  const xs = keys.map(key => WORLD_MAP_NODES[key].coords.x);
  const ys = keys.map(key => WORLD_MAP_NODES[key].coords.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = 42;

  const zoom = clampNumber(
    Math.min(
      (MAP_VIEWBOX.w - padding * 2) / Math.max(1, maxX - minX),
      (MAP_VIEWBOX.h - padding * 2) / Math.max(1, maxY - minY)
    ),
    MAP_ZOOM_MIN,
    1.0
  );

  worldMapZoom = Number(zoom.toFixed(2));
  worldMapPanX = -worldMapZoom * ((minX + maxX) / 2 - MAP_VIEWBOX.w / 2);
  worldMapPanY = -worldMapZoom * ((minY + maxY) / 2 - MAP_VIEWBOX.h / 2);
  clampWorldMapPan();
  applyWorldMapTransform(true);
}

function centerWorldMapOnNode(nodeId = selectedMapNodeId, zoom = 1.4) {
  const node = WORLD_MAP_NODES[nodeId];
  if (!node) return;
  worldMapZoom = clampNumber(zoom, MAP_ZOOM_MIN, MAP_ZOOM_MAX);
  worldMapPanX = -worldMapZoom * (node.coords.x - MAP_VIEWBOX.w / 2);
  worldMapPanY = -worldMapZoom * (node.coords.y - MAP_VIEWBOX.h / 2);
  clampWorldMapPan();
  applyWorldMapTransform(true);
}

function applyWorldMapTransform(refreshLabels = false) {
  const viewport = document.getElementById('world-map-viewport');
  if (viewport) {
    // Bake the map centre into the transform so pan/zoom maths stays explicit.
    viewport.setAttribute(
      'transform',
      `translate(${worldMapPanX + MAP_VIEWBOX.w / 2}, ${worldMapPanY + MAP_VIEWBOX.h / 2}) scale(${worldMapZoom}) translate(${-MAP_VIEWBOX.w / 2}, ${-MAP_VIEWBOX.h / 2})`
    );
  }

  const badge = document.getElementById('map-zoom-level-badge');
  if (badge) {
    badge.innerText = `${Math.round(worldMapZoom * 100)}%`;
  }

  const container = document.getElementById('world-map-canvas-container');
  const tier = getMapTier();
  if (container) {
    container.dataset.tier = tier;
    container.dataset.mode = currentMapViewMode;
  }

  if (tier !== lastMapZoomTier) {
    lastMapZoomTier = tier;
    refreshLabels = true;
  }

  updateNodeVisualScale();
  updateTokenVisualScale();
  updateMapMinimapViewport();
  if (refreshLabels) scheduleMapLabelVisibility();
}

function updateNodeVisualScale() {
  const tier = getMapTier();
  const elements = document.querySelectorAll('.map-node');

  elements.forEach(nodeEl => {
    const visual = nodeEl.querySelector('.node-visual');
    if (!visual) return;
    const major = nodeEl.classList.contains('is-major');
    const tierScale = (tier === 'world' && !major) ? 0.6 : 1;
    visual.setAttribute('transform', `scale(${(tierScale / worldMapZoom).toFixed(3)})`);
  });
}

function updateTokenVisualScale() {
  const inverse = (1 / worldMapZoom).toFixed(3);
  document.querySelectorAll('.map-token .token-visual').forEach(visual => {
    visual.setAttribute('transform', `scale(${inverse})`);
  });
}

let labelRefreshFrame = null;

function scheduleMapLabelVisibility() {
  if (labelRefreshFrame) return;
  labelRefreshFrame = requestAnimationFrame(() => {
    labelRefreshFrame = null;
    updateMapLabelVisibility();
  });
}

function updateMapLabelVisibility() {
  const tier = getMapTier();
  const items = Array.from(document.querySelectorAll('.map-node')).map(nodeEl => ({
    nodeEl,
    nameEl: nodeEl.querySelector('.node-name'),
    provinceEl: nodeEl.querySelector('.node-province'),
    priority: Number(nodeEl.dataset.priority || 40)
  })).filter(item => item.nameEl);

  items.sort((a, b) => b.priority - a.priority);
  const placed = [];

  items.forEach(item => {
    const visibleAtTier = tier === 'local' || item.priority >= (tier === 'world' ? 80 : 40);
    if (!visibleAtTier) {
      item.nameEl.style.display = 'none';
      if (item.provinceEl) item.provinceEl.style.display = 'none';
      return;
    }

    item.nameEl.style.display = '';
    if (item.provinceEl) item.provinceEl.style.display = tier === 'local' ? '' : 'none';

    const rect = item.nameEl.getBoundingClientRect();
    if (!rect.width) return;

    const overlaps = placed.some(other => !(
      rect.right < other.left || rect.left > other.right ||
      rect.bottom < other.top || rect.top > other.bottom
    ));

    if (overlaps && tier !== 'local') {
      item.nameEl.style.display = 'none';
      if (item.provinceEl) item.provinceEl.style.display = 'none';
    } else {
      placed.push(rect);
    }
  });
}

function updateMapMinimapViewport() {
  const viewRect = document.getElementById('map-minimap-view');
  if (!viewRect) return;

  const z = worldMapZoom;
  const x = MAP_VIEWBOX.w / 2 - (MAP_VIEWBOX.w / 2 + worldMapPanX) / z;
  const y = MAP_VIEWBOX.h / 2 - (MAP_VIEWBOX.h / 2 + worldMapPanY) / z;
  const width = Math.min(MAP_VIEWBOX.w, MAP_VIEWBOX.w / z);
  const height = Math.min(MAP_VIEWBOX.h, MAP_VIEWBOX.h / z);

  viewRect.setAttribute('x', Math.max(0, x).toFixed(2));
  viewRect.setAttribute('y', Math.max(0, y).toFixed(2));
  viewRect.setAttribute('width', width.toFixed(2));
  viewRect.setAttribute('height', height.toFixed(2));
}

function handleMapMinimapClick(event) {
  const svg = event.currentTarget;
  if (!svg || !svg.getScreenCTM) return;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const mapped = point.matrixTransform(svg.getScreenCTM().inverse());

  worldMapPanX = -worldMapZoom * (mapped.x - MAP_VIEWBOX.w / 2);
  worldMapPanY = -worldMapZoom * (mapped.y - MAP_VIEWBOX.h / 2);
  clampWorldMapPan();
  applyWorldMapTransform(true);
}

function initWorldMapInteractions() {
  const container = document.getElementById('world-map-canvas-container');
  if (!container || hasAttachedMapEvents) return;
  hasAttachedMapEvents = true;

  const mapScale = () => {
    const svg = document.getElementById('world-map-svg');
    return svg && svg.getBoundingClientRect().width ? svg.getBoundingClientRect().width / MAP_VIEWBOX.w : 1;
  };

  // Mouse wheel zooming, anchored at the cursor.
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setWorldMapZoom(worldMapZoom + delta, e.clientX, e.clientY);
  }, { passive: false });

  // Mouse drag-to-pan (pan is stored in viewBox units).
  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.map-node') ||
        e.target.closest('.map-route-hit') ||
        e.target.closest('.map-zoom-toolbar') ||
        e.target.closest('.map-viewmode-toolbar') ||
        e.target.closest('.map-minimap') ||
        e.target.closest('.map-legend')) return;
    isWorldMapPanning = true;
    mapPanStartX = e.clientX;
    mapPanStartY = e.clientY;
    mapPanStartPanX = worldMapPanX;
    mapPanStartPanY = worldMapPanY;
    container.classList.add('is-panning');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isWorldMapPanning) return;
    const scale = mapScale();
    worldMapPanX = mapPanStartPanX + (e.clientX - mapPanStartX) / scale;
    worldMapPanY = mapPanStartPanY + (e.clientY - mapPanStartY) / scale;
    clampWorldMapPan();
    applyWorldMapTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isWorldMapPanning) {
      isWorldMapPanning = false;
      const c = document.getElementById('world-map-canvas-container');
      if (c) c.classList.remove('is-panning');
    }
  });

  // Touch drag and pinch-to-zoom.
  let lastTouchX = 0;
  let lastTouchY = 0;
  let lastPinchDist = 0;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      if (e.target.closest('.map-node') ||
          e.target.closest('.map-route-hit') ||
          e.target.closest('.map-zoom-toolbar') ||
          e.target.closest('.map-viewmode-toolbar') ||
          e.target.closest('.map-minimap')) return;
      isWorldMapPanning = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isWorldMapPanning = false;
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isWorldMapPanning) {
      const scale = mapScale();
      const dx = (e.touches[0].clientX - lastTouchX) / scale;
      const dy = (e.touches[0].clientY - lastTouchY) / scale;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      worldMapPanX += dx;
      worldMapPanY += dy;
      clampWorldMapPan();
      applyWorldMapTransform();
    } else if (e.touches.length === 2 && lastPinchDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const diff = (dist - lastPinchDist) * 0.005;
      lastPinchDist = dist;
      setWorldMapZoom(worldMapZoom + diff, centerX, centerY);
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isWorldMapPanning = false;
    lastPinchDist = 0;
  });
}

/**
 * The standardized ModalShell (src/client/features/world-map) replaces the
 * static dialog markup on boot, so the legacy map mount points have to be
 * re-created inside the shell body before the SVG renderer runs.
 */
function mountWorldMapLegacyView() {
  const body = document.getElementById('world-map-modal-body');
  if (!body) return false;

  if (!document.getElementById('world-map-canvas-container') ||
      !document.getElementById('world-map-intel-panel')) {
    body.innerHTML = `
      <div class="world-map-body">
        <div class="world-map-canvas-container" id="world-map-canvas-container"></div>
        <div class="world-map-intel-panel" id="world-map-intel-panel"></div>
      </div>
    `;
  }
  body.classList.add('world-map-modal-body');
  return true;
}

function refreshWorldMapView() {
  mountWorldMapLegacyView();

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  selectedMapNodeId = (currentRegion && WORLD_MAP_NODES[currentRegion.id]) ? currentRegion.id : selectedMapNodeId;
  selectedMapRoute = null;

  renderWorldMapSvg();
  fitWorldMap();
  renderWorldMapIntel(selectedMapNodeId);

  if (window.MapLiveService && typeof window.MapLiveService.load === 'function') {
    window.MapLiveService.load(true).then(() => {
      const modal = document.getElementById('world-map-modal');
      if (!modal || modal.classList.contains('hidden')) return;
      renderWorldMapSvg();
      renderWorldMapIntel(selectedMapNodeId);
    }).catch(() => {
      // Keep the blueprint rendering; the intel panel marks it as such.
    });
  }
}

async function refreshWorldMapLive() {
  if (!window.MapLiveService || typeof window.MapLiveService.load !== 'function') return;
  await window.MapLiveService.load(true);
  const modal = document.getElementById('world-map-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  renderWorldMapSvg();
  renderWorldMapIntel(selectedMapNodeId);
}

function openWorldMap() {
  // The shell owns modal-stack and Escape handling; delegate when it is bridged.
  if (window.WorldMapUI && typeof window.WorldMapUI.open === 'function') {
    window.WorldMapUI.open();
    return;
  }

  const modal = document.getElementById('world-map-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  refreshWorldMapView();
}

function closeWorldMap() {
  const modal = document.getElementById('world-map-modal');
  if (window.WorldMapUI && typeof window.WorldMapUI.close === 'function') {
    window.WorldMapUI.close();
  }
  if (modal) modal.classList.add('hidden');
}

function selectWorldMapNode(nodeId, keepFocus = false) {
  if (!WORLD_MAP_NODES[nodeId]) return;
  selectedMapNodeId = nodeId;
  selectedMapRoute = null;
  renderWorldMapSvg();
  renderWorldMapIntel(nodeId);
  if (keepFocus) {
    const rebuilt = document.querySelector(`.map-node[data-node="${nodeId}"]`);
    if (rebuilt) rebuilt.focus({ preventScroll: true });
  }
}

function selectWorldMapRoute(from, to) {
  if (!WORLD_MAP_NODES[from] || !WORLD_MAP_NODES[to]) return;
  selectedMapRoute = { from, to };
  selectedMapNodeId = to;
  renderWorldMapSvg();
  renderWorldMapIntel(to);
}

function showMapRouteTooltip(event, from, to) {
  let route = (window.WORLD_MAP_ROUTES || []).find(
    candidate => (candidate.from === from && candidate.to === to) ||
                 (candidate.from === to && candidate.to === from)
  );
  const tooltip = document.getElementById('map-route-tooltip');
  const container = document.getElementById('world-map-canvas-container');
  if (!route || !tooltip || !container) return;
  route = mergeLiveRoute(route);

  const isEn = (currentLang === 'en');
  const risk = MAP_RISK_META[route.ambushRisk] || MAP_RISK_META.MODERATE;
  const nameOf = (nodeId) => {
    const node = WORLD_MAP_NODES[nodeId];
    return node ? getShortNodeName(node, isEn) : nodeId;
  };
  const sealOf = (nodeId) => (typeof getSettlementSeal === 'function' ? getSettlementSeal(nodeId) : '');
  tooltip.innerHTML = `
    <div class="map-tooltip-title">${isEn ? 'Route' : 'Tuyến'} ${sealOf(from)} ${nameOf(from)} → ${sealOf(to)} ${nameOf(to)}</div>
    <div class="map-tooltip-desc">${isEn ? (route.descEn || route.descVi) : route.descVi}</div>
    <div class="map-tooltip-stats">
      <span>${route.distanceLi} ${isEn ? 'li' : 'dặm'}</span>
      <span>${route.marchDays} ${isEn ? 'days' : 'ngày'}</span>
      <span>${route.grainCost} ${isEn ? 'piculs' : 'thạch'}</span>
    </div>
    <div class="map-tooltip-risk" data-risk="${route.ambushRisk || 'MODERATE'}">
      ${isEn ? 'Ambush risk' : 'Rủi ro phục kích'}: ${isEn ? risk.labelEn : risk.labelVi}
    </div>
  `;
  tooltip.classList.remove('hidden');
  moveMapRouteTooltip(event);
}

function moveMapRouteTooltip(event) {
  const tooltip = document.getElementById('map-route-tooltip');
  const container = document.getElementById('world-map-canvas-container');
  if (!tooltip || !container || tooltip.classList.contains('hidden')) return;

  const bounds = container.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const maxX = Math.max(8, bounds.width - tooltip.offsetWidth - 10);
  const maxY = Math.max(8, bounds.height - tooltip.offsetHeight - 10);

  tooltip.style.left = `${Math.round(clampNumber(x + 16, 8, maxX))}px`;
  tooltip.style.top = `${Math.round(clampNumber(y + 16, 8, maxY))}px`;
}

function hideMapRouteTooltip() {
  const tooltip = document.getElementById('map-route-tooltip');
  if (tooltip) tooltip.classList.add('hidden');
}

function showMapNotice(message) {
  if (typeof showToast === 'function') showToast(message);
  else console.log(message);
}

function handleMapTokenClick(type, id) {
  const isEn = (currentLang === 'en');
  const living = (window.MapLiveService && typeof MapLiveService.getLivingEntities === 'function')
    ? MapLiveService.getLivingEntities()
    : { caravans: [], expeditions: [], bandits: [], crises: [] };

  if (type === 'caravan') {
    const caravan = living.caravans.find(item => String(item.caravanId || item.caravan_id) === String(id));
    if (window.CaravanUI) {
      if (typeof window.CaravanUI.open === 'function') {
        window.CaravanUI.open('tracking');
        return;
      }
      if (typeof window.CaravanUI.openCaravanModal === 'function') {
        window.CaravanUI.openCaravanModal('tracking');
        return;
      }
    }
    showMapNotice(isEn ? 'Caravan ledger is unavailable.' : 'Chưa mở được sổ thương đoàn.');
    return;
  }

  if (type === 'army') {
    const expedition = living.expeditions.find(item => String(item.expedition_id || item.expeditionId) === String(id));
    if (expedition && expedition.to) {
      selectWorldMapNode(expedition.to);
      centerWorldMapOnNode(expedition.to, 1.5);
    }
    return;
  }

  if (type === 'bandit') {
    const bandit = living.bandits.find(item => String(item.strongholdId || item.stronghold_id) === String(id));
    if (bandit) {
      selectWorldMapNode(bandit.nodeId);
      showMapNotice(`${bandit.nameVi || 'Ổ phỉ'} • ${bandit.banditPower || 0} ${isEn ? 'troops' : 'quân'} • ${isEn ? 'bounty' : 'thưởng'} ${bandit.bountyReward || 0} quan`);
    }
    return;
  }

  if (type === 'crisis') {
    const crisis = living.crises.find(item => String(item.crisisId || item.crisis_id) === String(id));
    if (crisis) {
      selectWorldMapNode(crisis.nodeId);
      showMapNotice(`${crisis.titleVi || 'Khủng hoảng'} • ${isEn ? 'severity' : 'mức'} ${crisis.severityLevel || 1}`);
    }
  }
}

function renderWorldMapSvg() {
  const container = document.getElementById('world-map-canvas-container');
  if (!container) return;

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  const isEn = (currentLang === 'en');
  const liveForNode = (key) => (window.MapLiveService && typeof MapLiveService.getForMapNode === 'function')
    ? MapLiveService.getForMapNode(key)
    : null;

  // Inter-citadel connecting routes from map-data or fallback
  const routes = (window.WORLD_MAP_ROUTES || [
    { from: 'zhuo_xian', to: 'ji_cheng', terrainType: 'HIGHWAY' },
    { from: 'zhuo_xian', to: 'guang_zong', terrainType: 'HIGHWAY' },
    { from: 'zhuo_xian', to: 'ping_yuan', terrainType: 'HIGHWAY' },
    { from: 'ji_cheng', to: 'ping_yuan', terrainType: 'HIGHWAY' },
    { from: 'guang_zong', to: 'ye_cheng', terrainType: 'HIGHWAY' },
    { from: 'guang_zong', to: 'ping_yuan', terrainType: 'HIGHWAY' },
    { from: 'ye_cheng', to: 'luo_yang', terrainType: 'HIGHWAY' },
    { from: 'ye_cheng', to: 'shang_dang', terrainType: 'MOUNTAIN_PASS' },
    { from: 'ye_cheng', to: 'xu_chang', terrainType: 'HIGHWAY' },
    { from: 'ping_yuan', to: 'xia_pi', terrainType: 'HIGHWAY' },
    { from: 'luo_yang', to: 'chang_an', terrainType: 'HIGHWAY' },
    { from: 'luo_yang', to: 'xu_chang', terrainType: 'HIGHWAY' },
    { from: 'chang_an', to: 'xi_liang', terrainType: 'HIGHWAY' },
    { from: 'chang_an', to: 'han_zhong', terrainType: 'PLANK_ROAD' },
    { from: 'han_zhong', to: 'cheng_du', terrainType: 'PLANK_ROAD' },
    { from: 'xu_chang', to: 'wan_cheng', terrainType: 'HIGHWAY' },
    { from: 'xu_chang', to: 'xia_pi', terrainType: 'HIGHWAY' },
    { from: 'xu_chang', to: 'shou_chun', terrainType: 'HIGHWAY' },
    { from: 'wan_cheng', to: 'xiang_yang', terrainType: 'WATERWAY' },
    { from: 'shou_chun', to: 'jian_ye', terrainType: 'WATERWAY' },
    { from: 'xiang_yang', to: 'jiang_ling', terrainType: 'WATERWAY' },
    { from: 'jiang_ling', to: 'chi_bi', terrainType: 'WATERWAY' },
    { from: 'chi_bi', to: 'jian_ye', terrainType: 'WATERWAY' },
    { from: 'xiang_yang', to: 'jiao_zhi', terrainType: 'MOUNTAIN_PASS' }
  ]).map(mergeLiveRoute);

  const renderedNodeKeys = Object.keys(WORLD_MAP_NODES).filter(key => key !== 'wu_wei');
  const nodeDegree = {};
  const connectedToSelection = new Set();

  routes.forEach(route => {
    nodeDegree[route.from] = (nodeDegree[route.from] || 0) + 1;
    nodeDegree[route.to] = (nodeDegree[route.to] || 0) + 1;
    if (route.from === selectedMapNodeId) connectedToSelection.add(route.to);
    if (route.to === selectedMapNodeId) connectedToSelection.add(route.from);
  });

  /**
   * Slight curvature keeps the network from looking like a wireframe and lets
   * water routes bend toward the river bands, without inventing new topology.
   */
  const routePath = (route, from, to) => {
    const control = getRouteControl(route, from, to);
    return `M ${from.x} ${from.y} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${to.x} ${to.y}`;
  };

  const routeStyle = (route, isConnected, isRouteSelected) => {
    const terrain = route.terrainType || 'HIGHWAY';
    const risk = MAP_RISK_META[route.ambushRisk] || MAP_RISK_META.MODERATE;
    const degree = Math.max(nodeDegree[route.from] || 0, nodeDegree[route.to] || 0);
    const grainCost = Number(route.grainCost || 1);

    if (currentMapViewMode === 'resources') {
      return { color: 'rgba(148, 163, 184, 0.28)', width: isRouteSelected ? 2.2 : 1, dash: '2 4', opacity: 0.45 };
    }

    if (currentMapViewMode === 'military') {
      const width = isRouteSelected ? 3.4 : (isConnected ? 2.8 : 1.3 + risk.weight * 0.9);
      return {
        color: risk.color,
        width: Number(width.toFixed(2)),
        dash: 'none',
        opacity: (isRouteSelected || isConnected) ? 1 : 0.8
      };
    }

    if (currentMapViewMode === 'economy') {
      const width = isRouteSelected ? 3.4 : (isConnected ? 2.8 : 1.1 + Math.min(2.2, grainCost * 0.35));
      return {
        color: terrain === 'WATERWAY' ? '#38bdf8' : '#fbbf24',
        width: Number(width.toFixed(2)),
        dash: terrain === 'WATERWAY' ? '6 4' : 'none',
        opacity: (isRouteSelected || isConnected) ? 1 : 0.75
      };
    }

    const palette = terrain === 'WATERWAY'
      ? { color: '#38bdf8', dash: '6 4' }
      : terrain === 'MOUNTAIN_PASS'
        ? { color: '#f87171', dash: '3 3' }
        : terrain === 'PLANK_ROAD'
          ? { color: '#d97706', dash: '2 4' }
          : { color: '#f59e0b', dash: degree >= 4 ? 'none' : '4 3' };

    const width = isRouteSelected ? 3.6 : (isConnected ? 3.0 : (degree >= 4 ? 2.2 : 1.5));
    return {
      color: palette.color,
      width,
      dash: palette.dash,
      opacity: (isRouteSelected || isConnected) ? 1 : 0.7
    };
  };

  const svgRoutes = routes.map(route => {
    const from = WORLD_MAP_NODES[route.from] ? WORLD_MAP_NODES[route.from].coords : null;
    const to = WORLD_MAP_NODES[route.to] ? WORLD_MAP_NODES[route.to].coords : null;
    if (!from || !to) return '';

    const isConnected = (route.from === selectedMapNodeId || route.to === selectedMapNodeId);
    const isRouteSelected = !!selectedMapRoute && (
      (selectedMapRoute.from === route.from && selectedMapRoute.to === route.to) ||
      (selectedMapRoute.from === route.to && selectedMapRoute.to === route.from)
    );
    const style = routeStyle(route, isConnected, isRouteSelected);
    const path = routePath(route, from, to);
    const className = [
      'map-route',
      isConnected ? 'map-route-active' : '',
      isRouteSelected ? 'is-selected' : ''
    ].filter(Boolean).join(' ');

    return `
      <path class="${className}" d="${path}" fill="none"
            stroke="${style.color}" stroke-width="${style.width}"
            stroke-dasharray="${style.dash}" stroke-linecap="round"
            opacity="${style.opacity}" vector-effect="non-scaling-stroke"></path>
      ${isRouteSelected ? `
        <path class="map-route-flow" d="${path}" fill="none" stroke="${style.color}"
              stroke-width="${style.width}" stroke-dasharray="8 10" stroke-linecap="round"
              vector-effect="non-scaling-stroke"></path>
      ` : ''}
      <path class="map-route-hit" d="${path}" fill="none" stroke="transparent"
            stroke-width="14" vector-effect="non-scaling-stroke"
            onmouseenter="showMapRouteTooltip(event, '${route.from}', '${route.to}')"
            onmousemove="moveMapRouteTooltip(event)"
            onmouseleave="hideMapRouteTooltip()"
            onclick="selectWorldMapRoute('${route.from}', '${route.to}')"></path>
    `;
  }).join('');

  // Soft influence wash around the major centres only. Layered flat discs read
  // as spheres of control without hard borders or an expensive blur pass.
  const washKeys = new Set([...MAP_CAPITALS, currentRegion.id, selectedMapNodeId]);
  const washLayers = [1, 0.82, 0.66, 0.52, 0.4];
  const factionWash = renderedNodeKeys.filter(key => washKeys.has(key)).map(key => {
    const node = WORLD_MAP_NODES[key];
    const fallbackTheme = MAP_NODE_THEMES[key] || { stroke: '#3b82f6' };
    const live = liveForNode(key);
    const color = (live && live.factionColor) || (node.military && node.military.colorHex) || fallbackTheme.stroke;
    const radius = MAP_CAPITALS.has(key) ? 84 : 64;
    const baseOpacity = MAP_CAPITALS.has(key) ? 0.035 : 0.028;
    return washLayers.map((scale, index) => {
      const opacity = (baseOpacity * (1 + index * 0.12)).toFixed(3);
      return `<circle cx="${node.coords.x}" cy="${node.coords.y}" r="${(radius * scale).toFixed(1)}" fill="${color}" fill-opacity="${opacity}"></circle>`;
    }).join('');
  }).join('');

  const resourceDistribution = (window.MapLiveService && typeof MapLiveService.getResourceDistribution === 'function')
    ? MapLiveService.getResourceDistribution()
    : { byNode: {}, totals: {}, types: [] };
  const availableResourceTypes = Object.keys(resourceDistribution.totals)
    .filter(type => RESOURCE_META[type])
    .sort();

  const resourceZones = [];
  if (currentMapViewMode === 'resources') {
    Object.keys(resourceDistribution.byNode).forEach(nodeId => {
      const node = WORLD_MAP_NODES[nodeId];
      const info = resourceDistribution.byNode[nodeId];
      if (!node || !info) return;
      const types = Object.keys(info.types).filter(type => {
        if (resourceFilter !== 'ALL' && type !== resourceFilter) return false;
        return Boolean(RESOURCE_META[type]);
      });
      types.forEach((type, index) => {
        const meta = RESOURCE_META[type];
        const angle = (index / Math.max(1, types.length)) * Math.PI * 2 + 0.35;
        const offset = 24;
        const x = node.coords.x + Math.cos(angle) * offset;
        const y = node.coords.y + Math.sin(angle) * offset;
        const count = info.types[type];
        resourceZones.push(`
          <g class="map-resource-zone resource-zone--${type.toLowerCase()}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" color="${meta.color}">
            <circle r="18" fill="${meta.color}" fill-opacity="0.14" stroke="${meta.color}" stroke-opacity="0.38" stroke-width="1"></circle>
            <circle r="10" fill="${meta.color}" fill-opacity="0.09"></circle>
            <use href="#icon-${meta.icon}" x="-6" y="-6" width="12" height="12"></use>
            <title>${isEn ? meta.labelEn : meta.labelVi} × ${count}</title>
          </g>
        `);
      });
    });
  }
  const svgResourceZones = resourceZones.join('');

  const svgNodes = renderedNodeKeys.map(key => {
    const node = WORLD_MAP_NODES[key];
    const isCurrent = (currentRegion.id === key);
    const isSelected = (selectedMapNodeId === key);
    const isCapital = MAP_CAPITALS.has(key);
    const isConnected = connectedToSelection.has(key);
    const isMajor = isCapital || isCurrent || isSelected;
    const resourceInfo = resourceDistribution.byNode[key];
    const matchesResourceFilter = resourceFilter === 'ALL'
      || Boolean(resourceInfo && resourceInfo.types[resourceFilter]);
    const dimForResourceFilter = currentMapViewMode === 'resources' && !matchesResourceFilter;

    const staticTheme = MAP_NODE_THEMES[key] || { fill: '#0f172a', stroke: '#3b82f6', icon: '鎮' };
    const live = liveForNode(key);
    const theme = {
      ...staticTheme,
      stroke: isCurrent ? '#10b981' : ((live && live.factionColor) || staticTheme.stroke)
    };
    const displayName = typeof getShortNodeName === 'function'
      ? getShortNodeName(node, isEn)
      : (isEn ? node.nameEn : node.nameVi);
    const displayProvince = isEn ? node.provinceEn : node.provinceVi;
    const priority = isSelected ? 100 : (isCurrent ? 95 : (isCapital ? 80 : (isConnected ? 60 : 40)));
    const radius = isCapital ? 16 : 12.5;
    const seal = (typeof getSettlementSeal === 'function' && getSettlementSeal(key)) || theme.icon;

    let modeBadge = '';
    if (currentMapViewMode === 'military' && node.military) {
      const liveGarrison = live && Number.isFinite(live.garrisonTroops) ? live.garrisonTroops : null;
      const garrison = liveGarrison != null ? liveGarrison : (node.military.garrison || 0);
      const defense = live && Number.isFinite(live.defense) ? live.defense : node.military.defense;
      const garrisonLabel = garrison >= 1000 ? `${(garrison / 1000).toFixed(1)}k` : `${garrison}`;
      modeBadge = `
        <g class="node-badge node-badge--military">
          <rect x="-29" y="-38" width="58" height="15" rx="3"></rect>
          <text x="0" y="-27" text-anchor="middle">Binh ${garrisonLabel}</text>
        </g>
        <text class="node-province" x="0" y="40" text-anchor="middle">Thủ ${defense}</text>
      `;
    } else if (currentMapViewMode === 'economy' && node.economy) {
      const liveGrain = live && Number.isFinite(live.granaryGrain) ? live.granaryGrain : null;
      const grain = liveGrain != null ? liveGrain : (node.economy.grainReserves || 0);
      const grainLabel = grain >= 1000 ? `${(grain / 1000).toFixed(1)}k` : `${grain}`;
      const primaryCommodity = isEn
        ? (node.economy.primaryCommodityEn || node.economy.primaryCommodityVi)
        : node.economy.primaryCommodityVi;
      const commodity = String(primaryCommodity || '').split(' ')[0];
      modeBadge = `
        <g class="node-badge node-badge--economy">
          <rect x="-29" y="-38" width="58" height="15" rx="3"></rect>
          <text x="0" y="-27" text-anchor="middle">Lương ${grainLabel}</text>
        </g>
        <text class="node-province" x="0" y="40" text-anchor="middle">${commodity}</text>
      `;
    } else {
      modeBadge = `<text class="node-province" x="0" y="38" text-anchor="middle">${displayProvince}</text>`;
    }

    return `
      <g class="map-node ${isSelected ? 'active' : ''} ${isCapital ? 'is-capital' : ''} ${isMajor ? 'is-major' : ''} ${isCurrent ? 'is-current' : ''} ${dimForResourceFilter ? 'is-resource-dim' : ''}"
         data-node="${key}" data-priority="${priority}" data-live="${live ? 'true' : 'false'}" role="button" tabindex="0"
         aria-label="${displayName}, ${displayProvince}"
         transform="translate(${node.coords.x} ${node.coords.y})"
         onclick="selectWorldMapNode('${key}')"
         ondblclick="centerWorldMapOnNode('${key}', 1.9)"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectWorldMapNode('${key}', true);}">
        <title>${displayName} • ${displayProvince}</title>
        <g class="node-visual">
          ${isCurrent ? `<circle class="map-pulse-ring" r="${radius + 10}" fill="none" stroke="#10b981" stroke-width="2" opacity="0.75"></circle>` : ''}
          ${isSelected ? `<circle class="node-selected-ring" r="${radius + 8}" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4 3"></circle>` : ''}
          ${isCapital && !isSelected ? `<circle class="node-capital-ring" r="${radius + 4}" fill="none" stroke="${theme.stroke}" stroke-width="1" opacity="0.55" stroke-dasharray="2 3"></circle>` : ''}
          <circle class="node-halo" r="${radius + 6}" fill="none" stroke="#fbbf24" stroke-width="1.5" opacity="0"></circle>
          <circle class="node-bg" r="${radius}" fill="${theme.fill}" stroke="${isSelected ? '#fbbf24' : theme.stroke}" stroke-width="${isSelected ? 2.5 : (isCapital ? 2 : 1.5)}"></circle>
          <text class="node-icon" y="4.5" text-anchor="middle" font-size="${isCapital ? 12 : 11}">${seal}</text>
          ${modeBadge}
          <text class="node-name" y="27" text-anchor="middle" font-size="11" font-weight="${isSelected ? '700' : '600'}">${displayName}</text>
        </g>
      </g>
    `;
  }).join('');

  const living = (window.MapLiveService && typeof MapLiveService.getLivingEntities === 'function')
    ? MapLiveService.getLivingEntities()
    : { caravans: [], expeditions: [], bandits: [], crises: [] };
  const livingCounts = {
    caravans: living.caravans.length,
    armies: living.expeditions.length,
    bandits: living.bandits.length,
    crises: living.crises.length
  };
  const tokenScale = (1 / worldMapZoom).toFixed(3);
  const tokenTitle = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tokenMarkup = (type, x, y, id, icon, title) => `
    <g class="map-token map-token--${type}" data-token-type="${type}" data-token-id="${String(id)}"
       transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"
       onclick="handleMapTokenClick('${type}', '${String(id).replace(/'/g, "\\'")}')">
      <g class="token-visual" transform="scale(${tokenScale})">
        <circle class="token-bg" r="10"></circle>
        <use class="token-icon" href="#icon-${icon}" x="-6" y="-6" width="12" height="12"></use>
      </g>
      <title>${tokenTitle(title)}</title>
    </g>
  `;

  const tokenParts = [];
  if (mapLayerVisibility.caravans) {
    living.caravans.forEach(caravan => {
      const from = WORLD_MAP_NODES[caravan.from] && WORLD_MAP_NODES[caravan.from].coords;
      const to = WORLD_MAP_NODES[caravan.to] && WORLD_MAP_NODES[caravan.to].coords;
      if (!from || !to) return;
      const route = mergeLiveRoute({ from: caravan.from, to: caravan.to, terrainType: 'HIGHWAY' });
      const control = getRouteControl(route, from, to);
      const point = quadraticPoint(from, control, to, Math.min(0.98, Math.max(0.02, Number(caravan.progress) || 0.5)));
      const name = caravan.caravanName || caravan.caravanId || 'Caravan';
      const progress = Math.round((Number(caravan.progress) || 0) * 100);
      tokenParts.push(tokenMarkup('caravan', point.x, point.y, caravan.caravanId || caravan.caravan_id, 'cart', `${name} • ${progress}% • ${caravan.cargoItemName || ''}`));
    });
  }
  if (mapLayerVisibility.armies) {
    living.expeditions.forEach((expedition, index) => {
      const from = WORLD_MAP_NODES[expedition.from] && WORLD_MAP_NODES[expedition.from].coords;
      const to = WORLD_MAP_NODES[expedition.to] && WORLD_MAP_NODES[expedition.to].coords;
      if (!from || !to) return;
      const route = mergeLiveRoute({ from: expedition.from, to: expedition.to, terrainType: 'HIGHWAY' });
      const control = getRouteControl(route, from, to);
      const point = quadraticPoint(from, control, to, 0.5);
      const troops = expedition.troop_count || expedition.troopCount || '';
      const id = expedition.expedition_id || expedition.expeditionId || `exp-${index}`;
      tokenParts.push(tokenMarkup('army', point.x, point.y, id, 'soldier', `${isEn ? 'Marching' : 'Đang hành quân'}: ${expedition.from} → ${expedition.to} • ${troops} ${isEn ? 'troops' : 'quân'}`));
    });
  }
  if (mapLayerVisibility.bandits) {
    living.bandits.forEach((bandit, index) => {
      const node = WORLD_MAP_NODES[bandit.nodeId];
      if (!node) return;
      const x = node.coords.x + 22 + index * 13;
      const y = node.coords.y + 12;
      const id = bandit.strongholdId || bandit.stronghold_id || `bandit-${index}`;
      tokenParts.push(tokenMarkup('bandit', x, y, id, 'mask', `${bandit.nameVi || 'Ổ phỉ'} • ${bandit.banditPower || 0} • ${bandit.bountyReward || 0} quan`));
    });
  }
  if (mapLayerVisibility.crises) {
    living.crises.forEach((crisis, index) => {
      const node = WORLD_MAP_NODES[crisis.nodeId];
      if (!node) return;
      const x = node.coords.x - 22 - index * 13;
      const y = node.coords.y + 12;
      const id = crisis.crisisId || crisis.crisis_id || `crisis-${index}`;
      tokenParts.push(tokenMarkup('crisis', x, y, id, 'alert', `${crisis.titleVi || 'Khủng hoảng'} • ${isEn ? 'severity' : 'mức'} ${crisis.severityLevel || 1}`));
    });
  }
  const svgTokens = tokenParts.join('');

  const minimapDots = renderedNodeKeys.map(key => {
    const node = WORLD_MAP_NODES[key];
    const theme = MAP_NODE_THEMES[key] || { stroke: '#3b82f6' };
    const isCurrent = currentRegion.id === key;
    return `<circle cx="${node.coords.x}" cy="${node.coords.y}" r="${isCurrent ? 9 : 5}" fill="${theme.stroke}" opacity="${isCurrent ? 1 : 0.7}"></circle>`;
  }).join('');

  const legendItems = (() => {
    if (currentMapViewMode === 'military') {
      return [
        ['risk-low', isEn ? 'Low risk' : 'Rủi ro thấp'],
        ['risk-moderate', isEn ? 'Moderate' : 'Rủi ro vừa'],
        ['risk-high', isEn ? 'High risk' : 'Rủi ro cao'],
        ['risk-extreme', isEn ? 'Extreme' : 'Cực cao']
      ];
    }
    if (currentMapViewMode === 'economy') {
      return [
        ['route-highway', isEn ? 'Overland trade' : 'Thương lộ bộ'],
        ['route-waterway', isEn ? 'Waterway' : 'Thủy lộ'],
        ['current', isEn ? 'Current' : 'Hiện tại']
      ];
    }
    return [
      ['current', isEn ? 'Current position' : 'Vị trí hiện tại'],
      ['route-highway', isEn ? 'Highway' : 'Quan đạo'],
      ['route-waterway', isEn ? 'Waterway' : 'Thủy lộ'],
      ['route-mountain', isEn ? 'Mountain pass' : 'Sơn đạo']
    ];
  })();

  const legendHtml = legendItems.map(([swatch, label]) =>
    `<span class="map-legend-item"><i class="map-legend-swatch swatch--${swatch}"></i>${label}</span>`
  ).join('');

  container.innerHTML = `
    <!-- Floating Zoom Toolbar (Top Left) -->
    <div class="map-zoom-toolbar">
      <button class="map-zoom-btn" onclick="zoomWorldMap(0.25)" title="${isEn ? 'Zoom In' : 'Phóng to'}">+</button>
      <span class="map-zoom-level" id="map-zoom-level-badge">${Math.round(worldMapZoom * 100)}%</span>
      <button class="map-zoom-btn" onclick="zoomWorldMap(-0.25)" title="${isEn ? 'Zoom Out' : 'Thu nhỏ'}">-</button>
      <button class="map-zoom-btn" onclick="resetWorldMapZoom()" title="${isEn ? 'Reset 1:1' : 'Khôi phục 1:1'}">1:1</button>
      <button class="map-zoom-action" onclick="fitWorldMap()" title="${isEn ? 'Fit all citadels' : 'Thu vừa toàn bộ thành trì'}">${isEn ? 'Fit' : 'Vừa'}</button>
      <button class="map-zoom-action" onclick="centerWorldMapOnNode(selectedMapNodeId, 1.5)" title="${isEn ? 'Focus selected citadel' : 'Cận cảnh thành đang chọn'}">${isEn ? 'Focus' : 'Cận'}</button>
    </div>

    <!-- View Mode Selector Toolbar (Top Right) -->
    <div class="map-viewmode-toolbar">
      <button class="map-viewmode-btn ${currentMapViewMode === 'overview' ? 'active' : ''}" onclick="setMapViewMode('overview')" title="${isEn ? 'Strategic overview' : 'Toàn cảnh địa dư'}">
        ${uiIcon('map')} <span>${isEn ? 'Overview' : 'Toàn Cảnh'}</span>
      </button>
      <button class="map-viewmode-btn ${currentMapViewMode === 'military' ? 'active' : ''}" onclick="setMapViewMode('military')" title="${isEn ? 'Garrisons & defense' : 'Binh lực & phòng ngự'}">
        ${uiIcon('sword')} <span>${isEn ? 'Military' : 'Quân Sự'}</span>
      </button>
      <button class="map-viewmode-btn ${currentMapViewMode === 'economy' ? 'active' : ''}" onclick="setMapViewMode('economy')" title="${isEn ? 'Grain & commodities' : 'Lương thảo & sản vật'}">
        ${uiIcon('grain')} <span>${isEn ? 'Economy' : 'Kinh Tế'}</span>
      </button>
      <button class="map-viewmode-btn ${currentMapViewMode === 'resources' ? 'active' : ''}" onclick="setMapViewMode('resources')" title="${isEn ? 'Resource distribution' : 'Phân bố tài nguyên'}">
        ${uiIcon('layers')} <span>${isEn ? 'Resources' : 'Tài Nguyên'}</span>
      </button>
    </div>

    <!-- Living Layer Toggles -->
    <div class="map-layer-toolbar">
      <button class="map-layer-btn ${mapLayerVisibility.caravans ? 'is-on' : 'is-off'}" type="button" onclick="toggleMapLayer('caravans')" title="${isEn ? 'Trade caravans' : 'Thương đoàn'}">
        ${uiIcon('cart')} <span class="map-layer-count">${livingCounts.caravans}</span>
      </button>
      <button class="map-layer-btn ${mapLayerVisibility.armies ? 'is-on' : 'is-off'}" type="button" onclick="toggleMapLayer('armies')" title="${isEn ? 'Marching armies' : 'Quân đoàn'}">
        ${uiIcon('soldier')} <span class="map-layer-count">${livingCounts.armies}</span>
      </button>
      <button class="map-layer-btn ${mapLayerVisibility.bandits ? 'is-on' : 'is-off'}" type="button" onclick="toggleMapLayer('bandits')" title="${isEn ? 'Bandit lairs' : 'Ổ phỉ'}">
        ${uiIcon('mask')} <span class="map-layer-count">${livingCounts.bandits}</span>
      </button>
      <button class="map-layer-btn ${mapLayerVisibility.crises ? 'is-on' : 'is-off'}" type="button" onclick="toggleMapLayer('crises')" title="${isEn ? 'Ecological crises' : 'Khủng hoảng'}">
        ${uiIcon('alert')} <span class="map-layer-count">${livingCounts.crises}</span>
      </button>
    </div>

    <!-- Resource filters (resources mode only). The filter buttons carry the
         swatch, label and count, so a second legend would repeat the same seven
         rows and overlap this panel. Keep everything in one block. -->
    ${currentMapViewMode === 'resources' ? `
    <div class="map-resource-filter" role="group" aria-label="${isEn ? 'Resource distribution filter' : 'Bộ lọc phân bố tài nguyên'}">
      <span class="map-resource-filter-title">${uiIcon('layers')} ${isEn ? 'Resources' : 'Tài nguyên'}</span>
      <button class="map-resource-btn ${resourceFilter === 'ALL' ? 'active' : ''}" type="button" onclick="toggleResourceFilter('ALL')">
        ◈ ${isEn ? 'All' : 'Tất cả'}
      </button>
      ${availableResourceTypes.map(type => {
        const meta = RESOURCE_META[type];
        return `
          <button class="map-resource-btn ${resourceFilter === type ? 'active' : ''}" type="button" onclick="toggleResourceFilter('${type}')">
            <span class="map-resource-swatch resource-swatch--${type.toLowerCase()}"></span>
            ${uiIcon(meta.icon)}
            <span>${isEn ? meta.labelEn : meta.labelVi}</span>
            <span class="map-resource-count">${resourceDistribution.totals[type]}</span>
          </button>
        `;
      }).join('')}
    </div>
    ` : ''}

    <!-- Mode-aware Legend (Bottom Left). Resource mode has no legend because its
         filter panel is the legend. -->
    ${currentMapViewMode === 'resources' ? '' : `<div class="map-legend" id="map-legend">${legendHtml}</div>`}

    <!-- Navigation Hint (Bottom Left, under the legend) -->
    <div class="map-nav-hint">${isEn ? 'Scroll to zoom • Drag to pan • Click a route to inspect' : 'Cuộn để zoom • Kéo để di chuyển • Bấm tuyến để xem'}</div>

    <!-- Strategic Minimap (Bottom Right) -->
    <div class="map-minimap" id="map-minimap" title="${isEn ? 'Click to jump' : 'Bấm để nhảy tới vị trí'}">
      <svg id="world-map-minimap-svg" viewBox="0 0 600 550" preserveAspectRatio="xMidYMid meet" onclick="handleMapMinimapClick(event)">
        <rect width="600" height="550" fill="#070a12"></rect>
        ${minimapDots}
        <rect id="map-minimap-view" class="map-minimap-view" x="0" y="0" width="600" height="550"></rect>
      </svg>
    </div>

    <!-- Route Tooltip -->
    <div class="map-route-tooltip hidden" id="map-route-tooltip"></div>

    <svg id="world-map-svg" viewBox="0 0 600 550" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="tactical-grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1"></path>
        </pattern>
      </defs>

      <!-- Background & Grid -->
      <rect width="100%" height="100%" fill="#070a12"></rect>
      <rect width="100%" height="100%" fill="url(#tactical-grid)"></rect>

      <!-- Border Frame (Fixed on Canvas) -->
      <rect x="8" y="8" width="584" height="534" fill="none" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1" stroke-dasharray="6,4"></rect>
      <rect x="12" y="12" width="576" height="526" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.5"></rect>

      <!-- North Indicator (Fixed on Canvas) -->
      <g transform="translate(565, 34)" opacity="0.65">
        <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"></circle>
        <polygon points="0,-12 4,0 0,-4 -4,0" fill="#f59e0b"></polygon>
        <text x="0" y="10" fill="#cbd5e1" font-size="7" font-weight="700" text-anchor="middle">BẮC</text>
      </g>

      <!-- Scalable Map Viewport -->
      <g id="world-map-viewport" transform="translate(${worldMapPanX + MAP_VIEWBOX.w / 2}, ${worldMapPanY + MAP_VIEWBOX.h / 2}) scale(${worldMapZoom}) translate(${-MAP_VIEWBOX.w / 2}, ${-MAP_VIEWBOX.h / 2})">
        <!-- Ancient Province Watermarks -->
        <text class="map-region-label" x="380" y="32" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">U CHÂU (YOUZHOU)</text>
        <text class="map-region-label" x="340" y="125" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">KÝ CHÂU (JIZHOU)</text>
        <text class="map-region-label" x="500" y="135" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">THANH CHÂU</text>
        <text class="map-region-label" x="210" y="215" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">TƯ LỆ (SILI)</text>
        <text class="map-region-label" x="375" y="305" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">DỰ CHÂU &amp; DUYỆN CHÂU</text>
        <text class="map-region-label" x="500" y="260" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">TỪ CHÂU (XUZHOU)</text>
        <text class="map-region-label" x="275" y="395" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">KINH CHÂU (JINGZHOU)</text>
        <text class="map-region-label" x="475" y="435" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">GIANG ĐÔNG (WU)</text>
        <text class="map-region-label" x="95" y="475" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">BA THỤC (BASHU)</text>
        <text class="map-region-label" x="340" y="535" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">GIAO CHÂU (JIAOZHOU)</text>

        <!-- Spheres of Influence -->
        <g class="map-faction-wash" opacity="${currentMapViewMode === 'overview' ? 0.95 : 0.55}">
          ${factionWash}
        </g>

        <!-- Resource Distribution Zones -->
        <g class="map-resource-layer">${svgResourceZones}</g>

        <!-- Hoàng Hà (The Yellow River) -->
        <path class="map-river" d="M 60,215 C 120,225 180,235 235,230 C 275,225 320,205 380,210 C 440,215 500,190 560,175"
              stroke="#1d4ed8" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.38"></path>
        <path class="map-river" d="M 60,215 C 120,225 180,235 235,230 C 275,225 320,205 380,210 C 440,215 500,190 560,175"
              stroke="#60a5fa" stroke-width="2" stroke-dasharray="8,5" fill="none" opacity="0.85"></path>
        <text class="map-river-label" x="330" y="200" fill="#93c5fd" font-size="9" font-style="italic" opacity="0.85" letter-spacing="0.5px">Hoàng Hà (Yellow River)</text>

        <!-- Trường Giang (The Yangtze River) -->
        <path class="map-river" d="M 40,465 C 110,445 190,435 250,428 C 310,422 355,418 410,405 C 470,392 525,380 580,370"
              stroke="#0e7490" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.38"></path>
        <path class="map-river" d="M 40,465 C 110,445 190,435 250,428 C 310,422 355,418 410,405 C 470,392 525,380 580,370"
              stroke="#38bdf8" stroke-width="2" stroke-dasharray="8,5" fill="none" opacity="0.85"></path>
        <text class="map-river-label" x="290" y="445" fill="#7dd3fc" font-size="9" font-style="italic" opacity="0.85" letter-spacing="0.5px">Trường Giang (Yangtze River)</text>

        <!-- Mountain Pass: Hổ Lao Quan -->
        <g class="map-pass" transform="translate(295, 255)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9"></polygon>
          <text class="map-pass-label" x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Hổ Lao Quan</text>
        </g>

        <!-- Mountain Pass: Đồng Quan -->
        <g class="map-pass" transform="translate(210, 248)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9"></polygon>
          <text class="map-pass-label" x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Đồng Quan</text>
        </g>

        <!-- Mountain Pass: Kiếm Các -->
        <g class="map-pass" transform="translate(100, 390)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9"></polygon>
          <text class="map-pass-label" x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Kiếm Các</text>
        </g>

        <!-- Tactical Connecting Routes (Styled by Terrain Type) -->
        ${svgRoutes}

        <!-- Interactive Strategic Regional Nodes (20 Citadels) -->
        ${svgNodes}

        <!-- Living Layer Tokens (caravans, armies, bandits, crises) -->
        <g class="map-tokens" id="world-map-tokens">${svgTokens}</g>
      </g>
    </svg>
  `;

  // The footer legend explains positions and battles; in resources mode the
  // filter panel is the only legend that matters, so hide the unrelated one.
  const footerLegend = document.getElementById('world-map-legend');
  if (footerLegend) footerLegend.classList.toggle('hidden', currentMapViewMode === 'resources');

  initWorldMapInteractions();
  lastMapZoomTier = '';
  applyWorldMapTransform(true);
}

function renderWorldMapIntel(nodeId = selectedMapNodeId) {
  const panel = document.getElementById('world-map-intel-panel');
  if (!panel) return;

  const node = WORLD_MAP_NODES[nodeId];
  if (!node) return;

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  const isCurrent = (currentRegion.id === nodeId);
  const isEn = (currentLang === 'en');
  const dict = I18N_DICT[currentLang] || I18N_DICT.vi;

  const isCapital = (nodeId === 'luo_yang' || nodeId === 'chang_an' || nodeId === 'jian_ye' || nodeId === 'cheng_du');
  const isBattle = (nodeId === 'guang_zong' || nodeId === 'chi_bi');
  const badgeClass = isCapital ? 'capital' : (isBattle ? 'battle' : 'safe');
  const badgeText = isEn ? node.statusEn : node.statusVi;

  const dist = isCurrent ? 0 : node.distanceFromZhuo;
  const distText = isEn ? `${dist} li` : `${dist} dặm`;
  const daysText = isCurrent ? (isEn ? '0 days' : '0 ngày') : (isEn ? `${node.daysRequired} days` : `${node.daysRequired} ngày`);
  const grainText = isCurrent ? (isEn ? '0 grain' : '0 thạch') : `${node.grainCost} ${isEn ? 'piculs' : 'thạch'}`;
  const threatText = isEn ? node.threatEn : node.threatVi;
  const threatColor = isBattle ? '#f87171' : ((nodeId === 'chang_an' || nodeId === 'ping_yuan' || nodeId === 'xia_pi' || nodeId === 'jiang_ling' || nodeId === 'han_zhong') ? '#fbbf24' : '#34d399');

  const title = getShortNodeName(node, isEn);
  const seal = (typeof getSettlementSeal === 'function' && getSettlementSeal(nodeId)) || '';
  const prov = isEn ? node.provinceEn : node.provinceVi;
  const intel = isEn ? node.intelEn : node.intelVi;
  const figures = isEn ? node.figuresEn : node.figuresVi;

  const mil = node.military || {
    garrison: 1000,
    infantry: 600,
    cavalry: 200,
    archers: 200,
    defense: 70,
    rulerFaction: 'FAC-HAN',
    rulerNameVi: 'Đại Hán Triều Đình',
    rulerNameEn: 'Han Imperial Court',
    colorHex: '#3b82f6',
    governorVi: 'Thái Thú Bản Địa',
    governorEn: 'Local Governor'
  };

  const rulerName = isEn ? (mil.rulerNameEn || mil.rulerNameVi) : mil.rulerNameVi;
  const governorName = isEn ? (mil.governorEn || mil.governorVi) : mil.governorVi;

  const eco = node.economy || {
    grainReserves: 2000,
    treasury: 10000,
    primaryCommodityVi: 'Ngũ Cốc & Binh Khí',
    primaryCommodityEn: 'Grain & Weapons',
    exportGoodVi: 'Lương Thảo',
    exportGoodEn: 'Grain',
    importNeedVi: 'Thép Thỏi',
    importNeedEn: 'Steel Ingots'
  };

  const ecoPrimary = isEn ? (eco.primaryCommodityEn || eco.primaryCommodityVi) : eco.primaryCommodityVi;
  const ecoExport = isEn ? (eco.exportGoodEn || eco.exportGoodVi) : eco.exportGoodVi;
  const ecoImport = isEn ? (eco.importNeedEn || eco.importNeedVi) : eco.importNeedVi;

  const live = (window.MapLiveService && typeof MapLiveService.getForMapNode === 'function')
    ? MapLiveService.getForMapNode(nodeId)
    : null;
  const liveGarrison = live && Number.isFinite(live.garrisonTroops) ? live.garrisonTroops : null;
  const liveDefense = live && Number.isFinite(live.defense) ? live.defense : null;
  const liveGrain = live && Number.isFinite(live.granaryGrain) ? live.granaryGrain : null;
  const liveCash = live && Number.isFinite(live.treasuryCash) ? live.treasuryCash : null;
  const liveOrder = live && Number.isFinite(live.publicOrder) ? live.publicOrder : null;
  const liveFactionColor = (live && live.factionColor) || mil.colorHex;
  const liveFactionName = isEn
    ? ((live && (live.factionNameEn || live.factionNameVi)) || rulerName)
    : ((live && live.factionNameVi) || rulerName);
  const liveGovernor = (live && live.governorName) || governorName;
  const liveGovernorLabel = (isEn && liveGovernor === 'Chưa bổ nhiệm') ? 'Unassigned' : liveGovernor;

  const staticTroopTotal = (mil.infantry || 0) + (mil.cavalry || 0) + (mil.archers || 0) || 1;
  const displayedGarrison = liveGarrison != null ? liveGarrison : (mil.garrison || staticTroopTotal);
  const troopScale = displayedGarrison / staticTroopTotal;
  const displayedInfantry = Math.round((mil.infantry || 0) * troopScale);
  const displayedCavalry = Math.round((mil.cavalry || 0) * troopScale);
  const displayedArchers = Math.round((mil.archers || 0) * troopScale);
  const displayedDefense = liveDefense != null ? liveDefense : mil.defense;
  const displayedGrain = liveGrain != null ? liveGrain : eco.grainReserves;
  const displayedCash = liveCash != null ? liveCash : eco.treasury;
  const hasFieldArmy = !!(window.MapLiveService && MapLiveService.hasArmy && MapLiveService.hasArmy());
  const playerFactionId = (window.MapLiveService && MapLiveService.getState && MapLiveService.getState().playerFaction)
    ? MapLiveService.getState().playerFaction.factionId
    : null;
  const isOwnSettlement = !!(live && live.rulerFactionId && playerFactionId && live.rulerFactionId === playerFactionId);
  const canReinforce = isOwnSettlement;
  const canSiege = hasFieldArmy && !isOwnSettlement && nodeId !== 'zhuo_xian';
  const hasLiveStats = !!(live && (
    Number.isFinite(live.garrisonTroops) ||
    Number.isFinite(live.granaryGrain) ||
    Number.isFinite(live.publicOrder)
  ));
  const liveState = (window.MapLiveService && typeof MapLiveService.getState === 'function')
    ? MapLiveService.getState()
    : null;
  const liveFailed = !!(liveState && liveState.status === 'error');
  const livePartial = !!(liveState && Array.isArray(liveState.errors) && liveState.errors.length > 0);
  const liveChipClass = liveFailed ? 'is-error' : (hasLiveStats ? 'is-live' : 'is-static');
  const liveChipLabel = liveFailed
    ? (isEn ? 'DATA ERROR' : 'LỖI DỮ LIỆU')
    : (hasLiveStats ? 'LIVE' : 'BLUEPRINT');
  const liveUpdatedText = (liveState && liveState.fetchedAt)
    ? new Date(liveState.fetchedAt).toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';
  const liveChipTitle = liveFailed
    ? `${isEn ? 'Failed endpoints' : 'Endpoint lỗi'}: ${liveState.errors.join(', ')}`
    : (hasLiveStats
      ? `${isEn ? 'Live campaign data' : 'Dữ liệu chiến dịch live'}${liveUpdatedText ? ' • ' + liveUpdatedText : ''}${livePartial ? ' • ' + (isEn ? 'partial: ' : 'thiếu: ') + liveState.errors.join(', ') : ''}`
      : (isEn ? 'Blueprint data' : 'Dữ liệu blueprint'));

  const liveStatus = (live && window.MapLiveService && typeof MapLiveService.getStatusForMapNode === 'function')
    ? MapLiveService.getStatusForMapNode(nodeId)
    : null;
  const liveThreat = (live && window.MapLiveService && typeof MapLiveService.getThreatForMapNode === 'function')
    ? MapLiveService.getThreatForMapNode(nodeId)
    : null;
  const resolvedBadgeClass = liveStatus ? liveStatus.className : badgeClass;
  const resolvedBadgeText = liveStatus ? (isEn ? liveStatus.labelEn : liveStatus.labelVi) : badgeText;
  const resolvedThreatText = liveThreat ? (isEn ? liveThreat.labelEn : liveThreat.labelVi) : threatText;
  const resolvedThreatColor = liveThreat ? liveThreat.color : threatColor;
  const threatReasons = liveThreat
    ? (isEn ? liveThreat.reasonsEn : liveThreat.reasonsVi).join(', ')
    : '';

  const mapRoutes = window.WORLD_MAP_ROUTES || [];
  const isRouteActive = (route) => !!selectedMapRoute && (
    (selectedMapRoute.from === route.from && selectedMapRoute.to === route.to) ||
    (selectedMapRoute.from === route.to && selectedMapRoute.to === route.from)
  );

  const routeDestinationName = (route, fromNodeId) => {
    const otherId = route.from === fromNodeId ? route.to : route.from;
    const other = WORLD_MAP_NODES[otherId];
    return other ? getShortNodeName(other, isEn) : otherId;
  };

  const connectedRoutes = mapRoutes
    .filter(route => route.from === nodeId || route.to === nodeId)
    .map(mergeLiveRoute);
  const connectedRoutesHtml = connectedRoutes.map(route => {
    const risk = MAP_RISK_META[route.ambushRisk] || MAP_RISK_META.MODERATE;
    const otherId = route.from === nodeId ? route.to : route.from;
    const otherSeal = typeof getSettlementSeal === 'function' ? getSettlementSeal(otherId) : '';
    return `
      <button class="intel-route-row ${isRouteActive(route) ? 'is-active' : ''}" onclick="selectWorldMapRoute('${route.from}', '${route.to}')">
        <span class="intel-route-dest"><span class="intel-route-seal">${otherSeal}</span>${routeDestinationName(route, nodeId)}</span>
        <span class="intel-route-meta">${route.distanceLi} ${isEn ? 'li' : 'dặm'} · ${route.marchDays} ${isEn ? 'd' : 'ngày'} · ${route.grainCost} ${isEn ? 'piculs' : 'thạch'}</span>
        <span class="intel-route-risk" data-risk="${route.ambushRisk || 'MODERATE'}">${isEn ? risk.labelEn : risk.labelVi}</span>
      </button>
    `;
  }).join('');

  const activeRoute = connectedRoutes.find(isRouteActive) || mapRoutes.map(mergeLiveRoute).find(isRouteActive);
  const activeRouteRisk = activeRoute ? (MAP_RISK_META[activeRoute.ambushRisk] || MAP_RISK_META.MODERATE) : null;
  const shortNameById = (id) => {
    const target = WORLD_MAP_NODES[id];
    return target ? getShortNodeName(target, isEn) : id;
  };
  const sealById = (id) => (typeof getSettlementSeal === 'function' ? getSettlementSeal(id) : '');
  const activeRouteCard = activeRoute ? `
    <div class="intel-route-card">
      <div class="intel-route-card-head">
        <span class="intel-route-card-title">${isEn ? 'Selected route' : 'Tuyến đang chọn'}</span>
        <span class="intel-route-risk" data-risk="${activeRoute.ambushRisk || 'MODERATE'}">${isEn ? activeRouteRisk.labelEn : activeRouteRisk.labelVi}</span>
      </div>
      <div class="intel-route-card-path">
        <span class="intel-route-seal">${sealById(activeRoute.from)}</span>${shortNameById(activeRoute.from)}
        <span class="intel-route-arrow">→</span>
        <span class="intel-route-seal">${sealById(activeRoute.to)}</span>${shortNameById(activeRoute.to)}
      </div>
      <div class="intel-route-card-desc">${isEn ? (activeRoute.descEn || activeRoute.descVi || '') : (activeRoute.descVi || '')}</div>
      <div class="intel-route-card-stats">
        <span>${activeRoute.distanceLi} ${isEn ? 'li' : 'dặm'}</span>
        <span>${activeRoute.marchDays} ${isEn ? 'days' : 'ngày'}</span>
        <span>${activeRoute.grainCost} ${isEn ? 'piculs' : 'thạch'}</span>
      </div>
      <div class="intel-route-card-actions">
        <button class="intel-route-action" onclick="executeMarchToSelectedNode('${nodeId}')">${isEn ? 'March here' : 'Hành quân tới đây'}</button>
        <button class="intel-route-action intel-route-action--alt" onclick="openCaravanWithDestination('${nodeId}')">${isEn ? 'Trade caravan' : 'Lập thương đoàn'}</button>
      </div>
    </div>
  ` : '';

  const liveSpecialists = (window.MapLiveService && typeof MapLiveService.getSpecialistsForMapNode === 'function')
    ? MapLiveService.getSpecialistsForMapNode(nodeId)
    : null;

  const specialistEntries = liveSpecialists !== null
    ? liveSpecialists.map(specialist => ({
        npcId: String(specialist.npcId || ''),
        nameVi: String(specialist.nameVi || ''),
        nameEn: String(specialist.nameEn || specialist.nameVi || ''),
        role: String(specialist.baselinePositionVi || ''),
        isHired: Boolean(specialist.isHired)
      }))
    : (node.hireableNpcs || []).map(entry => {
        const nameVi = entry.split('(')[0].trim();
        const role = entry.includes('(')
          ? entry.substring(entry.indexOf('(') + 1, entry.lastIndexOf(')'))
          : '';
        const npcRecord = (window.MapLiveService && typeof MapLiveService.findNpcByName === 'function')
          ? MapLiveService.findNpcByName(nameVi)
          : null;
        return {
          npcId: npcRecord ? String(npcRecord.npc_id || npcRecord.npcId || '') : '',
          nameVi,
          nameEn: nameVi,
          role,
          isHired: false
        };
      });

  const specialistCount = specialistEntries.length;

  const hireableList = specialistEntries.length > 0
    ? specialistEntries.map(entry => {
        const rawName = entry.nameVi;
        const displayName = isEn ? entry.nameEn : entry.nameVi;
        const roleText = entry.role.replace(/\s*\(Thuê mướn\)\s*$/i, '').trim();
        const roleLabel = isEn && typeof getRoleLabel === 'function' ? getRoleLabel(roleText) : roleText;
        const roleDesc = roleText ? `(${roleLabel})` : '';
        const escapedRaw = rawName.replace(/'/g, "\\'");
        const inspectTitle = isEn ? 'Open dossier & stats' : 'Xem hồ sơ & chỉ số';
        const nameHtml = entry.npcId
          ? `<button class="intel-npc-name is-clickable" type="button" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${entry.npcId.replace(/'/g, "\\'")}')" title="${inspectTitle}">${uiIcon('person')} ${displayName}</button>`
          : `<span class="intel-npc-name">${uiIcon('person')} ${displayName}</span>`;
        const recruitReq = (window.MapLiveService && typeof MapLiveService.getRecruitRequirement === 'function')
          ? MapLiveService.getRecruitRequirement(rawName)
          : null;
        const isHired = entry.isHired || !!(recruitReq && recruitReq.isHired);
        const recruitDisabled = !!(recruitReq && !recruitReq.canRecruit);
        const recruitReason = recruitReq ? (isEn ? recruitReq.reasonEn : recruitReq.reasonVi) : '';
        const recruitTitle = recruitDisabled
          ? recruitReason
          : (isEn ? 'Recruit into enterprise' : 'Chiêu mộ nhân sĩ gia nhập sản nghiệp');
        const actionHtml = isHired
          ? `<span class="intel-npc-status">${isEn ? 'In service' : 'Đang phục vụ'}</span>`
          : `<button class="btn-intel-recruit" ${recruitDisabled ? 'disabled' : ''} onclick="hireSpecialistPrompt('${escapedRaw}', '${nodeId}')" title="${recruitTitle}">
              ${isEn ? 'Recruit' : 'Chiêu Mộ'}
            </button>`;
        return `
          <div class="intel-npc-pill">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
              ${nameHtml}
              <span style="font-size: 8.5px; opacity: 0.8; color: var(--text-muted);">${roleDesc}</span>
            </div>
            ${actionHtml}
          </div>
        `;
      }).join('')
    : `<div class="intel-npc-empty">${isEn ? 'No resident specialists in this settlement.' : 'Không có nhân tài đang lưu trú tại thành này.'}</div>`;

  const liveOrderHtml = liveOrder != null ? `
    <div class="intel-stat-line">
      <span>${isEn ? 'Public order' : 'Trật tự công cộng'}</span>
      <span>${liveOrder} / 100</span>
    </div>
  ` : '';

  const militaryButtons = [
    canReinforce ? `
      <button class="btn-intel-tactical btn-intel-reinforce" onclick="promptReinforceGarrison('${nodeId}')" title="${isEn ? 'Reinforce garrison troops' : 'Điều động ngân lượng chiêu mộ binh sĩ đồn trú'}">
        <span>${uiIcon('shield')}</span> <span>${isEn ? 'Reinforce' : 'Điều Binh Đồn Trú'}</span>
      </button>
    ` : '',
    canSiege ? `
      <button class="btn-intel-tactical btn-intel-assault" onclick="promptSiegeAssault('${nodeId}')" title="${isEn ? 'Assault settlement citadel' : 'Đốc thúc ba quân công phá thành trì'}">
        <span>${uiIcon('flame')}</span> <span>${isEn ? 'Siege Assault' : 'Công Thành'}</span>
      </button>
    ` : ''
  ].join('');

  const militaryActionsHtml = militaryButtons
    ? `
      <div class="intel-action-row">${militaryButtons}</div>
      ${hasFieldArmy ? '' : `<div class="intel-capability-hint">${isEn ? 'No field army yet. Recruit troops with Reinforce before assaulting a citadel.' : 'Chưa có quân dã chiến. Dùng Điều Binh để chiêu mộ trước khi công thành.'}</div>`}
    `
    : `
      <div class="intel-capability-hint">${isEn ? 'No field army yet. Raise or mass troops before issuing military orders.' : 'Chưa có quân đội dã chiến. Cần chiêu mộ hoặc tập hợp binh mã trước khi ra lệnh quân sự.'}</div>
    `;

  const caravanReq = (window.MapLiveService && typeof MapLiveService.getActionRequirements === 'function')
    ? MapLiveService.getActionRequirements()
    : null;
  const caravanDisabled = !!(caravanReq && !caravanReq.canDispatchCaravan);
  const caravanTitle = caravanDisabled
    ? (isEn ? caravanReq.reasonEn : caravanReq.reasonVi)
    : (isEn ? 'Dispatch a trade caravan' : 'Lập thương đoàn vận chuyển hàng hóa');

  panel.innerHTML = `
    <div class="intel-target-header">
      <div>
        <div class="intel-target-name" title="${title} • ${prov}"><span class="intel-target-seal">${seal}</span>${title}</div>
        <div class="intel-target-meta">
          <span class="intel-target-province">${prov}</span>
          <button class="intel-live-chip ${liveChipClass}" type="button" onclick="refreshWorldMapLive()" title="${liveChipTitle}">${liveChipLabel}</button>
        </div>
        <span class="intel-faction-badge" style="background: ${liveFactionColor}22; border: 1px solid ${liveFactionColor}66; color: ${liveFactionColor};">
          ${uiIcon('flag')} ${liveFactionName} • ${isEn ? 'Governor' : 'Trấn thủ'}: ${liveGovernorLabel}
        </span>
      </div>
      <span class="intel-status-badge ${resolvedBadgeClass}">${resolvedBadgeText}</span>
    </div>

    <!-- Key Movement Metrics -->
    <div class="intel-metrics-grid">
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblDist}</div>
        <div class="intel-metric-val">${distText}</div>
      </div>
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblDuration}</div>
        <div class="intel-metric-val">${daysText}</div>
      </div>
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblGrainCost}</div>
        <div class="intel-metric-val">${grainText}</div>
      </div>
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblThreat}</div>
        <div class="intel-metric-val" style="font-size: 10px; color: ${resolvedThreatColor};" title="${threatReasons}">${resolvedThreatText}</div>
      </div>
    </div>

    ${activeRouteCard}

    <!-- Primary actions: personal travel and trade remain available at every stage. -->
    <div class="intel-action-row intel-action-row--primary">
      ${isCurrent ? `
        <button class="btn-march" disabled><span>${dict.btnCurrentPos}</span></button>
      ` : `
        <button class="btn-march" onclick="executeMarchToSelectedNode('${nodeId}')"><span>${isEn ? 'March here' : 'Hành quân tới đây'}</span></button>
      `}
      <button class="intel-secondary-action" ${caravanDisabled ? 'disabled' : ''} onclick="openCaravanWithDestination('${nodeId}')" title="${caravanTitle}">${uiIcon('cart')} ${isEn ? 'Trade caravan' : 'Lập thương đoàn'}</button>
    </div>

    <!-- Connected Routes -->
    <div class="intel-subcard intel-routes-card">
      <div class="intel-subcard-title">
        <span>${uiIcon('route')} ${isEn ? 'Connected Routes' : 'Tuyến Kết Nối'}</span>
        <span class="intel-routes-count">${connectedRoutes.length}</span>
      </div>
      <div class="intel-routes-list">
        ${connectedRoutesHtml || `<div class="intel-routes-empty">${isEn ? 'No mapped route' : 'Chưa có tuyến nối'}</div>`}
      </div>
    </div>

    <!-- Military: collapsed by default; commands only when a field army exists. -->
    <details class="intel-accordion">
      <summary>
        <span>${uiIcon('sword')} ${isEn ? 'Military' : 'Quân sự'}</span>
        <span class="intel-accordion-meta">${displayedGarrison.toLocaleString()} ${isEn ? 'troops' : 'quân'} · ${uiIcon('shield')} ${displayedDefense}</span>
      </summary>
      <div class="intel-accordion-body">
        <div class="intel-breakdown-row">
          <div class="intel-unit-chip">
            <span class="intel-unit-lbl">${isEn ? 'Infantry' : 'Bộ Binh'}</span>
            <span class="intel-unit-val">${displayedInfantry.toLocaleString()}</span>
          </div>
          <div class="intel-unit-chip">
            <span class="intel-unit-lbl">${isEn ? 'Cavalry' : 'Kỵ Binh'}</span>
            <span class="intel-unit-val">${displayedCavalry.toLocaleString()}</span>
          </div>
          <div class="intel-unit-chip">
            <span class="intel-unit-lbl">${isEn ? 'Archers' : 'Cung Thủ'}</span>
            <span class="intel-unit-val">${displayedArchers.toLocaleString()}</span>
          </div>
        </div>
        <div class="intel-stat-line">
          <span>${isEn ? 'Estimated breakdown' : 'Phân bổ ước tính'}</span>
          <span>${isEn ? 'Wall defense' : 'Độ kiên cố'}: ${uiIcon('shield')} ${displayedDefense} / 100</span>
        </div>
        ${liveOrderHtml}
        ${militaryActionsHtml}
      </div>
    </details>

    <!-- Economy: collapsed; live granary/treasury in the summary. -->
    <details class="intel-accordion">
      <summary>
        <span>${uiIcon('grain')} ${isEn ? 'Economy' : 'Kinh tế'}</span>
        <span class="intel-accordion-meta">${displayedGrain.toLocaleString()} ${isEn ? 'piculs' : 'thạch'} · ${displayedCash.toLocaleString()} ${isEn ? 'cash' : 'tiền'}</span>
      </summary>
      <div class="intel-accordion-body">
        <div class="intel-trade-box">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">${isEn ? 'Granary Reserves' : 'Kho Lương Thảo'}:</span>
            <span style="font-family: var(--font-mono); font-weight: 700; color: #fbbf24;">${uiIcon('grain')} ${displayedGrain.toLocaleString()} ${isEn ? 'piculs' : 'Thạch'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">${isEn ? 'Treasury' : 'Ngân Khố'}:</span>
            <span style="font-family: var(--font-mono); font-weight: 700; color: #fbbf24;">${displayedCash.toLocaleString()} ${isEn ? 'quan' : 'Quan'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">${isEn ? 'Key Commodity' : 'Sản Vật Chủ Lực'}:</span>
            <span style="font-weight: 600; color: #f1f5f9;">${ecoPrimary}</span>
          </div>
          <div class="intel-trade-item">
            <span class="intel-trade-tag export">${isEn ? 'EXPORT' : 'XUẤT'}</span>
            <span>${ecoExport}</span>
          </div>
          <div class="intel-trade-item">
            <span class="intel-trade-tag import">${isEn ? 'IMPORT' : 'NHẬP'}</span>
            <span>${ecoImport}</span>
          </div>
        </div>
      </div>
    </details>

    <!-- Workforce: collapsed; recruit only when expanded. -->
    <details class="intel-accordion">
      <summary>
        <span>${uiIcon('users')} ${isEn ? 'Workforce' : 'Nhân lực'}</span>
        <span class="intel-accordion-meta">${specialistCount} ${isEn ? 'specialists' : 'nhân tài'}</span>
      </summary>
      <div class="intel-accordion-body">
        <div class="intel-npc-list">
          ${hireableList}
        </div>
      </div>
    </details>

    <!-- Lore: collapsed; the map stays a command surface, not a dossier. -->
    <details class="intel-accordion">
      <summary>
        <span>${uiIcon('scroll')} ${isEn ? 'Lore & figures' : 'Sử liệu & nhân vật'}</span>
      </summary>
      <div class="intel-accordion-body">
        <div class="intel-section">
          <div class="intel-sec-title">${dict.lblIntel}</div>
          <div class="intel-sec-body">${intel}</div>
        </div>
        <div class="intel-section">
          <div class="intel-sec-title">${dict.lblFigures}</div>
          <div class="intel-sec-body">${figures}</div>
        </div>
      </div>
    </details>
  `;
}

async function executeMarchToSelectedNode(nodeId) {
  if (isProcessingAction) {
    showToast(currentLang === 'en' ? 'Action in progress, please wait!' : 'Thao tác đang thực thi, vui lòng chờ!', true);
    return;
  }

  const targetNode = WORLD_MAP_NODES[nodeId];
  if (!targetNode) return;

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  if (currentRegion.id === nodeId) {
    showToast(currentLang === 'en' ? 'Already in this region.' : 'Đang ở khu vực này rồi.');
    return;
  }

  // Route to the interactive Travel Transit & Road Encounter Journey Interface
  if (typeof openTravelTransit === 'function') {
    openTravelTransit(nodeId);
    return;
  }

  try {
    setProcessingLock(true, isEn ? 'Marching...' : 'Đang hành quân...');

    // Append campaign expedition chronicle turn
    const marchNarrativeVi = `Lương Diễn chỉnh đốn yên cương, dẫn đầu đoàn tùy tùng mang theo ${targetNode.grainCost} thạch quân lương, vượt dặm trường bão cát rời bước tiến về tiền tuyến **${targetNode.nameVi}**. Sau ${targetNode.daysRequired} ngày hành quân đêm ngày, cờ xí phe ta đã phất phới bên ngoài thành lũy!`;
    const marchNarrativeEn = `Liang Yan straps his sword and leads his supply expedition carrying ${targetNode.grainCost} piculs of grain across windblown roads toward **${targetNode.nameEn}**. After ${targetNode.daysRequired} days of disciplined marching, banners flutter before the citadel gates!`;

    appendStoryTurn({
      type: 'player',
      speaker: isEn ? 'Liang Yan (March Expedition)' : 'Lương Diễn (Hành Quân)',
      title: isEn ? 'Campaign Expedition' : 'Chiến Tuyến Viễn Chinh',
      avatar: 'Diễn',
      text: isEn ? marchNarrativeEn : marchNarrativeVi,
      deltas: {
        location: targetNode.defaultSubLoc,
        grainCost: `-${targetNode.grainCost} Thạch`,
        marchDistance: `${targetNode.distanceFromZhuo} Dặm`,
        threat: targetNode.threatVi
      }
    });

    // Execute MOVE_LOCATION in SimCore
    await dispatchDirectAction({
      type: 'MOVE_LOCATION',
      new_location: targetNode.defaultSubLoc
    });

    activeSubLocation = targetNode.defaultSubLoc;
    localStorage.setItem('sim_active_subloc', activeSubLocation);
    await loadScene(targetNode.defaultSubLoc);
    renderLocalPoiNav(targetNode.defaultSubLoc);

    renderAgentSimulationFeedback(
      isEn ? `Expedition arrived at ${targetNode.nameEn}. Battlefield coordinates updated.` : `Quân đoàn đã tới ${targetNode.nameVi}. Tọa độ chiến trường cập nhật thành công.`,
      { location: targetNode.defaultSubLoc, audit: '70/70 Khớp' }
    );

    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);
    showToast(isEn ? `Arrived at ${targetNode.nameEn}` : `Đã đến ${targetNode.nameVi}!`);

  } catch (err) {
    console.error('March failed:', err);
    showToast(`Hành quân thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, null);
  }
}

/**
 * Strategic Action: Open Caravan Modal with Target Preselected
 */
function openCaravanWithDestination(nodeId) {
  if (typeof CaravanUI !== 'undefined') {
    CaravanUI.open('dispatch');
    setTimeout(() => {
      const sel = document.getElementById('dispatch-to');
      if (sel) {
        sel.value = nodeId;
      }
      if (typeof CaravanUI.onDispatchTargetChange === 'function') {
        CaravanUI.onDispatchTargetChange(nodeId);
      }
    }, 120);
    const targetNode = WORLD_MAP_NODES[nodeId];
    const nodeName = targetNode ? (currentLang === 'en' ? targetNode.nameEn : targetNode.nameVi) : nodeId;
    if (typeof showToast === 'function') {
      showToast(currentLang === 'en' ? `Caravan route planned toward ${nodeName}` : `Đã định hướng lộ trình thương đoàn tới ${nodeName}`);
    }
  } else {
    alert(currentLang === 'en' ? 'Caravan logistics interface unavailable.' : 'Hệ thống thương đoàn vận tải chưa sẵn sàng.');
  }
}

/**
 * Strategic Action: Reinforce Garrison Deployment
 */
async function promptReinforceGarrison(settlementId) {
  const targetNode = WORLD_MAP_NODES[settlementId];
  if (!targetNode) return;
  const isEn = (currentLang === 'en');
  const settlementName = isEn ? targetNode.nameEn : targetNode.nameVi;

  const input = prompt(
    isEn
      ? `Reinforce ${settlementName} garrison.\nEnter number of troops to recruit & station (Cost: 8 quan/troop):`
      : `Điều binh đồn trú tại ${settlementName}.\nNhập số lượng binh sĩ chiêu mộ và điều phối (Chi phí: 8 quan / binh sĩ):`,
    '100'
  );
  if (!input) return;

  const count = parseInt(input.trim(), 10);
  if (isNaN(count) || count <= 0) {
    if (typeof showToast === 'function') {
      showToast(isEn ? 'Please enter a valid positive number of troops.' : 'Vui lòng nhập số lượng binh sĩ hợp lệ.', true);
    }
    return;
  }

  const cost = count * 8;
  const confirmMsg = isEn
    ? `Station ${count} troops at ${settlementName} for ${cost} quan?\nConfirm deployment?`
    : `Điều phối ${count} binh sĩ đồn trú tại ${settlementName} với ngân sách ${cost} Quan?\nXác nhận điều quân?`;
  if (!confirm(confirmMsg)) return;

  try {
    if (typeof setProcessingLock === 'function') setProcessingLock(true, isEn ? 'Deploying garrison...' : 'Đang điều binh đồn trú...');

    const res = await fetch('/api/garrisons/reinforce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementId, troopsDelta: count, costPerTroop: 8 })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to reinforce garrison');
    }

    if (targetNode.military) {
      targetNode.military.garrison = data.newTroops;
      targetNode.military.defense = data.newDefense;
    }

    const narrativeVi = `Lương Diễn xuất ngân lượng **${data.costPaid} quan**, chiêu mộ và phối thuộc **${count} binh sĩ** tinh nhuệ tăng cường phòng tuyến tại **${targetNode.nameVi}**. Tổng quân số đồn trú hiện đạt **${data.newTroops} binh sĩ**, chỉ số phòng thủ vững vàng đạt **${data.newDefense}/100**!`;
    const narrativeEn = `Liang Yan disburses **${data.costPaid} quan** to recruit and deploy **${count} veteran soldiers** bolstering defenses at **${targetNode.nameEn}**. Garrison strength now reaches **${data.newTroops} troops**, fortification resilience rated at **${data.newDefense}/100**!`;

    if (typeof appendStoryTurn === 'function') {
      appendStoryTurn({
        type: 'player',
        speaker: isEn ? 'Liang Yan (Garrison Command)' : 'Lương Diễn (Điều Binh)',
        title: isEn ? 'Garrison Deployment' : 'Tăng Cường Đồn Trú',
        avatar: 'Diễn',
        text: isEn ? narrativeEn : narrativeVi,
        deltas: {
          settlement: targetNode.nameVi,
          garrison: `+${count} Binh Sĩ`,
          cost: `-${data.costPaid} Quan`,
          defense: `${data.newDefense}/100`
        }
      });
    }

    if (typeof showToast === 'function') {
      showToast(isEn ? `Stationed ${count} troops at ${settlementName}!` : `Đã điều phối ${count} binh sĩ đồn trú tại ${settlementName}!`);
    }

    if (typeof renderWorldMapIntel === 'function') renderWorldMapIntel(settlementId);
    if (typeof renderWorldMapSvg === 'function') renderWorldMapSvg();
    if (typeof loadStatus === 'function') loadStatus();
    if (typeof loadDeckLedger === 'function') loadDeckLedger();

  } catch (err) {
    console.error('Reinforce garrison failed:', err);
    if (typeof showToast === 'function') showToast(`Lỗi điều binh: ${err.message}`, true);
    else alert(`Lỗi điều binh: ${err.message}`);
  } finally {
    if (typeof setProcessingLock === 'function') setProcessingLock(false, null);
  }
}

/**
 * Strategic Action: Launch Citadel Siege Assault
 */
async function promptSiegeAssault(settlementId) {
  const targetNode = WORLD_MAP_NODES[settlementId];
  if (!targetNode) return;
  const isEn = (currentLang === 'en');
  const settlementName = isEn ? targetNode.nameEn : targetNode.nameVi;

  const input = prompt(
    isEn
      ? `Launch siege assault against ${settlementName}!\nEnter attacking vanguard army size (Recommended: 100 - 500 troops):`
      : `Phát động công thành đoạt ải tại ${settlementName}!\nNhập quy mô tiền quân xuất chinh (Khuyến nghị: 100 - 500 binh sĩ):`,
    '250'
  );
  if (!input) return;

  const attackerTroops = parseInt(input.trim(), 10);
  if (isNaN(attackerTroops) || attackerTroops <= 0) {
    if (typeof showToast === 'function') {
      showToast(isEn ? 'Please enter a valid troop count.' : 'Vui lòng nhập quy mô binh sĩ hợp lệ.', true);
    }
    return;
  }

  const confirmMsg = isEn
    ? `Launch assault on ${settlementName} with ${attackerTroops} troops?\nThis will initiate direct battlefield combat!`
    : `Quyết định đốc thúc ${attackerTroops} quân xuất kích công phạt ${settlementName}?\nHành động này sẽ kích hoạt giao tranh thực tế!`;
  if (!confirm(confirmMsg)) return;

  try {
    if (typeof setProcessingLock === 'function') setProcessingLock(true, isEn ? 'Assaulting citadel...' : 'Đang công phạt thành lũy...');

    const res = await fetch('/api/military/assault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSettlementId: settlementId, attackerTroops, commanderId: 'PLY-0001' })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Assault failed');
    }

    if (targetNode.military) {
      targetNode.military.garrison = data.remainingGarrison ?? targetNode.military.garrison;
      targetNode.military.defense = data.newDefense ?? targetNode.military.defense;
    }

    if (data.isVictory) {
      const victoryVi = `Lương Diễn đích thân đốc thúc **${attackerTroops} dũng sĩ cảm tử** công phạt đại thắng **${targetNode.nameVi}**! Tường thành bị công phá sụp đổ một góc (Phòng thủ còn ${data.newDefense}/100), diệt địch ${data.defenderCasualties} tên (Tổn thất phe ta: ${data.attackerCasualties} người). Thu giữ **${data.lootQian} Quan** chiến lợi phẩm từ ngân khố!`;
      const victoryEn = `Liang Yan leads **${attackerTroops} vanguard assault troops** to a decisive victory at **${targetNode.nameEn}**! Citadel walls breach (Defense reduced to ${data.newDefense}/100), inflicting ${data.defenderCasualties} defender casualties (Friendly losses: ${data.attackerCasualties}). Captured **${data.lootQian} quan** in war spoils from the treasury!`;

      if (typeof appendStoryTurn === 'function') {
        appendStoryTurn({
          type: 'player',
          speaker: isEn ? 'Liang Yan (Siege Assault)' : 'Lương Diễn (Công Thành)',
          title: isEn ? 'Citadel Victory' : 'Công Thành Đại Thắng',
          avatar: 'Diễn',
          text: isEn ? victoryEn : victoryVi,
          deltas: {
            target: targetNode.nameVi,
            spoils: `+${data.lootQian} Quan`,
            enemyLoss: `-${data.defenderCasualties} Địch`,
            friendlyLoss: `-${data.attackerCasualties} Binh Sĩ`,
            defense: `${data.newDefense}/100`
          }
        });
      }

      if (typeof showToast === 'function') {
        showToast(isEn ? `Victory at ${settlementName}! Captured ${data.lootQian} quan!` : `Đại thắng tại ${settlementName}! Thu giữ ${data.lootQian} Quan chiến lợi phẩm!`);
      }
    } else {
      const defeatVi = `Ba quân tiến công ${targetNode.nameVi} vấp phải mưa tên trận địa phòng ngự kiên cố. Quân ta thương vong **${data.attackerCasualties} binh sĩ** (Địch tổn thất ${data.defenderCasualties} người). Lương Diễn hạ lệnh thu quân lui về chấn chỉnh binh mã!`;
      const defeatEn = `The assault against ${targetNode.nameEn} faltered against heavy crossbow fire from the battlements. Suffered **${data.attackerCasualties} casualties** (Inflicted ${data.defenderCasualties} enemy losses). Liang Yan orders orderly withdrawal to reorganize!`;

      if (typeof appendStoryTurn === 'function') {
        appendStoryTurn({
          type: 'system',
          speaker: isEn ? 'Battlefield Chronicle' : 'Chiến Trường Ký Sự',
          title: isEn ? 'Siege Repelled' : 'Công Thành Bất Lợi',
          avatar: 'Chiến',
          text: isEn ? defeatEn : defeatVi,
          deltas: {
            target: targetNode.nameVi,
            friendlyLoss: `-${data.attackerCasualties} Binh Sĩ`,
            enemyLoss: `-${data.defenderCasualties} Địch`
          }
        });
      }

      if (typeof showToast === 'function') {
        showToast(isEn ? `Assault repelled at ${settlementName}.` : `Công kích bất lợi tại ${settlementName}, quân ta đã rút lui.`, true);
      }
    }

    if (typeof renderWorldMapIntel === 'function') renderWorldMapIntel(settlementId);
    if (typeof renderWorldMapSvg === 'function') renderWorldMapSvg();
    if (typeof loadStatus === 'function') loadStatus();
    if (typeof loadDeckLedger === 'function') loadDeckLedger();

  } catch (err) {
    console.error('Assault failed:', err);
    if (typeof showToast === 'function') showToast(`Lỗi công thành: ${err.message}`, true);
    else alert(`Lỗi công thành: ${err.message}`);
  } finally {
    if (typeof setProcessingLock === 'function') setProcessingLock(false, null);
  }
}

/**
 * Strategic Action: Recruit Auxiliary Specialist
 */
async function hireSpecialistPrompt(candidateName, nodeId) {
  const isEn = (currentLang === 'en');
  const confirmMsg = isEn
    ? `Sign employment contract with [${candidateName}]?\nSigning Bonus (Bond): 250 quan\nAssigned to: Liang Clan Enterprise (+15% to +25% Efficiency boost)\nConfirm recruitment?`
    : `Ký kết khế ước chiêu mộ nhân sĩ [${candidateName}]?\nTiền thưởng ký kết (Ký quỹ): 250 Quan\nPhân bổ vào: Sản nghiệp Lương Gia (+15% đến +25% Hiệu suất vận hành)\nXác nhận chiêu mộ?`;

  if (!confirm(confirmMsg)) return;

  try {
    if (typeof setProcessingLock === 'function') setProcessingLock(true, isEn ? 'Signing contract...' : 'Đang ký kết khế ước chiêu mộ...');

    const res = await fetch('/api/workforce/hire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateName, signingBonus: 250, characterId: 'PLY-0001' })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Recruitment failed');
    }

    if (typeof window.apiSpendActionTime === 'function') {
      try {
        await window.apiSpendActionTime('WORKFORCE_HIRE', null, `Chiêu mộ ${candidateName}`);
      } catch (timeErr) {
        if (typeof showToast === 'function') showToast(timeErr.message, true);
      }
    }

    const narrativeVi = `Lương Diễn đích thân yết kiến, trao tặng **${data.signingBonusPaid} quan** chiêu mộ **${data.nameVi}** gia nhập sản nghiệp **${data.businessName}**. Đảm nhận cương vị **${data.assignedRole}**, thúc đẩy hiệu suất sản xuất và quản trị tăng vọt lên **${(data.newEfficiencyMultiplier * 100).toFixed(0)}%**!`;
    const narrativeEn = `Liang Yan personally extends invitations and grants **${data.signingBonusPaid} quan** signing bonus to recruit **${data.nameVi}** into **${data.businessName}**. Serving as **${data.assignedRole}**, boosting enterprise operational efficiency to **${(data.newEfficiencyMultiplier * 100).toFixed(0)}%**!`;

    if (typeof appendStoryTurn === 'function') {
      appendStoryTurn({
        type: 'player',
        speaker: isEn ? 'Liang Yan (Workforce Recruitment)' : 'Lương Diễn (Chiêu Mộ Nhân Tài)',
        title: isEn ? 'Retainer Contract Signed' : 'Ký Kết Khế Ước Gia Thần',
        avatar: 'Diễn',
        text: isEn ? narrativeEn : narrativeVi,
        deltas: {
          recruit: data.nameVi,
          business: data.businessName,
          role: data.assignedRole,
          bonus: `-${data.signingBonusPaid} Quan`,
          efficiency: `${(data.newEfficiencyMultiplier * 100).toFixed(0)}%`
        }
      });
    }

    if (typeof showToast === 'function') {
      showToast(isEn ? `Recruited ${data.nameVi} into ${data.businessName}!` : `Đã chiêu mộ ${data.nameVi} gia nhập ${data.businessName}!`);
    }

    if (typeof renderWorldMapIntel === 'function') renderWorldMapIntel(nodeId);
    if (typeof loadStatus === 'function') loadStatus();
    if (typeof loadDeckNpcs === 'function') loadDeckNpcs();
    if (typeof loadDeckLedger === 'function') loadDeckLedger();

  } catch (err) {
    console.error('Recruitment failed:', err);
    if (typeof showToast === 'function') showToast(`Lỗi chiêu mộ: ${err.message}`, true);
    else alert(`Lỗi chiêu mộ: ${err.message}`);
  } finally {
    if (typeof setProcessingLock === 'function') setProcessingLock(false, null);
  }
}

// Global exposure for event handlers and modules
window.selectedMapNodeId = selectedMapNodeId;
window.currentMapViewMode = currentMapViewMode;
window.setMapViewMode = setMapViewMode;
window.zoomWorldMap = zoomWorldMap;
window.setWorldMapZoom = setWorldMapZoom;
window.fitWorldMap = fitWorldMap;
window.centerWorldMapOnNode = centerWorldMapOnNode;
window.resetWorldMapZoom = resetWorldMapZoom;
window.applyWorldMapTransform = applyWorldMapTransform;
window.initWorldMapInteractions = initWorldMapInteractions;
window.handleMapMinimapClick = handleMapMinimapClick;
window.selectWorldMapRoute = selectWorldMapRoute;
window.showMapRouteTooltip = showMapRouteTooltip;
window.moveMapRouteTooltip = moveMapRouteTooltip;
window.hideMapRouteTooltip = hideMapRouteTooltip;
window.openWorldMap = openWorldMap;
window.closeWorldMap = closeWorldMap;
window.mountWorldMapLegacyView = mountWorldMapLegacyView;
window.refreshWorldMapView = refreshWorldMapView;
window.refreshWorldMapLive = refreshWorldMapLive;
window.selectWorldMapNode = selectWorldMapNode;
window.toggleMapLayer = toggleMapLayer;
window.toggleResourceFilter = toggleResourceFilter;
window.handleMapTokenClick = handleMapTokenClick;
window.renderWorldMapSvg = renderWorldMapSvg;
window.renderWorldMapIntel = renderWorldMapIntel;
window.executeMarchToSelectedNode = executeMarchToSelectedNode;
window.openCaravanWithDestination = openCaravanWithDestination;
window.promptReinforceGarrison = promptReinforceGarrison;
window.promptSiegeAssault = promptSiegeAssault;
window.hireSpecialistPrompt = hireSpecialistPrompt;

// Keep the live layers fresh after a simulated month.
window.addEventListener('sim:turn-advanced', () => {
  refreshWorldMapLive().catch(() => {});
});
