/**
 * Map registry REST surface: one payload for nodes, sub-locations, POIs and
 * resource nodes.
 */

import { Router, sendJson } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { MapRegistryService } from './map-registry.service';

export function registerMapRoutes(router: Router): void {
  const db = DatabaseService.getInstance();
  const service = MapRegistryService.forDatabase(db);

  router.get('/api/map/registry', (_req: any, res: any) => {
    try {
      const registry = service.getRegistry();
      sendJson(res, 200, {
        success: true,
        ...registry
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });
}
