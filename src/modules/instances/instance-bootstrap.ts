/**
 * Clean-session bootstrap for a new playthrough instance.
 *
 * `createInstance` used to clone the live session and reset only a handful of
 * tables, so a new game inherited the previous campaign's turn history,
 * warehouse, NPC progression, tasks and businesses (and failed the clock
 * audit immediately). This module performs a full session reset: every
 * history/runtime table is cleared, the player/business/NPC/inventory/ledger/
 * turn-log/chronicle seed is recreated, and foreign keys are verified before
 * the connection is released.
 *
 * Master data (`master_*`), world baseline tables (settlements, factions,
 * bandit strongholds, ecological crises, encounter rates, gathering nodes) and
 * `schema_migrations` are preserved.
 */

import Database from 'better-sqlite3';
import { ArchetypePreset } from './instances.constants';
import { postCashflowEntryRaw } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';

export interface InstanceBootstrapOptions {
  preset: ArchetypePreset;
  playerName: string;
  playerStyle: string;
}

const HISTORY_TABLES = [
  'campaign_meta',
  'player_state',
  'player_skills',
  'cashflow_ledger',
  'account_journal',
  'inventory_items',
  'stock_movements',
  'businesses',
  'npc_skills',
  'npc_personal_progression',
  'prestige_events',
  'exploration_log',
  'fame_arrivals',
  'retainer_departures',
  'settlement_market_state',
  'battle_duels',
  'npc_relationship_deltas',
  'npc_journey_logs',
  'npc_episodic_memories',
  'npc_career_shifts',
  'npc_peer_relations',
  'npc_intel_fog',
  'character_equipment',
  'character_professions',
  'family_lineage',
  'family_children',
  'family_genealogy_tree',
  'family_ancestors_archive',
  'family_mentorship_logs',
  'family_spouses',
  'trade_caravans',
  'session_duels',
  'session_events',
  'military_expeditions',
  'active_tasks',
  'turn_log',
  'action_log',
  'chat_chronicle',
  'financial_loans',
  'merchant_promissory_notes',
  'emergent_innovations',
  'faction_political_events',
  'world_turn_ledger'
];

const START_DATE = '184-05-02';

function tableExists(db: Database.Database, name: string): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name)
  );
}

function columnExists(db: Database.Database, table: string, column: string): boolean {
  if (!tableExists(db, table)) return false;
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c: any) => c.name === column);
}

/**
 * Rewrites the session layer of `db` into a clean new-game state.
 * The caller must disable foreign keys for the duration and re-enable them
 * afterwards (see `createInstance`).
 */
export function initializeInstanceDatabase(
  db: Database.Database,
  options: InstanceBootstrapOptions
): void {
  const { preset, playerName, playerStyle } = options;
  const isCommoner = preset.id === 'ARCH-COMMONER-YOUTH';
  const totalCash = Number(preset.initialCash) + Number(preset.initialSafeCash);

  const reset = db.transaction(() => {
    // 1. Clear every history/runtime table. Missing tables are skipped so the
    //    bootstrap also works on older template databases.
    for (const table of HISTORY_TABLES) {
      // arch-guard:allow-sql-interpolation — table names are the fixed
      // HISTORY_TABLES allowlist, never user input.
      if (tableExists(db, table)) db.prepare(`DELETE FROM ${table}`).run();
    }
    if (columnExists(db, 'npc_state', 'npc_id')) {
      // Older/newer schemas differ in optional exp columns; reset only those
      // that exist so the bootstrap works on any session schema.
      const resetColumns = [
        'loyalty = 80',
        'morale = 100',
        'fatigue = 0',
        'assigned_business_id = NULL',
        "assigned_role = 'UNASSIGNED'",
        'monthly_wage = 0'
      ];
      for (const column of ['management_exp', 'craft_exp', 'int_exp', 'war_exp', 'ldr_exp', 'pol_exp', 'dip_exp', 'com_exp', 'log_exp', 'cra_exp']) {
        if (columnExists(db, 'npc_state', column)) resetColumns.push(`${column} = 0`);
      }
      // arch-guard:allow-sql-interpolation — resetColumns is a fixed allowlist.
      db.prepare(`UPDATE npc_state SET ${resetColumns.join(', ')}`).run();
    }

    // 2. Campaign clock and player state.
    db.prepare(`
      INSERT INTO campaign_meta
        (campaign_id, campaign_name, start_date, "current_date", active_turn, rules_version, random_seed)
      VALUES (?, ?, ?, ?, 1, '1.1.0', 1840201)
    `).run(`CMP-${START_DATE.replace(/-/g, '')}-INSTANCE`, preset.nameEn, START_DATE, START_DATE);

    db.prepare(`
      INSERT INTO player_state (
        player_id, name, style_name, age, current_location, permanent_base,
        int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr,
        liquid_cash, safe_cash, strategic_grain, fixed_capital, special_licenses,
        health, fatigue, morale
      ) VALUES (
        'PLY-0001', ?, ?, ?, 'LOC-0001', 'LOC-0001',
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 0, '[]',
        100, 0, 100
      )
    `).run(
      playerName,
      playerStyle,
      preset.startingAge,
      preset.attributes.int,
      preset.attributes.pol,
      preset.attributes.war,
      preset.attributes.ldr,
      preset.attributes.dip,
      preset.attributes.com,
      preset.attributes.log,
      preset.attributes.cra,
      preset.initialCash,
      preset.initialSafeCash,
      isCommoner ? 1.0 : 5.0
    );

    // 3. Starting warehouse.
    const startingStock = isCommoner
      ? [
          ['COM-BAMBOO', 'RAW_MATERIAL', 'Tre Trúc U Châu (Tự hái)', 5, 10, 'Zhuo County'],
          ['COM-GRAIN', 'FOOD_STUFF', 'Lương Thảo Mưu Sinh Ban Đầu', 1.0, 100, 'Zhuo County']
        ]
      : [
          ['COM-BAMBOO', 'RAW_MATERIAL', 'Tre Trúc U Châu (Nguyên liệu đan dệt)', 25, 12, 'Zhuo Workshop'],
          ['COM-LEATH', 'RAW_MATERIAL', 'Da Thuộc Gia Súc Trác Huyện', 8, 80, 'Zhuo Workshop'],
          ['COM-GRAIN', 'FOOD_STUFF', 'Lương Thảo Dự Trữ Xưởng Lương Thị', 5.0, 100, 'Zhuo Workshop'],
          ['PROD-MAT', 'FINISHED_GOOD', 'Chiếu Trúc Lương Gia Thành phẩm', 12, 14, 'Zhuo Workshop']
        ];
    const insertStock = db.prepare(`
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const row of startingStock) insertStock.run(...row);

    // 4. Starting workshop and NPC assignments. A commoner does not own it
    //    (the foreman does), matching the zero-to-hero archetype.
    const owner = isCommoner ? 'NPC-0007' : 'PLY-0001';
    const businessSafe = isCommoner ? 3000 : Number(preset.initialSafeCash);
    const businessColumns = [
      'business_id', 'name', 'location_id', 'manager_npc_id',
      ...(columnExists(db, 'businesses', 'owner_character_id') ? ['owner_character_id'] : []),
      'safe_cash', 'delegation_level', 'efficiency_multiplier', 'current_workforce',
      'monthly_capacity_hours', 'monthly_rent', 'auto_procure', 'status'
    ];
    const businessValues: unknown[] = [
      'BIZ-0001', 'Lương Thị Chức Tác Phường', 'LOC-0001', 'NPC-0007',
      ...(businessColumns.includes('owner_character_id') ? [owner] : []),
      businessSafe, 2, 0.85, 4, 800, 200, 1, 'ACTIVE'
    ];
    // arch-guard:allow-sql-interpolation — businessColumns is a fixed allowlist.
    db.prepare(
      `INSERT INTO businesses (${businessColumns.join(', ')}) VALUES (${businessColumns.map(() => '?').join(', ')})`
    ).run(...businessValues);
    if (tableExists(db, 'npc_state')) {
      const foreground = isCommoner
        ? { loyalty: 65, business: null, role: 'CRAFTSMAN', wage: 0 }
        : { loyalty: 85, business: 'BIZ-0001', role: 'FOREMAN', wage: 750 };
      const carpenter = isCommoner
        ? { loyalty: 65, business: null, role: 'CARPENTER', wage: 0 }
        : { loyalty: 80, business: 'BIZ-0001', role: 'CARPENTER', wage: 600 };
      const insertNpc = db.prepare(`
        INSERT OR IGNORE INTO npc_state (
          npc_id, name, loyalty, morale, fatigue,
          int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr,
          personality, motivation, assigned_business_id, assigned_role, monthly_wage
        ) VALUES (?, ?, ?, 100, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertNpc.run(
        'NPC-0007', 'Trần Bảo (Thợ Cả)', foreground.loyalty,
        58, 52, 45, 60, 55, 62, 65, 75,
        'PRAGMATIC', 'LOYALTY', foreground.business, foreground.role, foreground.wage
      );
      insertNpc.run(
        'NPC-0008', 'Triệu An (Thợ Mộc)', carpenter.loyalty,
        50, 45, 42, 50, 48, 55, 60, 70,
        'DILIGENT', 'SECURITY', carpenter.business, carpenter.role, carpenter.wage
      );
      db.prepare(`
        UPDATE npc_state SET assigned_business_id = ?, assigned_role = ?, monthly_wage = ?
        WHERE npc_id = 'NPC-0007'
      `).run(foreground.business, foreground.role, foreground.wage);
      db.prepare(`
        UPDATE npc_state SET assigned_business_id = ?, assigned_role = ?, monthly_wage = ?
        WHERE npc_id = 'NPC-0008'
      `).run(carpenter.business, carpenter.role, carpenter.wage);
    }

    // 5. Opening ledger: one balanced transaction for liquid + safe capital.
    const txnId = 'TXN-INIT-001';
    postCashflowEntryRaw(db, {
      txnId,
      gameDate: START_DATE,
      counterparty: 'Bản Doanh Khởi Sự',
      category: 'CAPITAL_INJECTION',
      inflow: totalCash,
      balance: totalCash,
      memo: `Số vốn khởi nghiệp của thân phận ${preset.nameVi}.`,
      status: 'Confirmed'
    });

    const insertJournal = db.prepare(`
      INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const campaignId = `CMP-${START_DATE.replace(/-/g, '')}-INSTANCE`;
    insertJournal.run(txnId, campaignId, START_DATE, ACCOUNT_CODES.cashMobile, preset.initialCash, 0, 'Vốn tiền mặt ban đầu');
    if (Number(preset.initialSafeCash) > 0) {
      insertJournal.run(txnId, campaignId, START_DATE, ACCOUNT_CODES.cashSafe, preset.initialSafeCash, 0, 'Vốn két sản nghiệp ban đầu');
    }
    insertJournal.run(txnId, campaignId, START_DATE, ACCOUNT_CODES.ownerEquity, 0, totalCash, 'Vốn chủ sở hữu ban đầu');

    // 6. First turn and chronicle entry.
    db.prepare(`
      INSERT INTO turn_log (turn_number, game_date, turn_title, location, summary, dilemma_choice)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(
      START_DATE,
      isCommoner ? 'Bố Y Khởi Thủy Tại Huyện Trác' : 'Khởi Sự Nghiệp Lớn Tại Huyện Trác',
      isCommoner ? 'Huyện Trác' : 'Trang Viên Vườn Đào',
      `${playerName} (${playerStyle}), xuất thân ${preset.nameVi}, đặt chân tới Trác Huyện bắt đầu hành trình lập nghiệp.`,
      isCommoner ? 'Đi làm thuê tích lũy vốn và năng lực' : 'Sản xuất thủ công kết hợp quân nhu bảo vệ quê hương'
    );

    db.prepare(`
      INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, reasoning)
      VALUES ('chron_start', 1, ?, 'narrative', 'Sử Quan', 'Khởi Đầu Gian Nan', 'Sử', ?, 'Khởi tạo tân thủ')
    `).run(
      START_DATE,
      `${playerName} (${playerStyle}), xuất thân ${preset.nameVi}, đặt chân tới Trác Huyện bắt đầu hành trình lập nghiệp giữa thời tao loạn.`
    );
  });

  reset();
}
