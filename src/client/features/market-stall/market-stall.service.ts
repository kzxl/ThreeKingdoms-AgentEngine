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

  public async openStall(settlementId?: string): Promise<any> {
    return apiClient.post('/api/stall/open', { settlementId, idempotencyKey: `stall-open-${Date.now()}` });
  }

  public async listItem(itemCode: string, quantity: number, unitPrice: number): Promise<any> {
    return apiClient.post('/api/stall/list', {
      itemCode,
      quantity,
      unitPrice,
      idempotencyKey: `stall-list-${itemCode}-${Date.now()}`
    });
  }

  public async closeStall(): Promise<any> {
    return apiClient.post('/api/stall/close', { idempotencyKey: `stall-close-${Date.now()}` });
  }

  public async buyOffer(offerId: string, quantity: number): Promise<any> {
    return apiClient.post('/api/market/npc-offers/buy', {
      offerId,
      quantity,
      idempotencyKey: `offer-buy-${offerId}-${Date.now()}`
    });
  }
}

export const marketStallService = MarketStallService.getInstance();
