/**
 * Rumor and intel reports (src/modules/economy/intel.service.ts).
 *
 * Information is a resource, not a free read of the database. Each month a
 * settlement produces price and garrison claims with a confidence and an
 * expiry. Verifying a report costs days through the controller and reveals the
 * truth; the claim may be wrong.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { SettlementMarketService } from './settlement-market.service';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';

export type IntelSubject = 'PRICE' | 'TROOP';

export interface IntelReportView {
  reportId: string;
  settlementId: string;
  subjectType: IntelSubject;
  subjectKey: string;
  subjectName: string;
  claim: Record<string, number>;
  confidence: number;
  confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  source: string;
  observedDate: string;
  expiresDate: string;
  status: string;
  verificationDays: number;
}

export interface IntelVerification {
  report: IntelReportView & {
    actual: Record<string, number>;
    isFalse: boolean;
    status: 'VERIFIED';
  };
}

function parseJson(value: unknown): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function monthKey(date: string): string {
  return String(date).slice(0, 7).replace('-', '');
}

function monthEnd(date: string): string {
  const [year, month] = String(date).split('-');
  return `${year}-${String(month).padStart(2, '0')}-30`;
}

function confidenceLabel(confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (confidence >= 0.75) return 'HIGH';
  if (confidence >= 0.5) return 'MEDIUM';
  return 'LOW';
}

export class IntelService {
  public constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): IntelService {
    return new IntelService(db);
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

  /**
   * Three monthly reports per settlement: two price claims and one garrison
   * claim. Deterministic for a given campaign seed, idempotent by report id.
   */
  public ensureMonthly(settlementId: string, gameDate?: string): IntelReportView[] {
    const date = gameDate || this.currentDate();
    const key = monthKey(date);
    const existing = this.db.query<any>(
      'SELECT * FROM intel_reports WHERE settlement_id = ? AND report_id LIKE ?;',
      [settlementId, `INT-${settlementId}-${key}-%`]
    );
    if (existing.length > 0) return existing.map(row => this.toView(row));

    const rng = RngService.forDomain(this.db, 'intel');
    const market = SettlementMarketService.forDatabase(this.db);
    const expiresDate = monthEnd(date);
    const items = this.db.query<any>(
      `SELECT item_code, name_vi, current_market_price, baseline_peace_price
       FROM master_items
       WHERE COALESCE(NULLIF(current_market_price, 0), baseline_peace_price) BETWEEN 20 AND 800
       ORDER BY item_code LIMIT 40;`
    );
    const settlement = this.db.queryOne<any>(
      'SELECT settlement_id, name_vi, garrison_troops FROM session_settlements WHERE settlement_id = ? LIMIT 1;',
      [settlementId]
    );

    const insert = this.db.getDb().prepare(`
      INSERT OR IGNORE INTO intel_reports
        (report_id, settlement_id, subject_type, subject_key, claim_json, confidence,
         is_false, source, observed_date, expires_date, status)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'OPEN');
    `);

    const created: IntelReportView[] = [];
    for (let index = 0; index < 2 && items.length > 0; index += 1) {
      const item = items[rng.nextInt(0, items.length)];
      if (!item) continue;
      const base = Number(item.current_market_price || item.baseline_peace_price || 50);
      const actual = Math.round(base * market.getLocalMultiplier(settlementId, item.item_code));
      const error = (rng.nextFloat() * 0.5 - 0.25); // -25% .. +25%
      const claimPrice = Math.max(1, Math.round(actual * (1 + error)));
      const confidence = Number((0.45 + rng.nextFloat() * 0.45).toFixed(2));
      const reportId = `INT-${settlementId}-${key}-${index + 1}`;
      insert.run(
        reportId,
        settlementId,
        'PRICE',
        item.item_code,
        JSON.stringify({ price: claimPrice, itemCode: item.item_code, itemNameVi: item.name_vi }),
        confidence,
        rng.chance(0.5) ? 'RUMOR' : 'MERCHANT',
        date,
        expiresDate
      );
      const row = this.db.queryOne<any>('SELECT * FROM intel_reports WHERE report_id = ?;', [reportId]);
      if (row) created.push(this.toView(row));
    }

    if (settlement) {
      const actual = Number(settlement.garrison_troops || 0);
      const error = (rng.nextFloat() * 0.6 - 0.3); // -30% .. +30%
      const claimTroops = Math.max(0, Math.round(actual * (1 + error)));
      const confidence = Number((0.4 + rng.nextFloat() * 0.5).toFixed(2));
      const reportId = `INT-${settlementId}-${key}-3`;
      insert.run(
        reportId,
        settlementId,
        'TROOP',
        settlementId,
        JSON.stringify({ troops: claimTroops, settlementNameVi: settlement.name_vi }),
        confidence,
        'SCOUT',
        date,
        expiresDate
      );
      const row = this.db.queryOne<any>('SELECT * FROM intel_reports WHERE report_id = ?;', [reportId]);
      if (row) created.push(this.toView(row));
    }

    return created;
  }

  public list(settlementId?: string, gameDate?: string): IntelReportView[] {
    const today = gameDate || this.currentDate();
    const settlement = this.resolveSettlement(settlementId);
    this.ensureMonthly(settlement, today);
    return this.db.query<any>(
      `SELECT * FROM intel_reports
       WHERE settlement_id = ? AND status = 'OPEN' AND expires_date >= ?
       ORDER BY confidence DESC, report_id ASC;`,
      [settlement, today]
    ).map(row => this.toView(row));
  }

  public verify(reportId: string, gameDate?: string): IntelVerification {
    const today = gameDate || this.currentDate();
    const row = this.db.queryOne<any>(
      'SELECT * FROM intel_reports WHERE report_id = ? LIMIT 1;',
      [reportId]
    );
    if (!row) throw new Error(`Tin đồn ${reportId} không tồn tại.`);
    if (row.status !== 'OPEN') throw new Error('Tin đồn này đã được xác minh hoặc loại bỏ.');

    const claim = parseJson(row.claim_json);
    let actual: Record<string, number> = {};
    if (row.subject_type === 'PRICE') {
      const item = this.db.queryOne<any>(
        `SELECT current_market_price, baseline_peace_price FROM master_items WHERE item_code = ? LIMIT 1;`,
        [row.subject_key]
      );
      const base = Number(item?.current_market_price || item?.baseline_peace_price || 0);
      const multiplier = SettlementMarketService.forDatabase(this.db)
        .getLocalMultiplier(row.settlement_id, row.subject_key);
      actual = { price: Math.round(base * multiplier) };
    } else {
      const settlement = this.db.queryOne<any>(
        'SELECT garrison_troops FROM session_settlements WHERE settlement_id = ? LIMIT 1;',
        [row.subject_key]
      );
      actual = { troops: Number(settlement?.garrison_troops || 0) };
    }

    const claimedValue = Number(claim.price ?? claim.troops ?? 0);
    const actualValue = Number(actual.price ?? actual.troops ?? 0);
    const isFalse = actualValue > 0
      ? Math.abs(claimedValue - actualValue) / actualValue > 0.2
      : claimedValue !== actualValue;

    this.db.execute(
      `UPDATE intel_reports
       SET status = 'VERIFIED', actual_json = ?, is_false = ?, verified_date = ?
       WHERE report_id = ?;`,
      [JSON.stringify(actual), isFalse ? 1 : 0, today, reportId]
    );

    const updated = this.db.queryOne<any>('SELECT * FROM intel_reports WHERE report_id = ?;', [reportId]);
    return {
      report: {
        ...this.toView(updated),
        actual,
        isFalse,
        status: 'VERIFIED'
      }
    };
  }

  private toView(row: any): IntelReportView {
    const claim = parseJson(row.claim_json);
    const subjectName = row.subject_type === 'PRICE'
      ? String(claim.itemNameVi || claim.itemCode || row.subject_key)
      : String(claim.settlementNameVi || row.subject_key);
    return {
      reportId: row.report_id,
      settlementId: row.settlement_id,
      subjectType: row.subject_type,
      subjectKey: row.subject_key,
      subjectName,
      claim,
      confidence: Number(row.confidence),
      confidenceLabel: confidenceLabel(Number(row.confidence)),
      source: row.source,
      observedDate: row.observed_date,
      expiresDate: row.expires_date,
      status: row.status,
      verificationDays: 2
    };
  }
}
