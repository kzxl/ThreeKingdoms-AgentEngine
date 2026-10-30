/**
 * ThreeKingdoms-AgentEngine: Prestige Service (src/modules/progression/prestige.service.ts)
 *
 * The only writer of character fame. NPCs store fame in
 * `npc_personal_progression.prestige`; the player stores it in
 * `player_state.fame`. The `character_prestige` view joins both without
 * duplicating the value.
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';
import {
  applyFameDecay,
  effectiveFameGain,
  getFameTier,
  normalizeFame,
  FameTier
} from '../../shared/prestige';

export interface PrestigeChangeInput {
  rawGain: number;
  reason: string;
  sourceId?: string;
  gameDate?: string;
}

export interface PrestigeChangeResult {
  characterId: string;
  before: number;
  after: number;
  delta: number;
  tier: FameTier;
}

const PLAYER_ID = 'PLY-0001';

export class PrestigeService {
  private static instance: PrestigeService | null = null;

  private constructor(private readonly db: DatabaseService) {}

  public static getInstance(): PrestigeService {
    if (!PrestigeService.instance) {
      PrestigeService.instance = new PrestigeService(DatabaseService.getInstance());
    }
    return PrestigeService.instance;
  }

  /** Explicit binding for tests and per-request instance switching. */
  public static forDatabase(db: DatabaseService): PrestigeService {
    return new PrestigeService(db);
  }

  public getFame(characterId: string): number {
    if (characterId === PLAYER_ID) {
      const row = this.db.queryOne<{ fame: number }>('SELECT fame FROM player_state WHERE player_id = ?;', [characterId]);
      return normalizeFame(row?.fame);
    }
    const row = this.db.queryOne<{ prestige: number }>(
      'SELECT prestige FROM npc_personal_progression WHERE npc_id = ?;',
      [characterId]
    );
    return normalizeFame(row?.prestige);
  }

  public getTier(characterId: string): FameTier {
    return getFameTier(this.getFame(characterId));
  }

  /**
   * Awards (positive) or removes (negative) fame. Positive gains use the
   * diminishing-return curve; losses are applied as given and floored at zero.
   */
  public change(characterId: string, input: PrestigeChangeInput): PrestigeChangeResult {
    const before = this.getFame(characterId);
    const raw = Number(input.rawGain) || 0;
    const applied = raw > 0 ? effectiveFameGain(raw, before) : raw;
    const after = normalizeFame(before + applied);
    const delta = after - before;
    const gameDate = input.gameDate || this.currentDate();

    this.db.transaction(() => {
      this.writeFame(characterId, after);
      this.writeEvent(characterId, before, after, delta, input.reason, input.sourceId, gameDate);
    });

    return { characterId, before, after, delta, tier: getFameTier(after) };
  }

  public award(characterId: string, input: PrestigeChangeInput): PrestigeChangeResult {
    return this.change(characterId, { ...input, rawGain: Math.abs(Number(input.rawGain) || 0) });
  }

  public penalize(characterId: string, input: PrestigeChangeInput): PrestigeChangeResult {
    return this.change(characterId, { ...input, rawGain: -Math.abs(Number(input.rawGain) || 0) });
  }

  public decayInactive(characterId: string, inactiveMonths: number, gameDate?: string): PrestigeChangeResult | null {
    const before = this.getFame(characterId);
    const after = applyFameDecay(before, inactiveMonths);
    if (after === before) return null;
    const when = gameDate || this.currentDate();
    this.db.transaction(() => {
      this.writeFame(characterId, after);
      this.writeEvent(characterId, before, after, after - before, 'INACTIVITY', undefined, when);
    });
    return { characterId, before, after, delta: after - before, tier: getFameTier(after) };
  }

  private writeFame(characterId: string, fame: number): void {
    if (characterId === PLAYER_ID) {
      this.db.execute('UPDATE player_state SET fame = ? WHERE player_id = ?;', [fame, characterId]);
      return;
    }
    const existing = this.db.queryOne<{ npc_id: string }>(
      'SELECT npc_id FROM npc_personal_progression WHERE npc_id = ?;',
      [characterId]
    );
    if (existing) {
      this.db.execute(
        'UPDATE npc_personal_progression SET prestige = ?, updated_at = CURRENT_TIMESTAMP WHERE npc_id = ?;',
        [fame, characterId]
      );
      return;
    }
    this.db.execute(
      `INSERT INTO npc_personal_progression (npc_id, prestige) VALUES (?, ?);`,
      [characterId, fame]
    );
  }

  private writeEvent(
    characterId: string,
    before: number,
    after: number,
    delta: number,
    reason: string,
    sourceId: string | undefined,
    gameDate: string
  ): void {
    // One append-only event per change; the id sequence is deterministic per date.
    const eventId = nextId(this.db, 'prestige_events', 'FAME', gameDate);
    this.db.execute(
      `INSERT INTO prestige_events (event_id, character_id, game_date, delta, before_fame, after_fame, reason, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [eventId, characterId, gameDate, delta, before, after, reason, sourceId || null]
    );
  }

  private currentDate(): string {
    const meta = this.db.queryOne<{ current_date: string }>(
      'SELECT "current_date" AS current_date FROM campaign_meta LIMIT 1;'
    );
    return meta?.current_date || '184-05-02';
  }
}
