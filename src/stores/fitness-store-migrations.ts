/**
 * Migration helpers for FitnessStore.
 * Handles version upgrades for persisted state.
 */

import type { SoftConstraint, StatName } from "@/models/types";
import type {
  ConstraintsModeConfig,
  WeightsModeConfig,
  StatLimits,
  StatMinimums,
  StatWeights,
} from "@/data/profile-types";
import type { ScoringMode } from "@/search/scoring-mode";
import { DEFAULT_STAT_WEIGHTS, DEFAULT_LIMITS, DEFAULT_MINIMUMS } from "@/search/scoring-mode";
import type { FitnessState } from "./fitness-store";

// ---------------------------------------------------------------------------
// Serialized Shape (Sets -> Arrays for JSON)
// ---------------------------------------------------------------------------

export interface FitnessSerialized {
  scoringMode: ScoringMode;
  enabledVariants: string[];
  constraintsConfig: ConstraintsModeConfig;
  efficiencyConfig: WeightsModeConfig;
  multiplierConfig: WeightsModeConfig;
  activeProfileId: string | null;
  hasUnsavedChanges: boolean;
}

// Legacy format for migration
interface LegacyFitnessSerialized {
  constraints?: SoftConstraint[];
  activeProfileName?: string | null;
  enabledVariants?: string[];
  scoringMode?: ScoringMode;
  statWeights?: Record<StatName, number>;
  activeProfileId?: string | null;
  hasUnsavedChanges?: boolean;
}

// ---------------------------------------------------------------------------
// Default Configs
// ---------------------------------------------------------------------------

export const DEFAULT_CONSTRAINTS_CONFIG: ConstraintsModeConfig = {
  constraints: [],
};

export const DEFAULT_WEIGHTS_CONFIG: WeightsModeConfig = {
  limits: DEFAULT_LIMITS,
  minimums: DEFAULT_MINIMUMS,
  weights: DEFAULT_STAT_WEIGHTS,
};

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

export function isValidScoringMode(value: unknown): value is ScoringMode {
  return value === "linear" || value === "efficiency" || value === "multiplier";
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

// ---------------------------------------------------------------------------
// Parsing Helpers
// ---------------------------------------------------------------------------

function parseStatWeights(
  value: unknown,
  fallback: Readonly<Record<StatName, number>>,
): StatWeights {
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

function parseStatLimits(value: unknown): StatLimits {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_LIMITS;
  }
  const insanityVal = getNumericProperty(value, "insanity");
  const wardingVal = getNumericProperty(value, "warding");
  const drawbackVal = getNumericProperty(value, "drawback");
  return {
    insanity: insanityVal ?? DEFAULT_LIMITS.insanity,
    warding: wardingVal ?? DEFAULT_LIMITS.warding,
    drawback: drawbackVal ?? DEFAULT_LIMITS.drawback,
  };
}

function parseStatMinimums(value: unknown): StatMinimums {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_MINIMUMS;
  }
  const result: Partial<Record<StatName, number>> = {};
  for (const statKey of STAT_NAME_LIST) {
    const numVal = getNumericProperty(value, statKey);
    if (numVal !== undefined) {
      result[statKey] = numVal;
    }
  }
  return result;
}

export function parseConstraintsModeConfig(value: unknown): ConstraintsModeConfig {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_CONSTRAINTS_CONFIG;
  }
  const obj = value as { constraints?: unknown };
  return {
    constraints: Array.isArray(obj.constraints) ? obj.constraints : [],
  };
}

export function parseWeightsModeConfig(value: unknown): WeightsModeConfig {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_WEIGHTS_CONFIG;
  }
  const obj = value as { limits?: unknown; minimums?: unknown; weights?: unknown };
  return {
    limits: parseStatLimits(obj.limits),
    minimums: parseStatMinimums(obj.minimums),
    weights: parseStatWeights(obj.weights, DEFAULT_STAT_WEIGHTS),
  };
}

// ---------------------------------------------------------------------------
// Migration Functions
// ---------------------------------------------------------------------------

function migrateConstraints(raw: readonly SoftConstraint[]): readonly SoftConstraint[] {
  return raw.map((c) => {
    if (c.stat === "insanity" && c.type === "exactly") {
      return { ...c, type: "atMost" as const };
    }
    return c;
  });
}

function migrateFromV4Plus(raw: Partial<FitnessSerialized>): FitnessState {
  return {
    scoringMode: isValidScoringMode(raw.scoringMode) ? raw.scoringMode : "linear",
    enabledVariants: Array.isArray(raw.enabledVariants)
      ? new Set<string>(raw.enabledVariants)
      : new Set<string>(),
    constraintsConfig: parseConstraintsModeConfig(raw.constraintsConfig),
    efficiencyConfig: parseWeightsModeConfig(raw.efficiencyConfig),
    multiplierConfig: parseWeightsModeConfig(raw.multiplierConfig),
    activeProfileId: typeof raw.activeProfileId === "string" ? raw.activeProfileId : null,
    hasUnsavedChanges: typeof raw.hasUnsavedChanges === "boolean" ? raw.hasUnsavedChanges : false,
  };
}

function migrateFromLegacy(legacy: LegacyFitnessSerialized): FitnessState {
  const constraints = Array.isArray(legacy.constraints)
    ? migrateConstraints(legacy.constraints)
    : [];
  const statWeights = parseStatWeights(legacy.statWeights, DEFAULT_STAT_WEIGHTS);
  const constraintsConfig: ConstraintsModeConfig = { constraints };
  const weightsConfig: WeightsModeConfig = {
    limits: DEFAULT_LIMITS,
    minimums: DEFAULT_MINIMUMS,
    weights: statWeights,
  };

  return {
    scoringMode: isValidScoringMode(legacy.scoringMode) ? legacy.scoringMode : "linear",
    enabledVariants: Array.isArray(legacy.enabledVariants)
      ? new Set<string>(legacy.enabledVariants)
      : new Set<string>(),
    constraintsConfig,
    efficiencyConfig: weightsConfig,
    multiplierConfig: weightsConfig,
    activeProfileId: typeof legacy.activeProfileId === "string" ? legacy.activeProfileId : null,
    hasUnsavedChanges: typeof legacy.hasUnsavedChanges === "boolean" ? legacy.hasUnsavedChanges : false,
  };
}

export function migrateFitnessState(
  persisted: unknown,
  version: number,
  initialState: FitnessState,
): FitnessState {
  if (persisted == null || typeof persisted !== "object") return initialState;
  if (version >= 4) return migrateFromV4Plus(persisted as Partial<FitnessSerialized>);
  return migrateFromLegacy(persisted as LegacyFitnessSerialized);
}

export function mergePersistedState<T extends FitnessState>(
  persisted: unknown,
  current: T,
): T {
  if (persisted == null || typeof persisted !== "object") {
    return current;
  }
  const raw = persisted as Partial<FitnessSerialized>;

  return {
    ...current,
    scoringMode: isValidScoringMode(raw.scoringMode) ? raw.scoringMode : current.scoringMode,
    enabledVariants: Array.isArray(raw.enabledVariants)
      ? new Set<string>(raw.enabledVariants)
      : current.enabledVariants,
    constraintsConfig: raw.constraintsConfig ?? current.constraintsConfig,
    efficiencyConfig: raw.efficiencyConfig ?? current.efficiencyConfig,
    multiplierConfig: raw.multiplierConfig ?? current.multiplierConfig,
    activeProfileId: typeof raw.activeProfileId === "string" ? raw.activeProfileId : current.activeProfileId,
    hasUnsavedChanges: typeof raw.hasUnsavedChanges === "boolean" ? raw.hasUnsavedChanges : current.hasUnsavedChanges,
  };
}
