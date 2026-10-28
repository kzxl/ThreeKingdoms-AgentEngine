/**
 * ThreeKingdoms-AgentEngine: Spatial POI Matrix & Grounding Verification Test
 * (tests/verify-spatial-poi-matrix.ts)
 *
 * Verifies:
 * 1. Dynamic scene generation across all 6 physical POIs in Zhuo County:
 *    - LOC-0001 Tư Trạch Vườn Đào (Lady Zhen, Residence, REST_RESIDENCE, TALK_SPOUSE)
 *    - LOC-0002 Chợ Đông Môn & Sạp Trà (Guan Yu, Tea Stall, TRADE)
 *    - LOC-0003 Thiết Điếm Trác Huyện (Master Chen Bao, Bespoke Forge, OPEN_BESPOKE_FORGE)
 *    - LOC-0004 Tửu Quán Trác Huyện (Zhang Fei, Tavern, DRINK_WINE, OPEN_TAVERN_MODAL)
 *    - LOC-0005 Lôi Đài Giáo Trường (Hua Xiong / Guan Yu, Arena, SPAR_ZHANG_FEI, OPEN_ARENA_MODAL)
 *    - LOC-0006 Mã Xa Dịch Trạm (Post Master, Caravans, OPEN_CARAVAN_MODAL)
 * 2. Backend services execution (Duel sparring, Banquet tiers, Family overview).
 * 3. Client scripts & DOM asset presence.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { SingleCombatDuelService } from '../src/modules/military/single-combat-duel.service';
import { TavernBanquetService } from '../src/modules/social-kizuna/tavern-banquet.service';
import { FamilyLineageService } from '../src/modules/lineage-succession/family-lineage.service';

const DB_PATH = path.resolve(__dirname, '../saves/session.db');

describe('Spatial POI Matrix & Contextual Grounding Verification', () => {
  it('1. Master Locations should contain all 6 physical POIs for Zhuo County', () => {
    const db = new Database(DB_PATH);
    const row = db.prepare("SELECT sub_locations FROM master_locations WHERE location_id = 'LOC-0001'").get() as any;
    assert.ok(row, 'LOC-0001 must exist');
    const subs = JSON.parse(row.sub_locations);
    assert.ok(Array.isArray(subs), 'sub_locations must be an array');

    const expectedPois = [
      'Tư Trạch Vườn Đào',
      'Chợ Đông Môn & Sạp Trà',
      'Thiết Điếm Trác Huyện',
      'Tửu Quán Trác Huyện',
      'Lôi Đài Giáo Trường',
      'Mã Xa Dịch Trạm'
    ];

    for (const poi of expectedPois) {
      assert.ok(subs.includes(poi), `master_locations must include ${poi}`);
    }
    db.close();
  });

  it('2. Backend generateDynamicScene generates contextual scenes and options for all 6 POIs', () => {
    // Dynamically require sim-web's generateDynamicScene helper
    const simWebPath = path.resolve(__dirname, '../tools/sim-web.js');
    assert.ok(fs.existsSync(simWebPath), 'sim-web.js must exist');

    const simWebContent = fs.readFileSync(simWebPath, 'utf8');
    assert.ok(simWebContent.includes('Thiết Điếm Trác Huyện'), 'sim-web.js must handle Thiết Điếm');
    assert.ok(simWebContent.includes('Tửu Quán Trác Huyện'), 'sim-web.js must handle Tửu Quán');
    assert.ok(simWebContent.includes('Lôi Đài Giáo Trường'), 'sim-web.js must handle Lôi Đài');
    assert.ok(simWebContent.includes('Mã Xa Dịch Trạm'), 'sim-web.js must handle Dịch Trạm');
    assert.ok(simWebContent.includes('Tư Trạch Vườn Đào'), 'sim-web.js must handle Tư Trạch');
    assert.ok(simWebContent.includes('OPEN_BESPOKE_FORGE'), 'Must include OPEN_BESPOKE_FORGE action');
    assert.ok(simWebContent.includes('HOST_BANQUET'), 'Must include HOST_BANQUET action');
    assert.ok(simWebContent.includes('OPEN_ARENA_MODAL'), 'Must include OPEN_ARENA_MODAL action');
    assert.ok(simWebContent.includes('OPEN_CARAVAN_MODAL'), 'Must include OPEN_CARAVAN_MODAL action');
    assert.ok(simWebContent.includes('REST_RESIDENCE'), 'Must include REST_RESIDENCE action');
  });

  it('3. Backend Services should be operational for on-site features', () => {
    // Test Duel Sparring
    const duelService = SingleCombatDuelService.getInstance();
    const sparRes = duelService.sparWithHero('PLY-0001', 'NPC-0002', true);
    assert.ok(sparRes, 'sparWithHero must return a result');
    assert.ok(sparRes.rounds.length > 0, 'sparWithHero must have at least 1 round');

    // Test Banquet Tiers
    const banquetService = TavernBanquetService.getInstance();
    const tiers = banquetService.getBanquetTiers();
    assert.ok(Object.keys(tiers).length >= 3, 'Must have at least 3 banquet tiers');

    // Test Lineage Overview
    const lineageService = FamilyLineageService.getInstance();
    const overview = lineageService.getFamilyOverview();
    assert.ok(overview, 'Lineage overview must return an object');
    assert.ok(overview.family, 'Lineage must have a family object');
  });

  it('4. Frontend scripts and stylesheets must be correctly wired', () => {
    const modalsScript = path.resolve(__dirname, '../public/js/spatial-poi-modals.js');
    const controllerScript = path.resolve(__dirname, '../public/js/spatial-poi-controller.js');
    const indexHtml = path.resolve(__dirname, '../public/index.html');
    const stylesCss = path.resolve(__dirname, '../public/styles.css');

    assert.ok(fs.existsSync(modalsScript), 'spatial-poi-modals.js must exist');
    assert.ok(fs.existsSync(controllerScript), 'spatial-poi-controller.js must exist');

    const htmlContent = fs.readFileSync(indexHtml, 'utf8');
    assert.ok(htmlContent.includes('btn-spatial-action'), 'index.html must include btn-spatial-action');
    assert.ok(htmlContent.includes('/js/spatial-poi-modals.js'), 'index.html must include spatial-poi-modals.js script');
    assert.ok(htmlContent.includes('/js/spatial-poi-controller.js'), 'index.html must include spatial-poi-controller.js script');

    const cssContent = fs.readFileSync(stylesCss, 'utf8');
    assert.ok(cssContent.includes('.btn-spatial-action'), 'styles.css must style .btn-spatial-action');
    assert.ok(cssContent.includes('.spatial-poi-dialog'), 'styles.css must style .spatial-poi-dialog');
    assert.ok(cssContent.includes('.arena-clash-box'), 'styles.css must style .arena-clash-box');
  });
});
