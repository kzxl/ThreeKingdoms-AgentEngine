/**
 * ThreeKingdoms-AgentEngine: Enterprise & Workshop Types
 * (src/client/features/enterprise-workshop/enterprise-workshop.types.ts)
 */

export interface EnterpriseRecord {
  enterprise_id: string;
  name_vi: string;
  name_en: string;
  facility_type: string;
  settlement_id: string;
  owner_id: string;
  safe_cash: number;
  monthly_revenue: number;
  monthly_overhead: number;
  worker_count: number;
  max_workers: number;
  status: string;
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
