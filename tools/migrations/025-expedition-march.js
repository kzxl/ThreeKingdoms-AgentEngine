/**
 * Migration 025: expedition march clocks.
 *
 * Expeditions used to be inserted as MARCHING and never advanced. Each row now
 * carries the route, total march days and remaining days so the day clock can
 * move it to ARRIVED.
 */

module.exports = {
  id: '025-expedition-march',
  description: 'Add route/march-day columns to military_expeditions',
  up(db) {
    const table = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'military_expeditions';`
    ).get();
    if (!table) {
      console.log('      military_expeditions absent; columns will be created on first use');
      return;
    }

    const columns = db.prepare('PRAGMA table_info(military_expeditions)').all().map(column => column.name);
    const additions = [
      ['route_id', 'TEXT'],
      ['march_days', 'INTEGER NOT NULL DEFAULT 5'],
      ['days_remaining', 'INTEGER NOT NULL DEFAULT 0'],
      ['arrival_date', 'TEXT']
    ];
    for (const [name, definition] of additions) {
      if (!columns.includes(name)) {
        db.exec(`ALTER TABLE military_expeditions ADD COLUMN ${name} ${definition};`);
        console.log(`      military_expeditions.${name} added`);
      }
    }

    db.exec(`
      UPDATE military_expeditions
      SET days_remaining = 0,
          arrival_date = COALESCE(arrival_date, game_date)
      WHERE status = 'MARCHING' AND (days_remaining IS NULL OR days_remaining < 0);
    `);
  }
};
