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
