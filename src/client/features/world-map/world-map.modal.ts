/**
 * ThreeKingdoms-AgentEngine: Standardized World Map Modal Component
 * (src/client/features/world-map/world-map.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';

export class WorldMapModal {
  private modal: ModalShellInstance;

  constructor() {
    this.modal = createModalShell({
      id: 'world-map-modal',
      title: 'Dư Đồ Tam Quốc • Khởi Nghĩa Khăn Vàng (184 SCN)',
      subtitle: 'Khảo sát 24 châu quận, phân bố thế lực chư hầu và dịch trạm liên thành',
      seal: '圖',
      size: 'xl',
      dialogClass: 'world-map-dialog'
    });
  }

  public async open(): Promise<void> {
    await this.modal.open();

    // The cartography renderer is still owned by public/js/world-map.js.
    // Rebuild its mount points inside the shell body, then draw the map.
    const refresh = (window as any).refreshWorldMapView;
    if (typeof refresh === 'function') {
      refresh();
    } else if (typeof (window as any).renderWorldMapSvg === 'function') {
      (window as any).renderWorldMapSvg();
    }
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }
}

export const worldMapModal = new WorldMapModal();
