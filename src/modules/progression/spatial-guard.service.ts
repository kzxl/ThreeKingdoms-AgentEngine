/**
 * ThreeKingdoms-AgentEngine: Spatial Guard & Progression Gating Service
 * (src/modules/progression/spatial-guard.service.ts)
 *
 * Implements Step 3 Core Pillars:
 * 1. Spatial Verification Guard (Khóa Chặn Thao Tác Từ Xa):
 *    - Rejects physical actions (Forge, Tavern, Arena, Residence, Caravans) if character is not on-site.
 * 2. Ambition Progression Gating (Tiến Hóa Thân Phận 4 Phẩm Lộ):
 *    - Stage 1: Bố Y Tay Trắng (Penniless Commoner) - Local presence only, wage labor, simple trade.
 *    - Stage 2: Tiểu Chủ Trang Viên (Estate Master) - Unlocks Home Desk at Residence, marriage & lineage.
 *    - Stage 3: Đại Thương Gia / Hào Kiệt (Magnate Commander) - Unlocks Remote Courier & Interstate Caravans.
 *    - Stage 4: Chư Hầu / Hùng Chủ (Hegemon Warlord) - Unlocks Grand Command War Room & Sovereign Macro Strategy.
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';

export type AmbitionStage = 1 | 2 | 3 | 4;
export type StageKey = 'PAUPER' | 'ESTATE_MASTER' | 'MAGNATE_COMMANDER' | 'HEGEMON_WARLORD';

export interface UnlockedCapabilities {
  allowLocalWork: boolean;
  allowHomeDesk: boolean;
  allowRemoteCourier: boolean;
  allowWarRoom: boolean;
}

export interface PlayerProgressionStatus {
  playerId: string;
  currentLocation: string;
  currentStage: AmbitionStage;
  stageKey: StageKey;
  stageTitleVi: string;
  stageTitleEn: string;
  netWorth: number;
  liquidCash: number;
  fixedCapital: number;
  businessesCount: number;
  duelWins: number;
  maxAttribute: number;
  unlockedCapabilities: UnlockedCapabilities;
  criteriaForNextStageVi?: string;
  criteriaForNextStageEn?: string;
}

export class SpatialGuardError extends Error {
  public statusCode = 400;
  public currentLocation: string;
  public requiredLocation: string;

  constructor(message: string, currentLocation: string, requiredLocation: string) {
    super(message);
    this.name = 'SpatialGuardError';
    this.currentLocation = currentLocation;
    this.requiredLocation = requiredLocation;
  }
}

export class ProgressionGateError extends Error {
  public statusCode = 403;
  public currentStage: AmbitionStage;
  public requiredStage: AmbitionStage;

  constructor(message: string, currentStage: AmbitionStage, requiredStage: AmbitionStage) {
    super(message);
    this.name = 'ProgressionGateError';
    this.currentStage = currentStage;
    this.requiredStage = requiredStage;
  }
}

export class SpatialGuardService {
  private static instance: SpatialGuardService | null = null;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): SpatialGuardService {
    if (!SpatialGuardService.instance) {
      SpatialGuardService.instance = new SpatialGuardService();
    }
    return SpatialGuardService.instance;
  }

  /**
   * Retrieves player's current authoritative physical location
   */
  public getPlayerCurrentLocation(playerId: string = 'PLY-0001'): string {
    try {
      const row = this.db.queryOne<{ current_location: string }>(
        'SELECT current_location FROM player_state WHERE player_id = ? LIMIT 1;',
        [playerId]
      );
      return row?.current_location || 'Vườn Đào';
    } catch {
      return 'Vườn Đào';
    }
  }

  /**
   * Updates player's authoritative location in SQLite
   */
  public setPlayerCurrentLocation(playerId: string = 'PLY-0001', location: string): void {
    if (!location) return;
    this.db.execute(
      'UPDATE player_state SET current_location = ? WHERE player_id = ?;',
      [location, playerId]
    );
  }

  /**
   * Evaluates player's Ambition Stage across 4 canonical tiers
   */
  public getProgressionStatus(playerId: string = 'PLY-0001'): PlayerProgressionStatus {
    const player = this.db.queryOne<any>(
      'SELECT * FROM player_state WHERE player_id = ? LIMIT 1;',
      [playerId]
    ) || {};

    const liquidCash = Number(player.liquid_cash || 0);
    const fixedCapital = Number(player.fixed_capital || 0);
    const age = Number(player.age || 20);

    // Count owned businesses
    let businessesCount = 0;
    try {
      const bizRow = this.db.queryOne<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM businesses WHERE owner_id = ? AND status = "ACTIVE";',
        [playerId]
      );
      businessesCount = bizRow?.cnt || 0;
    } catch {}

    // Count duel wins
    let duelWins = 0;
    try {
      const duelRow = this.db.queryOne<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM session_duels WHERE player_id = ? AND outcome = "VICTORY";',
        [playerId]
      );
      duelWins = duelRow?.cnt || 0;
    } catch {}

    // Evaluate 8-axis maximum attribute
    const maxAttribute = Math.max(
      Number(player.war_attr || 50),
      Number(player.int_attr || 50),
      Number(player.pol_attr || 50),
      Number(player.ldr_attr || 50),
      Number(player.dip_attr || 50),
      Number(player.com_attr || 50),
      Number(player.log_attr || 50),
      Number(player.cra_attr || 50)
    );

    const netWorth = liquidCash + fixedCapital;
    const currentLocation = player.current_location || 'Vườn Đào';

    // 4-Stage Ambition Progression Hierarchy:
    // Stage 1: Penniless Commoner (Bố Y Tay Trắng)
    // Stage 2: Estate Master (Tiểu Chủ Trang Viên): NetWorth >= 2,000 OR businessesCount >= 1 OR age >= 20
    // Stage 3: Magnate Commander (Đại Thương Gia / Hào Kiệt): NetWorth >= 10,000 OR maxAttribute >= 75 OR duelWins >= 3
    // Stage 4: Hegemon Warlord (Chư Hầu / Hùng Chủ): NetWorth >= 50,000 OR (Number(player.ldr_attr || 50) >= 85)
    let currentStage: AmbitionStage = 1;
    let stageKey: StageKey = 'PAUPER';
    let stageTitleVi = 'Bố Y Tay Trắng';
    let stageTitleEn = 'Penniless Commoner';
    let nextCriteriaVi = 'Tích lũy tài sản ròng > 2,000 Tiền hoặc sở hữu 1 cơ sở sản nghiệp để thăng cấp Tiểu Chủ Trang Viên.';
    let nextCriteriaEn = 'Accumulate net worth > 2,000 Qian or own 1 enterprise to become an Estate Master.';

    if (netWorth >= 50000 || Number(player.ldr_attr || 50) >= 85) {
      currentStage = 4;
      stageKey = 'HEGEMON_WARLORD';
      stageTitleVi = 'Phong Vân Hùng Chủ';
      stageTitleEn = 'Hegemon Warlord';
      nextCriteriaVi = 'Đỉnh cao danh vọng thiên hạ. Đã mở khóa trọn vẹn Quân Cơ Xứ vĩ mô.';
      nextCriteriaEn = 'Pinnacle of historical renown. Full Grand Command War Room active.';
    } else if (netWorth >= 10000 || maxAttribute >= 75 || duelWins >= 3) {
      currentStage = 3;
      stageKey = 'MAGNATE_COMMANDER';
      stageTitleVi = 'Đại Thương Gia / Hào Kiệt';
      stageTitleEn = 'Magnate Commander';
      nextCriteriaVi = 'Tích lũy tài sản ròng > 50,000 Tiền hoặc Thống Soái LDR >= 85 để khai mở Quân Cơ Xứ Chư Hầu.';
      nextCriteriaEn = 'Accumulate net worth > 50,000 Qian or Leadership LDR >= 85 to unlock Grand Command War Room.';
    } else if (netWorth >= 2000 || businessesCount >= 1 || age >= 20) {
      currentStage = 2;
      stageKey = 'ESTATE_MASTER';
      stageTitleVi = 'Tiểu Chủ Trang Viên';
      stageTitleEn = 'Estate Master';
      nextCriteriaVi = 'Tích lũy tài sản ròng > 10,000 Tiền, 1 thuộc tính >= 75 hoặc thắng 3 trận Đơn Đả để mở Phi Thư Viễn Trình & Thương Đoàn Viễn Chinh.';
      nextCriteriaEn = 'Accumulate net worth > 10,000 Qian, 1 stat >= 75, or 3 duel wins to unlock Remote Courier & Interstate Caravans.';
    }

    const unlockedCapabilities: UnlockedCapabilities = {
      allowLocalWork: true,
      allowHomeDesk: currentStage >= 2,
      allowRemoteCourier: currentStage >= 3,
      allowWarRoom: currentStage >= 4
    };

    return {
      playerId,
      currentLocation,
      currentStage,
      stageKey,
      stageTitleVi,
      stageTitleEn,
      netWorth,
      liquidCash,
      fixedCapital,
      businessesCount,
      duelWins,
      maxAttribute,
      unlockedCapabilities,
      criteriaForNextStageVi: nextCriteriaVi,
      criteriaForNextStageEn: nextCriteriaEn
    };
  }

  /**
   * Spatial Guard: Throws error if player is not physically present at an allowed POI
   */
  public assertPresence(
    playerId: string,
    allowedLocationsOrKeywords: string[],
    actionNameVi: string,
    bypassIfTesting: boolean = false
  ): { success: true; currentLocation: string } {
    if (bypassIfTesting) {
      return { success: true, currentLocation: 'BYPASS_TEST' };
    }

    const currentLoc = this.getPlayerCurrentLocation(playerId);
    const normalizedCurrent = currentLoc.toLowerCase();

    const isMatch = allowedLocationsOrKeywords.some(keyword =>
      normalizedCurrent.includes(keyword.toLowerCase())
    );

    if (!isMatch) {
      const primaryAllowed = allowedLocationsOrKeywords[0];
      throw new SpatialGuardError(
        `[KHÓA CHẶN KHÔNG GIAN] Bạn hiện đang ở [${currentLoc}]. Thao tác [${actionNameVi}] yêu cầu nhân vật phải trực tiếp bước chân tới [${primaryAllowed}]!`,
        currentLoc,
        primaryAllowed
      );
    }

    return { success: true, currentLocation: currentLoc };
  }

  /**
   * Progression Gate: Throws error if player has not attained required stage
   */
  public assertStage(
    playerId: string,
    requiredStage: AmbitionStage,
    featureNameVi: string,
    bypassIfTesting: boolean = false
  ): { success: true; currentStage: AmbitionStage } {
    if (bypassIfTesting) {
      return { success: true, currentStage: requiredStage };
    }

    const status = this.getProgressionStatus(playerId);
    if (status.currentStage < requiredStage) {
      const stageNames: Record<AmbitionStage, string> = {
        1: 'Bố Y Tay Trắng',
        2: 'Tiểu Chủ Trang Viên',
        3: 'Đại Thương Gia / Hào Kiệt',
        4: 'Chư Hầu / Hùng Chủ'
      };
      throw new ProgressionGateError(
        `[TIẾN HÓA THÂN PHẬN] Tính năng [${featureNameVi}] chỉ mở khóa cho phẩm lộ tối thiểu bậc ${requiredStage} (${stageNames[requiredStage]}). Thân phận hiện tại: Bậc ${status.currentStage} (${status.stageTitleVi})!`,
        status.currentStage,
        requiredStage
      );
    }
    return { success: true, currentStage: status.currentStage };
  }

  /**
   * Checks whether character can dispatch couriers remotely
   */
  public canDispatchRemoteCourier(playerId: string = 'PLY-0001'): boolean {
    return this.getProgressionStatus(playerId).currentStage >= 3;
  }

  /**
   * Checks whether character can access the Macro War Room
   */
  public canAccessWarRoom(playerId: string = 'PLY-0001'): boolean {
    return this.getProgressionStatus(playerId).currentStage >= 4;
  }

  /**
   * Checks whether character can use home desk management
   */
  public canAccessHomeDesk(playerId: string = 'PLY-0001'): boolean {
    return this.getProgressionStatus(playerId).currentStage >= 2;
  }
}
