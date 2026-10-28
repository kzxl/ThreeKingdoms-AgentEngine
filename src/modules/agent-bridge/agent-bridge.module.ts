/**
 * Feature Module: Agent Bridge & Continuous Knowledge Harvesting
 * Bridges deterministic JS/SQLite engine with Antigravity AI Agent & MCP
 * Implements Episodic Memory harvesting, Semantic Intervention triggers, and self-learning loops.
 */

import { DatabaseService } from '../../core/database';
import { IFeatureModule, ModuleContext, CharacterId } from '../../core/types';

export interface NpcMemory {
  id: string;
  npcId: CharacterId;
  turnNumber: number;
  topic: string;
  emotionalValence: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  lessonLearned: string;
  createdDate: string;
}

export interface SemanticInterventionRequest {
  id: string;
  type: 'UNRESOLVED_DILEMMA' | 'UNUSUAL_PLAYER_SCHEME' | 'DEEP_DIPLOMATIC_TALK';
  contextSummary: string;
  involvedCharacters: CharacterId[];
  resolved: boolean;
}

export class AgentBridgeModule implements IFeatureModule {
  public readonly id = 'module.agent-bridge';
  public readonly name = 'Agent Semantic Bridge & Continuous Learning Core';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;
  private db?: DatabaseService;
  private readonly memories: NpcMemory[] = [];
  private readonly pendingInterventions: SemanticInterventionRequest[] = [];

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;
    if (ctx.dbPath) {
      try {
        this.db = DatabaseService.getInstance(ctx.dbPath);
        this.db.execute(`
          CREATE TABLE IF NOT EXISTS npc_episodic_memories (
            id TEXT PRIMARY KEY,
            npc_id TEXT NOT NULL,
            turn_number INTEGER NOT NULL,
            topic TEXT NOT NULL,
            emotional_valence TEXT NOT NULL,
            lesson_learned TEXT NOT NULL,
            created_date TEXT NOT NULL
          );
        `);

        // Preload recent memories from SQLite
        const rows = this.db.query<any>(`
          SELECT id, npc_id as npcId, turn_number as turnNumber, topic,
                 emotional_valence as emotionalValence, lesson_learned as lessonLearned,
                 created_date as createdDate
          FROM npc_episodic_memories
          ORDER BY turn_number DESC, rowid DESC
          LIMIT 100;
        `);
        for (const r of rows) {
          this.memories.push(r);
        }
      } catch (e) {
        console.warn('[AgentBridgeModule] Database initialization warning:', e);
      }
    }

    // Listen to major events for memory harvesting
    this.ctx.eventBus.subscribe('HISTORICAL_EVENT_RESOLVED', async (event: any) => {
      this.recordEpisodicMemory({
        npcId: event.primaryCharacterId || 'NPC-0001',
        turnNumber: event.turn || 1,
        topic: event.eventId || 'HISTORICAL_CHOICE',
        emotionalValence: event.outcomeType === 'CANON' ? 'POSITIVE' : 'NEUTRAL',
        lessonLearned: `Người chơi đã quyết định: "${event.choiceNarrative || 'Tham gia biến cố'}". Hệ quả: ${event.resolutionNarrative || 'Thế cục biến chuyển'}.`,
        createdDate: event.gameDate ? `${event.gameDate}T00:00:00.000Z` : new Date().toISOString()
      });
    });
  }

  /**
   * Records an episodic memory for an NPC to enable continuous character growth
   */
  public recordEpisodicMemory(memory: Omit<NpcMemory, 'id'>): NpcMemory {
    const memIndex = this.memories.length + 1;
    const fullMemory: NpcMemory = {
      id: `MEM-${memory.turnNumber}-${memory.npcId}-${memIndex}`,
      ...memory
    };
    this.memories.unshift(fullMemory);
    if (this.memories.length > 200) this.memories.pop();

    if (this.db) {
      try {
        this.db.execute(`
          INSERT OR REPLACE INTO npc_episodic_memories (id, npc_id, turn_number, topic, emotional_valence, lesson_learned, created_date)
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `, [
          fullMemory.id,
          fullMemory.npcId,
          fullMemory.turnNumber,
          fullMemory.topic,
          fullMemory.emotionalValence,
          fullMemory.lessonLearned,
          fullMemory.createdDate
        ]);
      } catch (e) {
        console.warn('[AgentBridgeModule] Error persisting episodic memory:', e);
      }
    }

    this.ctx.eventBus.publish('NPC_MEMORY_HARVESTED', fullMemory);
    return fullMemory;
  }

  /**
   * Retrieves memories related to an NPC for rich LLM context injection
   */
  public getNpcMemories(npcId: CharacterId, limit = 5): NpcMemory[] {
    const inMem = this.memories.filter(m => m.npcId === npcId).slice(0, limit);
    if (inMem.length >= limit || !this.db) {
      return inMem;
    }

    try {
      const fromDb = this.db.query<any>(`
        SELECT id, npc_id as npcId, turn_number as turnNumber, topic,
               emotional_valence as emotionalValence, lesson_learned as lessonLearned,
               created_date as createdDate
        FROM npc_episodic_memories
        WHERE npc_id = ?
        ORDER BY turn_number DESC, rowid DESC
        LIMIT ?;
      `, [npcId, limit]);
      return fromDb;
    } catch {
      return inMem;
    }
  }

  /**
   * Emits a request for the Antigravity Agent to intervene with deep semantic reasoning
   */
  public triggerSemanticIntervention(
    type: SemanticInterventionRequest['type'],
    contextSummary: string,
    involvedCharacters: CharacterId[]
  ): SemanticInterventionRequest {
    const req: SemanticInterventionRequest = {
      id: `INT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      contextSummary,
      involvedCharacters,
      resolved: false
    };
    this.pendingInterventions.push(req);
    this.ctx.eventBus.publish('SEMANTIC_INTERVENTION_REQUESTED', req);
    return req;
  }
}
