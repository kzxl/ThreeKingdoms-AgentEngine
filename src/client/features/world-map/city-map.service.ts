/**
 * City mini-map client: one settlement's CITY sub-locations and local scenes.
 */

import { apiClient } from '../../core/api/client-api';

export interface CitySpot {
  subLocationId: string;
  nameVi: string;
  kind: string;
  mapScope: 'CITY';
  localX: number | null;
  localY: number | null;
  iconKey: string;
  sceneKey: string | null;
  sortOrder: number;
}

export interface CityView {
  nodeId: string;
  city: { nameVi?: string; nameEn?: string } | null;
  currentSubLocation: string | null;
  citySpots: CitySpot[];
  poiScenes: Array<{ poiName: string; sceneKey: string }>;
}

export class CityMapService {
  private static instance: CityMapService;

  public static getInstance(): CityMapService {
    if (!CityMapService.instance) CityMapService.instance = new CityMapService();
    return CityMapService.instance;
  }

  public async get(nodeId?: string): Promise<CityView> {
    const res = await apiClient.get('/api/map/city', nodeId ? { nodeId } : undefined);
    return res as unknown as CityView;
  }

  public async enter(subLocationId: string): Promise<any> {
    return apiClient.post('/api/map/city/enter', {
      subLocationId,
      idempotencyKey: `city-enter-${subLocationId}-${Date.now()}`
    });
  }

  public async getScene(subLocation: string, characterId = 'PLY-0001'): Promise<any> {
    return apiClient.get('/api/scene', { subLocation, characterId });
  }

  public async dispatchAction(action: Record<string, unknown>): Promise<any> {
    return apiClient.post('/api/action', action);
  }
}

export const cityMapService = CityMapService.getInstance();
