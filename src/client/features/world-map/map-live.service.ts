/**
 * ThreeKingdoms-AgentEngine: Live World Map State Service
 * (src/client/features/world-map/map-live.service.ts)
 *
 * Bridges static cartography in public/js/map-data.js with live campaign data:
 * - /api/garrisons          troops, defense, grain, treasury, public order
 * - /api/factions/settlements faction, governor, color
 * - /api/factions            English faction names, leader ids
 * - /api/military/status     active expeditions and player commander
 *
 * The database has 23 settlements while the map renders 20 nodes; aliases
 * resolve the extra rows onto the nearest rendered citadel.
 */

export interface MapLiveRecord {
  settlementId?: string;
  sourceSettlementId?: string;
  nameVi?: string;
  nameEn?: string;
  provinceVi?: string;
  provinceEn?: string;
  rulerFactionId?: string;
  rulerFactionName?: string;
  factionNameVi?: string;
  factionNameEn?: string;
  factionColor?: string;
  factionMilitaryPower?: number;
  governorId?: string | null;
  governorName?: string;
  publicOrder?: number;
  garrisonTroops?: number;
  agriculture?: number;
  commerce?: number;
  defense?: number;
  granaryGrain?: number;
  treasuryCash?: number;
}

export interface MapLiveState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  fetchedAt: number;
  bySettlement: Record<string, MapLiveRecord>;
  byMapNode: Record<string, MapLiveRecord>;
  activeExpeditions: unknown[];
  player: Record<string, unknown> | null;
  playerFaction: Record<string, unknown> | null;
  factionsById: Record<string, Record<string, unknown>>;
  banditsByNode: Record<string, Record<string, unknown>[]>;
  crisesByNode: Record<string, Record<string, unknown>[]>;
  npcsByName: Record<string, Record<string, unknown>>;
  npcsById: Record<string, Record<string, unknown>>;
  playerCash: number;
  inventory: Record<string, number>;
  specialistsByName: Record<string, Record<string, unknown>>;
  specialistsByMapNode: Record<string, Record<string, unknown>[]>;
  businesses: Record<string, unknown>[];
  guardTiers: Array<{ tier: string; nameVi: string; troops: number; costQian: number }>;
  routesByKey: Record<string, MapLiveRoute>;
  locationsById: Record<string, Record<string, unknown>>;
  locToMapNode: Record<string, string>;
  caravans: Record<string, unknown>[];
  expeditions: Record<string, unknown>[];
  resourcesByNode: Record<string, { types: Record<string, number>; nodes: Record<string, unknown>[] }>;
  resourceTotals: Record<string, number>;
  errors: string[];
}

export interface MapLiveRoute {
  from: string;
  to: string;
  distanceLi?: number;
  terrainType?: string;
  marchDays?: number;
  grainCost?: number;
  ambushRisk?: string;
  descVi?: string;
  descEn?: string;
}

const SETTLEMENT_ALIASES: Record<string, string> = {
  wu_wei: 'xi_liang',
  he_fei: 'shou_chun',
  pu_yang: 'ye_cheng',
  wu_ling: 'jiang_ling'
};

class MapLiveService {
  public readonly ALIASES = SETTLEMENT_ALIASES;

  private state: MapLiveState = {
    status: 'idle',
    fetchedAt: 0,
    bySettlement: {},
    byMapNode: {},
    activeExpeditions: [],
    player: null,
    playerFaction: null,
    factionsById: {},
    banditsByNode: {},
    crisesByNode: {},
    npcsByName: {},
    npcsById: {},
    playerCash: 0,
    inventory: {},
    specialistsByName: {},
    specialistsByMapNode: {},
    businesses: [],
    guardTiers: [],
    routesByKey: {},
    locationsById: {},
    locToMapNode: {},
    caravans: [],
    expeditions: [],
    resourcesByNode: {},
    resourceTotals: {},
    errors: []
  };

  public resolveMapNodeId(settlementId: string): string {
    return SETTLEMENT_ALIASES[settlementId] || settlementId;
  }

  private mergeRecord(
    existing: MapLiveRecord | undefined,
    incoming: MapLiveRecord | undefined
  ): MapLiveRecord {
    return Object.assign({}, existing || {}, incoming || {});
  }

  private async readJson<T = Record<string, unknown>>(url: string): Promise<T> {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json() as Promise<T>;
  }

  public async load(force = false): Promise<MapLiveState> {
    if (!force && this.state.status === 'ready' && Date.now() - this.state.fetchedAt < 10000) {
      return this.state;
    }

    this.state.status = 'loading';
    this.state.errors = [];

    const [
      garrisonResult,
      factionResult,
      factionListResult,
      militaryResult,
      strongholdResult,
      crisisResult,
      npcResult,
      statusResult,
      inventoryResult,
      specialistResult,
      businessResult,
      guardTierResult,
      routeResult,
      locationResult,
      caravanResult,
      expeditionResult,
      resourceResult
    ] = await Promise.allSettled([
      this.readJson<{ success?: boolean; garrisons?: MapLiveRecord[] }>('/api/garrisons'),
      this.readJson<{ success?: boolean; settlements?: MapLiveRecord[] }>('/api/factions/settlements'),
      this.readJson<{ success?: boolean; factions?: Record<string, unknown>[] }>('/api/factions'),
      this.readJson<{
        success?: boolean;
        activeExpeditions?: unknown[];
        commander?: Record<string, unknown>;
      }>('/api/military/status'),
      this.readJson<{ success?: boolean; strongholds?: Record<string, unknown>[] }>('/api/logistics/strongholds'),
      this.readJson<{ success?: boolean; crises?: Record<string, unknown>[] }>('/api/ecology/crises'),
      this.readJson<{ success?: boolean; npcs?: Record<string, unknown>[] }>('/api/npcs'),
      this.readJson<{ success?: boolean; player?: { liquid_cash?: number } }>('/api/status'),
      this.readJson<{ success?: boolean; items?: MapLiveRecord[] }>('/api/inventory'),
      this.readJson<{ success?: boolean; specialists?: Record<string, unknown>[] }>('/api/workforce/specialists'),
      this.readJson<{ success?: boolean; businesses?: Record<string, unknown>[] }>('/api/workforce/businesses'),
      this.readJson<{ success?: boolean; tiers?: Array<{ tier: string; nameVi: string; troops: number; costQian: number }> }>('/api/caravans/guard-tiers'),
      this.readJson<{
        success?: boolean;
        routes?: Array<{
          sourceLocationId?: string;
          targetLocationId?: string;
          distanceLi?: number;
          terrainType?: string;
          standardMarchDays?: number;
          grainProvisionCost?: number;
          ambushRiskLevel?: string;
          descriptionVi?: string;
          descriptionEn?: string;
        }>;
      }>('/api/military/routes'),
      this.readJson<{ success?: boolean; locations?: Record<string, unknown>[] }>('/api/locations'),
      this.readJson<{ success?: boolean; caravans?: Record<string, unknown>[] }>('/api/logistics/caravans'),
      this.readJson<{ success?: boolean; expeditions?: Record<string, unknown>[] }>('/api/expeditions'),
      this.readJson<{ success?: boolean; nodes?: Record<string, unknown>[] }>('/api/professions/nodes')
    ]);

    const garrisons = garrisonResult.status === 'fulfilled' && garrisonResult.value.success
      ? (garrisonResult.value.garrisons || [])
      : [];
    const factionSettlements = factionResult.status === 'fulfilled' && factionResult.value.success
      ? (factionResult.value.settlements || [])
      : [];
    const factionList = factionListResult.status === 'fulfilled' && factionListResult.value.success
      ? (factionListResult.value.factions || [])
      : [];
    const military = militaryResult.status === 'fulfilled' && militaryResult.value.success
      ? militaryResult.value
      : null;
    const strongholds = strongholdResult.status === 'fulfilled' && strongholdResult.value.success
      ? (strongholdResult.value.strongholds || [])
      : [];
    const crises = crisisResult.status === 'fulfilled' && crisisResult.value.success
      ? (crisisResult.value.crises || [])
      : [];
    const npcs = npcResult.status === 'fulfilled' && npcResult.value.success
      ? (npcResult.value.npcs || [])
      : [];
    const status = statusResult.status === 'fulfilled' && statusResult.value.success
      ? statusResult.value
      : null;
    const inventory = inventoryResult.status === 'fulfilled' && inventoryResult.value.success
      ? (inventoryResult.value.items || [])
      : [];
    const specialists = specialistResult.status === 'fulfilled' && specialistResult.value.success
      ? (specialistResult.value.specialists || [])
      : [];
    const businesses = businessResult.status === 'fulfilled' && businessResult.value.success
      ? (businessResult.value.businesses || [])
      : [];
    const guardTiers = guardTierResult.status === 'fulfilled' && guardTierResult.value.success
      ? (guardTierResult.value.tiers || [])
      : [];
    const routes = routeResult.status === 'fulfilled' && routeResult.value.success
      ? (routeResult.value.routes || [])
      : [];
    const locations = locationResult.status === 'fulfilled' && locationResult.value.success
      ? (locationResult.value.locations || [])
      : [];
    const caravans = caravanResult.status === 'fulfilled' && caravanResult.value.success
      ? (caravanResult.value.caravans || [])
      : [];
    const expeditions = expeditionResult.status === 'fulfilled' && expeditionResult.value.success
      ? (expeditionResult.value.expeditions || [])
      : [];
    const resourceNodes = resourceResult.status === 'fulfilled' && resourceResult.value.success
      ? (resourceResult.value.nodes || [])
      : [];

    if (garrisonResult.status === 'rejected') this.state.errors.push('garrisons');
    if (factionResult.status === 'rejected') this.state.errors.push('factions/settlements');
    if (factionListResult.status === 'rejected') this.state.errors.push('factions');
    if (militaryResult.status === 'rejected') this.state.errors.push('military');
    if (strongholdResult.status === 'rejected') this.state.errors.push('strongholds');
    if (crisisResult.status === 'rejected') this.state.errors.push('crises');
    if (npcResult.status === 'rejected') this.state.errors.push('npcs');
    if (statusResult.status === 'rejected') this.state.errors.push('status');
    if (inventoryResult.status === 'rejected') this.state.errors.push('inventory');
    if (specialistResult.status === 'rejected') this.state.errors.push('workforce');
    if (businessResult.status === 'rejected') this.state.errors.push('businesses');
    if (guardTierResult.status === 'rejected') this.state.errors.push('guard-tiers');
    if (routeResult.status === 'rejected') this.state.errors.push('routes');
    if (locationResult.status === 'rejected') this.state.errors.push('locations');
    if (caravanResult.status === 'rejected') this.state.errors.push('caravans');
    if (expeditionResult.status === 'rejected') this.state.errors.push('expeditions');
    if (resourceResult.status === 'rejected') this.state.errors.push('resources');

    const factionsById: Record<string, Record<string, unknown>> = {};
    factionList.forEach(faction => {
      const id = faction && (faction as { factionId?: string }).factionId;
      if (id) factionsById[id] = faction;
    });

    const bySettlement: Record<string, MapLiveRecord> = {};
    garrisons.forEach(record => {
      if (!record || !record.settlementId) return;
      bySettlement[record.settlementId] = this.mergeRecord(bySettlement[record.settlementId], record);
    });
    factionSettlements.forEach(record => {
      if (!record || !record.settlementId) return;
      bySettlement[record.settlementId] = this.mergeRecord(bySettlement[record.settlementId], record);
    });

    // Attach English faction names and live colors from the faction registry.
    Object.keys(bySettlement).forEach(settlementId => {
      const record = bySettlement[settlementId];
      const faction = record.rulerFactionId ? factionsById[record.rulerFactionId] : null;
      if (!faction) return;
      const typed = faction as {
        nameVi?: string;
        nameEn?: string;
        colorHex?: string;
        militaryPower?: number;
      };
      record.factionNameVi = typed.nameVi;
      record.factionNameEn = typed.nameEn;
      record.factionColor = typed.colorHex;
      record.factionMilitaryPower = typed.militaryPower;
    });

    // Exact node ids win over aliases so a real settlement row is never replaced
    // by a neighbouring one that happens to alias to the same map node.
    const byMapNode: Record<string, MapLiveRecord> = {};
    Object.keys(bySettlement).forEach(settlementId => {
      if (this.resolveMapNodeId(settlementId) === settlementId) {
        byMapNode[settlementId] = this.mergeRecord(byMapNode[settlementId], {
          ...bySettlement[settlementId],
          sourceSettlementId: settlementId
        });
      }
    });
    Object.keys(bySettlement).forEach(settlementId => {
      const nodeId = this.resolveMapNodeId(settlementId);
      if (!byMapNode[nodeId]) {
        byMapNode[nodeId] = this.mergeRecord(byMapNode[nodeId], {
          ...bySettlement[settlementId],
          sourceSettlementId: settlementId
        });
      }
    });

    this.state.bySettlement = bySettlement;
    this.state.byMapNode = byMapNode;
    this.state.activeExpeditions = (military && military.activeExpeditions) || [];
    this.state.player = (military && military.commander) || null;
    this.state.playerFaction = factionList.find(
      faction => (faction as { leaderId?: string }).leaderId === 'PLY-0001'
    ) || null;
    this.state.factionsById = factionsById;

    const banditsByNode: Record<string, Record<string, unknown>[]> = {};
    strongholds.forEach(stronghold => {
      const status = (stronghold as { status?: string }).status;
      const near = (stronghold as { locationNear?: string }).locationNear;
      if (status !== 'ACTIVE' || !near) return;
      const nodeId = this.resolveMapNodeId(near);
      (banditsByNode[nodeId] ||= []).push(stronghold);
    });
    const crisesByNode: Record<string, Record<string, unknown>[]> = {};
    crises.forEach(crisis => {
      const settlementId = (crisis as { settlementId?: string }).settlementId;
      if (!settlementId) return;
      const nodeId = this.resolveMapNodeId(settlementId);
      (crisesByNode[nodeId] ||= []).push(crisis);
    });
    this.state.banditsByNode = banditsByNode;
    this.state.crisesByNode = crisesByNode;

    const npcsByName: Record<string, Record<string, unknown>> = {};
    const npcsById: Record<string, Record<string, unknown>> = {};
    npcs.forEach(npc => {
      const name = (npc as { name?: string }).name;
      const id = (npc as { npc_id?: string }).npc_id || (npc as { npcId?: string }).npcId;
      if (id) npcsById[id] = npc;
      if (name) npcsByName[this.normalizeName(name)] = npc;
    });
    this.state.npcsByName = npcsByName;
    this.state.npcsById = npcsById;

    const playerCash = Number(
      (status as { player?: { liquid_cash?: number } } | null)?.player?.liquid_cash
    ) || 0;
    const inventoryMap: Record<string, number> = {};
    inventory.forEach(item => {
      const code = (item as unknown as { item_code?: string; itemCode?: string }).item_code
        || (item as unknown as { itemCode?: string }).itemCode;
      const quantity = Number((item as unknown as { quantity?: number }).quantity) || 0;
      if (code) inventoryMap[code] = quantity;
    });

    this.state.playerCash = playerCash;
    this.state.inventory = inventoryMap;
    this.state.guardTiers = guardTiers;

    const specialistsByName: Record<string, Record<string, unknown>> = {};
    specialists.forEach(specialist => {
      const name = (specialist as { nameVi?: string }).nameVi;
      if (name) specialistsByName[this.normalizeName(name)] = specialist;
    });
    this.state.specialistsByName = specialistsByName;

    this.state.caravans = caravans;
    this.state.expeditions = expeditions;

    const resourcesByNode: Record<string, { types: Record<string, number>; nodes: Record<string, unknown>[] }> = {};
    const resourceTotals: Record<string, number> = {};
    resourceNodes.forEach(node => {
      const settlementId = String((node as { settlementId?: string }).settlementId || '');
      const nodeId = this.resolveMapNodeId(settlementId);
      const type = String((node as { resourceType?: string }).resourceType || '');
      if (!nodeId || !type) return;
      if (!resourcesByNode[nodeId]) resourcesByNode[nodeId] = { types: {}, nodes: [] };
      resourcesByNode[nodeId].types[type] = (resourcesByNode[nodeId].types[type] || 0) + 1;
      resourcesByNode[nodeId].nodes.push(node);
      resourceTotals[type] = (resourceTotals[type] || 0) + 1;
    });
    this.state.resourcesByNode = resourcesByNode;
    this.state.resourceTotals = resourceTotals;

    const locationsById: Record<string, Record<string, unknown>> = {};
    locations.forEach(location => {
      const id = (location as { locationId?: string }).locationId;
      if (id) locationsById[id] = location;
    });
    this.state.locationsById = locationsById;

    const labelToNode: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const labels = (window as unknown as { SETTLEMENT_LABELS?: Record<string, { vi?: string }> }).SETTLEMENT_LABELS || {};
      Object.keys(labels).forEach(nodeId => {
        if (nodeId === 'wu_wei') return;
        const vi = labels[nodeId] && labels[nodeId].vi;
        if (vi) labelToNode[this.normalizeLocationLabel(vi)] = nodeId;
      });
    }

    const locToMapNode: Record<string, string> = {};
    locations.forEach(location => {
      const id = (location as { locationId?: string }).locationId;
      const name = (location as { nameVi?: string }).nameVi;
      if (!id || !name) return;
      const nodeId = labelToNode[this.normalizeLocationLabel(name)];
      if (nodeId) locToMapNode[id] = nodeId;
    });
    this.state.locToMapNode = locToMapNode;

    const businessLocationById: Record<string, string> = {};
    businesses.forEach(business => {
      const id = (business as { businessId?: string }).businessId;
      const locationId = (business as { locationId?: string }).locationId;
      if (id && locationId) businessLocationById[id] = locationId;
    });

    const specialistsByMapNode: Record<string, Record<string, unknown>[]> = {};
    specialists.forEach(specialist => {
      const isHired = Boolean((specialist as { isHired?: boolean }).isHired);
      const businessId = (specialist as { assignedBusinessId?: string }).assignedBusinessId;
      const businessLocation = businessId ? businessLocationById[businessId] : null;
      const baselineLocation = (specialist as { baselineLocation?: string }).baselineLocation;
      const locationId = (isHired && businessLocation) ? businessLocation : baselineLocation;
      const nodeId = locationId ? locToMapNode[locationId] : null;
      if (!nodeId) return;
      (specialistsByMapNode[nodeId] ||= []).push(specialist);
    });
    this.state.businesses = businesses;
    this.state.specialistsByMapNode = specialistsByMapNode;

    const routesByKey: Record<string, MapLiveRoute> = {};
    routes.forEach(route => {
      const from = locToMapNode[route.sourceLocationId || ''];
      const to = locToMapNode[route.targetLocationId || ''];
      if (!from || !to) return;
      const rawDescEn = route.descriptionEn ? route.descriptionEn.trim() : '';
      const descEn = rawDescEn && !/^RT-/i.test(rawDescEn) && /^[\x20-\x7E]+$/.test(rawDescEn)
        ? rawDescEn
        : undefined;
      const liveRoute: MapLiveRoute = {
        from,
        to,
        distanceLi: route.distanceLi,
        terrainType: route.terrainType,
        marchDays: route.standardMarchDays,
        grainCost: route.grainProvisionCost,
        ambushRisk: route.ambushRiskLevel,
        descVi: route.descriptionVi,
        descEn
      };
      const forwardKey = `${from}|${to}`;
      const reverseKey = `${to}|${from}`;
      if (!routesByKey[forwardKey]) routesByKey[forwardKey] = liveRoute;
      if (!routesByKey[reverseKey]) routesByKey[reverseKey] = { ...liveRoute, from: to, to: from };
    });
    this.state.routesByKey = routesByKey;

    this.state.status = this.state.errors.length === 17 ? 'error' : 'ready';
    this.state.fetchedAt = Date.now();

    return this.state;
  }

  public getForMapNode(nodeId: string): MapLiveRecord | null {
    if (!nodeId) return null;
    return this.state.byMapNode[nodeId] || this.state.bySettlement[nodeId] || null;
  }

  private normalizeName(name: string): string {
    return name.normalize('NFC').trim().toLowerCase();
  }

  private normalizeLocationLabel(name: string): string {
    return name
      .replace(/\s*\(.*?\)/g, '')
      .replace(/\s*&.*/g, '')
      .replace(/Kinh Đô\s*/g, '')
      .replace(/Tây Đô\s*/g, '')
      .replace(/Imperial Capital\s*/gi, '')
      .trim()
      .toLowerCase();
  }

  public findNpcByName(name: string): Record<string, unknown> | null {
    if (!name) return null;
    return this.state.npcsByName[this.normalizeName(name)] || null;
  }

  public findSpecialistByName(name: string): Record<string, unknown> | null {
    if (!name) return null;
    return this.state.specialistsByName[this.normalizeName(name)] || null;
  }

  public getLocIdForNode(nodeId: string): string | null {
    const entry = Object.entries(this.state.locToMapNode).find(([, mappedNodeId]) => mappedNodeId === nodeId);
    return entry ? entry[0] : null;
  }

  public getSpecialistsForMapNode(nodeId: string): Record<string, unknown>[] {
    const list = this.state.specialistsByMapNode[nodeId] || [];
    return [...list].sort((a, b) => {
      const aHired = Boolean((a as { isHired?: boolean }).isHired);
      const bHired = Boolean((b as { isHired?: boolean }).isHired);
      if (aHired !== bHired) return aHired ? 1 : -1;
      const aName = String((a as { nameVi?: string }).nameVi || '');
      const bName = String((b as { nameVi?: string }).nameVi || '');
      return aName.localeCompare(bName);
    });
  }

  public getRecruitRequirement(name: string): {
    canRecruit: boolean;
    signingBonus: number | null;
    isHired: boolean;
    reasonVi: string;
    reasonEn: string;
  } {
    const specialist = this.findSpecialistByName(name);
    if (!specialist) {
      return { canRecruit: true, signingBonus: null, isHired: false, reasonVi: '', reasonEn: '' };
    }

    const isHired = Boolean((specialist as { isHired?: boolean }).isHired);
    const signingBonus = Number((specialist as { signingBonus?: number }).signingBonus) || 0;

    if (isHired) {
      return { canRecruit: false, signingBonus, isHired, reasonVi: 'Đã được chiêu mộ', reasonEn: 'Already recruited' };
    }
    if (this.state.playerCash < signingBonus) {
      return {
        canRecruit: false,
        signingBonus,
        isHired,
        reasonVi: `Cần ${signingBonus} quan chiêu mộ`,
        reasonEn: `Need ${signingBonus} cash to recruit`
      };
    }
    return { canRecruit: true, signingBonus, isHired, reasonVi: '', reasonEn: '' };
  }

  public getActionRequirements(): {
    cash: number;
    cargoKinds: number;
    minGuardCost: number | null;
    canDispatchCaravan: boolean;
    reasonVi: string;
    reasonEn: string;
  } {
    const cash = this.state.playerCash;
    const cargoKinds = Object.values(this.state.inventory).filter(quantity => quantity > 0).length;
    const minGuardCost = this.state.guardTiers.length
      ? Math.min(...this.state.guardTiers.map(tier => Number(tier.costQian) || 0))
      : null;

    let canDispatchCaravan = true;
    let reasonVi = '';
    let reasonEn = '';

    if (minGuardCost == null) {
      canDispatchCaravan = false;
      reasonVi = 'Chưa tải được bảng giá hộ vệ';
      reasonEn = 'Guard prices are unavailable';
    } else if (cargoKinds === 0) {
      canDispatchCaravan = false;
      reasonVi = 'Kho không có hàng để xuất';
      reasonEn = 'No cargo in the warehouse';
    } else if (cash < minGuardCost) {
      canDispatchCaravan = false;
      reasonVi = `Cần tối thiểu ${minGuardCost} quan thuê hộ vệ`;
      reasonEn = `Need at least ${minGuardCost} cash for guards`;
    }

    return { cash, cargoKinds, minGuardCost, canDispatchCaravan, reasonVi, reasonEn };
  }

  public getRoute(from: string, to: string): MapLiveRoute | null {
    return this.state.routesByKey[`${from}|${to}`] || null;
  }

  public getLivingEntities(): {
    caravans: Record<string, unknown>[];
    expeditions: Record<string, unknown>[];
    bandits: Record<string, unknown>[];
    crises: Record<string, unknown>[];
  } {    const caravans = this.state.caravans
      .filter(caravan => String((caravan as { status?: string }).status).toUpperCase() === 'EN_ROUTE')
      .map(caravan => ({
        ...caravan,
        from: this.resolveMapNodeId(String((caravan as { fromSettlementId?: string }).fromSettlementId || '')),
        to: this.resolveMapNodeId(String((caravan as { toSettlementId?: string }).toSettlementId || '')),
        progress: Number((caravan as { routeProgress?: number }).routeProgress) || 0
      }))
      .filter(caravan => caravan.from && caravan.to);

    const expeditions = this.state.expeditions
      .filter(expedition => String((expedition as { status?: string }).status).toUpperCase() === 'MARCHING')
      .map(expedition => {
        const raw = expedition as {
          origin_settlement_id?: string;
          originSettlementId?: string;
          target_settlement_id?: string;
          targetSettlementId?: string;
        };
        return {
          ...expedition,
          from: this.resolveMapNodeId(String(raw.origin_settlement_id || raw.originSettlementId || '')),
          to: this.resolveMapNodeId(String(raw.target_settlement_id || raw.targetSettlementId || ''))
        };
      })
      .filter(expedition => expedition.from && expedition.to);

    const bandits = Object.entries(this.state.banditsByNode).flatMap(([nodeId, list]) =>
      list.map(bandit => ({ ...bandit, nodeId }))
    );
    const crises = Object.entries(this.state.crisesByNode).flatMap(([nodeId, list]) =>
      list.map(crisis => ({ ...crisis, nodeId }))
    );

    return { caravans, expeditions, bandits, crises };
  }

  public getStatusForMapNode(nodeId: string): {
    key: string;
    labelVi: string;
    labelEn: string;
    className: string;
  } {
    const record = this.getForMapNode(nodeId);
    if (!record) {
      return { key: 'unknown', labelVi: 'Chưa rõ', labelEn: 'Unknown', className: 'capital' };
    }

    const playerFactionId = (this.state.playerFaction as { factionId?: string } | null)?.factionId;
    const isOwn = !!(record.rulerFactionId && playerFactionId && record.rulerFactionId === playerFactionId);
    const garrison = Number(record.garrisonTroops ?? 0);
    const grain = Number(record.granaryGrain ?? 0);
    const order = Number(record.publicOrder ?? 100);

    if (!isOwn) {
      return { key: 'foreign', labelVi: 'Ngoại Bang', labelEn: 'Foreign Holding', className: 'capital' };
    }
    if (garrison < 200 || grain <= 0 || order < 30) {
      return { key: 'strained', labelVi: 'Suy Yếu', labelEn: 'Strained', className: 'battle' };
    }
    return { key: 'stable', labelVi: 'An Định', labelEn: 'Stable', className: 'safe' };
  }

  public getThreatForMapNode(nodeId: string): {
    level: 'LOW' | 'MODERATE' | 'HIGH';
    labelVi: string;
    labelEn: string;
    color: string;
    reasonsVi: string[];
    reasonsEn: string[];
  } {
    const record = this.getForMapNode(nodeId);
    const bandits = this.state.banditsByNode[nodeId] || [];
    const crises = this.state.crisesByNode[nodeId] || [];
    const reasonsVi: string[] = [];
    const reasonsEn: string[] = [];
    let score = 0;

    if (bandits.length > 0) {
      const maxPower = Math.max(
        ...bandits.map(bandit => Number((bandit as { banditPower?: number }).banditPower) || 0)
      );
      score += Math.min(3, maxPower / 150);
      reasonsVi.push(`${bandits.length} ổ phỉ`);
      reasonsEn.push(`${bandits.length} bandit lair${bandits.length > 1 ? 's' : ''}`);
    }

    crises.forEach(crisis => {
      const severity = Number((crisis as { severityLevel?: number }).severityLevel) || 1;
      score += Math.min(3, severity);
      const title = (crisis as { titleVi?: string }).titleVi || 'Khủng hoảng';
      reasonsVi.push(title);
      reasonsEn.push(title);
    });

    const garrison = record && Number.isFinite(record.garrisonTroops)
      ? Number(record.garrisonTroops)
      : null;
    const order = record && Number.isFinite(record.publicOrder)
      ? Number(record.publicOrder)
      : null;

    if (garrison != null && garrison < 500) {
      score += 1;
      reasonsVi.push('Đồn trú mỏng');
      reasonsEn.push('Thin garrison');
    }
    if (order != null && order < 40) {
      score += 1;
      reasonsVi.push('Trật tự thấp');
      reasonsEn.push('Low public order');
    }

    const level: 'LOW' | 'MODERATE' | 'HIGH' = score >= 3 ? 'HIGH' : score >= 1.5 ? 'MODERATE' : 'LOW';
    const meta = {
      LOW: { labelVi: 'Thấp', labelEn: 'Low', color: '#34d399' },
      MODERATE: { labelVi: 'Vừa', labelEn: 'Moderate', color: '#fbbf24' },
      HIGH: { labelVi: 'Cao', labelEn: 'High', color: '#f87171' }
    }[level];

    return { level, ...meta, reasonsVi, reasonsEn };
  }

  public getResourceDistribution(): {
    byNode: Record<string, { types: Record<string, number>; nodes: Record<string, unknown>[] }>;
    totals: Record<string, number>;
    types: string[];
  } {
    return {
      byNode: this.state.resourcesByNode,
      totals: this.state.resourceTotals,
      types: Object.keys(this.state.resourceTotals).sort()
    };
  }

  public getResourceNodesForMapNode(nodeId: string): Record<string, unknown>[] {
    return this.state.resourcesByNode[nodeId]?.nodes || [];
  }

  public hasArmy(): boolean {
    return Array.isArray(this.state.activeExpeditions) && this.state.activeExpeditions.length > 0;
  }

  public getState(): MapLiveState {
    return this.state;
  }
}

export const mapLiveService = new MapLiveService();
