/**
 * ConstraintPips — colored dots for at-a-glance constraint satisfaction.
 *
 * Shows a row of dots (pips) colored by satisfaction level:
 * - Green: constraint satisfied
 * - Yellow: warning (close to target)
 * - Red: violated
 */

import type { SoftConstraint, Stats } from "@/models/types";
import { getSatisfaction, SATISFACTION_BG_CLASSES } from "@/search/satisfaction";

interface ConstraintPipsProps {
  readonly stats: Stats;
  readonly constraints: readonly SoftConstraint[];
}

export function ConstraintPips({
  stats,
  constraints,
}: ConstraintPipsProps): React.JSX.Element {
  if (constraints.length === 0) {
    return <span className="text-xs text-text-muted">No constraints</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {constraints.map((c, i) => {
        const value = stats[c.stat];
        const level = getSatisfaction(value, c);
        const bgClass = SATISFACTION_BG_CLASSES[level];

        return (
          <span
            key={`${c.stat}-${String(i)}`}
            className={`inline-block h-2 w-2 rounded-full ${bgClass}`}
            title={`${c.stat}: ${String(value)} (${c.type}${c.value != null ? ` ${String(c.value)}` : ""})`}
          />
        );
      })}
    </div>
  );
}

/**
 * Counts constraint satisfaction levels for summary display.
 */
export function countSatisfactionLevels(
  stats: Stats,
  constraints: readonly SoftConstraint[],
): { positive: number; warning: number; negative: number } {
  let positive = 0;
  let warning = 0;
  let negative = 0;

  for (const c of constraints) {
    const level = getSatisfaction(stats[c.stat], c);
    if (level === "positive") positive++;
    else if (level === "warning") warning++;
    else if (level === "negative") negative++;
  }

  return { positive, warning, negative };
}
