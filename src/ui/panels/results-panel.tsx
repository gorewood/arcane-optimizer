/**
 * ResultsPanel — displays search results as ranked build cards.
 *
 * Shows an empty state when no results are available, and a scrollable
 * list of expandable BuildCards when results exist.
 */

import { useSearchStore } from "@/stores/search-store";
import { useFitnessStore } from "@/stores/fitness-store";
import { BuildCard } from "./build-card";

// ---------------------------------------------------------------------------
// ResultsPanel
// ---------------------------------------------------------------------------

export function ResultsPanel(): React.JSX.Element {
  const results = useSearchStore((s) => s.results);
  const status = useSearchStore((s) => s.status);
  const constraints = useFitnessStore((s) => s.constraints);

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-lg font-bold text-text-primary">
        Search Results
        {results.length > 0 && (
          <span className="ml-2 text-sm text-text-muted font-normal">
            ({String(results.length)} builds)
          </span>
        )}
      </h2>

      {status === "running" && <RunningIndicator />}
      {status === "error" && <ErrorMessage />}

      {results.length === 0 && status !== "running" ? (
        <EmptyState />
      ) : (
        <ResultsList results={results} constraints={constraints} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState(): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center">
      <p className="text-text-muted text-sm">
        No results yet. Configure your gear pool and run a search.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RunningIndicator
// ---------------------------------------------------------------------------

function RunningIndicator(): React.JSX.Element {
  const progress = useSearchStore((s) => s.progress);

  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-4">
      <p className="text-text-secondary text-sm">
        Search in progress...{" "}
        <span className="font-stat text-accent-amber">
          {String(Math.round(progress * 100))}%
        </span>
      </p>
      <div className="stat-bar mt-2">
        <div
          className="stat-bar-fill bg-accent-gold"
          style={{ width: `${String(Math.round(progress * 100))}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorMessage
// ---------------------------------------------------------------------------

function ErrorMessage(): React.JSX.Element {
  const error = useSearchStore((s) => s.error);

  return (
    <div className="rounded-lg border border-stat-negative/30 bg-bg-surface p-4">
      <p className="text-stat-negative text-sm">
        Search failed: {error ?? "Unknown error"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultsList
// ---------------------------------------------------------------------------

function ResultsList({
  results,
  constraints,
}: {
  readonly results: ReturnType<typeof useSearchStore.getState>["results"];
  readonly constraints: ReturnType<
    typeof useFitnessStore.getState
  >["constraints"];
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      {results.map((result, i) => (
        <BuildCard
          key={i}
          rank={i + 1}
          result={result}
          constraints={constraints}
        />
      ))}
    </div>
  );
}
