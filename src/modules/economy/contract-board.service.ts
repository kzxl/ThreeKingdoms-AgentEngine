/**
 * Repeatable local contract board (src/modules/economy/contract-board.service.ts).
 *
 * Questlines are finite. This service posts three rotating delivery offers per
 * settlement each month, lets the player accept one, deliver the goods before
 * the deadline, and turns an expired contract into a penalty obligation.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextSequentialId } from '../../shared/id-generator';
import { postCashflowEntry, getPlayerCapital } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { consumeInventoryItem } from '../../shared/inventory-movement';
import { PrestigeService } from '../progression/prestige.service';
import { SETTLEMENT_PROFILES } from './regional-market.service';
import { SettlementMarketService } from './settlement-market.service';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';

export interface ContractOfferView {
  offerId: string;
  settlementId: string;
  itemCode: string;
  itemNameVi: string;
  itemNameEn: string;
  quantity: number;
  rewardCash: number;
  rewardFame: number;
  penaltyCash: number;
  deadlineDays: number;
  issuedDate: string;
  expiresDate: string;
  status: string;
  narrativeVi: string;
  narrativeEn: string;
}

export interface PlayerContractView {
  contractId: string;
  settlementId: string;
  itemCode: string;
  itemNameVi: string;
  itemNameEn: string;
  quantity: number;
  haveQuantity: number;
  rewardCash: number;
  rewardFame: number;
  penaltyCash: number;
  acceptedDate: string;
  dueDate: string;
  status: string;
  daysRemaining: number;
}

export interface ContractBoardView {
  settlementId: string;
  offers: ContractOfferView[];
  contracts: PlayerContractView[];
  summary: {
    active: number;
    overdue: number;
    rewardAtRisk: number;
  };
}

const OFFERS_PER_MONTH = 3;
const MIN_QUANTITY = 5;
const MAX_QUANTITY = 25;
const MIN_DEADLINE = 15;
const MAX_DEADLINE = 25;
const REWARD_MARGIN_MIN = 1.15;
const REWARD_MARGIN_MAX = 1.35;
const PENALTY_RATE = 0.15;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = String(date).split('-').map(Number);
  return { year, month, day };
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

function monthKey(date: string): string {
  const { year, month } = parseDate(date);
  return `${year}${pad(month)}`;
}

export class ContractBoardService {
  public constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): ContractBoardService {
    return new ContractBoardService(db);
  }

  public currentDate(): string {
    return this.db.queryOne<{ d: string }>(
      'SELECT "current_date" AS d FROM campaign_meta LIMIT 1;'
    )?.d || '184-05-02';
  }

  public resolveSettlement(playerId = 'PLY-0001', settlementId?: string): string {
    if (settlementId) return settlementId;
    const location = this.db.queryOne<{ current_location: string }>(
      'SELECT current_location FROM player_state WHERE player_id = ? LIMIT 1;',
      [playerId]
    )?.current_location || 'LOC-0001';
    return LOC_TO_NODE_MAP[location] || location;
  }

  /**
   * Creates this month's offers for a settlement. Idempotent by offer id and
   * deterministic for a given campaign seed.
   */
  public ensureOffers(settlementId: string, gameDate?: string): ContractOfferView[] {
    const profile = SETTLEMENT_PROFILES[settlementId];
    if (!profile) return [];
    const date = gameDate || this.currentDate();
    const key = monthKey(date);
    const existing = this.db.query<any>(
      'SELECT * FROM contract_offers WHERE settlement_id = ? AND offer_id LIKE ?;',
      [settlementId, `COF-${settlementId}-${key}-%`]
    );
    if (existing.length > 0) return existing.map(row => this.toOfferView(row));

    const rng = RngService.forDomain(this.db, 'contract-board');
    const pool = [
      ...(profile.specialization.deficitItems || []),
      ...(profile.specialization.surplusItems || [])
    ].filter((code, index, list) => list.indexOf(code) === index);
    if (pool.length === 0) {
      const rows = this.db.query<{ item_code: string }>(
        `SELECT item_code FROM master_items
         WHERE baseline_peace_price BETWEEN 20 AND 800
         ORDER BY item_code LIMIT 12;`
      );
      pool.push(...rows.map(row => row.item_code));
    }
    if (pool.length === 0) return [];

    const market = SettlementMarketService.forDatabase(this.db);
    const { year: offerYear, month: offerMonth } = parseDate(date);
    const expiresDate = formatDate(offerYear, offerMonth, 30);
    const inserted: ContractOfferView[] = [];
    for (let index = 0; index < OFFERS_PER_MONTH; index += 1) {
      const itemCode = pool[rng.nextInt(0, pool.length)];
      const item = this.db.queryOne<any>(
        'SELECT item_code, name_vi, name_en, baseline_peace_price FROM master_items WHERE item_code = ? LIMIT 1;',
        [itemCode]
      );
      if (!item) continue;
      const quantity = rng.nextInt(MIN_QUANTITY, MAX_QUANTITY);
      const local = market.getLocalMultiplier(settlementId, itemCode);
      const margin = REWARD_MARGIN_MIN + rng.nextFloat() * (REWARD_MARGIN_MAX - REWARD_MARGIN_MIN);
      const rewardCash = Math.max(
        10,
        Math.round(Number(item.baseline_peace_price || 10) * local * quantity * margin)
      );
      const penaltyCash = Math.round(rewardCash * PENALTY_RATE);
      const rewardFame = rng.nextInt(3, 9);
      const deadlineDays = rng.nextInt(MIN_DEADLINE, MAX_DEADLINE);
      const offerId = `COF-${settlementId}-${key}-${index + 1}`;
      const narrativeVi = `Giao ${quantity} ${item.name_vi} cho ${profile.nameVi} trước ${expiresDate}, thưởng ${rewardCash} Quan.`;
      const narrativeEn = `Deliver ${quantity} ${item.name_en || item.name_vi} to ${profile.nameVi} by ${expiresDate} for ${rewardCash} quan.`;

      this.db.execute(
        `INSERT OR IGNORE INTO contract_offers
          (offer_id, settlement_id, item_code, quantity, reward_cash, reward_fame,
           penalty_cash, deadline_days, issued_date, expires_date, status,
           narrative_vi, narrative_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?);`,
        [
          offerId, settlementId, itemCode, quantity, rewardCash, rewardFame,
          penaltyCash, deadlineDays, date, expiresDate, narrativeVi, narrativeEn
        ]
      );
      const row = this.db.queryOne<any>('SELECT * FROM contract_offers WHERE offer_id = ?;', [offerId]);
      if (row) inserted.push(this.toOfferView(row));
    }
    return inserted;
  }

  public list(playerId = 'PLY-0001', settlementId?: string, gameDate?: string): ContractBoardView {
    const today = gameDate || this.currentDate();
    const settlement = this.resolveSettlement(playerId, settlementId);
    const offers = this.ensureOffers(settlement, today)
      .filter(offer => offer.status === 'OPEN' && offer.expiresDate >= today);

    const contracts = this.db.query<any>(
      `SELECT * FROM player_contracts
       WHERE player_id = ?
       ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'EXPIRED' THEN 1 ELSE 2 END,
                due_date ASC
       LIMIT 20;`,
      [playerId]
    ).map(row => this.toContractView(row, today));
    const active = contracts.filter(contract => contract.status === 'ACTIVE');

    return {
      settlementId: settlement,
      offers,
      contracts,
      summary: {
        active: active.length,
        overdue: active.filter(contract => contract.daysRemaining < 0).length,
        rewardAtRisk: active.reduce((sum, contract) => sum + contract.rewardCash, 0)
      }
    };
  }

  public accept(offerId: string, playerId = 'PLY-0001', gameDate?: string): PlayerContractView {
    const today = gameDate || this.currentDate();
    const offer = this.db.queryOne<any>(
      'SELECT * FROM contract_offers WHERE offer_id = ? LIMIT 1;',
      [offerId]
    );
    if (!offer) throw new Error(`Hợp đồng ${offerId} không tồn tại.`);
    if (offer.status === 'ACCEPTED') {
      const existing = this.db.queryOne<any>(
        'SELECT * FROM player_contracts WHERE offer_id = ? LIMIT 1;',
        [offerId]
      );
      if (existing) return this.toContractView(existing, today);
    }
    if (offer.status !== 'OPEN') throw new Error('Hợp đồng này không còn nhận.');
    if (String(offer.expires_date) < today) {
      this.db.execute("UPDATE contract_offers SET status = 'EXPIRED' WHERE offer_id = ?;", [offerId]);
      throw new Error('Hợp đồng đã hết hạn nhận.');
    }

    const contractId = `CTR-${offerId}`;
    const dueDate = addDays(today, Number(offer.deadline_days || 15));
    return this.db.transaction(() => {
      this.db.execute(
        `INSERT OR IGNORE INTO player_contracts
          (contract_id, offer_id, player_id, settlement_id, item_code, quantity,
           reward_cash, reward_fame, penalty_cash, accepted_date, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE');`,
        [
          contractId, offerId, playerId, offer.settlement_id, offer.item_code,
          Number(offer.quantity), Number(offer.reward_cash), Number(offer.reward_fame),
          Number(offer.penalty_cash), today, dueDate
        ]
      );
      this.db.execute("UPDATE contract_offers SET status = 'ACCEPTED' WHERE offer_id = ?;", [offerId]);
      return this.toContractView(
        this.db.queryOne<any>('SELECT * FROM player_contracts WHERE contract_id = ?;', [contractId]),
        today
      );
    });
  }

  public deliver(contractId: string, playerId = 'PLY-0001', gameDate?: string): PlayerContractView {
    const today = gameDate || this.currentDate();
    const contract = this.db.queryOne<any>(
      'SELECT * FROM player_contracts WHERE contract_id = ? AND player_id = ? LIMIT 1;',
      [contractId, playerId]
    );
    if (!contract) throw new Error(`Hợp đồng ${contractId} không tồn tại.`);
    if (contract.status === 'DELIVERED') throw new Error('Hợp đồng này đã được giao.');
    if (contract.status === 'EXPIRED') throw new Error('Hợp đồng này đã hết hạn.');
    if (String(contract.due_date) < today) {
      this.expire(playerId, today);
      const error: any = new Error('Hợp đồng đã quá hạn giao hàng.');
      error.code = 'CONTRACT_EXPIRED';
      throw error;
    }

    const quantity = Number(contract.quantity);
    const item = this.db.queryOne<any>(
      'SELECT name_vi, name_en FROM master_items WHERE item_code = ? LIMIT 1;',
      [contract.item_code]
    );
    const reward = Number(contract.reward_cash || 0);

    return this.db.transaction(() => {
      const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN-CTR', today);
      consumeInventoryItem(this.db, {
        itemCode: contract.item_code,
        quantity,
        reason: 'CONTRACT_DELIVERY',
        gameDate: today,
        refTxn: txnId
      });

      this.db.execute(
        'UPDATE player_state SET liquid_cash = liquid_cash + ? WHERE player_id = ?;',
        [reward, playerId]
      );
      const capital = getPlayerCapital(this.db, playerId);
      postCashflowEntry(this.db, {
        txnId,
        gameDate: today,
        counterparty: `Thương hội ${contract.settlement_id}`,
        category: 'CONTRACT_REWARD',
        inflow: reward,
        balance: capital.total,
        memo: `Giao ${quantity} ${item?.name_vi || contract.item_code} theo hợp đồng ${contractId}`
      });
      const campaign = this.db.queryOne<{ campaign_id: string }>(
        'SELECT campaign_id FROM campaign_meta LIMIT 1;'
      );
      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, ?, ?, 0, ?), (?, ?, ?, ?, 0, ?, ?);`,
        [
          txnId, campaign?.campaign_id || null, today, ACCOUNT_CODES.cashMobile, reward,
          `Thu tiền hợp đồng ${contractId}`,
          txnId, campaign?.campaign_id || null, today, ACCOUNT_CODES.salesRevenue, reward,
          `Doanh thu hợp đồng ${contractId}`
        ]
      );

      const fame = Number(contract.reward_fame || 0);
      if (fame > 0) {
        PrestigeService.forDatabase(this.db).award(playerId, {
          rawGain: fame,
          reason: 'CONTRACT_DELIVERED',
          sourceId: contractId,
          gameDate: today
        });
      }

      this.db.execute(
        `UPDATE player_contracts
         SET status = 'DELIVERED', delivered_date = ?
         WHERE contract_id = ?;`,
        [today, contractId]
      );

      return this.toContractView(
        this.db.queryOne<any>('SELECT * FROM player_contracts WHERE contract_id = ?;', [contractId]),
        today
      );
    });
  }

  /**
   * Marks every ACTIVE contract whose due date passed as EXPIRED and creates a
   * CONTRACT_PENALTY obligation for each. Runs at month close.
   */
  public expire(playerId = 'PLY-0001', gameDate?: string): PlayerContractView[] {
    const today = gameDate || this.currentDate();
    const rows = this.db.query<any>(
      `SELECT * FROM player_contracts
       WHERE player_id = ? AND status = 'ACTIVE' AND due_date < ?;`,
      [playerId, today]
    );
    if (rows.length === 0) return [];

    return this.db.transaction(() => {
      const expired: PlayerContractView[] = [];
      for (const row of rows) {
        this.db.execute(
          "UPDATE player_contracts SET status = 'EXPIRED' WHERE contract_id = ?;",
          [row.contract_id]
        );
        const penalty = Number(row.penalty_cash || 0);
        if (penalty > 0) {
          try {
            this.db.execute(
              `INSERT OR IGNORE INTO obligations
                (obligation_id, character_id, obligation_type, counterparty, settlement_id,
                 amount_cash, amount_grain, issued_date, due_date, status, breakdown_json,
                 narrative_vi, narrative_en)
               VALUES (?, ?, 'CONTRACT_PENALTY', ?, ?, ?, 0, ?, ?, 'DUE', ?, ?, ?);`,
              [
                `OBL-CTR-${row.contract_id}`,
                playerId,
                `Thương hội ${row.settlement_id}`,
                row.settlement_id,
                penalty,
                today,
                today,
                JSON.stringify({ contractId: row.contract_id, itemCode: row.item_code, quantity: row.quantity }),
                `Phạt hợp đồng ${row.contract_id} quá hạn: ${penalty} Quan.`,
                `Contract ${row.contract_id} expired: ${penalty} quan penalty.`
              ]
            );
          } catch {
            // Older saves may not have the obligations table; the contract still expires.
          }
        }
        expired.push(this.toContractView(
          this.db.queryOne<any>('SELECT * FROM player_contracts WHERE contract_id = ?;', [row.contract_id]),
          today
        ));
      }
      return expired;
    });
  }

  public monthClose(playerId = 'PLY-0001', closedDate?: string, nextDate?: string): {
    expired: PlayerContractView[];
    offersIssued: number;
    summary: ContractBoardView['summary'];
  } {
    const today = closedDate || this.currentDate();
    const next = nextDate || today;
    const expired = this.expire(playerId, today);
    const settlement = this.resolveSettlement(playerId);
    const offers = this.ensureOffers(settlement, next);
    const board = this.list(playerId, settlement, next);
    return { expired, offersIssued: offers.length, summary: board.summary };
  }

  private toOfferView(row: any): ContractOfferView {
    const item = this.db.queryOne<any>(
      'SELECT name_vi, name_en FROM master_items WHERE item_code = ? LIMIT 1;',
      [row.item_code]
    );
    return {
      offerId: row.offer_id,
      settlementId: row.settlement_id,
      itemCode: row.item_code,
      itemNameVi: item?.name_vi || row.item_code,
      itemNameEn: item?.name_en || item?.name_vi || row.item_code,
      quantity: Number(row.quantity),
      rewardCash: Number(row.reward_cash),
      rewardFame: Number(row.reward_fame),
      penaltyCash: Number(row.penalty_cash),
      deadlineDays: Number(row.deadline_days),
      issuedDate: row.issued_date,
      expiresDate: row.expires_date,
      status: row.status,
      narrativeVi: row.narrative_vi || '',
      narrativeEn: row.narrative_en || ''
    };
  }

  private toContractView(row: any, today: string): PlayerContractView {
    const item = this.db.queryOne<any>(
      'SELECT name_vi, name_en FROM master_items WHERE item_code = ? LIMIT 1;',
      [row.item_code]
    );
    const stock = this.db.queryOne<{ quantity: number }>(
      'SELECT quantity FROM inventory_items WHERE item_code = ? LIMIT 1;',
      [row.item_code]
    );
    return {
      contractId: row.contract_id,
      settlementId: row.settlement_id,
      itemCode: row.item_code,
      itemNameVi: item?.name_vi || row.item_code,
      itemNameEn: item?.name_en || item?.name_vi || row.item_code,
      quantity: Number(row.quantity),
      haveQuantity: Number(stock?.quantity || 0),
      rewardCash: Number(row.reward_cash),
      rewardFame: Number(row.reward_fame),
      penaltyCash: Number(row.penalty_cash),
      acceptedDate: row.accepted_date,
      dueDate: row.due_date,
      status: row.status,
      daysRemaining: dayNumber(row.due_date) - dayNumber(today)
    };
  }
}
