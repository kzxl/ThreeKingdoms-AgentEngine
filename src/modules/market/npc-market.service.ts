/**
 * NPC market offers: the buy side of the stall.
 *
 * Named NPCs list surplus around the local quote (0.85×–1.25×). The player buys
 * with cash; NPC personal cash rises, settlement stock falls and a sale row is
 * appended. Offers are generated lazily per settlement and expire after 30 days.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextSequentialId } from '../../shared/id-generator';
import { postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { restoreInventoryItem } from '../../shared/inventory-movement';
import { getMarketItem } from '../../shared/market-price-book';
import { SettlementMarketService } from '../economy/settlement-market.service';
import { SETTLEMENT_PROFILES } from '../economy/regional-market.service';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';
import { npcAskMultiplier } from './npc-pricing';

const DEFAULT_POOL = [
  'COM-GRAIN', 'COM-SALT', 'COM-LEATH', 'COM-BAMBOO', 'RAW-HERB-WILD',
  'COM-FISH-FRESH', 'COM-GAME-MEAT', 'RAW-TIMBER-OAK', 'COM-TEA-DRIED', 'PROD-MAT'
];

function addDays(date: string, days: number): string {
  const [year, month, day] = String(date || '184-05-02').split('-').map(Number);
  const next = new Date(Date.UTC(year || 184, (month || 5) - 1, (day || 2) + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

export class NpcMarketService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): NpcMarketService {
    return new NpcMarketService(db);
  }

  private currentDate(): string {
    return this.db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;')?.d || '184-05-02';
  }

  private settlementLocations(settlementId: string): string[] {
    const locations: string[] = [];
    for (const [loc, node] of Object.entries(LOC_TO_NODE_MAP)) {
      if (node === settlementId) locations.push(loc);
    }
    return locations;
  }

  private marketPrice(settlementId: string, itemCode: string): number {
    const item = getMarketItem(this.db, itemCode);
    if (!item) return 0;
    const local = SettlementMarketService.forDatabase(this.db).getLocalMultiplier(settlementId, itemCode);
    return Math.max(1, Math.round(item.price * local));
  }

  public listOffers(settlementId: string, gameDate?: string): any[] {
    const date = gameDate || this.currentDate();
    this.refreshOffers(settlementId, date);
    return this.db.query<any>(
      `SELECT o.*, mi.name_vi, mi.unit_vi
       FROM npc_market_offers o
       LEFT JOIN master_items mi ON mi.item_code = o.item_code
       WHERE o.settlement_id = ? AND o.status = 'ACTIVE' AND o.quantity > 0
       ORDER BY o.unit_price ASC, o.offer_id ASC;`,
      [settlementId]
    ).map(row => {
      const market = this.marketPrice(settlementId, row.item_code);
      return {
        offerId: row.offer_id,
        settlementId: row.settlement_id,
        npcId: row.npc_id,
        npcNameVi: row.npc_name_vi,
        itemCode: row.item_code,
        itemNameVi: row.name_vi || row.item_code,
        unitVi: row.unit_vi || 'đơn vị',
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        marketPrice: market,
        priceDeltaPct: market > 0 ? Math.round(((Number(row.unit_price) / market) - 1) * 100) : 0,
        expiresDate: row.expires_date
      };
    });
  }

  /**
   * Lazy offer generation. At most six NPCs per settlement list up to two goods
   * each; the pool prefers the settlement's surplus, falling back to common
   * goods. All randomness comes from the deterministic `npc-market` stream.
   */
  public refreshOffers(settlementId: string, gameDate?: string): number {
    const date = gameDate || this.currentDate();
    this.db.execute(
      "UPDATE npc_market_offers SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE settlement_id = ? AND status = 'ACTIVE' AND expires_date < ?;",
      [settlementId, date]
    );
    const active = Number(this.db.queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM npc_market_offers WHERE settlement_id = ? AND status = 'ACTIVE' AND quantity > 0;",
      [settlementId]
    )?.c || 0);
    if (active >= 6) return 0;

    const locations = this.settlementLocations(settlementId);
    if (locations.length === 0) return 0;
    const placeholders = locations.map(() => '?').join(',');
    // arch-guard:allow-sql-interpolation — placeholders only, one per settlement location.
    const npcs = this.db.query<any>(
      `SELECT npp.npc_id, npp.personal_cash, mc.name_vi
       FROM npc_personal_progression npp
       JOIN master_characters mc ON mc.npc_id = npp.npc_id
       WHERE mc.baseline_location IN (${placeholders})
         AND npp.npc_id <> 'PLY-0001'
       ORDER BY npp.personal_cash DESC, npp.npc_id ASC
       LIMIT 6;`,
      locations
    );
    if (npcs.length === 0) return 0;

    const profile = SETTLEMENT_PROFILES[settlementId];
    const pool = profile?.specialization?.surplusItems?.length
      ? profile.specialization.surplusItems
      : DEFAULT_POOL;
    const rng = RngService.forDomain(this.db, 'npc-market');
    const created: string[] = [];

    for (const npc of npcs) {
      for (let pick = 0; pick < 2; pick += 1) {
        const itemCode = pool[Math.floor(rng.nextFloat() * pool.length)];
        const item = getMarketItem(this.db, itemCode);
        if (!item) continue;
        const duplicate = this.db.queryOne(
          "SELECT 1 AS ok FROM npc_market_offers WHERE settlement_id = ? AND npc_id = ? AND item_code = ? AND status = 'ACTIVE' LIMIT 1;",
          [settlementId, npc.npc_id, itemCode]
        );
        if (duplicate) continue;
        const market = this.marketPrice(settlementId, itemCode) || item.price;
        const multiplier = 0.85 + rng.nextFloat() * 0.4;
        const askMultiplier = npcAskMultiplier(this.db, npc.npc_id, item.category);
        const unitPrice = Math.max(1, Math.round(market * multiplier * askMultiplier));
        const quantity = 2 + Math.floor(rng.nextFloat() * 6);
        const offerId = nextSequentialId(this.db, 'npc_market_offers', 'OFFER', date);
        this.db.execute(
          `INSERT INTO npc_market_offers
            (offer_id, settlement_id, npc_id, npc_name_vi, item_code, quantity, unit_price,
             status, created_date, expires_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?);`,
          [
            offerId,
            settlementId,
            npc.npc_id,
            npc.name_vi || npc.npc_id,
            itemCode,
            quantity,
            unitPrice,
            date,
            addDays(date, 30)
          ]
        );
        created.push(offerId);
      }
    }
    return created.length;
  }

  public buyOffer(characterId: string, offerId: string, quantity: number, gameDate?: string): any {
    const date = gameDate || this.currentDate();
    const offer = this.db.queryOne<any>(
      "SELECT * FROM npc_market_offers WHERE offer_id = ? AND status = 'ACTIVE' LIMIT 1;",
      [offerId]
    );
    if (!offer) throw new Error('Ưu đãi này không còn hiệu lực.');
    if (String(offer.expires_date) < date) {
      this.db.execute("UPDATE npc_market_offers SET status = 'EXPIRED' WHERE offer_id = ?;", [offerId]);
      throw new Error('Ưu đãi này đã hết hạn.');
    }
    const qty = Math.max(0.1, Number(quantity) || 0);
    if (qty > Number(offer.quantity)) throw new Error('Số lượng mua vượt quá hàng đang bán.');
    const total = Math.round(qty * Number(offer.unit_price));
    const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
      'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
      [characterId]
    );
    if (!player) throw new Error(`Không tìm thấy nhân vật ${characterId}.`);
    if (Number(player.liquid_cash || 0) < total) {
      throw new Error(`Cần ${total} Quan để mua ${qty} ${offer.item_code}.`);
    }

    return this.db.transaction(() => {
      const newLiquid = Number(player.liquid_cash || 0) - total;
      this.db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;', [newLiquid, characterId]);
      const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', date);
      postDoubleEntry(this.db, {
        txnId,
        gameDate: date,
        counterparty: offer.npc_name_vi,
        category: 'Trade/NpcPurchase',
        outflow: total,
        balance: newLiquid + Number(player.safe_cash || 0),
        memo: `Mua ${qty} ${offer.item_code} từ ${offer.npc_name_vi}`,
        debitAccount: ACCOUNT_CODES.inventory,
        creditAccount: ACCOUNT_CODES.cashMobile
      });
      this.db.execute(
        'UPDATE npc_personal_progression SET personal_cash = personal_cash + ? WHERE npc_id = ?;',
        [total, offer.npc_id]
      );
      restoreInventoryItem(this.db, {
        itemCode: offer.item_code,
        quantity: qty,
        reason: 'NPC_MARKET_BUY',
        gameDate: date,
        refTxn: `OFFER-${offerId}`,
        location: `Kho ${offer.settlement_id}`
      });
      const remaining = Math.max(0, Number(offer.quantity) - qty);
      this.db.execute(
        "UPDATE npc_market_offers SET quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE offer_id = ?;",
        [remaining, remaining > 0 ? 'ACTIVE' : 'SOLD_OUT', offerId]
      );
      SettlementMarketService.forDatabase(this.db).applyTrade(offer.settlement_id, offer.item_code, -qty);
      const saleId = nextSequentialId(this.db, 'npc_market_sales', 'NSALE', date);
      this.db.execute(
        `INSERT INTO npc_market_sales
          (sale_id, offer_id, npc_id, buyer_id, item_code, quantity, unit_price, total_cash, game_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [saleId, offerId, offer.npc_id, characterId, offer.item_code, qty, Number(offer.unit_price), total, date]
      );
      return {
        saleId,
        offerId,
        npcId: offer.npc_id,
        npcNameVi: offer.npc_name_vi,
        itemCode: offer.item_code,
        quantity: qty,
        unitPrice: Number(offer.unit_price),
        totalCash: total,
        remainingQuantity: remaining
      };
    });
  }
}
