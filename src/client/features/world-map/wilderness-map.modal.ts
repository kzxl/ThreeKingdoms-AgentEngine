/**
 * Wilderness local map modal: WILDERNESS sub-locations around one city.
 * The city interior is a separate mini-map; this surface only shows the
 * out-of-city space and moves `player_state.current_sub_location`.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { wildernessMapService, WildernessSpot, WildernessView } from './wilderness-map.service';

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(message: string, danger = false): void {
  if (typeof (window as any).showToast === 'function') (window as any).showToast(message, danger);
}

const ICON_SEALS: Record<string, string> = {
  mountain: '山',
  water: '水',
  forest: '林',
  lair: '寨',
  farm: '田',
  wild: '野'
};

export class WildernessMapModal {
  private modal: ModalShellInstance;
  private view: WildernessView | null = null;
  private nodeId: string | null = null;
  private scene: any = null;
  private scenePoiName: string | null = null;

  constructor() {
    this.modal = createModalShell({
      id: 'wilderness-map-modal',
      title: 'Dã Ngoại',
      subtitle: 'Khảo sát địa hình ngoài thành, điểm tài nguyên và ổ phỉ',
      seal: '野',
      size: 'xl',
      onOpen: async () => {
        await this.refresh();
        this.render();
      }
    });
  }

  public async open(nodeId?: string): Promise<void> {
    this.nodeId = nodeId || null;
    await this.modal.open();
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refresh(): Promise<void> {
    this.view = await wildernessMapService.get(this.nodeId || undefined);
    this.nodeId = this.view.nodeId;
  }

  private render(): void {
    if (!this.view) {
      this.modal.setContent('<div class="journal-modal-content"><div class="text-muted text-sm">Không tải được dã ngoại.</div></div>');
      this.bind();
      return;
    }
    const { wilderness, resources, city, currentSubLocation } = this.view;
    const cityName = city?.nameVi || this.view.nodeId;
    const hotspots = wilderness.map(spot => this.renderSpot(spot, currentSubLocation));
    const resourceCount = resources.length;
    const poiCount = this.view.poiScenes.length;

    this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">野</div>
          <div class="lead-text">
            <h3>${esc(cityName)} • Dã Ngoại</h3>
            <div class="text-muted text-sm">${wilderness.length} địa danh ngoài thành • ${resourceCount} điểm tài nguyên • ${poiCount} POI. Mỗi lần di chuyển tốn 1 ngày và 5 thể lực.</div>
          </div>
        </div>
        <div class="wilderness-map-frame">
          <svg class="wilderness-map-svg" viewBox="0 0 600 360" role="img" aria-label="Bản đồ dã ngoại ${esc(cityName)}">
            <rect class="wilderness-map-ground" x="0" y="0" width="600" height="360" rx="8"></rect>
            <circle class="wilderness-map-ring" cx="300" cy="180" r="130"></circle>
            <circle class="wilderness-map-ring" cx="300" cy="180" r="72"></circle>
            <path class="wilderness-map-road" d="M 60 300 C 180 250, 240 200, 300 180 S 460 110, 560 60"></path>
            ${hotspots.join('')}
          </svg>
        </div>
        <div class="wilderness-map-legend">
          <span>Vị trí hiện tại: <strong>${esc(currentSubLocation || 'Trong thành')}</strong></span>
          <span class="text-muted">Chọn một địa danh để đi bộ tới; quay lại thành bằng nút đóng.</span>
        </div>
        ${this.renderResourcesPanel(currentSubLocation)}
        ${this.renderPoiPanel()}
        ${this.renderScenePanel()}
      </div>
    `);
    this.bind();
  }

  private isInWilderness(currentSubLocation: string | null): boolean {
    return Boolean(currentSubLocation)
      && (this.view?.wilderness || []).some(spot => spot.nameVi === currentSubLocation);
  }

  private renderResourcesPanel(currentSubLocation: string | null): string {
    const resources = this.view?.resources || [];
    if (resources.length === 0) return '';
    const inWilderness = this.isInWilderness(currentSubLocation);
    return `
      <div class="wilderness-action-panel">
        <div class="flex justify-between items-center gap-3 mb-2">
          <div class="text-xs font-bold text-amber-200">Điểm Tài Nguyên</div>
          <div class="text-[11px] text-muted">${inWilderness
            ? `Đang ở ${esc(currentSubLocation || '')} — có thể khai thác.`
            : 'Hãy đi tới một địa danh dã ngoại trước khi khai thác.'}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          ${resources.map(resource => `
            <div class="flex justify-between items-center gap-2 rounded border border-slate-800 bg-slate-900/70 p-2">
              <div>
                <div class="text-sm text-slate-200">${esc(resource.nameVi)}</div>
                <div class="text-[11px] text-muted">${esc(resource.resourceType)} • ${esc(resource.resourceNodeId)}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" data-wilderness-gather="${esc(resource.resourceNodeId)}" ${inWilderness ? '' : 'disabled'}>
                Khai Thác
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderPoiPanel(): string {
    const poiScenes = this.view?.poiScenes || [];
    if (poiScenes.length === 0) return '';
    return `
      <div class="wilderness-action-panel">
        <div class="text-xs font-bold text-amber-200 mb-2">Khảo Sát Địa Điểm</div>
        <div class="flex flex-wrap gap-2">
          ${poiScenes.map(poi => `
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-poi-scene="${esc(poi.poiName)}">
              ${esc(poi.poiName)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderScenePanel(): string {
    if (!this.scene) return '';
    const options = Array.isArray(this.scene.options) ? this.scene.options : [];
    return `
      <div class="wilderness-scene-card">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-xs font-bold text-amber-200">${esc(this.scenePoiName || this.scene.npc?.name || 'Khảo sát')}</div>
            <div class="text-[11px] text-muted">${esc(this.scene.npc?.name || '')}${this.scene.npc?.title ? ` • ${esc(this.scene.npc.title)}` : ''}</div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-scene-close>Đóng</button>
        </div>
        <p class="text-sm text-slate-300 mt-2">${esc(this.scene.narrative || '')}</p>
        <div class="grid grid-cols-1 gap-2 mt-2">
          ${options.map((option: any, index: number) => `
            <button class="ui-btn ui-btn--ghost ui-btn--sm text-left" data-scene-option="${index}" ${option.disabled ? 'disabled' : ''}>
              <strong>${esc(option.title || option.id || `Lựa chọn ${index + 1}`)}</strong>
              ${option.desc ? `<span class="block text-[11px] text-muted">${esc(option.desc)}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderSpot(spot: WildernessSpot, currentSubLocation: string | null): string {
    const x = 40 + (Number(spot.localX ?? 0.5) * 520);
    const y = 30 + (Number(spot.localY ?? 0.5) * 300);
    const current = spot.nameVi === currentSubLocation;
    const seal = ICON_SEALS[spot.iconKey] || '野';
    return `
      <g class="wilderness-node${current ? ' is-current' : ''}" data-wilderness-travel="${esc(spot.subLocationId)}" tabindex="0" role="button" aria-label="${esc(spot.nameVi)}">
        <circle class="wilderness-node-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22"></circle>
        <circle class="wilderness-node-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14"></circle>
        <text class="wilderness-node-seal" x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle">${seal}</text>
        <text class="wilderness-node-label" x="${x.toFixed(1)}" y="${(y + 33).toFixed(1)}" text-anchor="middle">${esc(spot.nameVi)}</text>
      </g>
    `;
  }

  private bind(): void {
    const body = this.modal.getBodyElement();
    if (!body) return;
    body.querySelectorAll<SVGGElement>('[data-wilderness-travel]').forEach(node => {
      const travel = async () => {
        const subLocationId = node.dataset.wildernessTravel || '';
        try {
          const response = await wildernessMapService.travel(subLocationId);
          const days = Number(response?.time?.advancedDays || 1);
          toast(`Đã tới ${response?.result?.nameVi || 'địa danh'} sau ${days} ngày.`);
          await this.refresh();
          this.render();
        } catch (error: any) {
          toast(error.message || 'Không thể di chuyển.', true);
        }
      };
      node.addEventListener('click', travel);
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void travel();
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-wilderness-gather]').forEach(button => {
      button.addEventListener('click', async () => {
        const nodeId = button.dataset.wildernessGather || '';
        button.setAttribute('disabled', 'true');
        try {
          const response = await wildernessMapService.gather(nodeId);
          const result = response?.result || response;
          const item = result?.itemNameVi || result?.itemCode || 'tài nguyên';
          const quantity = Number(result?.quantity || result?.yieldQuantity || 0);
          toast(quantity > 0 ? `Khai thác được ${quantity} ${item}.` : 'Khai thác thành công.');
          await this.refresh();
          this.render();
        } catch (error: any) {
          button.removeAttribute('disabled');
          toast(error.message || 'Khai thác thất bại.', true);
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-poi-scene]').forEach(button => {
      button.addEventListener('click', async () => {
        const poiName = button.dataset.poiScene || '';
        button.setAttribute('disabled', 'true');
        try {
          this.scene = await wildernessMapService.getScene(poiName);
          this.scenePoiName = poiName;
          this.render();
        } catch (error: any) {
          button.removeAttribute('disabled');
          toast(error.message || 'Không mở được địa điểm.', true);
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-scene-close]').forEach(button => {
      button.addEventListener('click', () => {
        this.scene = null;
        this.scenePoiName = null;
        this.render();
      });
    });

    body.querySelectorAll<HTMLElement>('[data-scene-option]').forEach(button => {
      button.addEventListener('click', async () => {
        const index = Number(button.dataset.sceneOption || -1);
        const option = this.scene?.options?.[index];
        if (!option?.action) return;
        button.setAttribute('disabled', 'true');
        try {
          const response = await wildernessMapService.dispatchAction(option.action);
          toast(response?.message || 'Đã thực hiện lựa chọn.');
          this.scene = null;
          this.scenePoiName = null;
          await this.refresh();
          this.render();
        } catch (error: any) {
          button.removeAttribute('disabled');
          toast(error.message || 'Hành động thất bại.', true);
        }
      });
    });
  }
}

export const wildernessMapModal = new WildernessMapModal();
