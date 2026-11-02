/**
 * Market stall client service.
 */

import { apiClient } from '../../core/api/client-api';

export interface StallListing {
  listingId: string;
  itemCode: string;
  itemNameVi: string;
  quantity: number;
  unitPrice: number;
  marketPrice: number;
  status: string;
}

export interface StallSale {
  saleId: string;
  npcId: string;
  npcNameVi: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  totalCash: number;
  gameDate: string;
}

export interface StallView {
  stallId: string;
  ownerId: string;
  settlementId: string;
  nameVi: string;
  status: string;
  createdDate: string;
  listings: StallListing[];
  recentSales: StallSale[];
}

export interface NpcOffer {
  offerId: string;
  settlementId: string;
  npcId: string;
  npcNameVi: string;
  itemCode: string;
  itemNameVi: string;
  unitVi: string;
  quantity: number;
  unitPrice: number;
  marketPrice: number;
  priceDeltaPct: number;
  expiresDate: string;
}

export interface WarehouseView {
  warehouseId: string;
  settlementId: string;
  nameVi: string;
  ownershipType: string;
  capacity: number;
  usedCapacity: number;
  rentCash: number;
  purchasePrice: number;
  leaseUntil: string | null;
  status: string;
}

export interface FreightContractView {
  contractId: string;
  fromSettlementId: string;
  toSettlementId: string;
  itemCode: string;
  quantity: number;
  rewardCash: number;
  deadline: string;
  daysLeft: number;
  travelDays: number;
  status: string;
}

export interface FreightShipmentView {
  shipmentId: string;
  contractId: string;
  itemCode: string;
  quantity: number;
  daysRemaining: number;
  status: string;
  rewardCash: number;
  guardTier: string;
  insured: boolean;
  ambushLossQuantity: number;
}

export interface MerchantRouteView {
  routeId: string;
  nameVi: string;
  itemCode: string;
  fromSettlementId: string;
  toSettlementId: string;
  status: string;
  quantityPerRun: number;
  frequencyDays: number;
  nextRunDate: string;
}

export class MarketStallService {
  private static instance: MarketStallService;

  public static getInstance(): MarketStallService {
    if (!MarketStallService.instance) MarketStallService.instance = new MarketStallService();
    return MarketStallService.instance;
  }

  public async getStall(characterId = 'PLY-0001'): Promise<StallView | null> {
    const res = await apiClient.get('/api/stall', { characterId });
    return (res as any).stall || null;
  }

  public async getOffers(settlementId?: string): Promise<NpcOffer[]> {
    const res = await apiClient.get('/api/market/npc-offers', settlementId ? { settlementId } : undefined);
    return (res as any).offers || [];
  }

  public async getWarehouses(): Promise<WarehouseView[]> {
    const res = await apiClient.get('/api/warehouses', { characterId: 'PLY-0001' });
    return (res as any).warehouses || [];
  }

  public async rentWarehouse(settlementId?: string): Promise<any> {
    return apiClient.post('/api/warehouses/rent', { settlementId, idempotencyKey: `warehouse-rent-${Date.now()}` });
  }

  public async buyWarehouse(settlementId?: string): Promise<any> {
    return apiClient.post('/api/warehouses/buy', { settlementId, idempotencyKey: `warehouse-buy-${Date.now()}` });
  }

  public async deposit(warehouseId: string, itemCode: string, quantity: number): Promise<any> {
    return apiClient.post('/api/warehouses/deposit', {
      warehouseId, itemCode, quantity, idempotencyKey: `warehouse-deposit-${Date.now()}`
    });
  }

  public async withdraw(warehouseId: string, itemCode: string, quantity: number): Promise<any> {
    return apiClient.post('/api/warehouses/withdraw', {
      warehouseId, itemCode, quantity, idempotencyKey: `warehouse-withdraw-${Date.now()}`
    });
  }

  public async renewWarehouse(warehouseId: string): Promise<any> {
    return apiClient.post('/api/warehouses/renew', {
      warehouseId, idempotencyKey: `warehouse-renew-${warehouseId}-${Date.now()}`
    });
  }

  public async openStall(settlementId?: string): Promise<any> {
    return apiClient.post('/api/stall/open', { settlementId, idempotencyKey: `stall-open-${Date.now()}` });
  }

  public async listItem(
    itemCode: string,
    quantity: number,
    unitPrice: number,
    source: 'BAG' | 'WAREHOUSE' = 'BAG',
    warehouseId?: string,
    stallId?: string
  ): Promise<any> {
    return apiClient.post('/api/stall/list', {
      itemCode,
      quantity,
      unitPrice,
      source,
      warehouseId,
      stallId,
      idempotencyKey: `stall-list-${itemCode}-${Date.now()}`
    });
  }

  public async closeStall(stallId?: string): Promise<any> {
    return apiClient.post('/api/stall/close', { stallId, idempotencyKey: `stall-close-${Date.now()}` });
  }

  public async buyOffer(offerId: string, quantity: number): Promise<any> {
    return apiClient.post('/api/market/npc-offers/buy', {
      offerId,
      quantity,
      idempotencyKey: `offer-buy-${offerId}-${Date.now()}`
    });
  }

  public async getFreightContracts(settlementId?: string): Promise<FreightContractView[]> {
    const res = await apiClient.get('/api/freight/contracts', settlementId ? { settlementId } : undefined);
    return (res as any).contracts || [];
  }

  public async getFreightShipments(): Promise<FreightShipmentView[]> {
    const res = await apiClient.get('/api/freight/shipments');
    return (res as any).shipments || [];
  }

  public async acceptFreight(contractId: string, guardTier = 'VETERAN', insurance = false): Promise<any> {
    return apiClient.post('/api/freight/accept', {
      contractId, guardTier, insurance, idempotencyKey: `freight-accept-${contractId}-${Date.now()}`
    });
  }

  public async deliverFreight(shipmentId: string): Promise<any> {
    return apiClient.post('/api/freight/deliver', {
      shipmentId, idempotencyKey: `freight-deliver-${shipmentId}-${Date.now()}`
    });
  }

  public async getMerchantRoutes(): Promise<MerchantRouteView[]> {
    const res = await apiClient.get('/api/merchant/routes');
    return (res as any).routes || [];
  }

  public async getMerchantEvents(): Promise<any[]> {
    const res = await apiClient.get('/api/merchant/events');
    return (res as any).events || [];
  }

  public async createMerchantRoute(input: {
    fromWarehouseId: string;
    toWarehouseId: string;
    itemCode: string;
    quantityPerRun: number;
    maxBuyPrice: number;
    minSellPrice: number;
    frequencyDays: number;
    guardTier: string;
    nameVi?: string;
  }): Promise<any> {
    return apiClient.post('/api/merchant/routes', {
      ...input,
      idempotencyKey: `merchant-route-create-${input.fromWarehouseId}-${input.toWarehouseId}-${Date.now()}`
    });
  }

  public async setMerchantRouteStatus(routeId: string, status: 'ACTIVE' | 'PAUSED'): Promise<any> {
    return apiClient.post(`/api/merchant/routes/${routeId}/status`, {
      status, idempotencyKey: `merchant-route-${routeId}-${status}-${Date.now()}`
    });
  }
}

export const marketStallService = MarketStallService.getInstance();
