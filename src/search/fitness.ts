/**
 * Configurable fitness scoring engine for loadout optimization.
 *
 * Evaluates a Stats block against soft constraints, producing a
 * numeric score where higher is better.  Returns -Infinity for
 * loadouts that violate hard-cap or "exactly" constraints.
 *
 * All functions are pure — no side effects, no mutation.
 */

import type { ConstraintType, SoftConstraint, Stats } from "@/models/types";

// ---------------------------------------------------------------------------
// Constraint scorers — one per ConstraintType
// ---------------------------------------------------------------------------

/**
 * Score a single constraint.
 * Returns `null` to signal disqualification (-Infinity for the whole loadout).
 */
type ConstraintScorer = (
  val: number,
  weight: number,
  value: number,
  hardCap: number | undefined,
) => number | null;

function scoreMinimize(val: number, weight: number): number {
  return -(val * weight);
}

function scoreMaximize(val: number, weight: number): number {
  return val * weight;
}

function scoreAtLeast(val: number, weight: number, value: number): number {
  if (val < value) {
    return -((value - val) * weight * 10);
  }
  // Cap bonus at 1× weight to prevent dominating other constraints
  return Math.min((val - value) * weight * 0.1, weight);
}

function scoreAtMost(
  val: number,
  _weight: number,
  value: number,
): number | null {
  // Value is a hard limit - exceeding disqualifies the loadout
  if (val > value) return null;
  return 0;
}

function scoreBetween(
  val: number,
  weight: number,
  min: number,
  max: number | undefined,
): number {
  const effectiveMax = max ?? Infinity;
  if (val < min) {
    return -((min - val) * weight * 10);
  }
  if (val > effectiveMax) {
    return -((val - effectiveMax) * weight * 10);
  }
  return 0;
}

function scoreExactly(val: number, weight: number, value: number): number | null {
  // Use weight as small tie-breaker bonus on match
  return val === value ? weight * 0.01 : null;
}

/** Dispatch table mapping constraint type to its scorer. */
const SCORERS: Readonly<Record<ConstraintType, ConstraintScorer>> = {
  minimize: scoreMinimize,
  maximize: scoreMaximize,
  atLeast: scoreAtLeast,
  atMost: scoreAtMost,
  between: scoreBetween,
  exactly: scoreExactly,
};

// ---------------------------------------------------------------------------
// Core fitness function
// ---------------------------------------------------------------------------

/**
 * Compute a fitness score for a stat block against soft constraints.
 *
 * Returns a numeric score where higher is better.
 * Returns -Infinity for disqualified loadouts (hardCap violations, exactly mismatches).
 */
export function computeFitness(
  stats: Stats,
  constraints: readonly SoftConstraint[],
): number {
  let score = 0;

  for (const c of constraints) {
    const val = stats[c.stat];
    const value = c.value ?? 0;
    const scorer = SCORERS[c.type];
    // hardCap is only used by 'between' (as max value)
    const result = scorer(val, c.weight, value, c.hardCap);

    if (result === null) return -Infinity;
    score += result;
  }

  return score;
}

