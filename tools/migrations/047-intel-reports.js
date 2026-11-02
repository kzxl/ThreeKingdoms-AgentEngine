/**
 * Migration 047: rumor and intel reports.
 *
 * The UI used to show exact local prices and garrisons. A report carries a
 * claim, a confidence and an expiry; verifying it costs days and reveals the
 * truth, which may contradict the claim. This is the information-scarcity leg
 * of the RPG layer.
 */

module.exports = {
  id: '047-intel-reports',
  description: 'Add rumor/intel reports with confidence and verification',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS intel_reports (
        report_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        subject_type TEXT NOT NULL CHECK (subject_type IN ('PRICE', 'TROOP')),
        subject_key TEXT NOT NULL,
        claim_json TEXT NOT NULL,
        actual_json TEXT,
        confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
        is_false INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'RUMOR',
        observed_date TEXT NOT NULL,
        expires_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'VERIFIED', 'DISCARDED')),
        verified_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_intel_reports_settlement
        ON intel_reports(settlement_id, status, expires_date);
    `);
  }
};
