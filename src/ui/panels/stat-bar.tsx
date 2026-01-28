/**
 * StatBar — mini progress bar with target reference mark.
 *
 * Shows a horizontal bar representing a stat value relative to a max,
 * with an optional target marker line. Uses group-based colors when no
 * constraint is active, or satisfaction colors when there's a constraint.
 */

import type { SoftConstraint, StatName } from "@/models/types";
import { getSatisfaction, SATISFACTION_BG_CLASSES } from "@/search/satisfaction";
import { STAT_LABELS } from "./stat-indicator";

// Group-based bar colors (used when no constraint is set)
type StatGroup = "combat" | "scaling" | "risk" | "defensive";

const GROUP_BAR_COLORS: Record<StatGroup, string> = {
  combat: "bg-accent-ember",     // Red-orange for power/defense
  scaling: "bg-accent-gold",     // Gold for scaling stats
  risk: "bg-accent-purple",      // Purple for risk stats
  defensive: "bg-accent-teal",   // Teal for defensive stats
};

interface StatBarProps {
  readonly stat: StatName;
  readonly value: number;
  readonly max: number;
  readonly constraint?: SoftConstraint | undefined;
  readonly group?: StatGroup | undefined;
}

export function StatBar({
  stat,
  value,
  max,
  constraint,
  group,
}: StatBarProps): React.JSX.Element {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const level = constraint != null ? getSatisfaction(value, constraint) : "neutral";
  // Use satisfaction colors when there's an active constraint, otherwise use group colors
  const barColor = constraint != null
    ? SATISFACTION_BG_CLASSES[level]
    : group != null
      ? GROUP_BAR_COLORS[group]
      : "bg-accent-gold";
  const label = STAT_LABELS[stat];

  // Calculate target marker position if constraint has a target value
  const targetPct =
    constraint?.value != null && max > 0
      ? Math.min((constraint.value / max) * 100, 100)
      : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="font-stat text-text-primary">{value}</span>
      </div>
      <div className="stat-bar relative">
        <div
          className={`stat-bar-fill ${barColor}`}
          style={{ width: `${String(pct)}%` }}
        />
        {targetPct != null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-text-primary/60"
            style={{ left: `${String(targetPct)}%` }}
            title={`Target: ${String(constraint?.value)}`}
          />
        )}
      </div>
    </div>
  );
}
