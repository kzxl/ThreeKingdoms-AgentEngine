/**
 * WORLD MAP & CARTOGRAPHY MODULE
 * Interactive SVG Map, Multi-scale Zoom & Pan, Strategic Intel, and Expedition Marching
 * Supports 3 View Modes: Overview, Military (Garrison & Defense), Economy (Grain & Commodities)
 */

let selectedMapNodeId = 'guang_zong';
let currentMapViewMode = 'overview'; // 'overview' | 'military' | 'economy'
let worldMapZoom = 1.0;
let worldMapPanX = 0;
let worldMapPanY = 0;
let isWorldMapPanning = false;
let mapPanStartX = 0;
let mapPanStartY = 0;
let hasAttachedMapEvents = false;

function setMapViewMode(mode) {
  if (['overview', 'military', 'economy'].includes(mode)) {
    currentMapViewMode = mode;
    renderWorldMapSvg();
    renderWorldMapIntel(selectedMapNodeId);
  }
}

function zoomWorldMap(delta) {
  worldMapZoom = Math.min(3.0, Math.max(0.65, Number((worldMapZoom + delta).toFixed(2))));
  applyWorldMapTransform();
}

function resetWorldMapZoom() {
  worldMapZoom = 1.0;
  worldMapPanX = 0;
  worldMapPanY = 0;
  applyWorldMapTransform();
}

function applyWorldMapTransform() {
  const viewport = document.getElementById('world-map-viewport');
  if (viewport) {
    viewport.setAttribute('transform', `translate(${worldMapPanX}, ${worldMapPanY}) scale(${worldMapZoom})`);
  }
  const badge = document.getElementById('map-zoom-level-badge');
  if (badge) {
    badge.innerText = `${Math.round(worldMapZoom * 100)}%`;
  }
}

function initWorldMapInteractions() {
  const container = document.getElementById('world-map-canvas-container');
  if (!container || hasAttachedMapEvents) return;
  hasAttachedMapEvents = true;

  // Mouse wheel zooming
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    zoomWorldMap(delta);
  }, { passive: false });

  // Mouse drag-to-pan
  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.map-node') || e.target.closest('.map-zoom-toolbar') || e.target.closest('.map-viewmode-toolbar')) return;
    isWorldMapPanning = true;
    mapPanStartX = e.clientX - worldMapPanX;
    mapPanStartY = e.clientY - worldMapPanY;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isWorldMapPanning) return;
    worldMapPanX = e.clientX - mapPanStartX;
    worldMapPanY = e.clientY - mapPanStartY;
    applyWorldMapTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isWorldMapPanning) {
      isWorldMapPanning = false;
      const c = document.getElementById('world-map-canvas-container');
      if (c) c.style.cursor = 'grab';
    }
  });

  // Touch drag and pinch-to-zoom
  let lastTouchX = 0;
  let lastTouchY = 0;
  let lastPinchDist = 0;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      if (e.target.closest('.map-node') || e.target.closest('.map-zoom-toolbar') || e.target.closest('.map-viewmode-toolbar')) return;
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
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      worldMapPanX += dx;
      worldMapPanY += dy;
      applyWorldMapTransform();
    } else if (e.touches.length === 2 && lastPinchDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = (dist - lastPinchDist) * 0.005;
      lastPinchDist = dist;
      zoomWorldMap(diff);
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isWorldMapPanning = false;
    lastPinchDist = 0;
  });
}

function openWorldMap() {
  const modal = document.getElementById('world-map-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  if (currentRegion && currentRegion.id === selectedMapNodeId) {
    if (selectedMapNodeId === 'zhuo_xian') {
      selectedMapNodeId = 'guang_zong';
    }
  }

  renderWorldMapSvg();
  renderWorldMapIntel(selectedMapNodeId);
}

function closeWorldMap() {
  const modal = document.getElementById('world-map-modal');
  if (modal) modal.classList.add('hidden');
}

function selectWorldMapNode(nodeId) {
  if (!WORLD_MAP_NODES[nodeId]) return;
  selectedMapNodeId = nodeId;
  renderWorldMapSvg();
  renderWorldMapIntel(nodeId);
}

function renderWorldMapSvg() {
  const container = document.getElementById('world-map-canvas-container');
  if (!container) return;

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  const isEn = (currentLang === 'en');

  // Inter-citadel connecting routes from map-data or fallback
  const routes = window.WORLD_MAP_ROUTES || [
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
  ];

  let svgRoutes = routes.map(r => {
    const f = WORLD_MAP_NODES[r.from]?.coords;
    const t = WORLD_MAP_NODES[r.to]?.coords;
    if (!f || !t) return '';

    const isConnected = (r.from === selectedMapNodeId || r.to === selectedMapNodeId);
    let strokeColor = 'rgba(245, 158, 11, 0.45)';
    let strokeWidth = '1.8';
    let dashArray = 'none';

    switch (r.terrainType) {
      case 'WATERWAY':
        strokeColor = isConnected ? '#38bdf8' : 'rgba(56, 189, 248, 0.55)';
        strokeWidth = isConnected ? '3.5' : '2.2';
        dashArray = '6,4';
        break;
      case 'MOUNTAIN_PASS':
        strokeColor = isConnected ? '#f87171' : 'rgba(239, 68, 68, 0.55)';
        strokeWidth = isConnected ? '3.2' : '2.0';
        dashArray = '3,3';
        break;
      case 'PLANK_ROAD':
        strokeColor = isConnected ? '#fbbf24' : 'rgba(217, 119, 6, 0.6)';
        strokeWidth = isConnected ? '3.2' : '2.2';
        dashArray = '2,4';
        break;
      case 'HIGHWAY':
      default:
        strokeColor = isConnected ? '#fbbf24' : 'rgba(245, 158, 11, 0.45)';
        strokeWidth = isConnected ? '3.5' : '2.0';
        dashArray = isConnected ? 'none' : '4,2';
        break;
    }

    const activeClass = isConnected ? 'map-route-active' : '';

    return `<line x1="${f.x}" y1="${f.y}" x2="${t.x}" y2="${t.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" class="${activeClass}" />`;
  }).join('');

  const themeMap = {
    'zhuo_xian': { fill: '#064e3b', stroke: '#10b981', icon: '涿' },
    'ji_cheng': { fill: '#0f172a', stroke: '#38bdf8', icon: '薊' },
    'ye_cheng': { fill: '#1e1b4b', stroke: '#818cf8', icon: '鄴' },
    'guang_zong': { fill: '#450a0a', stroke: '#ef4444', icon: '宗' },
    'ping_yuan': { fill: '#0f172a', stroke: '#06b6d4', icon: '平' },
    'luo_yang': { fill: '#451a03', stroke: '#f59e0b', icon: '洛' },
    'chang_an': { fill: '#3b0764', stroke: '#a855f7', icon: '長' },
    'xu_chang': { fill: '#1e293b', stroke: '#3b82f6', icon: '昌' },
    'xia_pi': { fill: '#042f2e', stroke: '#14b8a6', icon: '邳' },
    'xiang_yang': { fill: '#0c4a6e', stroke: '#0284c7', icon: '襄' },
    'jiang_ling': { fill: '#164e63', stroke: '#06b6d4', icon: '陵' },
    'chi_bi': { fill: '#450a0a', stroke: '#f97316', icon: '壁' },
    'jian_ye': { fill: '#14532d', stroke: '#22c55e', icon: '建' },
    'han_zhong': { fill: '#292524', stroke: '#a8a29e', icon: '漢' },
    'cheng_du': { fill: '#064e3b', stroke: '#10b981', icon: '成' },
    'wan_cheng': { fill: '#450a0a', stroke: '#e11d48', icon: '宛' },
    'shou_chun': { fill: '#451a03', stroke: '#f59e0b', icon: '春' },
    'shang_dang': { fill: '#1e293b', stroke: '#94a3b8', icon: '黨' },
    'wu_wei': { fill: '#451a03', stroke: '#d97706', icon: '涼' },
    'xi_liang': { fill: '#451a03', stroke: '#d97706', icon: '涼' },
    'jiao_zhi': { fill: '#064e3b', stroke: '#059669', icon: '交' }
  };

  const renderedNodeKeys = Object.keys(WORLD_MAP_NODES).filter(k => k !== 'wu_wei'); // Avoid rendering duplicate wu_wei/xi_liang node
  let svgNodes = renderedNodeKeys.map(key => {
    const node = WORLD_MAP_NODES[key];
    const isCurrent = (currentRegion.id === key);
    const isSelected = (selectedMapNodeId === key);

    let theme = themeMap[key] || { fill: '#0f172a', stroke: '#3b82f6', icon: '鎮' };
    if (isCurrent) {
      theme = { fill: '#064e3b', stroke: '#10b981', icon: theme.icon };
    }

    const displayName = typeof getShortNodeName === 'function' ? getShortNodeName(node, isEn) : (isEn ? node.nameEn : node.nameVi);
    const displayProvince = isEn ? node.provinceEn : node.provinceVi;

    // Mode-specific overlays
    let modeTopBadge = '';
    let modeBottomSub = `<text x="${node.coords.x}" y="${node.coords.y + 34}" text-anchor="middle" fill="#94a3b8" font-size="8.5">${displayProvince}</text>`;

    if (currentMapViewMode === 'military' && node.military) {
      const garrisonK = (node.military.garrison / 1000).toFixed(1);
      modeTopBadge = `
        <rect x="${node.coords.x - 21}" y="${node.coords.y - 28}" width="42" height="13" rx="3" fill="#0f172a" stroke="${theme.stroke}" stroke-width="1.2" />
        <text x="${node.coords.x}" y="${node.coords.y - 19}" fill="#38bdf8" font-size="7.5" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">⚔️ ${garrisonK}k</text>
      `;
      modeBottomSub = `
        <text x="${node.coords.x}" y="${node.coords.y + 34}" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="'JetBrains Mono', monospace" font-weight="600">🛡️ ${node.military.defense}</text>
      `;
    } else if (currentMapViewMode === 'economy' && node.economy) {
      const grainK = (node.economy.grainReserves / 1000).toFixed(1);
      const shortCommodity = node.economy.primaryCommodityVi.split(' ')[0];
      modeTopBadge = `
        <rect x="${node.coords.x - 21}" y="${node.coords.y - 28}" width="42" height="13" rx="3" fill="#0f172a" stroke="#f59e0b" stroke-width="1.2" />
        <text x="${node.coords.x}" y="${node.coords.y - 19}" fill="#fbbf24" font-size="7.5" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">🌾 ${grainK}k</text>
      `;
      modeBottomSub = `
        <text x="${node.coords.x}" y="${node.coords.y + 34}" text-anchor="middle" fill="#34d399" font-size="7.5" font-weight="600">${shortCommodity}</text>
      `;
    }

    return `
      <g class="map-node ${isSelected ? 'active' : ''}" onclick="selectWorldMapNode('${key}')" style="cursor: pointer;">
        ${isCurrent ? `
          <circle cx="${node.coords.x}" cy="${node.coords.y}" r="22" fill="none" stroke="#10b981" stroke-width="2" opacity="0.8" class="map-pulse-ring" />
          <rect x="${node.coords.x - 34}" y="${node.coords.y - 28}" width="68" height="13" rx="3" fill="#064e3b" stroke="#10b981" stroke-width="1" />
          <text x="${node.coords.x}" y="${node.coords.y - 19}" fill="#34d399" font-size="7.5" font-weight="700" text-anchor="middle">[${isEn ? 'CURRENT' : 'HIỆN TẠI'}]</text>
        ` : modeTopBadge}

        ${isSelected ? `
          <circle cx="${node.coords.x}" cy="${node.coords.y}" r="20" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4,2" />
        ` : ''}

        <circle class="node-bg" cx="${node.coords.x}" cy="${node.coords.y}" r="14" fill="${theme.fill}" stroke="${isSelected ? '#fbbf24' : theme.stroke}" stroke-width="${isSelected ? '2.5' : '1.5'}" />
        <text x="${node.coords.x}" y="${node.coords.y + 4.5}" font-size="10.5" text-anchor="middle">${theme.icon}</text>
        
        <text x="${node.coords.x}" y="${node.coords.y + 24}" text-anchor="middle" fill="${isSelected ? '#fbbf24' : '#f1f5f9'}" font-size="9.5" font-weight="${isSelected ? '700' : '600'}" letter-spacing="0.2px">${displayName}</text>
        ${modeBottomSub}
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Floating Zoom Toolbar (Top Left) -->
    <div class="map-zoom-toolbar">
      <button class="map-zoom-btn" onclick="zoomWorldMap(0.25)" title="${isEn ? 'Zoom In' : 'Phóng to'}">+</button>
      <span class="map-zoom-level" id="map-zoom-level-badge">${Math.round(worldMapZoom * 100)}%</span>
      <button class="map-zoom-btn" onclick="zoomWorldMap(-0.25)" title="${isEn ? 'Zoom Out' : 'Thu nhỏ'}">-</button>
      <button class="map-zoom-btn" onclick="resetWorldMapZoom()" title="${isEn ? 'Reset View' : 'Khôi phục'}">1:1</button>
    </div>

    <!-- View Mode Selector Toolbar (Top Right) -->
    <div class="map-viewmode-toolbar">
      <button class="map-viewmode-btn ${currentMapViewMode === 'overview' ? 'active' : ''}" onclick="setMapViewMode('overview')" title="Toàn cảnh địa dư">
        <span>🔘</span> <span>${isEn ? 'Overview' : 'Toàn Cảnh'}</span>
      </button>
      <button class="map-viewmode-btn ${currentMapViewMode === 'military' ? 'active' : ''}" onclick="setMapViewMode('military')" title="Binh lực & phòng ngự">
        <span>⚔️</span> <span>${isEn ? 'Military' : 'Quân Sự'}</span>
      </button>
      <button class="map-viewmode-btn ${currentMapViewMode === 'economy' ? 'active' : ''}" onclick="setMapViewMode('economy')" title="Lương thảo & sản vật">
        <span>🌾</span> <span>${isEn ? 'Economy' : 'Kinh Tế'}</span>
      </button>
    </div>

    <!-- Navigation Hint (Bottom Left) -->
    <div class="map-nav-hint">${isEn ? 'Scroll to zoom • Drag to pan' : 'Cuộn chuột để zoom • Kéo chuột để di chuyển'}</div>

    <svg viewBox="0 0 600 550" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="tactical-grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1"/>
        </pattern>
      </defs>

      <!-- Background & Grid -->
      <rect width="100%" height="100%" fill="#070a12"/>
      <rect width="100%" height="100%" fill="url(#tactical-grid)"/>

      <!-- Border Frame (Fixed on Canvas) -->
      <rect x="8" y="8" width="584" height="534" fill="none" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1" stroke-dasharray="6,4"/>
      <rect x="12" y="12" width="576" height="526" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.5"/>

      <!-- North Indicator (Fixed on Canvas) -->
      <g transform="translate(565, 34)" opacity="0.65">
        <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
        <polygon points="0,-12 4,0 0,-4 -4,0" fill="#f59e0b"/>
        <text x="0" y="10" fill="#cbd5e1" font-size="7" font-weight="700" text-anchor="middle">BẮC</text>
      </g>

      <!-- Scalable Map Viewport -->
      <g id="world-map-viewport" transform="translate(${worldMapPanX}, ${worldMapPanY}) scale(${worldMapZoom})" transform-origin="300 275">
        <!-- Ancient Province Watermarks -->
        <text x="380" y="32" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">U CHÂU (YOUZHOU)</text>
        <text x="340" y="125" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">KÝ CHÂU (JIZHOU)</text>
        <text x="500" y="135" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">THANH CHÂU</text>
        <text x="210" y="215" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">TƯ LỆ (SILI)</text>
        <text x="375" y="305" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">DỰ CHÂU & DUYỆN CHÂU</text>
        <text x="500" y="260" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">TỪ CHÂU (XUZHOU)</text>
        <text x="275" y="395" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">KINH CHÂU (JINGZHOU)</text>
        <text x="475" y="435" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">GIANG ĐÔNG (WU)</text>
        <text x="95" y="475" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">BA THỤC (BASHU)</text>
        <text x="340" y="535" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">GIAO CHÂU (JIAOZHOU)</text>

        <!-- Hoàng Hà (The Yellow River) -->
        <path d="M 60,215 C 120,225 180,235 235,230 C 275,225 320,205 380,210 C 440,215 500,190 560,175" 
              stroke="#1d4ed8" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.38" />
        <path d="M 60,215 C 120,225 180,235 235,230 C 275,225 320,205 380,210 C 440,215 500,190 560,175" 
              stroke="#60a5fa" stroke-width="2" stroke-dasharray="8,5" fill="none" opacity="0.85" />
        <text x="330" y="200" fill="#93c5fd" font-size="9" font-style="italic" opacity="0.85" letter-spacing="0.5px">Hoàng Hà (Yellow River)</text>

        <!-- Trường Giang (The Yangtze River) -->
        <path d="M 40,465 C 110,445 190,435 250,428 C 310,422 355,418 410,405 C 470,392 525,380 580,370" 
              stroke="#0e7490" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.38" />
        <path d="M 40,465 C 110,445 190,435 250,428 C 310,422 355,418 410,405 C 470,392 525,380 580,370" 
              stroke="#38bdf8" stroke-width="2" stroke-dasharray="8,5" fill="none" opacity="0.85" />
        <text x="290" y="445" fill="#7dd3fc" font-size="9" font-style="italic" opacity="0.85" letter-spacing="0.5px">Trường Giang (Yangtze River)</text>

        <!-- Mountain Pass: Hổ Lao Quan -->
        <g transform="translate(295, 255)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9" />
          <text x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Hổ Lao Quan</text>
        </g>

        <!-- Mountain Pass: Đồng Quan -->
        <g transform="translate(210, 248)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9" />
          <text x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Đồng Quan</text>
        </g>

        <!-- Mountain Pass: Kiếm Các -->
        <g transform="translate(100, 390)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9" />
          <text x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Kiếm Các</text>
        </g>

        <!-- Tactical Connecting Routes (Styled by Terrain Type) -->
        ${svgRoutes}

        <!-- Interactive Strategic Regional Nodes (20 Citadels) -->
        ${svgNodes}
      </g>
    </svg>
  `;

  initWorldMapInteractions();
  applyWorldMapTransform();
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

  const title = isEn ? node.nameEn : node.nameVi;
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
    colorHex: '#3b82f6',
    governorVi: 'Thái Thú Bản Địa'
  };

  const eco = node.economy || {
    grainReserves: 2000,
    treasury: 10000,
    primaryCommodityVi: 'Ngũ Cốc & Binh Khí',
    exportGoodVi: 'Lương Thảo',
    importNeedVi: 'Thép Thỏi'
  };

  const hireableList = (node.hireableNpcs && node.hireableNpcs.length > 0)
    ? node.hireableNpcs.map(npc => {
        const rawName = npc.split('(')[0].trim();
        const roleDesc = npc.includes('(') ? npc.substring(npc.indexOf('(')) : '';
        const escapedRaw = rawName.replace(/'/g, "\\'");
        return `
          <div class="intel-npc-pill">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
              <span style="font-weight: 600;">💼 ${rawName}</span>
              <span style="font-size: 8.5px; opacity: 0.8; color: var(--text-muted);">${roleDesc}</span>
            </div>
            <button class="btn-intel-recruit" onclick="hireSpecialistPrompt('${escapedRaw}', '${nodeId}')" title="${isEn ? 'Recruit into enterprise' : 'Chiêu mộ nhân sĩ gia nhập sản nghiệp'}">
              ${isEn ? 'Recruit' : 'Chiêu Mộ'}
            </button>
          </div>
        `;
      }).join('')
    : `<div style="font-size: 10px; color: var(--text-muted); font-style: italic;">${isEn ? 'No wandering specialists available' : 'Chưa có nhân sĩ tự do đồn trú'}</div>`;

  panel.innerHTML = `
    <div class="intel-target-header">
      <div>
        <div class="intel-target-name">${title}</div>
        <div class="intel-target-province">${prov}</div>
        <span class="intel-faction-badge" style="background: ${mil.colorHex}22; border: 1px solid ${mil.colorHex}66; color: ${mil.colorHex};">
          🚩 ${mil.rulerNameVi} • Trấn thủ: ${mil.governorVi}
        </span>
      </div>
      <span class="intel-status-badge ${badgeClass}">${badgeText}</span>
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
        <div class="intel-metric-val" style="font-size: 10px; color: ${threatColor};">${threatText}</div>
      </div>
    </div>

    <!-- Strategic Layer 1: Military & Garrisons -->
    <div class="intel-subcard">
      <div class="intel-subcard-title">
        <span>⚔️ ${isEn ? 'Military Garrisons & Defenses' : 'Binh Lực & Thành Phòng'}</span>
        <span style="font-family: var(--font-mono); color: #38bdf8;">${mil.garrison.toLocaleString()} ${isEn ? 'Troops' : 'Binh Sĩ'}</span>
      </div>
      <div class="intel-breakdown-row">
        <div class="intel-unit-chip">
          <span class="intel-unit-lbl">${isEn ? 'Infantry' : '🗡️ Bộ Binh'}</span>
          <span class="intel-unit-val">${mil.infantry.toLocaleString()}</span>
        </div>
        <div class="intel-unit-chip">
          <span class="intel-unit-lbl">${isEn ? 'Cavalry' : '🐎 Kỵ Binh'}</span>
          <span class="intel-unit-val">${mil.cavalry.toLocaleString()}</span>
        </div>
        <div class="intel-unit-chip">
          <span class="intel-unit-lbl">${isEn ? 'Archers' : '🏹 Cung Thủ'}</span>
          <span class="intel-unit-val">${mil.archers.toLocaleString()}</span>
        </div>
      </div>
      <div style="font-size: 9.5px; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 2px;">
        <span>${isEn ? 'Wall Defense Rating' : 'Độ Kiên Cố Tường Thành'}:</span>
        <span style="font-family: var(--font-mono); font-weight: 700; color: #fbbf24;">🛡️ ${mil.defense} / 100</span>
      </div>
      <!-- Tactical Military Command Actions -->
      <div class="intel-action-row">
        <button class="btn-intel-tactical btn-intel-reinforce" onclick="promptReinforceGarrison('${nodeId}')" title="${isEn ? 'Reinforce garrison troops' : 'Điều động ngân lượng chiêu mộ binh sĩ đồn trú'}">
          <span>🛡️</span> <span>${isEn ? 'Reinforce' : 'Điều Binh Đồn Trú'}</span>
        </button>
        ${nodeId !== 'zhuo_xian' ? `
        <button class="btn-intel-tactical btn-intel-assault" onclick="promptSiegeAssault('${nodeId}')" title="${isEn ? 'Assault settlement citadel' : 'Đốc thúc ba quân công phá thành trì'}">
          <span>🔥</span> <span>${isEn ? 'Siege Assault' : 'Công Thành'}</span>
        </button>
        ` : ''}
      </div>
    </div>

    <!-- Strategic Layer 2: Economy & Commodities -->
    <div class="intel-subcard">
      <div class="intel-subcard-title">
        <span>🌾 ${isEn ? 'Economy & Strategic Reserves' : 'Kinh Tế & Sản Vật'}</span>
        <span style="font-family: var(--font-mono); color: #fbbf24;">${eco.treasury.toLocaleString()} ${isEn ? 'Cash' : 'Tiền'}</span>
      </div>
      <div class="intel-trade-box">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">${isEn ? 'Granary Reserves' : 'Kho Lương Thảo'}:</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: #fbbf24;">🌾 ${eco.grainReserves.toLocaleString()} Thạch</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">${isEn ? 'Key Commodity' : 'Sản Vật Chủ Lực'}:</span>
          <span style="font-weight: 600; color: #f1f5f9;">${eco.primaryCommodityVi}</span>
        </div>
        <div class="intel-trade-item">
          <span class="intel-trade-tag export">${isEn ? 'EXPORT' : 'XUẤT'}</span>
          <span>${eco.exportGoodVi}</span>
        </div>
        <div class="intel-trade-item">
          <span class="intel-trade-tag import">${isEn ? 'IMPORT' : 'NHẬP'}</span>
          <span>${eco.importNeedVi}</span>
        </div>
      </div>
      <!-- Tactical Caravan Dispatch Action -->
      <div style="margin-top: 4px;">
        <button class="btn-intel-tactical btn-intel-caravan" onclick="openCaravanWithDestination('${nodeId}')" title="${isEn ? 'Dispatch trade caravan to this destination' : 'Thiết lập thương đoàn vận chuyển hàng hóa tới địa điểm này'}">
          <span>📦</span> <span>${isEn ? 'Dispatch Trade Caravan Here' : 'Lập Thương Đoàn Tới Đây'}</span>
        </button>
      </div>
    </div>

    <!-- Strategic Layer 3: Auxiliary Hireable Specialists -->
    <div class="intel-subcard">
      <div class="intel-subcard-title">
        <span>👥 ${isEn ? 'Local Workforce & Retainers' : 'Nhân Lực Thuê Mướn (Dịch Quán)'}</span>
        <span style="font-size: 9px; color: var(--text-muted);">${(node.hireableNpcs || []).length} ${isEn ? 'Specialists' : 'Nhân Tài'}</span>
      </div>
      <div class="intel-npc-list">
        ${hireableList}
      </div>
    </div>

    <!-- Historical Lore & Notable Figures -->
    <div class="intel-section">
      <div class="intel-sec-title">${dict.lblIntel}</div>
      <div class="intel-sec-body">${intel}</div>
    </div>

    <div class="intel-section">
      <div class="intel-sec-title">${dict.lblFigures}</div>
      <div class="intel-sec-body">${figures}</div>
    </div>

    ${isCurrent ? `
      <button class="btn-march" disabled>
        <span>${dict.btnCurrentPos}</span>
      </button>
    ` : `
      <button class="btn-march" onclick="executeMarchToSelectedNode('${nodeId}')">
        <span>${dict.btnMarchTo} ${title}</span>
      </button>
    `}
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
      new_location: targetNode.defaultSubLoc,
      game_date: '184-05-02'
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
      const sel = document.getElementById('dispatch-target-select');
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
      ? `Reinforce ${settlementName} garrison.\nEnter number of troops to recruit & station (Cost: 8 Qian/troop):`
      : `Điều binh đồn trú tại ${settlementName}.\nNhập số lượng binh sĩ chiêu mộ và điều phối (Chi phí: 8 tiền / binh sĩ):`,
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
    ? `Station ${count} troops at ${settlementName} for ${cost} Qian?\nConfirm deployment?`
    : `Điều phối ${count} binh sĩ đồn trú tại ${settlementName} với ngân sách ${cost} Tiền?\nXác nhận điều quân?`;
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

    const narrativeVi = `Lương Diễn xuất ngân lượng **${data.costPaid} tiền**, chiêu mộ và phối thuộc **${count} binh sĩ** tinh nhuệ tăng cường phòng tuyến tại **${targetNode.nameVi}**. Tổng quân số đồn trú hiện đạt **${data.newTroops} binh sĩ**, chỉ số phòng thủ vững vàng đạt **${data.newDefense}/100**!`;
    const narrativeEn = `Liang Yan disburses **${data.costPaid} Qian** to recruit and deploy **${count} veteran soldiers** bolstering defenses at **${targetNode.nameEn}**. Garrison strength now reaches **${data.newTroops} troops**, fortification resilience rated at **${data.newDefense}/100**!`;

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
          cost: `-${data.costPaid} Tiền`,
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
      const victoryVi = `Lương Diễn đích thân đốc thúc **${attackerTroops} dũng sĩ cảm tử** công phạt đại thắng **${targetNode.nameVi}**! Tường thành bị công phá sụp đổ một góc (Phòng thủ còn ${data.newDefense}/100), diệt địch ${data.defenderCasualties} tên (Tổn thất phe ta: ${data.attackerCasualties} người). Thu giữ **${data.lootQian} Tiền** chiến lợi phẩm từ ngân khố!`;
      const victoryEn = `Liang Yan leads **${attackerTroops} vanguard assault troops** to a decisive victory at **${targetNode.nameEn}**! Citadel walls breach (Defense reduced to ${data.newDefense}/100), inflicting ${data.defenderCasualties} defender casualties (Friendly losses: ${data.attackerCasualties}). Captured **${data.lootQian} Qian** in war spoils from the treasury!`;

      if (typeof appendStoryTurn === 'function') {
        appendStoryTurn({
          type: 'player',
          speaker: isEn ? 'Liang Yan (Siege Assault)' : 'Lương Diễn (Công Thành)',
          title: isEn ? 'Citadel Victory' : 'Công Thành Đại Thắng',
          avatar: 'Diễn',
          text: isEn ? victoryEn : victoryVi,
          deltas: {
            target: targetNode.nameVi,
            spoils: `+${data.lootQian} Tiền`,
            enemyLoss: `-${data.defenderCasualties} Địch`,
            friendlyLoss: `-${data.attackerCasualties} Binh Sĩ`,
            defense: `${data.newDefense}/100`
          }
        });
      }

      if (typeof showToast === 'function') {
        showToast(isEn ? `Victory at ${settlementName}! Captured ${data.lootQian} Qian!` : `Đại thắng tại ${settlementName}! Thu giữ ${data.lootQian} Tiền chiến lợi phẩm!`);
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
    ? `Sign employment contract with [${candidateName}]?\nSigning Bonus (Bond): 250 Qian\nAssigned to: Liang Clan Enterprise (+15% to +25% Efficiency boost)\nConfirm recruitment?`
    : `Ký kết khế ước chiêu mộ nhân sĩ [${candidateName}]?\nTiền thưởng ký kết (Ký quỹ): 250 Tiền\nPhân bổ vào: Sản nghiệp Lương Gia (+15% đến +25% Hiệu suất vận hành)\nXác nhận chiêu mộ?`;

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

    const narrativeVi = `Lương Diễn đích thân yết kiến, trao tặng **${data.signingBonusPaid} tiền** chiêu mộ **${data.nameVi}** gia nhập sản nghiệp **${data.businessName}**. Đảm nhận cương vị **${data.assignedRole}**, thúc đẩy hiệu suất sản xuất và quản trị tăng vọt lên **${(data.newEfficiencyMultiplier * 100).toFixed(0)}%**!`;
    const narrativeEn = `Liang Yan personally extends invitations and grants **${data.signingBonusPaid} Qian** signing bonus to recruit **${data.nameVi}** into **${data.businessName}**. Serving as **${data.assignedRole}**, boosting enterprise operational efficiency to **${(data.newEfficiencyMultiplier * 100).toFixed(0)}%**!`;

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
          bonus: `-${data.signingBonusPaid} Tiền`,
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
window.resetWorldMapZoom = resetWorldMapZoom;
window.applyWorldMapTransform = applyWorldMapTransform;
window.initWorldMapInteractions = initWorldMapInteractions;
window.openWorldMap = openWorldMap;
window.closeWorldMap = closeWorldMap;
window.selectWorldMapNode = selectWorldMapNode;
window.renderWorldMapSvg = renderWorldMapSvg;
window.renderWorldMapIntel = renderWorldMapIntel;
window.executeMarchToSelectedNode = executeMarchToSelectedNode;
window.openCaravanWithDestination = openCaravanWithDestination;
window.promptReinforceGarrison = promptReinforceGarrison;
window.promptSiegeAssault = promptSiegeAssault;
window.hireSpecialistPrompt = hireSpecialistPrompt;
