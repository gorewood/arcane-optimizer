/**
 * Profile types for user-managed fitness profiles.
 */

import type { SoftConstraint } from "@/models/types";

/** A default profile shipped with the app (from JSON config). */
export interface DefaultProfile {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly constraints: readonly SoftConstraint[];
}

/** A user profile stored in localStorage. */
export interface UserProfile {
  readonly id: string;
  readonly name: string;
  readonly constraints: readonly SoftConstraint[];
  /** Version of the default profile this was based on (if any). */
  readonly baseVersion?: number | undefined;
  /** True if user deleted a default profile. */
  readonly deleted?: boolean | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Merged profile for display (combines default + user data). */
export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly constraints: readonly SoftConstraint[];
  readonly isDefault: boolean;
  readonly isModified: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}
