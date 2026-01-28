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

/** Check target constraint: green within 10%, yellow within 20%, red otherwise. */
function checkTarget(value: number, target: number): SatisfactionLevel {
  const diff = Math.abs(value - target);
  if (diff <= target * 0.1) return "positive";
  if (diff <= target * 0.2) return "warning";
  return "negative";
}

/** Dispatch table for constraint type -> satisfaction checker. */
const CHECKERS: Record<
  ConstraintType,
  (value: number, target: number | undefined) => SatisfactionLevel
> = {
  maximize: () => "positive",
  minimize: () => "positive",
  exactly: (v, t) => (v === t ? "positive" : "negative"),
  atLeast: (v, t) => (t != null ? checkAtLeast(v, t) : "neutral"),
  atMost: (v, t) => (t != null ? checkAtMost(v, t) : "neutral"),
  target: (v, t) => (t != null ? checkTarget(v, t) : "neutral"),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Determine satisfaction level for a stat value against its constraint. */
export function getSatisfaction(
  value: number,
  constraint: SoftConstraint,
): SatisfactionLevel {
  return CHECKERS[constraint.type](value, constraint.value);
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
