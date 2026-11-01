/**
 * Resource node rules and per-session stock.
 *
 * `resource_node_rules` is the data-driven contract for every resource type:
 * which skill trains on it, which tool improves it, how much stock it holds
 * and how fast it recovers. `gathering_node_state` stores the mutable stock so
 * master data stays immutable.
 */

import { DatabaseService } from '../../core/database';

export interface ResourceRule {
  resourceType: string;
  skillCode: string;
  requiredToolCode: string | null;
  maxStock: number;
  respawnPerDay: number;
  minSkillTier: number;
  qualityGrades: string | null;
  notesVi: string | null;
}

export interface NodeStock {
  stock: number;
  maxStock: number;
  respawnPerDay: number;
  lastRespawnDate: string | null;
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
      notesVi: row.notes_vi || null
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
