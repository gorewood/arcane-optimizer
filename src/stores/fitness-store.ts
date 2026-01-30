/**
 * FitnessStore — manages the fitness function configuration
 * (soft constraints, presets, and enabled variants). Persisted to localStorage.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SoftConstraint, StatName } from "@/models/types";
import { loadDefaultProfiles, loadVariantTypes } from "@/data/loaders";
import type { ProfileConfig } from "@/data/profile-types";
import type { ScoringMode } from "@/search/scoring-mode";
import { DEFAULT_STAT_WEIGHTS } from "@/search/scoring-mode";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface FitnessState {
  constraints: readonly SoftConstraint[];
  activeProfileName: string | null;
  enabledVariants: ReadonlySet<string>;
  scoringMode: ScoringMode;
  statWeights: Readonly<Record<StatName, number>>;
  /** ID of the currently loaded profile (if any). */
  activeProfileId: string | null;
  /** True if state differs from the loaded profile. */
  hasUnsavedChanges: boolean;
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
  setScoringMode: (mode: ScoringMode) => void;
  setStatWeight: (stat: StatName, weight: number) => void;
  resetStatWeights: () => void;
  /** Load an entire profile configuration. */
  applyProfile: (id: string, config: ProfileConfig) => void;
  /** Export current state as a ProfileConfig. */
  getCurrentConfig: () => ProfileConfig;
  /** Mark state as having unsaved changes. */
  markDirty: () => void;
  /** Mark state as clean (matching loaded profile). */
  markClean: () => void;
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
    scoringMode: "linear",
    statWeights: DEFAULT_STAT_WEIGHTS,
    activeProfileId: firstProfile?.id ?? null,
    hasUnsavedChanges: false,
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
  scoringMode?: ScoringMode;
  statWeights?: Record<StatName, number>;
  activeProfileId?: string | null;
  hasUnsavedChanges?: boolean;
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
// Migration Helpers
// ---------------------------------------------------------------------------

function isValidScoringMode(value: unknown): value is ScoringMode {
  return value === "linear" || value === "efficiency" || value === "multiplier";
}

function parseScoringMode(value: unknown, fallback: ScoringMode): ScoringMode {
  return isValidScoringMode(value) ? value : fallback;
}

/** List of stat names for type-safe iteration. */
const STAT_NAME_LIST: readonly StatName[] = [
  "power", "defense", "size", "dexterity", "range", "haste",
  "insanity", "warding", "drawback", "regeneration", "pierce", "resistance",
] as const;

function getNumericProperty(obj: object, key: string): number | undefined {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    const val = Reflect.get(obj, key) as unknown;
    if (typeof val === "number") return val;
  }
  return undefined;
}

function parseStatWeights(
  value: unknown,
  fallback: Readonly<Record<StatName, number>>,
): Readonly<Record<StatName, number>> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const merged = { ...DEFAULT_STAT_WEIGHTS };
  for (const statKey of STAT_NAME_LIST) {
    const numVal = getNumericProperty(value, statKey);
    if (numVal !== undefined) {
      merged[statKey] = numVal;
    }
  }
  return merged;
}

function migrateConstraints(raw: Partial<FitnessSerialized>): readonly SoftConstraint[] {
  if (!Array.isArray(raw.constraints)) {
    return INITIAL_STATE.constraints;
  }
  return raw.constraints.map((c: SoftConstraint) => {
    // v0 -> v1: change insanity "exactly" to "atMost"
    if (c.stat === "insanity" && c.type === "exactly") {
      return { ...c, type: "atMost" as const };
    }
    return c;
  });
}

function migrateEnabledVariants(
  raw: Partial<FitnessSerialized>,
  version: number,
): ReadonlySet<string> {
  if (version < 2 || !Array.isArray(raw.enabledVariants)) {
    return new Set<string>();
  }
  return new Set<string>(raw.enabledVariants);
}

// ---------------------------------------------------------------------------
// Migration — handles version upgrades
// ---------------------------------------------------------------------------

function migrateFitnessState(
  persisted: unknown,
  version: number,
): FitnessState {
  if (persisted == null || typeof persisted !== "object") {
    return INITIAL_STATE;
  }

  const raw = persisted as Partial<FitnessSerialized>;

  // v2 -> v3: add activeProfileId and hasUnsavedChanges
  const activeProfileId = typeof raw.activeProfileId === "string" ? raw.activeProfileId : null;
  const hasUnsavedChanges = typeof raw.hasUnsavedChanges === "boolean" ? raw.hasUnsavedChanges : false;

  return {
    constraints: migrateConstraints(raw),
    activeProfileName: raw.activeProfileName ?? null,
    enabledVariants: migrateEnabledVariants(raw, version),
    scoringMode: parseScoringMode(raw.scoringMode, "linear"),
    statWeights: parseStatWeights(raw.statWeights, DEFAULT_STAT_WEIGHTS),
    activeProfileId,
    hasUnsavedChanges,
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
    constraints: Array.isArray(raw.constraints) ? raw.constraints : current.constraints,
    activeProfileName: raw.activeProfileName ?? current.activeProfileName,
    enabledVariants: Array.isArray(raw.enabledVariants)
      ? new Set<string>(raw.enabledVariants)
      : current.enabledVariants,
    scoringMode: parseScoringMode(raw.scoringMode, current.scoringMode),
    statWeights: parseStatWeights(raw.statWeights, current.statWeights),
    activeProfileId: typeof raw.activeProfileId === "string" ? raw.activeProfileId : current.activeProfileId,
    hasUnsavedChanges: typeof raw.hasUnsavedChanges === "boolean" ? raw.hasUnsavedChanges : current.hasUnsavedChanges,
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

function addVariantsOfType(
  current: ReadonlySet<string>,
  typeId: string,
): ReadonlySet<string> {
  const variantTypes = loadVariantTypes();
  const typeEntry = variantTypes[typeId];
  if (!typeEntry) return current;
  const next = new Set(current);
  for (const v of typeEntry.variants) {
    next.add(v);
  }
  return next;
}

function removeVariantsOfType(
  current: ReadonlySet<string>,
  typeId: string,
): ReadonlySet<string> {
  const variantTypes = loadVariantTypes();
  const typeEntry = variantTypes[typeId];
  if (!typeEntry) return current;
  const next = new Set(current);
  for (const v of typeEntry.variants) {
    next.delete(v);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Store Actions (extracted to stay under line limit)
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<FitnessState> | ((s: FitnessState) => Partial<FitnessState>)) => void;
type GetFn = () => FitnessState;

function createConstraintActions(set: SetFn): Pick<FitnessActions,
  "setConstraints" | "addConstraint" | "removeConstraint" | "updateConstraint" | "loadPreset" | "clearPreset"
> {
  return {
    setConstraints: (constraints) => { set({ constraints, activeProfileName: null, hasUnsavedChanges: true }); },
    addConstraint: (constraint) => { set((s) => ({
      constraints: [...s.constraints, constraint], activeProfileName: null, hasUnsavedChanges: true,
    })); },
    removeConstraint: (index) => { set((s) => ({
      constraints: s.constraints.filter((_, i) => i !== index), activeProfileName: null, hasUnsavedChanges: true,
    })); },
    updateConstraint: (index, constraint) => { set((s) => ({
      constraints: s.constraints.map((c, i) => (i === index ? constraint : c)), activeProfileName: null, hasUnsavedChanges: true,
    })); },
    loadPreset: (name, constraints) => { set({ constraints, activeProfileName: name, hasUnsavedChanges: true }); },
    clearPreset: () => { set({ constraints: [], activeProfileName: null, hasUnsavedChanges: true }); },
  };
}

function createVariantActions(set: SetFn): Pick<FitnessActions,
  "toggleVariant" | "setEnabledVariants" | "enableAllVariantsOfType" | "disableAllVariantsOfType"
> {
  return {
    toggleVariant: (variant) => { set((s) => ({ enabledVariants: toggleSetItem(s.enabledVariants, variant), hasUnsavedChanges: true })); },
    setEnabledVariants: (variants) => { set({ enabledVariants: variants, hasUnsavedChanges: true }); },
    enableAllVariantsOfType: (typeId) => { set((s) => ({ enabledVariants: addVariantsOfType(s.enabledVariants, typeId), hasUnsavedChanges: true })); },
    disableAllVariantsOfType: (typeId) => { set((s) => ({ enabledVariants: removeVariantsOfType(s.enabledVariants, typeId), hasUnsavedChanges: true })); },
  };
}

function createScoringActions(set: SetFn): Pick<FitnessActions, "setScoringMode" | "setStatWeight" | "resetStatWeights"> {
  return {
    setScoringMode: (mode) => { set({ scoringMode: mode, hasUnsavedChanges: true }); },
    setStatWeight: (stat, weight) => { set((s) => ({ statWeights: { ...s.statWeights, [stat]: weight }, hasUnsavedChanges: true })); },
    resetStatWeights: () => { set({ statWeights: DEFAULT_STAT_WEIGHTS, hasUnsavedChanges: true }); },
  };
}

function createProfileActions(set: SetFn, get: GetFn): Pick<FitnessActions,
  "applyProfile" | "getCurrentConfig" | "markDirty" | "markClean"
> {
  return {
    applyProfile: (id, config) => { set({
      scoringMode: config.scoringMode, constraints: config.constraints, statWeights: config.statWeights,
      enabledVariants: new Set(config.enabledVariants), activeProfileId: id, activeProfileName: null, hasUnsavedChanges: false,
    }); },
    getCurrentConfig: () => {
      const s = get();
      return { scoringMode: s.scoringMode, constraints: s.constraints, statWeights: s.statWeights, enabledVariants: [...s.enabledVariants] };
    },
    markDirty: () => { set({ hasUnsavedChanges: true }); },
    markClean: () => { set({ hasUnsavedChanges: false }); },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFitnessStore = create<FitnessState & FitnessActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      ...createConstraintActions(set),
      ...createVariantActions(set),
      ...createScoringActions(set),
      ...createProfileActions(set, get),
    }),
    {
      name: "ao-fitness",
      version: 3,
      storage: createSetStorage(),
      merge: mergePersistedState,
      migrate: migrateFitnessState,
    },
  ),
);
