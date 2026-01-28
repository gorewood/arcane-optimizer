/**
 * ResultsPanel — displays search results as ranked build cards.
 *
 * Shows an empty state when no results are available, and a scrollable
 * list of expandable BuildCards when results exist. Auto-expands the
 * top result when search completes.
 */

import { useEffect } from "react";
import { useSearchStore } from "@/stores/search-store";
import { useFitnessStore } from "@/stores/fitness-store";
import { useUIStore } from "@/stores/ui-store";
import { BuildCard } from "./build-card";

// ---------------------------------------------------------------------------
// ResultsPanel
// ---------------------------------------------------------------------------

export function ResultsPanel(): React.JSX.Element {
  const results = useSearchStore((s) => s.results);
  const status = useSearchStore((s) => s.status);
  const constraints = useFitnessStore((s) => s.constraints);
  const expandedCards = useUIStore((s) => s.expandedCardIndices);
  const toggleCardExpanded = useUIStore((s) => s.toggleCardExpanded);
  const setExpandedCards = useUIStore((s) => s.setExpandedCards);

  const isRunning = status === "running";

  // Expand top result when search completes (subscription pattern)
  useEffect(() => {
    let prevStatus = useSearchStore.getState().status;
    const unsubscribe = useSearchStore.subscribe((state) => {
      if (prevStatus === "running" && state.status === "complete") {
        if (state.results.length > 0) {
          setExpandedCards(new Set([0]));
        }
      }
      prevStatus = state.status;
    });
    return unsubscribe;
  }, [setExpandedCards]);

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-lg font-bold text-text-primary">
        Search Results
        {results.length > 0 && (
          <span className="ml-2 text-sm text-text-muted font-normal">
            ({String(results.length)} builds{isRunning ? " so far" : ""})
          </span>
        )}
      </h2>

      {isRunning && <RunningIndicator />}
      {status === "error" && <ErrorMessage />}

      {results.length === 0 && !isRunning ? (
        <EmptyState />
      ) : (
        <ResultsList
          results={results}
          constraints={constraints}
          disabled={isRunning}
          expandedCards={expandedCards}
          onToggleExpanded={toggleCardExpanded}
        />
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
  disabled = false,
  expandedCards,
  onToggleExpanded,
}: {
  readonly results: ReturnType<typeof useSearchStore.getState>["results"];
  readonly constraints: ReturnType<
    typeof useFitnessStore.getState
  >["constraints"];
  readonly disabled?: boolean;
  readonly expandedCards: ReadonlySet<number>;
  readonly onToggleExpanded: (index: number) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      {results.map((result, i) => (
        <BuildCard
          key={i}
          rank={i + 1}
          result={result}
          constraints={constraints}
          disabled={disabled}
          expanded={expandedCards.has(i)}
          onToggleExpanded={() => { onToggleExpanded(i); }}
        />
      ))}
    </div>
  );
}
