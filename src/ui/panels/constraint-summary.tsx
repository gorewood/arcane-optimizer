/**
 * ConstraintSummary -- displays constraint count, active preset,
 * top prioritized stats, and validation warnings.
 */

import { useMemo } from "react";
import type { SoftConstraint, StatName } from "@/models/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConstraintSummaryProps {
  readonly constraints: readonly SoftConstraint[];
  readonly activePresetName: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the top N stat names sorted by descending weight. */
function getTopStats(
  constraints: readonly SoftConstraint[],
  count: number,
): readonly StatName[] {
  const sorted = [...constraints].sort((a, b) => b.weight - a.weight);
  const seen = new Set<StatName>();
  const result: StatName[] = [];

  for (const c of sorted) {
    if (!seen.has(c.stat)) {
      seen.add(c.stat);
      result.push(c.stat);
    }
    if (result.length >= count) break;
  }

  return result;
}

/** Detect duplicate stat+type combinations. */
function findDuplicates(
  constraints: readonly SoftConstraint[],
): readonly string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];

  for (const c of constraints) {
    const key = `${c.stat}:${c.type}`;
    if (seen.has(key)) {
      dupes.push(`${c.stat} (${c.type})`);
    }
    seen.add(key);
  }

  return dupes;
}

// ---------------------------------------------------------------------------
// ConstraintSummary
// ---------------------------------------------------------------------------

export function ConstraintSummary({
  constraints,
  activePresetName,
}: ConstraintSummaryProps): React.JSX.Element {
  const topStats = useMemo(() => getTopStats(constraints, 3), [constraints]);
  const duplicates = useMemo(() => findDuplicates(constraints), [constraints]);

  return (
    <div className="space-y-1.5 rounded-md bg-bg-elevated px-3 py-2">
      <SummaryLine
        constraints={constraints}
        activePresetName={activePresetName}
        topStats={topStats}
      />
      {constraints.length === 0 && <EmptyWarning />}
      {duplicates.length > 0 && <DuplicateWarning duplicates={duplicates} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryLine
// ---------------------------------------------------------------------------

function SummaryLine({
  constraints,
  activePresetName,
  topStats,
}: {
  readonly constraints: readonly SoftConstraint[];
  readonly activePresetName: string | null;
  readonly topStats: readonly StatName[];
}): React.JSX.Element {
  const presetSuffix =
    activePresetName != null ? ` (${activePresetName} preset)` : "";

  return (
    <p className="text-xs text-text-secondary">
      <span className="font-stat text-text-primary">
        {constraints.length}
      </span>
      {" constraint"}
      {constraints.length !== 1 ? "s" : ""} active
      {presetSuffix}
      {topStats.length > 0 && (
        <>
          {" \u2014 Prioritizing: "}
          <span className="text-accent-gold">
            {topStats.join(", ")}
          </span>
        </>
      )}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function EmptyWarning(): React.JSX.Element {
  return (
    <p className="text-xs text-stat-warning">
      No constraints set &mdash; optimizer will accept any loadout
    </p>
  );
}

function DuplicateWarning({
  duplicates,
}: {
  readonly duplicates: readonly string[];
}): React.JSX.Element {
  return (
    <p className="text-xs text-stat-warning">
      Duplicate constraint{duplicates.length > 1 ? "s" : ""}:{" "}
      {duplicates.join(", ")}
    </p>
  );
}
