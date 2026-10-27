/**
 * ThreeKingdoms-AgentEngine: Universe Module Registry
 * Adheres to Universe Architecture v4.0 (AgentOption Principle 4: Self-Registration)
 * Coordinates lifecycle management and dependency injection across feature modules.
 */

import { IFeatureModule, ModuleContext } from './types';
import { EventBus } from './event-bus';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private readonly modules: Map<string, IFeatureModule> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  public register(module: IFeatureModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`[ModuleRegistry] Overwriting existing module: ${module.id}`);
    }
    this.modules.set(module.id, module);
  }

  public get<T extends IFeatureModule>(moduleId: string): T | undefined {
    return this.modules.get(moduleId) as T | undefined;
  }

  public getAll(): IFeatureModule[] {
    return Array.from(this.modules.values());
  }

  public async initAll(dbPath: string): Promise<void> {
    if (this.isInitialized) return;

    const ctx: ModuleContext = {
      dbPath,
      eventBus: EventBus.getInstance()
    };

    for (const [id, mod] of this.modules.entries()) {
      try {
        await mod.init(ctx);
      } catch (err: any) {
        console.error(`[ModuleRegistry] Failed to initialize module "${id}":`, err.message || err);
        throw err;
      }
    }

    this.isInitialized = true;
  }

  public async destroyAll(): Promise<void> {
    for (const mod of this.modules.values()) {
      if (typeof mod.destroy === 'function') {
        try {
          await mod.destroy();
        } catch (err: any) {
          console.error(`[ModuleRegistry] Error destroying module "${mod.id}":`, err.message || err);
        }
      }
    }
    this.modules.clear();
    this.isInitialized = false;
  }
}
