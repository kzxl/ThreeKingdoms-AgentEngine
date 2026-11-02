/**
 * ThreeKingdoms-AgentEngine: Spatial POI Controller Module (public/js/spatial-poi-controller.js)
 * Implements physically-grounded action dock updates and contextual feature dispatching:
 * - Adapts #btn-spatial-action, #spatial-action-seal, #txt-spatial-action based on active POI.
 * - Delegates actions to on-site modals: Bespoke Forge, Tavern, Martial Arena, Caravans, Residence.
 * - Syncs automatically with local walking and world-map travel.
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpatialPoiController = factory();
    Object.assign(root, root.SpatialPoiController);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let currentSubLocation = 'Vườn Đào';

  const POI_CONFIGS = {
    SMITHY: {
      key: 'SMITHY',
      icon: 'hammer',
      text: 'Lò Rèn',
      title: 'Thiết Điếm Trác Huyện • Kéo Bễ & Rèn Thần Binh Độc Bản (Bespoke Forge)',
      btnClass: 'spatial-smithy',
      action: () => {
        if (window.EquipmentUI && typeof window.EquipmentUI.openEquipmentModal === 'function') {
          window.EquipmentUI.openEquipmentModal('PLY-0001', 'forge_bespoke');
        } else {
          showFallbackToast('Đang mở Lò Rèn Thiết Điếm...');
        }
      }
    },
    TAVERN: {
      key: 'TAVERN',
      icon: 'tea',
      text: 'Tửu Quán',
      title: 'Tửu Quán Trác Huyện • Ẩm Tửu, Mở Đại Yến Hào Kiệt & Kết Bái Huynh Đệ',
      btnClass: 'spatial-tavern',
      action: () => {
        if (window.SpatialPoiModals && typeof window.SpatialPoiModals.openTavernModal === 'function') {
          window.SpatialPoiModals.openTavernModal();
        } else {
          showFallbackToast('Đang mở Tửu Quán Trác Huyện...');
        }
      }
    },
    ARENA: {
      key: 'ARENA',
      icon: 'sword',
      text: 'Lôi Đài',
      title: 'Lôi Đài Giáo Trường • Tỉ Võ Cùng Trương Phi & Thách Đấu Lôi Đài 3 Cấp Độ',
      btnClass: 'spatial-arena',
      action: () => {
        if (window.SpatialPoiModals && typeof window.SpatialPoiModals.openArenaModal === 'function') {
          window.SpatialPoiModals.openArenaModal();
        } else {
          showFallbackToast('Đang mở Lôi Đài Giáo Trường...');
        }
      }
    },
    CARAVAN: {
      key: 'CARAVAN',
      icon: 'cart',
      text: 'Dịch Trạm',
      title: 'Mã Xa Dịch Trạm • Mua Xe Ngựa, Thuê Hộ Vệ & Xuất Phát Thương Đoàn Viễn Chinh',
      btnClass: 'spatial-caravan',
      action: () => {
        if (window.CaravanUI) {
          if (typeof window.CaravanUI.open === 'function') {
            window.CaravanUI.open('dispatch');
          } else if (typeof window.CaravanUI.openCaravanModal === 'function') {
            window.CaravanUI.openCaravanModal('dispatch');
          }
        } else {
          showFallbackToast('Đang mở Thương Hội Dịch Trạm...');
        }
      }
    },
    RESIDENCE: {
      key: 'RESIDENCE',
      icon: 'house',
      text: 'Gia Thất',
      title: 'Tư Trạch Vườn Đào • Nghỉ Ngơi Phòng Trong, Đàm Đạo Phu Nhân & Dạy Dỗ Thế Tử',
      btnClass: 'spatial-residence',
      action: () => {
        if (window.SpatialPoiModals && typeof window.SpatialPoiModals.openResidenceModal === 'function') {
          window.SpatialPoiModals.openResidenceModal();
        } else {
          showFallbackToast('Đang mở Nội Viện Tư Trạch...');
        }
      }
    },
    WORKSHOP: {
      key: 'WORKSHOP',
      icon: 'gear',
      text: 'Xưởng Gia',
      title: 'Xưởng Lương Thị • Quản Lý Thợ Cả, Chế Tác & Nâng Cấp Sản Nghiệp',
      btnClass: 'spatial-workshop',
      action: () => {
        if (window.EnterpriseUI && typeof window.EnterpriseUI.openEnterpriseModal === 'function') {
          window.EnterpriseUI.openEnterpriseModal('owner');
        } else {
          showFallbackToast('Đang mở Xưởng Lương Thị...');
        }
      }
    },
    MARKET: {
      key: 'MARKET',
      icon: 'coin',
      text: 'Sạp Trà',
      title: 'Chợ Đông Môn & Sạp Trà • Thưởng Trà Đàm Đạo Cùng Quan Vũ & Giao Thương',
      btnClass: 'spatial-market',
      action: () => {
        openMarketAction();
      }
    }
  };

  function showFallbackToast(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log(msg);
  }

  function resolvePoiType(locName) {
    const s = (locName || '').toLowerCase();
    if (s.includes('thiết điếm') || s.includes('lò rèn') || s.includes('smithy') || s.includes('forge')) {
      return 'SMITHY';
    }
    if (s.includes('tửu quán') || s.includes('quán rượu') || s.includes('tavern')) {
      return 'TAVERN';
    }
    if (s.includes('lôi đài') || s.includes('giáo trường') || s.includes('arena') || s.includes('drill')) {
      return 'ARENA';
    }
    if (s.includes('dịch trạm') || s.includes('mã xa') || s.includes('depot') || s.includes('caravan')) {
      return 'CARAVAN';
    }
    if (s.includes('tư trạch') || s.includes('manor') || s.includes('residence') || s.includes('lương phủ')) {
      return 'RESIDENCE';
    }
    if (s.includes('vườn đào') || s.includes('peach garden')) {
      return 'RESIDENCE';
    }
    if (s.includes('xưởng') || s.includes('workshop')) {
      return 'WORKSHOP';
    }
    if (s.includes('chợ') || s.includes('sạp trà') || s.includes('đông môn') || s.includes('market')) {
      return 'MARKET';
    }
    return 'RESIDENCE';
  }

  function updateActionDock(location = currentSubLocation) {
    currentSubLocation = location || 'Vườn Đào';
    const poiType = resolvePoiType(currentSubLocation);
    const config = POI_CONFIGS[poiType] || POI_CONFIGS.RESIDENCE;

    const btn = document.getElementById('btn-spatial-action');
    const sealEl = document.getElementById('spatial-action-seal');
    const txtEl = document.getElementById('txt-spatial-action');

    if (sealEl) sealEl.innerHTML = (typeof uiIcon === 'function') ? uiIcon(config.icon) : config.icon;
    if (txtEl) txtEl.innerText = config.text;

    if (btn) {
      btn.title = config.title;
      // Reset spatial classes
      btn.className = 'btn-spatial-action';
      btn.classList.add(config.btnClass);
    }
  }

  function triggerActivePoiAction() {
    const poiType = resolvePoiType(currentSubLocation || window.activeSubLocation);
    const config = POI_CONFIGS[poiType] || POI_CONFIGS.RESIDENCE;
    if (typeof config.action === 'function') {
      config.action();
    }
  }

  async function openMarketAction() {
    // Market interaction: talk to Guan Yu or trade
    if (typeof dispatchQuickAction === 'function') {
      dispatchQuickAction('Thưởng trà tại Sạp Trà Chợ Đông Môn và đàm đạo thời cuộc cùng Quan Vũ');
    } else {
      showFallbackToast('Thưởng trà cùng Quan Vũ tại Chợ Đông Môn');
    }
  }

  function init() {
    // Intercept or hook into window.renderSceneFromData or window.loadScene
    const initialLoc = window.activeSubLocation || 'Vườn Đào';
    updateActionDock(initialLoc);

    // Watch for location changes via custom event or observer
    window.addEventListener('sim:scene_loaded', (e) => {
      if (e.detail && e.detail.subLocation) {
        updateActionDock(e.detail.subLocation);
      }
    });
  }

  // Self initialize on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init());
    } else {
      setTimeout(() => init(), 100);
    }
  }

  async function assertPresence(allowedPoiTypes, actionNameVi, defaultTargetLoc = 'Thiết Điếm Trác Huyện') {
    const curType = resolvePoiType(currentSubLocation || window.activeSubLocation);
    if (!allowedPoiTypes.includes(curType)) {
      showFallbackToast(`[Khóa Chặn Không Gian] Đang ở [${currentSubLocation}]. Thao tác [${actionNameVi}] yêu cầu bước chân tới [${defaultTargetLoc}]!`);
      return false;
    }
    return true;
  }

  async function exploreCurrentPoi() {
    try {
      const currentName = currentSubLocation || window.activeSubLocation;
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: currentName,
          poiName: currentName,
          idempotencyKey: `explore-${currentName}-${Date.now()}`
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Khảo sát thất bại');
      // The controller wraps the service payload in `result`.
      const result = data.result || data;
      const text = result.discovered
        ? `Khám phá: ${result.item?.nameVi || result.item?.itemCode || 'vật phẩm'} (cấp ${result.item?.tier || 1})`
        : (result.narrativeVi || `Không tìm thấy gì. Danh vọng ${Number(result.fame || 0)}.`);
      if (typeof showToast === 'function') showToast(text, !result.discovered);
      if (typeof loadStatus === 'function') await loadStatus();
      if (typeof loadDeckInventory === 'function') await loadDeckInventory();
    } catch (err) {
      if (typeof showToast === 'function') showToast(`[LỖI] ${err.message}`, true);
    }
  }

  let marketBoard = null;
  let marketExpandedItem = null;
  const marketFilters = { search: '', category: '', pressure: '', sort: 'price-desc' };

  const MARKET_CATEGORY_LABELS = {
    FINISHED_GOOD: 'Thành phẩm',
    FOOD_STUFF: 'Lương thực',
    LIVESTOCK: 'Gia súc',
    MEDICINE: 'Dược phẩm',
    MILITARY_EQUIPMENT: 'Quân khí',
    RAW_MATERIAL: 'Nguyên liệu',
    'Raw Material': 'Nguyên liệu',
    STOCK: 'Vật tư tồn',
    TOOL: 'Công cụ',
    License: 'Giấy phép'
  };

  function marketEsc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatMarketNumber(value) {
    return Number(value || 0).toLocaleString('vi-VN');
  }

  function marketCategoryLabel(code) {
    return MARKET_CATEGORY_LABELS[code] || code || 'Khác';
  }

  function marketSparkline(history, width = 120, height = 32) {
    const values = (history || []).map(point => Number(point.stockMultiplier ?? point.stock_multiplier) || 1);
    if (values.length < 2) return '<span class="market-pulse-history">—</span>';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pad = 3;
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = (height - pad) - ((value - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const rising = values[values.length - 1] >= values[0];
    return `<svg class="market-pulse-chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${points}" fill="none" stroke="${rising ? '#f59e0b' : '#38bdf8'}" stroke-width="1.6" vector-effect="non-scaling-stroke"></polyline>
    </svg>`;
  }

  function marketPressureBadge(item) {
    if (item.crisisActive) {
      return `<span class="market-pressure market-pressure--crisis">Khủng hoảng</span>`;
    }
    if (item.pressure === 'SCARCE') {
      return `<span class="market-pressure market-pressure--scarce">Khan hiếm</span>`;
    }
    if (item.pressure === 'SURPLUS') {
      return `<span class="market-pressure market-pressure--surplus">Dư thừa</span>`;
    }
    return `<span class="market-pressure market-pressure--normal">Ổn định</span>`;
  }

  function marketChangeLabel(item) {
    const change = Number(item.changePct || 0);
    const cls = change > 0 ? 'is-up' : change < 0 ? 'is-down' : 'is-flat';
    const sign = change > 0 ? '+' : '';
    return `<span class="market-change ${cls}">${sign}${change}%</span>`;
  }

  function marketOpportunityCell(item) {
    const opportunity = item.opportunity;
    if (!opportunity) return '<span class="market-pulse-history">—</span>';
    return `
      <div class="market-opportunity">
        <strong>${marketEsc(opportunity.bestDestinationNameVi || opportunity.bestDestination)}</strong>
        <span>+${Number(opportunity.marginPercent || 0)}% • ${formatMarketNumber(opportunity.distanceLi)} dặm</span>
      </div>
    `;
  }

  function marketDetailRow(item) {
    if (marketExpandedItem !== item.itemCode) return '';
    const opportunity = item.opportunity;
    return `
      <tr class="market-detail-row">
        <td colspan="7">
          <div class="market-detail-grid">
            <div class="market-detail-chart">
              <div class="market-detail-title">Diễn biến hệ số tồn kho</div>
              ${marketSparkline(item.history, 320, 84)}
              <div class="market-detail-dates">
                ${(item.history || []).length > 1
                  ? `${marketEsc(item.history[0].gameDate)} → ${marketEsc(item.history[item.history.length - 1].gameDate)}`
                  : 'Chưa đủ dữ liệu lịch sử'}
              </div>
            </div>
            <div class="market-detail-stats">
              <div class="market-detail-stat"><span>Giá hiện tại</span><strong>${formatMarketNumber(item.currentPrice)} Quan</strong></div>
              <div class="market-detail-stat"><span>Giá gốc</span><strong>${formatMarketNumber(item.basePrice)} Quan</strong></div>
              <div class="market-detail-stat"><span>Tồn / Cầu</span><strong>${formatMarketNumber(item.stock)} / ${formatMarketNumber(item.demand)}</strong></div>
              <div class="market-detail-stat"><span>Tồn của bạn</span><strong>${formatMarketNumber(item.playerQuantity)}</strong></div>
              <div class="market-detail-stat"><span>Áp lực</span>${marketPressureBadge(item)}</div>
            </div>
            <div class="market-detail-opportunity">
              <div class="market-detail-title">Thương vụ tốt nhất</div>
              ${opportunity ? `
                <div class="market-detail-dest">${marketEsc(opportunity.bestDestinationNameVi || opportunity.bestDestination)}</div>
                <div class="market-detail-line">Bán ${formatMarketNumber(opportunity.sellPrice)} Quan • lời ${formatMarketNumber(opportunity.unitMargin)}/đơn vị</div>
                <div class="market-detail-line is-positive">+${Number(opportunity.marginPercent || 0)}% • ${formatMarketNumber(opportunity.distanceLi)} dặm</div>
              ` : '<div class="market-detail-line text-muted">Không có chênh lệch đáng kể ở thời điểm này.</div>'}
            </div>
          </div>
          <div class="market-detail-note">Giá đã gồm đặc sản địa phương, tồn kho, endowment vùng và giá thế giới. Bấm Mua/Bán để mở phiếu giao dịch.</div>
        </td>
      </tr>
    `;
  }

  function marketTableRow(item) {
    const expanded = marketExpandedItem === item.itemCode;
    return `
      <tr class="market-row${expanded ? ' is-expanded' : ''}" data-market-row="${marketEsc(item.itemCode)}">
        <td>
          <div class="market-item-name">${marketEsc(item.nameVi)}</div>
          <div class="market-item-meta">${marketEsc(item.itemCode)} • ${marketEsc(marketCategoryLabel(item.category))}${item.crisisActive ? ' • khủng hoảng' : ''}</div>
        </td>
        <td class="num">
          <div class="market-price">${formatMarketNumber(item.currentPrice)}</div>
          <div class="market-base">gốc ${formatMarketNumber(item.basePrice)} ${marketChangeLabel(item)}</div>
        </td>
        <td class="num">${formatMarketNumber(item.stock)} / ${formatMarketNumber(item.demand)}</td>
        <td>${marketPressureBadge(item)}</td>
        <td class="market-trend">${marketSparkline(item.history)}</td>
        <td>${marketOpportunityCell(item)}</td>
        <td class="market-actions">
          <button class="market-action-btn is-buy" data-market-act="BUY" data-market-code="${marketEsc(item.itemCode)}" data-market-price="${Number(item.currentPrice || 0)}">Mua</button>
          <button class="market-action-btn is-sell" data-market-act="SELL" data-market-code="${marketEsc(item.itemCode)}" data-market-price="${Number(item.currentPrice || 0)}" ${Number(item.playerQuantity || 0) > 0 ? '' : 'disabled'}>
            Bán${Number(item.playerQuantity || 0) > 0 ? ` (${formatMarketNumber(item.playerQuantity)})` : ''}
          </button>
        </td>
      </tr>
      ${marketDetailRow(item)}
    `;
  }

  function getFilteredMarketItems() {
    if (!marketBoard) return [];
    const search = marketFilters.search.trim().toLowerCase();
    let items = (marketBoard.items || []).filter(item => {
      if (search) {
        const haystack = `${item.nameVi} ${item.itemCode} ${item.category} ${marketCategoryLabel(item.category)}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (marketFilters.category && item.category !== marketFilters.category) return false;
      if (marketFilters.pressure === 'CRISIS' && !item.crisisActive) return false;
      if (marketFilters.pressure && marketFilters.pressure !== 'CRISIS' && item.pressure !== marketFilters.pressure) return false;
      return true;
    });
    const byName = (a, b) => String(a.nameVi).localeCompare(String(b.nameVi), 'vi');
    switch (marketFilters.sort) {
      case 'price-asc':
        items.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case 'margin-desc':
        items.sort((a, b) => Number(b.opportunity?.marginPercent || -1) - Number(a.opportunity?.marginPercent || -1));
        break;
      case 'stock-asc':
        items.sort((a, b) => a.stock - b.stock);
        break;
      case 'name':
        items.sort(byName);
        break;
      default:
        items.sort((a, b) => b.currentPrice - a.currentPrice);
    }
    return items;
  }

  function bindMarketRowEvents() {
    const body = document.getElementById('market-pulse-body');
    if (!body) return;
    body.querySelectorAll('[data-market-row]').forEach(row => {
      row.addEventListener('click', () => {
        const itemCode = row.getAttribute('data-market-row');
        marketExpandedItem = marketExpandedItem === itemCode ? null : itemCode;
        updateMarketTable();
      });
    });
    body.querySelectorAll('[data-market-act]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        const mode = button.getAttribute('data-market-act');
        const itemCode = button.getAttribute('data-market-code') || '';
        const price = Number(button.getAttribute('data-market-price') || 0);
        if (typeof window.openQuickTrade === 'function') {
          window.openQuickTrade(mode, itemCode, 1, price);
        }
      });
    });
  }

  function updateMarketTable() {
    const tbody = document.getElementById('market-board-rows');
    const countEl = document.getElementById('market-board-count');
    if (!tbody || !marketBoard) return;
    const items = getFilteredMarketItems();
    tbody.innerHTML = items.length > 0
      ? items.map(marketTableRow).join('')
      : `<tr><td colspan="7" class="market-pulse-empty">Không có mặt hàng khớp bộ lọc.</td></tr>`;
    if (countEl) countEl.textContent = `${items.length}/${marketBoard.items.length} mặt hàng`;
    bindMarketRowEvents();
  }

  function bindMarketBoard() {
    const body = document.getElementById('market-pulse-body');
    if (!body) return;
    const search = document.getElementById('market-board-search');
    const category = document.getElementById('market-board-category');
    const pressure = document.getElementById('market-board-pressure');
    const sort = document.getElementById('market-board-sort');
    const apply = () => {
      marketFilters.search = search?.value || '';
      marketFilters.category = category?.value || '';
      marketFilters.pressure = pressure?.value || '';
      marketFilters.sort = sort?.value || 'price-desc';
      updateMarketTable();
    };
    search?.addEventListener('input', apply);
    category?.addEventListener('change', apply);
    pressure?.addEventListener('change', apply);
    sort?.addEventListener('change', apply);
    body.querySelector('[data-market-refresh]')?.addEventListener('click', () => openMarketPulse());
  }

  function renderMarketBoard() {
    const body = document.getElementById('market-pulse-body');
    if (!body || !marketBoard) return;
    const summary = marketBoard.summary || {};
    const best = summary.bestOpportunity;
    body.innerHTML = `
      <div class="market-board">
        <div class="market-board-lead">
          <div class="lead-seal">市</div>
          <div class="lead-text">
            <h3>${marketEsc(marketBoard.settlementNameVi)} • Bảng Giá Địa Phương</h3>
            <div class="text-muted text-sm">
              ${marketEsc(marketBoard.provinceVi || '')} • ngày ${marketEsc(marketBoard.gameDate || '')} •
              giá đã gồm đặc sản, tồn kho và endowment vùng
            </div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-market-refresh>Làm mới</button>
        </div>

        <div class="market-board-summary">
          <div class="market-summary-card">
            <span>Tổng mặt hàng</span>
            <strong>${formatMarketNumber(summary.total)}</strong>
          </div>
          <div class="market-summary-card is-scarce">
            <span>Khan hiếm</span>
            <strong>${formatMarketNumber(summary.scarce)}</strong>
          </div>
          <div class="market-summary-card is-surplus">
            <span>Dư thừa</span>
            <strong>${formatMarketNumber(summary.surplus)}</strong>
          </div>
          <div class="market-summary-card is-opportunity">
            <span>Thương vụ chênh lệch</span>
            <strong>${formatMarketNumber(summary.opportunities)}</strong>
          </div>
          <div class="market-summary-card is-best">
            <span>Lời nhất</span>
            <strong>${best ? marketEsc(best.itemNameVi) : '—'}</strong>
            <small>${best ? `+${Number(best.marginPercent || 0)}% → ${marketEsc(best.bestDestinationNameVi || best.bestDestination)}` : 'Chưa có cơ hội'}</small>
          </div>
        </div>

        <div class="market-board-toolbar">
          <input id="market-board-search" class="market-board-search" type="search" placeholder="Tìm tên, mã hoặc nhóm hàng…" value="${marketEsc(marketFilters.search)}" />
          <select id="market-board-category" class="market-board-select">
            <option value="">Tất cả nhóm</option>
            ${(marketBoard.categories || []).map(code => `<option value="${marketEsc(code)}" ${marketFilters.category === code ? 'selected' : ''}>${marketEsc(marketCategoryLabel(code))}</option>`).join('')}
          </select>
          <select id="market-board-pressure" class="market-board-select">
            <option value="">Mọi áp lực</option>
            <option value="SCARCE" ${marketFilters.pressure === 'SCARCE' ? 'selected' : ''}>Khan hiếm</option>
            <option value="SURPLUS" ${marketFilters.pressure === 'SURPLUS' ? 'selected' : ''}>Dư thừa</option>
            <option value="NORMAL" ${marketFilters.pressure === 'NORMAL' ? 'selected' : ''}>Ổn định</option>
            <option value="CRISIS" ${marketFilters.pressure === 'CRISIS' ? 'selected' : ''}>Đang khủng hoảng</option>
          </select>
          <select id="market-board-sort" class="market-board-select">
            <option value="price-desc" ${marketFilters.sort === 'price-desc' ? 'selected' : ''}>Giá cao → thấp</option>
            <option value="price-asc" ${marketFilters.sort === 'price-asc' ? 'selected' : ''}>Giá thấp → cao</option>
            <option value="margin-desc" ${marketFilters.sort === 'margin-desc' ? 'selected' : ''}>Biên lời cao nhất</option>
            <option value="stock-asc" ${marketFilters.sort === 'stock-asc' ? 'selected' : ''}>Tồn kho thấp nhất</option>
            <option value="name" ${marketFilters.sort === 'name' ? 'selected' : ''}>Tên A → Z</option>
          </select>
          <span id="market-board-count" class="market-board-count"></span>
        </div>

        <div class="market-board-table-wrap">
          <table class="market-board-table">
            <thead>
              <tr>
                <th>Mặt hàng</th>
                <th class="num">Giá chợ</th>
                <th class="num">Tồn / Cầu</th>
                <th>Áp lực</th>
                <th>Xu hướng</th>
                <th>Bán tốt nhất</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="market-board-rows"></tbody>
          </table>
        </div>
      </div>
    `;
    bindMarketBoard();
    updateMarketTable();
  }

  async function openMarketPulse() {
    const modal = document.getElementById('market-pulse-modal');
    const body = document.getElementById('market-pulse-body');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="market-pulse-empty">Đang tải bảng giá chợ…</div>';
    try {
      const res = await fetch('/api/economy/market-board');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không tải được chợ');
      marketBoard = data;
      marketExpandedItem = null;
      marketFilters.search = '';
      marketFilters.category = '';
      marketFilters.pressure = '';
      marketFilters.sort = 'price-desc';
      renderMarketBoard();
    } catch (err) {
      body.innerHTML = `<div class="market-pulse-empty danger-text">${marketEsc(err.message)}</div>`;
    }
  }

  function closeMarketPulse() {
    const modal = document.getElementById('market-pulse-modal');
    if (modal) modal.classList.add('hidden');
  }

  return {
    init,
    updateActionDock,
    triggerActivePoiAction,
    openMarketAction,
    resolvePoiType,
    assertPresence,
    exploreCurrentPoi,
    openMarketPulse,
    closeMarketPulse,
    getCurrentSubLocation: () => currentSubLocation
  };
});
