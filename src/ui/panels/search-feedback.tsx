/**
 * Search feedback components — progress, warnings, errors, status bar.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import type { SearchResult } from "@/models/types";
import type { ExitMetadata } from "@/stores/search-store";

// ---------------------------------------------------------------------------
// ProgressState (shared with SearchPanel)
// ---------------------------------------------------------------------------

export interface ProgressState {
  readonly checked: number;
  readonly total: number;
  readonly bestScore: number;
  readonly startTime: number;
  readonly resultsCount?: number;
}

export const INITIAL_PROGRESS: ProgressState = {
  checked: 0,
  total: 0,
  bestScore: 0,
  startTime: 0,
  resultsCount: 0,
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
// SearchStatusBar — unified progress/results display
// ---------------------------------------------------------------------------

interface SearchStatusBarProps {
  readonly isRunning: boolean;
  readonly isComplete: boolean;
  readonly progress: ProgressState;
  readonly results: readonly SearchResult[];
  readonly exitMetadata: ExitMetadata | null;
}

export function SearchStatusBar(props: SearchStatusBarProps): React.JSX.Element {
  const { isRunning, isComplete, progress, results, exitMetadata } = props;
  const elapsed = useElapsedTime(progress.startTime, isRunning);
  const stats = computeDisplayStats(progress, results, isComplete, elapsed);
  const cardClass = isComplete
    ? "border-stat-positive/40 bg-stat-positive/5"
    : "border-text-muted/20 bg-surface-elevated/50";

  return (
    <Card className={`${cardClass} p-3 space-y-2`}>
      {isRunning && <ProgressBar checked={progress.checked} total={progress.total} />}
      <StatusRow isRunning={isRunning} isComplete={isComplete} stats={stats} exitMetadata={exitMetadata} />
    </Card>
  );
}

function useElapsedTime(startTime: number, isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => { setElapsed((Date.now() - startTime) / 1000); }, 200);
    return () => { clearInterval(id); };
  }, [startTime, isRunning]);
  return elapsed;
}

interface DisplayStats {
  readonly checked: number;
  readonly total: number;
  readonly resultsCount: number;
  readonly bestScore: number;
  readonly elapsed: number;
}

function computeDisplayStats(
  progress: ProgressState,
  results: readonly SearchResult[],
  isComplete: boolean,
  elapsed: number,
): DisplayStats {
  return {
    checked: progress.checked,
    total: progress.total,
    resultsCount: isComplete ? results.length : (progress.resultsCount ?? 0),
    bestScore: isComplete && results.length > 0 ? (results[0]?.score ?? progress.bestScore) : progress.bestScore,
    elapsed,
  };
}

function ProgressBar({ checked, total }: { readonly checked: number; readonly total: number }): React.JSX.Element {
  const pct = total > 0 ? Math.min((checked / total) * 100, 100) : 0;
  return (
    <div className="stat-bar">
      <div className="stat-bar-fill bg-accent-gold" style={{ width: `${String(pct)}%` }} />
    </div>
  );
}

interface StatusRowProps {
  readonly isRunning: boolean;
  readonly isComplete: boolean;
  readonly stats: DisplayStats;
  readonly exitMetadata: ExitMetadata | null;
}

function StatusRow({ isRunning, isComplete, stats, exitMetadata }: StatusRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between text-xs">
      <StatusLabel isComplete={isComplete} exitMetadata={exitMetadata} />
      <div className="flex items-center gap-4 text-text-secondary">
        {isRunning && <StatPair label="Checked" value={`${formatNumber(stats.checked)}/${formatNumber(stats.total)}`} />}
        <StatPair label="Results" value={String(stats.resultsCount)} />
        <StatPair label="Best" value={formatScore(stats.bestScore)} valueClass="text-accent-gold" />
        <StatPair label="Time" value={`${stats.elapsed.toFixed(1)}s`} />
      </div>
    </div>
  );
}

function StatPair({ label, value, valueClass }: { readonly label: string; readonly value: string; readonly valueClass?: string }): React.JSX.Element {
  return (
    <span>
      <span className="text-text-muted">{label} </span>
      <span className={`font-stat ${valueClass ?? "text-text-primary"}`}>{value}</span>
    </span>
  );
}

function StatusLabel({ isComplete, exitMetadata }: { readonly isComplete: boolean; readonly exitMetadata: ExitMetadata | null }): React.JSX.Element {
  if (!isComplete) return <span className="text-text-muted">Searching...</span>;
  const earlyExit = exitMetadata?.reason === "stagnation" && exitMetadata.finalGeneration != null;
  return (
    <span className="font-semibold text-stat-positive">
      Complete{earlyExit && <span className="font-normal text-text-muted ml-1">(gen {String(exitMetadata.finalGeneration)})</span>}
    </span>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatScore(score: number): string {
  if (score === -Infinity) return "—";
  if (Math.abs(score) >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`;
  if (Math.abs(score) >= 1_000) return `${(score / 1_000).toFixed(1)}K`;
  return score.toFixed(0);
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
