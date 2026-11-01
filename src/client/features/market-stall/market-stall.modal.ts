/**
 * Market stall modal: player listings, NPC sales and NPC offers.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { marketStallService, NpcOffer, StallView, WarehouseView } from './market-stall.service';

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(message: string, danger = false): void {
  if (typeof (window as any).showToast === 'function') (window as any).showToast(message, danger);
}

export class MarketStallModal {
  private modal: ModalShellInstance;
  private stall: StallView | null = null;
  private offers: NpcOffer[] = [];
  private warehouses: WarehouseView[] = [];

  constructor() {
    this.modal = createModalShell({
      id: 'market-stall-modal',
      title: 'Chợ & Quầy Bán',
      subtitle: 'Niêm yết hàng cho NPC trong thành và mua lại hàng NPC đang bán',
      seal: '市',
      size: 'lg',
      tabs: [
        { id: 'stall', label: 'Quầy Của Ta', seal: '攤' },
        { id: 'offers', label: 'Hàng NPC Bán', seal: '貨' },
        { id: 'warehouse', label: 'Kho Thành', seal: '倉' }
      ],
      activeTabId: 'stall',
      onOpen: async () => {
        await this.refresh();
        this.render();
      },
      onTabChange: async () => {
        this.render();
      }
    });
  }

  public async open(tab = 'stall'): Promise<void> {
    await this.modal.open(tab);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refresh(): Promise<void> {
    this.stall = await marketStallService.getStall('PLY-0001');
    this.offers = await marketStallService.getOffers(this.stall?.settlementId);
    this.warehouses = await marketStallService.getWarehouses();
  }

  private render(): void {
    const tab = this.modal.activeTab || 'stall';
    if (tab === 'offers') this.modal.setContent(this.renderOffers());
    else if (tab === 'warehouse') this.modal.setContent(this.renderWarehouses());
    else this.modal.setContent(this.renderStall());
    this.bind();
  }

  private renderStall(): string {
    if (!this.stall) {
      return `
        <div class="journal-modal-content">
          <div class="spatial-banner-lead">
            <div class="lead-seal">市</div>
            <div class="lead-text">
              <h3>Chưa Có Quầy</h3>
              <div class="text-muted text-sm">Mở quầy tại thành đang đứng (phí 20 Quan) để NPC trong thành mua hàng mỗi ngày.</div>
            </div>
          </div>
          <button class="ui-btn ui-btn--primary" data-stall-action="open">Mở Quầy</button>
        </div>
      `;
    }

    const listings = this.stall.listings.length > 0
      ? this.stall.listings.map(row => {
        const delta = row.marketPrice > 0 ? Math.round(((row.unitPrice / row.marketPrice) - 1) * 100) : 0;
        return `
          <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5">
            <span class="text-slate-200">${esc(row.itemNameVi)} × ${row.quantity}</span>
            <span class="font-mono text-amber-300">${row.unitPrice} Quan (${delta >= 0 ? '+' : ''}${delta}% chợ)</span>
          </div>
        `;
      }).join('')
      : '<div class="text-muted text-xs">Quầy chưa có hàng.</div>';

    const sales = this.stall.recentSales.length > 0
      ? this.stall.recentSales.map(row => `
        <div class="flex justify-between text-[11px] py-1">
          <span class="text-slate-300">${esc(row.npcNameVi)} mua ${row.quantity} ${esc(row.itemCode)}</span>
          <span class="font-mono text-green-400">+${row.totalCash} Quan</span>
        </div>
      `).join('')
      : '<div class="text-muted text-xs">Chưa có giao dịch.</div>';

    return `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">攤</div>
          <div class="lead-text">
            <h3>${esc(this.stall.nameVi)}</h3>
            <div class="text-muted text-sm">${esc(this.stall.settlementId)} • Hàng đang bán: ${this.stall.listings.length} • NPC sẽ mua mỗi ngày nếu giá ≤ 115% giá chợ.</div>
          </div>
        </div>

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-3">
          <div class="text-xs font-bold text-amber-200 mb-2">Niêm Yết Hàng</div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px]">
            <input id="stall-item-code" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" placeholder="Mã hàng, vd COM-GRAIN" value="COM-GRAIN" />
            <input id="stall-item-qty" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="5" />
            <input id="stall-item-price" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="50" />
            <button class="ui-btn ui-btn--primary ui-btn--sm" data-stall-action="list">Niêm Yết</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] mt-2">
            <input id="stall-source" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="BAG" placeholder="BAG hoặc WAREHOUSE" />
            <input id="stall-warehouse" list="stall-warehouse-list" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" placeholder="Mã kho (nếu lấy từ kho)" />
            <datalist id="stall-warehouse-list">
              ${this.warehouses
                .filter(row => row.settlementId === this.stall?.settlementId)
                .map(row => `<option value="${esc(row.warehouseId)}">${esc(row.nameVi)} (${row.usedCapacity}/${row.capacity})</option>`)
                .join('')}
            </datalist>
          </div>
          <div class="text-muted text-[10px] mt-1">Giá thấp hơn 115% giá chợ thì NPC mua nhanh hơn; giá quá cao sẽ không có người mua.</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="text-xs font-bold text-amber-200 mb-2">Hàng Đang Bán</div>
            ${listings}
            <button class="ui-btn ui-btn--ghost ui-btn--sm mt-2" data-stall-action="close">Đóng Quầy & Trả Hàng</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="text-xs font-bold text-amber-200 mb-2">Giao Dịch Gần Đây</div>
            ${sales}
          </div>
        </div>
      </div>
    `;
  }

  private renderWarehouses(): string {
    const rows = this.warehouses.length > 0
      ? this.warehouses.map(row => `
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-2">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm font-bold text-slate-200">${esc(row.nameVi)} • ${esc(row.ownershipType)}</div>
              <div class="text-[11px] text-muted">${esc(row.settlementId)} • ${row.usedCapacity}/${row.capacity} • ${row.status}${row.leaseUntil ? ` • hết hạn ${esc(row.leaseUntil)}` : ''}</div>
            </div>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-warehouse-action="withdraw" data-warehouse-id="${esc(row.warehouseId)}">Rút hàng</button>
          </div>
        </div>
      `).join('')
      : '<div class="text-muted text-sm mb-2">Chưa có kho. Thuê kho tại thành đang đứng để mở kho địa phương.</div>';

    const warehouseOptions = this.warehouses.map(row =>
      `<option value="${esc(row.warehouseId)}">${esc(row.nameVi)}</option>`
    ).join('');

    return `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">倉</div>
          <div class="lead-text">
            <h3>Kho Theo Thành</h3>
            <div class="text-muted text-sm">Kho tách khỏi túi nhân. Thuê 300 Quan / 90 ngày; mua 2.000 Quan.</div>
          </div>
        </div>
        <div class="flex gap-2 mb-3">
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-warehouse-action="rent">Thuê kho tại thành hiện tại</button>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-warehouse-action="buy">Mua kho tại thành hiện tại</button>
        </div>
        ${rows}
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
          <div class="text-xs font-bold text-amber-200 mb-2">Nạp / Rút Kho</div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px]">
            <input id="warehouse-id" list="warehouse-id-list" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" placeholder="Mã kho" />
            <datalist id="warehouse-id-list">
              ${warehouseOptions || '<option value="">Chưa có kho</option>'}
            </datalist>
            <input id="warehouse-item" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="COM-GRAIN" placeholder="Mã hàng" />
            <input id="warehouse-qty" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="10" />
            <div class="flex gap-2">
              <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" data-warehouse-action="deposit">Nạp</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" data-warehouse-action="withdraw-form">Rút</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderOffers(): string {
    if (this.offers.length === 0) {
      return '<div class="journal-modal-content"><div class="text-muted text-sm">Thành này chưa có NPC nào đăng bán. Hãy đi sang ngày khác hoặc tới thành khác.</div></div>';
    }
    return `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">貨</div>
          <div class="lead-text">
            <h3>Hàng NPC Đang Bán</h3>
            <div class="text-muted text-sm">Giá dao động 85%–125% quanh giá chợ địa phương. Mua xong hàng vào kho, NPC nhận tiền.</div>
          </div>
        </div>
        <div class="space-y-2">
          ${this.offers.map(offer => `
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center gap-3">
              <div>
                <div class="text-sm font-bold text-slate-200">${esc(offer.itemNameVi)} × ${offer.quantity}</div>
                <div class="text-[11px] text-muted">${esc(offer.npcNameVi)} • ${offer.unitPrice} Quan (${offer.priceDeltaPct >= 0 ? '+' : ''}${offer.priceDeltaPct}% chợ) • hết hạn ${esc(offer.expiresDate)}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" data-offer-buy="${esc(offer.offerId)}">Mua 1</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private bind(): void {
    const body = this.modal.getBodyElement();
    if (!body) return;

    body.querySelectorAll<HTMLElement>('[data-stall-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const action = button.dataset.stallAction;
        button.setAttribute('disabled', 'true');
        try {
          if (action === 'open') {
            await marketStallService.openStall();
            toast('Đã mở quầy.');
          } else if (action === 'list') {
            const itemCode = body.querySelector<HTMLInputElement>('#stall-item-code')?.value.trim() || '';
            const quantity = Number(body.querySelector<HTMLInputElement>('#stall-item-qty')?.value || 0);
            const unitPrice = Number(body.querySelector<HTMLInputElement>('#stall-item-price')?.value || 0);
            const source = ((body.querySelector<HTMLInputElement>('#stall-source')?.value || 'BAG').toUpperCase()) as 'BAG' | 'WAREHOUSE';
            const warehouseId = body.querySelector<HTMLInputElement>('#stall-warehouse')?.value || undefined;
            await marketStallService.listItem(itemCode, quantity, unitPrice, source, warehouseId, this.stall?.stallId);
            toast(`Đã niêm yết ${quantity} ${itemCode}.`);
          } else if (action === 'close') {
            await marketStallService.closeStall(this.stall?.stallId);
            toast('Đã đóng quầy và trả hàng về kho.');
          }
          await this.refresh();
          this.render();
        } catch (error: any) {
          button.removeAttribute('disabled');
          toast(error.message || 'Thao tác quầy thất bại.', true);
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-offer-buy]').forEach(button => {
      button.addEventListener('click', async () => {
        const offerId = button.dataset.offerBuy || '';
        button.setAttribute('disabled', 'true');
        try {
          await marketStallService.buyOffer(offerId, 1);
          toast('Đã mua hàng từ NPC.');
          await this.refresh();
          this.render();
        } catch (error: any) {
          button.removeAttribute('disabled');
          toast(error.message || 'Mua hàng thất bại.', true);
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-warehouse-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const action = button.dataset.warehouseAction || '';
        const warehouseId = button.dataset.warehouseId
          || body.querySelector<HTMLInputElement>('#warehouse-id')?.value
          || '';
        const itemCode = body.querySelector<HTMLInputElement>('#warehouse-item')?.value.trim() || 'COM-GRAIN';
        const quantity = Number(body.querySelector<HTMLInputElement>('#warehouse-qty')?.value || 1);
        button.setAttribute('disabled', 'true');
        try {
          if (action === 'rent') {
            await marketStallService.rentWarehouse();
            toast('Đã thuê kho tại thành hiện tại.');
          } else if (action === 'buy') {
            await marketStallService.buyWarehouse();
            toast('Đã mua kho tại thành hiện tại.');
          } else if (action === 'deposit') {
            await marketStallService.deposit(warehouseId, itemCode, quantity);
            toast(`Đã nạp ${quantity} ${itemCode} vào kho.`);
          } else {
            await marketStallService.withdraw(warehouseId, itemCode, quantity);
            toast(`Đã rút ${quantity} ${itemCode} khỏi kho.`);
          }
          await this.refresh();
          this.render();
        } catch (error: any) {
          button.removeAttribute('disabled');
          toast(error.message || 'Thao tác kho thất bại.', true);
        }
      });
    });
  }
}

export const marketStallModal = new MarketStallModal();
