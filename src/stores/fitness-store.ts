/**
 * FitnessStore — manages the fitness function configuration
 * (soft constraints, presets, and enabled variants). Persisted to localStorage.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SoftConstraint, StatName } from "@/models/types";
import { loadDefaultProfiles, loadVariantTypes } from "@/data/loaders";
import type {
  ProfileConfig,
  ConstraintsModeConfig,
  WeightsModeConfig,
  StatLimits,
} from "@/data/profile-types";
import type { ScoringMode } from "@/search/scoring-mode";
import { DEFAULT_STAT_WEIGHTS } from "@/search/scoring-mode";
import {
  DEFAULT_CONSTRAINTS_CONFIG,
  DEFAULT_WEIGHTS_CONFIG,
  migrateFitnessState,
  mergePersistedState,
} from "./fitness-store-migrations";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface FitnessState {
  scoringMode: ScoringMode;
  enabledVariants: ReadonlySet<string>;
  constraintsConfig: ConstraintsModeConfig;
  efficiencyConfig: WeightsModeConfig;
  multiplierConfig: WeightsModeConfig;
  activeProfileId: string | null;
  hasUnsavedChanges: boolean;
}

export interface FitnessActions {
  // Mode selection
  setScoringMode: (mode: ScoringMode) => void;
  getCurrentModeConfig: () => ConstraintsModeConfig | WeightsModeConfig;

  // Constraints mode actions
  setConstraints: (constraints: readonly SoftConstraint[]) => void;
  addConstraint: (constraint: SoftConstraint) => void;
  updateConstraint: (index: number, constraint: SoftConstraint) => void;
  removeConstraint: (index: number) => void;

  // Efficiency/Multiplier mode actions (affect current mode's config)
  setLimit: (stat: keyof StatLimits, value: number) => void;
  setMinimum: (stat: StatName, value: number | null) => void;
  setWeight: (stat: StatName, value: number) => void;
  resetWeights: () => void;

  // Variant actions
  toggleVariant: (variant: string) => void;
  setEnabledVariants: (variants: ReadonlySet<string>) => void;
  enableAllVariantsOfType: (typeId: string) => void;
  disableAllVariantsOfType: (typeId: string) => void;

  // Profile actions
  applyProfile: (id: string, config: ProfileConfig) => void;
  getCurrentConfig: () => ProfileConfig;
  markDirty: () => void;
  markClean: () => void;
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

function buildInitialStateFromProfile(profile: ProfileConfig & { id?: string }): FitnessState {
  return {
    scoringMode: profile.scoringMode,
    enabledVariants: new Set<string>(profile.enabledVariants),
    constraintsConfig: profile.constraintsConfig,
    efficiencyConfig: profile.efficiencyConfig,
    multiplierConfig: profile.multiplierConfig,
    activeProfileId: profile.id ?? null,
    hasUnsavedChanges: false,
  };
}

function getDefaultFitnessState(): FitnessState {
  return {
    scoringMode: "linear",
    enabledVariants: new Set<string>(),
    constraintsConfig: DEFAULT_CONSTRAINTS_CONFIG,
    efficiencyConfig: DEFAULT_WEIGHTS_CONFIG,
    multiplierConfig: DEFAULT_WEIGHTS_CONFIG,
    activeProfileId: null,
    hasUnsavedChanges: false,
  };
}

function getInitialState(): FitnessState {
  const defaults = loadDefaultProfiles();
  const firstProfile = defaults[0];
  if (!firstProfile) return getDefaultFitnessState();
  return buildInitialStateFromProfile(firstProfile);
}

const INITIAL_STATE: FitnessState = getInitialState();

// ---------------------------------------------------------------------------
// Custom storage adapter: Set <-> Array conversion
// ---------------------------------------------------------------------------

function createSetStorage(): ReturnType<typeof createJSONStorage<FitnessState>> {
  return createJSONStorage<FitnessState>(() => localStorage, {
    replacer: (_key: string, value: unknown): unknown => {
      if (value instanceof Set) return [...value];
      return value;
    },
    reviver: (_key: string, value: unknown): unknown => value,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleSetItem(set: ReadonlySet<string>, item: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

function addVariantsOfType(current: ReadonlySet<string>, typeId: string): ReadonlySet<string> {
  const variantTypes = loadVariantTypes();
  const typeEntry = variantTypes[typeId];
  if (!typeEntry) return current;
  const next = new Set(current);
  for (const v of typeEntry.variants) next.add(v);
  return next;
}

function removeVariantsOfType(current: ReadonlySet<string>, typeId: string): ReadonlySet<string> {
  const variantTypes = loadVariantTypes();
  const typeEntry = variantTypes[typeId];
  if (!typeEntry) return current;
  const next = new Set(current);
  for (const v of typeEntry.variants) next.delete(v);
  return next;
}

// ---------------------------------------------------------------------------
// Store Actions (extracted to stay under line limit)
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<FitnessState> | ((s: FitnessState) => Partial<FitnessState>)) => void;
type GetFn = () => FitnessState;

function createConstraintActions(set: SetFn): Pick<FitnessActions,
  "setConstraints" | "addConstraint" | "removeConstraint" | "updateConstraint"
> {
  return {
    setConstraints: (constraints) => {
      set({ constraintsConfig: { constraints }, hasUnsavedChanges: true });
    },
    addConstraint: (constraint) => {
      set((s) => ({
        constraintsConfig: { constraints: [...s.constraintsConfig.constraints, constraint] },
        hasUnsavedChanges: true,
      }));
    },
    removeConstraint: (index) => {
      set((s) => ({
        constraintsConfig: { constraints: s.constraintsConfig.constraints.filter((_, i) => i !== index) },
        hasUnsavedChanges: true,
      }));
    },
    updateConstraint: (index, constraint) => {
      set((s) => ({
        constraintsConfig: { constraints: s.constraintsConfig.constraints.map((c, i) => (i === index ? constraint : c)) },
        hasUnsavedChanges: true,
      }));
    },
  };
}

function createVariantActions(set: SetFn): Pick<FitnessActions,
  "toggleVariant" | "setEnabledVariants" | "enableAllVariantsOfType" | "disableAllVariantsOfType"
> {
  return {
    toggleVariant: (variant) => {
      set((s) => ({ enabledVariants: toggleSetItem(s.enabledVariants, variant), hasUnsavedChanges: true }));
    },
    setEnabledVariants: (variants) => { set({ enabledVariants: variants, hasUnsavedChanges: true }); },
    enableAllVariantsOfType: (typeId) => {
      set((s) => ({ enabledVariants: addVariantsOfType(s.enabledVariants, typeId), hasUnsavedChanges: true }));
    },
    disableAllVariantsOfType: (typeId) => {
      set((s) => ({ enabledVariants: removeVariantsOfType(s.enabledVariants, typeId), hasUnsavedChanges: true }));
    },
  };
}

type ConfigKey = "efficiencyConfig" | "multiplierConfig";
const getConfigKey = (mode: ScoringMode): ConfigKey => mode === "multiplier" ? "multiplierConfig" : "efficiencyConfig";

function createScoringActions(set: SetFn, get: GetFn): Pick<FitnessActions,
  "setScoringMode" | "getCurrentModeConfig" | "setLimit" | "setMinimum" | "setWeight" | "resetWeights"
> {
  return {
    setScoringMode: (mode) => { set({ scoringMode: mode, hasUnsavedChanges: true }); },
    getCurrentModeConfig: () => {
      const s = get();
      return s.scoringMode === "linear" ? s.constraintsConfig : s[getConfigKey(s.scoringMode)];
    },
    setLimit: (stat, value) => {
      set((s) => {
        if (s.scoringMode === "linear") return s;
        const key = getConfigKey(s.scoringMode);
        return { [key]: { ...s[key], limits: { ...s[key].limits, [stat]: value } }, hasUnsavedChanges: true };
      });
    },
    setMinimum: (stat, value) => {
      set((s) => {
        if (s.scoringMode === "linear") return s;
        const key = getConfigKey(s.scoringMode);
        const { [stat]: _removed, ...rest } = s[key].minimums;
        const minimums = value === null ? rest : { ...s[key].minimums, [stat]: value };
        return { [key]: { ...s[key], minimums }, hasUnsavedChanges: true };
      });
    },
    setWeight: (stat, value) => {
      set((s) => {
        if (s.scoringMode === "linear") return s;
        const key = getConfigKey(s.scoringMode);
        return { [key]: { ...s[key], weights: { ...s[key].weights, [stat]: value } }, hasUnsavedChanges: true };
      });
    },
    resetWeights: () => {
      set((s) => {
        if (s.scoringMode === "linear") return s;
        const key = getConfigKey(s.scoringMode);
        return { [key]: { ...s[key], weights: DEFAULT_STAT_WEIGHTS }, hasUnsavedChanges: true };
      });
    },
  };
}

function createProfileActions(set: SetFn, get: GetFn): Pick<FitnessActions,
  "applyProfile" | "getCurrentConfig" | "markDirty" | "markClean"
> {
  return {
    applyProfile: (id, config) => {
      set({
        scoringMode: config.scoringMode,
        enabledVariants: new Set(config.enabledVariants),
        constraintsConfig: config.constraintsConfig,
        efficiencyConfig: config.efficiencyConfig,
        multiplierConfig: config.multiplierConfig,
        activeProfileId: id,
        hasUnsavedChanges: false,
      });
    },
    getCurrentConfig: () => {
      const s = get();
      return {
        scoringMode: s.scoringMode,
        enabledVariants: [...s.enabledVariants],
        constraintsConfig: s.constraintsConfig,
        efficiencyConfig: s.efficiencyConfig,
        multiplierConfig: s.multiplierConfig,
      };
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
      ...createScoringActions(set, get),
      ...createProfileActions(set, get),
    }),
    {
      name: "ao-fitness",
      version: 4,
      storage: createSetStorage(),
      merge: mergePersistedState,
      migrate: (persisted, version) => migrateFitnessState(persisted, version, INITIAL_STATE),
    },
  ),
);
