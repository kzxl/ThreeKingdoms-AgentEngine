/**
 * ThreeKingdoms-AgentEngine: Standardized Enterprise & Workshop Modal Component
 * (src/client/features/enterprise-workshop/enterprise-workshop.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { confirmDialog } from '../../core/ui';
import { enterpriseWorkshopService } from './enterprise-workshop.service';
import {
  EnterpriseRecord,
  EnterpriseStatus,
  LaborShift,
  OpenableEnterpriseType
} from './enterprise-workshop.types';

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function money(value: unknown): string {
  return Number(value || 0).toLocaleString('vi-VN');
}

const ATTR_LABELS: Record<string, string> = {
  cra: 'Kỹ Nghệ',
  com: 'Thương Nghiệp',
  int: 'Trí Lực',
  log: 'Hậu Cần',
  war: 'Võ Lực',
  ldr: 'Thống Soái'
};

const HEALTH_LABELS: Record<string, string> = {
  CLOSED: 'Đóng cửa',
  DISTRESSED: 'Nợ xấu',
  PROFITABLE: 'Có lời',
  BREAK_EVEN: 'Hòa vốn',
  PAUSED: 'Tạm dừng'
};

const STAFF_ROLE_LABELS: Record<string, string> = {
  FOREMAN: 'Thợ cả',
  CARPENTER: 'Thợ mộc',
  CRAFTSMAN: 'Thợ thủ công',
  MANAGER: 'Quản lý',
  CHIEF_ARTISAN_PARTNER: 'Thợ cả đồng sáng lập',
  ACCOUNTANT_MANAGER: 'Quản lý kế toán',
  APPRENTICE_CARPENTER: 'Thợ mộc học việc',
  APPRENTICE_WEAVER: 'Thợ dệt học việc',
  SPECIALIST_OPERATOR: 'Chuyên viên vận hành',
  CARAVAN_ESCORT_CHIEF: 'Đội trưởng hộ tống',
  MASTER_BLACKSMITH: 'Thợ rèn bậc thầy',
  FOUNDRY_MASTER: 'Chủ lò đúc',
  ASSISTANT_WORKER: 'Phụ thợ'
};

function staffRoleLabel(role: string): string {
  return STAFF_ROLE_LABELS[String(role || '').toUpperCase()] || String(role || 'Nhân công').replace(/_/g, ' ');
}

const TYPE_LABELS: Record<string, string> = {
  WORKSHOP: 'Xưởng thủ công',
  TAVERN: 'Tửu điếm',
  APOTHECARY: 'Dược đường',
  FORGE: 'Lò rèn',
  BLACKSMITH: 'Lò rèn'
};

export class EnterpriseWorkshopModal {
  private modal: ModalShellInstance;
  private status: EnterpriseStatus | null = null;

  constructor() {
    this.modal = createModalShell({
      id: 'enterprise-modal',
      title: 'Sản Nghiệp & Phường Xưởng Bách Nghệ',
      subtitle: 'Quản lý xưởng, lao động thời vụ và mở cơ sở mới',
      seal: '業',
      size: 'xl',
      tabs: [
        { id: 'owner', label: 'Sản Nghiệp Gia Tộc', seal: '坊' },
        { id: 'work', label: 'Đi Làm Thuê Thời Vụ', seal: '工' }
      ],
      activeTabId: 'owner',
      onOpen: async () => {
        await this.refreshData();
        await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }

  public async open(initialTab = 'owner'): Promise<void> {
    await this.modal.open(initialTab);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refreshData(): Promise<void> {
    try {
      this.status = await enterpriseWorkshopService.getStatus('PLY-0001');
    } catch (e) {
      console.error('[EnterpriseWorkshopModal] Error refreshing data:', e);
      this.status = null;
    }
  }

  private async renderActiveTab(): Promise<void> {
    const tab = this.modal.activeTab || 'owner';
    if (tab === 'owner') {
      this.renderOwnerTab();
    } else {
      this.renderWorkTab();
    }
  }

  private renderSummary(): string {
    const status = this.status;
    if (!status) return '';
    const cards = [
      { label: 'Tiền mặt', value: `${money(status.playerCash)} Quan`, tone: '' },
      { label: 'Quỹ an toàn xưởng', value: `${money(status.totalSafeCash)} Quan`, tone: 'is-gold' },
      { label: 'Nợ xưởng', value: `${money(status.totalDebt)} Quan`, tone: status.totalDebt > 0 ? 'is-danger' : '' },
      { label: 'Lương tháng', value: `${money(status.totalStaffWages)} Quan`, tone: '' },
      { label: 'Thuê xưởng', value: `${money(status.totalMonthlyRent)} Quan`, tone: '' },
      { label: 'Lợi nhuận tích lũy', value: `${money(status.totalAccumulatedProfit)} Quan`, tone: status.totalAccumulatedProfit > 0 ? 'is-positive' : '' }
    ];
    return `
      <div class="enterprise-summary-grid">
        ${cards.map(card => `
          <div class="enterprise-summary-card ${card.tone}">
            <span>${card.label}</span>
            <strong>${card.value}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderOwnerTab(): void {
    const status = this.status;
    if (!status) {
      this.modal.setContent('<div class="journal-modal-content"><div class="text-muted text-sm">Không tải được sản nghiệp.</div></div>');
      return;
    }
    const enterprises = status.ownedBusinesses || [];
    const openableTypes = status.openableTypes || [];

    const enterpriseCards = enterprises.length > 0
      ? enterprises.map(enterprise => this.renderEnterpriseCard(enterprise)).join('')
      : `<div class="enterprise-empty">Chưa sở hữu cơ sở nào. Chọn một loại hình bên dưới để mở.</div>`;

    const openCards = openableTypes.length > 0
      ? openableTypes.map(type => this.renderOpenableCard(type)).join('')
      : '<div class="enterprise-empty">Danh mục mở cơ sở chưa sẵn sàng.</div>';

    this.modal.setContent(`
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">業</div>
          <div class="lead-text">
            <h3>Phường Xưởng Lương Gia</h3>
            <div class="text-muted text-sm">Xưởng tự vận hành theo tháng. Lợi nhuận trả nợ trước, phần còn lại vào quỹ an toàn; thiếu nhân công thì sản lượng giảm.</div>
          </div>
        </div>
        ${this.renderSummary()}

        <section class="enterprise-section">
          <div class="enterprise-section-title">
            Cơ sở đang sở hữu <span>${enterprises.length}</span>
          </div>
          <div class="enterprise-grid">${enterpriseCards}</div>
        </section>

        <section class="enterprise-section">
          <div class="enterprise-section-title">
            Mở cơ sở mới <span>${openableTypes.length}</span>
          </div>
          <div class="enterprise-open-grid">${openCards}</div>
        </section>
      </div>
    `);
    this.bindOwnerActions();
  }

  private renderEnterpriseCard(enterprise: EnterpriseRecord): string {
    const health = enterprise.health || (enterprise.status === 'ACTIVE' ? 'BREAK_EVEN' : 'PAUSED');
    const profit = Number(enterprise.accumulated_profit || 0);
    const safeCash = Number(enterprise.safe_cash || 0);
    const canCollect = profit > 0 || safeCash > 0;
    const staffMembers = enterprise.staff_members || [];
    const staffWages = Number(enterprise.staff_wages || 0);
    const payrollRows = staffMembers.length > 0
      ? staffMembers.map(member => `
          <div class="enterprise-payroll-row">
            <span class="enterprise-payroll-name" title="${esc(`${member.name} (${member.npc_id})`)}">
              ${esc(member.name)} <span class="enterprise-payroll-role">• ${esc(staffRoleLabel(member.role))}</span>
            </span>
            <span class="enterprise-payroll-wage">${money(member.monthly_wage)} Quan/tháng</span>
          </div>
        `).join('')
      : '<div class="enterprise-payroll-empty">Chưa bổ nhiệm gia nhân nào vào cơ sở này.</div>';
    return `
      <div class="enterprise-card">
        <div class="enterprise-card-head">
          <div class="enterprise-icon">${enterprise.business_type === 'FORGE' || enterprise.business_type === 'BLACKSMITH' ? '鍛' : enterprise.business_type === 'TAVERN' ? '酒' : enterprise.business_type === 'APOTHECARY' ? '藥' : '工'}</div>
          <div class="enterprise-name-wrap">
            <div class="enterprise-name">${esc(enterprise.name)}</div>
            <div class="enterprise-meta">${TYPE_LABELS[enterprise.business_type] || enterprise.business_type} • ${esc(enterprise.location_id)} • Tier ${enterprise.tier || 1}</div>
          </div>
          <span class="enterprise-health is-${health.toLowerCase()}">${HEALTH_LABELS[health] || health}</span>
        </div>

        <div class="enterprise-meta mt-1">Quản lý: ${esc(enterprise.manager_name || enterprise.manager_npc_id)} • Hiệu suất ${Math.round(Number(enterprise.efficiency_multiplier || 0) * 100)}% • ${enterprise.auto_procure ? 'Tự mua nguyên liệu' : 'Mua tay'}</div>

        <div class="enterprise-stats">
          <div class="enterprise-stat"><span>Quỹ an toàn</span><strong>${money(safeCash)}</strong></div>
          <div class="enterprise-stat"><span>Nợ</span><strong class="${Number(enterprise.debt || 0) > 0 ? 'is-danger' : ''}">${money(enterprise.debt)}</strong></div>
          <div class="enterprise-stat"><span>Doanh thu/ngày</span><strong>${money(enterprise.daily_revenue)}</strong></div>
          <div class="enterprise-stat"><span>Lợi nhuận tích lũy</span><strong class="${profit > 0 ? 'is-positive' : ''}">${money(profit)}</strong></div>
          <div class="enterprise-stat"><span>Nhân sự</span><strong>${enterprise.staff_count ?? 0}/${enterprise.current_workforce ?? 0}</strong></div>
          <div class="enterprise-stat"><span>Lương nhân công</span><strong>${money(staffWages)}</strong></div>
          <div class="enterprise-stat"><span>Lương + thuê</span><strong>${money(enterprise.monthly_overhead)}</strong></div>
        </div>

        <div class="enterprise-payroll">
          <div class="enterprise-payroll-head">
            <span>Bảng lương nhân công</span>
            <strong>${staffMembers.length} người • ${money(staffWages)} Quan/tháng</strong>
          </div>
          <div class="enterprise-payroll-list">${payrollRows}</div>
        </div>

        <div class="enterprise-cash-row">
          <input class="enterprise-cash-input" id="enterprise-cash-${esc(enterprise.business_id)}" type="number" min="1" step="50" value="500" aria-label="Số tiền nạp hoặc rút" />
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-enterprise-cash="DEPOSIT" data-business-id="${esc(enterprise.business_id)}">Nạp quỹ</button>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-enterprise-cash="WITHDRAW" data-business-id="${esc(enterprise.business_id)}">Rút quỹ</button>
          <button class="ui-btn ui-btn--accent ui-btn--sm" data-enterprise-collect="${esc(enterprise.business_id)}" ${canCollect ? '' : 'disabled'}>Thu lợi nhuận</button>
        </div>
      </div>
    `;
  }

  private renderOpenableCard(type: OpenableEnterpriseType): string {
    const turnkeyCost = Number(type.startupCash || 0) + Number(type.effectiveTurnkeyCost || 0);
    const materials = (type.requiredMaterials || []).map(material => `
      <span class="enterprise-material ${material.hasEnough ? 'is-ready' : 'is-missing'}" title="${material.available}/${material.quantity}">
        ${esc(material.itemNameVi)} ${material.available}/${material.quantity}
      </span>
    `).join('');
    return `
      <div class="enterprise-open-card">
        <div class="enterprise-card-head">
          <div class="enterprise-icon">${type.icon || '業'}</div>
          <div class="enterprise-name-wrap">
            <div class="enterprise-name">${esc(type.titleVi)}</div>
            <div class="enterprise-meta">Thuê ${money(type.monthlyRent)}/tháng • ${type.baseWorkforce} nhân sự • ${money(type.projectedDailyRevenueMin)}–${money(type.projectedDailyRevenueMax)}/ngày</div>
          </div>
        </div>
        <div class="enterprise-open-desc">${esc(type.descriptionVi)}</div>
        <div class="enterprise-materials">${materials || '<span class="enterprise-material is-ready">Không cần nguyên liệu</span>'}</div>
        <div class="enterprise-open-actions">
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-open-enterprise="${esc(type.typeId)}" data-turnkey="false" ${type.canAffordCash ? '' : 'disabled'}>
            Mở chuẩn · ${money(type.startupCash)}
          </button>
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-open-enterprise="${esc(type.typeId)}" data-turnkey="true" ${type.canAffordTurnkey ? '' : 'disabled'}>
            Mở turnkey · ${money(turnkeyCost)}
          </button>
        </div>
      </div>
    `;
  }

  private bindOwnerActions(): void {
    const body = this.modal.getBodyElement();
    if (!body) return;

    body.querySelectorAll<HTMLElement>('[data-enterprise-cash]').forEach(button => {
      button.addEventListener('click', async () => {
        const businessId = button.dataset.businessId || '';
        const action = (button.dataset.enterpriseCash || 'DEPOSIT') as 'DEPOSIT' | 'WITHDRAW';
        const input = document.getElementById(`enterprise-cash-${businessId}`) as HTMLInputElement | null;
        const amount = Number(input?.value || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          this.toast('Số tiền phải lớn hơn 0.', true);
          return;
        }
        button.setAttribute('disabled', 'true');
        try {
          await enterpriseWorkshopService.manageSafeCash(businessId, action, Math.round(amount));
          this.toast(action === 'DEPOSIT' ? 'Đã nạp tiền vào quỹ an toàn.' : 'Đã rút tiền về ngân khố.');
          await this.refreshData();
          await this.renderActiveTab();
        } catch (e: any) {
          button.removeAttribute('disabled');
          this.toast(e.message || 'Thao tác quỹ thất bại.', true);
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-enterprise-collect]').forEach(button => {
      button.addEventListener('click', async () => {
        const businessId = button.dataset.enterpriseCollect || '';
        button.setAttribute('disabled', 'true');
        try {
          const result = await enterpriseWorkshopService.collectProfits(businessId);
          this.toast(result.message || `Đã thu ${money(result.collectedAmount)} Quan lợi nhuận.`, result.success === false);
          await this.refreshData();
          await this.renderActiveTab();
        } catch (e: any) {
          button.removeAttribute('disabled');
          this.toast(e.message || 'Thu lợi nhuận thất bại.', true);
        }
      });
    });

    body.querySelectorAll<HTMLElement>('[data-open-enterprise]').forEach(button => {
      button.addEventListener('click', async () => {
        const typeId = button.dataset.openEnterprise || '';
        const turnkey = button.dataset.turnkey === 'true';
        const type = (this.status?.openableTypes || []).find(row => row.typeId === typeId);
        if (!type) return;
        const cost = turnkey ? Number(type.startupCash) + Number(type.effectiveTurnkeyCost) : Number(type.startupCash);
        const confirmed = await confirmDialog({
          title: 'Mở cơ sở mới',
          message: `Mở ${type.titleVi} với chi phí ${money(cost)} Quan${turnkey ? ' (turnkey, mua bù nguyên liệu thiếu)' : ''}? Mỗi lần mở tốn 2 ngày.`,
          confirmLabel: 'Mở cơ sở',
          danger: true
        });
        if (!confirmed) return;
        button.setAttribute('disabled', 'true');
        try {
          await enterpriseWorkshopService.openEnterprise(typeId, turnkey);
          this.toast(`Đã mở ${type.titleVi}.`);
          await this.refreshData();
          await this.renderActiveTab();
        } catch (e: any) {
          button.removeAttribute('disabled');
          this.toast(e.message || 'Mở cơ sở thất bại.', true);
        }
      });
    });
  }

  private renderWorkTab(): void {
    const status = this.status;
    const shifts: LaborShift[] = status?.laborShifts || [];
    const fatigue = Number(status?.playerFatigue || 0);
    const available = shifts.filter(shift => fatigue + Number(shift.fatigueCost || 0) <= 100);
    const bestWage = shifts.reduce((best, shift) => Number(shift.wage) > Number(best?.wage || 0) ? shift : best, shifts[0]);
    const bestRate = shifts.reduce((best, shift) => {
      const rate = Number(shift.wage) / Math.max(1, Number(shift.fatigueCost || 1));
      const bestValue = best ? Number(best.wage) / Math.max(1, Number(best.fatigueCost || 1)) : 0;
      return rate > bestValue ? shift : best;
    }, shifts[0]);

    const summary = `
      <div class="work-summary-grid">
        <div class="work-summary-card"><span>Mệt mỏi</span><strong>${fatigue}/100</strong></div>
        <div class="work-summary-card"><span>Ca khả dụng</span><strong>${available.length}/${shifts.length}</strong></div>
        <div class="work-summary-card"><span>Lương cao nhất</span><strong>${bestWage ? `${money(bestWage.wage)} Quan` : '—'}</strong></div>
        <div class="work-summary-card"><span>Hiệu quả nhất</span><strong>${bestRate ? `${money(bestRate.wage)} / ${bestRate.fatigueCost} thể lực` : '—'}</strong></div>
      </div>
    `;

    const cards = shifts.length > 0
      ? [...shifts].sort((a, b) => Number(b.wage) - Number(a.wage)).map(shift => {
        const fatigueCost = Number(shift.fatigueCost ?? shift.staminaCost ?? 0);
        const blocked = fatigue + fatigueCost > 100;
        const attr = ATTR_LABELS[String(shift.attributeTarget || 'cra')] || String(shift.attributeTarget || '').toUpperCase();
        return `
          <div class="work-card ${blocked ? 'is-blocked' : ''}">
            <div class="work-card-head">
              <span class="enterprise-icon">${shift.icon || '工'}</span>
              <div>
                <div class="enterprise-name">${esc(shift.titleVi)}</div>
                <div class="enterprise-meta">${esc(shift.workplaceVi)} • ${esc(shift.professionNameVi)}</div>
              </div>
            </div>
            <div class="work-wage">${money(shift.wage)} <span>Quan / ca</span></div>
            <div class="work-meta">
              <span>${fatigueCost} thể lực</span>
              <span>+${shift.expGain} EXP nghề</span>
              <span>+${shift.attributeExp} EXP ${attr}</span>
            </div>
            <div class="work-note">${blocked ? `Cần nghỉ ngơi: đang mệt ${fatigue}/100, ca này tốn ${fatigueCost}.` : esc(shift.narrativeVi)}</div>
            <button class="ui-btn ui-btn--primary ui-btn--sm w-full" data-work-shift="${esc(shift.shiftId)}" ${blocked ? 'disabled' : ''}>Nhận việc · 1 ngày</button>
          </div>
        `;
      }).join('')
      : '<div class="enterprise-empty md:col-span-3">Chưa tải được danh mục ca làm việc.</div>';

    this.modal.setContent(`
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">工</div>
          <div class="lead-text">
            <h3>Lao Động Làm Thuê Thời Vụ</h3>
            <div class="text-muted text-sm">Mỗi ca tốn 1 ngày, trả tiền mặt ngay và tăng EXP nghề/thuộc tính. Mệt mỏi từ 100 trở lên sẽ chặn nhận ca.</div>
          </div>
        </div>
        ${summary}
        <div class="work-grid">${cards}</div>
      </div>
    `);

    const body = this.modal.getBodyElement();
    body?.querySelectorAll<HTMLElement>('[data-work-shift]').forEach(button => {
      button.addEventListener('click', async () => {
        const shiftId = button.dataset.workShift || '';
        button.setAttribute('disabled', 'true');
        await this.executeWork(shiftId);
        button.removeAttribute('disabled');
      });
    });
  }

  private toast(message: string, danger = false): void {
    if (typeof (window as any).showToast === 'function') {
      (window as any).showToast(message, danger);
    }
  }

  public async depositSafeCash(enterpriseId: string): Promise<void> {
    const input = document.getElementById(`enterprise-cash-${enterpriseId}`) as HTMLInputElement | null;
    const amount = Number(input?.value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await enterpriseWorkshopService.manageSafeCash(enterpriseId, 'DEPOSIT', Math.round(amount));
    this.toast('Đã nạp tiền vào Quỹ an toàn.');
    await this.refreshData();
    await this.renderActiveTab();
  }

  public async withdrawSafeCash(enterpriseId: string): Promise<void> {
    const input = document.getElementById(`enterprise-cash-${enterpriseId}`) as HTMLInputElement | null;
    const amount = Number(input?.value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await enterpriseWorkshopService.manageSafeCash(enterpriseId, 'WITHDRAW', Math.round(amount));
    this.toast('Đã rút tiền từ Quỹ an toàn về ngân khố.');
    await this.refreshData();
    await this.renderActiveTab();
  }

  public async executeWork(shiftType: string): Promise<void> {
    try {
      const res = await enterpriseWorkshopService.executeLaborShift(shiftType);
      this.toast(res.messageVi || res.message || res.narrativeVi || 'Lao động hoàn tất, nhận tiền công!');
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      this.toast(e.message || 'Không thể làm việc lúc này!', true);
    }
  }
}

export const enterpriseWorkshopModal = new EnterpriseWorkshopModal();
