/**
 * OptimizerPage — consolidated optimizer page.
 *
 * One scrollable page combining:
 * - Collapsible fitness section (collapsed by default)
 * - Search bar (always visible)
 * - Results list (always visible)
 *
 * Owns the useSearchWorker hook to ensure worker survives tab switches.
 */

import { useState } from "react";
import { useSearchStore } from "@/stores/search-store";
import { useFitnessStore } from "@/stores/fitness-store";
import { useUIStore } from "@/stores/ui-store";
import { useSearchWorker } from "@/ui/hooks/use-search-worker";
import { GoalsSection } from "./fitness-section";
import { SearchBar } from "./search-bar";
import { BuildCard } from "./build-card";

// ---------------------------------------------------------------------------
// OptimizerPage
// ---------------------------------------------------------------------------

export function OptimizerPage(): React.JSX.Element {
  const [maxResults, setMaxResults] = useState(10);
  const { controls, progress, warning } = useSearchWorker(maxResults);

  return (
    <div className="space-y-4 p-4">
      {/* Collapsible fitness section */}
      <GoalsSection />

      {/* Search controls bar */}
      <SearchBar
        onStart={controls.start}
        onStop={controls.stop}
        progress={progress}
        warning={warning}
        maxResults={maxResults}
        onMaxResultsChange={setMaxResults}
      />

      {/* Results section */}
      <ResultsSection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultsSection
// ---------------------------------------------------------------------------

function ResultsSection(): React.JSX.Element {
  const results = useSearchStore((s) => s.results);
  const status = useSearchStore((s) => s.status);
  const constraints = useFitnessStore((s) => s.constraints);
  const expandedCards = useUIStore((s) => s.expandedCardIndices);
  const toggleCardExpanded = useUIStore((s) => s.toggleCardExpanded);

  if (results.length === 0 && status !== "running") {
    return (
      <div className="rounded-lg border border-border-default bg-bg-surface p-6 text-center">
        <p className="text-text-muted text-sm">
          No results yet. Configure your gear pool and run a search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-accent-gold">
            Results
            <span className="ml-2 text-xs text-text-muted font-normal">
              ({String(results.length)} builds)
            </span>
          </span>
        </div>
      )}

      {results.map((result, i) => (
        <BuildCard
          key={i}
          rank={i + 1}
          result={result}
          constraints={constraints}
          expanded={expandedCards.has(i)}
          onToggleExpanded={() => { toggleCardExpanded(i); }}
        />
      ))}
    </div>
  );
}
