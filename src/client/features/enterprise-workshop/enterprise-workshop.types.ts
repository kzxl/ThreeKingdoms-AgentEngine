/**
 * ThreeKingdoms-AgentEngine: Enterprise & Workshop Types
 * (src/client/features/enterprise-workshop/enterprise-workshop.types.ts)
 */

export interface EnterpriseRecord {
  business_id: string;
  name: string;
  location_id: string;
  location: string;
  manager_npc_id: string;
  manager_name?: string;
  safe_cash: number;
  debt?: number;
  tier?: number;
  delegation_level: number;
  efficiency_multiplier: number;
  current_workforce: number;
  workforce_count: number;
  staff_count?: number;
  staff_wages?: number;
  monthly_capacity_hours: number;
  monthly_rent: number;
  monthly_overhead?: number;
  auto_procure: number;
  status: string;
  health?: string;
  business_type: string;
  daily_revenue: number;
  daily_revenue_avg?: number;
  accumulated_profit: number;
}

export interface OpenableEnterpriseType {
  typeId: string;
  titleVi: string;
  descriptionVi: string;
  startupCash: number;
  turnkeyExtraCash: number;
  effectiveTurnkeyCost: number;
  monthlyRent: number;
  baseWorkforce: number;
  projectedDailyRevenueMin: number;
  projectedDailyRevenueMax: number;
  icon: string;
  requiredMaterials: Array<{
    itemCode: string;
    itemNameVi: string;
    quantity: number;
    available: number;
    missing: number;
    hasEnough: boolean;
  }>;
  hasAllMaterials: boolean;
  canAffordCash: boolean;
  canAffordTurnkey: boolean;
}

export interface LaborShift {
  shiftId: string;
  jobType: string;
  titleVi: string;
  titleEn: string;
  workplaceVi: string;
  workplaceEn: string;
  wage: number;
  staminaCost: number;
  fatigueCost: number;
  professionCode: string;
  professionNameVi: string;
  professionCategory: string;
  expGain: number;
  attributeTarget: string;
  attributeExp: number;
  narrativeVi: string;
  narrativeEn: string;
  icon: string;
}

export interface EnterpriseStatus {
  characterId: string;
  playerCash: number;
  playerSafeCash: number;
  playerFatigue: number;
  ownedBusinesses: EnterpriseRecord[];
  activeEnterprises: EnterpriseRecord[];
  totalDailyRevenue: number;
  totalWorkforce: number;
  totalAccumulatedProfit: number;
  totalSafeCash: number;
  totalDebt: number;
  totalMonthlyRent: number;
  totalStaffWages: number;
  totalMonthlyOverhead: number;
  openableTypes: OpenableEnterpriseType[];
  laborShifts: LaborShift[];
}

export interface WageLaborOption {
  jobCode: string;
  jobNameVi: string;
  facilityType: string;
  wageQian: number;
  staminaCost: number;
  descriptionVi: string;
  attrGain?: string;
}
