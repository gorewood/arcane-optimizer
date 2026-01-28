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
import { useSearchWorker } from "@/ui/hooks/use-search-worker";
import { GoalsSection } from "./fitness-section";
import { SearchBar } from "./search-bar";
import { ResultsPanel } from "./results-panel";

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
      <ResultsPanel />
    </div>
  );
}

