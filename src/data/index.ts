/**
 * Barrel export for game data — loaders and schemas.
 */

export {
  loadEnchantments,
  loadEquipment,
  loadGearPool,
  loadGems,
  loadModifiers,
  loadVariantTypes,
} from "./loaders";

export { buildMergedGearPool } from "./merged-loaders";
export type { MergedGetters, EnabledIds } from "./merged-loaders";

export {
  enchantmentArraySchema,
  enchantmentSchema,
  equipmentArraySchema,
  equipmentSchema,
  gemArraySchema,
  gemSchema,
  modifierArraySchema,
  modifierSchema,
  variantTypesSchema,
} from "./schemas";

// User data types
export type {
  UserItemRecord,
  UserEquipmentRecord,
  UserEnchantmentRecord,
  UserModifierRecord,
  UserGemRecord,
  UserVariantTypes,
  MergedItem,
  UserDataStorage,
  UserDataExport,
} from "./user-data-types";

// User data schemas
export {
  userEquipmentRecordSchema,
  userEnchantmentRecordSchema,
  userModifierRecordSchema,
  userGemRecordSchema,
  userVariantTypesSchema,
  userDataStorageSchema,
  userDataExportSchema,
  dataManifestSchema,
} from "./user-data-schemas";

// Merge functions
export {
  mergeItems,
  getDeletedItems,
  mergeVariantTypes,
  getDeletedVariantTypes,
  toVariantTypesRecord,
} from "./merge-user-data";
