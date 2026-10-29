/**
 * Model Context Protocol (MCP) Tool Handlers
 * Exposes deterministic Grand Strategy systems & SQLite session to Antigravity Agents.
 */

import path from 'path';
import { McpToolDefinition } from './types';
import { DatabaseService } from '../core/database';
import { ModuleRegistry } from '../core/module-registry';
import { MilitaryModule } from '../modules/military/military.module';
import { EconomyModule } from '../modules/economy/economy.module';
import { KizunaModule } from '../modules/social-kizuna/kizuna.module';
import { AgentBridgeModule } from '../modules/agent-bridge/agent-bridge.module';
import { UtilityAiModule } from '../modules/utility-ai/utility-ai.module';
import { NpcLifecycleModule } from '../modules/npc-lifecycle/npc-lifecycle.module';

const ROOT_DIR = path.resolve(__dirname, '../..');
const DB_PATH = process.env.SIM_DB_PATH || path.join(ROOT_DIR, 'saves', 'session.db');

function runSqlJson(sql: string): any[] {
  return DatabaseService.getInstance(DB_PATH).query(sql);
}

// Ensure modules are registered
function getModules() {
  const registry = ModuleRegistry.getInstance();
  let mil = registry.get<MilitaryModule>('module.military');
  let econ = registry.get<EconomyModule>('module.economy');
  let kizuna = registry.get<KizunaModule>('module.social-kizuna');
  let bridge = registry.get<AgentBridgeModule>('module.agent-bridge');
  let ai = registry.get<UtilityAiModule>('module.utility-ai');
  let life = registry.get<NpcLifecycleModule>('module.npc-lifecycle');

  if (!mil) {
    mil = new MilitaryModule();
    econ = new EconomyModule();
    kizuna = new KizunaModule();
    bridge = new AgentBridgeModule();
    ai = new UtilityAiModule();
    life = new NpcLifecycleModule();

    registry.register(ai);
    registry.register(mil);
    registry.register(econ);
    registry.register(kizuna);
    registry.register(bridge);
    registry.register(life);
    registry.initAll(DB_PATH);
  }

  return { mil: mil!, econ: econ!, kizuna: kizuna!, bridge: bridge!, ai: ai!, life: life! };
}

// 1. Tool Definitions Catalog
export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'sim_query_player',
    description: 'Truy vấn trạng thái toàn diện của nhân vật chính (tiền mặt, kho hàng, kỹ năng, vị trí hiện tại, chỉ số).',
    parameters: {
      type: 'object',
      properties: {
        playerId: {
          type: 'string',
          description: 'ID của nhân vật chính, mặc định là PLY-0001 (Lương Diễn)'
        }
      }
    }
  },
  {
    name: 'sim_check_supply_line',
    description: 'Kiểm tra đường tiếp tế quân lương hoặc lộ trình thông thương giữa 2 cứ điểm (BFS Pathfinding trên đồ thị chiến lược).',
    parameters: {
      type: 'object',
      properties: {
        fromNode: {
          type: 'string',
          description: 'Mã cứ điểm xuất phát, ví dụ LOC-0001 (Trác Quận)'
        },
        supplyHub: {
          type: 'string',
          description: 'Mã trung tâm tiếp tế hậu cần, ví dụ LOC-0002 (Lạc Dương) hoặc LOC-0003 (Cự Lộc)'
        },
        maxHops: {
          type: 'number',
          description: 'Số chặng tối đa cho phép tiếp tế (mặc định 10)'
        }
      },
      required: ['fromNode', 'supplyHub']
    }
  },
  {
    name: 'sim_calculate_price',
    description: 'Tính toán giá cả hàng hóa co giãn theo cung cầu thực tế tại một khu vực theo nguyên lý Thermodynamic Economy.',
    parameters: {
      type: 'object',
      properties: {
        commodity: {
          type: 'string',
          description: 'Tên hàng hóa: GRAIN, RAW_IRON, TIMBER, SALT, LEATHER, WEAPON_SWORD, v.v.'
        },
        basePrice: {
          type: 'number',
          description: 'Giá gốc quy chuẩn'
        },
        stockUnits: {
          type: 'number',
          description: 'Số lượng tồn kho hiện tại tại địa phương'
        },
        demandUnits: {
          type: 'number',
          description: 'Số lượng nhu cầu tiêu thụ tại địa phương'
        },
        priceElasticity: {
          type: 'number',
          description: 'Độ co giãn giá cả (0.5 đến 4.0)'
        }
      },
      required: ['commodity', 'basePrice', 'stockUnits', 'demandUnits']
    }
  },
  {
    name: 'sim_get_kizuna',
    description: 'Tra cứu mạng lưới quan hệ 2 trục (Thiện cảm -100..+100 & Tôn kính 0..100) giữa 2 nhân vật, trạng thái Kết Nghĩa và Nợ ân nghĩa (Hooks).',
    parameters: {
      type: 'object',
      properties: {
        charA: {
          type: 'string',
          description: 'Mã nhân vật thứ nhất, ví dụ PLY-0001'
        },
        charB: {
          type: 'string',
          description: 'Mã nhân vật thứ hai, ví dụ NPC-0001 (Lưu Bị) hoặc NPC-0002 (Quan Vũ)'
        }
      },
      required: ['charA', 'charB']
    }
  },
  {
    name: 'sim_record_memory',
    description: 'Thu hoạch và ghi lại ký ức tự học (Episodic Memory) cho một NPC sau các biến cố/giao dịch lớn, giúp NPC tự tiến hóa và có chiều sâu đối thoại.',
    parameters: {
      type: 'object',
      properties: {
        npcId: {
          type: 'string',
          description: 'Mã NPC ghi nhận ký ức, ví dụ NPC-0001, NPC-0002'
        },
        turnNumber: {
          type: 'number',
          description: 'Lượt chơi hiện tại'
        },
        topic: {
          type: 'string',
          description: 'Chủ đề của ký ức (VD: TRADE_SALT, DUEL_SPAR, PEACH_GARDEN)'
        },
        emotionalValence: {
          type: 'string',
          enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'],
          description: 'Cảm xúc ghi nhận đối với nhân vật'
        },
        lessonLearned: {
          type: 'string',
          description: 'Bài học đúc kết chi tiết (bằng tiếng Việt chuẩn xác)'
        }
      },
      required: ['npcId', 'topic', 'lessonLearned']
    }
  },
  {
    name: 'sim_audit_invariants',
    description: 'Thực thi kiểm toán độc lập 80/80 Invariants của SQLite (Dr == Cr, bảo toàn kho, dòng tiền, không thất thoát ngân lượng).',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sim_get_npc_journey',
    description: 'Tra cứu hành trình phát triển tự thân, chí hướng cuộc đời, danh vọng, quân tư và nhật ký chiến tích của một NPC trong thế giới sống.',
    parameters: {
      type: 'object',
      properties: {
        npcId: {
          type: 'string',
          description: 'Mã NPC, ví dụ NPC-0001 (Lưu Bị), NPC-0002 (Quan Vũ), NPC-0003 (Trương Phi), NPC-0007 (Trần Bảo)'
        },
        limit: {
          type: 'number',
          description: 'Số lượng nhật ký hành trình cần lấy (mặc định 10)'
        }
      }
    }
  }
];

// 2. Tool Execution Dispatcher
export async function executeMcpTool(name: string, args: any): Promise<any> {
  const { mil, econ, kizuna, bridge, life } = getModules();

  switch (name) {
    case 'sim_query_player': {
      const rows = runSqlJson(`SELECT * FROM player_state LIMIT 1;`);
      const inventory = runSqlJson(`SELECT * FROM inventory_items;`);
      const player = rows[0] || null;
      return {
        success: true,
        player,
        inventorySummary: {
          totalSKUs: inventory.length,
          items: inventory.slice(0, 10)
        }
      };
    }

    case 'sim_check_supply_line': {
      const fromNode = args.fromNode || 'LOC-0001';
      const supplyHub = args.supplyHub || 'LOC-0002';
      const maxHops = args.maxHops || 10;
      const hasSupply = mil.graph.hasUnbrokenSupplyPath(fromNode, supplyHub, maxHops);
      return {
        success: true,
        fromNode,
        supplyHub,
        hasSupply,
        statusDescription: hasSupply
          ? `Đường tiếp tế hậu cần từ ${fromNode} tới ${supplyHub} thông suốt.`
          : `CẢNH BÁO: Đường tiếp tế giữa ${fromNode} và ${supplyHub} đã bị đứt gãy hoặc quá tầm vận lương!`
      };
    }

    case 'sim_calculate_price': {
      const dynamicPrice = econ.calculateDynamicPrice({
        commodity: args.commodity,
        basePrice: args.basePrice,
        currentPrice: args.basePrice,
        stockUnits: args.stockUnits,
        demandUnits: args.demandUnits,
        priceElasticity: args.priceElasticity || 1.5
      });
      return {
        success: true,
        commodity: args.commodity,
        basePrice: args.basePrice,
        calculatedPrice: dynamicPrice,
        deficitRatio: ((args.demandUnits - args.stockUnits) / Math.max(1, args.demandUnits)).toFixed(2)
      };
    }

    case 'sim_get_kizuna': {
      const rel = kizuna.getOrCreateRelation(args.charA, args.charB);
      return {
        success: true,
        charA: args.charA,
        charB: args.charB,
        affinity: rel.affinity,
        respect: rel.respect,
        isSwornBrother: rel.isSwornBrother,
        hooks: rel.hooks
      };
    }

    case 'sim_record_memory': {
      const mem = bridge.recordEpisodicMemory({
        npcId: args.npcId,
        turnNumber: args.turnNumber || 6,
        topic: args.topic,
        emotionalValence: args.emotionalValence || 'POSITIVE',
        lessonLearned: args.lessonLearned,
        createdDate: new Date().toISOString()
      });
      return {
        success: true,
        memoryId: mem.id,
        savedMemory: mem
      };
    }

    case 'sim_audit_invariants': {
      const audit = require('../../tools/sim-audit.js');
      const cashResult = audit.auditSqliteCashflow();
      const invResult = audit.auditSqliteInventory();
      const journalResult = audit.auditDoubleEntryJournal();
      const pass = cashResult.passed && invResult.passed && journalResult.passed;
      return {
        success: pass,
        verdict: pass ? '80/80 Invariants Verified (PASSED)' : 'DISCREPANCIES DETECTED',
        closingCash: cashResult.finalBalance,
        totalInventoryValue: invResult.totalValue,
        journalBalanced: journalResult.passed
      };
    }

    case 'sim_get_npc_journey': {
      const npcId = args.npcId || 'NPC-0003';
      const limit = args.limit || 10;
      const logs = life.getJourneyLogs(npcId, limit);
      const overview = life.getProgressionOverview();
      const npcOverview = overview.find((p: any) => p.npc_id === npcId) || null;
      return {
        success: true,
        npcId,
        progressionOverview: npcOverview,
        journeyLogsCount: logs.length,
        recentMilestones: logs
      };
    }

    default:
      throw new Error(`Tool "${name}" is not implemented.`);
  }
}
