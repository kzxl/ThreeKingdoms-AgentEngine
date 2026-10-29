/**
 * ThreeKingdoms-AgentEngine: Deterministic Random Service (src/core/rng.ts)
 *
 * Simulation outcomes must be reproducible from (campaign seed, turn, domain).
 * Domain code uses one stream per database + domain; the stream resets when the
 * active turn changes, so replaying the same action sequence on the same turn
 * yields the same rolls.
 *
 * Domain modules must use this service; the architecture guard budgets unseeded
 * randomness to keep replays reproducible.
 */

import { DatabaseService } from './database';

const DEFAULT_SEED = 1840201;

/** FNV-1a over the seed tuple; stable across processes and platforms. */
export function hashSeed(...parts: Array<string | number>): number {
  const text = parts.join(':');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG with dice helpers. */
export class SeededRandom {
  private state: number;

  constructor(seed: number = DEFAULT_SEED) {
    this.state = seed >>> 0;
  }

  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  public d20(): number {
    return this.nextInt(1, 20);
  }

  public d100(): number {
    return this.nextInt(1, 100);
  }

  public chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  public pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.nextFloat() * items.length)];
  }
}

interface StreamState {
  turn: number;
  rng: SeededRandom;
}

export class RngService {
  private static readonly streams = new Map<string, StreamState>();

  /**
   * Returns the stream for a domain (e.g. 'duel', 'npc-lifecycle', 'forging').
   * Resets when the campaign turn advances.
   */
  public static forDomain(db: DatabaseService, domain: string): SeededRandom {
    let seed = DEFAULT_SEED;
    let turn = 0;
    try {
      const row = db.queryOne<{ seed: number; turn: number }>(
        'SELECT random_seed AS seed, active_turn AS turn FROM campaign_meta LIMIT 1;'
      );
      if (row) {
        seed = Number(row.seed) || DEFAULT_SEED;
        turn = Number(row.turn) || 0;
      }
    } catch {
      // Campaign metadata missing (fresh sandbox): fall back to the default seed.
    }

    const key = `${db.getDbPath()}::${domain}`;
    const current = RngService.streams.get(key);
    if (!current || current.turn !== turn) {
      RngService.streams.set(key, { turn, rng: new SeededRandom(hashSeed(seed, turn, domain)) });
    }
    return RngService.streams.get(key)!.rng;
  }

  /** One-off stream for static/context-free code (e.g. a standalone battle simulation). */
  public static forSeed(seedKey: string, explicitSeed?: number): SeededRandom {
    return new SeededRandom(explicitSeed !== undefined ? explicitSeed >>> 0 : hashSeed(seedKey));
  }

  /** Clears cached streams (tests, instance switching). */
  public static reset(): void {
    RngService.streams.clear();
  }
}
