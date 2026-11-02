/**
 * Wilderness local map: the WILDERNESS rows around one city, plus travel to a
 * sub-location. The server owns `player_state.current_sub_location`; the city
 * mini-map is a later step and is not served here.
 */

import { DatabaseService } from '../../core/database';
import { MapRegistryService } from './map-registry.service';
import { resolveLocationId } from './spatial-registry';

export interface WildernessTravelResult {
  subLocationId: string;
  nameVi: string;
  locationId: string;
  nodeId: string;
  previousSubLocation: string | null;
  travelDays: number;
}

export class WildernessService {
  public constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): WildernessService {
    return new WildernessService(db);
  }

  private player(playerId: string): any {
    const row = this.db.queryOne<any>(
      'SELECT current_location, current_sub_location FROM player_state WHERE player_id = ? LIMIT 1;',
      [playerId]
    );
    if (!row) throw new Error(`Không tìm thấy nhân vật ${playerId}.`);
    return row;
  }

  private currentCityLocation(player: any): string {
    if (player.current_sub_location) {
      const sub = this.db.queryOne<{ location_id: string }>(
        'SELECT location_id FROM location_sublocations WHERE name_vi = ? OR sub_location_id = ? LIMIT 1;',
        [player.current_sub_location, player.current_sub_location]
      );
      if (sub) return sub.location_id;
    }
    const byName = this.db.queryOne<{ location_id: string }>(
      `SELECT location_id FROM location_sublocations
       WHERE name_vi = ? OR name_vi LIKE '%' || ? || '%'
       ORDER BY length(name_vi) ASC LIMIT 1;`,
      [player.current_location, player.current_location]
    );
    if (byName) return byName.location_id;
    return resolveLocationId(player.current_location);
  }

  public list(playerId = 'PLY-0001', nodeId?: string): any {
    const player = this.player(playerId);
    const currentLocationId = this.currentCityLocation(player);
    const registry = MapRegistryService.forDatabase(this.db);
    const resolvedNode = nodeId || (registry.getRegistry().subLocations.find(
      row => row.locationId === currentLocationId
    )?.nodeId) || currentLocationId;
    const wilderness = registry.getWildernessForNode(resolvedNode);
    const resources = registry.getResourcesForNode(resolvedNode);
    const poiScenes = registry.getPoiScenesForNode(resolvedNode);
    const node = registry.getRegistry().nodes.find(row => row.nodeId === resolvedNode);
    return {
      nodeId: resolvedNode,
      city: node || null,
      currentSubLocation: player.current_sub_location || null,
      wilderness,
      resources,
      poiScenes
    };
  }

  public travel(playerId: string, subLocationId: string, _gameDate: string): WildernessTravelResult {
    const player = this.player(playerId);
    const target = this.db.queryOne<any>(
      'SELECT * FROM location_sublocations WHERE sub_location_id = ? OR name_vi = ? LIMIT 1;',
      [subLocationId, subLocationId]
    );
    if (!target) throw new Error(`Địa danh ${subLocationId} không tồn tại.`);
    if (target.map_scope !== 'WILDERNESS') {
      throw new Error(`${target.name_vi} là địa điểm nội thành; hãy dùng mini-map thành.`);
    }
    const currentLocationId = this.currentCityLocation(player);
    if (target.location_id !== currentLocationId) {
      throw new Error(`${target.name_vi} thuộc thành khác; hãy đi tới thành đó trước.`);
    }
    const previous = player.current_sub_location || null;
    this.db.execute(
      'UPDATE player_state SET current_sub_location = ? WHERE player_id = ?;',
      [target.name_vi, playerId]
    );
    return {
      subLocationId: String(target.sub_location_id),
      nameVi: String(target.name_vi),
      locationId: String(target.location_id),
      nodeId: MapRegistryService.forDatabase(this.db).getRegistry()
        .subLocations.find(row => row.subLocationId === target.sub_location_id)?.nodeId || '',
      previousSubLocation: previous,
      travelDays: 1
    };
  }
}
