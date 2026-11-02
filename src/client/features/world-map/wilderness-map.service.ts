/**
 * Wilderness local map client.
 */

import { apiClient } from '../../core/api/client-api';

export interface WildernessSpot {
  subLocationId: string;
  nameVi: string;
  kind: string;
  mapScope: 'CITY' | 'WILDERNESS';
  localX: number | null;
  localY: number | null;
  iconKey: string;
  sceneKey: string | null;
  sortOrder: number;
}

export interface WildernessResource {
  resourceNodeId: string;
  nameVi: string;
  resourceType: string;
}

export interface WildernessView {
  nodeId: string;
  city: { nameVi?: string; nameEn?: string } | null;
  currentSubLocation: string | null;
  wilderness: WildernessSpot[];
  resources: WildernessResource[];
  poiScenes: Array<{ poiName: string; sceneKey: string }>;
}

export class WildernessMapService {
  private static instance: WildernessMapService;

  public static getInstance(): WildernessMapService {
    if (!WildernessMapService.instance) WildernessMapService.instance = new WildernessMapService();
    return WildernessMapService.instance;
  }

  public async get(nodeId?: string): Promise<WildernessView> {
    const res = await apiClient.get('/api/map/wilderness', nodeId ? { nodeId } : undefined);
    return res as unknown as WildernessView;
  }

  public async travel(subLocationId: string): Promise<any> {
    return apiClient.post('/api/map/wilderness/travel', {
      subLocationId,
      idempotencyKey: `wilderness-travel-${subLocationId}-${Date.now()}`
    });
  }

  public async gather(nodeId: string, characterId = 'PLY-0001'): Promise<any> {
    return apiClient.post('/api/professions/gather', {
      characterId,
      nodeId,
      idempotencyKey: `wilderness-gather-${nodeId}-${Date.now()}`
    });
  }

  public async getScene(subLocation: string, characterId = 'PLY-0001'): Promise<any> {
    return apiClient.get('/api/scene', { subLocation, characterId });
  }

  public async dispatchAction(action: Record<string, unknown>): Promise<any> {
    return apiClient.post('/api/action', action);
  }
}

export const wildernessMapService = WildernessMapService.getInstance();
