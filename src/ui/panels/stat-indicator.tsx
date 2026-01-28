/**
 * StatIndicator — renders a stat value with color based on constraint satisfaction.
 *
 * Green: meets constraint target.
 * Yellow: within 80% of target.
 * Red: violates constraint.
 * Default (no constraint): secondary text.
 */

import type { SoftConstraint, StatName } from "@/models/types";
import {
  getSatisfaction,
  SATISFACTION_CLASSES,
} from "@/search/satisfaction";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Map of stat names to abbreviated display labels. */
export const STAT_LABELS: Record<StatName, string> = {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
