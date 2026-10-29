/**
 * ThreeKingdoms-AgentEngine: Standardized Equipment & Forge Modal Component
 * (src/client/features/equipment-forge/equipment-forge.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { equipmentForgeService } from './equipment-forge.service';
import { BespokeForgePayload, EquipmentOverview } from './equipment-forge.types';

export class EquipmentForgeModal {
  private modal: ModalShellInstance;
  private currentCharacterId = 'PLY-0001';
  private overview: EquipmentOverview | null = null;

  constructor() {
    this.modal = createModalShell({
      id: 'equipment-forge-modal',
      title: 'Vũ Khố & Lò Rèn Thiết Điếm',
      subtitle: 'Quản lý 4 ô chiến bị truyền quốc và đúc rèn thần binh độc bản',
      seal: '武',
      size: 'xl',
      tabs: [
        { id: 'gear', label: 'Binh Khí & Giáp Trụ', seal: '武' },
        { id: 'forge_bespoke', label: 'Đúc Rèn Thần Binh', seal: '鍛' },
        { id: 'inventory', label: 'Kho Binh Khí', seal: '貨' }
      ],
      activeTabId: 'gear',
      onOpen: async () => {
        await this.refreshData();
        await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }

  public async open(characterId = 'PLY-0001', initialTab = 'gear'): Promise<void> {
    this.currentCharacterId = characterId;
    await this.modal.open(initialTab);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refreshData(): Promise<void> {
    try {
      this.overview = await equipmentForgeService.getOverview(this.currentCharacterId);
    } catch (e) {
      console.error('[EquipmentForgeModal] Error refreshing data:', e);
    }
  }

  private async renderActiveTab(): Promise<void> {
    const tab = this.modal.activeTab || 'gear';
    switch (tab) {
      case 'gear':
        this.renderGearTab();
        break;
      case 'forge_bespoke':
        this.renderForgeBespokeTab();
        break;
      case 'inventory':
        this.renderInventoryTab();
        break;
    }
  }

  private renderGearTab(): void {
    if (!this.overview) return;
    const slots = this.overview.slots;
    const eff = this.overview.effectiveStats || {};
    const base = this.overview.baseStats || {};

    const html = `
      <div class="equipment-modal-content">
        <!-- Lead Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">武</div>
          <div class="lead-text">
            <h3>Chiến Bị Của ${this.overview.characterNameVi || 'Lương Diễn'}</h3>
            <div class="text-muted text-sm">Hiệu ứng chiến bị kích hoạt thuộc tính vàng khi vượt ngưỡng 100 điểm.</div>
          </div>
        </div>

        <!-- Effective Attributes Bar -->
        <div class="grid grid-cols-4 gap-2 mb-4 font-mono text-xs text-center bg-slate-950/80 p-2.5 rounded border border-amber-900/40">
          <div>VÕ: <strong class="${(eff.war || 0) >= 100 ? 'text-amber-400 font-bold' : 'text-red-400'}">${eff.war || base.war || 50}</strong> <span class="text-muted text-[10px]">(${base.war || 50})</span></div>
          <div>THỐNG: <strong class="${(eff.ldr || 0) >= 100 ? 'text-amber-400 font-bold' : 'text-amber-300'}">${eff.ldr || base.ldr || 50}</strong> <span class="text-muted text-[10px]">(${base.ldr || 50})</span></div>
          <div>TRÍ: <strong class="${(eff.int || 0) >= 100 ? 'text-amber-400 font-bold' : 'text-blue-400'}">${eff.int || base.int || 50}</strong> <span class="text-muted text-[10px]">(${base.int || 50})</span></div>
          <div>XẢO: <strong class="${(eff.cra || 0) >= 100 ? 'text-amber-400 font-bold' : 'text-cyan-400'}">${eff.cra || base.cra || 50}</strong> <span class="text-muted text-[10px]">(${base.cra || 50})</span></div>
        </div>

        <!-- 4 Equipment Slots Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSlotCard('WEAPON', 'Binh Khí Tấn Công', '武', slots.WEAPON)}
          ${this.renderSlotCard('ARMOR', 'Khôi Giáp Phòng Hộ', '盾', slots.ARMOR)}
          ${this.renderSlotCard('STEED', 'Chiến Mã Tọa Kỵ', '馬', slots.STEED)}
          ${this.renderSlotCard('TREASURE', 'Bảo Vật & Binh Thư', '卷', slots.TREASURE)}
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderSlotCard(slotKey: string, slotTitle: string, icon: string, slotData?: any): string {
    const isEquipped = slotData && slotData.itemCode;
    return `
      <div class="tactical-card p-3 bg-slate-900/80 rounded border ${isEquipped ? 'border-amber-500/50' : 'border-slate-800'} flex justify-between items-center">
        <div>
          <div class="text-xs text-muted font-bold flex items-center gap-1">
            <span>${icon}</span> ${slotTitle}
          </div>
          <div class="font-bold text-sm ${isEquipped ? 'text-amber-200' : 'text-slate-500'} mt-1">
            ${isEquipped ? slotData.nameVi : 'Trống (Chưa Trang Bị)'}
          </div>
          ${isEquipped && slotData.statModifierDesc ? `
            <div class="text-[11px] text-green-400 font-mono mt-0.5">${slotData.statModifierDesc}</div>
          ` : ''}
        </div>
        <div>
          ${isEquipped ? `
            <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.EquipmentUI.unequip('${this.currentCharacterId}', '${slotKey}')">Tháo Ra</button>
          ` : `
            <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.EquipmentUI.switchTab('inventory')">Trang Bị</button>
          `}
        </div>
      </div>
    `;
  }

  private renderForgeBespokeTab(): void {
    const cra = this.overview?.baseStats?.cra || 50;
    const canForge = cra >= 50;

    const html = `
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">鍛</div>
          <div class="lead-text">
            <h3>Đoán Tạo Thần Binh Tùy Biến (Bespoke Forge)</h3>
            <div class="text-muted text-sm">Chế tác thần binh độc bản khắc tên tướng lĩnh, tiêu hao 25 Thể lực và nguyên liệu luyện tinh.</div>
          </div>
        </div>

        ${!canForge ? `
          <div class="text-center py-8 text-muted">
            Cần chỉ số Kỹ Nghệ (CRA) đạt tối thiểu 50 để mở lò rèn thần binh. Hiện tại CRA của bạn: ${cra}.
          </div>
        ` : `
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Tên Thần Binh Độc Bản:</label>
                <input type="text" id="forge-weapon-name" class="modal-input w-full" placeholder="Thanh Long Uyển Nguyệt Đao" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Phân Loại Binh Khí:</label>
                <select id="forge-weapon-cat" class="modal-input w-full">
                  <option value="BLADE">Đao / Trực Đao (WAR +1..+5)</option>
                  <option value="SPEAR">Thương / Xà Mâu (WAR/LDR +1..+5)</option>
                  <option value="HALBERD">Kích / Phương Thiên (WAR/LDR +1..+5)</option>
                  <option value="SWORD">Kiếm / Bảo Kiếm (LDR/POL +1..+5)</option>
                  <option value="BOW">Cung / Cương Nỏ (WAR/CRA +1..+5)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Cấp Phẩm Nguyên Liệu:</label>
                <select id="forge-material-tier" class="modal-input w-full">
                  <option value="STANDARD">Nguyên Liệu Tiêu Chuẩn (Sắt Thỏi + Than)</option>
                  <option value="FINE">Bách Luyện Tinh Cương (Thép Tinh Luyện + Da Thú)</option>
                  <option value="LEGENDARY">Huyền Thiết Thiên Thạch (Huyền Thiết + Thiên Thạch)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Nơi Tiếp Nhận Sau Đúc:</label>
                <select id="forge-destination" class="modal-input w-full">
                  <option value="EQUIP">Tự Động Trang Bị Luôn</option>
                  <option value="WAREHOUSE">Chuyển Vào Kho Huyện Trác</option>
                  <option value="GIFT">Tặng Cho Quan Vũ / Trương Phi</option>
                </select>
              </div>
            </div>

            <button class="ui-btn ui-btn--accent w-full py-2.5 font-bold" onclick="window.EquipmentUI.executeForge()">
              Khai Lò Đúc Thần Binh
            </button>
          </div>
        `}
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderInventoryTab(): void {
    const gear = this.overview?.inventoryGear || [];

    const html = `
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">貨</div>
          <div class="lead-text">
            <h3>Kho Khí Giới Trác Huyện</h3>
            <div class="text-muted text-sm">Kho vũ khí, giáp trụ và chiến mã sẵn sàng trang bị cho nhân vật.</div>
          </div>
        </div>

        ${gear.length === 0 ? `
          <div class="text-center py-8 text-muted">
            Kho vũ khí hiện không có trang bị nào. Hãy mua từ chợ phiên hoặc chế tác tại Lò Rèn.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${gear.map(g => `
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                <div>
                  <div class="font-bold text-amber-200 text-sm">${g.nameVi}</div>
                  <div class="text-xs text-muted">Vị trí: ${g.slot} • SL: ${g.quantity}</div>
                </div>
                <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.EquipmentUI.equip('${this.currentCharacterId}', '${g.slot}', '${g.itemCode}')">
                  Mặc Vào
                </button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    this.modal.setContent(html);
  }

  public async equip(characterId: string, slot: string, itemCode: string): Promise<void> {
    try {
      await equipmentForgeService.equipItem(characterId, slot, itemCode);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Đã trang bị thành công!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi trang bị!', true);
      }
    }
  }

  public async unequip(characterId: string, slot: string): Promise<void> {
    try {
      await equipmentForgeService.unequipItem(characterId, slot);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Đã tháo trang bị về kho!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi tháo trang bị!', true);
      }
    }
  }

  public async executeForge(): Promise<void> {
    const nameEl = document.getElementById('forge-weapon-name') as HTMLInputElement;
    const catEl = document.getElementById('forge-weapon-cat') as HTMLSelectElement;
    const tierEl = document.getElementById('forge-material-tier') as HTMLSelectElement;
    const destEl = document.getElementById('forge-destination') as HTMLSelectElement;

    const payload: BespokeForgePayload = {
      characterId: this.currentCharacterId,
      weaponNameVi: nameEl?.value || 'Thần Binh Trác Huyện',
      weaponCategory: (catEl?.value as any) || 'BLADE',
      targetAttr: 'war',
      materialTier: (tierEl?.value as any) || 'STANDARD',
      destination: (destEl?.value as any) || 'EQUIP'
    };

    try {
      const res = await equipmentForgeService.forgeBespokeWeapon(payload);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Đúc rèn thần binh thành công!');
      }
      await this.refreshData();
      await this.modal.switchTab('gear');
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Đúc rèn thất bại!', true);
      }
    }
  }
}

export const equipmentForgeModal = new EquipmentForgeModal();
