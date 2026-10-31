/**
 * Rented farmland and seasonal crops (src/modules/professions/farm.service.ts).
 *
 * Farming used to be a gathering node: work as a hired labourer. This service
 * lets the player rent a parcel, choose a crop that fits the season, pay the
 * seed cost, wait for the growth window, and harvest into the warehouse. Rent
 * goes to the settlement's ruling faction; a late harvest loses yield, and an
 * active ecological crisis cuts the expected output.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { restoreInventoryItem } from '../../shared/inventory-movement';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';

export interface CropView {
  cropCode: string;
  nameVi: string;
  nameEn: string;
  seasons: string[];
  growthDays: number;
  seedCostPerMu: number;
  yieldPerMu: number;
  riskRate: number;
  descriptionVi: string;
  inSeason: boolean;
}

export interface FarmParcelView {
  parcelId: string;
  settlementId: string;
  nameVi: string;
  nameEn: string;
  areaMu: number;
  soilQuality: number;
  rentCash: number;
  status: string;
  leasedBy: string | null;
  leaseUntil: string | null;
  crop: {
    cropCode: string;
    nameVi: string;
    nameEn: string;
    plantedDate: string;
    harvestDate: string;
    daysRemaining: number;
    expectedYield: number;
  } | null;
  availableCrops: CropView[];
}

export interface FarmBoard {
  settlementId: string;
  season: string;
  parcels: FarmParcelView[];
  summary: { idle: number; leased: number; growing: number; nextHarvest: string | null };
}

const LEASE_DAYS = 90;

function parseDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = String(date).split('-').map(Number);
  return { year, month, day };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  const next = new Date(Date.UTC(year, month - 1, day + Math.max(0, Math.round(days))));
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function dayNumber(date: string): number {
  const { year, month, day } = parseDate(date);
  if (!year || !month || !day) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export class FarmService {
  public constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): FarmService {
    return new FarmService(db);
  }

  public currentDate(): string {
    return this.db.queryOne<{ d: string }>(
      'SELECT "current_date" AS d FROM campaign_meta LIMIT 1;'
    )?.d || '184-05-02';
  }

  public resolveSettlement(settlementId?: string): string {
    if (settlementId) return settlementId;
    const location = this.db.queryOne<{ current_location: string }>(
      "SELECT current_location FROM player_state WHERE player_id = 'PLY-0001' LIMIT 1;"
    )?.current_location || 'LOC-0001';
    return LOC_TO_NODE_MAP[location] || location;
  }

  public seasonOf(date: string): string {
    const { month } = parseDate(date);
    if (month <= 3) return 'SPRING';
    if (month <= 6) return 'SUMMER';
    if (month <= 9) return 'AUTUMN';
    return 'WINTER';
  }

  public listParcels(playerId = 'PLY-0001', settlementId?: string, gameDate?: string): FarmBoard {
    const today = gameDate || this.currentDate();
    const settlement = this.resolveSettlement(settlementId);
    const season = this.seasonOf(today);
    const crops = this.listCrops(season);
    const rows = this.db.query<any>(
      'SELECT * FROM land_parcels WHERE settlement_id = ? ORDER BY parcel_id;',
      [settlement]
    );
    const parcels: FarmParcelView[] = rows.map(row => {
      let crop: FarmParcelView['crop'] = null;
      if (row.status === 'GROWING' && row.crop_code) {
        const definition = this.getCrop(row.crop_code);
        crop = {
          cropCode: row.crop_code,
          nameVi: definition?.nameVi || row.crop_code,
          nameEn: definition?.nameEn || row.crop_code,
          plantedDate: row.planted_date,
          harvestDate: row.harvest_date,
          daysRemaining: dayNumber(row.harvest_date) - dayNumber(today),
          expectedYield: Number(row.expected_yield || 0)
        };
      }
      return {
        parcelId: row.parcel_id,
        settlementId: row.settlement_id,
        nameVi: row.name_vi,
        nameEn: row.name_en,
        areaMu: Number(row.area_mu),
        soilQuality: Number(row.soil_quality),
        rentCash: Number(row.rent_cash),
        status: row.status,
        leasedBy: row.leased_by || null,
        leaseUntil: row.lease_until || null,
        crop,
        availableCrops: row.status === 'LEASED' && row.leased_by === playerId ? crops : []
      };
    });
    const growing = parcels.filter(parcel => parcel.status === 'GROWING');
    const nextHarvest = growing
      .map(parcel => parcel.crop?.harvestDate || '')
      .filter(Boolean)
      .sort()[0] || null;
    return {
      settlementId: settlement,
      season,
      parcels,
      summary: {
        idle: parcels.filter(parcel => parcel.status === 'IDLE').length,
        leased: parcels.filter(parcel => parcel.status === 'LEASED').length,
        growing: growing.length,
        nextHarvest
      }
    };
  }

  public rent(parcelId: string, playerId = 'PLY-0001', gameDate?: string): FarmParcelView {
    const today = gameDate || this.currentDate();
    const parcel = this.db.queryOne<any>(
      'SELECT * FROM land_parcels WHERE parcel_id = ? LIMIT 1;',
      [parcelId]
    );
    if (!parcel) throw new Error(`Thửa ruộng ${parcelId} không tồn tại.`);
    if (parcel.status !== 'IDLE') throw new Error('Thửa ruộng này đã được thuê hoặc đang canh tác.');
    const rent = Number(parcel.rent_cash || 0);
    const player = this.db.queryOne<{ liquid_cash: number }>(
      "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"
    );
    if (!player || Number(player.liquid_cash) < rent) {
      const error: any = new Error(`Không đủ tiền thuê ruộng: cần ${rent} Quan.`);
      error.code = 'INSUFFICIENT_FUNDS';
      throw error;
    }

    this.db.transaction(() => {
      this.db.execute(
        "UPDATE player_state SET liquid_cash = liquid_cash - ? WHERE player_id = 'PLY-0001';",
        [rent]
      );
      this.db.execute(
        `UPDATE land_parcels
         SET status = 'LEASED', leased_by = ?, lease_until = ?
         WHERE parcel_id = ?;`,
        [playerId, addDays(today, LEASE_DAYS), parcelId]
      );
      if (parcel.owner_id) {
        this.db.execute(
          'UPDATE session_factions SET treasury_cash = treasury_cash + ? WHERE faction_id = ?;',
          [rent, parcel.owner_id]
        );
      }
    });
    return this.listParcels(playerId, parcel.settlement_id, today)
      .parcels.find(row => row.parcelId === parcelId)!;
  }

  public plant(
    parcelId: string,
    cropCode: string,
    playerId = 'PLY-0001',
    gameDate?: string
  ): FarmParcelView {
    const today = gameDate || this.currentDate();
    const parcel = this.db.queryOne<any>(
      'SELECT * FROM land_parcels WHERE parcel_id = ? LIMIT 1;',
      [parcelId]
    );
    if (!parcel) throw new Error(`Thửa ruộng ${parcelId} không tồn tại.`);
    if (parcel.leased_by !== playerId || parcel.status !== 'LEASED') {
      throw new Error('Bạn phải thuê thửa ruộng này trước khi gieo trồng.');
    }
    const crop = this.getCrop(cropCode);
    if (!crop) throw new Error(`Cây trồng ${cropCode} không tồn tại.`);
    const season = this.seasonOf(today);
    if (!crop.seasons.includes(season)) {
      throw new Error(`${crop.nameVi} không hợp mùa ${season}; hãy chọn cây khác hoặc đợi mùa tới.`);
    }

    const seedCost = Math.round(crop.seedCostPerMu * Number(parcel.area_mu || 1));
    const player = this.db.queryOne<{ liquid_cash: number }>(
      "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"
    );
    if (!player || Number(player.liquid_cash) < seedCost) {
      const error: any = new Error(`Không đủ tiền mua giống: cần ${seedCost} Quan.`);
      error.code = 'INSUFFICIENT_FUNDS';
      throw error;
    }

    const crisisPenalty = this.crisisPenalty(parcel.settlement_id);
    const expected = Math.max(
      1,
      Number(parcel.area_mu || 1)
      * Number(crop.yieldPerMu)
      * Number(parcel.soil_quality || 1)
      * (1 - Math.min(0.6, crisisPenalty * 0.5))
    );
    const harvestDate = addDays(today, crop.growthDays);

    this.db.transaction(() => {
      this.db.execute(
        "UPDATE player_state SET liquid_cash = liquid_cash - ? WHERE player_id = 'PLY-0001';",
        [seedCost]
      );
      this.db.execute(
        `UPDATE land_parcels
         SET status = 'GROWING', crop_code = ?, planted_date = ?, harvest_date = ?,
             seed_invested = ?, expected_yield = ?
         WHERE parcel_id = ?;`,
        [cropCode, today, harvestDate, seedCost, Number(expected.toFixed(2)), parcelId]
      );
    });
    return this.listParcels(playerId, parcel.settlement_id, today)
      .parcels.find(row => row.parcelId === parcelId)!;
  }

  public harvest(parcelId: string, playerId = 'PLY-0001', gameDate?: string): {
    parcel: FarmParcelView;
    itemCode: string;
    quantity: number;
    lateDays: number;
    riskLoss: number;
  } {
    const today = gameDate || this.currentDate();
    const parcel = this.db.queryOne<any>(
      'SELECT * FROM land_parcels WHERE parcel_id = ? LIMIT 1;',
      [parcelId]
    );
    if (!parcel) throw new Error(`Thửa ruộng ${parcelId} không tồn tại.`);
    if (parcel.leased_by !== playerId || parcel.status !== 'GROWING') {
      throw new Error('Thửa ruộng này không có vụ mùa để thu hoạch.');
    }
    if (String(parcel.harvest_date) > today) {
      throw new Error(`Chưa đến ngày thu hoạch (${parcel.harvest_date}).`);
    }

    const crop = this.getCrop(parcel.crop_code);
    if (!crop) throw new Error('Không tìm thấy giống cây đã gieo.');
    const lateDays = Math.max(0, dayNumber(today) - dayNumber(parcel.harvest_date));
    const latePenalty = Math.min(0.5, Math.floor(lateDays / 15) * 0.1);
    const rng = RngService.forDomain(this.db, 'farm-harvest');
    const riskLoss = rng.chance(Number(crop.riskRate)) ? 0.2 : 0;
    const expected = Number(parcel.expected_yield || 0);
    const quantity = Math.max(1, Math.round(expected * (1 - latePenalty) * (1 - riskLoss)));

    const item = this.db.queryOne<any>(
      'SELECT name_vi, category FROM master_items WHERE item_code = ? LIMIT 1;',
      [crop.yieldItemCode]
    );
    this.db.transaction(() => {
      restoreInventoryItem(this.db, {
        itemCode: crop.yieldItemCode,
        quantity,
        reason: 'FARM_HARVEST',
        gameDate: today,
        refTxn: `FARM-${parcelId}`,
        category: item?.category || 'FOOD_STUFF',
        description: item?.name_vi || crop.nameVi,
        unitCost: 0
      });
      this.db.execute(
        `UPDATE land_parcels
         SET status = 'LEASED', crop_code = NULL, planted_date = NULL, harvest_date = NULL,
             seed_invested = 0, expected_yield = 0
         WHERE parcel_id = ?;`,
        [parcelId]
      );
      this.awardFarmingExp(playerId, 30);
    });

    return {
      parcel: this.listParcels(playerId, parcel.settlement_id, today)
        .parcels.find(row => row.parcelId === parcelId)!,
      itemCode: crop.yieldItemCode,
      quantity,
      lateDays,
      riskLoss
    };
  }

  public expireLeases(gameDate?: string): number {
    const today = gameDate || this.currentDate();
    const result = this.db.execute(
      `UPDATE land_parcels
       SET status = 'IDLE', leased_by = NULL, lease_until = NULL
       WHERE status = 'LEASED' AND leased_by IS NOT NULL AND lease_until < ?;`,
      [today]
    );
    return Number((result as any)?.changes || 0);
  }

  private listCrops(season: string): CropView[] {
    return this.db.query<any>('SELECT * FROM master_crops ORDER BY crop_code;').map(row => {
      const seasons = String(row.seasons || '').split(',').map(value => value.trim()).filter(Boolean);
      return {
        cropCode: row.crop_code,
        nameVi: row.name_vi,
        nameEn: row.name_en,
        seasons,
        growthDays: Number(row.growth_days),
        seedCostPerMu: Number(row.seed_cost_per_mu),
        yieldPerMu: Number(row.yield_per_mu),
        riskRate: Number(row.risk_rate),
        descriptionVi: row.description_vi || '',
        inSeason: seasons.includes(season)
      };
    });
  }

  private getCrop(cropCode: string): any | null {
    if (!cropCode) return null;
    const row = this.db.queryOne<any>('SELECT * FROM master_crops WHERE crop_code = ? LIMIT 1;', [cropCode]);
    if (!row) return null;
    return {
      cropCode: row.crop_code,
      nameVi: row.name_vi,
      nameEn: row.name_en,
      seasons: String(row.seasons || '').split(',').map((value: string) => value.trim()),
      growthDays: Number(row.growth_days),
      seedCostPerMu: Number(row.seed_cost_per_mu),
      yieldPerMu: Number(row.yield_per_mu),
      yieldItemCode: row.yield_item_code,
      riskRate: Number(row.risk_rate)
    };
  }

  private crisisPenalty(settlementId: string): number {
    try {
      const row = this.db.queryOne<{ penalty: number }>(
        `SELECT COALESCE(SUM(agriculture_penalty), 0) AS penalty
         FROM regional_ecological_crises WHERE settlement_id = ? AND is_active = 1;`,
        [settlementId]
      );
      return Number(row?.penalty || 0);
    } catch {
      return 0;
    }
  }

  private awardFarmingExp(playerId: string, amount: number): void {
    try {
      const existing = this.db.queryOne<any>(
        "SELECT * FROM character_professions WHERE character_id = ? AND profession_code = 'PROF_FARMER' LIMIT 1;",
        [playerId]
      );
      if (existing) {
        this.db.execute(
          "UPDATE character_professions SET current_exp = current_exp + ? WHERE character_id = ? AND profession_code = 'PROF_FARMER';",
          [amount, playerId]
        );
      } else {
        this.db.execute(
          `INSERT INTO character_professions
            (character_id, profession_code, profession_name_vi, profession_name_en,
             category, tier, current_exp, max_exp, is_primary)
           VALUES (?, 'PROF_FARMER', 'Nông Phu & Đồn Điền', 'Farmer & Tuntian', 'GATHERING', 1, ?, 80, 0);`,
          [playerId, amount]
        );
      }
    } catch {
      // Profession rows are optional; the harvest still lands.
    }
  }
}
