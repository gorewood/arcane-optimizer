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
  ItemPurpose,
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
import { buildExportData, parseImportData } from "./user-data-helpers";
import {
  createEquipmentActions,
  createEnchantmentActions,
  createModifierActions,
  createGemActions,
  createVariantTypeActions,
} from "./user-data-crud";
import {
  detectAllDuplicates,
  buildUserDataSyncSummary,
  getChangelogEntryForCurrentVersion,
  purgeDuplicates,
  type SyncSummary,
  type DuplicateMatch,
} from "./user-data-sync";
import { detectEquipmentDuplicates } from "@/data/sync-utils";
import type { ChangelogEntry } from "@/data/user-data-schemas";
import dataManifest from "@/data/data-manifest.json";

// Re-export sync types for dialog use
export type { SyncSummary, DuplicateMatch };

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
  addEquipment: (item: EquipmentPiece, purpose?: ItemPurpose) => string;
  updateEquipment: (id: string, item: EquipmentPiece) => void;
  deleteEquipment: (id: string) => void;
  restoreEquipment: (id: string) => void;
  addEnchantment: (item: Enchantment, purpose?: ItemPurpose) => string;
  updateEnchantment: (id: string, item: Enchantment) => void;
  deleteEnchantment: (id: string) => void;
  restoreEnchantment: (id: string) => void;
  addModifier: (item: Modifier, purpose?: ItemPurpose) => string;
  updateModifier: (id: string, item: Modifier) => void;
  deleteModifier: (id: string) => void;
  restoreModifier: (id: string) => void;
  addGem: (item: Gem, purpose?: ItemPurpose) => string;
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
  getSyncSummary: () => SyncSummary;
  getChangelogEntry: () => ChangelogEntry | undefined;
  getEquipmentDuplicates: () => readonly DuplicateMatch[];
  performSync: () => void;
}

// ---------------------------------------------------------------------------
// Bundled Data Cache
// ---------------------------------------------------------------------------

let cachedEquipment: readonly EquipmentPiece[] | null = null;
let cachedEnchantments: readonly Enchantment[] | null = null;
let cachedModifiers: readonly Modifier[] | null = null;
let cachedGems: readonly Gem[] | null = null;
let cachedVariantTypes: VariantTypes | null = null;

const bundledGetters = {
  getBundledEquipment: (): readonly EquipmentPiece[] => {
    cachedEquipment ??= loadEquipment();
    return cachedEquipment;
  },
  getBundledEnchantments: (): readonly Enchantment[] => {
    cachedEnchantments ??= loadEnchantments();
    return cachedEnchantments;
  },
  getBundledModifiers: (): readonly Modifier[] => {
    cachedModifiers ??= loadModifiers();
    return cachedModifiers;
  },
  getBundledGems: (): readonly Gem[] => {
    cachedGems ??= loadGems();
    return cachedGems;
  },
  getBundledVariantTypes: (): VariantTypes => {
    cachedVariantTypes ??= loadVariantTypes();
    return cachedVariantTypes;
  },
};

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
// Type aliases
// ---------------------------------------------------------------------------

type SetFn = (fn: (state: UserDataState) => Partial<UserDataState>) => void;
type GetFn = () => UserDataState & UserDataActions;

// ---------------------------------------------------------------------------
// Getter Actions
// ---------------------------------------------------------------------------

function createGetterActions(get: GetFn) {
  return {
    getMergedEquipment: () => mergeItems(bundledGetters.getBundledEquipment(), get().userEquipment),
    getMergedEnchantments: () => mergeItems(bundledGetters.getBundledEnchantments(), get().userEnchantments),
    getMergedModifiers: () => mergeItems(bundledGetters.getBundledModifiers(), get().userModifiers),
    getMergedGems: () => mergeItems(bundledGetters.getBundledGems(), get().userGems),
    getMergedVariantTypes: () => mergeVariantTypes(bundledGetters.getBundledVariantTypes(), get().userVariantTypes),
    getDeletedEquipment: () => getDeletedItems(bundledGetters.getBundledEquipment(), get().userEquipment),
    getDeletedEnchantments: () => getDeletedItems(bundledGetters.getBundledEnchantments(), get().userEnchantments),
    getDeletedModifiers: () => getDeletedItems(bundledGetters.getBundledModifiers(), get().userModifiers),
    getDeletedGems: () => getDeletedItems(bundledGetters.getBundledGems(), get().userGems),
    getDeletedVariantTypes: () => getDeletedVariantTypes(bundledGetters.getBundledVariantTypes(), get().userVariantTypes),
    getVariantTypesRecord: () => toVariantTypesRecord(get().getMergedVariantTypes()),
  };
}

// ---------------------------------------------------------------------------
// Import/Export Actions
// ---------------------------------------------------------------------------

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
        const bundledKeys = new Set(Object.keys(bundledGetters.getBundledVariantTypes()));
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
// Sync Actions
// ---------------------------------------------------------------------------

function createSyncActions(set: SetFn, get: GetFn) {
  const getAllDuplicates = () =>
    detectAllDuplicates({
      userEquipment: get().userEquipment,
      userEnchantments: get().userEnchantments,
      userModifiers: get().userModifiers,
      userGems: get().userGems,
      bundledEquipment: bundledGetters.getBundledEquipment(),
      bundledEnchantments: bundledGetters.getBundledEnchantments(),
      bundledModifiers: bundledGetters.getBundledModifiers(),
      bundledGems: bundledGetters.getBundledGems(),
    });

  return {
    getEquipmentDuplicates: () => detectEquipmentDuplicates(get().userEquipment, bundledGetters.getBundledEquipment()),
    getChangelogEntry: () => getChangelogEntryForCurrentVersion(),
    getSyncSummary: (): SyncSummary => {
      const state = get();
      return buildUserDataSyncSummary({
        duplicates: getAllDuplicates(),
        userEquipment: state.userEquipment,
        userEnchantments: state.userEnchantments,
        userModifiers: state.userModifiers,
        userGems: state.userGems,
      });
    },
    performSync: () => {
      const state = get();
      const purged = purgeDuplicates({
        duplicates: getAllDuplicates(),
        userEquipment: state.userEquipment,
        userEnchantments: state.userEnchantments,
        userModifiers: state.userModifiers,
        userGems: state.userGems,
      });
      set(() => ({ ...purged, bundledVersion: dataManifest.version }));
    },
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
      ...createEquipmentActions(set, get, bundledGetters),
      ...createEnchantmentActions(set, get, bundledGetters),
      ...createModifierActions(set, get, bundledGetters),
      ...createGemActions(set, get, bundledGetters),
      ...createVariantTypeActions(set, get, bundledGetters),
      ...createGetterActions(get),
      ...createImportExportActions(set, get),
      ...createSyncActions(set, get),
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
