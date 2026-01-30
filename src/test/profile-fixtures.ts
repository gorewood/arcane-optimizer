/**
 * Test fixtures for profile-related tests.
 *
 * Provides a backwards-compatible interface similar to the old FITNESS_PRESETS
 * for tests that need predefined constraint sets.
 */

import type { SoftConstraint } from "@/models/types";
import { loadDefaultProfiles } from "@/data/loaders";

/**
 * Load default profiles and convert to a name -> constraints map.
 * This provides backwards compatibility with tests that used FITNESS_PRESETS.
 */
export function getTestProfiles(): Readonly<Record<string, readonly SoftConstraint[]>> {
  const defaults = loadDefaultProfiles();
  const result: Record<string, readonly SoftConstraint[]> = {};
  for (const profile of defaults) {
    result[profile.name] = profile.constraintsConfig.constraints;
  }
  return result;
}

/**
 * Get test profile names in order.
 */
export function getTestProfileNames(): readonly string[] {
  return loadDefaultProfiles().map((p) => p.name);
}

/**
 * Get a specific test profile by name, or undefined if not found.
 */
export function getTestProfile(name: string): readonly SoftConstraint[] | undefined {
  const profiles = getTestProfiles();
  return profiles[name];
}
