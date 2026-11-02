/**
 * City mini-map modal: the CITY sub-locations inside one settlement.
 * Entering a spot is free of travel days; its contextual scene is served by
 * the existing /api/scene endpoint and actions go to /api/action.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { cityMapService, CitySpot, CityView } from './city-map.service';

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(message: string, danger = false): void {
  if (typeof (window as any).showToast === 'function') (window as any).showToast(message, danger);
}

const ICON_SEALS: Record<string, string> = {
  government: '府',
  residence: '宅',
  market: '市',
  forge: '鍛',
  tavern: '酒',
  arena: '武',
  city: '城',
  temple: '寺',
  gate: '門',
  workshop: '坊'
};

export class CityMapModal {
  private modal: ModalShellInstance;
  private view: CityView | null = null;
  private nodeId: string | null = null;
  private scene: any = null;
  private sceneSpotName: string | null = null;

  constructor() {
    this.modal = createModalShell({
      id: 'city-map-modal',
      title: 'Nội Thành',
      subtitle: 'Đi lại giữa các địa điểm trong thành và khảo sát tại chỗ',
      seal: '城',
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
    this.view = await cityMapService.get(this.nodeId || undefined);
    this.nodeId = this.view.nodeId;
  }

  private render(): void {
    if (!this.view) {
      this.modal.setContent('<div class="journal-modal-content"><div class="text-muted text-sm">Không tải được nội thành.</div></div>');
      this.bind();
      return;
    }
    const { citySpots, city, currentSubLocation, poiScenes } = this.view;
    const cityName = city?.nameVi || this.view.nodeId;
    const current = citySpots.find(spot => spot.nameVi === currentSubLocation);

    this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">城</div>
          <div class="lead-text">
            <h3>${esc(cityName)} • Nội Thành</h3>
            <div class="text-muted text-sm">${citySpots.length} địa điểm trong thành • ${poiScenes.length} POI. Đi lại nội thành không tốn ngày; mỗi địa điểm mở một cảnh ngữ cảnh.</div>
          </div>
        </div>
        <div class="wilderness-map-legend">
          <span>Vị trí hiện tại: <strong>${esc(current?.nameVi || currentSubLocation || 'Cổng thành')}</strong></span>
          <span class="text-muted">Chọn một địa điểm để vào và khảo sát.</span>
        </div>
        <div class="city-map-grid">
          ${citySpots.map(spot => this.renderSpot(spot, currentSubLocation)).join('')}
        </div>
        ${this.renderScenePanel()}
      </div>
    `);
    this.bind();
  }

  private renderSpot(spot: CitySpot, currentSubLocation: string | null): string {
    const seal = ICON_SEALS[spot.iconKey] || '城';
    const isCurrent = spot.nameVi === currentSubLocation;
    return `
      <button class="city-spot-card${isCurrent ? ' is-current' : ''}" data-city-enter="${esc(spot.subLocationId)}">
        <span class="city-spot-seal">${seal}</span>
        <span class="city-spot-name">${esc(spot.nameVi)}</span>
        <span class="city-spot-kind">${esc(spot.kind)}${isCurrent ? ' • đang ở đây' : ''}</span>
      </button>
    `;
  }

  private renderScenePanel(): string {
    if (!this.scene) return '';
    const options = Array.isArray(this.scene.options) ? this.scene.options : [];
    return `
      <div class="wilderness-scene-card">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-xs font-bold text-amber-200">${esc(this.sceneSpotName || this.scene.npc?.name || 'Khảo sát')}</div>
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

  private bind(): void {
    const body = this.modal.getBodyElement();
    if (!body) return;

    body.querySelectorAll<HTMLElement>('[data-city-enter]').forEach(button => {
      button.addEventListener('click', async () => {
        const subLocationId = button.dataset.cityEnter || '';
        button.setAttribute('disabled', 'true');
        try {
          const entered = await cityMapService.enter(subLocationId);
          const name = entered?.result?.nameVi || subLocationId;
          this.scene = await cityMapService.getScene(name);
          this.sceneSpotName = name;
          await this.refresh();
          this.render();
        } catch (error: any) {
          button.removeAttribute('disabled');
          toast(error.message || 'Không vào được địa điểm.', true);
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-scene-close]').forEach(button => {
      button.addEventListener('click', () => {
        this.scene = null;
        this.sceneSpotName = null;
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
          const response = await cityMapService.dispatchAction(option.action);
          toast(response?.message || 'Đã thực hiện lựa chọn.');
          this.scene = null;
          this.sceneSpotName = null;
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

export const cityMapModal = new CityMapModal();
