/**
 * ThreeKingdoms-AgentEngine: ROTK-Standardized NPC Officer Dossier Modal
 * (public/js/npc-dossier-modal.js)
 *
 * Implements:
 * - Koei Tecmo ROTK (Romance of the Three Kingdoms) Style Officer Dossier
 * - 3-Tab Architecture: [Bát Vị Quân Lược], [Tâm Tính & Hảo Cảm], [Liệt Truyện & Tiểu Sử]
 * - SVG 8-Axis Polygon Radar Chart & Color-Coded Metric Bars (Tuyệt Thế, Kiệt Xuất, v.v.)
 * - Name Deduplication & Title Formatting (eliminates duplicate style names)
 * - Spatial Proximity Awareness: Co-Present vs Intra-Settlement vs Inter-Settlement
 * - Dynamic Action Deck: Direct face-to-face interactions vs Remote logistics & travel
 * - Full bilingual support (VI / EN) dynamically reflecting currentLang
 * - Adheres strictly to Anti-AI-Slop Standard (AS-01 to AS-12) & Grand Strategy UI Tokens.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let activeNpcId = null;
  let currentDossierData = null;
  let activeDossierTab = 'stats'; // 'stats' | 'kizuna' | 'biography'

  /**
   * Helper: Resolves active language safely
   */
  function isEnglish() {
    return (typeof currentLang !== 'undefined' && currentLang === 'en');
  }

  /**
   * Sets active dossier tab and re-renders view
   */
  function switchDossierTab(tabKey) {
    activeDossierTab = tabKey;
    if (currentDossierData) {
      renderDossierContent(currentDossierData);
    }
  }

  /**
   * Fast travel to NPC location and close modal
   */
  function travelToNpcLocation(targetLoc) {
    closeNpcDossierModal();
    if (typeof travelLocalPoi === 'function') {
      travelLocalPoi(targetLoc);
    } else if (typeof loadScene === 'function') {
      loadScene(targetLoc);
    }
  }

  /**
   * Opens the tactical NPC Dossier Modal and loads intelligence from backend
   */
  async function openNpcDossierModal(npcId) {
    activeNpcId = npcId || 'NPC-0002';
    const isEn = isEnglish();

    let modalEl = document.getElementById('npc-dossier-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'npc-dossier-modal';
      modalEl.className = 'modal-backdrop hidden';
      document.body.appendChild(modalEl);
    }

    const loadingTitle = isEn
      ? '[OFFICER INTELLIGENCE] RETRIEVING ARCHIVES...'
      : '[VÕ TƯỚNG TÌNH BÁO] ĐANG TRA CỨU HỒ SƠ...';
    const loadingBody = isEn
      ? 'Decrypting officer stats, disposition, and relationship under Fog of Information...'
      : 'Đang giải mã bát vị thuộc tính, tâm tính và quan hệ sương mù tình báo...';

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large" style="max-width: 840px;">
        <div class="modal-header">
          <div class="modal-title">${loadingTitle}</div>
          <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 32px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 24px; margin-bottom: 8px;">📜</div>
          ${loadingBody}
        </div>
      </div>
    `;
    modalEl.classList.remove('hidden');

    try {
      const res = await fetch(`/api/kizuna/dossier/${encodeURIComponent(activeNpcId)}`);
      const data = await res.json();
      if (!data.success || !data.dossier) {
        throw new Error(data.error || (isEn ? 'Character dossier not found' : 'Không tìm thấy hồ sơ nhân vật'));
      }
      currentDossierData = data.dossier;
      renderDossierContent(currentDossierData);
    } catch (err) {
      const errTitle = isEn ? '[INTEL ERROR] FAILED TO LOAD DOSSIER' : '[LỖI TÌNH BÁO] KHÔNG THỂ TẢI HỒ SƠ';
      modalEl.innerHTML = `
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-title">${errTitle}</div>
            <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
          </div>
          <div class="modal-body" style="padding: 16px; color: var(--state-danger);">
            ${err.message}
          </div>
        </div>
      `;
    }
  }

  /**
   * Closes the NPC Dossier Modal
   */
  function closeNpcDossierModal() {
    const modalEl = document.getElementById('npc-dossier-modal');
    if (modalEl) modalEl.classList.add('hidden');
    activeNpcId = null;
    currentDossierData = null;
  }

  /**
   * Generates SVG 8-Axis Polygon Radar Chart (ROTK Classic)
   */
  function generateRadarChartSvg(stats, isEn) {
    const cx = 115;
    const cy = 100;
    const r = 65;

    // Stat definitions in clockwise order starting from top
    const axes = [
      { key: 'ldr', label: isEn ? 'Command' : 'Thống Soái', angle: -Math.PI / 2, color: '#c084fc' },
      { key: 'war', label: isEn ? 'Warfare' : 'Võ Lực', angle: -Math.PI / 4, color: '#ef4444' },
      { key: 'cra', label: isEn ? 'Craft' : 'Khéo Léo', angle: 0, color: '#34d399' },
      { key: 'log', label: isEn ? 'Logistics' : 'Hậu Cần', angle: Math.PI / 4, color: '#2dd4bf' },
      { key: 'com', label: isEn ? 'Commerce' : 'Thương Nghiệp', angle: Math.PI / 2, color: '#fbbf24' },
      { key: 'dip', label: isEn ? 'Diplomacy' : 'Ngoại Giao', angle: 3 * Math.PI / 4, color: '#f59e0b' },
      { key: 'pol', label: isEn ? 'Politics' : 'Chính Trị', angle: Math.PI, color: '#60a5fa' },
      { key: 'int', label: isEn ? 'Strategy' : 'Trí Lực', angle: -3 * Math.PI / 4, color: '#3b82f6' }
    ];

    // Background concentric polygon rings (25%, 50%, 75%, 100%)
    let gridSvg = '';
    const rings = [0.25, 0.5, 0.75, 1.0];
    rings.forEach((ringPct) => {
      const ringPoints = axes.map(a => {
        const x = cx + Math.cos(a.angle) * r * ringPct;
        const y = cy + Math.sin(a.angle) * r * ringPct;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      gridSvg += `<polygon points="${ringPoints}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1" />`;
    });

    // Radial spokes from center
    axes.forEach(a => {
      const x = cx + Math.cos(a.angle) * r;
      const y = cy + Math.sin(a.angle) * r;
      gridSvg += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />`;
    });

    // Calculate character stat polygon points
    const statPoints = [];
    const statDots = [];
    axes.forEach(a => {
      const sObj = stats[a.key] || {};
      const val = typeof sObj.value === 'number' ? sObj.value : 50;
      const normVal = Math.min(100, Math.max(15, val)) / 100;
      const px = cx + Math.cos(a.angle) * r * normVal;
      const py = cy + Math.sin(a.angle) * r * normVal;
      statPoints.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      statDots.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${a.color}" stroke="#111827" stroke-width="1" />`);
    });

    // Outer Axis Labels
    let labelsSvg = '';
    axes.forEach(a => {
      const sObj = stats[a.key] || {};
      const dispVal = sObj.display || sObj.displayVi || '??';
      const labelRadius = r + 16;
      const lx = cx + Math.cos(a.angle) * labelRadius;
      const ly = cy + Math.sin(a.angle) * labelRadius;
      const textAnchor = Math.abs(Math.cos(a.angle)) < 0.2 ? 'middle' : (Math.cos(a.angle) > 0 ? 'start' : 'end');
      labelsSvg += `
        <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" fill="${a.color}" font-size="9.5" font-family="'Cinzel', monospace" font-weight="bold" text-anchor="${textAnchor}">
          ${a.label} ${dispVal}
        </text>
      `;
    });

    return `
      <svg width="230" height="200" viewBox="0 0 230 200" style="display: block; margin: 0 auto; overflow: visible;">
        ${gridSvg}
        <polygon points="${statPoints.join(' ')}" fill="rgba(217, 119, 6, 0.25)" stroke="#f59e0b" stroke-width="1.8" />
        ${statDots.join('')}
        ${labelsSvg}
      </svg>
    `;
  }

  /**
   * Helper: Resolves color for stat tier (ROTK-style)
   */
  function getStatColor(val) {
    if (typeof val !== 'number') return '#94a3b8';
    if (val >= 90) return '#ef4444'; // Tuyệt Thế
    if (val >= 75) return '#f59e0b'; // Kiệt Xuất
    if (val >= 60) return '#10b981'; // Khá Tốt
    if (val >= 45) return '#64748b'; // Bình Thường
    return '#475569';                // Yếu Kém
  }

  /**
   * Renders the complete ROTK-standardized dossier view
   */
  function renderDossierContent(dossier) {
    if (!dossier) return;
    currentDossierData = dossier;

    const modalEl = document.getElementById('npc-dossier-modal');
    if (!modalEl) return;

    const isEn = isEnglish();
    const stats = dossier.stats || {};
    const affinityPct = Math.min(100, Math.max(0, dossier.affinity || 0));
    const respectPct = Math.min(100, Math.max(0, dossier.respect || 0));

    // 1. Clean Name Deduplication
    const rawNameVi = dossier.nameVi || '';
    const cleanNameVi = rawNameVi.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanNameEn = (dossier.nameEn || '').replace(/\s*\([^)]*\)/g, '').trim();
    const primaryName = isEn ? (cleanNameEn || cleanNameVi) : (cleanNameVi || rawNameVi);

    let styleName = isEn ? (dossier.styleNameEn || dossier.styleNameVi || '') : (dossier.styleNameVi || '');
    if (!styleName && rawNameVi.includes('(')) {
      const m = rawNameVi.match(/\(([^)]+)\)/);
      if (m) styleName = m[1];
    }
    if (styleName === primaryName) styleName = '';

    const position = isEn ? (dossier.positionEn || dossier.positionVi || 'Local Champion') : (dossier.positionVi || 'Hào Kiệt Bản Địa');
    const location = isEn ? (dossier.locationEn || dossier.locationVi || 'LOC-0001') : (dossier.locationVi || 'LOC-0001');
    const tierLabel = isEn ? (dossier.intelLevelLabelEn || dossier.intelLevelLabelVi) : dossier.intelLevelLabelVi;
    const moodLabel = isEn ? (dossier.currentMoodLabelEn || dossier.currentMoodLabelVi) : dossier.currentMoodLabelVi;
    const relTitle = isEn ? (dossier.relationshipTitleEn || dossier.relationshipTitleVi) : dossier.relationshipTitleVi;

    // 2. Spatial Proximity Awareness
    const activeLoc = (typeof activeSubLocation !== 'undefined' ? activeSubLocation : localStorage.getItem('sim_active_subloc')) || 'Vườn Đào';
    const npcLocVi = dossier.locationVi || 'Vườn Đào (Trác Huyện)';

    const isCoPresent = (
      (activeLoc === 'Vườn Đào' && npcLocVi.includes('Vườn Đào')) ||
      (activeLoc === 'Chợ Đông Môn' && (npcLocVi.includes('Chợ') || npcLocVi.includes('Đông Môn'))) ||
      (activeLoc === 'Xưởng Lương Thị' && (npcLocVi.includes('Xưởng') || npcLocVi.includes('Lương Thị'))) ||
      (activeLoc.trim() === npcLocVi.replace(/\s*\([^)]*\)/g, '').trim())
    );

    const isIntraSettlement = !isCoPresent && (
      npcLocVi.includes('Trác Huyện') ||
      ['Vườn Đào', 'Chợ Đông Môn', 'Xưởng Lương Thị'].some(sl => npcLocVi.includes(sl))
    );

    let targetTravelLoc = 'Vườn Đào';
    if (npcLocVi.includes('Xưởng') || npcLocVi.includes('Lương Thị')) targetTravelLoc = 'Xưởng Lương Thị';
    else if (npcLocVi.includes('Chợ') || npcLocVi.includes('Đông Môn')) targetTravelLoc = 'Chợ Đông Môn';

    let proximityBadgeHtml = '';
    if (isCoPresent) {
      proximityBadgeHtml = `
        <span class="tactical-badge tactical-badge--success" style="border-color: #22c55e; color: #4ade80; font-size: 10px;">
          🟢 ${isEn ? 'Co-Present (Same Scene)' : 'Đồng Hiện (Cùng Bối Cảnh)'}
        </span>
      `;
    } else if (isIntraSettlement) {
      proximityBadgeHtml = `
        <span class="tactical-badge tactical-badge--warning" style="border-color: #f59e0b; color: #fbbf24; font-size: 10px;">
          🟡 ${isEn ? 'Intra-County (Approx 2 Li)' : 'Nội Huyện Cách Biệt (Cách 2 dặm)'}
        </span>
      `;
    } else {
      proximityBadgeHtml = `
        <span class="tactical-badge tactical-badge--danger" style="border-color: #ef4444; color: #f87171; font-size: 10px;">
          🔴 ${isEn ? 'Distant Province' : 'Viễn Phương Biệt Trấn'}
        </span>
      `;
    }

    // Modal Title Header
    const modalTitle = isEn
      ? `[OFFICER DOSSIER] ${primaryName}${styleName ? ' • Style: ' + styleName : ''}`
      : `[HỒ SƠ VÕ TƯỚNG] ${primaryName}${styleName ? ' • Tự: ' + styleName : ''}`;

    // 3. Tab 1: Octagonal Attributes & Stats HTML
    const renderStatRow = (key, nameVi, nameEn, color) => {
      const s = stats[key] || {};
      const val = typeof s.value === 'number' ? s.value : 50;
      const rank = isEn ? (s.rankEn || s.rankVi || '') : (s.rankVi || '');
      const disp = isEn ? (s.displayEn || s.display || '???') : (s.displayVi || s.display || '???');
      const barColor = getStatColor(s.value);
      const label = isEn ? nameEn : nameVi;

      return `
        <div class="dossier-stat-row">
          <span class="dossier-stat-name">${label}</span>
          <span class="dossier-stat-val" style="color: ${barColor};">${disp}</span>
          <div class="dossier-stat-bar-track">
            <div class="dossier-stat-bar-fill" style="width: ${typeof s.value === 'number' ? s.value : 50}%; background-color: ${barColor};"></div>
          </div>
          <span class="dossier-stat-rank">${rank}</span>
        </div>
      `;
    };

    const radarChartSvg = generateRadarChartSvg(stats, isEn);

    const tab1Html = `
      <div style="display: grid; grid-template-columns: 240px 1fr; gap: 16px; align-items: center; padding: 4px 0;">
        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-neutral); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
          <div style="font-size: 10.5px; font-weight: bold; color: var(--brand-primary); margin-bottom: 4px; letter-spacing: 0.05em;">
            ${isEn ? 'OCTAGONAL TACTICAL RADAR' : 'ĐA GIÁC BÁT VỊ QUÂN LƯỢC'}
          </div>
          ${radarChartSvg}
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- Military & Combat Group -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 8px 12px; border-radius: var(--radius-xs);">
            <div style="font-size: 10px; font-weight: bold; color: #f87171; margin-bottom: 6px; text-transform: uppercase;">
              ⚔️ ${isEn ? 'Command & Combat Virtues' : 'Quân Lược & Võ Nghệ'}
            </div>
            ${renderStatRow('ldr', 'Thống Soái', 'Command', '#c084fc')}
            ${renderStatRow('war', 'Võ Lực', 'Warfare', '#f87171')}
            ${renderStatRow('cra', 'Khéo Léo', 'Craft', '#34d399')}
          </div>
          <!-- Governance & Intellect Group -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 8px 12px; border-radius: var(--radius-xs);">
            <div style="font-size: 10px; font-weight: bold; color: #60a5fa; margin-bottom: 6px; text-transform: uppercase;">
              📜 ${isEn ? 'Strategy & Statecraft Virtues' : 'Trí Mưu & Văn Trị'}
            </div>
            ${renderStatRow('int', 'Trí Lực', 'Strategy', '#60a5fa')}
            ${renderStatRow('pol', 'Chính Trị', 'Politics', '#93c5fd')}
            ${renderStatRow('dip', 'Ngoại Giao', 'Diplomacy', '#f59e0b')}
            ${renderStatRow('com', 'Thương Nghiệp', 'Commerce', '#fbbf24')}
            ${renderStatRow('log', 'Hậu Cần', 'Logistics', '#2dd4bf')}
          </div>
        </div>
      </div>
    `;

    // 4. Tab 2: Kizuna & Persona HTML
    const hobbiesHtml = (dossier.hobbies || []).map(h => {
      const labelText = isEn ? (h.labelEn || h.labelVi) : h.labelVi;
      if (h.isRevealed) {
        return `<span class="dossier-pill-badge dossier-pill-badge--gold">✨ ${labelText}</span>`;
      }
      return `<span class="dossier-pill-badge" style="color: var(--text-muted); border-style: dashed;">🔒 ??? (${isEn ? 'Fog' : 'Sương mù'})</span>`;
    }).join(' ');

    const dislikesHtml = (dossier.dislikes || []).map(d => {
      const labelText = isEn ? (d.labelEn || d.labelVi) : d.labelVi;
      if (d.isRevealed) {
        return `<span class="dossier-pill-badge dossier-pill-badge--danger">🚫 ${labelText}</span>`;
      }
      return `<span class="dossier-pill-badge" style="color: var(--text-muted); border-style: dashed;">🔒 ??? (${isEn ? 'Taboo unknown' : 'Chưa rõ cấm kỵ'})</span>`;
    }).join(' ');

    const ambitionStatus = isEn
      ? (dossier.ambition?.isRevealed ? '[UNVEILED]' : '[LOCKED]')
      : (dossier.ambition?.isRevealed ? '[ĐÃ KHAI SÁNG]' : '[KHÓA]');
    const ambitionText = isEn
      ? (dossier.ambition?.displayEn || dossier.ambition?.display || 'Aspiration unrevealed')
      : (dossier.ambition?.displayVi || dossier.ambition?.display || 'Chưa rõ chí hướng');

    const secretsStatus = isEn
      ? (dossier.secretStory?.isRevealed ? '[UNVEILED]' : '[LOCKED]')
      : (dossier.secretStory?.isRevealed ? '[ĐÃ KHAI SÁNG]' : '[KHÓA]');
    const secretText = isEn
      ? (dossier.secretStory?.displayEn || dossier.secretStory?.display || 'Private secrets unrevealed')
      : (dossier.secretStory?.displayVi || dossier.secretStory?.display || 'Chưa rõ bí mật');

    const tab2Html = `
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 4px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <!-- Passions -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-neutral); padding: 10px; border-radius: var(--radius-xs);">
            <div style="font-size: 11px; font-weight: bold; color: var(--brand-primary); margin-bottom: 6px;">
              ${isEn ? '[HOBBIES & PASSIONS]:' : '[SỞ THÍCH & ĐIỂM ĐAM MÊ]:'}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${hobbiesHtml || '<span style="color: var(--text-muted); font-size: 11px;">Chưa khai phá</span>'}
            </div>
          </div>
          <!-- Taboos -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-neutral); padding: 10px; border-radius: var(--radius-xs);">
            <div style="font-size: 11px; font-weight: bold; color: var(--state-danger); margin-bottom: 6px;">
              ${isEn ? '[TABOOS & DISLIKES]:' : '[ĐIỀU CẤM KỴ (DISLIKES)]: '}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${dislikesHtml || '<span style="color: var(--text-muted); font-size: 11px;">Chưa rõ cấm kỵ</span>'}
            </div>
          </div>
        </div>

        <!-- Ambition & Hidden Lore -->
        <div style="background: var(--surface-panel); border: 1px solid var(--border-neutral); padding: 12px; border-radius: var(--radius-xs);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: bold; color: var(--brand-primary);">
              👑 ${isEn ? '[AMBITION & HIDDEN ASPIRATION]:' : '[CHÍ HƯỚNG & DÃ TÂM THẦM KÍN]:'}
            </span>
            <span style="font-size: 10px; color: var(--text-muted); font-family: monospace;">${ambitionStatus}</span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: ${dossier.ambition?.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'}; margin-bottom: 10px;">
            ${ambitionText}
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: bold; color: #e879f9;">
              🗝️ ${isEn ? '[PRIVATE SECRETS]:' : '[BÍ MẬT ĐỜI TƯ]:'}
            </span>
            <span style="font-size: 10px; color: var(--text-muted); font-family: monospace;">${secretsStatus}</span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: ${dossier.secretStory?.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'};">
            ${secretText}
          </div>
        </div>
      </div>
    `;

    // 5. Tab 3: Biography & Career HTML
    const bioText = isEn
      ? (dossier.bioEn || dossier.bioVi || 'Historical records pending decryption...')
      : (dossier.bioVi || 'Tiểu sử lịch sử đang được giải mã từ thư tịch cổ...');

    const tab3Html = `
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 4px 0;">
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-neutral); padding: 12px; border-radius: var(--radius-xs);">
          <div style="font-size: 11px; font-weight: bold; color: var(--brand-primary); margin-bottom: 6px;">
            📖 ${isEn ? 'HISTORICAL BIOGRAPHY & RECORD OF THE THREE KINGDOMS' : 'TAM QUỐC CHÍ LIỆT TRUYỆN & TIỂU SỬ'}
          </div>
          <div style="font-size: 11.5px; line-height: 1.6; color: #cbd5e1; font-style: italic; white-space: pre-line;">
            "${bioText}"
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">Thương Binh (Spear)</div>
            <div style="font-size: 14px; font-weight: bold; color: #ef4444; font-family: monospace;">Hạng S</div>
          </div>
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">Kỵ Binh (Cavalry)</div>
            <div style="font-size: 14px; font-weight: bold; color: #f59e0b; font-family: monospace;">Hạng A</div>
          </div>
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">Bộ Binh (Infantry)</div>
            <div style="font-size: 14px; font-weight: bold; color: #3b82f6; font-family: monospace;">Hạng B</div>
          </div>
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">Cung Nỏ (Archery)</div>
            <div style="font-size: 14px; font-weight: bold; color: #94a3b8; font-family: monospace;">Hạng C</div>
          </div>
        </div>
      </div>
    `;

    // 6. Action Deck Buttons Based on Spatial Proximity
    let actionButtonsHtml = '';
    if (isCoPresent) {
      // Co-Present Actions (Direct face-to-face)
      actionButtonsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'TEA_CONVERSE')" title="Hồi phục +15 Thể Lực, +5 Sĩ Khí">
            ${isEn ? '[OFFER TEA] (-5 Qian, +15 Stamina)' : '[MỜI TRÀ ĐÀM ĐẠO] (-5 Tiền, +15 Thể Lực)'}
          </button>
          <button class="tactical-btn tactical-btn--primary" onclick="executeDossierAction('${dossier.npcId}', 'BANQUET_DRINK')" title="Hồi phục +35 Thể Lực, +12 Sĩ Khí">
            ${isEn ? '[HOST WINE BANQUET] (-30 Qian, +35 Stamina)' : '[RÓT RƯỢU ẨM THỰC] (-30 Tiền, +35 Thể Lực)'}
          </button>
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'SPAR_DEBATE')" title="Tiêu hao 15 Thể Lực, luận bàn võ nghệ">
            ${isEn ? '[SPAR & DEBATE] (-15 Stamina)' : '[LUẬN VÕ SO TÀI] (-15 Thể Lực)'}
          </button>
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'LEARN_MENTOR')">
            ${isEn ? '[SEEK MENTORSHIP] (-25 Qian)' : '[THỈNH GIÁO KỸ NGHỆ] (-25 Tiền)'}
          </button>
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'GIFT_TREASURE')">
            ${isEn ? '[PRESENT GIFT] (-50 Qian)' : '[TẶNG LỄ VẬT] (-50 Tiền)'}
          </button>
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'HEART_CONFESSION')">
            ${isEn ? '[CONFIDE AMBITION]' : '[TÂM SỰ HOÀI BÃO]'}
          </button>
        </div>
      `;
    } else if (isIntraSettlement) {
      // Intra-Settlement Remote Actions
      const isSubordinate = (dossier.npcId === 'NPC-0007' || (dossier.positionVi && dossier.positionVi.includes('Lương')));
      actionButtonsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button class="tactical-btn tactical-btn--primary" onclick="travelToNpcLocation('${targetTravelLoc}')" title="Cất bước đi bộ đến địa điểm của nhân vật">
            ${isEn ? `[VISIT LOCATION] (Travel to ${targetTravelLoc})` : `[ĐẾN TẬN NƠI GẶP MẶT] (Cơ động đến ${targetTravelLoc})`}
          </button>
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'SEND_COURIER_LETTER')" title="Phái gia nhân mang thư thăm hỏi">
            ${isEn ? '[DISPATCH SERVANT LETTER] (-3 Qian)' : '[PHÁI GIA NHÂN GỬI THƯ] (-3 Tiền)'}
          </button>
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'DISPATCH_GIFT_CARAVAN')" title="Ủy thác gia nhân mang lễ vật tận nơi">
            ${isEn ? '[CONSIGN GIFT CARAVAN] (-55 Qian)' : '[ỦY THÁC CHUYỂN QUÀ TẬN TAY] (-55 Tiền)'}
          </button>
          ${isSubordinate ? `
            <button class="tactical-btn" style="border-color: #a855f7; color: #c084fc;" onclick="executeDossierAction('${dossier.npcId}', 'SUMMON_SUBORDINATE')" title="Triệu kiến thợ cả / gia nhân Lương Gia đến diện kiến">
              ${isEn ? '[SUMMON SUBORDINATE]' : '[TRIỆU KIẾN VỀ DIỆN KIẾN]'}
            </button>
          ` : ''}
        </div>
      `;
    } else {
      // Inter-Settlement Remote Actions
      actionButtonsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button class="tactical-btn tactical-btn--primary" onclick="executeDossierAction('${dossier.npcId}', 'CARRIER_PIGEON_LETTER')" title="Thư bồ câu vượt vạn dặm">
            ${isEn ? '[CARRIER PIGEON LETTER] (-15 Qian)' : '[PHI THƯ BỒ CÂU] (-15 Tiền)'}
          </button>
          <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'DISPATCH_GIFT_CARAVAN')" title="Phái đoàn tùy tùng mang lễ vật đi xa">
            ${isEn ? '[DISPATCH TRIBUTE CARAVAN] (-55 Qian)' : '[ỦY THÁC CHUYỂN QUÀ BIẾU] (-55 Tiền)'}
          </button>
        </div>
      `;
    }

    // Modal Assembly
    modalEl.innerHTML = `
      <div class="modal-box modal-box--large" style="max-width: 840px;">
        <!-- Modal Top Bar -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="tactical-badge tactical-badge--primary">${isEn ? '[OFFICER DOSSIER]' : '[HỒ SƠ VÕ TƯỚNG]'}</span>
            <div class="modal-title" style="letter-spacing: 0.05em;">${modalTitle}</div>
          </div>
          <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <!-- 1. Fixed Header: Identity, Location, Proximity & Kizuna Aura -->
          <div style="display: grid; grid-template-columns: 80px 1fr 1fr; gap: 16px; background: var(--surface-panel); padding: 12px; border: 1px solid var(--border-neutral); border-radius: var(--radius-sm);">
            <!-- Avatar Portrait -->
            <div style="width: 80px; height: 80px; background: #151824; border: 2px solid ${dossier.intelLevel >= 4 ? '#f59e0b' : 'var(--brand-primary)'}; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; color: var(--brand-primary); font-family: 'Cinzel', serif; box-shadow: 0 0 12px rgba(245, 158, 11, 0.15);">
              ${dossier.avatarChar}
            </div>

            <!-- Identity Core -->
            <div style="display: flex; flex-direction: column; justify-content: center;">
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span style="font-size: 16px; font-weight: bold; color: var(--text-main); font-family: 'Cinzel', serif;">${primaryName}</span>
                ${dossier.nameHan ? `<span style="font-size: 13px; color: #94a3b8;">(${dossier.nameHan})</span>` : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin: 2px 0 6px 0;">
                ${styleName ? (isEn ? 'Style: ' + styleName + ' • ' : 'Tự: ' + styleName + ' • ') : ''}${position}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 11px; color: #93c5fd;">📍 ${location}</span>
                ${proximityBadgeHtml}
              </div>
            </div>

            <!-- Kizuna & Disposition -->
            <div style="display: flex; flex-direction: column; justify-content: center; gap: 6px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span style="color: var(--text-muted);">💚 ${isEn ? 'Affinity:' : 'Thiện cảm:'}</span>
                  <span style="font-variant-numeric: tabular-nums; font-weight: bold; color: #34d399;">${affinityPct}/100</span>
                </div>
                <div class="tactical-progress-track" style="height: 5px;">
                  <div class="tactical-progress-fill" style="width: ${affinityPct}%; background-color: #10b981;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span style="color: var(--text-muted);">👑 ${isEn ? 'Respect:' : 'Kính trọng:'}</span>
                  <span style="font-variant-numeric: tabular-nums; font-weight: bold; color: #fbbf24;">${respectPct}/100</span>
                </div>
                <div class="tactical-progress-track" style="height: 5px;">
                  <div class="tactical-progress-fill" style="width: ${respectPct}%; background-color: #f59e0b;"></div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; margin-top: 2px;">
                <span style="color: var(--text-muted);">${isEn ? 'Bond:' : 'Quan hệ:'} <strong style="color: #fde68a;">${relTitle}</strong></span>
                <span style="color: var(--text-muted);">${isEn ? 'Mood:' : 'Khí sắc:'} <strong style="color: #60a5fa;">${moodLabel}</strong></span>
              </div>
            </div>
          </div>

          <!-- 2. ROTK 3-Tab Bar -->
          <div class="dossier-tab-bar">
            <button class="dossier-tab-btn ${activeDossierTab === 'stats' ? 'active' : ''}" onclick="switchDossierTab('stats')">
              ⚔️ ${isEn ? 'Octagonal Stats' : 'Bát Vị Quân Lược'}
            </button>
            <button class="dossier-tab-btn ${activeDossierTab === 'kizuna' ? 'active' : ''}" onclick="switchDossierTab('kizuna')">
              🤝 ${isEn ? 'Persona & Kizuna' : 'Tâm Tính & Hảo Cảm'}
            </button>
            <button class="dossier-tab-btn ${activeDossierTab === 'biography' ? 'active' : ''}" onclick="switchDossierTab('biography')">
              📖 ${isEn ? 'Chronicle & Biography' : 'Liệt Truyện & Tiểu Sử'}
            </button>
          </div>

          <!-- 3. Active Tab Stage -->
          <div id="dossier-tab-content">
            ${activeDossierTab === 'stats' ? tab1Html : (activeDossierTab === 'kizuna' ? tab2Html : tab3Html)}
          </div>

          <!-- 4. Dynamic Action Deck -->
          <div style="border-top: 1px solid var(--border-neutral); padding-top: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: var(--text-main); margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>${isEn ? '[AVAILABLE STRATEGIC INTERACTIONS]:' : '[HÀNH ĐỘNG GIAO TẾ KHẢ DĨ]:'}</span>
              <span style="font-size: 10px; color: var(--text-muted); font-weight: normal;">
                ${isCoPresent ? (isEn ? 'Direct (Face-to-Face)' : 'Trực Tiếp (Mặt Đối Mặt)') : (isEn ? 'Remote Logistics' : 'Viễn Giao / Di Chuyển')}
              </span>
            </div>
            ${actionButtonsHtml}
          </div>

          <!-- Dynamic Interaction Feedback Box -->
          <div id="dossier-interaction-feedback" class="hidden" style="background: #111420; border: 1px solid var(--border-neutral); padding: 12px; margin-top: 4px; border-radius: var(--radius-xs);"></div>

          <!-- Footer Modal Controls -->
          <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
            <button class="tactical-btn" onclick="closeNpcDossierModal()">
              ${isEn ? 'Close Dossier' : 'Đóng Hồ Sơ'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Triggers an everyday action directly from the Dossier dialog
   */
  async function executeDossierAction(npcId, actionType) {
    const isEn = isEnglish();
    const feedbackEl = document.getElementById('dossier-interaction-feedback');
    if (feedbackEl) {
      feedbackEl.classList.remove('hidden');
      feedbackEl.innerHTML = `<span style="color: var(--brand-primary);">${isEn ? 'Engaging in strategic interaction...' : 'Đang tiến hành giao tế...'}</span>`;
    }

    try {
      const res = await fetch('/api/kizuna/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, actionType })
      });
      const data = await res.json();
      if (!data.success || !data.result) {
        throw new Error(data.error || (isEn ? 'Interaction failed' : 'Giao tế thất bại'));
      }

      const r = data.result;

      let outcomeBadge = '<span class="tactical-badge">[COURTESY]</span>';
      if (r.outcome === 'CRITICAL_SUCCESS') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--primary">${isEn ? '[RESOUNDING SUCCESS]' : '[ĐẠI HẢO]'}</span>`;
      } else if (r.outcome === 'SUCCESS') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--success">${isEn ? '[HARMONY]' : '[HỢP Ý]'}</span>`;
      } else if (r.outcome === 'AWKWARD') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--warning">${isEn ? '[DISCORD]' : '[LẠC QUẺ]'}</span>`;
      } else if (r.outcome === 'CRITICAL_FAILURE') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--danger">${isEn ? '[GRAVE TABOO]' : '[PHẠM HÚY]'}</span>`;
      } else {
        outcomeBadge = `<span class="tactical-badge">${isEn ? '[COURTESY]' : '[XÃ GIAO]'}</span>`;
      }

      const actionTitle = isEn ? (r.actionTitleEn || r.actionTitleVi) : r.actionTitleVi;
      const dialogueText = isEn ? (r.dialogueNarrativeEn || r.dialogueNarrativeVi) : r.dialogueNarrativeVi;

      const affinityLabel = isEn ? 'Affinity:' : 'Hảo cảm:';
      const respectLabel = isEn ? 'Respect:' : 'Kính trọng:';
      const costStr = r.deltas.cashCost > 0
        ? `<span style="color: #f87171;">${isEn ? 'Cost:' : 'Chi phí:'} -${r.deltas.cashCost} ${isEn ? 'Qian' : 'Tiền'}</span>`
        : '';
      const staminaStr = r.deltas.staminaChange
        ? (r.deltas.staminaChange > 0 
            ? `<span style="color: #06b6d4;">+${r.deltas.staminaChange} Thể Lực</span>` 
            : `<span style="color: #f87171;">${r.deltas.staminaChange} Thể Lực</span>`)
        : '';
      const intelStr = r.deltas.newIntelUnlocked
        ? `<span style="color: var(--brand-primary); font-weight: bold;">${isEn ? 'Unveiled:' : 'Khai sáng:'} ${r.deltas.newIntelUnlocked.join(', ')}</span>`
        : '';

      if (feedbackEl) {
        feedbackEl.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              ${outcomeBadge}
              <span style="font-weight: bold; font-size: 12px; color: var(--text-main);">${actionTitle}</span>
            </div>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #cbd5e1; margin-bottom: 8px;">
            "${dialogueText}"
          </div>
          <div style="font-size: 10px; color: #34d399; display: flex; gap: 12px; font-variant-numeric: tabular-nums; flex-wrap: wrap;">
            <span>${affinityLabel} ${r.deltas.affinityChange > 0 ? '+' : ''}${r.deltas.affinityChange}</span>
            <span>${respectLabel} ${r.deltas.respectChange > 0 ? '+' : ''}${r.deltas.respectChange}</span>
            ${staminaStr}
            ${costStr}
            ${intelStr}
          </div>
        `;
      }

      // Re-render dossier with freshly revealed stats & Kizuna
      if (r.updatedDossier) {
        currentDossierData = r.updatedDossier;
        setTimeout(() => {
          renderDossierContent(currentDossierData);
          const newFeedbackEl = document.getElementById('dossier-interaction-feedback');
          if (newFeedbackEl && feedbackEl) {
            newFeedbackEl.innerHTML = feedbackEl.innerHTML;
            newFeedbackEl.classList.remove('hidden');
          }
        }, 1200);
      }

      // If loadStatus or loadAllData is present in app, trigger light status refresh
      if (typeof window.loadStatus === 'function') {
        window.loadStatus().catch(() => {});
      } else if (typeof window.loadAllData === 'function') {
        window.loadAllData().catch(() => {});
      }
    } catch (err) {
      if (feedbackEl) {
        feedbackEl.innerHTML = `<span style="color: var(--state-danger); font-size: 11px;">[${isEn ? 'ERROR' : 'LỖI'}]: ${err.message}</span>`;
      }
    }
  }

  /**
   * Re-renders active dossier modal when language toggles
   */
  function renderCurrentNpcDossier() {
    const modalEl = document.getElementById('npc-dossier-modal');
    if (modalEl && !modalEl.classList.contains('hidden') && currentDossierData) {
      renderDossierContent(currentDossierData);
    }
  }

  // Attach global helpers for inline HTML onclick handlers
  if (typeof window !== 'undefined') {
    window.switchDossierTab = switchDossierTab;
    window.travelToNpcLocation = travelToNpcLocation;
    window.executeDossierAction = executeDossierAction;
    window.openNpcDossierModal = openNpcDossierModal;
    window.closeNpcDossierModal = closeNpcDossierModal;
  }

  // Global exposure
  return {
    openNpcDossierModal,
    closeNpcDossierModal,
    executeDossierAction,
    switchDossierTab,
    travelToNpcLocation,
    renderCurrentNpcDossier
  };
});
