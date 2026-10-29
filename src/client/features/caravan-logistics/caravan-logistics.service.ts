/**
 * ThreeKingdoms-AgentEngine: Caravan Logistics Service
 * (src/client/features/caravan-logistics/caravan-logistics.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { ArbitrageRoute, CaravanRecord } from './caravan-logistics.types';

export class CaravanLogisticsService {
  private static instance: CaravanLogisticsService;

  public static getInstance(): CaravanLogisticsService {
    if (!CaravanLogisticsService.instance) {
      CaravanLogisticsService.instance = new CaravanLogisticsService();
    }
    return CaravanLogisticsService.instance;
  }

  public async getCaravans(): Promise<CaravanRecord[]> {
    const res = await apiClient.get('/api/logistics/caravans');
    return res.caravans || [];
  }

  public async getArbitrageOpportunities(): Promise<ArbitrageRoute[]> {
    const res = await apiClient.get('/api/economy/arbitrage');
    return res.routes || [];
  }

  public async dispatchCaravan(payload: {
    originSettlementId: string;
    destSettlementId: string;
    commodityCode: string;
    quantity: number;
    escortLevel: string;
  }): Promise<any> {
    return apiClient.post('/api/caravans/dispatch', {
      cargoItemCode: payload.commodityCode,
      cargoQuantity: payload.quantity,
      fromSettlementId: payload.originSettlementId,
      toSettlementId: payload.destSettlementId,
      guardTier: payload.escortLevel
    });
  }
}

export const caravanLogisticsService = CaravanLogisticsService.getInstance();
