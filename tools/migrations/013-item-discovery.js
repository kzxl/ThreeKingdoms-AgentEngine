/**
 * Migration 013: rare item discovery.
 *
 * `discovery_items` is the weighted table for exploration; `exploration_log`
 * records every roll (fame, chance, result, pity) so the outcome can be
 * audited and replayed.
 */

const DISCOVERY_ITEMS = [
  { itemCode: 'RAW-HERB-WILD', tier: 1, minFame: 0, weight: 40 },
  { itemCode: 'COM-HERB', tier: 1, minFame: 0, weight: 20 },
  { itemCode: 'COM-TEA', tier: 1, minFame: 0, weight: 15 },
  { itemCode: 'COM-SILK', tier: 2, minFame: 1000, weight: 12 },
  { itemCode: 'COM-SWORD', tier: 2, minFame: 1000, weight: 5 },
  { itemCode: 'WPN-SERPENT-SPEAR', tier: 3, minFame: 3000, weight: 3 },
  { itemCode: 'WPN-GREEN-DRAGON', tier: 3, minFame: 3000, weight: 1.5 },
  { itemCode: 'MOUNT-RED-HARE', tier: 4, minFame: 5000, weight: 1 },
  { itemCode: 'WEAP-HEAVEN-SWORD', tier: 4, minFame: 5000, weight: 0.4 },
  { itemCode: 'RELIC-HEIRLOOM-SEAL', tier: 4, minFame: 9000, weight: 0.1 }
];

module.exports = {
  id: '013-item-discovery',
  description: 'Add the weighted discovery table and exploration audit log',
  up(db) {
    const hasItems = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'")
      .get();
    if (!hasItems) {
      console.log('      (master_items absent — nothing to seed)');
      return;
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS discovery_items (
        item_code TEXT PRIMARY KEY,
        tier INTEGER NOT NULL,
        min_fame INTEGER NOT NULL DEFAULT 0,
        weight REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exploration_log (
        explore_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        location TEXT NOT NULL,
        poi_name TEXT,
        game_date TEXT NOT NULL,
        fame_at_roll INTEGER NOT NULL,
        chance REAL NOT NULL,
        roll REAL NOT NULL,
        success INTEGER NOT NULL,
        item_code TEXT,
        item_tier INTEGER,
        pity_triggered INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const insert = db.prepare(`
      INSERT INTO discovery_items (item_code, tier, min_fame, weight)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(item_code) DO UPDATE SET tier = excluded.tier, min_fame = excluded.min_fame, weight = excluded.weight;
    `);
    for (const item of DISCOVERY_ITEMS) {
      const exists = db.prepare('SELECT 1 FROM master_items WHERE item_code = ?').get(item.itemCode);
      if (exists) insert.run(item.itemCode, item.tier, item.minFame, item.weight);
    }
    console.log(`      discovery table ready (${DISCOVERY_ITEMS.length} weighted entries)`);
  }
};
