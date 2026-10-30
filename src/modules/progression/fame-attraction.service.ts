/**
 * ThreeKingdoms-AgentEngine: Fame Attraction (src/modules/progression/fame-attraction.service.ts)
 *
 * Fame is not just a number: each month notable people seek the player out.
 * Volunteers join the militia, merchants bring grain, scholars spread the name.
 * Every arrival is logged so the monthly report and audit can explain it.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { getFameTier } from '../../shared/prestige';
import { PrestigeService } from './prestige.service';

export interface FameArrival {
  arrivalId: string;
  kind: 'VOLUNTEER' | 'MERCHANT' | 'SCHOLAR' | 'WARRIOR';
  nameVi: string;
  nameEn: string;
  militia: number;
  grainGift: number;
  narrativeVi: string;
  narrativeEn: string;
}

export interface FameArrivalReport {
  fame: number;
  tierCode: string;
  arrivals: FameArrival[];
  totalMilitia: number;
  totalGrain: number;
  fameGain: number;
}

const NAMES = {
  VOLUNTEER: [
    { vi: 'Lão nông thôn dã', en: 'Village elder' },
    { vi: 'Nhóm thanh niên nghĩa dũng', en: 'Band of young volunteers' },
    { vi: 'Dân binh ven sông', en: 'Riverside militia' }
  ],
  MERCHANT: [
    { vi: 'Thương nhân lữ hành', en: 'Traveling merchant' },
    { vi: 'Chủ hiệu buôn lụa', en: 'Silk shop owner' },
    { vi: 'Đoàn xe thóc gạo', en: 'Grain caravan' }
  ],
  SCHOLAR: [
    { vi: 'Danh sĩ du học', en: 'Wandering scholar' },
    { vi: 'Ẩn sĩ núi cao', en: 'Mountain recluse' },
    { vi: 'Thầy đồ làng', en: 'Village teacher' }
  ],
  WARRIOR: [
    { vi: 'Hảo hán giang hồ', en: 'Wandering champion' },
    { vi: 'Cựu binh biên ải', en: 'Border veteran' },
    { vi: 'Thợ săn sơn lâm', en: 'Forest hunter' }
  ]
} as const;

export class FameAttractionService {
  private static instance: FameAttractionService | null = null;

  private constructor(private readonly db: DatabaseService) {}

  public static getInstance(): FameAttractionService {
    if (!FameAttractionService.instance) {
      FameAttractionService.instance = new FameAttractionService(DatabaseService.getInstance());
    }
    return FameAttractionService.instance;
  }

  public static forDatabase(db: DatabaseService): FameAttractionService {
    return new FameAttractionService(db);
  }

  public simulateMonthly(characterId = 'PLY-0001', gameDate?: string): FameArrivalReport {
    const prestige = PrestigeService.forDatabase(this.db);
    const fame = prestige.getFame(characterId);
    const tier = getFameTier(fame);
    const date = gameDate || this.currentDate();
    const count = fame < 500 ? 0 : fame < 2500 ? 1 : fame < 5000 ? 2 : 3;
    if (count === 0) {
      return { fame, tierCode: tier.code, arrivals: [], totalMilitia: 0, totalGrain: 0, fameGain: 0 };
    }

    const rng = RngService.forDomain(this.db, 'fame-arrivals');
    const arrivals: FameArrival[] = [];
    let totalMilitia = 0;
    let totalGrain = 0;
    let fameGain = 0;

    for (let i = 0; i < count; i += 1) {
      const kind = rng.pick(['VOLUNTEER', 'MERCHANT', 'SCHOLAR', 'WARRIOR'] as const);
      const name = rng.pick([...NAMES[kind]] as Array<{ vi: string; en: string }>);
      const militia = kind === 'VOLUNTEER' || kind === 'WARRIOR'
        ? Math.min(40, 5 + Math.floor(fame / 1000) * 2)
        : 0;
      const grainGift = kind === 'MERCHANT'
        ? Number((0.2 + Math.min(3, fame / 5000) * 1.5).toFixed(2))
        : 0;
      const arrivalId = nextId(this.db, 'fame_arrivals', 'ARR', date);

      const narrativeVi = kind === 'VOLUNTEER'
        ? `${name.vi} nghe danh ${fame} danh vọng, dẫn ${militia} tráng đinh xin gia nhập nghĩa binh.`
        : kind === 'WARRIOR'
          ? `${name.vi} tìm đến thử tài, mang theo ${militia} tùy tùng và xin theo phò tá.`
          : kind === 'MERCHANT'
            ? `${name.vi} dâng ${grainGift} Thạch lương thảo để kết giao với người nổi tiếng.`
            : `${name.vi} đến bàn luận thế sự, giúp danh tiếng lan xa thêm.`;
      const narrativeEn = kind === 'VOLUNTEER'
        ? `${name.en} heard of your ${fame} fame and brought ${militia} volunteers to join the militia.`
        : kind === 'WARRIOR'
          ? `${name.en} came to test your name, bringing ${militia} retainers to serve.`
          : kind === 'MERCHANT'
            ? `${name.en} offered ${grainGift} piculs of grain to court a famous patron.`
            : `${name.en} came to debate statecraft, spreading your name further.`;

      arrivals.push({ arrivalId, kind, nameVi: name.vi, nameEn: name.en, militia, grainGift, narrativeVi, narrativeEn });
      totalMilitia += militia;
      totalGrain += grainGift;
      if (kind === 'SCHOLAR') fameGain += 20;
    }

    this.db.transaction(() => {
      if (totalMilitia > 0 || totalGrain > 0) {
        this.db.execute(
          'UPDATE player_state SET militia = militia + ?, strategic_grain = strategic_grain + ? WHERE player_id = ?;',
          [totalMilitia, totalGrain, characterId]
        );
      }
      for (const arrival of arrivals) {
        this.db.execute(
          `INSERT INTO fame_arrivals
            (arrival_id, character_id, game_date, fame_at_arrival, tier_code, kind, name_vi, name_en, militia, grain_gift, narrative_vi, narrative_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [arrival.arrivalId, characterId, date, fame, tier.code, arrival.kind, arrival.nameVi, arrival.nameEn, arrival.militia, arrival.grainGift, arrival.narrativeVi, arrival.narrativeEn]
        );
      }
    });

    if (fameGain > 0) {
      prestige.award(characterId, { rawGain: fameGain, reason: 'FAME_ARRIVAL_SCHOLAR', sourceId: arrivals[0]?.arrivalId, gameDate: date });
    }

    return { fame, tierCode: tier.code, arrivals, totalMilitia, totalGrain, fameGain };
  }

  private currentDate(): string {
    const meta = this.db.queryOne<{ current_date: string }>(
      'SELECT "current_date" AS current_date FROM campaign_meta LIMIT 1;'
    );
    return meta?.current_date || '184-05-02';
  }
}
