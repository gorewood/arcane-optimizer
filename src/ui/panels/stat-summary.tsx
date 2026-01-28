/**
 * StatSummary — compact inline display of stat values for gear items.
 *
 * Renders non-zero stats as "+N Stat" or "-N Stat" with color coding.
 */

import type { Stats } from "@/models/types";

// ---------------------------------------------------------------------------
// Stat display names (abbreviated for compact layout)
// ---------------------------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
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

export function StatSummary({
  stats,
}: {
  readonly stats: Partial<Stats>;
}): React.JSX.Element {
  const entries = Object.entries(stats).filter(
    (entry): entry is [string, number] =>
      typeof entry[1] === "number" && entry[1] !== 0,
  );

  if (entries.length === 0) {
    return <span className="text-text-muted text-xs">No stats</span>;
  }

  return (
    <span className="font-stat text-xs leading-tight">
      {entries.map(([stat, value], i) => {
        const label = STAT_LABELS[stat] ?? stat;
        const isNegative = value < 0;
        const colorClass = isNegative
          ? "text-stat-negative"
          : "text-stat-positive";
        return (
          <span key={stat}>
            {i > 0 && <span className="text-text-muted">, </span>}
            <span className={colorClass}>
              {value > 0 ? "+" : ""}
              {value}
            </span>
            <span className="text-text-secondary"> {label}</span>
          </span>
        );
      })}
    </span>
  );
}
