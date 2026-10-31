export interface CareerReader {
  queryOne<T = any>(sql: string, params?: any[]): T | undefined;
  query<T = any>(sql: string, params?: any[]): T[];
}

export interface CareerModifiers {
  expMultiplier: Record<string, number>;
  tradeMargin: number;
  defectReduction: number;
  clanPrestigeBonus: number;
}

export interface CareerPath {
  code: 'MARTIAL' | 'MERCHANT' | 'SCHOLAR' | 'ARTISAN' | 'LINEAGE';
  nameVi: string;
  nameEn: string;
  seal: string;
  score: number;
  effectVi: string;
  effectEn: string;
  modifiers: CareerModifiers;
}

export interface CareerResult {
  activePath: CareerPath['code'];
  activeScore: number;
  paths: CareerPath[];
  modifiers: CareerModifiers;
  duelWins: number;
  craftTier: number;
}

export interface CareerSummary {
  activePath: CareerPath['code'];
  activeScore: number;
  modifiers: CareerModifiers;
}

export declare function computeCareerPaths(reader: CareerReader, playerId?: string): CareerResult;
export declare function getCareerModifiers(reader: CareerReader, playerId?: string): CareerSummary;
export declare function readerForDbPath(dbPath: string): CareerReader;
export declare function expMultiplierFor(reader: CareerReader, attribute: string, playerId?: string): number;
