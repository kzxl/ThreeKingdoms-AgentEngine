/**
 * Migration 038: player talents as structured effects.
 *
 * `master_talents` carried only prose. The archetype's innate talents are now
 * stored per campaign (`player_talents`) and mapped to one structured effect by
 * category, so they join the same resolver as skills and perks.
 */

const CATEGORY_EFFECT = {
  MARTIAL: ['DUEL_POWER', 2],
  GOVERNANCE: ['MORALE_BONUS', 2],
  STRATEGY: ['SIEGE_POWER', 2],
  COMMERCE: ['TRADE_MARGIN', 0.03],
  LEADERSHIP: ['MORALE_BONUS', 2]
};

module.exports = {
  id: '038-player-talents',
  description: 'Add player talents and structured talent effects',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_talents (
        talent_code TEXT PRIMARY KEY,
        chosen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS master_talent_effects (
        talent_code TEXT NOT NULL,
        effect_type TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (talent_code, effect_type)
      );
    `);

    const hasTalents = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_talents';`
    ).get();
    if (!hasTalents) {
      console.log('      master_talents absent; effects left empty');
      return;
    }

    const insert = db.prepare(`
      INSERT OR REPLACE INTO master_talent_effects (talent_code, effect_type, value)
      VALUES (?, ?, ?);
    `);
    const talents = db.prepare('SELECT talent_code, category FROM master_talents;').all();
    for (const talent of talents) {
      const [type, value] = CATEGORY_EFFECT[talent.category] || ['CHECK_BONUS', 1];
      insert.run(talent.talent_code, type, value);
    }
    console.log(`      talent effects seeded for ${talents.length} talents`);
  }
};
