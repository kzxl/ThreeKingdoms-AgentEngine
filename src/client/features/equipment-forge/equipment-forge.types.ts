/**
 * ThreeKingdoms-AgentEngine: Equipment & Forge Types
 * (src/client/features/equipment-forge/equipment-forge.types.ts)
 */

export interface EquippedSlot {
  slot: 'WEAPON' | 'ARMOR' | 'STEED' | 'TREASURE';
  itemCode: string | null;
  nameVi: string | null;
  nameEn?: string | null;
  statModifierDesc?: string | null;
  quality?: string | null;
}

export interface EquipmentOverview {
  characterId: string;
  characterNameVi: string;
  baseStats: Record<string, number>;
  effectiveStats: Record<string, number>;
  slots: Record<'WEAPON' | 'ARMOR' | 'STEED' | 'TREASURE', EquippedSlot>;
  inventoryGear: Array<{
    itemCode: string;
    nameVi: string;
    slot: string;
    quantity: number;
    statModifiers?: Record<string, number>;
  }>;
}

export interface BespokeForgePayload {
  characterId: string;
  weaponNameVi: string;
  weaponCategory: 'BLADE' | 'SPEAR' | 'HALBERD' | 'SWORD' | 'BOW';
  targetAttr: 'war' | 'ldr' | 'int' | 'com' | 'pol' | 'cra';
  materialTier: 'STANDARD' | 'FINE' | 'LEGENDARY';
  destination: 'EQUIP' | 'WAREHOUSE' | 'GIFT';
  giftTargetNpcId?: string;
}
