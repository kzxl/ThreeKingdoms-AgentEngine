/**
 * ThreeKingdoms-AgentEngine: Bespoke Forge Constants & Rules
 * (src/modules/professions/features/bespoke-forge/bespoke-forge.constants.ts)
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

export const BESPOKE_FORGE_RULES = {
  MIN_CRA_REQUIRED: 50,
  FATIGUE_COST: 25,
  EXP_GAIN: 60,
  STAT_MIN: 1,
  STAT_MAX: 5,
  BASE_RECIPE_MATERIALS: [
    { itemCode: 'RAW-IRON-INGOT', altCode: 'RAW-IRON-ORE', nameVi: 'Phôi Sắt Tinh Luyện', quantity: 4 },
    { itemCode: 'RAW-COAL', altCode: 'RAW-COAL-MINE', nameVi: 'Than Lò Đúc Kiếm', quantity: 3 },
    { itemCode: 'COM-TIMBER', altCode: 'RAW-TIMBER-OAK', nameVi: 'Gỗ Sồi Cán Binh Khí', quantity: 2 },
    { itemCode: 'COM-LEATH', altCode: 'RAW-LEATHER-OX', nameVi: 'Da Thuộc Bọc Cán', quantity: 2 }
  ]
} as const;

export type BespokeWeaponType = 'SWORD' | 'SPEAR' | 'HALBERD' | 'BLADE' | 'BOW';

export interface WeaponTypeMeta {
  type: BespokeWeaponType;
  nameVi: string;
  nameEn: string;
  seal: string;
  defaultPrefixVi: string;
  defaultPrefixEn: string;
  primaryAttr: 'war' | 'ldr';
  secondaryAttr?: 'war' | 'ldr' | 'int';
}

export const BESPOKE_WEAPON_CATALOG: Record<BespokeWeaponType, WeaponTypeMeta> = {
  SWORD: {
    type: 'SWORD',
    nameVi: 'Trọng Kiếm / Bảo Kiếm',
    nameEn: 'Double-Edged Han Sword',
    seal: '劍',
    defaultPrefixVi: 'Cổ Đĩnh Kiếm',
    defaultPrefixEn: 'Ancient Han Longsword',
    primaryAttr: 'war',
    secondaryAttr: 'ldr'
  },
  SPEAR: {
    type: 'SPEAR',
    nameVi: 'Trường Thương / Thiết Thương',
    nameEn: 'Iron Long Spear',
    seal: '槍',
    defaultPrefixVi: 'Phá Quân Thương',
    defaultPrefixEn: 'Breaker Iron Spear',
    primaryAttr: 'war',
    secondaryAttr: 'ldr'
  },
  HALBERD: {
    type: 'HALBERD',
    nameVi: 'Phương Thiên Họa Kích',
    nameEn: 'Crescent Halberd',
    seal: '戟',
    defaultPrefixVi: 'Bá Vương Kích',
    defaultPrefixEn: 'Overlord Halberd',
    primaryAttr: 'war',
    secondaryAttr: 'ldr'
  },
  BLADE: {
    type: 'BLADE',
    nameVi: 'Thanh Long Đao / Trảm Mã Đao',
    nameEn: 'Horse-Cleaving Broadsword',
    seal: '刀',
    defaultPrefixVi: 'Xích Viêm Đao',
    defaultPrefixEn: 'Crimson Flame Saber',
    primaryAttr: 'war',
    secondaryAttr: 'ldr'
  },
  BOW: {
    type: 'BOW',
    nameVi: 'Thần Tí Cung / Thiết Thai Cung',
    nameEn: 'Iron Reflex Longbow',
    seal: '弓',
    defaultPrefixVi: 'Xuyên Vân Cung',
    defaultPrefixEn: 'Cloud-Piercing Bow',
    primaryAttr: 'war',
    secondaryAttr: 'int'
  }
};
