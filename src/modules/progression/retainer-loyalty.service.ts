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
import { fameRatio } from '../../shared/prestige';
import { PrestigeService } from './prestige.service';
import { UnrestService } from '../faction-politics/unrest.service';
import { RetainerDepartureConsequence } from '../faction-politics/unrest-consequence';

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
    const famePressure = (fameRatio(fame) - 0.2) * 0.2;
    const unrest = UnrestService.forDatabase(this.db);

    this.db.transaction(() => {
      for (const retainer of retainers) {
        const loyaltyBefore = Number(retainer.loyalty || 0);
        const loyalty = Math.max(0, Math.min(100, loyaltyBefore + drift));
        const risk = unrest.calculateRisk({
          loyalty: loyaltyBefore,
          ambition: 50,
          prestige: 100,
          personalTroops: 0,
          famePressure
        });
        const desertionChance = Math.min(0.85, 0.1 + risk * 0.5);
        if (loyalty < 30 && rng.chance(desertionChance)) {
          const narrativeVi = `${retainer.name} thất vọng vì chủ công chỉ có ${fame} danh vọng, xin rời đi.`;
          const narrativeEn = `${retainer.name} lost faith in a lord with only ${fame} fame and left.`;
          new RetainerDepartureConsequence(this.db, {
            characterId,
            source: 'RETAINER',
            npcId: retainer.npc_id,
            npcName: retainer.name,
            eventType: 'DEPARTURE',
            severity: Math.min(1, (30 - loyalty) / 30 + 0.2),
            fame,
            gameDate: date,
            detailVi: narrativeVi,
            detailEn: narrativeEn
          }, loyaltyBefore).execute();
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
