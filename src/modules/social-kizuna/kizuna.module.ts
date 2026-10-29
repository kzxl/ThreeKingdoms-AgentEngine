/**
 * Feature Module: Social Bond Mesh & Kizuna Network
 * Ported from GrandStrategy.Core (SocialSystem.cs & Doc 19)
 * Implements 2-axis Affinity & Respect, Sworn Brotherhoods, and Political Hooks.
 */

import { IFeatureModule, ModuleContext, KizunaRelation, CharacterId } from '../../core/types';

/** Hooks live in memory for the process lifetime, so a counter is enough. */
let hookSequence = 0;

export class KizunaModule implements IFeatureModule {
  public readonly id = 'module.social-kizuna';
  public readonly name = 'Social Bond Network & Kizuna System';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;
  private readonly relations: Map<string, KizunaRelation> = new Map();

  private getPairKey(a: CharacterId, b: CharacterId): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;
  }

  public getOrCreateRelation(charA: CharacterId, charB: CharacterId): KizunaRelation {
    const key = this.getPairKey(charA, charB);
    if (!this.relations.has(key)) {
      this.relations.set(key, {
        characterIdA: charA,
        characterIdB: charB,
        affinity: 0,
        respect: 10,
        isSwornBrother: false,
        hooks: []
      });
    }
    return this.relations.get(key)!;
  }

  public modifySentiment(charA: CharacterId, charB: CharacterId, affinityDelta: number, respectDelta = 0): KizunaRelation {
    const rel = this.getOrCreateRelation(charA, charB);
    rel.affinity = Math.max(-100, Math.min(100, rel.affinity + affinityDelta));
    rel.respect = Math.max(0, Math.min(100, rel.respect + respectDelta));

    // Check sworn brotherhood condition (Affinity >= 90, Respect >= 80)
    if (rel.affinity >= 90 && rel.respect >= 80 && !rel.isSwornBrother) {
      this.ctx.eventBus.publish('KIZUNA_SWORN_BROTHER_ELIGIBLE', {
        charA,
        charB,
        relation: rel
      });
    }

    return rel;
  }

  public addHook(
    holderId: CharacterId,
    targetId: CharacterId,
    type: 'DEBT_FAVOR' | 'SECRET_BLACKMAIL' | 'LIFE_SAVED',
    description: string,
    turnValidFor = 12
  ): void {
    const rel = this.getOrCreateRelation(holderId, targetId);
    rel.hooks.push({
      hookId: `HOOK-${++hookSequence}`,
      type,
      description,
      expirationTurn: turnValidFor
    });

    this.ctx.eventBus.publish('KIZUNA_HOOK_CREATED', {
      holderId,
      targetId,
      type,
      description
    });
  }
}
