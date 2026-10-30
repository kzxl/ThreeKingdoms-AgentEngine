/**
 * ThreeKingdoms-AgentEngine: Unified Unrest Log
 * (src/modules/faction-politics/unrest.service.ts)
 *
 * Retainer departures and officer coups feed one append-only stream so the
 * monthly report and audit can reason about social instability as a whole.
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';

export interface UnrestEventInput {
  characterId?: string;
  source: 'RETAINER' | 'OFFICER';
  npcId: string;
  npcName: string;
  eventType: 'DEPARTURE' | 'COUP';
  severity: number;
  gameDate: string;
  detailVi: string;
  detailEn: string;
}

export interface UnrestRiskInput {
  loyalty: number;
  ambition: number;
  prestige: number;
  personalTroops?: number;
  famePressure?: number;
  isGovernor?: boolean;
}

export class UnrestService {
  private static instance: UnrestService | null = null;

  private constructor(private readonly db: DatabaseService) {}

  public static getInstance(): UnrestService {
    if (!UnrestService.instance) {
      UnrestService.instance = new UnrestService(DatabaseService.getInstance());
    }
    return UnrestService.instance;
  }

  public static forDatabase(db: DatabaseService): UnrestService {
    return new UnrestService(db);
  }

  /**
   * One risk formula for retainers and officers. Context supplies the inputs;
   * the social pressure of the player's fame is the shared term.
   */
  public calculateRisk(input: UnrestRiskInput): number {
    const governorBonus = input.isGovernor ? 25 : 0;
    const troopFactor = Math.min(30, Math.floor(Number(input.personalTroops || 0) / 5));
    const loyaltyPenalty = (100 - Number(input.loyalty || 0)) * 1.8;
    const ambitionFactor = Number(input.ambition || 0) * 1.4;
    const prestigeResistance = Number(input.prestige || 0) * 0.2;
    const famePressure = Number(input.famePressure || 0);
    const score = (ambitionFactor + loyaltyPenalty + governorBonus + troopFactor - prestigeResistance - famePressure * 200) / 200;
    return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
  }

  public record(input: UnrestEventInput): string {
    const gameDate = input.gameDate || this.currentDate();
    const unrestId = nextId(this.db, 'unrest_events', 'UNREST', gameDate);
    this.db.execute(
      `INSERT INTO unrest_events
        (unrest_id, character_id, source, npc_id, npc_name, event_type, severity, game_date, detail_vi, detail_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        unrestId,
        input.characterId || 'PLY-0001',
        input.source,
        input.npcId,
        input.npcName,
        input.eventType,
        Math.max(0, Math.min(1, Number(input.severity) || 0)),
        gameDate,
        input.detailVi,
        input.detailEn
      ]
    );
    return unrestId;
  }

  public recent(limit = 10): any[] {
    return this.db.query(
      'SELECT * FROM unrest_events ORDER BY rowid DESC LIMIT ?;',
      [Math.max(1, Math.min(50, limit))]
    );
  }

  private currentDate(): string {
    const meta = this.db.queryOne<{ current_date: string }>(
      'SELECT "current_date" AS current_date FROM campaign_meta LIMIT 1;'
    );
    return meta?.current_date || '184-05-02';
  }
}
