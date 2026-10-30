/**
 * ThreeKingdoms-AgentEngine: Unrest Consequence Strategies
 * (src/modules/faction-politics/unrest-consequence.ts)
 *
 * `UnrestService` decides *who* is at risk and records the shared log. Each
 * actor type supplies its own consequence strategy, so faction territory SQL
 * never leaks into the retainer path (and vice versa).
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';
import { UnrestService } from './unrest.service';

export interface UnrestActor {
  characterId: string;
  source: 'RETAINER' | 'OFFICER';
  npcId: string;
  npcName: string;
  eventType: 'DEPARTURE' | 'COUP';
  severity: number;
  fame?: number;
  gameDate: string;
  detailVi: string;
  detailEn: string;
}

export interface UnrestConsequenceResult {
  applied: boolean;
  eventId?: string;
  requiresFactionAction?: boolean;
}

export interface UnrestConsequence {
  execute(): UnrestConsequenceResult;
}

export class RetainerDepartureConsequence implements UnrestConsequence {
  public constructor(
    private readonly db: DatabaseService,
    private readonly actor: UnrestActor,
    private readonly loyaltyBefore: number
  ) {}

  public execute(): UnrestConsequenceResult {
    this.db.execute(
      "UPDATE npc_state SET loyalty = 0, assigned_business_id = NULL, assigned_role = 'DEPARTED', monthly_wage = 0 WHERE npc_id = ?;",
      [this.actor.npcId]
    );
    this.db.execute(
      `INSERT INTO retainer_departures
        (departure_id, character_id, npc_id, npc_name, game_date, fame_at_departure, loyalty_before, reason, narrative_vi, narrative_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'LOW_FAME', ?, ?);`,
      [
        nextId(this.db, 'retainer_departures', 'DEP', this.actor.gameDate),
        this.actor.characterId,
        this.actor.npcId,
        this.actor.npcName,
        this.actor.gameDate,
        Number(this.actor.fame || 0),
        this.loyaltyBefore,
        this.actor.detailVi,
        this.actor.detailEn
      ]
    );
    const eventId = UnrestService.forDatabase(this.db).record(this.actor);
    return { applied: true, eventId };
  }
}

/**
 * Officer coups/secessions keep their territorial consequence in
 * faction-politics; this strategy records the shared unrest signal and tells
 * the caller that a faction action is required.
 */
export class OfficerUnrestConsequence implements UnrestConsequence {
  public constructor(
    private readonly db: DatabaseService,
    private readonly actor: UnrestActor
  ) {}

  public execute(): UnrestConsequenceResult {
    const eventId = UnrestService.forDatabase(this.db).record(this.actor);
    return { applied: true, eventId, requiresFactionAction: true };
  }
}
