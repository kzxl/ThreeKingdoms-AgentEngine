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
      seal: '🔨',
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
      seal: '🍺',
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
      seal: '⚔️',
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
      seal: '📦',
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
      seal: '🏛️',
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
      seal: '工',
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
      seal: '🍵',
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

    if (sealEl) sealEl.innerText = config.seal;
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

  return {
    init,
    updateActionDock,
    triggerActivePoiAction,
    openMarketAction,
    resolvePoiType
  };
});
