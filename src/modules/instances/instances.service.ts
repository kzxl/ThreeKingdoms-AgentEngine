/**
 * ThreeKingdoms-AgentEngine: Instance Management Service
 * (src/modules/instances/instances.service.ts)
 *
 * Implements:
 * - Multi-Instance Isolated SQLite Playthroughs
 * - Fast zero-regression cloning from canonical template
 * - Metadata sweep for saved game slots
 * - Safe instance deletion and branching / forking
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  INSTANCE_PATHS,
  DEFAULT_ARCHETYPE_ID,
  ARCHETYPE_PRESETS,
  ArchetypePreset
} from './instances.constants';
import { initializeInstanceDatabase } from './instance-bootstrap';
import {
  InstanceSummaryDTO,
  CreateInstanceDTO,
  CloneInstanceDTO
} from './instances.dto';

export class InstanceManagerService {
  private static instance: InstanceManagerService | null = null;

  private constructor() {
    this.ensureDirectories();
  }

  public static getInstance(): InstanceManagerService {
    if (!InstanceManagerService.instance) {
      InstanceManagerService.instance = new InstanceManagerService();
    }
    return InstanceManagerService.instance;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(INSTANCE_PATHS.SAVES_DIR)) {
      fs.mkdirSync(INSTANCE_PATHS.SAVES_DIR, { recursive: true });
    }
    if (!fs.existsSync(INSTANCE_PATHS.INSTANCES_DIR)) {
      fs.mkdirSync(INSTANCE_PATHS.INSTANCES_DIR, { recursive: true });
    }
  }

  /**
   * Resolves the absolute database path for an instance ID.
   */
  public resolveDbPath(instanceId?: string): string {
    this.ensureDirectories();
    if (!instanceId || instanceId === 'default' || instanceId === 'session') {
      return path.join(INSTANCE_PATHS.SAVES_DIR, INSTANCE_PATHS.DEFAULT_SESSION_FILE);
    }

    const cleanId = instanceId.replace(/[^a-zA-Z0-9_-]/g, '');
    const instanceFilePath = path.join(INSTANCE_PATHS.INSTANCES_DIR, `${cleanId}.db`);
    if (fs.existsSync(instanceFilePath)) {
      return instanceFilePath;
    }

    // Fallback to default session
    return path.join(INSTANCE_PATHS.SAVES_DIR, INSTANCE_PATHS.DEFAULT_SESSION_FILE);
  }

  /**
   * Scans and lists all available save instances.
   */
  public listInstances(activeInstanceId: string = 'default'): InstanceSummaryDTO[] {
    this.ensureDirectories();
    const result: InstanceSummaryDTO[] = [];

    // 1. Default Session
    const defaultPath = path.join(INSTANCE_PATHS.SAVES_DIR, INSTANCE_PATHS.DEFAULT_SESSION_FILE);
    if (fs.existsSync(defaultPath)) {
      const defaultMeta = this.extractInstanceMetadata('default', defaultPath);
      if (defaultMeta) {
        defaultMeta.isCurrent = (activeInstanceId === 'default' || !activeInstanceId);
        result.push(defaultMeta);
      }
    }

    // 2. Instances in saves/instances/
    try {
      const files = fs.readdirSync(INSTANCE_PATHS.INSTANCES_DIR);
      for (const file of files) {
        if (!file.endsWith('.db') || file.includes('-wal') || file.includes('-shm')) continue;
        const instId = file.replace(/\.db$/, '');
        const instPath = path.join(INSTANCE_PATHS.INSTANCES_DIR, file);
        const meta = this.extractInstanceMetadata(instId, instPath);
        if (meta) {
          meta.isCurrent = (activeInstanceId === instId);
          result.push(meta);
        }
      }
    } catch (e: any) {
      console.warn('[InstanceManagerService] Error reading instances dir:', e.message);
    }

    // Sort: current first, then by updatedAt descending
    return result.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  /**
   * Retrieves summary for a specific instance ID.
   */
  public getInstance(instanceId: string): InstanceSummaryDTO | null {
    const dbPath = this.resolveDbPath(instanceId);
    if (!fs.existsSync(dbPath)) return null;
    return this.extractInstanceMetadata(instanceId, dbPath);
  }

  /**
   * Creates a new isolated playthrough instance from template with chosen archetype.
   */
  public createInstance(dto: CreateInstanceDTO): InstanceSummaryDTO {
    this.ensureDirectories();
    const templatePath = path.join(INSTANCE_PATHS.SAVES_DIR, INSTANCE_PATHS.TEMPLATE_FILE);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template database not found at: ${templatePath}`);
    }

    const instanceId = `inst_${randomUUID()}`;
    const newDbPath = path.join(INSTANCE_PATHS.INSTANCES_DIR, `${instanceId}.db`);

    // 1. Physical file clone
    fs.copyFileSync(templatePath, newDbPath);

    // 2. Initialize and configure archetype
    const archetypeId = dto.archetypeId || DEFAULT_ARCHETYPE_ID;
    const preset: ArchetypePreset = ARCHETYPE_PRESETS[archetypeId] || ARCHETYPE_PRESETS[DEFAULT_ARCHETYPE_ID];

    const playerName = (dto.name || '').trim() || preset.defaultName;
    const playerStyle = (dto.styleName || '').trim() || preset.defaultStyleName;

    const db = new Database(newDbPath);
    try {
      db.pragma('journal_mode = WAL');
      // The reset deletes tables in bulk; disable FK enforcement for the
      // transaction, then verify the final graph explicitly.
      db.pragma('foreign_keys = OFF');

      initializeInstanceDatabase(db, { preset, playerName, playerStyle });

      db.pragma('foreign_keys = ON');
      const violations = db.prepare('PRAGMA foreign_key_check').all();
      if (violations.length > 0) {
        throw new Error(`Instance bootstrap left ${violations.length} foreign-key violation(s).`);
      }
      db.pragma('wal_checkpoint(TRUNCATE)');
    } finally {
      db.close();
    }

    const meta = this.extractInstanceMetadata(instanceId, newDbPath);
    if (!meta) {
      throw new Error(`Failed to extract metadata after creating instance: ${instanceId}`);
    }
    return meta;
  }

  /**
   * Forks/Clones an existing instance into a new save slot.
   */
  public cloneInstance(dto: CloneInstanceDTO): InstanceSummaryDTO {
    this.ensureDirectories();
    const sourceDbPath = this.resolveDbPath(dto.sourceId);
    if (!fs.existsSync(sourceDbPath)) {
      throw new Error(`Source instance not found: ${dto.sourceId}`);
    }

    const newInstanceId = `inst_${randomUUID()}`;
    const newDbPath = path.join(INSTANCE_PATHS.INSTANCES_DIR, `${newInstanceId}.db`);

    fs.copyFileSync(sourceDbPath, newDbPath);

    if (dto.newLabel && dto.newLabel.trim()) {
      const db = new Database(newDbPath);
      try {
        db.prepare(`
          INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, reasoning)
          VALUES (?, 1, '184-05-02', 'narrative', 'Hệ Thống', 'Sao Lưu Phân Nhánh', 'Lưu', ?, 'Người chơi sao lưu save');
        `).run(
          `chron_fork_${randomUUID()}`,
          `Nhánh chiến cục được sao lưu với ghi chú: [${dto.newLabel.trim()}].`
        );
      } finally {
        db.close();
      }
    }

    const meta = this.extractInstanceMetadata(newInstanceId, newDbPath);
    if (!meta) {
      throw new Error(`Failed to extract metadata after cloning instance: ${newInstanceId}`);
    }
    return meta;
  }

  /**
   * Deletes an instance file safely. Protects default session from accidental deletion.
   */
  public deleteInstance(instanceId: string): boolean {
    if (instanceId === 'default' || instanceId === 'session') {
      throw new Error('Không thể xóa phiên chơi mặc định của hệ thống.');
    }

    const cleanId = instanceId.replace(/[^a-zA-Z0-9_-]/g, '');
    const dbPath = path.join(INSTANCE_PATHS.INSTANCES_DIR, `${cleanId}.db`);
    const walPath = path.join(INSTANCE_PATHS.INSTANCES_DIR, `${cleanId}.db-wal`);
    const shmPath = path.join(INSTANCE_PATHS.INSTANCES_DIR, `${cleanId}.db-shm`);

    let deleted = false;
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      deleted = true;
    }
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch (e) {}
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch (e) {}
    }
    return deleted;
  }

  /**
   * Internal helper to extract fast metadata from a SQLite database file.
   */
  private extractInstanceMetadata(id: string, filePath: string): InstanceSummaryDTO | null {
    if (!fs.existsSync(filePath)) return null;

    let db: Database.Database | null = null;
    try {
      const stats = fs.statSync(filePath);
      db = new Database(filePath, { readonly: true });

      const playerRow = db.prepare(`
        SELECT name, style_name, age, liquid_cash, safe_cash, current_location, war_attr, com_attr, cra_attr
        FROM player_state
        WHERE player_id = 'PLY-0001'
        LIMIT 1;
      `).get() as any;

      const metaRow = db.prepare(`
        SELECT active_turn, "current_date"
        FROM campaign_meta
        LIMIT 1;
      `).get() as any;

      const pName = playerRow?.name || 'Lương Diễn';
      const pStyle = playerRow?.style_name || 'Chí Viễn';
      const pAge = Number(playerRow?.age || 21);
      const liquidCash = Number(playerRow?.liquid_cash || 0);
      const safeCash = Number(playerRow?.safe_cash || 0);
      const turnNum = Number(metaRow?.active_turn || 1);
      const gameDate = metaRow?.current_date || '184-05-02';
      const location = playerRow?.current_location || 'Trác Huyện';

      // Infer archetype
      let archId = 'ARCH-SCHOLAR-ARTISAN';
      let archNameVi = 'Sĩ Tộc Thương Khách';
      if (liquidCash <= 200 && pAge <= 19) {
        archId = 'ARCH-COMMONER-YOUTH';
        archNameVi = 'Thanh Niên Bố Y (Hai Bàn Tay Trắng)';
      } else if (Number(playerRow?.war_attr || 0) >= 75) {
        archId = 'ARCH-FRONTIER-OFFICER';
        archNameVi = 'Đô Úy Tiền Đồn';
      } else if (liquidCash >= 20000 || Number(playerRow?.com_attr || 0) >= 80) {
        archId = 'ARCH-SILK-CARAVAN';
        archNameVi = 'Thương Đoàn Tổng Quản';
      }

      return {
        id,
        filename: path.basename(filePath),
        filepath: filePath,
        name: pName,
        styleName: pStyle,
        archetypeId: archId,
        archetypeNameVi: archNameVi,
        age: pAge,
        turnNumber: turnNum,
        gameDate,
        location,
        liquidCash,
        safeCash,
        netWorth: liquidCash + safeCash,
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
        isDefault: id === 'default'
      };
    } catch (err: any) {
      console.warn(`[InstanceManagerService] Failed to inspect ${filePath}:`, err.message);
      return null;
    } finally {
      if (db) {
        try { db.close(); } catch (e) {}
      }
    }
  }
}
