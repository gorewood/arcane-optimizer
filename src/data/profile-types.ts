/**
 * Profile types for user-managed fitness profiles.
 */

import type { SoftConstraint, StatName } from "@/models/types";
import type { ScoringMode } from "@/search/scoring-mode";

/** Limit values for stats that can disqualify builds (max allowed). */
export interface StatLimits {
  readonly insanity: number;
  readonly warding: number;
  readonly drawback: number;
}

/** Minimum stat requirements. Missing key = no minimum (disabled). */
export type StatMinimums = Partial<Readonly<Record<StatName, number>>>;

/** Stat importance weights (0-200, 100 = normal). */
export type StatWeights = Readonly<Record<StatName, number>>;

/** Configuration for Constraints scoring mode. */
export interface ConstraintsModeConfig {
  readonly constraints: readonly SoftConstraint[];
}

/** Configuration for Efficiency/Multiplier scoring modes. */
export interface WeightsModeConfig {
  readonly limits: StatLimits;
  readonly minimums: StatMinimums;
  readonly weights: StatWeights;
}

/** Core configuration that defines how a build is evaluated. */
export interface ProfileConfig {
  readonly scoringMode: ScoringMode;
  readonly enabledVariants: readonly string[];
  readonly constraintsConfig: ConstraintsModeConfig;
  readonly efficiencyConfig: WeightsModeConfig;
  readonly multiplierConfig: WeightsModeConfig;
}

/** A default profile shipped with the app (from JSON config). */
export interface DefaultProfile extends ProfileConfig {
  readonly id: string;
  readonly name: string;
  readonly version: number;
}

/** A user profile stored in localStorage. */
export interface UserProfile extends ProfileConfig {
  readonly id: string;
  readonly name: string;
  readonly baseVersion?: number | undefined;
  readonly deleted?: boolean | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Merged profile for display (combines default + user data). */
export interface Profile extends ProfileConfig {
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly isModified: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}
