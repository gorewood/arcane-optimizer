/**
 * Configurable fitness scoring engine for loadout optimization.
 *
 * Evaluates a Stats block against soft constraints, producing a
 * numeric score where higher is better.  Returns -Infinity for
 * loadouts that violate hard-cap or "exactly" constraints.
 *
 * All functions are pure — no side effects, no mutation.
 */

import type { ConstraintType, SoftConstraint, StatName, Stats } from "@/models/types";

import type { ScoringMode } from "./scoring-mode";
import { DEFAULT_STAT_WEIGHTS } from "./scoring-mode";
import { computeEfficiencyScore } from "./efficiency-scoring";
import { computeMultiplierScore } from "./multiplier-scoring";

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
// Hard constraint checking (applies to ALL scoring modes)
// ---------------------------------------------------------------------------

/**
 * Check hard constraints (atMost/atLeast) that apply in ALL scoring modes.
 * Returns true if all hard constraints pass, false if any are violated.
 *
 * - atMost: stat must not exceed the target value
 * - atLeast: stat must meet or exceed the target value
 */
export function checkHardConstraints(
  stats: Stats,
  constraints: readonly SoftConstraint[],
): boolean {
  for (const c of constraints) {
    const val = stats[c.stat];
    const target = c.value ?? 0;

    if (c.type === "atMost" && val > target) return false;
    if (c.type === "atLeast" && val < target) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Linear constraint-based scoring
// ---------------------------------------------------------------------------

/**
 * Compute linear constraint-based score for a stat block.
 * Returns -Infinity if any constraint disqualifies the loadout.
 */
function computeLinearScore(
  stats: Stats,
  constraints: readonly SoftConstraint[],
): number {
  let score = 0;

  for (const c of constraints) {
    const val = stats[c.stat];
    const value = c.value ?? 0;

    // Guard against invalid constraint types (can happen with corrupted localStorage)
    const constraintType = c.type as unknown;
    if (typeof constraintType !== "string" || !(constraintType in SCORERS)) {
      throw new Error(
        `Invalid constraint type "${c.type}" for stat "${c.stat}". ` +
        `Try clearing site data (Settings → Clear Local Data).`
      );
    }

    const scorer = SCORERS[c.type];
    const result = scorer(val, c.weight, value, c.hardCap);

    if (result === null) return -Infinity;
    score += result;
  }

  return score;
}

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
  scoringMode: ScoringMode = "linear",
  statWeights: Readonly<Record<StatName, number>> = DEFAULT_STAT_WEIGHTS,
): number {
  // Hard constraints (atMost/atLeast) apply in ALL scoring modes
  if (!checkHardConstraints(stats, constraints)) {
    return -Infinity;
  }

  // Mode-specific scoring
  if (scoringMode === "efficiency") {
    return computeEfficiencyScore(stats, statWeights);
  }
  if (scoringMode === "multiplier") {
    return computeMultiplierScore(stats, statWeights);
  }

  // Linear mode: constraint-based scoring
  return computeLinearScore(stats, constraints);
}

