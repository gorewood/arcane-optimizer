/**
 * ResultsPanel — displays search results as ranked build cards.
 *
 * Shows an empty state when no results are available, and a scrollable
 * list of expandable BuildCards when results exist. Auto-expands the
 * top result when search completes.
 */

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

  const isRunning = status === "running";

  if (results.length === 0 && !isRunning) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {results.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-accent-gold">
            Results
            <span className="ml-2 text-xs text-text-muted font-normal">
              ({String(results.length)} builds{isRunning ? " so far" : ""})
            </span>
          </span>
        </div>
      )}

      {status === "error" && <ErrorMessage />}

      <ResultsList
        results={results}
        constraints={constraints}
        disabled={isRunning}
        expandedCards={expandedCards}
        onToggleExpanded={toggleCardExpanded}
      />
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
