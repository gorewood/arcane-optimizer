/**
 * StatIndicator — renders a stat value with color based on constraint satisfaction.
 *
 * Green: meets constraint target.
 * Yellow: within 80% of target.
 * Red: violates constraint.
 * Default (no constraint): secondary text.
 */

import type { ConstraintType, SoftConstraint, StatName } from "@/models/types";

// ---------------------------------------------------------------------------
// Satisfaction color logic
// ---------------------------------------------------------------------------

type SatisfactionLevel = "positive" | "warning" | "negative" | "neutral";

const SATISFACTION_CLASSES: Record<SatisfactionLevel, string> = {
  positive: "text-stat-positive",
  warning: "text-stat-warning",
  negative: "text-stat-negative",
  neutral: "text-text-secondary",
};

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

/** Determine satisfaction level for a stat value against its constraint. */
function getSatisfaction(
  value: number,
  constraint: SoftConstraint,
): SatisfactionLevel {
  return CHECKERS[constraint.type](value, constraint.value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Map of stat names to abbreviated display labels. */
const STAT_LABELS: Record<StatName, string> = {
  power: "Pow",
  defense: "Def",
  size: "Size",
  dexterity: "Dex",
  range: "Rng",
  haste: "Haste",
  insanity: "Ins",
  warding: "Ward",
  drawback: "Draw",
  regeneration: "Regen",
  pierce: "Pierce",
  resistance: "Res",
};

export function StatIndicator({
  stat,
  value,
  constraint,
}: {
  readonly stat: StatName;
  readonly value: number;
  readonly constraint: SoftConstraint | undefined;
}): React.JSX.Element {
  const level =
    constraint != null ? getSatisfaction(value, constraint) : "neutral";
  const colorClass = SATISFACTION_CLASSES[level];
  const label = STAT_LABELS[stat];

  return (
    <span className="font-stat text-xs">
      <span className="text-text-muted">{label} </span>
      <span className={colorClass}>{value}</span>
    </span>
  );
}
