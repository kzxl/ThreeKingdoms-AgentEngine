/**
 * One map registry: locations, sub-locations, POIs and resource nodes resolve
 * through SQLite and the 20-node cartography aliases.
 */

import { DatabaseService } from '../../core/database';
import { resolveMapNodeId } from '../../shared/map-aliases';
import { LOC_TO_NODE_MAP, NODE_TO_LOC_MAP } from './spatial-registry';

export interface MapRegistryNode {
  nodeId: string;
  locationId: string;
  nameVi: string;
  nameEn: string;
  provinceVi: string;
  provinceEn: string;
}

export interface MapRegistrySubLocation {
  subLocationId: string;
  locationId: string;
  nodeId: string;
  nameVi: string;
  kind: string;
  sortOrder: number;
}

export interface MapRegistryPoi {
  poiName: string;
  locationId: string;
  nodeId: string;
  sceneKey: string;
}

export interface MapRegistryResource {
  resourceNodeId: string;
  settlementId: string;
  nodeId: string;
  nameVi: string;
  resourceType: string;
}

export interface MapRegistry {
  nodes: MapRegistryNode[];
  locations: Array<Record<string, unknown>>;
  subLocations: MapRegistrySubLocation[];
  poiScenes: MapRegistryPoi[];
  resources: MapRegistryResource[];
  settlements: Array<{ settlementId: string; nodeId: string; nameVi: string }>;
  subLocationsByNode: Record<string, MapRegistrySubLocation[]>;
  poiScenesByNode: Record<string, MapRegistryPoi[]>;
  resourcesByNode: Record<string, MapRegistryResource[]>;
  orphans: string[];
}

export class MapRegistryService {
  public constructor(private readonly db: DatabaseService) {}

  public static forDatabase(db: DatabaseService): MapRegistryService {
    return new MapRegistryService(db);
  }

  private nodeForLocation(locationId: string): string {
    return resolveMapNodeId(LOC_TO_NODE_MAP[locationId] || locationId);
  }

  public getRegistry(): MapRegistry {
    const locations = this.db.query<any>(
      `SELECT location_id, name_vi, name_en, province_vi, province_en, coord_x, coord_y
       FROM master_locations ORDER BY location_id;`
    );
    const locationById = new Map(locations.map(row => [String(row.location_id), row]));

    const nodes: MapRegistryNode[] = Object.entries(NODE_TO_LOC_MAP)
      .filter(([nodeId]) => nodeId !== 'wu_wei')
      .map(([nodeId, locationId]) => {
      const row = locationById.get(locationId) || {};
      return {
        nodeId,
        locationId,
        nameVi: String(row.name_vi || nodeId),
        nameEn: String(row.name_en || nodeId),
        provinceVi: String(row.province_vi || ''),
        provinceEn: String(row.province_en || '')
      };
    });
    const nodeIds = new Set(nodes.map(node => node.nodeId));

    const rawSubLocations = this.db.query<any>(
      `SELECT sub_location_id, location_id, name_vi, name_en, kind, sort_order
       FROM location_sublocations ORDER BY location_id, sort_order;`
    );
    const subLocations: MapRegistrySubLocation[] = rawSubLocations.map(row => ({
      subLocationId: String(row.sub_location_id),
      locationId: String(row.location_id),
      nodeId: this.nodeForLocation(String(row.location_id)),
      nameVi: String(row.name_vi),
      kind: String(row.kind || 'URBAN'),
      sortOrder: Number(row.sort_order || 0)
    }));

    const poiScenes: MapRegistryPoi[] = this.db.query<any>(
      `SELECT poi_name, location_id, scene_key FROM master_poi_scenes ORDER BY location_id, poi_name;`
    ).map(row => ({
      poiName: String(row.poi_name),
      locationId: String(row.location_id),
      nodeId: this.nodeForLocation(String(row.location_id)),
      sceneKey: String(row.scene_key || '')
    }));

    const resources: MapRegistryResource[] = this.db.query<any>(
      `SELECT node_id, settlement_id, name_vi, resource_type FROM gathering_nodes ORDER BY settlement_id, node_id;`
    ).map(row => ({
      resourceNodeId: String(row.node_id),
      settlementId: String(row.settlement_id),
      nodeId: resolveMapNodeId(String(row.settlement_id)),
      nameVi: String(row.name_vi || row.node_id),
      resourceType: String(row.resource_type || '')
    }));

    const settlements = this.db.query<any>(
      'SELECT settlement_id, name_vi FROM session_settlements ORDER BY settlement_id;'
    ).map(row => ({
      settlementId: String(row.settlement_id),
      nodeId: resolveMapNodeId(String(row.settlement_id)),
      nameVi: String(row.name_vi || row.settlement_id)
    }));

    const orphans: string[] = [];
    for (const sub of subLocations) {
      if (!nodeIds.has(sub.nodeId)) orphans.push(`sub_location:${sub.subLocationId}→${sub.nodeId}`);
    }
    for (const poi of poiScenes) {
      if (!nodeIds.has(poi.nodeId)) orphans.push(`poi:${poi.poiName}→${poi.nodeId}`);
    }
    for (const resource of resources) {
      if (!nodeIds.has(resource.nodeId)) orphans.push(`resource:${resource.resourceNodeId}→${resource.nodeId}`);
    }
    for (const settlement of settlements) {
      if (!nodeIds.has(settlement.nodeId)) orphans.push(`settlement:${settlement.settlementId}→${settlement.nodeId}`);
    }

    const subLocationsByNode: Record<string, MapRegistrySubLocation[]> = {};
    for (const sub of subLocations) (subLocationsByNode[sub.nodeId] ||= []).push(sub);
    const poiScenesByNode: Record<string, MapRegistryPoi[]> = {};
    for (const poi of poiScenes) (poiScenesByNode[poi.nodeId] ||= []).push(poi);
    const resourcesByNode: Record<string, MapRegistryResource[]> = {};
    for (const resource of resources) (resourcesByNode[resource.nodeId] ||= []).push(resource);

    return {
      nodes,
      locations,
      subLocations,
      poiScenes,
      resources,
      settlements,
      subLocationsByNode,
      poiScenesByNode,
      resourcesByNode,
      orphans
    };
  }

  public getSubLocationsForNode(nodeId: string): MapRegistrySubLocation[] {
    return this.getRegistry().subLocationsByNode[nodeId] || [];
  }

  public getPoiScenesForNode(nodeId: string): MapRegistryPoi[] {
    return this.getRegistry().poiScenesByNode[nodeId] || [];
  }

  public getResourcesForNode(nodeId: string): MapRegistryResource[] {
    return this.getRegistry().resourcesByNode[nodeId] || [];
  }
}
