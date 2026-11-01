/**
 * ThreeKingdoms-AgentEngine: Quest Log Modal
 * (src/client/features/quests/quest.modal.ts)
 *
 * Reads /api/quests (master_quests + player_quests). No quest text is
 * hardcoded in the UI.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';

interface QuestStepView {
  index: number;
  titleVi: string;
  titleEn: string;
  stat: string;
  dc: number;
  daysCost: number;
}

interface QuestView {
  questId: string;
  titleVi: string;
  titleEn: string;
  pathCode: string;
  descriptionVi: string;
  descriptionEn: string;
  status: 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';
  currentStep: number;
  attempts: number;
  steps: QuestStepView[];
}

interface ObligationView {
  obligationId: string;
  type: string;
  counterparty: string;
  amountCash: number;
  amountGrain: number;
  dueDate: string;
  status: 'DUE' | 'PAID' | 'OVERDUE' | 'WAIVED';
  daysRemaining: number;
  narrativeVi: string;
  narrativeEn: string;
  penalty?: Record<string, unknown>;
}

interface ObligationSummary {
  dueCount: number;
  overdueCount: number;
  totalCashDue: number;
  totalGrainDue: number;
  nextDueDate: string | null;
}

interface ContractOffer {
  offerId: string;
  itemCode: string;
  itemNameVi: string;
  itemNameEn: string;
  quantity: number;
  rewardCash: number;
  rewardFame: number;
  expiresDate: string;
  deadlineDays: number;
  narrativeVi: string;
  narrativeEn: string;
}

interface PlayerContract {
  contractId: string;
  itemCode: string;
  itemNameVi: string;
  itemNameEn: string;
  quantity: number;
  haveQuantity: number;
  rewardCash: number;
  rewardFame: number;
  dueDate: string;
  status: string;
  daysRemaining: number;
}

interface ContractBoard {
  settlementId: string;
  offers: ContractOffer[];
  contracts: PlayerContract[];
  summary: { active: number; overdue: number; rewardAtRisk: number };
}

interface CropOption {
  cropCode: string;
  nameVi: string;
  nameEn: string;
  inSeason: boolean;
  growthDays: number;
  seedCostPerMu: number;
}

interface FarmParcel {
  parcelId: string;
  nameVi: string;
  nameEn: string;
  areaMu: number;
  soilQuality: number;
  rentCash: number;
  baseRentCash?: number;
  rentDiscount?: number;
  status: string;
  crop: { cropCode: string; nameVi: string; harvestDate: string; daysRemaining: number; expectedYield: number } | null;
  availableCrops: CropOption[];
}

interface FarmBoard {
  settlementId: string;
  season: string;
  parcels: FarmParcel[];
  summary: { idle: number; leased: number; growing: number; nextHarvest: string | null };
}

interface IntelReport {
  reportId: string;
  subjectType: string;
  subjectName: string;
  claim: { price?: number; troops?: number };
  confidence: number;
  confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  source: string;
  expiresDate: string;
  verificationDays: number;
}

function isEn(): boolean {
  return (window as any).currentLang === 'en';
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rewardText(rewards: any): string {
  if (!rewards || typeof rewards !== 'object') return '';
  const parts: string[] = [];
  if (rewards.cash) parts.push(`+${rewards.cash} Quan`);
  if (rewards.fame) parts.push(`+${rewards.fame} ${isEn() ? 'fame' : 'danh vọng'}`);
  if (rewards.exp) {
    for (const [stat, amount] of Object.entries(rewards.exp)) {
      if (amount) parts.push(`+${amount} ${String(stat).toUpperCase()} EXP`);
    }
  }
  if (Array.isArray(rewards.items)) {
    for (const item of rewards.items) parts.push(`${item.quantity}× ${item.code}`);
  }
  return parts.join(' • ');
}

class QuestModal {
  private modal: ModalShellInstance;

  constructor() {
    this.modal = createModalShell({
      id: 'quest-modal',
      title: 'Nhật Ký Nhiệm Vụ',
      subtitle: 'Nhiệm vụ theo từng phẩm lộ, dữ liệu lấy từ DB',
      seal: '任',
      size: 'md'
    });
  }

  public async open(): Promise<void> {
    await this.modal.open();
    await this.refresh(null);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async load(): Promise<QuestView[]> {
    const res = await fetch('/api/quests');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Quest log failed');
    return data.quests || [];
  }

  private async loadFarm(): Promise<FarmBoard> {
    const res = await fetch('/api/farm/parcels');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Farm board failed');
    return {
      settlementId: data.settlementId || '',
      season: data.season || '',
      parcels: data.parcels || [],
      summary: data.summary || { idle: 0, leased: 0, growing: 0, nextHarvest: null }
    };
  }

  private async loadIntel(): Promise<IntelReport[]> {
    const res = await fetch('/api/intel');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Intel board failed');
    return data.reports || [];
  }

  private async loadContracts(): Promise<ContractBoard> {
    const res = await fetch('/api/contracts');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Contract board failed');
    return {
      settlementId: data.settlementId || '',
      offers: data.offers || [],
      contracts: data.contracts || [],
      summary: data.summary || { active: 0, overdue: 0, rewardAtRisk: 0 }
    };
  }

  private async loadObligations(): Promise<{ obligations: ObligationView[]; summary: ObligationSummary }> {
    const res = await fetch('/api/obligations');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Obligation log failed');
    return {
      obligations: data.obligations || [],
      summary: data.summary || { dueCount: 0, overdueCount: 0, totalCashDue: 0, totalGrainDue: 0, nextDueDate: null }
    };
  }

  public async refresh(result: any): Promise<void> {
    try {
      const [quests, dues, board, intel, farm] = await Promise.all([
        this.load(),
        this.loadObligations().catch(() => ({
          obligations: [] as ObligationView[],
          summary: { dueCount: 0, overdueCount: 0, totalCashDue: 0, totalGrainDue: 0, nextDueDate: null }
        })),
        this.loadContracts().catch(() => ({
          settlementId: '',
          offers: [] as ContractOffer[],
          contracts: [] as PlayerContract[],
          summary: { active: 0, overdue: 0, rewardAtRisk: 0 }
        })),
        this.loadIntel().catch(() => [] as IntelReport[]),
        this.loadFarm().catch(() => ({
          settlementId: '',
          season: '',
          parcels: [] as FarmParcel[],
          summary: { idle: 0, leased: 0, growing: 0, nextHarvest: null }
        }))
      ]);
      this.modal.setContent(this.render(quests, dues.obligations, dues.summary, board, intel, farm, result));
    } catch (error: any) {
      this.modal.setContent(`<div class="quest-empty">${esc(error.message)}</div>`);
    }
  }

  public async accept(questId: string): Promise<void> {
    try {
      const res = await fetch('/api/quests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Accept failed');
      await this.refresh(null);
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async advance(questId: string): Promise<void> {
    try {
      const res = await fetch('/api/quests/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Advance failed');
      await this.refresh(data.result);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async payObligation(obligationId: string): Promise<void> {
    try {
      const res = await fetch('/api/obligations/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Payment failed');
      await this.refresh(null);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async acceptContract(offerId: string): Promise<void> {
    try {
      const res = await fetch('/api/contracts/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Accept contract failed');
      await this.refresh(null);
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async rentFarm(parcelId: string): Promise<void> {
    try {
      const res = await fetch('/api/farm/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Rent failed');
      await this.refresh(null);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async plantCrop(parcelId: string, cropCode: string): Promise<void> {
    try {
      const res = await fetch('/api/farm/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId, cropCode })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Plant failed');
      await this.refresh(null);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async harvestFarm(parcelId: string): Promise<void> {
    try {
      const res = await fetch('/api/farm/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Harvest failed');
      await this.refresh(null);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async verifyIntel(reportId: string): Promise<void> {
    try {
      const res = await fetch('/api/intel/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Verify intel failed');
      await this.refresh(null);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async deliverContract(contractId: string): Promise<void> {
    try {
      const res = await fetch('/api/contracts/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Deliver contract failed');
      await this.refresh(null);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  private renderContracts(board: ContractBoard, en: boolean): string {
    const offers = board.offers || [];
    const active = (board.contracts || []).filter(contract => contract.status === 'ACTIVE');
    if (offers.length === 0 && active.length === 0) {
      return `<div class="quest-empty">${en ? 'No contracts posted.' : 'Chưa có hợp đồng.'}</div>`;
    }
    const header = en
      ? `Contracts • ${board.settlementId} • ${active.length} active`
      : `Hợp đồng • ${board.settlementId} • ${active.length} đang chạy`;
    const offerHtml = offers.map(offer => `
      <div class="quest-item">
        <div class="quest-head">
          <div>
            <div class="quest-title">${esc(en ? offer.itemNameEn : offer.itemNameVi)} × ${offer.quantity}</div>
            <div class="quest-path">${esc(offer.rewardCash)} Quan • +${offer.rewardFame} ${en ? 'fame' : 'danh vọng'} • ${en ? 'by' : 'hạn'} ${esc(offer.expiresDate)}</div>
          </div>
          <button class="quest-action" onclick="QuestUI.acceptContract('${esc(offer.offerId)}')">${en ? 'Accept' : 'Nhận'}</button>
        </div>
        <div class="quest-desc">${esc(en ? offer.narrativeEn : offer.narrativeVi)}</div>
      </div>
    `).join('');
    const activeHtml = active.map(contract => {
      const ready = contract.haveQuantity >= contract.quantity;
      const late = contract.daysRemaining < 0;
      return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${esc(en ? contract.itemNameEn : contract.itemNameVi)} ${contract.haveQuantity}/${contract.quantity}</div>
              <div class="quest-path">${esc(contract.rewardCash)} Quan • ${en ? 'due' : 'hạn'} ${esc(contract.dueDate)}${late ? ` • ${en ? 'late' : 'quá hạn'}` : ''}</div>
            </div>
            <button class="quest-action ${ready ? 'is-primary' : ''}" onclick="QuestUI.deliverContract('${esc(contract.contractId)}')">${en ? 'Deliver' : 'Giao'}</button>
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="quest-section">
        <div class="quest-section-title">${esc(header)}</div>
        ${activeHtml}${offerHtml}
      </div>
    `;
  }

  private renderFarm(farm: FarmBoard, en: boolean): string {
    if (!farm.parcels || farm.parcels.length === 0) {
      return `<div class="quest-empty">${en ? 'No farmland here.' : 'Không có ruộng ở đây.'}</div>`;
    }
    const items = farm.parcels.map(parcel => {
      const name = en ? parcel.nameEn : parcel.nameVi;
      let action = '';
      if (parcel.status === 'IDLE') {
        action = `<button class="quest-action" onclick="QuestUI.rentFarm('${esc(parcel.parcelId)}')">${en ? 'Rent' : 'Thuê'} (${parcel.rentCash} Quan)</button>`;
      } else if (parcel.status === 'LEASED') {
        const crops = (parcel.availableCrops || []).filter(crop => crop.inSeason);
        action = crops.length > 0
          ? crops.map(crop => `<button class="quest-action" onclick="QuestUI.plantCrop('${esc(parcel.parcelId)}','${esc(crop.cropCode)}')">${en ? `Plant ${crop.nameEn}` : `Trồng ${crop.nameVi}`}</button>`).join(' ')
          : `<span class="quest-badge">${en ? 'Out of season' : 'Trái mùa'}</span>`;
      } else if (parcel.status === 'GROWING' && parcel.crop) {
        const ready = parcel.crop.daysRemaining <= 0;
        action = `<button class="quest-action ${ready ? 'is-primary' : ''}" onclick="QuestUI.harvestFarm('${esc(parcel.parcelId)}')">${en ? 'Harvest' : 'Thu hoạch'}</button>`;
      }
      const cropLine = parcel.crop
        ? `${esc(en ? parcel.crop.nameVi : parcel.crop.nameVi)} • ${en ? 'harvest' : 'thu'} ${esc(parcel.crop.harvestDate)} • ${parcel.crop.daysRemaining}${en ? 'd' : ' ngày'} • ${en ? 'yield' : 'dự kiến'} ${parcel.crop.expectedYield}`
        : `${parcel.areaMu} ${en ? 'mu' : 'mẫu'} • ${en ? 'soil' : 'đất'} ${parcel.soilQuality.toFixed(2)} • ${en ? 'rent' : 'tô'} ${parcel.rentCash} Quan${(parcel.rentDiscount || 0) > 0 ? ` (-${parcel.rentDiscount}%)` : ''}`;
      return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${esc(name)}</div>
              <div class="quest-path">${cropLine}</div>
            </div>
            ${action}
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="quest-section">
        <div class="quest-section-title">${en ? `Farmland • ${farm.season} • ${farm.summary.growing} growing` : `Nông Trại • ${farm.season} • ${farm.summary.growing} vụ`}</div>
        ${items}
      </div>
    `;
  }

  private renderIntel(reports: IntelReport[], en: boolean): string {
    if (!reports || reports.length === 0) {
      return `<div class="quest-empty">${en ? 'No reports this month.' : 'Không có tin đồn tháng này.'}</div>`;
    }
    const items = reports.map(report => {
      const claim = report.subjectType === 'PRICE'
        ? (en ? `${report.claim.price} quan` : `${report.claim.price} Quan`)
        : (en ? `${report.claim.troops} troops` : `${report.claim.troops} binh`);
      return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${esc(report.subjectName)}</div>
              <div class="quest-path">${esc(report.subjectType)} • ${esc(claim)} • ${esc(report.source)} • ${esc(report.confidenceLabel)}</div>
            </div>
            <button class="quest-action" onclick="QuestUI.verifyIntel('${esc(report.reportId)}')">${en ? `Verify (${report.verificationDays}d)` : `Xác minh (${report.verificationDays} ngày)`}</button>
          </div>
          <div class="quest-path">${en ? 'Expires' : 'Hết hạn'} ${esc(report.expiresDate)}</div>
        </div>
      `;
    }).join('');
    return `
      <div class="quest-section">
        <div class="quest-section-title">${en ? `Intel • ${reports.length} reports` : `Tin đồn • ${reports.length} báo cáo`}</div>
        ${items}
      </div>
    `;
  }

  private renderObligations(
    obligations: ObligationView[],
    summary: ObligationSummary,
    en: boolean
  ): string {
    const active = obligations.filter(row => row.status === 'DUE' || row.status === 'OVERDUE');
    if (active.length === 0) {
      return `<div class="quest-empty">${en ? 'No obligations due.' : 'Không có nghĩa vụ đến hạn.'}</div>`;
    }
    const header = en
      ? `Obligations • ${summary.totalCashDue} quan due${summary.overdueCount ? ` • ${summary.overdueCount} overdue` : ''}`
      : `Nghĩa vụ • ${summary.totalCashDue} Quan đến hạn${summary.overdueCount ? ` • ${summary.overdueCount} quá hạn` : ''}`;
    const items = active.map(row => {
      const overdue = row.status === 'OVERDUE';
      const statusLabel = overdue
        ? (en ? 'Overdue' : 'Quá hạn')
        : (en ? 'Due' : 'Đến hạn');
      const timing = overdue
        ? (en ? `${Math.abs(row.daysRemaining)} days late` : `Trễ ${Math.abs(row.daysRemaining)} ngày`)
        : (en ? `${row.daysRemaining} days left` : `Còn ${row.daysRemaining} ngày`);
      const amount = row.amountGrain > 0
        ? `${row.amountCash} Quan + ${row.amountGrain} ${en ? 'piculs' : 'Thạch'}`
        : `${row.amountCash} Quan`;
      return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${esc((en ? row.narrativeEn : row.narrativeVi) || row.type)}</div>
              <div class="quest-path">${esc(row.type)} • ${esc(row.dueDate)} • ${esc(timing)}</div>
            </div>
            <button class="quest-action ${overdue ? 'is-primary' : ''}" onclick="QuestUI.payObligation('${esc(row.obligationId)}')">${en ? 'Pay' : 'Nộp'}</button>
          </div>
          <div class="quest-meta">${esc(amount)}</div>
          <div class="quest-path"><span class="quest-badge">${statusLabel}</span></div>
        </div>
      `;
    }).join('');
    return `
      <div class="quest-section">
        <div class="quest-section-title">${esc(header)}</div>
        ${items}
      </div>
    `;
  }

  private render(
    quests: QuestView[],
    obligations: ObligationView[],
    summary: ObligationSummary,
    board: ContractBoard,
    intel: IntelReport[],
    farm: FarmBoard,
    result: any
  ): string {
    const en = isEn();
    const resultHtml = result ? `
      <div class="quest-result ${result.success ? 'is-success' : 'is-failure'}">
        <strong>${result.success ? (en ? 'Step succeeded' : 'Bước thành công') : (en ? 'Step failed' : 'Bước thất bại')}</strong>
        <div>${esc(en ? result.narrativeEn : result.narrative)}</div>
        <div class="quest-meta">D20 ${result.roll} + ${result.mod} = ${result.total} / DC ${result.dc}</div>
        <div class="quest-meta">${esc(rewardText(result.rewards || {}))}</div>
      </div>
    ` : '';

    const items = quests.map(quest => {
      const statusLabel = quest.status === 'COMPLETED'
        ? (en ? 'Completed' : 'Đã hoàn thành')
        : quest.status === 'ACTIVE'
          ? (en ? 'Active' : 'Đang làm')
          : (en ? 'Available' : 'Có thể nhận');
      const steps = quest.steps.map(step => `
        <div class="quest-step ${step.index < quest.currentStep ? 'is-done' : step.index === quest.currentStep && quest.status === 'ACTIVE' ? 'is-current' : ''}">
          <span class="quest-step-index">${step.index + 1}</span>
          <span class="quest-step-title">${esc(en ? step.titleEn : step.titleVi)}</span>
          <span class="quest-step-check">${esc(String(step.stat).toUpperCase())} DC ${step.dc} • ${step.daysCost}${en ? 'd' : ' ngày'}</span>
        </div>
      `).join('');
      const action = quest.status === 'AVAILABLE'
        ? `<button class="quest-action" onclick="QuestUI.accept('${esc(quest.questId)}')">${en ? 'Accept' : 'Nhận nhiệm vụ'}</button>`
        : quest.status === 'ACTIVE'
          ? `<button class="quest-action is-primary" onclick="QuestUI.advance('${esc(quest.questId)}')">${en ? `Advance step ${quest.currentStep + 1}` : `Thực hiện bước ${quest.currentStep + 1}`}</button>`
          : `<span class="quest-badge">${en ? 'Completed' : 'Hoàn thành'}</span>`;
      return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${esc(en ? quest.titleEn : quest.titleVi)}</div>
              <div class="quest-path">${esc(quest.pathCode)} • ${statusLabel}</div>
            </div>
            ${action}
          </div>
          <div class="quest-desc">${esc(en ? quest.descriptionEn : quest.descriptionVi)}</div>
          <div class="quest-steps">${steps}</div>
        </div>
      `;
    }).join('');

    const obligationsHtml = this.renderObligations(obligations, summary, en);
    const contractsHtml = this.renderContracts(board, en);
    const farmHtml = this.renderFarm(farm, en);
    const intelHtml = this.renderIntel(intel, en);
    return `<div class="quest-body">${resultHtml}${obligationsHtml}${contractsHtml}${farmHtml}${intelHtml}${items || `<div class="quest-empty">${en ? 'No quests available.' : 'Chưa có nhiệm vụ.'}</div>`}</div>`;
  }
}

export const questModal = new QuestModal();
