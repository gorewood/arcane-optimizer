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
  return (val - value) * weight * 0.1;
}

function scoreAtMost(
  val: number,
  weight: number,
  value: number,
  hardCap: number | undefined,
): number | null {
  if (hardCap != null && val > hardCap) return null;
  if (val > value) {
    return -((val - value) * weight * 10);
  }
  return 0;
}

function scoreTarget(
  val: number,
  weight: number,
  value: number,
  hardCap: number | undefined,
): number | null {
  if (hardCap != null && val > hardCap) return null;
  return -(Math.abs(val - value) * weight);
}

function scoreExactly(val: number, _weight: number, value: number): number | null {
  return val === value ? 0 : null;
}

/** Dispatch table mapping constraint type to its scorer. */
const SCORERS: Readonly<Record<ConstraintType, ConstraintScorer>> = {
  minimize: scoreMinimize,
  maximize: scoreMaximize,
  atLeast: scoreAtLeast,
  atMost: scoreAtMost,
  target: scoreTarget,
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
    const result = scorer(val, c.weight, value, c.hardCap);

    if (result === null) return -Infinity;
    score += result;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** Built-in fitness presets. */
export const FITNESS_PRESETS: Readonly<Record<string, readonly SoftConstraint[]>> = {
  "Mage Build": [
    { stat: "defense", type: "atLeast", value: 700, weight: 100 },
    { stat: "power", type: "atLeast", value: 100, weight: 90 },
    { stat: "dexterity", type: "target", value: 300, weight: 80, hardCap: 330 },
    { stat: "size", type: "target", value: 300, weight: 70, hardCap: 330 },
    { stat: "insanity", type: "exactly", value: 1, weight: 100 },
    { stat: "drawback", type: "atMost", value: 2, weight: 100 },
  ],
  "Warrior Build": [
    { stat: "power", type: "atLeast", value: 120, weight: 100 },
    { stat: "dexterity", type: "maximize", weight: 90 },
    { stat: "defense", type: "atLeast", value: 500, weight: 80 },
    { stat: "size", type: "maximize", weight: 60 },
    { stat: "insanity", type: "atMost", value: 1, weight: 100 },
    { stat: "drawback", type: "atMost", value: 2, weight: 100 },
  ],
  "Tank Build": [
    { stat: "defense", type: "maximize", weight: 100 },
    { stat: "warding", type: "atLeast", value: 2, weight: 90 },
    { stat: "power", type: "atLeast", value: 50, weight: 70 },
    { stat: "regeneration", type: "maximize", weight: 60 },
    { stat: "insanity", type: "atMost", value: 0, weight: 100 },
    { stat: "drawback", type: "atMost", value: 1, weight: 100 },
  ],
};

/** All available preset names. */
export const PRESET_NAMES: readonly string[] = Object.keys(FITNESS_PRESETS);
