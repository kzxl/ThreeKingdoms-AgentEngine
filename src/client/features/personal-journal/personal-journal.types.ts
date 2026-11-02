/**
 * ThreeKingdoms-AgentEngine: Personal Journal & Career Types
 * (src/client/features/personal-journal/personal-journal.types.ts)
 */

export interface CareerPathProgress {
  pathKey: 'ARTISAN' | 'MERCHANT' | 'MARTIAL' | 'SCHOLAR' | 'LINEAGE';
  titleVi: string;
  seal: string;
  currentTier: number;
  maxTier: number;
  tierNameVi: string;
  progressPercent: number;
  nextMilestoneVi: string;
  unlockedPerks: string[];
}

export interface JournalMilestone {
  id: string;
  titleVi: string;
  descriptionVi: string;
  turnAchieved?: number;
  dateAchieved?: string;
  isUnlocked: boolean;
  rewardPrestige?: number;
}

export interface LifeActionView {
  code: string;
  labelVi: string;
  labelEn: string;
  available: boolean;
  reasonVi?: string;
}

export interface LifeSkillView {
  skillCode: string;
  nameVi: string;
  tier: number;
  currentExp: number;
  maxExp: number;
  effectType: string;
  effectValue: number;
}

export interface LifeStatusView {
  characterId: string;
  date: string;
  phase: number;
  phaseLabel: string;
  needs: {
    fatigue: number;
    morale: number;
    stress: number;
    health: number;
  };
  household: {
    spouseName: string | null;
    spouseRole: string | null;
    children: number;
    upkeepDue: boolean;
  };
  skills: LifeSkillView[];
  trainableSkills: Array<{ skillCode: string; nameVi: string; domain: string }>;
  actions: LifeActionView[];
}
