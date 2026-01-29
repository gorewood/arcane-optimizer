/**
 * Satisfaction logic for constraint evaluation.
 *
 * Determines how well a stat value satisfies a constraint:
 * - positive: meets or exceeds target
 * - warning: within acceptable margin (80-120% depending on constraint type)
 * - negative: violates constraint
 * - neutral: no constraint defined
 */

import type { ConstraintType, SoftConstraint } from "@/models/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SatisfactionLevel = "positive" | "warning" | "negative" | "neutral";

// ---------------------------------------------------------------------------
// Satisfaction checkers
// ---------------------------------------------------------------------------

/** Check atLeast constraint: green >= target, yellow >= 80%, red otherwise. */
function checkAtLeast(value: number, target: number): SatisfactionLevel {
  if (value >= target) return "positive";
  if (value >= target * 0.8) return "warning";
  return "negative";
}

/** Check atMost constraint: green <= target, yellow <= 120%, red otherwise. */
function checkAtMost(value: number, target: number): SatisfactionLevel {
  if (value <= target) return "positive";
  if (value <= target * 1.2) return "warning";
  return "negative";
}

/** Check between constraint: green in range, yellow within 10% of bounds, red otherwise. */
function checkBetween(value: number, min: number, max: number): SatisfactionLevel {
  if (value >= min && value <= max) return "positive";
  const belowMin = min - value;
  const aboveMax = value - max;
  const margin = (max - min) * 0.1 || 1;
  if (belowMin > 0 && belowMin <= margin) return "warning";
  if (aboveMax > 0 && aboveMax <= margin) return "warning";
  return "negative";
}

/** Dispatch table for constraint type -> satisfaction checker. */
const CHECKERS: Record<
  ConstraintType,
  (value: number, target: number | undefined, hardCap: number | undefined) => SatisfactionLevel
> = {
  maximize: () => "positive",
  minimize: () => "positive",
  exactly: (v, t) => (v === t ? "positive" : "negative"),
  atLeast: (v, t) => (t != null ? checkAtLeast(v, t) : "neutral"),
  atMost: (v, t) => (t != null ? checkAtMost(v, t) : "neutral"),
  between: (v, t, hc) => (t != null && hc != null ? checkBetween(v, t, hc) : "neutral"),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Determine satisfaction level for a stat value against its constraint. */
export function getSatisfaction(
  value: number,
  constraint: SoftConstraint,
): SatisfactionLevel {
  return CHECKERS[constraint.type](value, constraint.value, constraint.hardCap);
}

/** CSS class names for each satisfaction level. */
export const SATISFACTION_CLASSES: Record<SatisfactionLevel, string> = {
  positive: "text-stat-positive",
  warning: "text-stat-warning",
  negative: "text-stat-negative",
  neutral: "text-text-secondary",
};

/** Background color classes for pips/indicators. */
export const SATISFACTION_BG_CLASSES: Record<SatisfactionLevel, string> = {
  positive: "bg-stat-positive",
  warning: "bg-stat-warning",
  negative: "bg-stat-negative",
  neutral: "bg-text-muted",
};
