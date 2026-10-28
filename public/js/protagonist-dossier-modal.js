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
    const cx = 135;
    const cy = 110;
    const r = 68;

    const axes = [
      { key: 'ldr', label: isEn ? 'LDR' : 'Thống Soái', angle: -Math.PI / 2, color: '#c084fc' },
      { key: 'war', label: isEn ? 'WAR' : 'Võ Lực', angle: -Math.PI / 4, color: '#f87171' },
      { key: 'cra', label: isEn ? 'CRA' : 'Kỹ Nghệ', angle: 0, color: '#34d399' },
      { key: 'log', label: isEn ? 'LOG' : 'Hậu Cần', angle: Math.PI / 4, color: '#2dd4bf' },
      { key: 'com', label: isEn ? 'COM' : 'Thương Nghiệp', angle: Math.PI / 2, color: '#fbbf24' },
      { key: 'dip', label: isEn ? 'DIP' : 'Ngoại Giao', angle: (3 * Math.PI) / 4, color: '#f59e0b' },
      { key: 'pol', label: isEn ? 'POL' : 'Chính Trị', angle: Math.PI, color: '#60a5fa' },
      { key: 'int', label: isEn ? 'INT' : 'Trí Lực', angle: (-3 * Math.PI) / 4, color: '#38bdf8' }
    ];

    const rings = [0.25, 0.5, 0.75, 1.0];
    const ringPolygons = rings
      .map((scale) => {
        const pts = axes
          .map((a) => {
            const x = cx + r * scale * Math.cos(a.angle);
            const y = cy + r * scale * Math.sin(a.angle);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ');
        return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
      })
      .join('');

    const axisLines = axes
      .map((a) => {
        const x = cx + r * Math.cos(a.angle);
        const y = cy + r * Math.sin(a.angle);
        return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
      })
      .join('');

    // Base stat polygon (gold outline)
    const basePts = axes
      .map((a) => {
        const val = Math.min(100, Math.max(10, Number(stats[a.key] || 50)));
        const scale = val / 100;
        const x = cx + r * scale * Math.cos(a.angle);
        const y = cy + r * scale * Math.sin(a.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    // Effective stat polygon (buffs included, glowing cyan)
    const effPts = axes
      .map((a) => {
        const base = Number(stats[a.key] || 50);
        const buff = Number(buffs[a.key] || 0);
        const val = Math.min(110, Math.max(10, base + buff));
        const scale = val / 100;
        const x = cx + r * scale * Math.cos(a.angle);
        const y = cy + r * scale * Math.sin(a.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const labels = axes
      .map((a) => {
        const labelR = r + 16;
        const x = cx + labelR * Math.cos(a.angle);
        const y = cy + labelR * Math.sin(a.angle);
        const val = Number(stats[a.key] || 50);
        const buff = Number(buffs[a.key] || 0);
        const total = val + buff;
        return `
          <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="9" font-family="'JetBrains Mono', monospace" fill="${a.color}" font-weight="bold">
            ${a.label.slice(0, 3)} ${total}
          </text>
        `;
      })
      .join('');

    return `
      <svg viewBox="0 0 270 220" width="100%" height="220" style="display: block; margin: 0 auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));">
        ${ringPolygons}
        ${axisLines}
        <polygon points="${basePts}" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2,2" />
        <polygon points="${effPts}" fill="rgba(56, 189, 248, 0.28)" stroke="#38bdf8" stroke-width="2" />
        ${axes
          .map((a) => {
            const base = Number(stats[a.key] || 50);
            const buff = Number(buffs[a.key] || 0);
            const val = Math.min(110, Math.max(10, base + buff));
            const scale = val / 100;
            const x = cx + r * scale * Math.cos(a.angle);
            const y = cy + r * scale * Math.sin(a.angle);
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>`;
          })
          .join('')}
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
      <div class="modal-box modal-box--large" style="max-width: 880px; max-height: 92vh; display: flex; flex-direction: column;">
        <div class="modal-header" style="background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="tactical-badge tactical-badge--gold">★ ${isEn ? 'PROTAGONIST DOSSIER' : 'HỒ SƠ ĐẠI BẢN DOANH'}</span>
            <div class="modal-title" style="letter-spacing: 0.05em; font-size: 14px; font-weight: 700; color: #fbbf24;">
              ${isEn ? 'Commander Profile & 8-Axis Strategic Aptitude' : 'Tổng Hành Dinh • Bát Vị Quân Lược & Hành Trình Cuộc Đời'}
            </div>
          </div>
          <button class="btn-modal-close" onclick="closeProtagonistDossierModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <div style="display: inline-block; width: 28px; height: 28px; border: 2px solid #f59e0b; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px;"></div>
          <div>${isEn ? 'Compiling strategic dossiers from SQLite ACID single source of truth...' : 'Đang tập hợp hồ sơ chiến lược từ cơ sở dữ liệu SQLite...'}</div>
        </div>
      </div>
    `;
    modalEl.classList.remove('hidden');

    try {
      const [statusRes, eqRes, linRes] = await Promise.all([
        fetch('/api/status').then((r) => r.json()),
        fetch('/api/equipment?characterId=PLY-0001').then((r) => r.json()).catch(() => ({})),
        fetch('/api/lineage/status').then((r) => r.json()).catch(() => ({}))
      ]);

      cachedPlayerData = statusRes.player || {};
      cachedEquipmentData = eqRes.overview || { slots: {}, effectiveAttributes: {}, equipmentBuffs: {} };
      cachedLineageData = linRes.overview || {};

      renderModalContent(modalEl);
    } catch (err) {
      modalEl.innerHTML = `
        <div class="modal-box" style="max-width: 500px;">
          <div class="modal-header">
            <span class="tactical-badge tactical-badge--danger">[LỖI]</span>
            <button class="btn-modal-close" onclick="closeProtagonistDossierModal()">&times;</button>
          </div>
          <div class="modal-body" style="padding: 20px; color: #f87171;">
            ${err.message}
          </div>
        </div>
      `;
    }
  }

  function closeProtagonistDossierModal() {
    const modalEl = document.getElementById('protagonist-dossier-modal');
    if (modalEl) modalEl.classList.add('hidden');
  }

  function switchDossierTab(tabKey) {
    activeTabKey = tabKey;
    const modalEl = document.getElementById('protagonist-dossier-modal');
    if (modalEl) renderModalContent(modalEl);
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
      <div class="modal-box modal-box--large" style="max-width: 900px; max-height: 92vh; display: flex; flex-direction: column;">
        <!-- Header -->
        <div class="modal-header" style="background: rgba(15, 23, 42, 0.98); border-bottom: 1px solid rgba(245, 158, 11, 0.3); padding: 14px 20px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #b45309, #78350f); border: 2px solid #fbbf24; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #fef08a; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">
              梁
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 17px; color: #f8fafc; font-weight: 800;">
                  ${p.name || 'Lương Diễn'} <span style="font-size: 13px; color: #94a3b8; font-weight: 400;">(${p.style_name || 'Chí Viễn'})</span>
                </h3>
                <span class="tactical-badge tactical-badge--gold">${p.age || 21} ${isEn ? 'Years Old' : 'Tuổi'}</span>
                <span class="tactical-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
                  ${p.title || (isEn ? 'Penniless Commoner' : 'Bố Y Thường Dân • Khởi Đầu Tay Trắng')}
                </span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                📍 ${isEn ? 'Current Base:' : 'Bản Doanh:'} <strong style="color: #cbd5e1;">${p.permanent_base || 'LOC-0001 (Trác Huyện)'}</strong> •
                ${isEn ? 'Location:' : 'Vị Trí:'} <strong style="color: #38bdf8;">${p.current_location || 'LOC-0001 (Vườn Đào)'}</strong>
              </div>
            </div>
          </div>
          <button class="btn-modal-close" onclick="closeProtagonistDossierModal()">&times;</button>
        </div>

        <!-- Vitals Telemetry Row -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px 20px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(34, 197, 94, 0.2);">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #86efac;">🩸 ${isEn ? 'Health' : 'Sinh Lực'}</span>
              <strong style="color: #22c55e;">${p.health || 100}/100</strong>
            </div>
            <div class="tactical-progress-track" style="height: 5px;">
              <div class="tactical-progress-bar" style="width: ${p.health || 100}%; background: #22c55e;"></div>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2);">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #7dd3fc;">⚡ ${isEn ? 'Stamina' : 'Thể Lực'}</span>
              <strong style="color: #38bdf8;">${staminaProfile.currentStamina}/${staminaProfile.maxStamina}</strong>
            </div>
            <div class="tactical-progress-track" style="height: 5px;">
              <div class="tactical-progress-bar" style="width: ${staminaProfile.staminaPct}%; background: ${staminaProfile.staminaPct > 45 ? '#38bdf8' : staminaProfile.staminaPct > 20 ? '#fbbf24' : '#ef4444'};"></div>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.2);">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #fde047;">🔥 ${isEn ? 'Morale' : 'Sĩ Khí'}</span>
              <strong style="color: #fbbf24;">${p.morale || 100}%</strong>
            </div>
            <div class="tactical-progress-track" style="height: 5px;">
              <div class="tactical-progress-bar" style="width: ${p.morale || 100}%; background: #fbbf24;"></div>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(168, 85, 247, 0.2);">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #d8b4fe;">💤 ${isEn ? 'Fatigue' : 'Mệt Mỏi'}</span>
              <strong style="color: ${staminaProfile.fatigue > 70 ? '#ef4444' : '#c084fc'};">${staminaProfile.fatigue}/100</strong>
            </div>
            <div class="tactical-progress-track" style="height: 5px;">
              <div class="tactical-progress-bar" style="width: ${staminaProfile.fatigue}%; background: ${staminaProfile.fatigue > 70 ? '#ef4444' : '#a855f7'};"></div>
            </div>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="grand-hub-subnav" style="padding: 10px 20px 0; background: rgba(15, 23, 42, 0.9);">
          <button class="grand-hub-subnav-btn ${activeTabKey === 'attributes' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('attributes')">
            <span class="hub-subnav-seal">八</span> ${isEn ? '8-Axis Aptitude & Radar' : 'Bát Hướng Thuộc Tính & Radar'}
          </button>
          <button class="grand-hub-subnav-btn ${activeTabKey === 'armaments' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('armaments')">
            <span class="hub-subnav-seal">武</span> ${isEn ? 'Armaments & Master Gear' : 'Quân Trang & Thần Binh'}
          </button>
          <button class="grand-hub-subnav-btn ${activeTabKey === 'wealth' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('wealth')">
            <span class="hub-subnav-seal">業</span> ${isEn ? 'Enterprises & Treasury' : 'Sản Nghiệp & Ngân Khố'}
          </button>
          <button class="grand-hub-subnav-btn ${activeTabKey === 'lineage' ? 'active' : ''}" onclick="window.ProtagonistDossierModal.switchTab('lineage')">
            <span class="hub-subnav-seal">家</span> ${isEn ? 'Clan & Life Destiny' : 'Gia Tộc & Phẩm Lộ'}
          </button>
        </div>

        <!-- Tab Content Body -->
        <div class="modal-body" style="padding: 18px 20px; overflow-y: auto; flex: 1;">
          ${renderActiveTabBody(activeTabKey, p, stats, buffs, eq, lin, isEn)}
        </div>

        <!-- Footer -->
        <div class="modal-footer" style="padding: 12px 20px; background: rgba(15, 23, 42, 0.95); border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11.5px; color: var(--text-muted);">
            ${isEn ? 'ACID Verified: Single transactional truth maintained in SQLite.' : 'Dữ liệu chuẩn hóa 100% theo sổ cái SQLite ACID.'}
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="tactical-btn tactical-btn--sm" onclick="closeProtagonistDossierModal(); if(window.GrandCommandHubUI){GrandCommandHubUI.open('career');}">
              🏛️ ${isEn ? 'Enter Command Hub' : 'Vào Đại Bản Doanh'} →
            </button>
            <button class="btn btn-outline" onclick="closeProtagonistDossierModal()">${isEn ? 'Close' : 'Đóng'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderActiveTabBody(tabKey, p, stats, buffs, eq, lin, isEn) {
    if (tabKey === 'attributes') {
      const statConfigs = [
        { key: 'int', nameVi: 'Trí Lực', nameEn: 'Intelligence', descVi: 'Mưu lược sách lược, bào chế dược liệu' },
        { key: 'pol', nameVi: 'Chính Trị', nameEn: 'Politics', descVi: 'Nội trị điền địa, phủ dụ nhân tâm' },
        { key: 'war', nameVi: 'Võ Lực', nameEn: 'Warfare', descVi: 'Đơn đả độc đấu, quyết định thể lực tối đa' },
        { key: 'ldr', nameVi: 'Thống Soái', nameEn: 'Command', descVi: 'Chỉ huy quân đoàn, sĩ khí ba quân' },
        { key: 'dip', nameVi: 'Ngoại Giao', nameEn: 'Diplomacy', descVi: 'Thuyết khách du thuyết, liên minh chư hầu' },
        { key: 'com', nameVi: 'Thương Nghiệp', nameEn: 'Commerce', descVi: 'Buôn chuyến thương đoàn, thặng dư lợi nhuận' },
        { key: 'log', nameVi: 'Hậu Cần', nameEn: 'Logistics', descVi: 'Vận chuyển quân lương, lộ trình hành quân' },
        { key: 'cra', nameVi: 'Kỹ Nghệ', nameEn: 'Crafting', descVi: 'Đoán tạo thần binh, chế tác đồ dùng' }
      ];

      return `
        <div style="display: grid; grid-template-columns: 290px 1fr; gap: 18px; align-items: start;">
          <!-- Left: Radar Chart -->
          <div class="tactical-card" style="padding: 14px; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; color: #fbbf24; margin-bottom: 4px;">
              ${isEn ? '8-AXIS STRATEGIC RADAR' : 'BÁT HƯỚNG QUÂN CƠ ĐỒ'}
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 6px;">
              <span style="color: #f59e0b;">- -</span> ${isEn ? 'Base' : 'Căn Bản'} • <span style="color: #38bdf8;">—</span> ${isEn ? 'With Gear' : 'Kèm Binh Khí'}
            </div>
            ${generateRadarChartSvg(stats, buffs, isEn)}
          </div>

          <!-- Right: Detailed Attribute Cards Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            ${statConfigs.map(c => {
              const baseVal = Number(stats[c.key] || 50);
              const buffVal = Number(buffs[c.key] || 0);
              const totalVal = baseVal + buffVal;
              const expVal = Number(p[`${c.key}_exp`] || 0);
              const rank = getStatRank(totalVal);
              return `
                <div class="tactical-card" style="padding: 10px 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div>
                      <strong style="font-size: 13px; color: #f1f5f9;">${isEn ? c.nameEn : c.nameVi}</strong>
                      <span style="font-size: 10px; color: ${rank.color}; margin-left: 4px;">[${isEn ? rank.en : rank.vi}]</span>
                    </div>
                    <div>
                      <span style="font-size: 14px; font-weight: 800; color: #38bdf8;">${totalVal}</span>
                      ${buffVal > 0 ? `<span style="font-size: 10.5px; color: #4ade80;"> (+${buffVal})</span>` : ''}
                    </div>
                  </div>
                  <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 6px;">
                    ${c.descVi}
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: var(--text-muted); margin-bottom: 2px;">
                    <span>EXP Tiến Cấp:</span>
                    <span>${expVal}/100</span>
                  </div>
                  <div class="tactical-progress-track" style="height: 4px;">
                    <div class="tactical-progress-bar" style="width: ${expVal}%; background: #38bdf8;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
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
            <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="closeProtagonistDossierModal(); if(window.GrandCommandHubUI){GrandCommandHubUI.open('gear');}">
              🔨 ${isEn ? 'Bespoke Forge & Armory' : 'Đoán Tạo & Cải Tạo Lò Rèn'} →
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
              <div style="font-size: 18px; font-weight: 800; color: #4ade80; margin: 4px 0;">${formatNumber(liquidCash)} Qian</div>
              <div style="font-size: 10px; color: var(--text-muted);">${isEn ? 'Used for daily trade, wage, dowry' : 'Dùng giao dịch, ẩm thực, sính lễ'}</div>
            </div>

            <div class="tactical-card" style="padding: 12px; border-left: 3px solid #38bdf8;">
              <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Enterprise Safe Cash' : 'Tiền Két Sản Nghiệp'}</div>
              <div style="font-size: 18px; font-weight: 800; color: #38bdf8; margin: 4px 0;">${formatNumber(safeCash)} Qian</div>
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
              <button class="tactical-btn tactical-btn--sm" onclick="closeProtagonistDossierModal(); if(window.GrandCommandHubUI){GrandCommandHubUI.open('enterprise');}">
                ${isEn ? 'Manage Enterprises' : 'Quản Lý Sản Nghiệp'} →
              </button>
            </div>
            <div style="font-size: 11.5px; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 6px;">
              💼 <b>Lương Gia Bách Nghệ Xưởng & Trác Thành Khách Điếm</b> • Hoạt động tự chủ, đều đặn tạo dòng tiền thặng dư vào két an toàn mỗi chu kỳ chuyển tháng.
            </div>
          </div>
        </div>
      `;
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
              <strong style="font-size: 12px; color: #ec4899;">🌸 Chính Thê & Thê Thiếp</strong>
              <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                ${spouses.length > 0 ? spouses.map(s => `• <b>${s.spouse_name_vi}</b> (${s.household_role || 'Chủ Nội Gia'})`).join('<br>') : 'Chưa lập gia thất (Bố Y Độc Thân). Hãy tương ngộ giai nhân tại các châu huyện để dạm ngõ sính lễ.'}
              </div>
            </div>

            <div class="tactical-card" style="padding: 12px;">
              <strong style="font-size: 12px; color: #38bdf8;">👶 Thế Tử & Con Cái</strong>
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

  window.ProtagonistDossierModal = {
    open: openProtagonistDossierModal,
    close: closeProtagonistDossierModal,
    switchTab: switchDossierTab
  };

  window.openProtagonistDossierModal = openProtagonistDossierModal;
  window.closeProtagonistDossierModal = closeProtagonistDossierModal;
})();
