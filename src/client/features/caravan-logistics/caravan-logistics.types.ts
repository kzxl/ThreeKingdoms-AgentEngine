/**
 * ThreeKingdoms-AgentEngine: Caravan Logistics Types
 * (src/client/features/caravan-logistics/caravan-logistics.types.ts)
 */

export interface CaravanRecord {
  caravan_id: string;
  owner_id: string;
  origin_settlement_id: string;
  dest_settlement_id: string;
  commodity_code: string;
  cargo_qty: number;
  purchase_unit_price: number;
  days_remaining: number;
  total_days: number;
  escort_level: 'NONE' | 'MILITIA' | 'MERCENARY';
  status: 'IN_TRANSIT' | 'ARRIVED' | 'AMBUSHED';
}

export interface ArbitrageRoute {
  originId: string;
  originNameVi: string;
  destId: string;
  destNameVi: string;
  commodityCode: string;
  commodityNameVi: string;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  distanceDays: number;
}
