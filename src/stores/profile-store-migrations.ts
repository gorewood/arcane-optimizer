/**
 * Migration helpers for ProfileStore.
 * Handles version upgrades for persisted state.
 */

import type { SoftConstraint, StatName } from "@/models/types";
import type {
  UserProfile,
  ConstraintsModeConfig,
  WeightsModeConfig,
  StatWeights,
} from "@/data/profile-types";
import type { ScoringMode } from "@/search/scoring-mode";
import { DEFAULT_STAT_WEIGHTS, DEFAULT_LIMITS, DEFAULT_MINIMUMS } from "@/search/scoring-mode";
import type { ProfileState } from "./profile-store";

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
// Legacy Types
// ---------------------------------------------------------------------------

interface LegacyUserProfile {
  readonly id: string;
  readonly name: string;
  readonly constraints: readonly SoftConstraint[];
  readonly baseVersion?: number | undefined;
  readonly deleted?: boolean | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly scoringMode?: ScoringMode | undefined;
  readonly statWeights?: Readonly<Record<StatName, number>> | undefined;
  readonly enabledVariants?: readonly string[] | undefined;
  readonly constraintsConfig?: ConstraintsModeConfig | undefined;
  readonly efficiencyConfig?: WeightsModeConfig | undefined;
  readonly multiplierConfig?: WeightsModeConfig | undefined;
}

interface PersistedState {
  userProfiles: readonly LegacyUserProfile[];
  selectedProfileId: string | null;
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

export function isPersistedState(value: unknown): value is PersistedState {
  if (value == null || typeof value !== "object") return false;
  if (!("userProfiles" in value) || !("selectedProfileId" in value)) return false;
  const obj = value as { userProfiles: unknown; selectedProfileId: unknown };
  return Array.isArray(obj.userProfiles) &&
    (obj.selectedProfileId === null || typeof obj.selectedProfileId === "string");
}

// ---------------------------------------------------------------------------
// Migration Functions
// ---------------------------------------------------------------------------

function migrateProfile(p: LegacyUserProfile): UserProfile {
  // If already has new structure, extract and use it directly
  const { constraintsConfig, efficiencyConfig, multiplierConfig } = p;
  if (constraintsConfig !== undefined && efficiencyConfig !== undefined && multiplierConfig !== undefined) {
    return {
      id: p.id,
      name: p.name,
      scoringMode: p.scoringMode ?? "linear",
      enabledVariants: p.enabledVariants ?? [],
      constraintsConfig,
      efficiencyConfig,
      multiplierConfig,
      baseVersion: p.baseVersion,
      deleted: p.deleted,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  // Migrate from flat structure
  const constraints = p.constraints;
  const statWeights: StatWeights = p.statWeights ?? DEFAULT_STAT_WEIGHTS;
  const newConstraintsConfig: ConstraintsModeConfig = { constraints };
  const weightsConfig: WeightsModeConfig = {
    limits: DEFAULT_LIMITS,
    minimums: DEFAULT_MINIMUMS,
    weights: statWeights,
  };

  return {
    id: p.id,
    name: p.name,
    scoringMode: p.scoringMode ?? "linear",
    enabledVariants: p.enabledVariants ?? [],
    constraintsConfig: newConstraintsConfig,
    efficiencyConfig: weightsConfig,
    multiplierConfig: weightsConfig,
    baseVersion: p.baseVersion,
    deleted: p.deleted,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function migrateV2ToV3(persisted: PersistedState): ProfileState {
  return {
    userProfiles: persisted.userProfiles.map(migrateProfile),
    selectedProfileId: persisted.selectedProfileId,
  };
}

export function migrateProfileState(persisted: unknown, _version: number): ProfileState {
  // Always migrate through migrateV2ToV3 which handles both old and new formats
  if (isPersistedState(persisted)) {
    return migrateV2ToV3(persisted);
  }
  return { userProfiles: [], selectedProfileId: null };
}
