/**
 * FitnessStore — manages the fitness function configuration
 * (soft constraints, presets, and enabled variants). Persisted to localStorage.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SoftConstraint } from "@/models/types";
import { loadDefaultProfiles, loadVariantTypes } from "@/data/loaders";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface FitnessState {
  constraints: readonly SoftConstraint[];
  activeProfileName: string | null;
  enabledVariants: ReadonlySet<string>;
}

export interface FitnessActions {
  setConstraints: (constraints: readonly SoftConstraint[]) => void;
  addConstraint: (constraint: SoftConstraint) => void;
  removeConstraint: (index: number) => void;
  updateConstraint: (index: number, constraint: SoftConstraint) => void;
  loadPreset: (name: string, constraints: readonly SoftConstraint[]) => void;
  clearPreset: () => void;
  toggleVariant: (variant: string) => void;
  setEnabledVariants: (variants: ReadonlySet<string>) => void;
  enableAllVariantsOfType: (typeId: string) => void;
  disableAllVariantsOfType: (typeId: string) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function getInitialState(): FitnessState {
  const defaults = loadDefaultProfiles();
  const firstProfile = defaults[0];
  return {
    constraints: firstProfile?.constraints ?? [],
    activeProfileName: firstProfile?.name ?? null,
    enabledVariants: new Set<string>(),
  };
}

const INITIAL_STATE: FitnessState = getInitialState();

// ---------------------------------------------------------------------------
// Serialized Shape (Sets -> Arrays for JSON)
// ---------------------------------------------------------------------------

interface FitnessSerialized {
  constraints: SoftConstraint[];
  activeProfileName: string | null;
  enabledVariants: string[];
}

// ---------------------------------------------------------------------------
// Custom storage adapter: Set <-> Array conversion
// ---------------------------------------------------------------------------

function createSetStorage(): ReturnType<typeof createJSONStorage<FitnessState>> {
  return createJSONStorage<FitnessState>(() => localStorage, {
    replacer: (_key: string, value: unknown): unknown => {
      if (value instanceof Set) {
        return [...value];
      }
      return value;
    },
    reviver: (_key: string, value: unknown): unknown => value,
  });
}

// ---------------------------------------------------------------------------
// Migration — v1 → v2: add enabledVariants
// ---------------------------------------------------------------------------

function migrateFitnessState(
  persisted: unknown,
  version: number,
): FitnessState {
  if (persisted == null || typeof persisted !== "object") {
    return INITIAL_STATE;
  }

  const raw = persisted as Partial<FitnessSerialized>;

  // Handle constraints
  let constraints: readonly SoftConstraint[];
  if (!Array.isArray(raw.constraints)) {
    constraints = INITIAL_STATE.constraints;
  } else {
    constraints = raw.constraints.map((c: SoftConstraint) => {
      // v0 → v1: change insanity "exactly" to "atMost"
      if (c.stat === "insanity" && c.type === "exactly") {
        return { ...c, type: "atMost" as const };
      }
      return c;
    });
  }

  // Handle enabledVariants (new in v2)
  let enabledVariants: ReadonlySet<string>;
  if (version < 2 || !Array.isArray(raw.enabledVariants)) {
    enabledVariants = new Set<string>();
  } else {
    enabledVariants = new Set<string>(raw.enabledVariants);
  }

  return {
    constraints,
    activeProfileName: raw.activeProfileName ?? null,
    enabledVariants,
  };
}

function mergePersistedState(
  persisted: unknown,
  current: FitnessState & FitnessActions,
): FitnessState & FitnessActions {
  if (persisted == null || typeof persisted !== "object") {
    return current;
  }
  const raw = persisted as Partial<FitnessSerialized>;
  return {
    ...current,
    constraints: Array.isArray(raw.constraints)
      ? raw.constraints
      : current.constraints,
    activeProfileName: raw.activeProfileName ?? current.activeProfileName,
    enabledVariants: Array.isArray(raw.enabledVariants)
      ? new Set<string>(raw.enabledVariants)
      : current.enabledVariants,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleSetItem(set: ReadonlySet<string>, item: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFitnessStore = create<FitnessState & FitnessActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setConstraints: (constraints: readonly SoftConstraint[]): void => {
        set({ constraints, activeProfileName: null });
      },

      addConstraint: (constraint: SoftConstraint): void => {
        set((s) => ({
          constraints: [...s.constraints, constraint],
          activeProfileName: null,
        }));
      },

      removeConstraint: (index: number): void => {
        set((s) => ({
          constraints: s.constraints.filter((_, i) => i !== index),
          activeProfileName: null,
        }));
      },

      updateConstraint: (index: number, constraint: SoftConstraint): void => {
        set((s) => ({
          constraints: s.constraints.map((c, i) => (i === index ? constraint : c)),
          activeProfileName: null,
        }));
      },

      loadPreset: (name: string, constraints: readonly SoftConstraint[]): void => {
        set({ constraints, activeProfileName: name });
      },

      clearPreset: (): void => {
        set({ constraints: [], activeProfileName: null });
      },

      toggleVariant: (variant: string): void => {
        set((s) => ({ enabledVariants: toggleSetItem(s.enabledVariants, variant) }));
      },

      setEnabledVariants: (variants: ReadonlySet<string>): void => {
        set({ enabledVariants: variants });
      },

      enableAllVariantsOfType: (typeId: string): void => {
        const variantTypes = loadVariantTypes();
        const typeEntry = variantTypes[typeId];
        if (!typeEntry) return;
        set((s) => {
          const next = new Set(s.enabledVariants);
          for (const v of typeEntry.variants) {
            next.add(v);
          }
          return { enabledVariants: next };
        });
      },

      disableAllVariantsOfType: (typeId: string): void => {
        const variantTypes = loadVariantTypes();
        const typeEntry = variantTypes[typeId];
        if (!typeEntry) return;
        set((s) => {
          const next = new Set(s.enabledVariants);
          for (const v of typeEntry.variants) {
            next.delete(v);
          }
          return { enabledVariants: next };
        });
      },
    }),
    {
      name: "ao-fitness",
      version: 2,
      storage: createSetStorage(),
      merge: mergePersistedState,
      migrate: migrateFitnessState,
    },
  ),
);
