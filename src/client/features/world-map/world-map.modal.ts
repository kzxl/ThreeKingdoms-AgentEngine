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
      size: 'xl'
    });
  }

  public async open(): Promise<void> {
    if (typeof (window as any).renderWorldMap === 'function') {
      await this.modal.open();
      (window as any).renderWorldMap();
    } else {
      await this.modal.open();
    }
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }
}

export const worldMapModal = new WorldMapModal();
