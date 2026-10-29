/**
 * ThreeKingdoms-AgentEngine: Standardized Quick Trade Modal Component
 * (src/client/features/trade-quick/trade-quick.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { apiClient } from '../../core/api/client-api';

export class QuickTradeModal {
  private modal: ModalShellInstance;
  private currentMode: 'BUY' | 'SELL' = 'BUY';
  private currentItemCode = 'COM-GRAIN';
  private currentPrice = 50;

  constructor() {
    this.modal = createModalShell({
      id: 'standard-trade-modal',
      title: 'Giao Dịch Hàng Hóa Chợ Phiên',
      subtitle: 'Thực thi giao thương hàng hóa, cân bằng sổ cái kép kế toán ACID',
      seal: '貿',
      size: 'sm'
    });
  }

  public async open(mode: 'BUY' | 'SELL', itemCode: string, defaultQty = 1, defaultPrice = 50): Promise<void> {
    this.currentMode = mode;
    this.currentItemCode = itemCode;
    this.currentPrice = defaultPrice;

    this.modal.setTitle(
      mode === 'BUY' ? 'Thu Mua Vật Phẩm' : 'Xuất Bán Hàng Hóa',
      `Mã vật phẩm: ${itemCode} • Đơn giá hiện tại: ${defaultPrice} Quan`,
      mode === 'BUY' ? '買' : '賣'
    );

    this.renderForm(defaultQty);
    await this.modal.open();
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private renderForm(qty: number): void {
    const html = `
      <div class="space-y-3 p-1">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Mã Vật Phẩm:</label>
          <input type="text" class="modal-input w-full" value="${this.currentItemCode}" readonly />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Số Lượng Giao Dịch:</label>
          <input type="number" id="quick-trade-qty" class="modal-input w-full" min="1" value="${qty}" oninput="window.QuickTradeModal.updateTotal()" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Đơn Giá Đơn Vị (Quan):</label>
          <input type="number" id="quick-trade-price" class="modal-input w-full" value="${this.currentPrice}" readonly />
        </div>
        <div class="bg-slate-950 p-2.5 rounded flex justify-between items-center text-xs font-mono">
          <span class="text-muted">Tổng Giá Trị:</span>
          <span class="text-amber-400 font-bold text-sm" id="quick-trade-total">${(qty * this.currentPrice).toLocaleString()} Quan</span>
        </div>
        <button class="ui-btn ui-btn--accent w-full py-2 font-bold mt-2" onclick="window.QuickTradeModal.submit()">
          Xác Nhận ${this.currentMode === 'BUY' ? 'Thu Mua' : 'Bán Hàng'}
        </button>
      </div>
    `;

    this.modal.setContent(html);
  }

  public updateTotal(): void {
    const qtyEl = document.getElementById('quick-trade-qty') as HTMLInputElement;
    const totalEl = document.getElementById('quick-trade-total');
    if (!qtyEl || !totalEl) return;
    const qty = parseFloat(qtyEl.value) || 0;
    totalEl.textContent = `${(qty * this.currentPrice).toLocaleString()} Quan`;
  }

  public async submit(): Promise<void> {
    const qtyEl = document.getElementById('quick-trade-qty') as HTMLInputElement;
    const qty = parseFloat(qtyEl?.value || '1');
    if (isNaN(qty) || qty <= 0) return;

    // SimulationCore's /api/action contract: type/item_code/quantity/unit_price.
    // The previous payload (action/item/qty/price) was silently rejected.
    // unit_price is informational only: the server settles at master_items price.
    const payload = {
      type: this.currentMode === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL',
      item_code: this.currentItemCode,
      quantity: qty,
      unit_price: this.currentPrice,
      counterparty: 'Thương Khách Chợ Phiên',
      idempotency_key: `TSQUICK_${this.currentMode}_${this.currentItemCode}_${Date.now()}`
    };

    try {
      // Reuse the shared dispatcher when present so the toast and deck refresh
      // behave exactly like every other action button.
      const dispatch = (window as any).dispatchDirectAction;
      const res = dispatch
        ? await dispatch(payload)
        : await apiClient.post('/api/action', payload);

      if (res && res.success === false) {
        if (typeof (window as any).showToast === 'function') {
          (window as any).showToast(`Bị từ chối: ${res.error || 'Giao dịch thất bại'}`, true);
        }
        return;
      }

      await this.modal.close();
      if (typeof (window as any).loadStatus === 'function') await (window as any).loadStatus();
      if (typeof (window as any).loadDeckInventory === 'function') await (window as any).loadDeckInventory();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Giao dịch thất bại!', true);
      }
    }
  }
}

export const quickTradeModal = new QuickTradeModal();
