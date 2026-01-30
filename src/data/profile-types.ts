/**
 * Profile types for user-managed fitness profiles.
 */

import type { SoftConstraint, StatName } from "@/models/types";
import type { ScoringMode } from "@/search/scoring-mode";

/** Core configuration that defines how a build is evaluated. */
export interface ProfileConfig {
  readonly scoringMode: ScoringMode;
  readonly constraints: readonly SoftConstraint[];
  readonly statWeights: Readonly<Record<StatName, number>>;
  readonly enabledVariants: readonly string[];
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
