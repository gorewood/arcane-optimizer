/**
 * Scoring mode types for loadout fitness evaluation.
 *
 * Three modes are available:
 * - linear: Current constraint-based scoring (default)
 * - efficiency: Simple normalized stat sum using stat ratios
 * - multiplier: Game-accurate damage/survivability with diminishing returns
 */

import type { StatName } from "@/models/types";
import type { StatLimits, StatMinimums, StatWeights } from "@/data/profile-types";

/** Available scoring modes for fitness evaluation. */
export type ScoringMode = "linear" | "efficiency" | "multiplier";

/** Configuration for scoring calculation. */
export interface ScoringConfig {
  /** The scoring algorithm to use. */
  readonly mode: ScoringMode;
  /** User-adjustable stat weights (0-200, where 100 = normal importance). */
  readonly statWeights?: Readonly<Record<StatName, number>> | undefined;
}

/** Default stat weights matching AO Guides defaults. */
export const DEFAULT_STAT_WEIGHTS: StatWeights = {
  power: 100,
  defense: 100,
  size: 30,
  dexterity: 30, // AO Guides calls this "speed"
  range: 30,
  haste: 10,
  regeneration: 100,
  resistance: 20,
  pierce: 25,
  insanity: 0,
  warding: 0,
  drawback: 0,
} as const;

/** Default stat limits for Efficiency/Multiplier modes. */
export const DEFAULT_LIMITS: StatLimits = {
  insanity: 1,
  warding: 0,
  drawback: 2,
} as const;

/** Default stat minimums (all disabled). */
export const DEFAULT_MINIMUMS: StatMinimums = {} as const;
