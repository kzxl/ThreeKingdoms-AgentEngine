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
import Database from 'better-sqlite3';
import {
  INSTANCE_PATHS,
  DEFAULT_ARCHETYPE_ID,
  ARCHETYPE_PRESETS,
  ArchetypePreset
} from './instances.constants';
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

    const instanceId = `inst_${Date.now()}`;
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
      db.pragma('foreign_keys = ON');

      const applyInitTransaction = db.transaction(() => {
        // Reset Campaign Meta to Turn 1
        db.prepare(`UPDATE campaign_meta SET active_turn = 1, current_date = '184-05-02';`).run();

        // Apply Archetype to Player State
        db.prepare(`
          UPDATE player_state SET
            name = ?,
            style_name = ?,
            age = ?,
            liquid_cash = ?,
            safe_cash = ?,
            fatigue = 0,
            health = 100,
            morale = 100,
            war_attr = ?,
            ldr_attr = ?,
            int_attr = ?,
            pol_attr = ?,
            dip_attr = ?,
            com_attr = ?,
            log_attr = ?,
            cra_attr = ?,
            cra_exp = 0,
            war_exp = 0,
            int_exp = 0,
            com_exp = 0,
            ldr_exp = 0,
            pol_exp = 0,
            current_location = 'LOC-0001'
          WHERE player_id = 'PLY-0001';
        `).run(
          playerName,
          playerStyle,
          preset.startingAge,
          preset.initialCash,
          preset.initialSafeCash,
          preset.attributes.war,
          preset.attributes.ldr,
          preset.attributes.int,
          preset.attributes.pol,
          preset.attributes.dip,
          preset.attributes.com,
          preset.attributes.log,
          preset.attributes.cra
        );

        // Reset dynamic modules for clean start
        db.prepare(`DELETE FROM character_equipment WHERE character_id = 'PLY-0001';`).run();
        try { db.prepare(`DELETE FROM family_lineage;`).run(); } catch (e) {}
        try { db.prepare(`DELETE FROM family_children;`).run(); } catch (e) {}
        try { db.prepare(`DELETE FROM trade_caravans;`).run(); } catch (e) {}
        try { db.prepare(`DELETE FROM session_duels;`).run(); } catch (e) {}
        try { db.prepare(`DELETE FROM chat_chronicle;`).run(); } catch (e) {}

        // If Commoner Youth, transfer business ownership away from protagonist
        if (preset.id === 'ARCH-COMMONER-YOUTH') {
          db.prepare(`UPDATE businesses SET owner_character_id = 'NPC-0007', safe_cash = 3000 WHERE business_id = 'BIZ-0001';`).run();
        } else {
          db.prepare(`UPDATE businesses SET owner_character_id = 'PLY-0001', safe_cash = ? WHERE business_id = 'BIZ-0001';`).run(preset.initialSafeCash);
        }

        // Initialize Cashflow Ledger and Double-Entry Journal
        try { db.prepare(`DELETE FROM account_journal;`).run(); } catch (e) {}
        db.prepare(`DELETE FROM cashflow_ledger;`).run();
        db.prepare(`
          INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
          VALUES ('TXN-INIT-001', '184-05-02', 'Bản Doanh Khởi Sự', 'CAPITAL_INJECTION', ?, 0, ?, ?, 'CLEARED');
        `).run(
          preset.initialCash,
          preset.initialCash,
          `Số vốn khởi nghiệp của thân phận ${preset.nameVi}.`
        );

        try {
          db.prepare(`
            INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
            VALUES ('TXN-INIT-001', '184-05-02', '1001_CASH_MOBILE', ?, 0, 'Vốn tiền mặt ban đầu'),
                   ('TXN-INIT-001', '184-05-02', '3001_OWNER_EQUITY', 0, ?, 'Vốn chủ sở hữu ban đầu');
          `).run(preset.initialCash, preset.initialCash);
        } catch (e) {}

        // First Chronicle Entry
        db.prepare(`
          INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, reasoning)
          VALUES ('chron_start', 1, '184-05-02', 'narrative', 'Sử Quan', 'Khởi Đầu Gian Nan', 'Sử', ?, 'Khởi tạo tân thủ');
        `).run(
          `${playerName} (${playerStyle}), xuất thân ${preset.nameVi}, đặt chân tới Trác Huyện bắt đầu hành trình lập nghiệp giữa thời tao loạn.`
        );
      });

      applyInitTransaction();
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

    const newInstanceId = `inst_${Date.now()}`;
    const newDbPath = path.join(INSTANCE_PATHS.INSTANCES_DIR, `${newInstanceId}.db`);

    fs.copyFileSync(sourceDbPath, newDbPath);

    if (dto.newLabel && dto.newLabel.trim()) {
      const db = new Database(newDbPath);
      try {
        db.prepare(`
          INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, reasoning)
          VALUES (?, 1, '184-05-02', 'narrative', 'Hệ Thống', 'Sao Lưu Phân Nhánh', 'Lưu', ?, 'Người chơi sao lưu save');
        `).run(
          `chron_fork_${Date.now()}`,
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
        SELECT active_turn, current_date
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
