/**
 * GoalsSection — collapsible optimization goals configuration wrapper.
 *
 * Shows a summary in the collapsed header, expands to reveal
 * the full constraint editor. Disabled when search is running.
 * Auto-closes when search completes.
 */

import { useState, useEffect } from "react";
import type { ScoringMode } from "@/search/scoring-mode";
import type { StatLimits, StatMinimums, StatWeights } from "@/data/profile-types";
import { DEFAULT_STAT_WEIGHTS } from "@/search/scoring-mode";
import { STAT_NAMES } from "@/search/stats";
import { useFitnessStore } from "@/stores/fitness-store";
import { useSearchStore } from "@/stores/search-store";
import { CollapsibleSection } from "./collapsible-section";
import { FitnessPanel } from "./fitness-panel";

// ---------------------------------------------------------------------------
// GoalsSection
// ---------------------------------------------------------------------------

export function GoalsSection(): React.JSX.Element {
  const scoringMode = useFitnessStore((s) => s.scoringMode);
  const constraints = useFitnessStore((s) => s.constraintsConfig.constraints);
  const efficiencyConfig = useFitnessStore((s) => s.efficiencyConfig);
  const multiplierConfig = useFitnessStore((s) => s.multiplierConfig);
  const searchStatus = useSearchStore((s) => s.status);

  const [goalsOpen, setGoalsOpen] = useState(false);

  // Close goals panel when search completes (subscription pattern)
  useEffect(() => {
    let prevStatus = useSearchStore.getState().status;
    const unsubscribe = useSearchStore.subscribe((state) => {
      if (prevStatus === "running" && state.status === "complete") {
        setGoalsOpen(false);
      }
      prevStatus = state.status;
    });
    return unsubscribe;
  }, []);

  const summary = buildSummary(
    scoringMode,
    constraints,
    scoringMode === "multiplier" ? multiplierConfig : efficiencyConfig,
  );
  const isRunning = searchStatus === "running";

  return (
    <CollapsibleSection
      title="Goals"
      summary={summary}
      open={goalsOpen}
      onOpenChange={setGoalsOpen}
      disabled={isRunning}
      disabledReason="Search running..."
    >
      <GoalsContent />
    </CollapsibleSection>
  );
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

interface WeightsConfig {
  readonly limits: StatLimits;
  readonly minimums: StatMinimums;
  readonly weights: StatWeights;
}

function buildSummary(
  mode: ScoringMode,
  constraints: readonly { stat: string; type: string; value?: number | undefined }[],
  weightsConfig: WeightsConfig,
): string {
  if (mode === "linear") {
    return buildConstraintsSummary(constraints);
  }
  return buildWeightsSummary(mode, weightsConfig);
}

/** Summary for Constraints mode: show top constraints. */
function buildConstraintsSummary(
  constraints: readonly { stat: string; type: string; value?: number | undefined }[],
): string {
  if (constraints.length === 0) {
    return "Constraints · No constraints";
  }

  const parts: string[] = ["Constraints"];

  // Show top 3 constraints in summary
  const topConstraints = constraints.slice(0, 3);
  for (const c of topConstraints) {
    const typeSymbol = getTypeSymbol(c.type);
    if (c.value != null) {
      parts.push(`${capitalize(c.stat)} ${typeSymbol} ${String(c.value)}`);
    } else {
      parts.push(`${capitalize(c.stat)} ${typeSymbol}`);
    }
  }

  if (constraints.length > 3) {
    parts.push(`+${String(constraints.length - 3)} more`);
  }

  return parts.join(" · ");
}

/** Summary for Efficiency/Multiplier modes: show limits, minimums, weights status. */
function buildWeightsSummary(mode: ScoringMode, config: WeightsConfig): string {
  const parts: string[] = [mode === "efficiency" ? "Efficiency" : "Multiplier"];

  // Active limits (non-zero values)
  const activeLimits: string[] = [];
  if (config.limits.insanity > 0) activeLimits.push(`Ins≤${String(config.limits.insanity)}`);
  if (config.limits.warding > 0) activeLimits.push(`War≤${String(config.limits.warding)}`);
  if (config.limits.drawback > 0) activeLimits.push(`Drw≤${String(config.limits.drawback)}`);

  if (activeLimits.length > 0) {
    parts.push(activeLimits.join(", "));
  }

  // Active minimums count
  const minimumCount = Object.keys(config.minimums).length;
  if (minimumCount > 0) {
    parts.push(`${String(minimumCount)} min${minimumCount > 1 ? "s" : ""}`);
  }

  // Check if weights are modified
  const hasModifiedWeights = STAT_NAMES.some(
    (stat) => config.weights[stat] !== DEFAULT_STAT_WEIGHTS[stat],
  );
  if (hasModifiedWeights) {
    parts.push("weights modified");
  }

  return parts.join(" · ");
}

function getTypeSymbol(type: string): string {
  switch (type) {
    case "maximize": return "max";
    case "minimize": return "min";
    case "atLeast": return ">=";
    case "atMost": return "<=";
    case "exactly": return "=";
    case "target": return "~";
    default: return "";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1, 3);
}

// ---------------------------------------------------------------------------
// GoalsContent — trimmed version without heading/summary
// ---------------------------------------------------------------------------

function GoalsContent(): React.JSX.Element {
  return (
    <div className="-m-4">
      <FitnessPanel />
    </div>
  );
}
