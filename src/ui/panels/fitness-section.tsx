/**
 * GoalsSection — collapsible optimization goals configuration wrapper.
 *
 * Shows a summary in the collapsed header, expands to reveal
 * the full constraint editor. Disabled when search is running.
 * Auto-closes when search completes.
 */

import { useState, useEffect } from "react";
import { useFitnessStore } from "@/stores/fitness-store";
import { useSearchStore } from "@/stores/search-store";
import { CollapsibleSection } from "./collapsible-section";
import { FitnessPanel } from "./fitness-panel";

// ---------------------------------------------------------------------------
// GoalsSection
// ---------------------------------------------------------------------------

export function GoalsSection(): React.JSX.Element {
  const constraints = useFitnessStore((s) => s.constraintsConfig.constraints);
  const activeProfileId = useFitnessStore((s) => s.activeProfileId);
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

  const summary = buildSummary(constraints, activeProfileId);
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

function buildSummary(
  constraints: readonly { stat: string; type: string; value?: number | undefined }[],
  profileId: string | null,
): string {
  const parts: string[] = [];

  // Profile ID shown in summary (could look up name, but ID is simpler)
  if (profileId != null) {
    parts.push("Profile loaded");
  }

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

  return parts.length > 0 ? parts.join(" | ") : "No constraints";
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
