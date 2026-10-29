/**
 * ThreeKingdoms-AgentEngine: Standardized Spatial POI Modals
 * (src/client/features/spatial-poi/spatial-poi.modal.ts)
 *
 * Implements Tavern, Arena, and Residence modals using the standardized ModalShell.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { spatialPoiService } from './spatial-poi.service';
import { ArenaOpponent, BanquetTier, DuelRoundState } from './spatial-poi.types';

export class SpatialPoiModalsManager {
  private tavernModal: ModalShellInstance;
  private arenaModal: ModalShellInstance;
  private residenceModal: ModalShellInstance;

  private currentDuelId: string | null = null;
  private currentDuelState: DuelRoundState | null = null;
  private arenaRoster: ArenaOpponent[] = [];

  constructor() {
    // 1. Tavern Modal
    this.tavernModal = createModalShell({
      id: 'spatial-tavern-modal',
      title: 'Tửu Quán Trác Huyện • Ẩm Tửu & Tụ Nghĩa',
      subtitle: 'Gặp gỡ anh hùng bốn phương, mở tiệc rượu kết giao và chiêu mộ môn khách',
      seal: '酒',
      size: 'lg',
      tabs: [
        { id: 'drink', label: 'Ẩm Tửu Dưỡng Thần', seal: '酒' },
        { id: 'banquet', label: 'Đại Yến Hào Kiệt', seal: '膳' },
        { id: 'brotherhood', label: 'Kết Bái Huynh Đệ', seal: '盟' },
        { id: 'recruit', label: 'Chiêu Mộ Môn Khách', seal: '旗' }
      ],
      activeTabId: 'drink',
      onOpen: async () => {
        await this.renderTavernTab();
      },
      onTabChange: async () => {
        await this.renderTavernTab();
      }
    });

    // 2. Arena Modal
    this.arenaModal = createModalShell({
      id: 'spatial-arena-modal',
      title: 'Lôi Đài Giáo Trường • Luận Kiếm & Diễn Võ',
      subtitle: 'Thao trường luận kiếm danh tướng, giao đấu 1v1 đoạt danh vọng và chiến tích',
      seal: '武',
      size: 'lg',
      tabs: [
        { id: 'spar', label: 'Luận Kiếm Danh Tướng', seal: '武' },
        { id: 'challenge', label: 'Lôi Đài Tam Cấp', seal: '勳' },
        { id: 'duel', label: 'Chiến Báo Quyết Đấu', seal: '雷' }
      ],
      activeTabId: 'spar',
      onOpen: async () => {
        await this.renderArenaTab();
      },
      onTabChange: async () => {
        await this.renderArenaTab();
      }
    });

    // 3. Residence Modal
    this.residenceModal = createModalShell({
      id: 'spatial-residence-modal',
      title: 'Tư Trạch Vườn Đào • Dưỡng Thần & Gia Đạo',
      subtitle: 'Trang viên tư gia, tề gia lập thất, nghỉ ngơi phục hồi sinh lực và bồi dưỡng thế hệ',
      seal: '園',
      size: 'lg',
      tabs: [
        { id: 'rest', label: 'Dưỡng Sinh Nghỉ Ngơi', seal: '茶' },
        { id: 'family', label: 'Gia Đạo & Thê Thiếp', seal: '家' },
        { id: 'study', label: 'Thư Trai Điển Tịch', seal: '卷' }
      ],
      activeTabId: 'rest',
      onOpen: async () => {
        await this.renderResidenceTab();
      },
      onTabChange: async () => {
        await this.renderResidenceTab();
      }
    });
  }

  // --- Public Control Methods ---
  public async openTavern(tab = 'drink'): Promise<void> {
    await this.tavernModal.open(tab);
  }

  public async closeTavern(): Promise<void> {
    await this.tavernModal.close();
  }

  public async openArena(tab = 'spar'): Promise<void> {
    await this.arenaModal.open(tab);
  }

  public async closeArena(): Promise<void> {
    await this.arenaModal.close();
  }

  public async openResidence(tab = 'rest'): Promise<void> {
    await this.residenceModal.open(tab);
  }

  public async closeResidence(): Promise<void> {
    await this.residenceModal.close();
  }

  // =========================================================================
  // 1. TAVERN RENDERING
  // =========================================================================
  private async renderTavernTab(): Promise<void> {
    const tab = this.tavernModal.activeTab || 'drink';
    switch (tab) {
      case 'drink':
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">酒</div>
            <div class="lead-text">
              <h3>Đỗ Khang Mỹ Tửu • Ẩm Tửu Tiêu Sầu</h3>
              <div class="text-muted text-sm">Thưởng thức danh tửu Trác Quận, xua tan mỏi mệt sa trường và tăng cường khí lực.</div>
            </div>
          </div>
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 text-center">
            <div class="text-3xl mb-2">酒</div>
            <h4 class="text-amber-200 font-bold mb-2">Bình Đỗ Khang Nồng Ấm</h4>
            <p class="text-xs text-muted mb-4">Chi phí: 50 Quan / 1 Rượu • Hồi phục +25 Thể lực, +15 Sĩ khí</p>
            <button class="ui-btn ui-btn--accent px-6 py-2" onclick="window.SpatialPoiModals.executeDrinkWine()">
              Uống Rượu Dưỡng Thần
            </button>
          </div>
        `);
        break;

      case 'banquet':
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">膳</div>
            <div class="lead-text">
              <h3>Khai Yến Chiêu Đãi • Tụ Nghĩa Hào Kiệt</h3>
              <div class="text-muted text-sm">Mở tiệc thết đãi chư tướng và hào kiệt trong thành, gia tăng tình cảm và hảo cảm phe phái.</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold text-sm mb-1">Tiểu Yến Đàm Đạo</h4>
              <div class="text-xs text-muted mb-3">Yến tiệc nhỏ đàm đạo thế sự cùng 2-3 hảo hữu.</div>
              <div class="text-xs font-mono text-amber-400 mb-3">300 Quan • 2 Rượu</div>
              <button class="ui-btn ui-btn--primary ui-btn--sm ui-btn--block" onclick="window.SpatialPoiModals.hostBanquet('TIER_SMALL')">Mở Tiểu Yến</button>
            </div>
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold text-sm mb-1">Trung Yến Khoán Đãi</h4>
              <div class="text-xs text-muted mb-3">Mở tiệc thết đãi chư tướng quan lại địa phương.</div>
              <div class="text-xs font-mono text-amber-400 mb-3">800 Quan • 5 Rượu</div>
              <button class="ui-btn ui-btn--primary ui-btn--sm ui-btn--block" onclick="window.SpatialPoiModals.hostBanquet('TIER_MEDIUM')">Mở Trung Yến</button>
            </div>
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold text-sm mb-1">Hào Môn Đại Yến</h4>
              <div class="text-xs text-muted mb-3">Đại yến vang danh thiên hạ, nức tiếng Kinh Hoa.</div>
              <div class="text-xs font-mono text-amber-400 mb-3">2,000 Quan • 12 Rượu</div>
              <button class="ui-btn ui-btn--accent ui-btn--sm ui-btn--block" onclick="window.SpatialPoiModals.hostBanquet('TIER_GRAND')">Khai Đại Yến</button>
            </div>
          </div>
        `);
        break;

      case 'brotherhood':
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">盟</div>
            <div class="lead-text">
              <h3>Đào Viên Tụ Nghĩa • Kết Bái Huynh Đệ</h3>
              <div class="text-muted text-sm">Tuy không sinh cùng ngày cùng tháng, nhưng nguyện đồng sinh cộng tử vì đại nghiệp.</div>
            </div>
          </div>
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 text-center">
            <p class="text-xs text-slate-300 mb-4">Cần Hảo Cảm đạt mức 100 và cùng vượt qua khảo nghiệm sa trường để kết bái nghĩa huynh đệ.</p>
            <div class="flex justify-center gap-3">
              <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.SpatialPoiModals.swearBrotherhood('NPC-0003')">Kết Bái Quan Vũ</button>
              <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.SpatialPoiModals.swearBrotherhood('NPC-0004')">Kết Bái Trương Phi</button>
            </div>
          </div>
        `);
        break;

      case 'recruit':
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">旗</div>
            <div class="lead-text">
              <h3>Bảng Cầu Hiền • Chiêu Mộ Môn Khách</h3>
              <div class="text-muted text-sm">Tuyển mộ võ sư, thương nhân hộ tống và mưu sĩ du phương vào tiêu xa thương đoàn.</div>
            </div>
          </div>
          <div class="text-center py-8 text-muted text-xs">
            Hiện tại các môn khách lưu lạc đang ngụ tại lữ điếm. Hãy nâng cao Danh Vọng để chiêu mộ nhân tài.
          </div>
        `);
        break;
    }
  }

  // =========================================================================
  // 2. ARENA RENDERING
  // =========================================================================
  private async renderArenaTab(): Promise<void> {
    const tab = this.arenaModal.activeTab || 'spar';
    switch (tab) {
      case 'spar':
        this.arenaModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">武</div>
            <div class="lead-text">
              <h3>Đài Giáo Trường • Luận Kiếm Cùng Danh Tướng</h3>
              <div class="text-muted text-sm">Thử sức võ nghệ cùng Trương Phi và Quan Vũ, nâng cao chỉ số Võ Lực và kinh nghiệm đối kháng.</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold mb-1">Trương Phi (Bát Xà Mâu)</h4>
              <div class="text-xs text-muted mb-2">Võ Lực: 98 • Cuồng Lôi Xà Mâu Quyết</div>
              <button class="ui-btn ui-btn--accent ui-btn--sm ui-btn--block" onclick="window.SpatialPoiModals.startDuel('NPC-0004')">Khiêu Chiến Luận Kiếm</button>
            </div>
            <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold mb-1">Quan Vũ (Thanh Long Đao)</h4>
              <div class="text-xs text-muted mb-2">Võ Lực: 97 • Yển Nguyệt Trảm Tam Đao</div>
              <button class="ui-btn ui-btn--accent ui-btn--sm ui-btn--block" onclick="window.SpatialPoiModals.startDuel('NPC-0003')">Khiêu Chiến Luận Kiếm</button>
            </div>
          </div>
        `);
        break;

      case 'challenge':
        this.arenaModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">勳</div>
            <div class="lead-text">
              <h3>Lôi Đài Tam Cấp • Đấu Võ Đoạt Thưởng</h3>
              <div class="text-muted text-sm">Vượt qua các đấu thủ từ Tân Binh, Tinh Anh đến Đương Thế Đệ Nhất Kiếm.</div>
            </div>
          </div>
          <div class="text-center py-6 text-muted text-xs">
            Đang tải danh sách đấu sĩ lôi đài mùa giải Trác Quận...
          </div>
        `);
        break;

      case 'duel':
        if (!this.currentDuelState) {
          this.arenaModal.setContent(`
            <div class="text-center py-10 text-muted">
              Hiện chưa có trận quyết đấu nào diễn ra. Hãy vào mục "Luận Kiếm" để khiêu chiến danh tướng.
            </div>
          `);
        } else {
          this.renderActiveDuelState();
        }
        break;
    }
  }

  private renderActiveDuelState(): void {
    const s = this.currentDuelState;
    if (!s) return;

    this.arenaModal.setContent(`
      <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
        <div class="flex justify-between items-center mb-2">
          <div class="font-bold text-amber-200">Hiệp Đấu Thứ ${s.round}</div>
          <div class="badge ${s.isConcluded ? 'badge-danger' : 'badge-primary'}">${s.isConcluded ? 'KẾT THÚC' : 'ĐANG GIAO ĐẤU'}</div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-3">
          <div class="p-2 bg-slate-900 rounded border border-slate-800">
            <div class="font-bold text-xs text-amber-300">Người Chơi</div>
            <div class="text-xs">HP: ${s.playerHp} | Khí: ${s.playerSpirit} | Sĩ Khí: ${s.playerMorale}</div>
          </div>
          <div class="p-2 bg-slate-900 rounded border border-slate-800">
            <div class="font-bold text-xs text-red-300">Đối Thủ</div>
            <div class="text-xs">HP: ${s.oppHp} | Khí: ${s.oppSpirit} | Sĩ Khí: ${s.oppMorale}</div>
          </div>
        </div>

        ${!s.isConcluded ? `
          <div class="flex gap-2 justify-center">
            <button class="ui-btn ui-btn--primary ui-btn--sm ui-btn--grow" onclick="window.SpatialPoiModals.executeDuelRound('ATTACK')">Công Kích</button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--grow" onclick="window.SpatialPoiModals.executeDuelRound('DEFEND')">Phòng Ngự</button>
            <button class="ui-btn ui-btn--accent ui-btn--sm ui-btn--grow" onclick="window.SpatialPoiModals.executeDuelRound('SPECIAL_STRIKE')">Tuyệt Kỹ</button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--grow" onclick="window.SpatialPoiModals.executeDuelRound('FOCUS_SPIRIT')">Tụ Khí</button>
          </div>
        ` : `
          <div class="text-center font-bold text-amber-400 py-2">Kết quả: ${s.outcome || 'Đã phân thắng bại'}</div>
        `}
      </div>

      <div class="combat-logs p-2 bg-black/60 rounded text-xs font-mono max-h-40 overflow-y-auto">
        ${s.combatLogs.map(l => `<div class="mb-1">${l}</div>`).join('')}
      </div>
    `);
  }

  // =========================================================================
  // 3. RESIDENCE RENDERING
  // =========================================================================
  private async renderResidenceTab(): Promise<void> {
    const tab = this.residenceModal.activeTab || 'rest';
    switch (tab) {
      case 'rest':
        this.residenceModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">茶</div>
            <div class="lead-text">
              <h3>Tư Gia Điền Viên • Dưỡng Thần Phục Thể</h3>
              <div class="text-muted text-sm">Nghỉ ngơi tại trang viên, hồi phục toàn bộ thể lực và chuẩn bị cho các kế hoạch đại sự.</div>
            </div>
          </div>
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 text-center">
            <div class="text-3xl mb-2">宅</div>
            <h4 class="text-amber-200 font-bold mb-2">Tĩnh Dưỡng Nội Viện</h4>
            <p class="text-xs text-muted mb-4">Nghỉ ngơi 1 ngày • Hồi phục 100% Thể lực & Sức bền</p>
            <button class="ui-btn ui-btn--accent px-6 py-2" onclick="window.SpatialPoiModals.executeRestAtResidence()">
              Nghỉ Ngơi Dưỡng Thần
            </button>
          </div>
        `);
        break;

      case 'family':
        this.residenceModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">家</div>
            <div class="lead-text">
              <h3>Khuê Phòng & Gia Thất</h3>
              <div class="text-muted text-sm">Quản lý phu nhân, cầu hôn giai nhân và chăm sóc hậu duệ gia tộc.</div>
            </div>
          </div>
          <div class="text-center py-6">
            <button class="ui-btn ui-btn--primary px-6 py-2.5 font-bold" onclick="window.SpatialPoiModals.closeResidence(); if(window.LineageFamilyUI) window.LineageFamilyUI.open('courtship');">
              Mở Sổ Bộ Gia Thất & Cầu Hôn [J]
            </button>
          </div>
        `);
        break;

      case 'study':
        this.residenceModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">卷</div>
            <div class="lead-text">
              <h3>Thư Trai Điển Tịch • Đọc Sách Dưỡng Khí</h3>
              <div class="text-muted text-sm">Nghiên cứu binh pháp Tôn Tử, điển tịch triều Hán nâng cao Trí Lực và Chính Trị.</div>
            </div>
          </div>
          <div class="text-center py-8 text-muted text-xs">
            Thư phòng yên tĩnh, điển tịch phong phú. Đọc sách giúp tĩnh tâm dưỡng trí.
          </div>
        `);
        break;
    }
  }

  // =========================================================================
  // ACTIONS EXECUTION
  // =========================================================================
  public async executeDrinkWine(): Promise<void> {
    try {
      const res = await spatialPoiService.drinkWine();
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Ẩm tửu tiêu sầu, thể lực sảng khoái!');
      }
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Không thể uống rượu lúc này!', true);
      }
    }
  }

  public async hostBanquet(tierId: string): Promise<void> {
    try {
      const res = await spatialPoiService.hostBanquet(tierId);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Yến tiệc tưng bừng, tân khách hoan hỉ!');
      }
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Không đủ ngân lượng hoặc rượu để khai yến!', true);
      }
    }
  }

  public async swearBrotherhood(targetNpcId: string): Promise<void> {
    try {
      const res = await spatialPoiService.swearBrotherhood(targetNpcId);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Đào Viên kết bái thành công!');
      }
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Chưa đủ điều kiện kết bái huynh đệ!', true);
      }
    }
  }

  public async startDuel(opponentId: string): Promise<void> {
    try {
      const res = await spatialPoiService.startDuel(opponentId);
      this.currentDuelId = res.duelId;
      this.currentDuelState = res.state;
      await this.arenaModal.switchTab('duel');
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi khởi động lôi đài!', true);
      }
    }
  }

  public async executeDuelRound(action: string): Promise<void> {
    if (!this.currentDuelId) return;
    try {
      const newState = await spatialPoiService.executeDuelRound(this.currentDuelId, action);
      this.currentDuelState = newState;
      this.renderActiveDuelState();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi hiệp đấu!', true);
      }
    }
  }

  public async executeRestAtResidence(): Promise<void> {
    try {
      const res = await spatialPoiService.restAtResidence(1);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Dưỡng sinh nghỉ ngơi hoàn tất, thể lực tràn trề!');
      }
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Không thể nghỉ ngơi lúc này!', true);
      }
    }
  }
}

/**
 * Lazily created: the legacy IIFE (public/js/spatial-poi-modals.js) still owns
 * these modal ids, and a module-level `new` used to run during bundle import,
 * clobbering the legacy DOM before the player ever opened the dialog.
 */
let spatialPoiModalsInstance: SpatialPoiModalsManager | null = null;

export function getSpatialPoiModals(): SpatialPoiModalsManager {
  if (!spatialPoiModalsInstance) {
    spatialPoiModalsInstance = new SpatialPoiModalsManager();
  }
  return spatialPoiModalsInstance;
}
