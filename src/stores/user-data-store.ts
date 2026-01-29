/**
 * UserDataStore — manages user overrides for game data.
 *
 * Merges bundled game data with user-created and modified items.
 * Provides CRUD operations and export/import functionality.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  EquipmentPiece,
  Enchantment,
  Modifier,
  Gem,
  VariantTypeEntry,
  VariantTypes,
} from "@/models/types";
import type {
  UserEquipmentRecord,
  UserEnchantmentRecord,
  UserModifierRecord,
  UserGemRecord,
  UserVariantTypes,
  MergedItem,
} from "@/data/user-data-types";
import { userDataStorageSchema, userDataExportSchema } from "@/data/user-data-schemas";
import {
  mergeItems,
  getDeletedItems,
  mergeVariantTypes,
  getDeletedVariantTypes,
  toVariantTypesRecord,
} from "@/data/merge-user-data";
import {
  loadEquipment,
  loadEnchantments,
  loadModifiers,
  loadGems,
  loadVariantTypes,
} from "@/data/loaders";
import {
  addEquipmentRecord,
  updateEquipmentRecord,
  deleteEquipmentRecord,
  restoreEquipmentRecord,
  addEnchantmentRecord,
  updateEnchantmentRecord,
  deleteEnchantmentRecord,
  restoreEnchantmentRecord,
  addModifierRecord,
  updateModifierRecord,
  deleteModifierRecord,
  restoreModifierRecord,
  addGemRecord,
  updateGemRecord,
  deleteGemRecord,
  restoreGemRecord,
  buildExportData,
  parseImportData,
} from "./user-data-helpers";
import dataManifest from "@/data/data-manifest.json";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface UserDataState {
  readonly userEquipment: readonly UserEquipmentRecord[];
  readonly userEnchantments: readonly UserEnchantmentRecord[];
  readonly userModifiers: readonly UserModifierRecord[];
  readonly userGems: readonly UserGemRecord[];
  readonly userVariantTypes: UserVariantTypes;
  readonly bundledVersion: number;
}

export interface UserDataActions {
  addEquipment: (item: EquipmentPiece) => string;
  updateEquipment: (id: string, item: EquipmentPiece) => void;
  deleteEquipment: (id: string) => void;
  restoreEquipment: (id: string) => void;
  addEnchantment: (item: Enchantment) => string;
  updateEnchantment: (id: string, item: Enchantment) => void;
  deleteEnchantment: (id: string) => void;
  restoreEnchantment: (id: string) => void;
  addModifier: (item: Modifier) => string;
  updateModifier: (id: string, item: Modifier) => void;
  deleteModifier: (id: string) => void;
  restoreModifier: (id: string) => void;
  addGem: (item: Gem) => string;
  updateGem: (id: string, item: Gem) => void;
  deleteGem: (id: string) => void;
  restoreGem: (id: string) => void;
  addVariantType: (key: string, entry: VariantTypeEntry) => void;
  updateVariantType: (key: string, entry: VariantTypeEntry) => void;
  deleteVariantType: (key: string) => void;
  restoreVariantType: (key: string) => void;
  getMergedEquipment: () => readonly MergedItem<EquipmentPiece>[];
  getMergedEnchantments: () => readonly MergedItem<Enchantment>[];
  getMergedModifiers: () => readonly MergedItem<Modifier>[];
  getMergedGems: () => readonly MergedItem<Gem>[];
  getMergedVariantTypes: () => readonly MergedItem<VariantTypeEntry & { readonly key: string }>[];
  getDeletedEquipment: () => readonly MergedItem<EquipmentPiece>[];
  getDeletedEnchantments: () => readonly MergedItem<Enchantment>[];
  getDeletedModifiers: () => readonly MergedItem<Modifier>[];
  getDeletedGems: () => readonly MergedItem<Gem>[];
  getDeletedVariantTypes: () => readonly MergedItem<VariantTypeEntry & { readonly key: string }>[];
  getVariantTypesRecord: () => VariantTypes;
  exportData: () => string;
  importData: (json: string) => { imported: number; errors: string[] };
  clearAllUserData: () => void;
  checkBundledUpdate: () => boolean;
  updateStoredVersion: () => void;
}

// ---------------------------------------------------------------------------
// Bundled Data Cache
// ---------------------------------------------------------------------------

let cachedEquipment: readonly EquipmentPiece[] | null = null;
let cachedEnchantments: readonly Enchantment[] | null = null;
let cachedModifiers: readonly Modifier[] | null = null;
let cachedGems: readonly Gem[] | null = null;
let cachedVariantTypes: VariantTypes | null = null;

function getBundledEquipment(): readonly EquipmentPiece[] {
  cachedEquipment ??= loadEquipment();
  return cachedEquipment;
}

function getBundledEnchantments(): readonly Enchantment[] {
  cachedEnchantments ??= loadEnchantments();
  return cachedEnchantments;
}

function getBundledModifiers(): readonly Modifier[] {
  cachedModifiers ??= loadModifiers();
  return cachedModifiers;
}

function getBundledGems(): readonly Gem[] {
  cachedGems ??= loadGems();
  return cachedGems;
}

function getBundledVariantTypes(): VariantTypes {
  cachedVariantTypes ??= loadVariantTypes();
  return cachedVariantTypes;
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

const emptyVariantTypes: UserVariantTypes = {
  additions: {},
  modifications: {},
  deletedKeys: [],
};

const emptyState: UserDataState = {
  userEquipment: [],
  userEnchantments: [],
  userModifiers: [],
  userGems: [],
  userVariantTypes: emptyVariantTypes,
  bundledVersion: dataManifest.version,
};

// ---------------------------------------------------------------------------
// Type aliases for store functions
// ---------------------------------------------------------------------------

type SetFn = (fn: (state: UserDataState) => Partial<UserDataState>) => void;
type GetFn = () => UserDataState & UserDataActions;

// ---------------------------------------------------------------------------
// CRUD Action Factories
// ---------------------------------------------------------------------------

function createEquipmentActions(set: SetFn, get: GetFn) {
  return {
    addEquipment: (item: EquipmentPiece) => {
      const result = addEquipmentRecord(get().userEquipment, item);
      set(() => ({ userEquipment: result.records }));
      return result.id;
    },
    updateEquipment: (id: string, item: EquipmentPiece) => {
      set(() => ({ userEquipment: updateEquipmentRecord(get().userEquipment, getBundledEquipment(), id, item) }));
    },
    deleteEquipment: (id: string) => {
      set(() => ({ userEquipment: deleteEquipmentRecord(get().userEquipment, getBundledEquipment(), id) }));
    },
    restoreEquipment: (id: string) => {
      set(() => ({ userEquipment: restoreEquipmentRecord(get().userEquipment, id) }));
    },
  };
}

function createEnchantmentActions(set: SetFn, get: GetFn) {
  return {
    addEnchantment: (item: Enchantment) => {
      const result = addEnchantmentRecord(get().userEnchantments, item);
      set(() => ({ userEnchantments: result.records }));
      return result.id;
    },
    updateEnchantment: (id: string, item: Enchantment) => {
      set(() => ({ userEnchantments: updateEnchantmentRecord(get().userEnchantments, getBundledEnchantments(), id, item) }));
    },
    deleteEnchantment: (id: string) => {
      set(() => ({ userEnchantments: deleteEnchantmentRecord(get().userEnchantments, getBundledEnchantments(), id) }));
    },
    restoreEnchantment: (id: string) => {
      set(() => ({ userEnchantments: restoreEnchantmentRecord(get().userEnchantments, id) }));
    },
  };
}

function createModifierActions(set: SetFn, get: GetFn) {
  return {
    addModifier: (item: Modifier) => {
      const result = addModifierRecord(get().userModifiers, item);
      set(() => ({ userModifiers: result.records }));
      return result.id;
    },
    updateModifier: (id: string, item: Modifier) => {
      set(() => ({ userModifiers: updateModifierRecord(get().userModifiers, getBundledModifiers(), id, item) }));
    },
    deleteModifier: (id: string) => {
      set(() => ({ userModifiers: deleteModifierRecord(get().userModifiers, getBundledModifiers(), id) }));
    },
    restoreModifier: (id: string) => {
      set(() => ({ userModifiers: restoreModifierRecord(get().userModifiers, id) }));
    },
  };
}

function createGemActions(set: SetFn, get: GetFn) {
  return {
    addGem: (item: Gem) => {
      const result = addGemRecord(get().userGems, item);
      set(() => ({ userGems: result.records }));
      return result.id;
    },
    updateGem: (id: string, item: Gem) => {
      set(() => ({ userGems: updateGemRecord(get().userGems, getBundledGems(), id, item) }));
    },
    deleteGem: (id: string) => {
      set(() => ({ userGems: deleteGemRecord(get().userGems, getBundledGems(), id) }));
    },
    restoreGem: (id: string) => {
      set(() => ({ userGems: restoreGemRecord(get().userGems, id) }));
    },
  };
}

function createVariantTypeActions(set: SetFn, _get: GetFn) {
  return {
    addVariantType: (key: string, entry: VariantTypeEntry) => {
      set((s) => ({
        userVariantTypes: { ...s.userVariantTypes, additions: { ...s.userVariantTypes.additions, [key]: entry } },
      }));
    },
    updateVariantType: (key: string, entry: VariantTypeEntry) => {
      const bundled = getBundledVariantTypes();
      set((s) => {
        if (key in bundled) {
          return { userVariantTypes: { ...s.userVariantTypes, modifications: { ...s.userVariantTypes.modifications, [key]: entry } } };
        }
        return { userVariantTypes: { ...s.userVariantTypes, additions: { ...s.userVariantTypes.additions, [key]: entry } } };
      });
    },
    deleteVariantType: (key: string) => {
      const bundled = getBundledVariantTypes();
      set((s) => {
        if (key in bundled) {
          return { userVariantTypes: { ...s.userVariantTypes, deletedKeys: [...s.userVariantTypes.deletedKeys, key] } };
        }
        const { [key]: _, ...rest } = s.userVariantTypes.additions;
        return { userVariantTypes: { ...s.userVariantTypes, additions: rest } };
      });
    },
    restoreVariantType: (key: string) => {
      set((s) => ({
        userVariantTypes: { ...s.userVariantTypes, deletedKeys: s.userVariantTypes.deletedKeys.filter((k) => k !== key) },
      }));
    },
  };
}

function createGetterActions(get: GetFn) {
  return {
    getMergedEquipment: () => mergeItems(getBundledEquipment(), get().userEquipment),
    getMergedEnchantments: () => mergeItems(getBundledEnchantments(), get().userEnchantments),
    getMergedModifiers: () => mergeItems(getBundledModifiers(), get().userModifiers),
    getMergedGems: () => mergeItems(getBundledGems(), get().userGems),
    getMergedVariantTypes: () => mergeVariantTypes(getBundledVariantTypes(), get().userVariantTypes),
    getDeletedEquipment: () => getDeletedItems(getBundledEquipment(), get().userEquipment),
    getDeletedEnchantments: () => getDeletedItems(getBundledEnchantments(), get().userEnchantments),
    getDeletedModifiers: () => getDeletedItems(getBundledModifiers(), get().userModifiers),
    getDeletedGems: () => getDeletedItems(getBundledGems(), get().userGems),
    getDeletedVariantTypes: () => getDeletedVariantTypes(getBundledVariantTypes(), get().userVariantTypes),
    getVariantTypesRecord: () => toVariantTypesRecord(get().getMergedVariantTypes()),
  };
}

function createImportExportActions(set: SetFn, get: GetFn) {
  return {
    exportData: () => {
      const state = get();
      const exportObj = buildExportData({
        userEquipment: state.userEquipment,
        userEnchantments: state.userEnchantments,
        userModifiers: state.userModifiers,
        userGems: state.userGems,
        userVariantTypesAdditions: state.userVariantTypes.additions,
        userVariantTypesModifications: state.userVariantTypes.modifications,
        userVariantTypesDeletedKeys: state.userVariantTypes.deletedKeys,
      });
      return JSON.stringify(exportObj, null, 2);
    },
    importData: (json: string) => {
      try {
        const parsed = JSON.parse(json) as unknown;
        const result = userDataExportSchema.safeParse(parsed);
        if (!result.success) return { imported: 0, errors: ["Invalid export format"] };
        const bundledKeys = new Set(Object.keys(getBundledVariantTypes()));
        const importResult = parseImportData(result.data, bundledKeys);
        set(() => ({
          userEquipment: importResult.equipment,
          userEnchantments: importResult.enchantments,
          userModifiers: importResult.modifiers,
          userGems: importResult.gems,
          userVariantTypes: {
            additions: importResult.variantAdditions,
            modifications: importResult.variantModifications,
            deletedKeys: importResult.variantDeletedKeys,
          },
        }));
        return { imported: importResult.imported, errors: [] };
      } catch (e) {
        return { imported: 0, errors: [`Parse error: ${e instanceof Error ? e.message : String(e)}`] };
      }
    },
    clearAllUserData: () => { set(() => emptyState); },
    checkBundledUpdate: () => dataManifest.version > get().bundledVersion,
    updateStoredVersion: () => { set(() => ({ bundledVersion: dataManifest.version })); },
  };
}

// ---------------------------------------------------------------------------
// Persistence Merge Helper
// ---------------------------------------------------------------------------

interface PersistedShape {
  bundledVersion?: unknown;
  userEquipment?: unknown;
  userEnchantments?: unknown;
  userModifiers?: unknown;
  userGems?: unknown;
  userVariantTypes?: unknown;
}

function mergePersisted(
  persisted: unknown,
  current: UserDataState & UserDataActions,
): UserDataState & UserDataActions {
  if (persisted === null || typeof persisted !== "object") return current;

  const p = persisted as PersistedShape;
  const parsed = userDataStorageSchema.safeParse({
    schemaVersion: 1,
    bundledVersion: typeof p.bundledVersion === "number" ? p.bundledVersion : dataManifest.version,
    equipment: Array.isArray(p.userEquipment) ? p.userEquipment : [],
    enchantments: Array.isArray(p.userEnchantments) ? p.userEnchantments : [],
    modifiers: Array.isArray(p.userModifiers) ? p.userModifiers : [],
    gems: Array.isArray(p.userGems) ? p.userGems : [],
    variantTypes: p.userVariantTypes ?? emptyVariantTypes,
  });

  if (!parsed.success) return current;

  return {
    ...current,
    userEquipment: parsed.data.equipment,
    userEnchantments: parsed.data.enchantments,
    userModifiers: parsed.data.modifiers,
    userGems: parsed.data.gems,
    userVariantTypes: parsed.data.variantTypes,
    bundledVersion: parsed.data.bundledVersion,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUserDataStore = create<UserDataState & UserDataActions>()(
  persist(
    (set, get) => ({
      ...emptyState,
      ...createEquipmentActions(set, get),
      ...createEnchantmentActions(set, get),
      ...createModifierActions(set, get),
      ...createGemActions(set, get),
      ...createVariantTypeActions(set, get),
      ...createGetterActions(get),
      ...createImportExportActions(set, get),
    }),
    {
      name: "ao-user-data",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userEquipment: state.userEquipment,
        userEnchantments: state.userEnchantments,
        userModifiers: state.userModifiers,
        userGems: state.userGems,
        userVariantTypes: state.userVariantTypes,
        bundledVersion: state.bundledVersion,
      }),
      merge: mergePersisted,
    },
  ),
);
