/**
 * ThreeKingdoms-AgentEngine: Retainer Loyalty & Departures
 * (src/modules/progression/retainer-loyalty.service.ts)
 *
 * Fame is social pressure on retainers: high fame keeps them, low fame erodes
 * loyalty and can make them leave. This is the personal-retainer chain; officer
 * coups remain in faction-politics.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { fameRatio } from '../../shared/prestige';
import { PrestigeService } from './prestige.service';

export interface RetainerDeparture {
  npcId: string;
  name: string;
  loyaltyBefore: number;
  reason: string;
}

export interface RetainerLoyaltyReport {
  fame: number;
  evaluated: number;
  departures: RetainerDeparture[];
}

export class RetainerLoyaltyService {
  private static instance: RetainerLoyaltyService | null = null;

  private constructor(private readonly db: DatabaseService) {}

  public static getInstance(): RetainerLoyaltyService {
    if (!RetainerLoyaltyService.instance) {
      RetainerLoyaltyService.instance = new RetainerLoyaltyService(DatabaseService.getInstance());
    }
    return RetainerLoyaltyService.instance;
  }

  public static forDatabase(db: DatabaseService): RetainerLoyaltyService {
    return new RetainerLoyaltyService(db);
  }

  public evaluateMonthly(characterId = 'PLY-0001', gameDate?: string): RetainerLoyaltyReport {
    const fame = PrestigeService.forDatabase(this.db).getFame(characterId);
    const date = gameDate || this.currentDate();
    const drift = fame >= 3000 ? 2 : fame >= 1000 ? 1 : fame >= 500 ? 0 : fame >= 200 ? -3 : -5;
    const retainers = this.db.query<any>(
      "SELECT npc_id, name, loyalty FROM npc_state WHERE assigned_business_id IS NOT NULL AND assigned_role != 'DEPARTED';"
    );
    const rng = RngService.forDomain(this.db, 'retainer-loyalty');
    const departures: RetainerDeparture[] = [];
    const desertionChance = 0.15 + (1 - fameRatio(fame)) * 0.25;

    this.db.transaction(() => {
      for (const retainer of retainers) {
        const loyaltyBefore = Number(retainer.loyalty || 0);
        const loyalty = Math.max(0, Math.min(100, loyaltyBefore + drift));
        if (loyalty < 30 && rng.chance(desertionChance)) {
          this.db.execute(
            "UPDATE npc_state SET loyalty = 0, assigned_business_id = NULL, assigned_role = 'DEPARTED', monthly_wage = 0 WHERE npc_id = ?;",
            [retainer.npc_id]
          );
          const narrativeVi = `${retainer.name} thất vọng vì chủ công chỉ có ${fame} danh vọng, xin rời đi.`;
          const narrativeEn = `${retainer.name} lost faith in a lord with only ${fame} fame and left.`;
          this.db.execute(
            `INSERT INTO retainer_departures
              (departure_id, character_id, npc_id, npc_name, game_date, fame_at_departure, loyalty_before, reason, narrative_vi, narrative_en)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'LOW_FAME', ?, ?);`,
            [nextId(this.db, 'retainer_departures', 'DEP', date), characterId, retainer.npc_id, retainer.name, date, fame, loyaltyBefore, narrativeVi, narrativeEn]
          );
          departures.push({ npcId: retainer.npc_id, name: retainer.name, loyaltyBefore, reason: 'LOW_FAME' });
        } else {
          this.db.execute('UPDATE npc_state SET loyalty = ? WHERE npc_id = ?;', [loyalty, retainer.npc_id]);
        }
      }
    });

    return { fame, evaluated: retainers.length, departures };
  }

  private currentDate(): string {
    const meta = this.db.queryOne<{ current_date: string }>(
      'SELECT "current_date" AS current_date FROM campaign_meta LIMIT 1;'
    );
    return meta?.current_date || '184-05-02';
  }
}
