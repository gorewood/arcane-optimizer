/**
 * GearPoolStore — manages which equipment, enchantments, modifiers,
 * and gems are enabled for search. Persisted to localStorage.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  loadEquipment,
  loadEnchantments,
  loadModifiers,
  loadGems,
} from "@/data/loaders";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface GearPoolState {
  /** Set of enabled equipment IDs */
  enabledEquipmentIds: ReadonlySet<string>;
  /** Set of enabled enchantment IDs */
  enabledEnchantmentIds: ReadonlySet<string>;
  /** Set of enabled modifier IDs */
  enabledModifierIds: ReadonlySet<string>;
  /** Set of enabled gem IDs */
  enabledGemIds: ReadonlySet<string>;
}

export interface GearPoolActions {
  toggleEquipment: (id: string) => void;
  toggleEnchantment: (id: string) => void;
  toggleModifier: (id: string) => void;
  toggleGem: (id: string) => void;
  enableAll: () => void;
  disableAll: () => void;
  /** Bulk enable by tag (e.g., enable all "sunken" items) */
  enableByTag: (
    tag: string,
    equipmentList: readonly { id: string; tags: readonly string[] }[],
  ) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleSetItem(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Serialized Shape (Sets -> Arrays for JSON)
// ---------------------------------------------------------------------------

interface GearPoolSerialized {
  enabledEquipmentIds: string[];
  enabledEnchantmentIds: string[];
  enabledModifierIds: string[];
  enabledGemIds: string[];
}

// ---------------------------------------------------------------------------
// Custom storage adapter: Set <-> Array conversion
// ---------------------------------------------------------------------------

function createSetStorage(): ReturnType<typeof createJSONStorage<GearPoolState>> {
  return createJSONStorage<GearPoolState>(() => localStorage, {
    replacer: (_key: string, value: unknown): unknown => {
      if (value instanceof Set) {
        return [...value];
      }
      return value;
    },
    reviver: (_key: string, value: unknown): unknown => value,
  });
}

/**
 * Merge persisted IDs with current, adding any new items from game data.
 * This ensures new equipment added to JSON is automatically enabled.
 */
function mergePersistedState(
  persisted: unknown,
  current: GearPoolState & GearPoolActions,
): GearPoolState & GearPoolActions {
  if (persisted == null || typeof persisted !== "object") {
    return current;
  }
  const raw = persisted as Partial<GearPoolSerialized>;
  const allEquipmentIds = new Set(loadEquipment().map((e) => e.id));
  const allEnchantmentIds = new Set(loadEnchantments().map((e) => e.id));
  const allModifierIds = new Set(loadModifiers().map((m) => m.id));
  const allGemIds = new Set(loadGems().map((g) => g.id));

  // Merge persisted IDs, adding any new items not in persisted set
  const mergeIds = (
    persistedIds: string[] | undefined,
    allIds: Set<string>,
  ): Set<string> => {
    if (!Array.isArray(persistedIds)) return allIds;
    const persisted = new Set<string>(persistedIds);
    // Add any new IDs that weren't in the persisted set
    for (const id of allIds) {
      if (!persisted.has(id)) persisted.add(id);
    }
    // Remove IDs that no longer exist
    for (const id of persisted) {
      if (!allIds.has(id)) persisted.delete(id);
    }
    return persisted;
  };

  return {
    ...current,
    enabledEquipmentIds: mergeIds(raw.enabledEquipmentIds, allEquipmentIds),
    enabledEnchantmentIds: mergeIds(raw.enabledEnchantmentIds, allEnchantmentIds),
    enabledModifierIds: mergeIds(raw.enabledModifierIds, allModifierIds),
    enabledGemIds: mergeIds(raw.enabledGemIds, allGemIds),
  };
}

// ---------------------------------------------------------------------------
// All-IDs helper (for default state + Enable All)
// ---------------------------------------------------------------------------

function buildAllEnabledState(): GearPoolState {
  return {
    enabledEquipmentIds: new Set(loadEquipment().map((e) => e.id)),
    enabledEnchantmentIds: new Set(loadEnchantments().map((e) => e.id)),
    enabledModifierIds: new Set(loadModifiers().map((m) => m.id)),
    enabledGemIds: new Set(loadGems().map((g) => g.id)),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const EMPTY_STATE: GearPoolState = {
  enabledEquipmentIds: new Set<string>(),
  enabledEnchantmentIds: new Set<string>(),
  enabledModifierIds: new Set<string>(),
  enabledGemIds: new Set<string>(),
};

const INITIAL_STATE: GearPoolState = buildAllEnabledState();

export const useGearPoolStore = create<GearPoolState & GearPoolActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      toggleEquipment: (id: string): void => {
        set((s) => ({ enabledEquipmentIds: toggleSetItem(s.enabledEquipmentIds, id) }));
      },

      toggleEnchantment: (id: string): void => {
        set((s) => ({ enabledEnchantmentIds: toggleSetItem(s.enabledEnchantmentIds, id) }));
      },

      toggleModifier: (id: string): void => {
        set((s) => ({ enabledModifierIds: toggleSetItem(s.enabledModifierIds, id) }));
      },

      toggleGem: (id: string): void => {
        set((s) => ({ enabledGemIds: toggleSetItem(s.enabledGemIds, id) }));
      },

      enableAll: (): void => {
        set(buildAllEnabledState());
      },

      disableAll: (): void => {
        set(EMPTY_STATE);
      },

      enableByTag: (
        tag: string,
        equipmentList: readonly { id: string; tags: readonly string[] }[],
      ): void => {
        set((s) => {
          const next = new Set(s.enabledEquipmentIds);
          for (const item of equipmentList) {
            if (item.tags.includes(tag)) {
              next.add(item.id);
            }
          }
          return { enabledEquipmentIds: next };
        });
      },
    }),
    {
      name: "ao-gear-pool",
      version: 1,
      storage: createSetStorage(),
      merge: mergePersistedState,
      migrate: () => buildAllEnabledState(),
    },
  ),
);
