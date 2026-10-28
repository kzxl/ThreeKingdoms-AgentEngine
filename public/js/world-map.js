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
    ? node.hireableNpcs.map(npc => `
        <div class="intel-npc-pill">
          <span>💼 ${npc}</span>
          <span style="font-size: 9px; opacity: 0.85; font-family: var(--font-mono); color: #34d399;">[${isEn ? 'Hireable' : 'Khả Dụng'}]</span>
        </div>
      `).join('')
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
