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
      `Mã vật phẩm: ${itemCode} • Đơn giá hiện tại: ${defaultPrice} Tiền`,
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
          <label class="block text-xs font-bold text-slate-300 mb-1">Đơn Giá Đơn Vị (Tiền):</label>
          <input type="number" id="quick-trade-price" class="modal-input w-full" value="${this.currentPrice}" readonly />
        </div>
        <div class="bg-slate-950 p-2.5 rounded flex justify-between items-center text-xs font-mono">
          <span class="text-muted">Tổng Giá Trị:</span>
          <span class="text-amber-400 font-bold text-sm" id="quick-trade-total">${(qty * this.currentPrice).toLocaleString()} Tiền</span>
        </div>
        <button class="btn btn-action-gold w-full py-2 font-bold mt-2" onclick="window.QuickTradeModal.submit()">
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
    totalEl.textContent = `${(qty * this.currentPrice).toLocaleString()} Tiền`;
  }

  public async submit(): Promise<void> {
    const qtyEl = document.getElementById('quick-trade-qty') as HTMLInputElement;
    const qty = parseFloat(qtyEl?.value || '1');
    if (isNaN(qty) || qty <= 0) return;

    const action = this.currentMode === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL';
    try {
      const res = await apiClient.post('/api/action', {
        action,
        item: this.currentItemCode,
        qty,
        price: this.currentPrice
      });
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.message || 'Giao dịch thành công!');
      }
      await this.modal.close();
      if (typeof (window as any).refreshGameStatus === 'function') {
        (window as any).refreshGameStatus();
      }
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Giao dịch thất bại!', true);
      }
    }
  }
}

export const quickTradeModal = new QuickTradeModal();
