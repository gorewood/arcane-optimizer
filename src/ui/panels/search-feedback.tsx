/**
 * Search feedback components — progress, warnings, errors, summaries.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import type { SearchResult } from "@/models/types";

// ---------------------------------------------------------------------------
// ProgressState (shared with SearchPanel)
// ---------------------------------------------------------------------------

export interface ProgressState {
  readonly checked: number;
  readonly total: number;
  readonly bestScore: number;
  readonly startTime: number;
}

export const INITIAL_PROGRESS: ProgressState = {
  checked: 0,
  total: 0,
  bestScore: 0,
  startTime: 0,
};

// ---------------------------------------------------------------------------
// WarningMessage
// ---------------------------------------------------------------------------

export function WarningMessage({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <Card className="border-stat-warning/40 bg-stat-warning/5 p-4">
      <p className="text-sm text-stat-warning">{message}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ProgressDisplay — uses interval for elapsed time to avoid impure render
// ---------------------------------------------------------------------------

export function ProgressDisplay({
  progress,
}: {
  readonly progress: ProgressState;
}): React.JSX.Element {
  const { checked, total, bestScore, startTime } = progress;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 200);
    return () => { clearInterval(id); };
  }, [startTime]);

  const pct = total > 0 ? Math.min((checked / total) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      <div className="stat-bar">
        <div
          className="stat-bar-fill bg-accent-gold"
          style={{ width: `${String(pct)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <ProgressStat label="Checked" value={`${String(checked)} / ${String(total)}`} />
        <ProgressStat label="Elapsed" value={`${elapsed.toFixed(1)}s`} />
        <ProgressStat label="Best Score" value={bestScore.toFixed(1)} />
      </div>
    </div>
  );
}

function ProgressStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div>
      <p className="text-text-muted">{label}</p>
      <p className="font-stat text-text-primary">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorDisplay
// ---------------------------------------------------------------------------

export function ErrorDisplay({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <Card className="border-stat-negative/40 bg-stat-negative/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-stat-negative">Search Error</p>
      <p className="text-sm text-text-secondary">{message}</p>
      <p className="text-xs text-text-muted">
        Try relaxing constraints or expanding the gear pool
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ResultsSummary
// ---------------------------------------------------------------------------

export function ResultsSummary({
  results,
}: {
  readonly results: readonly SearchResult[];
}): React.JSX.Element {
  const bestScore = results.length > 0 ? results[0]?.score ?? 0 : 0;

  return (
    <Card className="border-stat-positive/40 bg-stat-positive/5 p-4 space-y-1">
      <p className="text-sm font-semibold text-stat-positive">Search Complete</p>
      <p className="text-sm text-text-secondary">
        Found{" "}
        <span className="font-stat text-text-primary">{String(results.length)}</span>
        {" "}result{results.length !== 1 ? "s" : ""}
      </p>
      {results.length > 0 && (
        <p className="text-sm text-text-secondary">
          Best score:{" "}
          <span className="font-stat text-accent-gold">{bestScore.toFixed(1)}</span>
        </p>
      )}
    </Card>
  );
}
