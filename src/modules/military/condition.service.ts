/**
 * Persistent injuries and NPC death (src/modules/military/condition.service.ts).
 *
 * A duel or battle can leave a wound: severity 1–3, a stat penalty and a
 * recovery timer measured in days. The penalty is read by the duel profile, so
 * a wounded officer really fights worse until the month close recovers him.
 *
 * Death is permanent for NPC officers: `npc_state.is_alive = 0`, the business
 * assignment and faction officer row are cleared. The master catalog keeps the
 * historical record.
 */

import { DatabaseService } from '../../core/database';
import { nextSequentialId } from '../../shared/id-generator';
import { applyPlayerDamage } from './player-vitals';
import { resolveBusinessSuccession } from '../../shared/business-succession';

export type InjurySeverity = 1 | 2 | 3;

export interface ConditionView {
  conditionId: string;
  characterId: string;
  type: string;
  severity: number;
  statPenalty: number;
  source: string | null;
  gameDate: string;
  daysRemaining: number;
  narrativeVi: string;
  narrativeEn: string;
}

const SEVERITY_DAYS = { 1: 10, 2: 20, 3: 30 } as const;
const SEVERITY_PENALTY = { 1: 3, 2: 6, 3: 9 } as const;

export class ConditionService {
  public constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): ConditionService {
    return new ConditionService(db);
  }

  /**
   * Older test fixtures and pre-046 saves may reach combat before the migration
   * runs. The table is small and idempotent to create, so the service carries
   * the same DDL as migration 046.
   */
  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conditions (
        condition_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        condition_type TEXT NOT NULL DEFAULT 'INJURY',
        severity INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),
        stat_penalty INTEGER NOT NULL DEFAULT 0 CHECK (stat_penalty >= 0),
        source TEXT,
        game_date TEXT NOT NULL,
        days_remaining INTEGER NOT NULL DEFAULT 0 CHECK (days_remaining >= 0),
        narrative_vi TEXT,
        narrative_en TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_conditions_character_active
        ON conditions(character_id, is_active, days_remaining);
    `);
  }

  public currentDate(): string {
    return this.db.queryOne<{ d: string }>(
      'SELECT "current_date" AS d FROM campaign_meta LIMIT 1;'
    )?.d || '184-05-02';
  }

  /**
   * Records an injury and applies its immediate bodily cost. The stat penalty
   * is read later by `getCombatPenalty`; health/morale drop is immediate.
   */
  public applyInjury(
    characterId: string,
    severity: InjurySeverity = 1,
    source = 'COMBAT',
    gameDate?: string,
    reasonVi = '',
    reasonEn = ''
  ): ConditionView {
    this.ensureSchema();
    const level = (Math.max(1, Math.min(3, Math.round(severity))) as InjurySeverity);
    const date = gameDate || this.currentDate();
    const conditionId = nextSequentialId(this.db, 'conditions', 'CON', date);
    const days = SEVERITY_DAYS[level];
    const penalty = SEVERITY_PENALTY[level];
    const narrativeVi = reasonVi || `Vết thương mức ${level} từ ${source}, giảm ${penalty} điểm chiến lực trong ${days} ngày.`;
    const narrativeEn = reasonEn || `Severity ${level} wound from ${source}: -${penalty} combat power for ${days} days.`;

    this.db.execute(
      `INSERT INTO conditions
        (condition_id, character_id, condition_type, severity, stat_penalty, source,
         game_date, days_remaining, narrative_vi, narrative_en, is_active)
       VALUES (?, ?, 'INJURY', ?, ?, ?, ?, ?, ?, ?, 1);`,
      [conditionId, characterId, level, penalty, source, date, days, narrativeVi, narrativeEn]
    );

    if (characterId === 'PLY-0001') {
      applyPlayerDamage(this.db, characterId, {
        healthLoss: level * 8,
        reason: 'INJURY_DEATH'
      });
    } else {
      this.db.execute(
        'UPDATE npc_state SET morale = MAX(0, COALESCE(morale, 80) - ?) WHERE npc_id = ?;',
        [level * 10, characterId]
      );
    }

    return this.toView(this.db.queryOne<any>(
      'SELECT * FROM conditions WHERE condition_id = ?;',
      [conditionId]
    ));
  }

  /** Sum of active injury penalties, used by the duel profile. */
  public getCombatPenalty(characterId: string): number {
    try {
      const row = this.db.queryOne<{ penalty: number }>(
        `SELECT COALESCE(SUM(stat_penalty), 0) AS penalty FROM conditions
         WHERE character_id = ? AND is_active = 1 AND days_remaining > 0;`,
        [characterId]
      );
      return Number(row?.penalty || 0);
    } catch {
      return 0;
    }
  }

  public list(characterId: string): ConditionView[] {
    this.ensureSchema();
    return this.db.query<any>(
      `SELECT * FROM conditions
       WHERE character_id = ? AND is_active = 1
       ORDER BY severity DESC, days_remaining ASC;`,
      [characterId]
    ).map(row => this.toView(row));
  }

  /**
   * Month close recovery: one month removes 30 days from every active injury.
   * A wound lasting 10/20/30 days therefore heals at the first/second/third
   * close; a fresh serious wound still hurts for the month it was taken.
   */
  public recoverMonthly(_gameDate?: string): number {
    this.ensureSchema();
    return this.db.transaction(() => {
      const active = this.db.queryOne<{ c: number }>(
        'SELECT COUNT(*) AS c FROM conditions WHERE is_active = 1;'
      );
      this.db.execute(
        `UPDATE conditions
         SET days_remaining = MAX(0, days_remaining - 30),
             is_active = CASE WHEN days_remaining - 30 <= 0 THEN 0 ELSE 1 END
         WHERE is_active = 1;`
      );
      return Number(active?.c || 0);
    });
  }

  /**
   * Permanently kills an NPC officer: inactive state, no business, no faction
   * officer row. The master catalog is untouched.
   */
  public applyNpcDeath(npcId: string, source = 'COMBAT'): boolean {
    const npc = this.db.queryOne<{ npc_id: string }>(
      'SELECT npc_id FROM npc_state WHERE npc_id = ? LIMIT 1;',
      [npcId]
    );
    if (!npc) return false;
    this.db.transaction(() => {
      try {
        resolveBusinessSuccession(this.db, npcId, this.currentDate());
      } catch (error) {
        console.warn('[ConditionService] business succession failed:', (error as Error).message);
      }
      this.db.execute(
        `UPDATE npc_state
         SET is_alive = 0, assigned_business_id = NULL, assigned_role = 'DECEASED', monthly_wage = 0
         WHERE npc_id = ?;`,
        [npcId]
      );
      try {
        this.db.execute('DELETE FROM faction_officers WHERE officer_id = ?;', [npcId]);
      } catch {
        // Older schemas may not have faction_officers.
      }
      try {
        this.db.execute(
          `INSERT INTO npc_episodic_memories (memory_id, npc_id, game_date, memory_type, summary_vi, summary_en, emotional_weight)
           VALUES (?, ?, ?, 'DEATH', ?, ?, 10);`,
          [
            nextSequentialId(this.db, 'npc_episodic_memories', 'MEM-DEATH', this.currentDate()),
            npcId,
            this.currentDate(),
            `Tử trận trong ${source}.`,
            `Killed in ${source}.`
          ]
        );
      } catch {
        // Optional table; death still applies.
      }
    });
    return true;
  }

  private toView(row: any): ConditionView {
    return {
      conditionId: row.condition_id,
      characterId: row.character_id,
      type: row.condition_type,
      severity: Number(row.severity),
      statPenalty: Number(row.stat_penalty),
      source: row.source || null,
      gameDate: row.game_date,
      daysRemaining: Number(row.days_remaining),
      narrativeVi: row.narrative_vi || '',
      narrativeEn: row.narrative_en || ''
    };
  }
}
