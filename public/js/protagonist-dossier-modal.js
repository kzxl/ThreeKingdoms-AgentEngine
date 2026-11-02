/**
 * ThreeKingdoms-AgentEngine: Protagonist Strategic Dossier Modal
 * (public/js/protagonist-dossier-modal.js)
 *
 * Implements:
 * - Comprehensive ROTK-style Protagonist Strategic Character Sheet
 * - 8-Axis SVG Radar Chart comparing Base Attributes vs Effective Attributes
 * - Equipment Slots (Weapon, Armor, Steed, Treasure) with Stat Modifiers
 * - Financial Ledger & Enterprise Ownership Dashboard
 * - Clan Generation, Marriage, and Heirs Lineage Status
 * - Full bilingual support (VI / EN)
 */

(function () {
  'use strict';

  let activeTabKey = 'attributes';
  let cachedPlayerData = null;
  let cachedEquipmentData = null;
  let cachedLineageData = null;
  let cachedSkills = [];
  let cachedTalents = [];
  let cachedConditions = [];

  function isEnglish() {
    return window.currentLang === 'en';
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString();
  }

  function getStatRank(val) {
    if (val >= 90) return { vi: 'Tuyệt Thế', en: 'Peerless', color: '#f59e0b' };
    if (val >= 75) return { vi: 'Kiệt Xuất', en: 'Exceptional', color: '#c084fc' };
    if (val >= 60) return { vi: 'Khá Tốt', en: 'Proficient', color: '#38bdf8' };
    if (val >= 45) return { vi: 'Bình Thường', en: 'Average', color: '#94a3b8' };
    return { vi: 'Sơ Khai', en: 'Novice', color: '#64748b' };
  }

  function generateRadarChartSvg(stats, buffs, isEn) {
    const cx = 160;
    const cy = 135;
    const r = 88;

    const axes = [
      { key: 'ldr', label: 'LDR', angle: -Math.PI / 2, color: '#c084fc' },
      { key: 'war', label: 'WAR', angle: -Math.PI / 4, color: '#f87171' },
      { key: 'cra', label: 'CRA', angle: 0, color: '#34d399' },
      { key: 'log', label: 'LOG', angle: Math.PI / 4, color: '#2dd4bf' },
      { key: 'com', label: 'COM', angle: Math.PI / 2, color: '#fbbf24' },
      { key: 'dip', label: 'DIP', angle: (3 * Math.PI) / 4, color: '#f59e0b' },
      { key: 'pol', label: 'POL', angle: Math.PI, color: '#60a5fa' },
      { key: 'int', label: 'INT', angle: (-3 * Math.PI) / 4, color: '#38bdf8' }
    ];

    const ringPolygons = [0.25, 0.5, 0.75, 1.0].map((scale) => {
      const pts = axes.map((a) => {
        const x = cx + r * scale * Math.cos(a.angle);
        const y = cy + r * scale * Math.sin(a.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    }).join('');

    const axisLines = axes.map((a) => {
      const x = cx + r * Math.cos(a.angle);
      const y = cy + r * Math.sin(a.angle);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
    }).join('');

    const basePts = axes.map((a) => {
      const val = Math.min(100, Math.max(10, Number(stats[a.key] || 50)));
      const scale = val / 100;
      const x = cx + r * scale * Math.cos(a.angle);
      const y = cy + r * scale * Math.sin(a.angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const effectivePoints = axes.map((a) => {
      const base = Number(stats[a.key] || 50);
      const buff = Number(buffs[a.key] || 0);
      const val = Math.min(110, Math.max(10, base + buff));
      const scale = val / 100;
      return {
        x: cx + r * scale * Math.cos(a.angle),
        y: cy + r * scale * Math.sin(a.angle)
      };
    });
    const effPts = effectivePoints.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

    const labels = axes.map((a) => {
      const labelR = r + 22;
      const x = cx + labelR * Math.cos(a.angle);
      const y = cy + labelR * Math.sin(a.angle);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-family="'JetBrains Mono', monospace" fill="${a.color}" font-weight="bold">${a.label}</text>`;
    }).join('');

    return `
      <svg class="dossier-radar-svg" viewBox="0 0 320 270" role="img" aria-label="${isEn ? 'Eight-axis strategic radar' : 'Bát hướng quân cơ đồ'}">
        ${ringPolygons}
        ${axisLines}
        <polygon points="${basePts}" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="3,3" />
        <polygon points="${effPts}" fill="rgba(56, 189, 248, 0.22)" stroke="#38bdf8" stroke-width="2" />
        ${effectivePoints.map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>`).join('')}
        ${labels}
      </svg>
    `;
  }

  async function openProtagonistDossierModal() {
    const isEn = isEnglish();

    let modalEl = document.getElementById('protagonist-dossier-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'protagonist-dossier-modal';
      modalEl.className = 'modal-backdrop hidden';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large dossier-modal">
        <div class="modal-header dossier-modal-header">
          <div class="dossier-modal-title-row">
            <span class="tactical-badge tactical-badge--primary">${isEn ? '[PROTAGONIST DOSSIER]' : '[HỒ SƠ ĐẠI BẢN DOANH]'}</span>
            <div class="modal-title dossier-modal-title">${isEn ? 'Commander Profile & Eight-Axis Aptitude' : 'Tổng Hành Dinh • Bát Vị Quân Lược'}</div>
          </div>
          <button class="btn-modal-close" onclick="closeProtagonistDossierModal()" title="${isEn ? 'Close' : 'Đóng'}">&times;</button>
        </div>
        <div class="modal-body dossier-body">
          <div class="text-center py-8 text-muted">
            <div class="dossier-loading-spinner" aria-hidden="true"></div>
            <div>${isEn ? 'Compiling strategic dossiers from SQLite ACID single source of truth...' : 'Đang tập hợp hồ sơ chiến lược từ cơ sở dữ liệu SQLite...'}</div>
          </div>
        </div>
      </div>
    `;
    if (typeof nextModalZIndex === 'function') {
      modalEl.style.zIndex = String(nextModalZIndex());
    }
    modalEl.classList.remove('hidden');

    try {
      const [statusRes, eqRes, linRes, skillRes, conditionRes] = await Promise.all([
        fetch('/api/status').then((r) => r.json()),
        fetch('/api/equipment?characterId=PLY-0001').then((r) => r.json()).catch(() => ({})),
        fetch('/api/lineage/status').then((r) => r.json()).catch(() => ({})),
        fetch('/api/skills').then((r) => r.json()).catch(() => ({})),
        fetch('/api/conditions?characterId=PLY-0001').then((r) => r.json()).catch(() => ({}))
      ]);

      cachedPlayerData = statusRes.player || {};
      cachedEquipmentData = eqRes.overview || { slots: {}, effectiveAttributes: {}, equipmentBuffs: {} };
      cachedLineageData = linRes.overview || {};
      cachedSkills = skillRes.skills || [];
      cachedTalents = skillRes.talents || [];
      cachedConditions = conditionRes.conditions || [];

      renderModalContent(modalEl);
    } catch (err) {
      modalEl.innerHTML = `
        <div class="modal-box dossier-modal">
          <div class="modal-header dossier-modal-header">
            <span class="tactical-badge tactical-badge--danger">[LỖI]</span>
            <button class="btn-modal-close" onclick="closeProtagonistDossierModal()">&times;</button>
          </div>
          <div class="modal-body dossier-body text-red-300">
            ${err.message}
          </div>
        </div>
      `;
    }
  }

  function renderModalContent(modalEl) {
    const isEn = isEnglish();
    const p = cachedPlayerData || {};
    const eq = cachedEquipmentData || {};
    const lin = cachedLineageData || {};

    const staminaProfile = typeof window.calculateStamina === 'function'
      ? window.calculateStamina(p)
      : {
          currentStamina: Math.max(0, 100 - Number(p.fatigue || 0)),
          maxStamina: 100,
          fatigue: Number(p.fatigue || 0),
          staminaPct: 100
        };

    const stats = {
      int: Number(p.int_attr || 50),
      pol: Number(p.pol_attr || 50),
      war: Number(p.war_attr || 50),
      ldr: Number(p.ldr_attr || 50),
      dip: Number(p.dip_attr || 50),
      com: Number(p.com_attr || 50),
      log: Number(p.log_attr || 50),
      cra: Number(p.cra_attr || 50)
    };

    const buffs = eq.equipmentBuffs || {};

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large dossier-modal">
        <div class="modal-header dossier-modal-header">
          <div class="dossier-modal-title-row">
            <span class="tactical-badge tactical-badge--primary">${isEn ? '[PROTAGONIST DOSSIER]' : '[HỒ SƠ ĐẠI BẢN DOANH]'}</span>
            <div class="modal-title dossier-modal-title">${p.name || 'Lương Diễn'} • ${p.style_name || 'Chí Viễn'}</div>
          </div>
          <button class="btn-modal-close" onclick="closeProtagonistDossierModal()" title="${isEn ? 'Close' : 'Đóng'}">&times;</button>
        </div>

        <div class="modal-body dossier-body">
          <div class="dossier-header">
            <div class="dossier-portrait-frame ${p.portrait_url ? 'is-unlocked' : ''}">
              ${p.portrait_url
                ? `<img class="dossier-portrait-img" src="${p.portrait_url}" alt="${p.name || 'Lương Diễn'}" loading="lazy" />`
                : `<span class="dossier-portrait-seal">梁</span>`}
            </div>

            <div class="dossier-identity">
              <div class="dossier-name-row">
                <span class="dossier-name">${p.name || 'Lương Diễn'}</span>
                <span class="dossier-name-han">(${p.style_name || 'Chí Viễn'})</span>
              </div>
              <div class="dossier-meta">${p.title || (isEn ? 'Penniless Commoner' : 'Bố Y Thường Dân • Khởi Đầu Tay Trắng')}</div>
              <div class="dossier-chip-row">
                <span class="dossier-chip">${p.current_location || 'LOC-0001 (Vườn Đào)'}</span>
                <span class="dossier-chip dossier-chip--muted">${isEn ? 'Base' : 'Bản doanh'}: ${p.permanent_base || 'LOC-0001 (Trác Huyện)'}</span>
                <span class="dossier-pill-badge dossier-pill-badge--gold">${p.age || 21} ${isEn ? 'yrs' : 'tuổi'}</span>
              </div>
            </div>

            <div class="dossier-kizuna">
              <div class="dossier-meter">
                <div class="dossier-meter-head">
                  <span>${isEn ? 'Health' : 'Sinh lực'}</span>
                  <strong class="is-affinity">${p.health || 100}/100</strong>
                </div>
                <div class="dossier-meter-track">
                  <div class="dossier-meter-fill is-affinity" style="width: ${Math.max(0, Math.min(100, Number(p.health || 100)))}%;"></div>
                </div>
              </div>

              <div class="dossier-meter">
                <div class="dossier-meter-head">
                  <span>${isEn ? 'Stamina' : 'Thể lực'}</span>
                  <strong class="is-stamina">${staminaProfile.currentStamina}/${staminaProfile.maxStamina}</strong>
                </div>
                <div class="dossier-meter-track">
                  <div class="dossier-meter-fill is-stamina" style="width: ${Math.max(0, Math.min(100, staminaProfile.staminaPct))}%;"></div>
                </div>
              </div>

              <div class="dossier-meter">
                <div class="dossier-meter-head">
                  <span>${isEn ? 'Morale' : 'Sĩ khí'}</span>
                  <strong class="is-morale">${p.morale || 100}%</strong>
                </div>
                <div class="dossier-meter-track">
                  <div class="dossier-meter-fill is-morale" style="width: ${Math.max(0, Math.min(100, Number(p.morale || 100)))}%;"></div>
                </div>
              </div>
            </div>
          </div>

          ${typeof renderConditionChips === 'function' ? renderConditionChips(cachedConditions, isEn) : ''}

          ${p.illustration_url
            ? `<div class="dossier-illustration-frame is-inset">
                 <img class="dossier-illustration-img" src="${p.illustration_url}" alt="${p.name || 'Lương Diễn'}" loading="lazy" />
               </div>`
            : ''}

          <div class="dossier-tab-bar dossier-tab-bar--sticky">
            <button class="dossier-tab-btn ${activeTabKey === 'attributes' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('attributes')">
              ${isEn ? 'Eight Axes' : 'Bát Vị'}
            </button>
            <button class="dossier-tab-btn ${activeTabKey === 'armaments' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('armaments')">
              ${isEn ? 'Armaments' : 'Quân Trang'}
            </button>
            <button class="dossier-tab-btn ${activeTabKey === 'wealth' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('wealth')">
              ${isEn ? 'Assets' : 'Sản Nghiệp'}
            </button>
            <button class="dossier-tab-btn ${activeTabKey === 'lineage' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('lineage')">
              ${isEn ? 'Lineage' : 'Gia Tộc'}
            </button>
            <button class="dossier-tab-btn ${activeTabKey === 'skills' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('skills')">
              ${isEn ? 'Skills' : 'Kỹ Năng'}
            </button>
          </div>

          <div class="dossier-tab-content">
            ${renderActiveTabBody(activeTabKey, p, stats, buffs, eq, lin, isEn)}
          </div>

          <div class="dossier-action-footer">
            <div class="dossier-action-copy">
              <div class="dossier-action-title">${isEn ? 'SQLite single source of truth' : 'Sổ cái SQLite ACID'}</div>
              <div class="dossier-action-sub">${isEn ? 'Every number comes from the authoritative session database.' : 'Mọi số liệu lấy từ cơ sở dữ liệu phiên chơi chuẩn.'}</div>
            </div>
            <div class="dossier-action-buttons">
              <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="closeProtagonistDossierModal(); if(window.GrandCommandHubUI){GrandCommandHubUI.open('career');}">
                ${isEn ? 'Command Hub' : 'Đại Bản Doanh'}
              </button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="closeProtagonistDossierModal()">${isEn ? 'Close' : 'Đóng'}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderActiveTabBody(tabKey, p, stats, buffs, eq, lin, isEn) {
    if (tabKey === 'attributes') {
      const statConfigs = [
        { key: 'ldr', nameVi: 'Thống Soái', nameEn: 'Command', descVi: 'Chỉ huy quân đoàn, sĩ khí ba quân' },
        { key: 'war', nameVi: 'Võ Lực', nameEn: 'Warfare', descVi: 'Đơn đả độc đấu, quyết định thể lực tối đa' },
        { key: 'cra', nameVi: 'Kỹ Nghệ', nameEn: 'Crafting', descVi: 'Đoán tạo thần binh, chế tác đồ dùng' },
        { key: 'int', nameVi: 'Trí Lực', nameEn: 'Intelligence', descVi: 'Mưu lược sách lược, bào chế dược liệu' },
        { key: 'pol', nameVi: 'Chính Trị', nameEn: 'Politics', descVi: 'Nội trị điền địa, phủ dụ nhân tâm' },
        { key: 'dip', nameVi: 'Ngoại Giao', nameEn: 'Diplomacy', descVi: 'Thuyết khách du thuyết, liên minh chư hầu' },
        { key: 'com', nameVi: 'Thương Nghiệp', nameEn: 'Commerce', descVi: 'Buôn chuyến thương đoàn, thặng dư lợi nhuận' },
        { key: 'log', nameVi: 'Hậu Cần', nameEn: 'Logistics', descVi: 'Vận chuyển quân lương, lộ trình hành quân' }
      ];

      return `
        <div class="dossier-stats-layout">
          <section class="dossier-radar-card">
            <div class="dossier-section-title">${isEn ? 'EIGHT-AXIS STRATEGIC RADAR' : 'BÁT VỊ QUÂN LƯỢC'}</div>
            ${generateRadarChartSvg(stats, buffs, isEn)}
            <div class="dossier-radar-note">
              <span style="color: #f59e0b;">- -</span> ${isEn ? 'Base' : 'Căn bản'} •
              <span style="color: #38bdf8;">—</span> ${isEn ? 'With gear' : 'Kèm binh khí'}
            </div>
          </section>

          <section class="dossier-stat-grid" aria-label="${isEn ? 'Eight attributes' : 'Bát vị quân lược'}">
            ${statConfigs.map(c => {
              const baseVal = Number(stats[c.key] || 50);
              const buffVal = Number(buffs[c.key] || 0);
              const totalVal = baseVal + buffVal;
              const expVal = Number(p[`${c.key}_exp`] || 0);
              const rank = getStatRank(totalVal);
              const width = Math.max(0, Math.min(100, totalVal));
              return `
                <div class="dossier-stat-row" role="group" aria-label="${isEn ? c.nameEn : c.nameVi}: ${totalVal}" title="${c.descVi}">
                  <span class="dossier-stat-name">
                    ${isEn ? c.nameEn : c.nameVi}
                    <small class="dossier-stat-exp">EXP ${expVal}/100</small>
                  </span>
                  <span class="dossier-stat-val" style="color: ${rank.color};">
                    ${totalVal}${buffVal > 0 ? `<small class="dossier-stat-buff">+${buffVal}</small>` : ''}
                  </span>
                  <div class="dossier-stat-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${width}">
                    <div class="dossier-stat-bar-fill" style="width: ${width}%; background-color: ${rank.color};"></div>
                  </div>
                  <span class="dossier-stat-rank">${isEn ? rank.en : rank.vi}</span>
                </div>
              `;
            }).join('')}
          </section>
        </div>
      `;
    }

    if (tabKey === 'armaments') {
      const slots = eq.slots || {};
      const slotList = [
        { slot: 'WEAPON', seal: '兵', nameVi: 'Binh Khí Cận Chiến', nameEn: 'Primary Weapon' },
        { slot: 'ARMOR', seal: '甲', nameVi: 'Khôi Giáp Phòng Hộ', nameEn: 'Tactical Armor' },
        { slot: 'STEED', seal: '馬', nameVi: 'Chiến Mã Kỵ Binh', nameEn: 'War Steed' },
        { slot: 'TREASURE', seal: '策', nameVi: 'Bảo Vật & Binh Thư', nameEn: 'Strategic Treasure' }
      ];

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <strong style="color: #f1f5f9; font-size: 13px;">${isEn ? 'Active Battlefield Armaments (Clamped to [+1..+5]):' : 'Trang Bị Chiến Trận Thực Chiến (Giới hạn bảo toàn [+1..+5]):'}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">
                ${isEn ? 'Equipment dynamically boosts effective attributes and enables legendary combat perks.' : 'Binh khí gia tăng trực tiếp thuộc tính chiến đấu và mở khóa tuyệt kỹ trong lôi đài 1v1.'}
              </div>
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="closeProtagonistDossierModal(); if(window.GrandCommandHubUI){GrandCommandHubUI.open('gear');}">
              鍛 ${isEn ? 'Bespoke Forge & Armory' : 'Đoán Tạo & Cải Tạo Lò Rèn'} →
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${slotList.map(s => {
              const item = slots[s.slot];
              return `
                <div class="tactical-card ${item ? 'has-item' : 'empty-slot'}" style="padding: 14px; border-left: 3px solid ${item ? '#f59e0b' : '#475569'};">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="hub-seal-badge">${s.seal}</span>
                      <div>
                        <strong style="color: #f1f5f9; font-size: 13px;">${isEn ? s.nameEn : s.nameVi}</strong>
                        <div style="font-size: 10px; color: var(--text-muted);">${s.slot}</div>
                      </div>
                    </div>
                    ${item ? `<span class="tactical-badge tactical-badge--${item.quality ? item.quality.toLowerCase() : 'common'}">${item.quality || 'PHỔ THÔNG'}</span>` : ''}
                  </div>

                  ${item ? `
                    <div style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 4px;">
                      ${item.customName || item.nameVi || item.nameEn}
                    </div>
                    <div style="font-size: 11px; color: #38bdf8; margin-bottom: 6px;">
                      ${item.statModifiers ? Object.entries(item.statModifiers).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' • ') : 'Không có thuộc tính gia tăng'}
                    </div>
                    <div style="font-size: 10px; color: var(--text-muted); font-style: italic;">
                      ${item.loreDescVi || item.descriptionVi || 'Binh khí do thợ rèn Trác Quận đúc nên.'}
                    </div>
                  ` : `
                    <div style="padding: 18px 0; text-align: center; color: var(--text-muted); font-size: 11.5px;">
                      [${isEn ? 'Empty Slot • Visit Blacksmith to Forge' : 'Ô Trống • Chưa Trang Bị Thần Binh'}]
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (tabKey === 'wealth') {
      const liquidCash = Number(p.liquid_cash || 0);
      const safeCash = Number(p.safe_cash || 0);
      const totalCash = liquidCash + safeCash;
      const grain = Number(p.strategic_grain || 0);

      return `
        <div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
            <div class="tactical-card" style="padding: 12px; border-left: 3px solid #22c55e;">
              <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Mobile Liquid Cash' : 'Tiền Mặt Lưu Động'}</div>
              <div style="font-size: 18px; font-weight: 800; color: #4ade80; margin: 4px 0;">${formatNumber(liquidCash)} quan</div>
              <div style="font-size: 10px; color: var(--text-muted);">${isEn ? 'Used for daily trade, wage, dowry' : 'Dùng giao dịch, ẩm thực, sính lễ'}</div>
            </div>

            <div class="tactical-card" style="padding: 12px; border-left: 3px solid #38bdf8;">
              <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Enterprise Safe Cash' : 'Tiền Két Sản Nghiệp'}</div>
              <div style="font-size: 18px; font-weight: 800; color: #38bdf8; margin: 4px 0;">${formatNumber(safeCash)} quan</div>
              <div style="font-size: 10px; color: var(--text-muted);">${isEn ? 'Safe cash reserve for workshops' : 'Vốn vận hành xưởng an toàn'}</div>
            </div>

            <div class="tactical-card" style="padding: 12px; border-left: 3px solid #fbbf24;">
              <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Strategic March Grain' : 'Lương Thảo Quân Lương'}</div>
              <div style="font-size: 18px; font-weight: 800; color: #fbbf24; margin: 4px 0;">${grain.toFixed(2)} Thạch</div>
              <div style="font-size: 10px; color: var(--text-muted);">${isEn ? 'Required for inter-city travel' : 'Tiêu hao khi hành quân chuyển dịch'}</div>
            </div>
          </div>

          <div class="tactical-card" style="padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div>
                <strong style="color: #f1f5f9; font-size: 13px;">${isEn ? 'Enterprises & Facilities Profile' : 'Danh Mục Cơ Sở Sản Nghiệp Đang Sở Hữu'}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">
                  ${isEn ? 'Collect accumulated production profits and manage facility workforce.' : 'Thu hồi thặng dư lợi nhuận kinh doanh và phân công thợ cả.'}
                </div>
              </div>
              <button class="ui-btn ui-btn--sm" onclick="closeProtagonistDossierModal(); if(window.EnterpriseUI){EnterpriseUI.openEnterpriseModal('owner');}else if(window.PersonalJournalUI){PersonalJournalUI.open('chronicle');}">
                ${isEn ? 'Manage Enterprises' : 'Quản Lý Sản Nghiệp'} →
              </button>
            </div>
            <div style="font-size: 11.5px; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 6px;">
              商 <b>Lương Gia Bách Nghệ Xưởng & Trác Thành Khách Điếm</b> • Hoạt động tự chủ, đều đặn tạo dòng tiền thặng dư vào két an toàn mỗi chu kỳ chuyển tháng.
            </div>
          </div>
        </div>
      `;
    }

    if (tabKey === 'skills') {
      const effectLabel = (effect) => {
        const value = Number(effect.value || 0);
        switch (effect.effectType) {
          case 'CHECK_BONUS': return `${isEn ? 'Check' : 'Kiểm tra'} +${value}`;
          case 'TRADE_MARGIN': return `${isEn ? 'Trade margin' : 'Biên thương vụ'} +${Math.round(value * 100)}%`;
          case 'DEFECT_REDUCTION': return `${isEn ? 'Defect' : 'Phế phẩm'} -${Math.round(value * 100)}%`;
          case 'TRAVEL_SPEED': return `${isEn ? 'Travel speed' : 'Tốc độ đi'} +${Math.round(value * 100)}%`;
          case 'DUEL_POWER': return `${isEn ? 'Duel power' : 'Uy lực đơn đả'} +${value}`;
          case 'SIEGE_POWER': return `${isEn ? 'Siege power' : 'Uy lực công thành'} +${value}`;
          case 'MORALE_BONUS': return `${isEn ? 'Morale' : 'Sĩ khí'} +${value}`;
          default: return `${effect.effectType} +${value}`;
        }
      };
      const talentHtml = (cachedTalents || []).map((talent) => {
        const effects = (talent.effects && talent.effects.length > 0 ? talent.effects : [talent])
          .map(effectLabel)
          .join(' • ');
        const description = String((isEn ? talent.descriptionEn : talent.descriptionVi) || '').replace(/"/g, '&quot;');
        const rarity = talent.rarity ? `${talent.rarity} · ` : '';
        return `<span class="dossier-skill-perk is-chosen" title="${description}">${rarity}${isEn ? talent.nameEn : talent.nameVi} · ${effects}</span>`;
      }).join('');
      const talentRow = talentHtml
        ? `<div class="dossier-skill-row"><div class="dossier-skill-head"><strong>${isEn ? 'Innate Talents' : 'Thiên Phú Bẩm Sinh'}</strong></div><div class="dossier-skill-perks">${talentHtml}</div></div>`
        : '';
      const rows = cachedSkills.map((skill) => {
        const pct = Math.min(100, Math.round((Number(skill.currentExp || 0) / Math.max(1, Number(skill.maxExp || 1))) * 100));
        const effects = (skill.effects || []).map(effectLabel).join(' • ');
        const perks = (skill.perks || []).map((perk) => {
          const label = `T${perk.tier} · ${isEn ? perk.nameEn : perk.nameVi}`;
          if (perk.chosen) return `<span class="dossier-skill-perk is-chosen">${label}</span>`;
          if (perk.tier <= skill.tier) {
            return `<button class="dossier-skill-perk is-ready" onclick="window.ProtagonistDossierModal.choosePerk('${perk.perkCode}')">${isEn ? 'Choose' : 'Chọn'} ${label}</button>`;
          }
          return `<span class="dossier-skill-perk is-locked">${label}</span>`;
        }).join('');
        return `
          <div class="dossier-skill-row">
            <div class="dossier-skill-head">
              <strong>${isEn ? skill.nameEn : skill.nameVi}</strong>
              <span class="dossier-skill-tier">T${skill.tier}</span>
            </div>
            <div class="dossier-skill-meta">${skill.domain} • ${skill.primaryAttr} • ${skill.currentExp}/${skill.maxExp} EXP</div>
            <progress class="dossier-skill-progress" value="${pct}" max="100"></progress>
            <div class="dossier-skill-effects">${effects || (isEn ? 'No active effect yet' : 'Chưa có hiệu ứng')}</div>
            <div class="dossier-skill-perks">${perks}</div>
          </div>
        `;
      }).join('');
      return `<div class="dossier-skill-list">${talentRow}${rows || `<div class="quest-empty">${isEn ? 'No skills learned yet.' : 'Chưa học kỹ năng nào.'}</div>`}</div>`;
    }

    if (tabKey === 'lineage') {
      const clan = lin.clan || {};
      const spouses = lin.spouses || [];
      const children = lin.children || [];

      return `
        <div>
          <div class="tactical-card" style="padding: 14px; margin-bottom: 14px; border-left: 3px solid #a855f7;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div>
                <strong style="color: #f1f5f9; font-size: 14px;">${clan.family_name_vi || 'Lương Thị Dòng Họ'}</strong>
                <div style="font-size: 11px; color: #fbbf24; margin-top: 2px;">
                  "${clan.family_motto_vi || 'Đôn Bản Khởi Gia • Trạch Bị Thiên Hạ'}"
                </div>
              </div>
              <span class="tactical-badge tactical-badge--gold">Đời Thứ: ${clan.current_generation || 1}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              Uy danh gia tộc: <b style="color: #38bdf8;">${clan.family_prestige || 100} Điểm</b> •
              Thê thiếp: <b style="color: #ec4899;">${spouses.length} Người</b> •
              Hậu duệ: <b style="color: #4ade80;">${children.length} Người</b>
            </div>
          </div>

          <!-- Spouses & Heirs Quick Preview -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div class="tactical-card" style="padding: 12px;">
              <strong style="font-size: 12px; color: #ec4899;">花 Chính Thê & Thê Thiếp</strong>
              <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                ${spouses.length > 0 ? spouses.map(s => `• <b>${s.spouse_name_vi}</b> (${s.household_role || 'Chủ Nội Gia'})`).join('<br>') : 'Chưa lập gia thất (Bố Y Độc Thân). Hãy tương ngộ giai nhân tại các châu huyện để dạm ngõ sính lễ.'}
              </div>
            </div>

            <div class="tactical-card" style="padding: 12px;">
              <strong style="font-size: 12px; color: #38bdf8;">子 Thế Tử & Con Cái</strong>
              <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                ${children.length > 0 ? children.map(c => `• <b>${c.child_name_vi}</b> (${c.age} tuổi) ${c.is_heir ? '<span style="color:#fbbf24;">[ĐÍCH TÔN]</span>' : ''}`).join('<br>') : 'Chưa có hậu duệ kế nghiệp. Thành thân và đồng phòng dưỡng tức để sinh hạ thế tử.'}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' && event.keyCode !== 27) return;
    const modalEl = document.getElementById('protagonist-dossier-modal');
    if (!modalEl || modalEl.classList.contains('hidden')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeProtagonistDossierModal();
  }, true);

  window.ProtagonistDossierModal = {
    open: openProtagonistDossierModal,
    close: closeProtagonistDossierModal,
    switchTab: switchDossierTab,
    choosePerk
  };

  window.openProtagonistDossierModal = openProtagonistDossierModal;
  window.closeProtagonistDossierModal = closeProtagonistDossierModal;
})();
