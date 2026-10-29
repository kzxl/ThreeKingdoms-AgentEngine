/**
 * ThreeKingdoms-AgentEngine: Character Dossiers Types
 * (src/client/features/dossiers/dossiers.types.ts)
 */

export interface CharacterDossier {
  characterId: string;
  nameVi: string;
  nameEn: string;
  styleName?: string;
  age: number;
  gender?: string;
  locationVi: string;
  positionVi: string;
  factionVi?: string;
  personality: string;
  motivation: string;
  bioVi: string;
  stats: {
    war: number;
    int: number;
    ldr: number;
    pol: number;
    com: number;
    dip: number;
    cra: number;
    log: number;
  };
  talents: string[];
  relations?: {
    sentiment: number;
    tier: string;
  };
}
