/**
 * ThreeKingdoms-AgentEngine: Promissory Note & Merchant Credit Ledger Service
 * (src/modules/economy/promissory-note.service.ts)
 * 
 * Implements microeconomic credit contracts, monthly interest accrual,
 * debt settlement, and strict double-entry accounting integration.
 */

import { DatabaseService } from '../../core/database';
import { nextSequenceValue } from '../../shared/id-generator';

export interface PromissoryNote {
  noteId: string;
  borrowerId: string;
  lenderId: string;
  principalAmount: number;
  interestRateMonthly: number;
  accruedInterest: number;
  dueTurn: number;
  status: 'ACTIVE' | 'REPAID' | 'DEFAULTED';
  createdTurn: number;
  updatedAt: string;
}

export class PromissoryNoteService {
  private static instance: PromissoryNoteService;
  private readonly db: DatabaseService;

  private constructor(db: DatabaseService) {
    this.db = db;
  }

  public static getInstance(db?: DatabaseService): PromissoryNoteService {
    if (!PromissoryNoteService.instance) {
      PromissoryNoteService.instance = new PromissoryNoteService(db || DatabaseService.getInstance());
    }
    return PromissoryNoteService.instance;
  }

  /**
   * Issues a new formal credit contract / promissory note between two entities
   */
  public issueNote(params: {
    noteId?: string;
    borrowerId: string;
    lenderId: string;
    principalAmount: number;
    interestRateMonthly?: number;
    durationTurns?: number;
    turnNumber: number;
    gameDate: string;
  }): PromissoryNote {
    const {
      borrowerId,
      lenderId,
      principalAmount,
      interestRateMonthly = 0.03,
      durationTurns = 3,
      turnNumber,
      gameDate
    } = params;

    if (principalAmount <= 0) {
      throw new Error('Số tiền vay gốc phải lớn hơn 0.');
    }

    const suffix = String(nextSequenceValue(this.db, 'promissory-note')).padStart(4, '0');
    const noteId = params.noteId || `NOTE-${gameDate.replace(/-/g, '')}-${borrowerId}-${lenderId}-${turnNumber}-${suffix}`;
    const dueTurn = turnNumber + durationTurns;

    this.db.transaction(() => {
      // 1. Verify and transfer principal funds
      if (lenderId === 'PLY-0001') {
        const player = this.db.queryOne<any>(`SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = 'PLY-0001';`);
        if (!player || player.liquid_cash < principalAmount) {
          throw new Error('Số dư lưu động của người chơi không đủ để cấp vốn vay.');
        }
        const newLiquidCash = player.liquid_cash - principalAmount;
        const totalCash = Number(player.liquid_cash || 0) + Number(player.safe_cash || 0);
        const newTotalCash = totalCash - principalAmount;

        // Cashflow ledger outflow
        const txnId = `TXN-LOAN-${gameDate.replace(/-/g, '')}-${noteId}`;
        this.db.execute(`
          INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
          VALUES (?, ?, ?, 'Cho Vay Tín Dụng', 0, ?, ?, ?, 'Confirmed');
        `, [txnId, gameDate, borrowerId, principalAmount, newTotalCash, `Cấp tín dụng khế ước ${noteId}`]);

        // Double-entry: Debit 1003_ACCOUNTS_RECEIVABLE, Credit 1001_CASH_MOBILE
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '1003_ACCOUNTS_RECEIVABLE', ?, 0, 'Ghi nhận khoản phải thu thương mại');
        `, [txnId, gameDate, principalAmount]);
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '1001_CASH_MOBILE', 0, ?, 'Xuất quỹ tiền mặt cho vay');
        `, [txnId, gameDate, principalAmount]);

        this.db.execute(`UPDATE player_state SET liquid_cash = ? WHERE player_id = 'PLY-0001';`, [newLiquidCash]);
      } else {
        // NPC or Faction lender
        this.db.execute(`
          UPDATE npc_personal_progression 
          SET personal_cash = MAX(0, personal_cash - ?) 
          WHERE npc_id = ?;
        `, [principalAmount, lenderId]);
      }

      // Credit borrower
      if (borrowerId === 'PLY-0001') {
        const player = this.db.queryOne<any>(`SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = 'PLY-0001';`);
        const newLiquidCash = (player?.liquid_cash || 0) + principalAmount;
        const totalCash = Number(player?.liquid_cash || 0) + Number(player?.safe_cash || 0);
        const newTotalCash = totalCash + principalAmount;

        const txnId = `TXN-BORROW-${gameDate.replace(/-/g, '')}-${noteId}`;
        this.db.execute(`
          INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
          VALUES (?, ?, ?, 'Vay Nợ Ngắn Hạn', ?, 0, ?, ?, 'Confirmed');
        `, [txnId, gameDate, lenderId, principalAmount, newTotalCash, `Tiếp nhận vốn vay ${noteId}`]);

        // Double-entry: Debit 1001_CASH_MOBILE, Credit 2001_ACCOUNTS_PAYABLE
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '1001_CASH_MOBILE', ?, 0, 'Nhập quỹ tiền mặt từ khế ước vay');
        `, [txnId, gameDate, principalAmount]);
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '2001_ACCOUNTS_PAYABLE', 0, ?, 'Ghi nhận nợ phải trả thương nhân');
        `, [txnId, gameDate, principalAmount]);

        this.db.execute(`UPDATE player_state SET liquid_cash = ? WHERE player_id = 'PLY-0001';`, [newLiquidCash]);
      } else {
        this.db.execute(`
          INSERT INTO npc_personal_progression (npc_id, personal_cash) VALUES (?, ?)
          ON CONFLICT(npc_id) DO UPDATE SET personal_cash = personal_cash + excluded.personal_cash;
        `, [borrowerId, principalAmount]);
      }

      // 2. Persist Note Contract
      this.db.execute(`
        INSERT OR REPLACE INTO merchant_promissory_notes 
        (note_id, borrower_id, lender_id, principal_amount, interest_rate_monthly, accrued_interest, due_turn, status, created_turn)
        VALUES (?, ?, ?, ?, ?, 0, ?, 'ACTIVE', ?);
      `, [noteId, borrowerId, lenderId, principalAmount, interestRateMonthly, dueTurn, turnNumber]);
    });

    return {
      noteId,
      borrowerId,
      lenderId,
      principalAmount,
      interestRateMonthly,
      accruedInterest: 0,
      dueTurn,
      status: 'ACTIVE',
      createdTurn: turnNumber,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Settles / Repays a promissory note with full principal and accrued interest
   */
  public repayNote(noteId: string, turnNumber: number, gameDate: string): any {
    const note = this.db.queryOne<any>(`SELECT * FROM merchant_promissory_notes WHERE note_id = ?;`, [noteId]);
    if (!note) throw new Error(`Khế ước nợ ${noteId} không tồn tại.`);
    if (note.status !== 'ACTIVE') throw new Error(`Khế ước ${noteId} không ở trạng thái hiệu lực (Trạng thái: ${note.status}).`);

    const totalDue = note.principal_amount + note.accrued_interest;

    this.db.transaction(() => {
      if (note.borrower_id === 'PLY-0001') {
        const player = this.db.queryOne<any>(`SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = 'PLY-0001';`);
        if (!player || player.liquid_cash < totalDue) {
          throw new Error(`Người chơi không đủ tiền trả nợ (Cần: ${totalDue} Quan, Hiện có: ${player?.liquid_cash || 0} Quan).`);
        }
        const newLiquidCash = player.liquid_cash - totalDue;
        const totalCash = Number(player.liquid_cash || 0) + Number(player.safe_cash || 0);
        const newTotalCash = totalCash - totalDue;

        const txnId = `TXN-REPAY-${gameDate.replace(/-/g, '')}-${noteId}`;
        this.db.execute(`
          INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
          VALUES (?, ?, ?, 'Hoàn Trả Nợ Vay', 0, ?, ?, ?, 'Confirmed');
        `, [txnId, gameDate, note.lender_id, totalDue, newTotalCash, `Hoàn trả gốc + lãi khế ước ${noteId}`]);

        // Double-entry: Debit 2001_ACCOUNTS_PAYABLE (principal) + Debit 5002_FINANCIAL_EXPENSE (interest), Credit 1001_CASH_MOBILE
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '2001_ACCOUNTS_PAYABLE', ?, 0, 'Tất toán nợ gốc phải trả');
        `, [txnId, gameDate, note.principal_amount]);
        if (note.accrued_interest > 0) {
          this.db.execute(`
            INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
            VALUES (?, 'CMP-184-ZHOU-01', ?, '5002_FINANCIAL_EXPENSE', ?, 0, 'Chi phí lãi vay tín dụng');
          `, [txnId, gameDate, note.accrued_interest]);
        }
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '1001_CASH_MOBILE', 0, ?, 'Xuất quỹ tiền thanh toán khế ước');
        `, [txnId, gameDate, totalDue]);

        this.db.execute(`UPDATE player_state SET liquid_cash = ? WHERE player_id = 'PLY-0001';`, [newLiquidCash]);
      }

      if (note.lender_id === 'PLY-0001') {
        const player = this.db.queryOne<any>(`SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = 'PLY-0001';`);
        const newLiquidCash = (player?.liquid_cash || 0) + totalDue;
        const totalCash = Number(player?.liquid_cash || 0) + Number(player?.safe_cash || 0);
        const newTotalCash = totalCash + totalDue;

        const txnId = `TXN-COLLECT-${gameDate.replace(/-/g, '')}-${noteId}`;
        this.db.execute(`
          INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
          VALUES (?, ?, ?, 'Thu Hồi Nợ Cho Vay', ?, 0, ?, ?, 'Confirmed');
        `, [txnId, gameDate, note.borrower_id, totalDue, newTotalCash, `Thu hồi gốc + lãi khế ước ${noteId}`]);

        // Double-entry: Debit 1001_CASH_MOBILE, Credit 1003_ACCOUNTS_RECEIVABLE (principal) + Credit 4002_FINANCIAL_INCOME (interest)
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '1001_CASH_MOBILE', ?, 0, 'Nhập quỹ tiền mặt thu hồi nợ');
        `, [txnId, gameDate, totalDue]);
        this.db.execute(`
          INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES (?, 'CMP-184-ZHOU-01', ?, '1003_ACCOUNTS_RECEIVABLE', 0, ?, 'Xóa sổ khoản phải thu đã thu hồi');
        `, [txnId, gameDate, note.principal_amount]);
        if (note.accrued_interest > 0) {
          this.db.execute(`
            INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
            VALUES (?, 'CMP-184-ZHOU-01', ?, '4002_FINANCIAL_INCOME', 0, ?, 'Thu nhập lãi tín dụng');
          `, [txnId, gameDate, note.accrued_interest]);
        }

        this.db.execute(`UPDATE player_state SET liquid_cash = ? WHERE player_id = 'PLY-0001';`, [newLiquidCash]);
      }

      this.db.execute(`
        UPDATE merchant_promissory_notes 
        SET status = 'REPAID', updated_at = CURRENT_TIMESTAMP 
        WHERE note_id = ?;
      `, [noteId]);
    });

    return {
      success: true,
      noteId,
      totalPaid: totalDue,
      principal: note.principal_amount,
      interest: note.accrued_interest,
      message: `Đã thanh toán tất toán khế ước ${noteId} thành công (Gốc: ${note.principal_amount}, Lãi: ${note.accrued_interest} Quan).`
    };
  }

  /**
   * Compounds monthly interest across all active credit notes
   */
  public compoundMonthlyInterest(turnNumber: number): number {
    const activeNotes = this.db.query<any>(`SELECT * FROM merchant_promissory_notes WHERE status = 'ACTIVE';`);
    let totalAccrued = 0;

    this.db.transaction(() => {
      for (const n of activeNotes) {
        const monthlyInterest = Math.max(1, Math.round(n.principal_amount * (n.interest_rate_monthly || 0.03)));
        this.db.execute(`
          UPDATE merchant_promissory_notes 
          SET accrued_interest = accrued_interest + ?, updated_at = CURRENT_TIMESTAMP 
          WHERE note_id = ?;
        `, [monthlyInterest, n.note_id]);
        totalAccrued += monthlyInterest;
      }
    });

    return totalAccrued;
  }

  /**
   * Retrieves active promissory notes for an entity
   */
  public getNotes(entityId?: string): PromissoryNote[] {
    const filter = entityId ? `WHERE borrower_id = ? OR lender_id = ?` : '';
    const params = entityId ? [entityId, entityId] : [];
    return this.db.query<any>(`
      SELECT note_id as noteId, borrower_id as borrowerId, lender_id as lenderId,
             principal_amount as principalAmount, interest_rate_monthly as interestRateMonthly,
             accrued_interest as accruedInterest, due_turn as dueTurn,
             status, created_turn as createdTurn, updated_at as updatedAt
      FROM merchant_promissory_notes
      ${filter}
      ORDER BY rowid DESC;
    `, params);
  }
}
