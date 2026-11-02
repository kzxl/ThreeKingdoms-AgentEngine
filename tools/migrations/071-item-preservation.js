/**
 * Migration 071: item-level preservation gates.
 *
 * Fresh fish can use the boat/fishing skill and fresh game the skinning skill
 * as an additional spoilage reduction; dried goods need no such cargo skill.
 */

module.exports = {
  id: '071-item-preservation',
  description: 'Bind fresh fish/game to their preservation skills',
  up(db) {
    const has = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'"
    ).get();
    if (!has) return;
    const columns = db.prepare('PRAGMA table_info(master_items);').all().map(row => row.name);
    if (!columns.includes('preserve_skill_code') || !columns.includes('preserve_min_tier')) return;

    db.exec(`
      UPDATE master_items
      SET preserve_skill_code = 'SKL-FISH-BOAT', preserve_min_tier = 1
      WHERE item_code IN ('COM-FISH-FRESH','COM-FISH-CARP','COM-FISH-SHRIMP','COM-FISH-STURGEON');

      UPDATE master_items
      SET preserve_skill_code = 'SKL-HUNT-SKIN', preserve_min_tier = 1
      WHERE item_code IN ('COM-GAME-MEAT','COM-GAME-VENISON','COM-MEAT');

      UPDATE master_items
      SET preserve_skill_code = NULL, preserve_min_tier = 0
      WHERE item_code IN ('FOOD-FISH-DRIED','FOOD-FISH-DRIED-FINE','FOOD-FISH-SAUCE','FOOD-GAME-JERKY','FOOD-VENISON-JERKY','RAW-HIDE-CURED');
    `);
  }
};
