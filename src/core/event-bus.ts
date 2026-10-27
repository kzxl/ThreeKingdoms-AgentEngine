/**
 * ThreeKingdoms-AgentEngine: In-Memory EventBus
 * Adheres to Universe Architecture v4.0 (AgentOption Principle 5: Indirect Communication)
 * Decouples feature modules to prevent direct cross-module coupling.
 */

export type EventHandler<T = any> = (event: T) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const list = this.handlers.get(eventType);
      if (list) {
        const index = list.indexOf(handler);
        if (index !== -1) list.splice(index, 1);
      }
    };
  }

  public async publish<T = any>(eventType: string, payload: T): Promise<void> {
    const list = this.handlers.get(eventType);
    if (!list || list.length === 0) return;

    for (const handler of list) {
      try {
        await handler(payload);
      } catch (err: any) {
        console.error(`[EventBus] Error in handler for event "${eventType}":`, err.message || err);
      }
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
