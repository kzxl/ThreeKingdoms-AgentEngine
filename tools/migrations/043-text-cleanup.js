/**
 * Migration 043: repair corrupted text and legacy currency labels.
 *
 * Two data defects survived from older seed/distill passes:
 * - `player_skills.skill_name` was copied with a broken code page ("Gi�m d?nh"),
 *   while `master_skills` holds the clean Vietnamese name.
 * - two medicine items were seeded with the same broken code page.
 * - narrative rows still use numeric legacy currency labels; the canonical
 *   unit is Quan (VI) / quan (EN).
 *
 * The migration is idempotent and skips tables that a minimal/test database
 * does not have.
 */

const CLEAN_ITEMS = [
  {
    itemCode: 'MED-TRAUMA-SALVE',
    nameVi: 'Kim Sang Dược Cầm Máu',
    descriptionVi: 'Cao dán bào chế từ thảo dược rừng, đắp vào vết chém giúp cầm máu tức thì, giảm thương vong binh sĩ.'
  },
  {
    itemCode: 'MED-REVIVE-PILL',
    nameVi: 'Hồi Nguyên Hoàn (Đan Dược)',
    descriptionVi: 'Đan dược bí truyền luyện từ chu sa và thảo dược, uống vào hồi phục 30 điểm thể lực tức thì.'
  }
];

const TEXT_COLUMNS = [
  { table: 'session_events', pk: 'event_id', columns: ['choice_narrative', 'resolution_narrative'] },
  { table: 'master_events', pk: 'event_id', columns: ['summary_vi', 'historical_outcome_vi'] },
  { table: 'chat_chronicle', pk: 'id', columns: ['text'] },
  { table: 'turn_log', pk: 'turn_number', columns: ['turn_title', 'summary', 'dilemma_choice'] },
  { table: 'master_quests', pk: 'quest_id', columns: ['description_vi'] },
  { table: 'master_quest_steps', pk: 'step_id', columns: ['title_vi', 'success_vi', 'failure_vi'] }
];

const CURRENCY_VI = /(\d[\d.,]*)\s*tiền\b/gi;
const CURRENCY_EN = /(\d[\d.,]*)\s*qian\b/gi;

function hasTable(db, table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(table));
}

function hasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
}

function cleanCurrency(value) {
  return String(value)
    .replace(CURRENCY_VI, (_match, amount) => `${amount} Quan`)
    .replace(CURRENCY_EN, (_match, amount) => `${amount} quan`);
}

function fixNarratives(db) {
  let updated = 0;
  for (const definition of TEXT_COLUMNS) {
    if (!hasTable(db, definition.table)) continue;
    const available = definition.columns.filter(column => hasColumn(db, definition.table, column));
    if (available.length === 0 || !hasColumn(db, definition.table, definition.pk)) continue;

    const select = db.prepare(
      `SELECT ${definition.pk} AS pk, ${available.join(', ')} FROM ${definition.table};`
    );
    const update = db.prepare(
      `UPDATE ${definition.table} SET ${available.map(column => `${column} = ?`).join(', ')} WHERE ${definition.pk} = ?;`
    );
    for (const row of select.all()) {
      const next = available.map(column => (row[column] == null ? row[column] : cleanCurrency(row[column])));
      const changed = next.some((value, index) => value !== row[available[index]]);
      if (changed) {
        update.run(...next, row.pk);
        updated += 1;
      }
    }
  }
  return updated;
}

module.exports = {
  id: '043-text-cleanup',
  description: 'Repair mojibake skill/item names and replace numeric Tiền/Qian with Quan',
  up(db) {
    let skillRows = 0;
    if (hasTable(db, 'player_skills') && hasTable(db, 'master_skills')) {
      skillRows = db.prepare(`
        UPDATE player_skills
        SET skill_name = (
          SELECT skill_name_vi FROM master_skills
          WHERE master_skills.skill_code = player_skills.skill_code
        )
        WHERE EXISTS (
          SELECT 1 FROM master_skills
          WHERE master_skills.skill_code = player_skills.skill_code
        );
      `).run().changes;
    }

    let itemRows = 0;
    if (hasTable(db, 'master_items')) {
      const updateItem = db.prepare(
        'UPDATE master_items SET name_vi = ?, description_vi = ? WHERE item_code = ?;'
      );
      for (const item of CLEAN_ITEMS) {
        itemRows += updateItem.run(item.nameVi, item.descriptionVi, item.itemCode).changes;
      }
    }

    const narrativeRows = fixNarratives(db);
    console.log(`      skills resynced: ${skillRows}; items repaired: ${itemRows}; narratives relabelled: ${narrativeRows}`);
  }
};
