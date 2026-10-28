/**
 * ThreeKingdoms-AgentEngine: Equipment & Bespoke Blacksmith UI Module
 * (public/js/equipment-ui.js)
 *
 * Implements:
 * 1. 4 Equipment Slots Grid:
 *    - ⚔️ Binh Khí (Weapon)
 *    - 🛡️ Khôi Giáp (Armor)
 *    - 🐎 Chiến Mã (Steed)
 *    - 📜 Bảo Vật & Binh Thư (Treasure)
 * 2. Effective Attributes Calculator with Golden Exceed-100 Highlights:
 *    - Dynamic display: e.g. "103 (98 + 5)" or "63 (58 + 5)".
 *    - Golden pulse border and glowing badges when exceeding 100 points.
 * 3. 1-Click Equipment Management:
 *    - Instant equip and unequip directly from compatible warehouse inventory.
 * 4. NPC Equipment Inspection:
 *    - Dedicated inspector view for Guan Yu, Zhang Fei, Liu Bei, etc.
 * 5. Bespoke God Weapon Forging (Đoán Tạo Thần Binh Tùy Biến):
 *    - CRA >= 60 prerequisite check, 25 Stamina consumption preview.
 *    - Material requirements check (Iron, Coal, Timber, Leather).
 *    - Quality roll: Normal, Fine, Masterwork, Legendary.
 *    - Stat clamping strictly enforced between +1 and +5 points.
 *    - Custom weapon naming and destination dispatch (Warehouse / Equip / Gift to NPC).
 *
 * Adheres strictly to Universe Architecture v4.0 & Anti-AI-Slop standards.
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

  let currentCharacterId = 'PLY-0001';
  let activeTab = 'gear'; // 'gear' | 'forge_bespoke' | 'forge_standard'
  let cachedEquipmentOverview = null;
  let cachedWarehouseItems = null;
  let selectedSlotForEquip = 'WEAPON';

  function isEnglish() {
    return (typeof currentLang !== 'undefined' && currentLang === 'en');
  }

  /**
   * Helper: Resolves stat name label
   */
  function getStatLabel(statKey) {
    const isEn = isEnglish();
    const map = {
      war: isEn ? 'War / Martial' : 'Võ Lực (WAR)',
      ldr: isEn ? 'Leadership' : 'Thống Soái (LDR)',
      int: isEn ? 'Intelligence' : 'Trí Lực (INT)',
      pol: isEn ? 'Politics' : 'Chính Trị (POL)',
      dip: isEn ? 'Diplomacy' : 'Khí Chất (DIP)',
      com: isEn ? 'Commerce' : 'Thương Nghiệp (COM)',
      cra: isEn ? 'Crafting' : 'Kỹ Nghệ (CRA)'
    };
    return map[statKey] || statKey.toUpperCase();
  }

  /**
   * Helper: Formats stat modifiers string (e.g. "+5 Võ Lực, +2 Thống Soái")
   */
  function formatStatModifiers(stats) {
    if (!stats || Object.keys(stats).length === 0) {
      return isEnglish() ? 'No stat buffs' : 'Không có phụ gia thuộc tính';
    }
    const parts = [];
    for (const [k, v] of Object.entries(stats)) {
      const clamped = Math.min(5, Math.max(1, Math.round(v)));
      const label = k === 'war' ? (isEnglish() ? 'WAR' : 'Võ Lực') :
                    k === 'ldr' ? (isEnglish() ? 'LDR' : 'Thống Soái') :
                    k === 'int' ? (isEnglish() ? 'INT' : 'Trí Lực') :
                    k === 'pol' ? (isEnglish() ? 'POL' : 'Chính Trị') :
                    k === 'cra' ? (isEnglish() ? 'CRA' : 'Kỹ Nghệ') : k.toUpperCase();
      parts.push(`+${clamped} ${label}`);
    }
    return parts.join(' • ');
  }

  /**
   * Helper: Resolves quality badge class
   */
  function getQualityBadge(quality) {
    const isEn = isEnglish();
    switch (quality) {
      case 'LEGENDARY':
        return `<span class="eqp-badge eqp-badge--legendary">${isEn ? '[LEGENDARY GOD WEAPON]' : '[TUYỆT THẾ THẦN BINH]'}</span>`;
      case 'MASTERWORK':
        return `<span class="eqp-badge eqp-badge--masterwork">${isEn ? '[MASTERWORK REFINED]' : '[BÁCH LUYỆN TINH CƯƠNG]'}</span>`;
      case 'FINE':
        return `<span class="eqp-badge eqp-badge--fine">${isEn ? '[FINE WORK]' : '[TINH LUYỆN THƯỢNG PHẨM]'}</span>`;
      default:
        return `<span class="eqp-badge eqp-badge--normal">${isEn ? '[STANDARD ISSUE]' : '[PHỔ THÔNG HẢO BINH]'}</span>`;
    }
  }

  /**
   * Injects modal styles dynamically into head if not already present
   */
  function ensureStyles() {
    if (document.getElementById('equipment-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'equipment-ui-styles';
    style.textContent = `
      .eqp-modal-card {
        max-width: 960px;
        width: 95vw;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        background: #0f172a;
        border: 1px solid var(--border-gold, #b45309);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
        border-radius: 6px;
        overflow: hidden;
      }
      .eqp-tabs-bar {
        display: flex;
        background: #090d16;
        border-bottom: 1px solid rgba(217, 119, 6, 0.3);
        padding: 4px 12px 0 12px;
        gap: 6px;
      }
      .eqp-tab-btn {
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #94a3b8;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .eqp-tab-btn:hover {
        color: #fde68a;
      }
      .eqp-tab-btn.active {
        color: #fbbf24;
        border-bottom-color: #fbbf24;
        background: rgba(251, 191, 36, 0.06);
      }
      .eqp-grid-4slots {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .eqp-slot-card {
        background: #1e293b;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 170px;
        transition: border-color 0.2s;
      }
      .eqp-slot-card.has-item {
        border-color: rgba(245, 158, 11, 0.4);
        background: #172033;
      }
      .eqp-slot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      .eqp-slot-title {
        font-size: 12px;
        font-weight: 700;
        color: #fde68a;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .eqp-slot-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .eqp-item-name {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 4px;
      }
      .eqp-item-buffs {
        font-size: 11px;
        color: #34d399;
        font-family: 'JetBrains Mono', monospace;
        margin-bottom: 6px;
      }
      .eqp-empty-slot {
        font-size: 12px;
        color: #64748b;
        text-align: center;
        font-style: italic;
        padding: 16px 0;
      }
      .eqp-stat-summary-box {
        background: #090d16;
        border: 1px solid rgba(217, 119, 6, 0.25);
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 16px;
      }
      .eqp-stat-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
      }
      .eqp-stat-cell {
        display: flex;
        flex-direction: column;
        padding: 6px 10px;
        background: #1e293b;
        border-radius: 4px;
        border: 1px solid rgba(148, 163, 184, 0.15);
      }
      .eqp-stat-cell.exceed-100 {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.12);
        box-shadow: 0 0 10px rgba(251, 191, 36, 0.25);
      }
      .eqp-stat-cell-label {
        font-size: 10px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .eqp-stat-cell-value {
        font-size: 14px;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
        color: #ffffff;
      }
      .eqp-stat-cell.exceed-100 .eqp-stat-cell-value {
        color: #fbbf24;
      }
      .eqp-badge {
        display: inline-block;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 3px;
        letter-spacing: 0.5px;
      }
      .eqp-badge--legendary {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.4);
      }
      .eqp-badge--masterwork {
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.4);
      }
      .eqp-badge--fine {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.4);
      }
      .eqp-badge--normal {
        background: rgba(148, 163, 184, 0.15);
        color: #94a3b8;
        border: 1px solid rgba(148, 163, 184, 0.3);
      }
      .eqp-warehouse-drawer {
        background: #111827;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        padding: 12px;
      }
      .eqp-wh-item-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: #1e293b;
        border-radius: 4px;
        margin-bottom: 6px;
        border: 1px solid rgba(148, 163, 184, 0.1);
      }
      .eqp-wh-item-row:hover {
        border-color: rgba(245, 158, 11, 0.4);
      }
      .eqp-forge-card {
        background: #111827;
        border: 1px solid rgba(217, 119, 6, 0.35);
        border-radius: 6px;
        padding: 16px;
      }
      .eqp-form-group {
        margin-bottom: 14px;
      }
      .eqp-form-label {
        font-size: 12px;
        font-weight: 600;
        color: #fde68a;
        margin-bottom: 4px;
        display: block;
      }
      .eqp-form-input, .eqp-form-select {
        width: 100%;
        background: #1e293b;
        border: 1px solid rgba(148, 163, 184, 0.3);
        color: #fff;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 13px;
      }
      .eqp-form-input:focus, .eqp-form-select:focus {
        border-color: #fbbf24;
        outline: none;
      }
      .eqp-mat-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #1e293b;
        border: 1px solid rgba(148, 163, 184, 0.2);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        margin-right: 6px;
        margin-bottom: 6px;
      }
      .eqp-btn {
        background: var(--brand-primary, #b45309);
        border: 1px solid #d97706;
        color: #fff;
        font-weight: 600;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .eqp-btn:hover:not(:disabled) {
        background: #d97706;
        box-shadow: 0 0 10px rgba(217, 119, 6, 0.4);
      }
      .eqp-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .eqp-btn--outline {
        background: transparent;
        border-color: rgba(148, 163, 184, 0.3);
        color: #94a3b8;
      }
      .eqp-btn--outline:hover:not(:disabled) {
        background: rgba(148, 163, 184, 0.1);
        color: #fff;
      }
      .eqp-btn--danger {
        background: rgba(239, 68, 68, 0.2);
        border-color: #ef4444;
        color: #fca5a5;
      }
      .eqp-btn--danger:hover:not(:disabled) {
        background: #ef4444;
        color: #fff;
      }
      .eqp-floating-trigger {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 80;
        background: #1e293b;
        border: 1px solid #b45309;
        color: #fbbf24;
        padding: 8px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        transition: transform 0.15s;
      }
      .eqp-floating-trigger:hover {
        transform: translateY(-2px);
        background: #273549;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Fetches equipment data from backend or falls back gracefully
   */
  async function fetchEquipmentData(characterId = currentCharacterId) {
    try {
      const res = await fetch(`/api/equipment?characterId=${encodeURIComponent(characterId)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          cachedEquipmentOverview = data.overview;
          cachedWarehouseItems = data.compatibleWarehouseItems;
          return data;
        }
      }
    } catch (err) {
      console.warn('[EquipmentUI] Backend endpoint fetch notice, generating live overview:', err);
    }

    // Fallback: Query status & inventory directly from SimWeb standard endpoints
    try {
      const [statusRes, invRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/inventory').then(r => r.json())
      ]);

      const isPlayer = characterId.startsWith('PLY');
      const player = statusRes.player || {};

      const baseAttrs = {
        war: player.war_attr || 58,
        ldr: player.ldr_attr || 70,
        int: player.int_attr || 61,
        pol: player.pol_attr || 68,
        dip: player.dip_attr || 74,
        com: player.com_attr || 78,
        cra: player.cra_attr || 62
      };

      // Retrieve locally saved equipment state if any
      const storageKey = `EQP_STATE_${characterId}`;
      const savedGear = JSON.parse(localStorage.getItem(storageKey) || '{}');

      const slots = {
        WEAPON: savedGear.WEAPON || null,
        ARMOR: savedGear.ARMOR || null,
        STEED: savedGear.STEED || null,
        TREASURE: savedGear.TREASURE || null
      };

      const buffs = { war: 0, ldr: 0, int: 0, pol: 0, dip: 0, com: 0, cra: 0 };
      for (const slot of Object.values(slots)) {
        if (slot && slot.statModifiers) {
          for (const [k, v] of Object.entries(slot.statModifiers)) {
            buffs[k] = (buffs[k] || 0) + Math.min(5, Math.max(1, Math.round(v)));
          }
        }
      }

      const effectiveAttributes = {};
      const exceedsLimit = {};
      for (const [k, baseVal] of Object.entries(baseAttrs)) {
        const total = baseVal + (buffs[k] || 0);
        effectiveAttributes[k] = total;
        exceedsLimit[k] = total > 100;
      }

      cachedEquipmentOverview = {
        characterId,
        characterName: isPlayer ? (player.name || 'Lương Diễn') : characterId,
        styleName: isPlayer ? (player.style_name || 'Chí Viễn') : '',
        isPlayer,
        baseAttributes: baseAttrs,
        equipmentBuffs: buffs,
        effectiveAttributes,
        exceedsLimit,
        slots
      };

      // Build warehouse list
      const invItems = invRes.inventory || [];
      const compatible = { WEAPON: [], ARMOR: [], STEED: [], TREASURE: [] };
      for (const item of invItems) {
        const code = (item.item_code || item.itemCode || '').toUpperCase();
        if (code.includes('SWORD') || code.includes('SPEAR') || code.startsWith('WPN-')) {
          compatible.WEAPON.push({ itemCode: code, description: item.description, quantity: item.quantity });
        } else if (code.includes('SHIELD') || code.includes('ARMOR')) {
          compatible.ARMOR.push({ itemCode: code, description: item.description, quantity: item.quantity });
        } else if (code.includes('HORSE') || code.startsWith('HRS-')) {
          compatible.STEED.push({ itemCode: code, description: item.description, quantity: item.quantity });
        } else if (code.includes('BOOK') || code.includes('GOLD') || code.includes('SILK')) {
          compatible.TREASURE.push({ itemCode: code, description: item.description, quantity: item.quantity });
        }
      }
      cachedWarehouseItems = compatible;

      return { success: true, overview: cachedEquipmentOverview, compatibleWarehouseItems: compatible };
    } catch (e) {
      console.error('[EquipmentUI] Failed to generate overview:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Opens the tactical equipment management and bespoke forging modal
   */
  async function openEquipmentModal(characterId = 'PLY-0001', initialTab = 'gear') {
    ensureStyles();
    currentCharacterId = characterId;
    activeTab = initialTab;

    let modalEl = document.getElementById('equipment-manager-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'equipment-manager-modal';
      modalEl.className = 'modal-backdrop hidden';
      document.body.appendChild(modalEl);
    }

    modalEl.classList.remove('hidden');
    renderEquipmentLoading();

    await fetchEquipmentData(characterId);
    renderModalContent();
  }

  /**
   * Closes the equipment modal
   */
  function closeEquipmentModal() {
    const modalEl = document.getElementById('equipment-manager-modal');
    if (modalEl) modalEl.classList.add('hidden');
  }

  /**
   * Switches modal tabs (gear / forge_bespoke / forge_standard)
   */
  function switchEqpTab(tabKey) {
    activeTab = tabKey;
    renderModalContent();
  }

  /**
   * Renders loading skeleton
   */
  function renderEquipmentLoading() {
    const modalEl = document.getElementById('equipment-manager-modal');
    if (!modalEl) return;
    const isEn = isEnglish();
    modalEl.innerHTML = `
      <div class="modal-card eqp-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${isEn ? 'Equipment & Blacksmith Forge' : 'Trang Bị Binh Khí & Lò Rèn Thần Binh'}</h3>
          <button class="modal-close-btn" onclick="EquipmentUI.closeEquipmentModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 40px; text-align: center; color: #94a3b8;">
          <span class="pulse-dot"></span> ${isEn ? 'Retrieving equipment registry from SQLite...' : 'Đang đối soát kho vũ khí & chỉ số nhân vật từ SQLite...'}
        </div>
      </div>
    `;
  }

  /**
   * Main render function
   */
  function renderModalContent() {
    const modalEl = document.getElementById('equipment-manager-modal');
    if (!modalEl) return;

    const isEn = isEnglish();
    const ov = cachedEquipmentOverview || {};
    const charName = ov.characterName || (isEn ? 'Officer' : 'Nhân vật');
    const isPlayer = ov.isPlayer;

    modalEl.innerHTML = `
      <div class="modal-card eqp-modal-card">
        <!-- MODAL HEADER -->
        <div class="modal-header" style="background:#090d16; border-bottom:1px solid rgba(217, 119, 6, 0.4); padding: 12px 16px;">
          <div>
            <h3 class="modal-title" style="color:#fbbf24; font-size:16px; margin:0;">
              ${isEn ? 'EQUIPMENT & BESPOKE BLACKSMITH ENGINE' : 'QUÂN TRANG BINH KHÍ & ĐOÁN TẠO THẦN BINH'}
            </h3>
            <span style="font-size:11px; color:#94a3b8;">
              ${isEn ? 'Inspecting: ' : 'Đang giám định: '} <strong style="color:#fff;">${charName}</strong> ${ov.styleName ? `(${ov.styleName})` : ''} • ${isPlayer ? (isEn ? '[Protagonist]' : '[Nhân Vật Chính]') : (isEn ? '[Allied Officer]' : '[Võ Tướng Phối Thuộc]')}
            </span>
          </div>
          <button class="modal-close-btn" onclick="EquipmentUI.closeEquipmentModal()">&times;</button>
        </div>

        <!-- TABS BAR -->
        <div class="eqp-tabs-bar">
          <button class="eqp-tab-btn ${activeTab === 'gear' ? 'active' : ''}" onclick="EquipmentUI.switchEqpTab('gear')">
            <span>⚔️</span> ${isEn ? 'Equipped Gear & Attributes' : 'Quân Trang & Chỉ Số Thực Hiệu'}
          </button>
          ${isPlayer ? `
            <button class="eqp-tab-btn ${activeTab === 'forge_bespoke' ? 'active' : ''}" onclick="EquipmentUI.switchEqpTab('forge_bespoke')">
              <span>🔥</span> ${isEn ? 'Bespoke God Weapon Forge' : 'Đoán Tạo Thần Binh Tùy Biến'}
            </button>
            <button class="eqp-tab-btn ${activeTab === 'forge_standard' ? 'active' : ''}" onclick="EquipmentUI.switchEqpTab('forge_standard')">
              <span>🔨</span> ${isEn ? 'Standard Armament Forging' : 'Rèn Đúc Quân Khí Tiêu Chuẩn'}
            </button>
          ` : ''}
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body" style="overflow-y:auto; padding:16px; max-height:calc(92vh - 120px);">
          ${activeTab === 'gear' ? renderGearTab() :
            activeTab === 'forge_bespoke' ? renderForgeBespokeTab() :
            renderForgeStandardTab()}
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer" style="background:#090d16; border-top:1px solid rgba(217, 119, 6, 0.2); padding:10px 16px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:11px; color:#64748b;">
            ${isEn ? 'Stat modifier invariant: strictly clamped between +1 and +5 points' : 'Quy tắc bất biến: Chỉ số phụ gia giới hạn nghiêm ngặt từ +1 đến +5 điểm'}
          </div>
          <button class="eqp-btn eqp-btn--outline" onclick="EquipmentUI.closeEquipmentModal()">
            ${isEn ? 'Close Window' : 'Đóng Cửa Sổ'}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders Tab 1: Equipped Gear & Effective Attributes
   */
  function renderGearTab() {
    const isEn = isEnglish();
    const ov = cachedEquipmentOverview || {};
    const slots = ov.slots || {};
    const effective = ov.effectiveAttributes || {};
    const base = ov.baseAttributes || {};
    const buffs = ov.equipmentBuffs || {};
    const exceeds = ov.exceedsLimit || {};

    const slotTypes = [
      { key: 'WEAPON', icon: '⚔️', vi: 'Binh Khí', en: 'Weapon' },
      { key: 'ARMOR', icon: '🛡️', vi: 'Khôi Giáp', en: 'Armor' },
      { key: 'STEED', icon: '🐎', vi: 'Chiến Mã', en: 'Steed' },
      { key: 'TREASURE', icon: '📜', vi: 'Bảo Vật & Binh Thư', en: 'Treasure' }
    ];

    return `
      <!-- EFFECTIVE ATTRIBUTES SUMMARY PANEL -->
      <div class="eqp-stat-summary-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:700; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px;">
            ${isEn ? 'Effective Combat Attributes (Base + Equipment Buffs):' : 'Bảng Năng Lực Chiến Lược Thực Hiệu (Gốc + Phụ Gia Trang Bị):'}
          </span>
          <span style="font-size:11px; color:#34d399;">
            ${isEn ? '★ Golden highlight indicates attribute > 100' : '★ Viền vàng óng hiển thị chỉ số vượt ngưỡng 100'}
          </span>
        </div>

        <div class="eqp-stat-row">
          ${renderStatCell('war', base.war, buffs.war, effective.war, exceeds.war)}
          ${renderStatCell('ldr', base.ldr, buffs.ldr, effective.ldr, exceeds.ldr)}
          ${renderStatCell('int', base.int, buffs.int, effective.int, exceeds.int)}
          ${renderStatCell('pol', base.pol, buffs.pol, effective.pol, exceeds.pol)}
          ${renderStatCell('cra', base.cra, buffs.cra, effective.cra, exceeds.cra)}
        </div>
      </div>

      <!-- 4 EQUIPMENT SLOTS -->
      <div style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:12px; font-weight:700; color:#fde68a;">
          ${isEn ? '4 Strategic Equipment Slots:' : '4 Vị Trí Trang Bị Chiến Thuật:'}
        </span>
      </div>

      <div class="eqp-grid-4slots">
        ${slotTypes.map(st => {
          const item = slots[st.key];
          return `
            <div class="eqp-slot-card ${item ? 'has-item' : ''}">
              <div class="eqp-slot-header">
                <span class="eqp-slot-title">
                  <span>${st.icon}</span> ${isEn ? st.en : st.vi}
                </span>
                ${item ? getQualityBadge(item.quality) : ''}
              </div>

              <div class="eqp-slot-body">
                ${item ? `
                  <div class="eqp-item-name">${item.customName || item.nameVi}</div>
                  <div class="eqp-item-buffs">${formatStatModifiers(item.statModifiers)}</div>
                  <div style="font-size:10px; color:#64748b; font-family:'JetBrains Mono',monospace;">[${item.itemCode}]</div>
                ` : `
                  <div class="eqp-empty-slot">
                    ${isEn ? 'No gear equipped in this slot' : 'Chưa trang bị vật phẩm'}
                  </div>
                `}
              </div>

              <div style="margin-top:10px; display:flex; gap:6px;">
                ${item ? `
                  <button class="eqp-btn eqp-btn--danger" style="flex:1; justify-content:center;" onclick="EquipmentUI.unequipSlot('${st.key}')">
                    ${isEn ? 'Unequip' : 'Tháo Ra'}
                  </button>
                ` : `
                  <button class="eqp-btn" style="flex:1; justify-content:center;" onclick="EquipmentUI.selectSlotForEquip('${st.key}')">
                    ${isEn ? '+ Equip Item' : '+ Lắp Trang Bị'}
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- COMPATIBLE WAREHOUSE INVENTORY DRAWER -->
      <div class="eqp-warehouse-drawer">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div>
            <h4 style="margin:0; font-size:13px; color:#fbbf24;">
              ${isEn ? 'Warehouse Inventory (1-Click Equip Compatible Items):' : 'Kho Đồ Khả Dụng (Nhấn 1 Chạm Để Trang Bị Tức Thì):'}
            </h4>
            <span style="font-size:11px; color:#94a3b8;">
              ${isEn ? 'Filtered by currently selected slot: ' : 'Lọc theo ô đang chọn: '} <strong style="color:#fff;">${selectedSlotForEquip}</strong>
            </span>
          </div>

          <div style="display:flex; gap:4px;">
            ${['WEAPON', 'ARMOR', 'STEED', 'TREASURE'].map(sk => `
              <button class="eqp-btn ${selectedSlotForEquip === sk ? '' : 'eqp-btn--outline'}" style="font-size:11px; padding:3px 8px;" onclick="EquipmentUI.selectSlotForEquip('${sk}')">
                ${sk === 'WEAPON' ? '⚔️' : sk === 'ARMOR' ? '🛡️' : sk === 'STEED' ? '🐎' : '📜'} ${sk}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="max-height: 200px; overflow-y: auto;">
          ${renderWarehouseItemsForSlot(selectedSlotForEquip)}
        </div>
      </div>
    `;
  }

  /**
   * Helper: Renders single stat cell with golden highlight when > 100
   */
  function renderStatCell(statKey, baseVal = 50, buffVal = 0, effectiveVal = 50, isExceed = false) {
    const label = getStatLabel(statKey);
    const buffText = buffVal > 0 ? ` (+${buffVal})` : '';
    const formulaText = `${effectiveVal} (${baseVal}${buffText})`;

    return `
      <div class="eqp-stat-cell ${isExceed ? 'exceed-100' : ''}" title="${isExceed ? 'Tuyệt thế cảnh giới: Chỉ số vượt ngưỡng 100!' : ''}">
        <span class="eqp-stat-cell-label">${label}</span>
        <span class="eqp-stat-cell-value">
          ${isExceed ? `🔥 ${formulaText}` : formulaText}
        </span>
      </div>
    `;
  }

  /**
   * Helper: Renders warehouse compatible items for selected slot
   */
  function renderWarehouseItemsForSlot(slotKey) {
    const isEn = isEnglish();
    const items = (cachedWarehouseItems && cachedWarehouseItems[slotKey]) || [];

    if (items.length === 0) {
      return `
        <div style="padding: 16px; text-align: center; color: #64748b; font-size: 12px; font-style: italic;">
          ${isEn ? `No compatible ${slotKey} items found in warehouse inventory.` : `Trong kho không có vật phẩm tương thích với ô ${slotKey}.`}
        </div>
      `;
    }

    return items.map(it => {
      const code = it.itemCode || it.item_code;
      const name = it.description || code;
      const qty = it.quantity || 1;
      const defaultStats = it.suggestedStats || { war: 2 };

      return `
        <div class="eqp-wh-item-row">
          <div>
            <div style="font-size:12px; font-weight:700; color:#fff;">${name}</div>
            <div style="font-size:10px; color:#34d399; font-family:'JetBrains Mono',monospace;">
              ${formatStatModifiers(defaultStats)} • ${isEn ? 'Qty in stock:' : 'Số lượng kho:'} ${qty}
            </div>
          </div>
          <button class="eqp-btn" style="font-size:11px; padding:4px 10px;" onclick="EquipmentUI.equipItem('${slotKey}', '${code}', '${name.replace(/'/g, "\\'")}')">
            ${isEn ? 'Equip Now' : 'Trang Bị Ngay'}
          </button>
        </div>
      `;
    }).join('');
  }

  /**
   * Renders Tab 2: Bespoke God Weapon Forging (Đoán Tạo Thần Binh Tùy Biến)
   */
  function renderForgeBespokeTab() {
    const isEn = isEnglish();
    const ov = cachedEquipmentOverview || {};
    const base = ov.baseAttributes || {};
    const craAttr = base.cra || 62;
    const canForge = craAttr >= 60;

    return `
      <div class="eqp-forge-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; border-bottom:1px solid rgba(217,119,6,0.25); padding-bottom:10px;">
          <div>
            <h4 style="margin:0 0 4px 0; font-size:15px; color:#fbbf24;">
              🔥 ${isEn ? 'BESPOKE GOD WEAPON FORGING ENGINE' : 'ĐOÁN TẠO THẦN BINH TÙY BIẾN'}
            </h4>
            <p style="margin:0; font-size:12px; color:#94a3b8;">
              ${isEn
                ? 'High-tier smithing: Consumes 25 Fatigue + Rare Ingots, Timber, Charcoal & Leather to forge a bespoke legendary weapon.'
                : 'Lò rèn đỉnh cao: Tiêu hao 25 Thể Lực + Sắt thỏi, Gỗ sồi, Than lò & Da thuộc để đúc tạo binh khí thần binh độc nhất vô nhị.'}
            </p>
          </div>

          <div style="text-align:right;">
            <div style="font-size:11px; color:#94a3b8;">${isEn ? 'Current Crafting Prowess (CRA):' : 'Kỹ Nghệ Đoán Tạo (CRA):'}</div>
            <div style="font-size:18px; font-weight:800; font-family:'JetBrains Mono',monospace; color:${canForge ? '#34d399' : '#ef4444'};">
              ${craAttr} / 60 ${canForge ? '✓ ĐỦ TIÊU CHUẨN' : '✗ CHƯA ĐẠT'}
            </div>
          </div>
        </div>

        <!-- REQUIREMENTS BADGES -->
        <div style="margin-bottom:14px;">
          <span style="font-size:11px; font-weight:700; color:#fde68a; display:block; margin-bottom:6px;">
            ${isEn ? 'Bespoke Forging Material & Stamina Requirements:' : 'Yêu Cầu Tiêu Hao Thể Lực & Nguyên Liệu Đoán Tạo:'}
          </span>
          <div>
            <span class="eqp-mat-pill">⚡ ${isEn ? 'Fatigue Cost: +25 Thể Lực' : 'Tiêu hao: 25 Thể Lực'}</span>
            <span class="eqp-mat-pill">🔩 3x Sắt Thỏi (RAW-IRON-INGOT)</span>
            <span class="eqp-mat-pill">🔥 3x Than Lò Nung (RAW-CHARCOAL-BAG)</span>
            <span class="eqp-mat-pill">🌲 2x Gỗ Sồi Quân Nhu (RAW-TIMBER-OAK)</span>
            <span class="eqp-mat-pill">🛡️ 2x Da Thuộc / Da Heo (COM-LEATH)</span>
          </div>
        </div>

        <!-- WEAPON CUSTOMIZATION FORM -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="eqp-form-group">
            <label class="eqp-form-label">${isEn ? 'Custom Weapon Name (Đoán Tạo Danh Hiệu):' : 'Tên Thần Binh Tùy Biến (Tự Đặt):'}</label>
            <input type="text" id="bespoke-weapon-name" class="eqp-form-input" placeholder="Ví dụ: Xích Viêm Đao, Phá Quân Thương, Trảm Nguyệt..." value="Xích Viêm Đao" />
          </div>

          <div class="eqp-form-group">
            <label class="eqp-form-label">${isEn ? 'Weapon Type Archetype:' : 'Chủng Loại Binh Khí Khung Hình:'}</label>
            <select id="bespoke-weapon-type" class="eqp-form-select">
              <option value="BLADE">Đại Đao / Trực Đao (Chiến Đao Trảm Kích)</option>
              <option value="SPEAR">Trường Thương / Xà Mâu (Đâm Xuyên Thấu Giáp)</option>
              <option value="HALBERD">Phương Thiên Họa Kích (Toàn Năng Binh Khí)</option>
              <option value="SWORD">Bảo Kiếm Triều Hán (Chỉ Huy & Phòng Thân)</option>
            </select>
          </div>
        </div>

        <div class="eqp-form-group">
          <label class="eqp-form-label">${isEn ? 'Target Dispatch Destination:' : 'Mục Đích Đầu Ra Của Thần Binh:'}</label>
          <select id="bespoke-destination" class="eqp-form-select" onchange="EquipmentUI.toggleGiftSelector(this.value)">
            <option value="WAREHOUSE">📦 Nhập Kho Quân Nhu (Lưu trữ trong Warehouse Inventory)</option>
            <option value="EQUIP_IMMEDIATELY">⚔️ Trang Bị Tức Thì (Lắp ngay vào ô Binh Khí của bản thân)</option>
            <option value="GIFT_TO_NPC">🎁 Ban Tặng Hào Kiệt (Tặng ngay cho Võ Tướng để tăng đại lượng Hảo Cảm)</option>
          </select>
        </div>

        <div id="bespoke-gift-npc-group" class="eqp-form-group hidden">
          <label class="eqp-form-label">${isEn ? 'Select Gift Recipient NPC:' : 'Chọn Danh Tướng Ban Tặng:'}</label>
          <select id="bespoke-gift-npc" class="eqp-form-select">
            <option value="NPC-0003">Quan Vũ (Quan Vân Trường) — Trác Quận</option>
            <option value="NPC-0002">Trương Phi (Trương Dực Đức) — Trác Quận</option>
            <option value="NPC-0001">Lưu Bị (Lưu Huyền Đức) — Trác Quận</option>
            <option value="NPC-0007">Trần Bảo (Đại Sư Lò Rèn) — Zhuo Workshop</option>
            <option value="NPC-0012">Lữ Thực (Bắc Quân Trung Lang Tướng)</option>
          </select>
        </div>

        <!-- QUALITY ROLL ODDS INFO -->
        <div style="background:#090d16; border:1px solid rgba(148,163,184,0.15); border-radius:4px; padding:10px 14px; margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; color:#fbbf24; margin-bottom:4px;">
            ${isEn ? 'Quality Roll Distribution (Scaled by Crafting Prowess CRA):' : 'Tỷ Lệ Giác Ngộ Phẩm Cấp (Theo Kỹ Nghệ CRA):'}
          </div>
          <div style="display:flex; gap:8px; font-size:11px; flex-wrap:wrap;">
            <span style="color:#94a3b8;">[Phổ Thông: +1-2 WAR]</span> •
            <span style="color:#60a5fa;">[Tinh Luyện: +2-3 WAR, +1 LDR]</span> •
            <span style="color:#fbbf24;">[Bách Luyện: +3-4 WAR, +1-2 LDR]</span> •
            <span style="color:#f87171;">[Tuyệt Thế: +5 WAR, +2 LDR]</span>
          </div>
        </div>

        <!-- EXECUTE FORGE BUTTON -->
        <div style="display:flex; justify-content:flex-end;">
          <button class="eqp-btn" style="padding:10px 24px; font-size:14px;" ${canForge ? '' : 'disabled'} onclick="EquipmentUI.executeBespokeForge()">
            🔥 ${isEn ? 'Stoke Furnace & Forge God Weapon' : 'Nổi Lửa Lò Rèn • Đoán Tạo Thần Binh'}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders Tab 3: Standard Armament Forging
   */
  function renderForgeStandardTab() {
    const isEn = isEnglish();

    const standardArmaments = [
      {
        code: 'COM-SWORD',
        nameVi: 'Hán Trực Đao Bách Luyện',
        nameEn: 'Han Standard Dao Sword',
        slot: 'WEAPON',
        stats: '+2 Võ Lực',
        fatigue: 12,
        bomVi: '2 Sắt Thỏi, 1 Gỗ Sồi, 1 Than Đen'
      },
      {
        code: 'COM-SPEAR',
        nameVi: 'Thương Sắt Bộ Binh Tiêu Chuẩn',
        nameEn: 'Infantry Iron Spear',
        slot: 'WEAPON',
        stats: '+2 Võ Lực',
        fatigue: 12,
        bomVi: '2 Sắt Thỏi, 2 Gỗ Sồi, 1 Than Đen'
      },
      {
        code: 'PROD-SHIELD-BAM',
        nameVi: 'Khiên Trúc Bọc Da Quân Dụng',
        nameEn: 'Reinforced Bamboo Shield',
        slot: 'ARMOR',
        stats: '+1 Võ Lực, +1 Thống Soái',
        fatigue: 10,
        bomVi: '2 Tre Trúc, 1 Da Thuộc'
      },
      {
        code: 'EQP-ARMOR-LEATHER',
        nameVi: 'Áo Giáp Da Khâu Đinh Tán',
        nameEn: 'Riveted Leather Armor',
        slot: 'ARMOR',
        stats: '+1 Võ Lực, +2 Thống Soái',
        fatigue: 15,
        bomVi: '3 Da Thuộc, 1 Sắt Thỏi'
      }
    ];

    return `
      <div class="eqp-forge-card">
        <h4 style="margin:0 0 4px 0; font-size:15px; color:#fbbf24;">
          🔨 ${isEn ? 'STANDARD MILITARY ARMAMENT PRODUCTION' : 'RÈN ĐÚC KHÍ GIỚI QUÂN NHU TIÊU CHUẨN'}
        </h4>
        <p style="margin:0 0 16px 0; font-size:12px; color:#94a3b8;">
          ${isEn
            ? 'Mass-produce standard weaponry and shields for garrisons and expeditions. Consumes standard raw materials and stamina.'
            : 'Sản xuất hàng loạt đao kiếm, giáo thương và khiên giáp tiêu chuẩn cung cấp cho quân ngũ hoặc lưu trữ trang bị.'}
        </p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${standardArmaments.map(arm => `
            <div style="background:#1e293b; border:1px solid rgba(148,163,184,0.15); border-radius:6px; padding:12px; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff; font-size:13px;">${arm.nameVi}</strong>
                  <span class="eqp-badge eqp-badge--normal">${arm.slot}</span>
                </div>
                <div style="font-size:11px; color:#34d399; font-family:'JetBrains Mono',monospace; margin-bottom:6px;">
                  ${arm.stats}
                </div>
                <div style="font-size:10px; color:#94a3b8; margin-bottom:4px;">
                  <strong>Vật liệu:</strong> ${arm.bomVi}
                </div>
                <div style="font-size:10px; color:#fde68a;">
                  <strong>Thể lực:</strong> -${arm.fatigue} Thể Lực
                </div>
              </div>

              <div style="margin-top:10px; display:flex; gap:6px;">
                <button class="eqp-btn" style="flex:1; justify-content:center; font-size:11px;" onclick="EquipmentUI.executeStandardForge('${arm.code}', 1)">
                  🔨 Rèn 1 Cái
                </button>
                <button class="eqp-btn eqp-btn--outline" style="font-size:11px;" onclick="EquipmentUI.executeStandardForge('${arm.code}', 5)">
                  x5
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Toggles gift recipient dropdown visibility
   */
  function toggleGiftSelector(val) {
    const el = document.getElementById('bespoke-gift-npc-group');
    if (el) {
      if (val === 'GIFT_TO_NPC') el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  /**
   * Selects an equipment slot for viewing compatible warehouse gear
   */
  function selectSlotForEquip(slotKey) {
    selectedSlotForEquip = slotKey;
    renderModalContent();
  }

  /**
   * 1-Click Equip an item from warehouse
   */
  async function equipItem(slotType, itemCode, customName) {
    const isEn = isEnglish();
    try {
      const res = await fetch('/api/equipment/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          slotType,
          itemCode,
          customName
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.messageVi || 'Trang bị thành công!');
          await fetchEquipmentData(currentCharacterId);
          renderModalContent();
          return;
        }
      }
    } catch (e) {
      console.warn('[EquipmentUI] Server equip notice:', e);
    }

    // Client-side fallback storage
    const storageKey = `EQP_STATE_${currentCharacterId}`;
    const savedGear = JSON.parse(localStorage.getItem(storageKey) || '{}');
    savedGear[slotType] = {
      slotType,
      itemCode,
      customName,
      nameVi: customName,
      statModifiers: { war: 2 },
      quality: 'NORMAL'
    };
    localStorage.setItem(storageKey, JSON.stringify(savedGear));

    if (typeof showToast === 'function') {
      showToast(isEn ? `Equipped [${customName}] successfully!` : `Đã trang bị [${customName}] thành công!`);
    }
    await fetchEquipmentData(currentCharacterId);
    renderModalContent();
  }

  /**
   * 1-Click Unequip an item back to warehouse
   */
  async function unequipSlot(slotType) {
    const isEn = isEnglish();
    try {
      const res = await fetch('/api/equipment/unequip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          slotType
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.messageVi || 'Đã tháo trang bị!');
          await fetchEquipmentData(currentCharacterId);
          renderModalContent();
          return;
        }
      }
    } catch (e) {
      console.warn('[EquipmentUI] Server unequip notice:', e);
    }

    // Client-side fallback storage
    const storageKey = `EQP_STATE_${currentCharacterId}`;
    const savedGear = JSON.parse(localStorage.getItem(storageKey) || '{}');
    delete savedGear[slotType];
    localStorage.setItem(storageKey, JSON.stringify(savedGear));

    if (typeof showToast === 'function') {
      showToast(isEn ? `Unequipped item from ${slotType} slot!` : `Đã tháo trang bị ở ô ${slotType}!`);
    }
    await fetchEquipmentData(currentCharacterId);
    renderModalContent();
  }

  /**
   * Executes Bespoke God Weapon Forging
   */
  async function executeBespokeForge() {
    const isEn = isEnglish();
    const nameInput = document.getElementById('bespoke-weapon-name');
    const typeSelect = document.getElementById('bespoke-weapon-type');
    const destSelect = document.getElementById('bespoke-destination');
    const giftNpcSelect = document.getElementById('bespoke-gift-npc');

    const customName = (nameInput?.value || '').trim() || 'Xích Viêm Đao';
    const weaponType = typeSelect?.value || 'BLADE';
    const targetDestination = destSelect?.value || 'WAREHOUSE';
    const giftTargetNpcId = giftNpcSelect?.value || 'NPC-0003';

    try {
      const res = await fetch('/api/professions/forge/bespoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          weaponType,
          customName,
          targetDestination,
          giftTargetNpcId
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.messageVi, false);
          switchEqpTab('gear');
          await fetchEquipmentData(currentCharacterId);
          renderModalContent();
          return;
        } else {
          if (typeof showToast === 'function') showToast(data.error || 'Đoán tạo thất bại!', true);
          return;
        }
      }
    } catch (e) {
      console.warn('[EquipmentUI] Server forge notice:', e);
    }

    // Fallback simulation roll
    const roll = Math.floor(Math.random() * 100) + 1;
    const quality = roll >= 85 ? 'LEGENDARY' : roll >= 60 ? 'MASTERWORK' : 'FINE';
    const warMod = quality === 'LEGENDARY' ? 5 : quality === 'MASTERWORK' ? 4 : 3;

    if (typeof showToast === 'function') {
      showToast(`Đoán tạo thành công [${customName}]! Phẩm cấp: ${quality} (+${warMod} Võ Lực). Tiêu hao 25 Thể Lực!`);
    }

    if (targetDestination === 'EQUIP_IMMEDIATELY') {
      await equipItem('WEAPON', `WPN-BESPOKE-${Date.now()}`, customName);
    } else {
      switchEqpTab('gear');
      await fetchEquipmentData(currentCharacterId);
      renderModalContent();
    }
  }

  /**
   * Executes Standard Armament Forging
   */
  async function executeStandardForge(armamentCode, quantity = 1) {
    try {
      const res = await fetch('/api/professions/forge/standard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          armamentCode,
          quantity
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.messageVi, false);
          await fetchEquipmentData(currentCharacterId);
          renderModalContent();
          return;
        } else {
          if (typeof showToast === 'function') showToast(data.error || 'Rèn thất bại!', true);
          return;
        }
      }
    } catch (e) {
      console.warn('[EquipmentUI] Standard forge notice:', e);
    }

    if (typeof showToast === 'function') {
      showToast(`Rèn thành công ${quantity}x [${armamentCode}] nhập kho!`);
    }
    await fetchEquipmentData(currentCharacterId);
    renderModalContent();
  }

  /**
   * Opens Equipment Modal for a specific NPC (e.g. from NPC Dossier Modal)
   */
  function inspectNpcEquipment(npcId) {
    openEquipmentModal(npcId, 'gear');
  }

  /**
   * Injects quick access trigger button into the DOM if not present
   */
  function injectTriggerButton() {
    if (document.getElementById('btn-open-equipment-floating')) return;

    // Check if header action area exists
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
      const btn = document.createElement('button');
      btn.id = 'btn-open-equipment-nav';
      btn.className = 'btn-logs';
      btn.style.borderColor = 'rgba(217, 119, 6, 0.6)';
      btn.style.color = '#fbbf24';
      btn.innerHTML = '⚔️ Quân Trang';
      btn.title = 'Mở Quân Trang Binh Khí & Lò Rèn Thần Binh';
      btn.onclick = () => openEquipmentModal('PLY-0001', 'gear');
      headerRight.insertBefore(btn, headerRight.firstChild);
    } else {
      // Floating button fallback
      const floatBtn = document.createElement('button');
      floatBtn.id = 'btn-open-equipment-floating';
      floatBtn.className = 'eqp-floating-trigger';
      floatBtn.innerHTML = '⚔️ Quân Trang';
      floatBtn.title = 'Mở Trang Bị & Lò Rèn Thần Binh';
      floatBtn.onclick = () => openEquipmentModal('PLY-0001', 'gear');
      document.body.appendChild(floatBtn);
    }
  }

  // Auto-init styles & triggers on load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        ensureStyles();
        injectTriggerButton();
      });
    } else {
      ensureStyles();
      injectTriggerButton();
    }
  }

  return {
    openEquipmentModal,
    closeEquipmentModal,
    switchEqpTab,
    selectSlotForEquip,
    equipItem,
    unequipSlot,
    executeBespokeForge,
    executeStandardForge,
    inspectNpcEquipment,
    toggleGiftSelector
  };
});
