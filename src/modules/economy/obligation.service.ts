/**
 * Periodic obligations (src/modules/economy/obligation.service.ts).
 *
 * Month close issues a tax bill for the month being entered. The player can pay
 * it through the API/UI; an unpaid bill that passes its due date becomes
 * OVERDUE with a late fee and a credibility loss. This is the first recurring
 * player-level cost outside the enterprise P&L: it turns "what do I owe this
 * month?" into a decision instead of a hidden deduction.
 */

import { DatabaseService } from '../../core/database';
import { postCashflowEntry, getPlayerCapital } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { nextSequentialId } from '../../shared/id-generator';

export type ObligationStatus = 'DUE' | 'PAID' | 'OVERDUE' | 'WAIVED';

export interface ObligationView {
  obligationId: string;
  type: string;
  counterparty: string;
  settlementId: string | null;
  amountCash: number;
  amountGrain: number;
  issuedDate: string;
  dueDate: string;
  status: ObligationStatus;
  paidDate: string | null;
  daysRemaining: number;
  breakdown: Record<string, unknown>;
  penalty: Record<string, unknown>;
  narrativeVi: string;
  narrativeEn: string;
}

export interface ObligationSummary {
  dueCount: number;
  overdueCount: number;
  totalCashDue: number;
  totalGrainDue: number;
  nextDueDate: string | null;
}

const TAX_RATE = 0.05;
const BASE_POLL_TAX = 10;
const RETAINER_POLL_TAX = 2;
const MIN_TAX = 20;
const LATE_FEE_RATE = 0.10;
const OVERDUE_CREDIBILITY_LOSS = 5;

function parseJson(value: unknown): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function dayNumber(date: string): number {
  const [year, month, day] = String(date || '').split('-').map(Number);
  if (!year || !month || !day) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function monthKey(date: string): string {
  const [year, month] = String(date).split('-');
  return `${year}${String(month).padStart(2, '0')}`;
}

function dueDateForMonth(date: string): string {
  const [year, month] = String(date).split('-');
  return `${year}-${String(month).padStart(2, '0')}-15`;
}

export class ObligationService {
  public constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): ObligationService {
    return new ObligationService(db);
  }

  public currentDate(): string {
    return this.db.queryOne<{ d: string }>(
      'SELECT "current_date" AS d FROM campaign_meta LIMIT 1;'
    )?.d || '184-05-02';
  }

  /**
   * Issues the monthly tax for `gameDate`'s month (normally the first day of the
   * month being entered). Idempotent per player and month.
   */
  public ensureMonthly(playerId = 'PLY-0001', gameDate?: string): ObligationView[] {
    const date = gameDate || this.currentDate();
    const key = monthKey(date);
    const obligationId = `OBL-TAX-${playerId}-${key}`;
    const existing = this.db.queryOne<any>(
      'SELECT * FROM obligations WHERE obligation_id = ? LIMIT 1;',
      [obligationId]
    );
    if (existing) return [];

    let businesses: any[] = [];
    try {
      businesses = this.db.query<any>(
        `SELECT business_id, name, current_workforce, efficiency_multiplier, tier
         FROM businesses
         WHERE status = 'ACTIVE' AND (owner_character_id = ? OR owner_character_id IS NULL);`,
        [playerId]
      );
    } catch {
      // Older schemas add owner_character_id lazily; fall back to all businesses.
      businesses = this.db.query<any>(
        `SELECT business_id, name, current_workforce, efficiency_multiplier, tier
         FROM businesses WHERE status = 'ACTIVE';`
      );
    }
    const businessGross = businesses.reduce((sum, business) => {
      const tier = Math.max(1, Number(business.tier || 1));
      const efficiency = Math.max(0, Number(business.efficiency_multiplier || 1));
      const staff = Math.max(0, Number(business.current_workforce || 0));
      return sum + tier * 260 * efficiency + staff * 25;
    }, 0);
    const businessTax = Math.round(businessGross * TAX_RATE);

    const retainers = Number(this.db.queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM npc_state
       WHERE monthly_wage > 0 OR assigned_business_id IS NOT NULL;`
    )?.c || 0);
    const householdTax = BASE_POLL_TAX + retainers * RETAINER_POLL_TAX;
    const total = Math.max(MIN_TAX, Math.round(businessTax + householdTax));

    const breakdown = {
      businessTax,
      householdTax,
      businesses: businesses.length,
      retainers,
      rate: TAX_RATE
    };
    const dueDate = dueDateForMonth(date);
    const narrativeVi = `Thuế tháng ${String(date).slice(0, 7)}: ${total} Quan, hạn ${dueDate}.`;
    const narrativeEn = `Tax for ${String(date).slice(0, 7)}: ${total} quan, due ${dueDate}.`;

    this.db.execute(
      `INSERT OR IGNORE INTO obligations
        (obligation_id, character_id, obligation_type, counterparty, settlement_id,
         amount_cash, amount_grain, issued_date, due_date, status, breakdown_json,
         narrative_vi, narrative_en)
       VALUES (?, ?, 'TAX', ?, NULL, ?, 0, ?, ?, 'DUE', ?, ?, ?);`,
      [
        obligationId,
        playerId,
        'Quan phủ địa phương',
        total,
        date,
        dueDate,
        JSON.stringify(breakdown),
        narrativeVi,
        narrativeEn
      ]
    );

    return this.list(playerId, date).filter(row => row.obligationId === obligationId);
  }

  public list(playerId = 'PLY-0001', gameDate?: string): ObligationView[] {
    const today = gameDate || this.currentDate();
    const rows = this.db.query<any>(
      `SELECT * FROM obligations
       WHERE character_id = ?
       ORDER BY CASE status WHEN 'OVERDUE' THEN 0 WHEN 'DUE' THEN 1 ELSE 2 END,
                due_date ASC, obligation_id ASC
       LIMIT 50;`,
      [playerId]
    );
    return rows.map(row => this.toView(row, today));
  }

  public summary(playerId = 'PLY-0001', gameDate?: string): ObligationSummary {
    const today = gameDate || this.currentDate();
    const rows = this.db.query<any>(
      `SELECT amount_cash, amount_grain, due_date, status FROM obligations
       WHERE character_id = ? AND status IN ('DUE', 'OVERDUE');`,
      [playerId]
    );
    const due = rows.filter(row => row.status === 'DUE');
    const overdue = rows.filter(row => row.status === 'OVERDUE');
    const nextDueDate = rows
      .map(row => String(row.due_date))
      .sort()[0] || null;
    return {
      dueCount: due.length,
      overdueCount: overdue.length,
      totalCashDue: rows.reduce((sum, row) => sum + Number(row.amount_cash || 0), 0),
      totalGrainDue: Number(rows.reduce((sum, row) => sum + Number(row.amount_grain || 0), 0).toFixed(2)),
      nextDueDate
    };
  }

  /**
   * Pays one obligation from player cash/grain. Returns the updated row.
   * Throws INSUFFICIENT_FUNDS without changing state when the player cannot pay.
   */
  public pay(obligationId: string, playerId = 'PLY-0001', gameDate?: string): ObligationView {
    const today = gameDate || this.currentDate();
    const row = this.db.queryOne<any>(
      'SELECT * FROM obligations WHERE obligation_id = ? AND character_id = ? LIMIT 1;',
      [obligationId, playerId]
    );
    if (!row) throw new Error(`Không tìm thấy nghĩa vụ ${obligationId}.`);
    if (row.status === 'PAID') throw new Error('Nghĩa vụ này đã được thanh toán.');
    if (row.status === 'WAIVED') throw new Error('Nghĩa vụ này đã được miễn.');

    const cashDue = Number(row.amount_cash || 0);
    const grainDue = Number(row.amount_grain || 0);
    const player = this.db.queryOne<any>(
      'SELECT liquid_cash, safe_cash, strategic_grain FROM player_state WHERE player_id = ? LIMIT 1;',
      [playerId]
    );
    if (!player) throw new Error(`Không tìm thấy nhân vật ${playerId}.`);
    if (Number(player.liquid_cash || 0) < cashDue) {
      const error: any = new Error(
        `Không đủ tiền mặt để trả ${cashDue} quan (hiện có ${Number(player.liquid_cash || 0)} quan).`
      );
      error.code = 'INSUFFICIENT_FUNDS';
      throw error;
    }
    if (Number(player.strategic_grain || 0) < grainDue) {
      const error: any = new Error(
        `Không đủ lương thảo để trả ${grainDue} Thạch (hiện có ${Number(player.strategic_grain || 0)} Thạch).`
      );
      error.code = 'INSUFFICIENT_GRAIN';
      throw error;
    }

    return this.db.transaction(() => {
      const newLiquid = Number(player.liquid_cash) - cashDue;
      const newGrain = Number(player.strategic_grain) - grainDue;
      this.db.execute(
        'UPDATE player_state SET liquid_cash = ?, strategic_grain = ? WHERE player_id = ?;',
        [newLiquid, Number(newGrain.toFixed(2)), playerId]
      );

      if (cashDue > 0) {
        const capital = getPlayerCapital(this.db, playerId);
        const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN-TAX', today);
        postCashflowEntry(this.db, {
          txnId,
          gameDate: today,
          counterparty: String(row.counterparty || 'Quan phủ'),
          category: 'TAX_PAYMENT',
          outflow: cashDue,
          balance: capital.total,
          memo: `Nộp ${row.obligation_type} kỳ ${String(row.due_date).slice(0, 7)}`
        });
        const campaign = this.db.queryOne<{ campaign_id: string }>(
          'SELECT campaign_id FROM campaign_meta LIMIT 1;'
        );
        this.db.execute(
          `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
           VALUES (?, ?, ?, ?, ?, 0, ?), (?, ?, ?, ?, 0, ?, ?);`,
          [
            txnId, campaign?.campaign_id || null, today, ACCOUNT_CODES.operatingExpense, cashDue,
            `Thuế phải nộp ${row.obligation_id}`,
            txnId, campaign?.campaign_id || null, today, ACCOUNT_CODES.cashMobile, cashDue,
            `Chi tiền mặt nộp thuế ${row.obligation_id}`
          ]
        );
      }

      this.db.execute(
        `UPDATE obligations
         SET status = 'PAID', paid_date = ?, updated_at = CURRENT_TIMESTAMP
         WHERE obligation_id = ?;`,
        [today, obligationId]
      );

      return this.toView(
        this.db.queryOne<any>('SELECT * FROM obligations WHERE obligation_id = ?;', [obligationId]),
        today
      );
    });
  }

  /**
   * Marks every DUE obligation whose due date has passed as OVERDUE, adds a
   * one-time late fee and reduces credibility. Runs at month close before the
   * new month's bills are issued.
   */
  public processDue(playerId = 'PLY-0001', gameDate?: string): ObligationView[] {
    const today = gameDate || this.currentDate();
    const rows = this.db.query<any>(
      `SELECT * FROM obligations
       WHERE character_id = ? AND status = 'DUE' AND due_date < ?;`,
      [playerId, today]
    );
    if (rows.length === 0) return [];

    return this.db.transaction(() => {
      const updated: ObligationView[] = [];
      for (const row of rows) {
        const base = Number(row.amount_cash || 0);
        const lateFee = Math.max(1, Math.round(base * LATE_FEE_RATE));
        const penalty = {
          lateFee,
          credibilityLoss: OVERDUE_CREDIBILITY_LOSS,
          markedAt: today
        };
        this.db.execute(
          `UPDATE obligations
           SET status = 'OVERDUE', amount_cash = ?, penalty_json = ?, updated_at = CURRENT_TIMESTAMP
           WHERE obligation_id = ?;`,
          [base + lateFee, JSON.stringify(penalty), row.obligation_id]
        );
        this.db.execute(
          `UPDATE player_state
           SET credibility = MAX(0, COALESCE(credibility, 50) - ?)
           WHERE player_id = ?;`,
          [OVERDUE_CREDIBILITY_LOSS, playerId]
        );
        updated.push(this.toView(
          this.db.queryOne<any>('SELECT * FROM obligations WHERE obligation_id = ?;', [row.obligation_id]),
          today
        ));
      }
      return updated;
    });
  }

  private toView(row: any, today: string): ObligationView {
    const dueDate = String(row.due_date || '');
    return {
      obligationId: row.obligation_id,
      type: row.obligation_type,
      counterparty: row.counterparty,
      settlementId: row.settlement_id || null,
      amountCash: Number(row.amount_cash || 0),
      amountGrain: Number(row.amount_grain || 0),
      issuedDate: row.issued_date,
      dueDate,
      status: row.status,
      paidDate: row.paid_date || null,
      daysRemaining: dayNumber(dueDate) - dayNumber(today),
      breakdown: parseJson(row.breakdown_json),
      penalty: parseJson(row.penalty_json),
      narrativeVi: row.narrative_vi || '',
      narrativeEn: row.narrative_en || ''
    };
  }
}
