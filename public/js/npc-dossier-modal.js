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
  let currentConditions = [];
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

    const loadingBadge = isEn ? '[OFFICER INTEL]' : '[VÕ TƯỚNG TÌNH BÁO]';
    const loadingTitle = isEn ? 'Retrieving Archives...' : 'Đang tra cứu hồ sơ...';
    const loadingBody = isEn
      ? 'Decrypting officer stats, disposition, and relationship under Fog of Information...'
      : 'Đang giải mã bát vị thuộc tính, tâm tính và quan hệ sương mù tình báo...';

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large" style="max-width: 860px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="tactical-badge tactical-badge--primary">${loadingBadge}</span>
            <div class="modal-title" style="letter-spacing: 0.05em; font-size: 13.5px; font-weight: 700; color: #fbbf24;">${loadingTitle}</div>
          </div>
          <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 36px 20px; text-align: center; color: var(--text-muted);">
          <div style="display: inline-block; width: 24px; height: 24px; border: 2px solid var(--border-gold); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px;"></div>
          <div>${loadingBody}</div>
        </div>
      </div>
    `;
    if (typeof nextModalZIndex === 'function') {
      modalEl.style.zIndex = String(nextModalZIndex());
    }
    modalEl.classList.remove('hidden');

    try {
      const [dossierRes, conditionRes] = await Promise.all([
        fetch(`/api/kizuna/dossier/${encodeURIComponent(activeNpcId)}`).then(r => r.json()),
        fetch(`/api/conditions?characterId=${encodeURIComponent(activeNpcId)}`).then(r => r.json()).catch(() => ({}))
      ]);
      const data = dossierRes;
      if (!data.success || !data.dossier) {
        throw new Error(data.error || (isEn ? 'Character dossier not found' : 'Không tìm thấy hồ sơ nhân vật'));
      }
      currentDossierData = data.dossier;
      currentConditions = conditionRes.conditions || [];
      renderDossierContent(currentDossierData);
    } catch (err) {
      const errBadge = isEn ? '[INTEL ERROR]' : '[LỖI TÌNH BÁO]';
      const errTitle = isEn ? 'Failed to Load Dossier' : 'Không thể tải hồ sơ võ tướng';
      modalEl.innerHTML = `
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tactical-badge tactical-badge--danger">${errBadge}</span>
              <div class="modal-title" style="color: #f87171;">${errTitle}</div>
            </div>
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
    currentConditions = [];
  }

  /**
   * Generates an 8-axis radar with short labels. Exact values and ranks live in
   * the stat grid; long "Khá Tốt (60-74)" strings must not sit on the axes.
   */
  function generateRadarChartSvg(stats, isEn) {
    const cx = 160;
    const cy = 135;
    const r = 78;

    const axes = [
      { key: 'ldr', label: isEn ? 'LDR' : 'LDR', angle: -Math.PI / 2 },
      { key: 'war', label: isEn ? 'WAR' : 'WAR', angle: -Math.PI / 4 },
      { key: 'cra', label: isEn ? 'CRA' : 'CRA', angle: 0 },
      { key: 'log', label: isEn ? 'LOG' : 'LOG', angle: Math.PI / 4 },
      { key: 'com', label: isEn ? 'COM' : 'COM', angle: Math.PI / 2 },
      { key: 'dip', label: isEn ? 'DIP' : 'DIP', angle: 3 * Math.PI / 4 },
      { key: 'pol', label: isEn ? 'POL' : 'POL', angle: Math.PI },
      { key: 'int', label: isEn ? 'INT' : 'INT', angle: -3 * Math.PI / 4 }
    ];

    let gridSvg = '';
    [0.25, 0.5, 0.75, 1.0].forEach((ringPct) => {
      const ringPoints = axes.map(a => {
        const x = cx + Math.cos(a.angle) * r * ringPct;
        const y = cy + Math.sin(a.angle) * r * ringPct;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      gridSvg += `<polygon points="${ringPoints}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="1" />`;
    });

    axes.forEach(a => {
      const x = cx + Math.cos(a.angle) * r;
      const y = cy + Math.sin(a.angle) * r;
      gridSvg += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(148,163,184,0.18)" stroke-width="1" />`;
    });

    const statPoints = [];
    const statDots = [];
    axes.forEach(a => {
      const sObj = stats[a.key] || {};
      const hasValue = typeof sObj.value === 'number';
      const val = hasValue ? sObj.value : 0;
      const normVal = hasValue ? Math.min(100, Math.max(15, val)) / 100 : 0.15;
      const px = cx + Math.cos(a.angle) * r * normVal;
      const py = cy + Math.sin(a.angle) * r * normVal;
      statPoints.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      statDots.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${hasValue ? 3 : 2}" fill="${hasValue ? '#f59e0b' : '#334155'}" stroke="#0b0f19" stroke-width="1.5" />`
      );
    });

    let labelsSvg = '';
    axes.forEach(a => {
      const sObj = stats[a.key] || {};
      const valueText = typeof sObj.value === 'number' ? String(Math.round(sObj.value)) : '?';
      const cos = Math.cos(a.angle);
      const sin = Math.sin(a.angle);
      const labelRadius = r + 22;
      let lx = cx + cos * labelRadius;
      let ly = cy + sin * labelRadius + (sin < -0.9 ? -4 : sin > 0.9 ? 10 : 4);
      if (Math.abs(cos) < 0.15) {
        lx = cx;
      } else if (Math.abs(sin) < 0.15) {
        ly = cy + 3.5;
      }
      const anchor = Math.abs(cos) < 0.15 ? 'middle' : (cos > 0 ? 'start' : 'end');
      labelsSvg += `
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="10" font-family="var(--font-sans, -apple-system, sans-serif)" text-anchor="${anchor}">
          <tspan fill="#94a3b8" font-weight="600">${a.label}</tspan>
          <tspan fill="#f8fafc" font-weight="700"> ${valueText}</tspan>
        </text>
      `;
    });

    return `
      <svg class="dossier-radar-svg" viewBox="0 0 320 270" role="img" aria-label="${isEn ? 'Eight attribute radar' : 'Biểu đồ bát vị'}">
        ${gridSvg}
        <polygon points="${statPoints.join(' ')}" fill="rgba(217, 119, 6, 0.18)" stroke="#d97706" stroke-width="1.6" />
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
        <span class="tactical-badge tactical-badge--success" style="border-color: #22c55e; color: #4ade80; font-size: 11px;">
          ${isEn ? 'Co-Present (Same Scene)' : 'Đồng Hiện (Cùng Bối Cảnh)'}
        </span>
      `;
    } else if (isIntraSettlement) {
      proximityBadgeHtml = `
        <span class="tactical-badge tactical-badge--warning" style="border-color: #f59e0b; color: #fbbf24; font-size: 11px;">
          ${isEn ? 'Intra-County (Approx 2 Li)' : 'Nội Huyện Cách Biệt (Cách 2 dặm)'}
        </span>
      `;
    } else {
      proximityBadgeHtml = `
        <span class="tactical-badge tactical-badge--danger" style="border-color: #ef4444; color: #f87171; font-size: 11px;">
          ${isEn ? 'Distant Province' : 'Viễn Phương Biệt Trấn'}
        </span>
      `;
    }

    // Modal Title Header (clean, no duplicate tactical badge)
    const ageLabel = dossier.age ? ` • ${dossier.age} ${isEn ? 'yrs' : 'tuổi'}` : '';
    const modalTitle = `${primaryName}${styleName ? (isEn ? ' • Style: ' + styleName : ' • Tự: ' + styleName) : ''}${ageLabel}`;

    // 3. Tab 1: Octagonal Attributes & Stats HTML
    const renderStatRow = (key, nameVi, nameEn) => {
      const s = stats[key] || {};
      const hasValue = typeof s.value === 'number';
      const valueText = hasValue ? String(Math.round(s.value)) : '???';
      const rawRank = isEn ? (s.rankEn || s.rankVi || '') : (s.rankVi || '');
      const rankText = hasValue
        ? rawRank.replace(/\s*\([^)]*\)/g, '').trim()
        : (isEn ? 'Fogged' : 'Sương mù');
      const barColor = getStatColor(s.value);
      const label = isEn ? nameEn : nameVi;
      const width = hasValue ? Math.max(0, Math.min(100, s.value)) : 0;
      const aria = hasValue ? `${label}: ${valueText}, ${rankText}` : `${label}: hidden`;

      return `
        <div class="dossier-stat-row" role="group" aria-label="${aria}">
          <span class="dossier-stat-name">${label}</span>
          <span class="dossier-stat-val" style="color: ${hasValue ? barColor : 'var(--text-muted)'};">${valueText}</span>
          <div class="dossier-stat-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${hasValue ? Math.round(s.value) : 0}">
            <div class="dossier-stat-bar-fill" style="width: ${width}%; background-color: ${hasValue ? barColor : 'transparent'};"></div>
          </div>
          <span class="dossier-stat-rank">${rankText}</span>
        </div>
      `;
    };

    const radarChartSvg = generateRadarChartSvg(stats, isEn);

    const tab1Html = `
      <div class="dossier-stats-layout">
        <section class="dossier-radar-card">
          <div class="dossier-section-title">${isEn ? 'OCTAGONAL TACTICAL RADAR' : 'ĐA GIÁC BÁT VỊ QUÂN LƯỢC'}</div>
          ${radarChartSvg}
          <div class="dossier-radar-note">${isEn ? 'Shape only; exact values are in the grid.' : 'Chỉ thể hiện hình dạng; số chính xác nằm ở bảng bên.'}</div>
        </section>
        <section class="dossier-stat-grid" aria-label="${isEn ? 'Eight attributes' : 'Bát vị quân lược'}">
          ${renderStatRow('ldr', 'Thống Soái', 'Command')}
          ${renderStatRow('war', 'Võ Lực', 'Warfare')}
          ${renderStatRow('cra', 'Khéo Léo', 'Craft')}
          ${renderStatRow('int', 'Trí Lực', 'Strategy')}
          ${renderStatRow('pol', 'Chính Trị', 'Politics')}
          ${renderStatRow('dip', 'Ngoại Giao', 'Diplomacy')}
          ${renderStatRow('com', 'Thương Nghiệp', 'Commerce')}
          ${renderStatRow('log', 'Hậu Cần', 'Logistics')}
        </section>
      </div>
    `;

    // 4. Tab 2: Kizuna & Persona HTML
    const hobbiesHtml = (dossier.hobbies || []).map(h => {
      const labelText = isEn ? (h.labelEn || h.labelVi) : h.labelVi;
      if (h.isRevealed) {
        return `<span class="dossier-pill-badge dossier-pill-badge--gold">${labelText}</span>`;
      }
      return `<span class="dossier-pill-badge" style="color: var(--text-muted); border-style: dashed;">??? (${isEn ? 'Fog' : 'Sương mù'})</span>`;
    }).join(' ');

    const dislikesHtml = (dossier.dislikes || []).map(d => {
      const labelText = isEn ? (d.labelEn || d.labelVi) : d.labelVi;
      if (d.isRevealed) {
        return `<span class="dossier-pill-badge dossier-pill-badge--danger">${labelText}</span>`;
      }
      return `<span class="dossier-pill-badge" style="color: var(--text-muted); border-style: dashed;">??? (${isEn ? 'Taboo unknown' : 'Chưa rõ cấm kỵ'})</span>`;
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
              ${isEn ? '[AMBITION & ASPIRATION]:' : '[CHÍ HƯỚNG & DÃ TÂM]:'}
            </span>
            <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${ambitionStatus}</span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: ${dossier.ambition?.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'}; margin-bottom: 10px;">
            ${ambitionText}
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: bold; color: #e879f9;">
              ${isEn ? '[PRIVATE SECRETS]:' : '[BÍ MẬT ĐỜI TƯ]:'}
            </span>
            <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${secretsStatus}</span>
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
            ${isEn ? 'HISTORICAL BIOGRAPHY & CHRONICLE' : 'TAM QUỐC CHÍ LIỆT TRUYỆN & TIỂU SỬ'}
          </div>
          <div style="font-size: 11.5px; line-height: 1.6; color: #cbd5e1; font-style: italic; white-space: pre-line;">
            "${bioText}"
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Thương Binh (Spear)</div>
            <div style="font-size: 14px; font-weight: bold; color: #ef4444; font-family: monospace;">Hạng S</div>
          </div>
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Kỵ Binh (Cavalry)</div>
            <div style="font-size: 14px; font-weight: bold; color: #f59e0b; font-family: monospace;">Hạng A</div>
          </div>
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Bộ Binh (Infantry)</div>
            <div style="font-size: 14px; font-weight: bold; color: #3b82f6; font-family: monospace;">Hạng B</div>
          </div>
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); padding: 8px; text-align: center; border-radius: var(--radius-xs);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Cung Nỏ (Archery)</div>
            <div style="font-size: 14px; font-weight: bold; color: #94a3b8; font-family: monospace;">Hạng C</div>
          </div>
        </div>

        ${(dossier.skills || []).length > 0 ? `
          <div class="dossier-skill-list">
            <div class="dossier-skill-row">
              <div class="dossier-skill-head"><strong>${isEn ? 'Known Skills' : 'Kỹ Năng Sở Trường'}</strong></div>
              <div class="dossier-skill-perks">
                ${(dossier.skills || []).map(skill => `
                  <span class="dossier-skill-perk is-chosen">${skill.name} · T${skill.tier} · ${skill.derived ? (isEn ? 'Innate' : 'Bẩm sinh') : `${skill.currentExp}/${skill.maxExp}`}</span>
                  ${(skill.perks || []).map(perk => `<span class="dossier-skill-perk is-ready">P${perk.tier} · ${isEn ? perk.nameEn : perk.nameVi}</span>`).join('')}
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // 5. Tab 4: Assets, NPC ledger and business succession
    const assets = dossier.assets || { ledger: [], business: null };
    const business = assets.business;
    const businessHtml = business
      ? `
        <div class="dossier-asset-card">
          <div class="dossier-asset-head">${isEn ? 'Business Succession' : 'Sản Nghiệp & Kế Thừa'}</div>
          <div class="dossier-asset-title">${business.name}</div>
          <div class="dossier-asset-meta">
            ${business.businessId} • ${business.assignedRole} • ${business.status} • Tier ${business.tier}
          </div>
          <div class="dossier-asset-meta">
            ${isEn ? 'Manager / successor:' : 'Người quản lý / kế thừa:'} ${business.managerNpcId || (isEn ? 'none' : 'chưa có')}
            • ${isEn ? 'safe cash' : 'quỹ an toàn'} ${formatNumber(business.safeCash)} Quan
          </div>
        </div>
      `
      : `<div class="dossier-asset-empty">${isEn ? 'No enterprise is assigned to this officer.' : 'Nhân vật chưa được phân bổ sản nghiệp nào.'}</div>`;
    const ledgerHtml = (assets.ledger || []).length > 0
      ? assets.ledger.map(entry => `
          <div class="dossier-ledger-row">
            <div>
              <div class="dossier-ledger-category">${entry.category}${entry.counterparty ? ` • ${entry.counterparty}` : ''}</div>
              <div class="dossier-ledger-memo">${entry.memoVi || ''}</div>
            </div>
            <div class="dossier-ledger-values">
              <span>${entry.gameDate}</span>
              <strong class="${entry.deltaCash >= 0 ? 'is-positive' : 'is-negative'}">${entry.deltaCash >= 0 ? '+' : ''}${formatNumber(entry.deltaCash)} Quan</strong>
              <span>${isEn ? 'balance' : 'số dư'} ${formatNumber(entry.balanceCash)}</span>
            </div>
          </div>
        `).join('')
      : `<div class="dossier-asset-empty">${isEn ? 'No ledger entries yet.' : 'Chưa có bút toán nào.'}</div>`;

    const tab4Html = `
      <div class="dossier-asset-layout">
        ${businessHtml}
        <div class="dossier-asset-card">
          <div class="dossier-asset-head">${isEn ? 'Latest NPC Ledger' : 'Sổ Cái NPC Gần Nhất'}</div>
          ${ledgerHtml}
        </div>
      </div>
    `;

    // 6. Action Deck Buttons Based on Spatial Proximity
    let actionButtonsHtml = '';
    if (isCoPresent) {
      // Co-Present Actions (Direct face-to-face)
      actionButtonsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'TEA_CONVERSE')" title="Hồi phục +15 Thể Lực, +5 Sĩ Khí">
            ${isEn ? 'Offer Tea (-5 quan, +15 Stamina)' : 'Mời Trà Đàm Đạo (-5 Quan, +15 Thể Lực)'}
          </button>
          <button class="ui-btn ui-btn--primary" onclick="executeDossierAction('${dossier.npcId}', 'BANQUET_DRINK')" title="Hồi phục +35 Thể Lực, +12 Sĩ Khí">
            ${isEn ? 'Host Wine Banquet (-30 quan, +35 Stamina)' : 'Rót Rượu Ẩm Thực (-30 Quan, +35 Thể Lực)'}
          </button>
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'SPAR_DEBATE')" title="Tiêu hao 15 Thể Lực, luận bàn võ nghệ">
            ${isEn ? 'Spar & Debate (-15 Stamina)' : 'Luận Võ So Tài (-15 Thể Lực)'}
          </button>
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'LEARN_MENTOR')">
            ${isEn ? 'Seek Mentorship (-25 quan)' : 'Thỉnh Giáo Kỹ Nghệ (-25 Quan)'}
          </button>
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'GIFT_TREASURE')">
            ${isEn ? 'Present Gift (-50 quan)' : 'Tặng Lễ Vật (-50 Quan)'}
          </button>
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'HEART_CONFESSION')">
            ${isEn ? 'Confide Ambition' : 'Tâm Sự Hoài Bão'}
          </button>
        </div>
      `;
    } else if (isIntraSettlement) {
      // Intra-Settlement Remote Actions
      const isSubordinate = (dossier.npcId === 'NPC-0007' || (dossier.positionVi && dossier.positionVi.includes('Lương')));
      actionButtonsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button class="ui-btn ui-btn--primary" onclick="travelToNpcLocation('${targetTravelLoc}')" title="Cất bước đi bộ đến địa điểm của nhân vật">
            ${isEn ? `Visit Location (Travel to ${targetTravelLoc})` : `Đến Tận Nơi Gặp Mặt (Cơ động đến ${targetTravelLoc})`}
          </button>
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'SEND_COURIER_LETTER')" title="Phái gia nhân mang thư thăm hỏi">
            ${isEn ? 'Dispatch Servant Letter (-3 quan)' : 'Phái Gia Nhân Gửi Thư (-3 Quan)'}
          </button>
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'DISPATCH_GIFT_CARAVAN')" title="Ủy thác gia nhân mang lễ vật tận nơi">
            ${isEn ? 'Consign Gift Caravan (-55 quan)' : 'Ủy Thác Chuyển Quà Tận Tay (-55 Quan)'}
          </button>
          ${isSubordinate ? `
            <button class="ui-btn" style="border-color: #a855f7; color: #c084fc;" onclick="executeDossierAction('${dossier.npcId}', 'SUMMON_SUBORDINATE')" title="Triệu kiến thợ cả / gia nhân Lương Gia đến diện kiến">
              ${isEn ? 'Summon Subordinate' : 'Triệu Kiến Về Diện Kiến'}
            </button>
          ` : ''}
        </div>
      `;
    } else {
      // Inter-Settlement Remote Actions
      actionButtonsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button class="ui-btn ui-btn--primary" onclick="executeDossierAction('${dossier.npcId}', 'CARRIER_PIGEON_LETTER')" title="Thư bồ câu vượt vạn dặm">
            ${isEn ? 'Carrier Pigeon Letter (-15 quan)' : 'Phi Thư Bồ Câu (-15 Quan)'}
          </button>
          <button class="ui-btn" onclick="executeDossierAction('${dossier.npcId}', 'DISPATCH_GIFT_CARAVAN')" title="Phái đoàn tùy tùng mang lễ vật đi xa">
            ${isEn ? 'Dispatch Tribute Caravan (-55 quan)' : 'Ủy Thác Chuyển Quà Biếu (-55 Quan)'}
          </button>
        </div>
      `;
    }

    // Modal Assembly
    modalEl.innerHTML = `
      <div class="modal-box modal-box--large dossier-modal">
        <!-- Modal Top Bar -->
        <div class="modal-header dossier-modal-header">
          <div class="dossier-modal-title-row">
            <span class="tactical-badge tactical-badge--primary">${isEn ? '[OFFICER DOSSIER]' : '[HỒ SƠ VÕ TƯỚNG]'}</span>
            <div class="modal-title dossier-modal-title">${modalTitle}</div>
          </div>
          <button class="btn-modal-close" onclick="closeNpcDossierModal()" title="${isEn ? 'Close' : 'Đóng'}">&times;</button>
        </div>

        <div class="modal-body dossier-body">
          <!-- 1. Fixed Header: Identity, Location, Proximity & Kizuna Aura -->
          <div class="dossier-header">
            <!-- Avatar Portrait (DB-driven, illustration-ready) -->
            <div class="dossier-portrait-frame ${dossier.intelLevel >= 4 ? 'is-unlocked' : ''}">
              ${dossier.portraitUrl
                ? `<img class="dossier-portrait-img" src="${dossier.portraitUrl}" alt="${primaryName}" loading="lazy" />`
                : `<span class="dossier-portrait-seal">${dossier.avatarChar}</span>`}
            </div>

            <!-- Identity Core -->
            <div class="dossier-identity">
              <div class="dossier-name-row">
                <span class="dossier-name">${primaryName}</span>
                ${dossier.nameHan ? `<span class="dossier-name-han">(${dossier.nameHan})</span>` : ''}
              </div>
              <div class="dossier-meta">
                ${styleName ? (isEn ? 'Style: ' + styleName + ' • ' : 'Tự: ' + styleName + ' • ') : ''}${position}
              </div>
              <div class="dossier-chip-row">
                <span class="dossier-chip">${location}</span>
                ${proximityBadgeHtml}
                <span class="dossier-chip dossier-chip--muted">${isEn ? 'Mood' : 'Khí sắc'}: ${moodLabel}</span>
                <span class="dossier-pill-badge dossier-pill-badge--gold">${relTitle}</span>
              </div>
            </div>

            <!-- Kizuna & Disposition -->
            <div class="dossier-kizuna">
              <div class="dossier-meter">
                <div class="dossier-meter-head">
                  <span>${isEn ? 'Affinity' : 'Thiện cảm'}</span>
                  <strong class="is-affinity">${affinityPct}/100</strong>
                </div>
                <div class="dossier-meter-track">
                  <div class="dossier-meter-fill is-affinity" style="width: ${affinityPct}%;"></div>
                </div>
              </div>

              <div class="dossier-meter">
                <div class="dossier-meter-head">
                  <span>${isEn ? 'Respect' : 'Kính trọng'}</span>
                  <strong class="is-respect">${respectPct}/100</strong>
                </div>
                <div class="dossier-meter-track">
                  <div class="dossier-meter-fill is-respect" style="width: ${respectPct}%;"></div>
                </div>
              </div>
            </div>
          </div>

          ${typeof renderConditionChips === 'function' ? renderConditionChips(currentConditions, isEn) : ''}

          <!-- Illustration is rendered only when the DB has an asset; no empty band. -->
          ${dossier.illustrationUrl
            ? `<div class="dossier-illustration-frame is-inset">
                 <img class="dossier-illustration-img" src="${dossier.illustrationUrl}" alt="${primaryName}" loading="lazy" />
               </div>`
            : ''}

          <!-- 2. ROTK 3-Tab Bar (sticky) -->
          <div class="dossier-tab-bar dossier-tab-bar--sticky">
            <button class="dossier-tab-btn ${activeDossierTab === 'stats' ? 'active' : ''}" onclick="switchDossierTab('stats')">
              ${isEn ? 'Octagonal Stats' : 'Bát Vị Quân Lược'}
            </button>
            <button class="dossier-tab-btn ${activeDossierTab === 'kizuna' ? 'active' : ''}" onclick="switchDossierTab('kizuna')">
              ${isEn ? 'Persona & Kizuna' : 'Tâm Tính & Hảo Cảm'}
            </button>
            <button class="dossier-tab-btn ${activeDossierTab === 'biography' ? 'active' : ''}" onclick="switchDossierTab('biography')">
              ${isEn ? 'Chronicle & Biography' : 'Liệt Truyện & Tiểu Sử'}
            </button>
            <button class="dossier-tab-btn ${activeDossierTab === 'assets' ? 'active' : ''}" onclick="switchDossierTab('assets')">
              ${isEn ? 'Assets & Succession' : 'Tài Sản & Kế Thừa'}
            </button>
          </div>

          <!-- 3. Active Tab Stage -->
          <div id="dossier-tab-content" class="dossier-tab-content">
            ${activeDossierTab === 'stats'
              ? tab1Html
              : (activeDossierTab === 'kizuna'
                ? tab2Html
                : (activeDossierTab === 'assets' ? tab4Html : tab3Html))}
          </div>

          <!-- Dynamic Interaction Feedback Box -->
          <div id="dossier-interaction-feedback" class="hidden dossier-feedback"></div>

          <!-- 4. Sticky Action Deck -->
          <div class="dossier-action-footer">
            <div class="dossier-action-copy">
              <div class="dossier-action-title">${isEn ? 'AVAILABLE STRATEGIC INTERACTIONS' : 'HÀNH ĐỘNG GIAO TẾ KHẢ DĨ'}</div>
              <div class="dossier-action-sub">${isCoPresent ? (isEn ? 'Direct (face-to-face)' : 'Trực tiếp (mặt đối mặt)') : (isEn ? 'Remote logistics' : 'Viễn giao / di chuyển')}</div>
            </div>
            <div class="dossier-action-buttons">${actionButtonsHtml}</div>
            <button class="ui-btn dossier-close-btn" onclick="closeNpcDossierModal()">
              ${isEn ? '× Close' : '× Đóng'}
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
        ? `<span style="color: #f87171;">${isEn ? 'Cost:' : 'Chi phí:'} -${r.deltas.cashCost} ${isEn ? 'quan' : 'Quan'}</span>`
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
          <div style="font-size: 11px; color: #34d399; display: flex; gap: 12px; font-variant-numeric: tabular-nums; flex-wrap: wrap;">
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

  // The dossier can sit above the shell-owned world map; Escape must close this
  // top layer, not the map behind it.
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' && event.keyCode !== 27) return;
      const modalEl = document.getElementById('npc-dossier-modal');
      if (!modalEl || modalEl.classList.contains('hidden')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeNpcDossierModal();
    }, true);
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
