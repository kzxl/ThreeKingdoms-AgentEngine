/**
 * Migration 073: regional endowments and essential consumption.
 *
 * Resource-rich settlements get lower prices for their surplus category, while
 * garrison/population demand raises the price of missing essentials. Monthly
 * consumption drains local stock and reduces public order when a shortage hits.
 */

module.exports = {
  id: '073-endowment-consumption',
  description: 'Add regional endowment, essential demand and consumption log',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settlement_item_endowment (
        settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        supply_score REAL NOT NULL DEFAULT 0,
        demand_score REAL NOT NULL DEFAULT 100,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (settlement_id, item_code)
      );

      CREATE TABLE IF NOT EXISTS settlement_consumption (
        settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        monthly_demand REAL NOT NULL CHECK (monthly_demand >= 0),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (settlement_id, item_code)
      );

      CREATE TABLE IF NOT EXISTS settlement_consumption_log (
        log_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        game_date TEXT NOT NULL,
        demand REAL NOT NULL,
        consumed REAL NOT NULL,
        shortage REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const hasSettlements = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='session_settlements'"
    ).get();
    const hasNodes = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='gathering_nodes'"
    ).get();
    if (!hasSettlements) return;

    const settlements = db.prepare(
      'SELECT settlement_id, garrison_troops, agriculture, public_order FROM session_settlements;'
    ).all();
    const nodeCounts = new Map();
    if (hasNodes) {
      for (const row of db.prepare(
        'SELECT settlement_id, resource_type, COUNT(*) AS c FROM gathering_nodes GROUP BY settlement_id, resource_type;'
      ).all()) {
        nodeCounts.set(`${row.settlement_id}:${row.resource_type}`, Number(row.c || 0));
      }
    }
    const countFor = (settlementId, type) => nodeCounts.get(`${settlementId}:${type}`) || 0;

    const ITEMS = [
      { code: 'COM-GRAIN', kind: 'GRAIN' },
      { code: 'COM-FISH-FRESH', kind: 'FISH' },
      { code: 'COM-GAME-MEAT', kind: 'GAME' },
      { code: 'COM-MEAT', kind: 'MEAT' },
      { code: 'COM-SALT', kind: 'SALT' },
      { code: 'RAW-TIMBER-OAK', kind: 'TIMBER' }
    ];
    const insertEndowment = db.prepare(`
      INSERT OR IGNORE INTO settlement_item_endowment
        (settlement_id, item_code, supply_score, demand_score)
      VALUES (?, ?, ?, ?);
    `);
    const insertConsumption = db.prepare(`
      INSERT OR IGNORE INTO settlement_consumption (settlement_id, item_code, monthly_demand)
      VALUES (?, ?, ?);
    `);

    for (const settlement of settlements) {
      const garrison = Number(settlement.garrison_troops || 0);
      const agriculture = Number(settlement.agriculture || 50);
      for (const item of ITEMS) {
        let supply = 0;
        let demand = 60 + garrison * 0.2;
        let monthly = 0;
        if (item.kind === 'GRAIN') {
          supply = agriculture * 1.5 + countFor(settlement.settlement_id, 'FARM') * 20;
          demand += 80 - agriculture * 0.5;
          monthly = Math.max(5, Math.round(garrison * 0.05 + 10 - agriculture * 0.05));
        } else if (item.kind === 'FISH') {
          supply = countFor(settlement.settlement_id, 'FISH') * 30;
          demand += 40;
          monthly = Math.max(2, Math.round(garrison * 0.01 + 4));
        } else if (item.kind === 'GAME') {
          supply = countFor(settlement.settlement_id, 'GAME') * 30;
          demand += 15;
          monthly = Math.max(1, Math.round(garrison * 0.005 + 2));
        } else if (item.kind === 'MEAT') {
          supply = countFor(settlement.settlement_id, 'GAME') * 15
            + countFor(settlement.settlement_id, 'FARM') * 5;
          demand += 25;
          monthly = Math.max(2, Math.round(garrison * 0.005 + 3));
        } else if (item.kind === 'SALT') {
          supply = countFor(settlement.settlement_id, 'SALT_WELL') * 30
            + countFor(settlement.settlement_id, 'FISH') * 2;
          demand += 15;
          monthly = Math.max(1, Math.round(garrison * 0.005 + 2));
        } else if (item.kind === 'TIMBER') {
          supply = countFor(settlement.settlement_id, 'TIMBER') * 30;
          demand += 10;
          monthly = 0;
        }
        insertEndowment.run(settlement.settlement_id, item.code, supply, Math.max(20, demand));
        if (monthly > 0) insertConsumption.run(settlement.settlement_id, item.code, monthly);
      }
    }

    console.log(`      ${settlements.length} settlements seeded with endowment and consumption`);
  }
};
