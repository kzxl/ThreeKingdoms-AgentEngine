/**
 * ThreeKingdoms-AgentEngine: Standardized Lineage & Family Modal Component
 * (src/client/features/lineage-family/lineage-family.modal.ts)
 *
 * Implements the Family & Dynastic Lineage management interface
 * on top of the standardized ModalShell core.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { lineageFamilyService } from './lineage-family.service';
import { CourtshipCandidate, FamilyChild, FamilySpouse, LineageOverview } from './lineage-family.types';

export class LineageFamilyModal {
  private modal: ModalShellInstance;
  private overview: LineageOverview | null = null;
  private candidates: CourtshipCandidate[] = [];
  private selectedStratumFilter: string = 'ALL';

  constructor() {
    this.modal = createModalShell({
      id: 'standard-lineage-family-modal',
      title: 'Gia Thất & Thế Gia Vọng Tộc',
      subtitle: 'Cầu hôn giai nhân, bồi dưỡng thế tử kế nghiệp, kiến lập gia tộc ngàn đời',
      seal: '家',
      size: 'xl',
      tabs: [
        { id: 'courtship', label: 'Cầu Hôn & Thê Thiếp', seal: '姻' },
        { id: 'heirs', label: 'Hậu Duệ & Thụ Giáo', seal: '嗣' },
        { id: 'tree', label: 'Gia Phả Dòng Họ', seal: '譜' },
        { id: 'succession', label: 'Tông Miếu & Thừa Kế', seal: '繼' }
      ],
      activeTabId: 'courtship',
      onOpen: async () => {
        await this.refreshData();
        await this.renderActiveTab();
      },
      onTabChange: async (tabId) => {
        await this.renderActiveTab();
      }
    });
  }

  public async open(tabId = 'courtship'): Promise<void> {
    await this.modal.open(tabId);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refreshData(): Promise<void> {
    try {
      const [ov, cand] = await Promise.all([
        lineageFamilyService.getOverview().catch(() => null),
        lineageFamilyService.getCourtshipCandidates().catch(() => [])
      ]);
      this.overview = ov;
      this.candidates = cand;

      const spouseCount = ov?.spouses?.length || 0;
      const heirCount = ov?.children?.length || 0;
      this.modal.updateTabBadge('courtship', spouseCount > 0 ? spouseCount : undefined);
      this.modal.updateTabBadge('heirs', heirCount > 0 ? heirCount : undefined);
    } catch (e) {
      console.error('[LineageFamilyModal] Error refreshing data:', e);
    }
  }

  private async renderActiveTab(): Promise<void> {
    const tab = this.modal.activeTab || 'courtship';
    switch (tab) {
      case 'courtship':
        this.renderCourtshipTab();
        break;
      case 'heirs':
        this.renderHeirsTab();
        break;
      case 'tree':
        this.renderTreeTab();
        break;
      case 'succession':
        this.renderSuccessionTab();
        break;
      default:
        this.renderCourtshipTab();
    }
  }

  private renderCourtshipTab(): void {
    const spouses = this.overview?.spouses || [];
    const isMarried = spouses.length > 0;

    let filteredCandidates = this.candidates;
    if (this.selectedStratumFilter !== 'ALL') {
      filteredCandidates = this.candidates.filter(c => c.socialStratum === this.selectedStratumFilter);
    }

    const html = `
      <div class="lineage-modal-content">
        <!-- Clan Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">家</div>
          <div class="lead-text">
            <h3>Gia Tộc Thế Hệ Thứ ${this.overview?.generation || 1} • Danh Vọng Gia Tộc: ${this.overview?.clanPrestige || 100}</h3>
            <div class="text-muted text-sm">
              ${isMarried 
                ? `Đã thành gia lập thất với ${spouses.length} phu nhân. Gia đạo hòa thuận, con cháu hưng vượng.` 
                : 'Chưa lập gia thất. Hãy tìm kiếm giai nhân phù hợp từ thường dân hoặc danh môn để kết tóc se duyên.'}
            </div>
          </div>
        </div>

        <!-- Current Spouses Section -->
        ${isMarried ? `
          <div class="section-title text-gold font-bold mb-3">Chính Thê & Thê Thiếp Đang Chung Sống:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            ${spouses.map(s => this.renderSpouseCard(s)).join('')}
          </div>
        ` : ''}

        <!-- Courtship Section -->
        <div class="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
          <div class="section-title text-gold font-bold">Danh Sách Giai Nhân & Đối Tượng Cầu Hôn:</div>
          <div class="flex gap-2">
            <button class="btn btn-xs ${this.selectedStratumFilter === 'ALL' ? 'btn-primary' : 'btn-action-ghost'}" onclick="window.LineageFamilyUI.setFilter('ALL')">Tất Cả (${this.candidates.length})</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === 'PEASANT' ? 'btn-primary' : 'btn-action-ghost'}" onclick="window.LineageFamilyUI.setFilter('PEASANT')">Nông Gia</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === 'ARTISAN_SHOP' ? 'btn-primary' : 'btn-action-ghost'}" onclick="window.LineageFamilyUI.setFilter('ARTISAN_SHOP')">Thợ Xưởng</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === 'GENTRY_CLAN' ? 'btn-primary' : 'btn-action-ghost'}" onclick="window.LineageFamilyUI.setFilter('GENTRY_CLAN')">Sĩ Tộc</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === 'HISTORICAL_HEROINE' ? 'btn-primary' : 'btn-action-ghost'}" onclick="window.LineageFamilyUI.setFilter('HISTORICAL_HEROINE')">Danh Viện</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${filteredCandidates.length > 0 
            ? filteredCandidates.map(c => this.renderCandidateCard(c)).join('')
            : '<div class="text-muted col-span-full py-6 text-center">Không có giai nhân nào trong danh mục này.</div>'}
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderSpouseCard(spouse: FamilySpouse): string {
    const roles: Array<{ id: string; name: string }> = [
      { id: 'HOUSEKEEPER', name: 'Quản Gia Tề Nội' },
      { id: 'ENTERPRISE_SUPERVISOR', name: 'Giám Sát Sản Nghiệp' },
      { id: 'STRATEGIC_ADVISOR', name: 'Mưu Lược Tham Mưu' },
      { id: 'MILITARY_DEFENDER', name: 'Thống Soái Hộ Vệ' }
    ];

    const isPregnant = Number(spouse.pregnancy_stage) > 0;
    const pregnancyText = Number(spouse.pregnancy_stage) === 1 ? 'Thai Nghén Sơ Kỳ (Tháng 1)' 
                        : Number(spouse.pregnancy_stage) === 2 ? 'Thai Kỳ Trung Kỳ (Tháng 2)' 
                        : Number(spouse.pregnancy_stage) === 3 ? 'Sắp Đến Ngày Lâm Bồn!' : 'Bình thường';

    return `
      <div class="tactical-card border-l-4 border-pink-500 p-3 bg-slate-900/80 rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${spouse.wife_name_vi}</h4>
            <div class="text-xs text-muted">Hôn Lễ: Ngày ${spouse.marriage_date} (Lượt ${spouse.marriage_turn})</div>
          </div>
          <div class="badge ${isPregnant ? 'badge-danger animate-pulse' : 'badge-neutral'} text-xs">
            ${isPregnant ? '🍼 ' + pregnancyText : 'Hảo Cảm: ' + spouse.intimacy}
          </div>
        </div>

        <div class="text-xs text-slate-300 mb-3 bg-slate-950/60 p-2 rounded border border-amber-900/30">
          <div class="font-semibold text-amber-300/90 mb-1">Trọng Trách Nội Trạch:</div>
          <select class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-100" 
                  onchange="window.LineageFamilyUI.assignRole('${spouse.marriage_id}', this.value)">
            ${roles.map(r => `<option value="${r.id}" ${spouse.household_role === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
          </select>
          <div class="text-muted mt-1 italic">${spouse.role_effect_desc_vi || ''}</div>
        </div>

        <div class="flex gap-2">
          <button class="btn btn-xs btn-primary flex-1" onclick="window.LineageFamilyUI.restCohabit('${spouse.wife_id}')">
            ❤️ Nghỉ Ngơi & Đồng Tẩm
          </button>
        </div>
      </div>
    `;
  }

  private renderCandidateCard(cand: CourtshipCandidate): string {
    const stratumLabels: Record<string, { label: string; color: string }> = {
      PEASANT: { label: 'Nông Thôn', color: 'badge-success' },
      ARTISAN_SHOP: { label: 'Thợ Xưởng', color: 'badge-info' },
      GENTRY_CLAN: { label: 'Sĩ Tộc', color: 'badge-warning' },
      HISTORICAL_HEROINE: { label: 'Danh Viện', color: 'badge-danger' }
    };
    const stratum = stratumLabels[cand.socialStratum || 'HISTORICAL_HEROINE'] || { label: 'Danh Viện', color: 'badge-danger' };

    return `
      <div class="tactical-card p-3 bg-slate-900/70 border border-slate-800 rounded flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-amber-100 font-bold m-0 text-sm">${cand.nameVi}</h4>
            <span class="badge ${stratum.color} text-xs">${stratum.label}</span>
          </div>

          <div class="text-xs text-muted mb-2 line-clamp-2">${cand.clueVi}</div>

          ${cand.maternalTrait ? `
            <div class="bg-amber-950/30 border border-amber-900/40 rounded p-1.5 text-xs text-amber-300 mb-2">
              <span class="font-bold">Huyết Mạch:</span> ${cand.maternalTrait.traitNameVi}
              <div class="text-muted text-[11px]">${cand.maternalTrait.descriptionVi}</div>
            </div>
          ` : ''}

          <div class="text-xs text-slate-300 mb-3 flex items-center justify-between">
            <span>Sính Lễ Yêu Cầu:</span>
            <span class="text-amber-400 font-mono font-bold">${cand.dowryCash.toLocaleString()} Tiền</span>
          </div>
        </div>

        <button class="btn btn-xs btn-action-gold w-full" 
                onclick="window.LineageFamilyUI.proposeMarriage('${cand.npcId}')">
          Cầu Hôn Nạp Sính Lễ
        </button>
      </div>
    `;
  }

  private renderHeirsTab(): void {
    const children = this.overview?.children || [];
    const html = `
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">嗣</div>
          <div class="lead-text">
            <h3>Hậu Duệ & Danh Sư Thụ Giáo</h3>
            <div class="text-muted text-sm">
              Con cái thừa hưởng di truyền phụ mẫu, tiếp nhận huấn luyện của danh tướng để chuẩn bị kế vị tông tộc.
            </div>
          </div>
        </div>

        ${children.length === 0 ? `
          <div class="text-center py-12 text-muted">
            <div class="text-4xl mb-3">👶</div>
            <div>Hiện tại gia tộc chưa có hậu duệ sinh hạ. Hãy nghỉ ngơi đồng tẩm cùng phu nhân để thụ thai dưỡng dục.</div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${children.map(ch => this.renderChildCard(ch)).join('')}
          </div>
        `}
      </div>
    `;
    this.modal.setContent(html);
  }

  private renderChildCard(child: FamilyChild): string {
    const isHeir = child.is_heir === 1;
    return `
      <div class="tactical-card p-4 bg-slate-900/80 border ${isHeir ? 'border-amber-400 shadow-amber-900/20' : 'border-slate-800'} rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${child.name_vi} ${child.style_name ? `(${child.style_name})` : ''}</h4>
            <div class="text-xs text-muted">${child.gender === 'MALE' ? 'Nam Tử' : 'Nữ Nhi'} • Tuổi: ${child.age} • Mẫu thân: ${child.mother_name_vi || 'Nội thất'}</div>
          </div>
          <span class="badge ${isHeir ? 'badge-primary' : 'badge-neutral'} text-xs">
            ${isHeir ? '👑 ĐÍCH TỬ KẾ VỊ' : 'Thứ Tử'}
          </span>
        </div>

        <!-- Genetic Stats Radar / Grid -->
        <div class="grid grid-cols-4 gap-1 text-center font-mono text-xs bg-slate-950/70 p-2 rounded mb-3">
          <div><span class="text-muted">VÕ:</span> <span class="text-red-400 font-bold">${child.stats.war}</span></div>
          <div><span class="text-muted">TRÍ:</span> <span class="text-blue-400 font-bold">${child.stats.int}</span></div>
          <div><span class="text-muted">THỐNG:</span> <span class="text-amber-400 font-bold">${child.stats.ldr}</span></div>
          <div><span class="text-muted">CHÍNH:</span> <span class="text-purple-400 font-bold">${child.stats.pol}</span></div>
          <div><span class="text-muted">THƯƠNG:</span> <span class="text-yellow-400 font-bold">${child.stats.com}</span></div>
          <div><span class="text-muted">GIAO:</span> <span class="text-green-400 font-bold">${child.stats.dip}</span></div>
          <div><span class="text-muted">XẢO:</span> <span class="text-cyan-400 font-bold">${child.stats.cra}</span></div>
          <div><span class="text-muted">HẬU:</span> <span class="text-orange-400 font-bold">${child.stats.log}</span></div>
        </div>

        <div class="text-xs text-slate-300 mb-3">
          <span class="font-bold text-amber-300/80">Danh Sư Hướng Dẫn:</span> 
          ${child.assigned_mentor_name_vi || '<span class="text-muted">Chưa bái sư</span>'}
        </div>

        <div class="flex gap-2">
          ${!isHeir ? `
            <button class="btn btn-xs btn-action-gold flex-1" onclick="window.LineageFamilyUI.designateHeir('${child.child_id}')">
              Lập Làm Thế Tử
            </button>
          ` : ''}
          <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.LineageFamilyUI.assignMentorDialog('${child.child_id}')">
            Chỉ Định Danh Sư
          </button>
        </div>
      </div>
    `;
  }

  private renderTreeTab(): void {
    const html = `
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">譜</div>
          <div class="lead-text">
            <h3>Gia Phả Tông Tộc • Thế Hệ ${this.overview?.generation || 1}</h3>
            <div class="text-muted text-sm">Ghi chép công đức tiên tổ và thứ bậc con cháu dòng dõi.</div>
          </div>
        </div>

        <div class="p-6 bg-slate-950/60 rounded border border-amber-900/30 text-center">
          <div class="inline-block p-4 border-2 border-amber-500 rounded bg-slate-900 text-amber-200 font-bold text-lg mb-4">
            Đời Thứ ${this.overview?.generation || 1}: ${this.overview?.clanName || 'Lương Gia Tộc'}
          </div>
          <div class="text-xs text-muted mb-6">↓ Các chi phu nhân & thế tử tiếp nối ↓</div>
          
          <div class="flex flex-wrap justify-center gap-4">
            ${(this.overview?.children || []).map(c => `
              <div class="p-3 bg-slate-900 rounded border border-slate-700 min-w-[140px] text-xs">
                <div class="font-bold text-amber-300">${c.name_vi}</div>
                <div class="text-muted">${c.is_heir === 1 ? '👑 Thế Tử' : 'Chi tộc'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    this.modal.setContent(html);
  }

  private renderSuccessionTab(): void {
    const heir = this.overview?.activeHeir;
    const html = `
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">繼</div>
          <div class="lead-text">
            <h3>Tông Miếu Kế Thừa & Chuyển Giao Quyền Lực</h3>
            <div class="text-muted text-sm">
              Chuyển giao quyền điều khiển nhân vật chính sang Thế tử trưởng thành, bảo tồn 100% tài sản, sản nghiệp và trang bị truyền thừa.
            </div>
          </div>
        </div>

        ${!heir ? `
          <div class="text-center py-10 text-muted">
            Chưa chỉ định Thế tử kế vị. Vui lòng vào mục "Hậu Duệ" và chọn một người con trưởng thành làm thế tử.
          </div>
        ` : `
          <div class="tactical-card p-6 bg-slate-900/90 border border-amber-500/50 rounded mb-4">
            <h4 class="text-amber-300 font-bold text-lg mb-2">Thế Tử Kế Thừa: ${heir.name_vi} (${heir.age} Tuổi)</h4>
            <div class="text-sm text-slate-300 mb-4">
              Khi thực hiện chuyển giao:
              <ul class="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Nhân vật người chơi sẽ chuyển sang điều khiển <strong class="text-amber-200">${heir.name_vi}</strong>.</li>
                <li>Thế hệ gia tộc tăng lên <strong>Thế Hệ Thứ ${(this.overview?.generation || 1) + 1}</strong>.</li>
                <li>100% Tiền mặt, Sản nghiệp và Binh khí truyền quốc được bảo lưu toàn vẹn.</li>
              </ul>
            </div>

            <button class="btn btn-action-gold w-full py-2.5 text-base font-bold" 
                    onclick="window.LineageFamilyUI.executeSuccession()">
              Khởi Sự Kế Thừa Gia Tộc
            </button>
          </div>
        `}
      </div>
    `;
    this.modal.setContent(html);
  }

  public setFilter(stratum: string): void {
    this.selectedStratumFilter = stratum;
    this.renderCourtshipTab();
  }

  public async proposeMarriage(candidateId: string): Promise<void> {
    try {
      const res = await lineageFamilyService.proposeMarriage(candidateId);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Kết tóc se duyên thành công!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Cầu hôn thất bại!', true);
      }
    }
  }

  public async restCohabit(spouseId: string): Promise<void> {
    try {
      const res = await lineageFamilyService.restAndCohabit(spouseId);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Đồng tẩm nghỉ ngơi tĩnh dưỡng thành công!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Không thể nghỉ ngơi lúc này!', true);
      }
    }
  }

  public async assignRole(marriageId: string, role: string): Promise<void> {
    try {
      await lineageFamilyService.assignHouseholdRole(marriageId, role);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Đã phân công trọng trách nội trạch thành công!');
      }
      await this.refreshData();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi phân công trọng trách!', true);
      }
    }
  }

  public async designateHeir(childId: string): Promise<void> {
    try {
      await lineageFamilyService.designateHeir(childId);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Đã chỉ định đích tử kế vị gia tộc!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Không thể lập thế tử!', true);
      }
    }
  }

  public async assignMentorDialog(childId: string): Promise<void> {
    // Mentors can be chosen from notable officers (e.g., Guan Yu, Lu Zhi)
    const mentorId = prompt('Nhập ID danh sư thụ giáo (ví dụ: NPC-0003 cho Quan Vũ, NPC-0001 cho Lư Thực):', 'NPC-0003');
    if (!mentorId) return;
    try {
      await lineageFamilyService.assignMentor(childId, mentorId);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Đã bái kiến danh sư thụ giáo thành công!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi chỉ định danh sư!', true);
      }
    }
  }

  public async executeSuccession(): Promise<void> {
    if (!confirm('Bạn có chắc chắn muốn chuyển giao quyền lực sang Thế tử kế thừa không?')) return;
    try {
      const res = await lineageFamilyService.executeSuccession();
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Đại điển kế thừa tông miếu hoàn tất!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Kế thừa thất bại!', true);
      }
    }
  }
}

export const lineageFamilyModal = new LineageFamilyModal();
