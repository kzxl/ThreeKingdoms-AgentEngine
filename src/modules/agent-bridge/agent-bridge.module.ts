/**
 * Feature Module: Agent Bridge & Continuous Knowledge Harvesting
 * Bridges deterministic JS/SQLite engine with Antigravity AI Agent & MCP
 * Implements Episodic Memory harvesting, Semantic Intervention triggers, and self-learning loops.
 */

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
  private readonly memories: NpcMemory[] = [];
  private readonly pendingInterventions: SemanticInterventionRequest[] = [];

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;

    // Listen to major events for memory harvesting
    this.ctx.eventBus.subscribe('HISTORICAL_EVENT_RESOLVED', async (event: any) => {
      this.recordEpisodicMemory({
        npcId: event.primaryCharacterId || 'NPC-0001',
        turnNumber: event.turn || 1,
        topic: event.eventId || 'HISTORICAL_CHOICE',
        emotionalValence: event.outcomeType === 'CANON' ? 'POSITIVE' : 'NEUTRAL',
        lessonLearned: `Người chơi đã quyết định: "${event.choiceNarrative || 'Tham gia biến cố'}". Hệ quả: ${event.resolutionNarrative || 'Thế cục biến chuyển'}.`,
        createdDate: new Date().toISOString()
      });
    });
  }

  /**
   * Records an episodic memory for an NPC to enable continuous character growth
   */
  public recordEpisodicMemory(memory: Omit<NpcMemory, 'id'>): NpcMemory {
    const fullMemory: NpcMemory = {
      id: `MEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...memory
    };
    this.memories.unshift(fullMemory);
    if (this.memories.length > 200) this.memories.pop();

    this.ctx.eventBus.publish('NPC_MEMORY_HARVESTED', fullMemory);
    return fullMemory;
  }

  /**
   * Retrieves memories related to an NPC for rich LLM context injection
   */
  public getNpcMemories(npcId: CharacterId, limit = 5): NpcMemory[] {
    return this.memories.filter(m => m.npcId === npcId).slice(0, limit);
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
