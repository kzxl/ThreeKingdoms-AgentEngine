/**
 * Resource node rules and per-session stock.
 *
 * `resource_node_rules` is the data-driven contract for every resource type:
 * which skill trains on it, which tool improves it, how much stock it holds
 * and how fast it recovers. `gathering_node_state` stores the mutable stock so
 * master data stays immutable.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { consumeInventoryItem } from '../../shared/inventory-movement';
import { postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { nextSequentialId } from '../../shared/id-generator';
import { SkillService } from '../progression/skill.service';

export interface ResourceRule {
  resourceType: string;
  skillCode: string;
  requiredToolCode: string | null;
  maxStock: number;
  respawnPerDay: number;
  minSkillTier: number;
  qualityGrades: string | null;
  notesVi: string | null;
  restoreItemCode: string | null;
  restoreCash: number;
  restoreStock: number;
  restoreDays: number;
  restoreSkillCode: string | null;
  restoreMinTier: number;
}

export interface NodeStock {
  stock: number;
  maxStock: number;
  respawnPerDay: number;
  lastRespawnDate: string | null;
}

export interface ResourceVariant {
  variantId: string;
  itemCode: string;
  quality: string;
  quantityMultiplier: number;
  byproductItemCode: string | null;
  byproductQuantity: number;
}

function seasonOf(date: string): string {
  const month = Number(String(date || '184-05-02').split('-')[1]) || 5;
  if (month <= 3) return 'SPRING';
  if (month <= 6) return 'SUMMER';
  if (month <= 9) return 'AUTUMN';
  return 'WINTER';
}

function dayNumber(date: string): number {
  const [year, month, day] = String(date || '184-05-02').split('-').map(Number);
  return Math.floor(Date.UTC(year || 184, (month || 5) - 1, day || 2) / 86400000);
}

export class ResourceNodeService {
  constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): ResourceNodeService {
    return new ResourceNodeService(db);
  }

  public getRule(resourceType: string): ResourceRule | null {
    const row = this.db.queryOne<any>(
      'SELECT * FROM resource_node_rules WHERE resource_type = ? LIMIT 1;',
      [resourceType]
    );
    if (!row) return null;
    return {
      resourceType: row.resource_type,
      skillCode: row.skill_code,
      requiredToolCode: row.required_tool_code || null,
      maxStock: Number(row.max_stock || 50),
      respawnPerDay: Number(row.respawn_per_day || 2),
      minSkillTier: Number(row.min_skill_tier || 0),
      qualityGrades: row.quality_grades || null,
      notesVi: row.notes_vi || null,
      restoreItemCode: row.restore_item_code || null,
      restoreCash: Number(row.restore_cash || 0),
      restoreStock: Number(row.restore_stock || 0),
      restoreDays: Number(row.restore_days || 1),
      restoreSkillCode: row.restore_skill_code || null,
      restoreMinTier: Number(row.restore_min_tier || 0)
    };
  }

  public getStock(nodeId: string, rule: ResourceRule, currentDate: string): NodeStock {
    let state = this.db.queryOne<any>(
      'SELECT * FROM gathering_node_state WHERE node_id = ? LIMIT 1;',
      [nodeId]
    );
    if (!state) {
      this.db.execute(
        'INSERT OR IGNORE INTO gathering_node_state (node_id, stock, last_respawn_date) VALUES (?, ?, ?);',
        [nodeId, rule.maxStock, currentDate]
      );
      state = { node_id: nodeId, stock: rule.maxStock, last_respawn_date: currentDate };
    }

    const lastDate = state.last_respawn_date || currentDate;
    const elapsedDays = Math.max(0, dayNumber(currentDate) - dayNumber(lastDate));
    const stock = Math.min(
      rule.maxStock,
      Number(state.stock || 0) + elapsedDays * rule.respawnPerDay
    );
    if (elapsedDays > 0 || !state.last_respawn_date) {
      this.db.execute(
        'UPDATE gathering_node_state SET stock = ?, last_respawn_date = ?, updated_at = CURRENT_TIMESTAMP WHERE node_id = ?;',
        [stock, currentDate, nodeId]
      );
    }
    return {
      stock: Math.round(stock * 10) / 10,
      maxStock: rule.maxStock,
      respawnPerDay: rule.respawnPerDay,
      lastRespawnDate: currentDate
    };
  }

  /**
   * Consumes up to `requested` units from the node. Throws when the node is
   * exhausted; returns the actually harvested amount otherwise.
   */
  public consume(nodeId: string, rule: ResourceRule, requested: number, currentDate: string): NodeStock & { taken: number } {
    const stock = this.getStock(nodeId, rule, currentDate);
    if (stock.stock < 1) {
      const error: any = new Error('Điểm khai thác đã cạn kiệt; hãy đợi vài ngày để tài nguyên tái sinh.');
      error.code = 'NODE_EXHAUSTED';
      throw error;
    }
    const taken = Math.min(stock.stock, Math.max(0, requested));
    const remaining = Math.max(0, Math.round((stock.stock - taken) * 10) / 10);
    this.db.execute(
      'UPDATE gathering_node_state SET stock = ?, last_respawn_date = ?, updated_at = CURRENT_TIMESTAMP WHERE node_id = ?;',
      [remaining, currentDate, nodeId]
    );
    return { ...stock, stock: remaining, taken: Math.round(taken * 10) / 10 };
  }

  public hasTool(toolCode: string | null): boolean {
    if (!toolCode) return true;
    const row = this.db.queryOne<{ quantity: number }>(
      'SELECT quantity FROM inventory_items WHERE item_code = ? LIMIT 1;',
      [toolCode]
    );
    return Number(row?.quantity || 0) > 0;
  }

  public skillTier(skillCode: string): number {
    const row = this.db.queryOne<{ tier: number }>(
      'SELECT tier FROM player_skills WHERE skill_code = ? LIMIT 1;',
      [skillCode]
    );
    return Number(row?.tier || 0);
  }

  /**
   * Weighted variant pick filtered by skill tier and season. The caller passes
   * no RNG state, so the service keeps one deterministic stream per campaign.
   */
  public pickVariant(resourceType: string, skillTier: number, gameDate: string): ResourceVariant | null {
    const season = seasonOf(gameDate);
    const rows = this.db.query<any>(
      `SELECT * FROM resource_yield_variants
       WHERE resource_type = ?
         AND min_skill_tier <= ?
         AND (season = 'ALL' OR season = ?)
       ORDER BY variant_id;`,
      [resourceType, skillTier, season]
    );
    if (rows.length === 0) return null;

    const totalWeight = rows.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    if (totalWeight <= 0) return null;
    const roll = RngService.forDomain(this.db, 'resource-variant').nextFloat() * totalWeight;
    let cursor = 0;
    let picked = rows[rows.length - 1];
    for (const row of rows) {
      cursor += Number(row.weight || 0);
      if (roll <= cursor) {
        picked = row;
        break;
      }
    }
    return {
      variantId: picked.variant_id,
      itemCode: picked.item_code,
      quality: picked.quality || 'COMMON',
      quantityMultiplier: Number(picked.quantity_multiplier || 1),
      byproductItemCode: picked.byproduct_item_code || null,
      byproductQuantity: Number(picked.byproduct_quantity || 0)
    };
  }

  /**
   * Active restoration: consume one fry/sapling/salt-lick/seedling and the
   * labour fee, then add stock up to the node cap. The cash flow uses the same
   * double-entry writer as every other mutation.
   */
  public restoreNode(nodeId: string, characterId: string, gameDate: string): any {
    const node = this.db.queryOne<any>(
      'SELECT node_id, settlement_id, name_vi, resource_type FROM gathering_nodes WHERE node_id = ? LIMIT 1;',
      [nodeId]
    );
    if (!node) throw new Error(`Điểm tài nguyên ${nodeId} không tồn tại.`);
    const rule = this.getRule(node.resource_type);
    if (!rule || !rule.restoreItemCode || rule.restoreStock <= 0) {
      throw new Error(`Loại tài nguyên ${node.resource_type} không thể phục hồi chủ động.`);
    }

    const skillTier = rule.restoreSkillCode ? this.skillTier(rule.restoreSkillCode) : 0;
    if (rule.restoreMinTier > 0 && skillTier < rule.restoreMinTier) {
      throw new Error(
        `Cần kỹ năng ${rule.restoreSkillCode} bậc ${rule.restoreMinTier} để phục hồi ${node.name_vi} (hiện tại bậc ${skillTier}).`
      );
    }

    const stock = this.getStock(nodeId, rule, gameDate);
    if (stock.stock >= rule.maxStock - 0.01) {
      throw new Error(`${node.name_vi} đã đầy tài nguyên, chưa cần phục hồi.`);
    }

    const item = this.db.queryOne<{ quantity: number }>(
      'SELECT quantity FROM inventory_items WHERE item_code = ? LIMIT 1;',
      [rule.restoreItemCode]
    );
    if (Number(item?.quantity || 0) < 1) {
      throw new Error(`Cần 1 ${rule.restoreItemCode} trong kho để phục hồi ${node.name_vi}.`);
    }

    const player = this.db.queryOne<{ liquid_cash: number; safe_cash: number }>(
      'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
      [characterId]
    );
    if (!player) throw new Error(`Không tìm thấy nhân vật ${characterId}.`);
    if (Number(player.liquid_cash || 0) < rule.restoreCash) {
      throw new Error(`Cần ${rule.restoreCash} Quan chi phí phục hồi ${node.name_vi}.`);
    }

    return this.db.transaction(() => {
      consumeInventoryItem(this.db, {
        itemCode: rule.restoreItemCode!,
        quantity: 1,
        reason: 'NODE_RESTORE',
        gameDate,
        refTxn: `RESTORE-${nodeId}`,
        unitCost: 0
      });

      if (rule.restoreCash > 0) {
        const newLiquid = Number(player.liquid_cash || 0) - rule.restoreCash;
        const balance = newLiquid + Number(player.safe_cash || 0);
        this.db.execute(
          'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
          [newLiquid, characterId]
        );
        const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', gameDate);
        postDoubleEntry(this.db, {
          txnId,
          gameDate,
          counterparty: node.name_vi,
          category: 'Livelihood/NodeRestore',
          outflow: rule.restoreCash,
          balance,
          memo: `Phục hồi ${node.name_vi}`,
          debitAccount: ACCOUNT_CODES.operatingExpense,
          creditAccount: ACCOUNT_CODES.cashMobile
        });
      }

      const stockAfter = Math.min(rule.maxStock, stock.stock + rule.restoreStock);
      this.db.execute(
        'UPDATE gathering_node_state SET stock = ?, last_respawn_date = ?, updated_at = CURRENT_TIMESTAMP WHERE node_id = ?;',
        [stockAfter, gameDate, nodeId]
      );
      if (rule.restoreSkillCode) {
        SkillService.forDatabase(this.db).awardExp(rule.restoreSkillCode, 15);
      }

      return {
        nodeId,
        nodeName: node.name_vi,
        resourceType: node.resource_type,
        stockBefore: stock.stock,
        stockAfter: Number(stockAfter.toFixed(1)),
        maxStock: rule.maxStock,
        itemConsumed: rule.restoreItemCode,
        cashPaid: rule.restoreCash,
        skillCode: rule.restoreSkillCode,
        skillTier
      };
    });
  }

  public listNodes(settlementId?: string): any[] {
    const rows = settlementId
      ? this.db.query<any>(
        `SELECT g.*, r.skill_code AS rule_skill_code, r.required_tool_code AS rule_tool_code,
                r.max_stock, r.respawn_per_day, r.min_skill_tier, s.stock
         FROM gathering_nodes g
         LEFT JOIN resource_node_rules r ON r.resource_type = g.resource_type
         LEFT JOIN gathering_node_state s ON s.node_id = g.node_id
         WHERE g.settlement_id = ?
         ORDER BY g.settlement_id, g.resource_type;`,
        [settlementId]
      )
      : this.db.query<any>(
        `SELECT g.*, r.skill_code AS rule_skill_code, r.required_tool_code AS rule_tool_code,
                r.max_stock, r.respawn_per_day, r.min_skill_tier, s.stock
         FROM gathering_nodes g
         LEFT JOIN resource_node_rules r ON r.resource_type = g.resource_type
         LEFT JOIN gathering_node_state s ON s.node_id = g.node_id
         ORDER BY g.settlement_id, g.resource_type;`
      );
    return rows;
  }
}
