/**
 * ThreeKingdoms-AgentEngine: Lineage & Family Feature Types
 * (src/client/features/lineage-family/lineage-family.types.ts)
 */

export interface CourtshipCandidate {
  npcId: string;
  nameVi: string;
  nameEn: string;
  baselineLocation: string;
  dowryCash: number;
  dowryItems?: Array<{ itemCode: string; itemNameVi: string; quantity: number }>;
  clueVi: string;
  clueEn: string;
  socialStratum?: 'PEASANT' | 'ARTISAN_SHOP' | 'GENTRY_CLAN' | 'HISTORICAL_HEROINE';
  fatherProfessionVi?: string;
  isMarried?: boolean;
  isEncountered?: boolean;
  maternalTrait?: {
    traitCode: string;
    traitNameVi: string;
    descriptionVi: string;
    bonusStat?: string;
    bonusVal?: number;
  };
}

export interface FamilySpouse {
  marriage_id: string;
  husband_id: string;
  wife_id: string;
  wife_name_vi: string;
  wife_name_en: string;
  marriage_date: string;
  marriage_turn: number;
  dowry_cash: number;
  intimacy: number;
  status: string;
  pregnancy_stage: number;
  household_role: 'HOUSEKEEPER' | 'ENTERPRISE_SUPERVISOR' | 'STRATEGIC_ADVISOR' | 'MILITARY_DEFENDER';
  role_effect_desc_vi: string;
}

export interface FamilyChild {
  child_id: string;
  name_vi: string;
  name_en: string;
  style_name?: string;
  gender: 'MALE' | 'FEMALE';
  birth_year: number;
  age: number;
  is_heir: number;
  mother_name_vi?: string;
  father_name_vi?: string;
  stats: {
    war: number;
    int: number;
    com: number;
    ldr: number;
    pol: number;
    dip: number;
    cra: number;
    log: number;
  };
  innate_talents: string[];
  assigned_mentor_id?: string;
  assigned_mentor_name_vi?: string;
  developmental_stage?: string;
}

export interface LineageOverview {
  generation: number;
  clanName: string;
  clanPrestige: number;
  spouses: FamilySpouse[];
  children: FamilyChild[];
  activeHeir: FamilyChild | null;
  memorialAncestors: any[];
}
