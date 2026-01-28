/**
 * GoalsSection — collapsible optimization goals configuration wrapper.
 *
 * Shows a summary in the collapsed header, expands to reveal
 * the full constraint editor. Disabled when search is running.
 */

import { useFitnessStore } from "@/stores/fitness-store";
import { useSearchStore } from "@/stores/search-store";
import { CollapsibleSection } from "./collapsible-section";
import { FitnessPanel } from "./fitness-panel";

// ---------------------------------------------------------------------------
// GoalsSection
// ---------------------------------------------------------------------------

export function GoalsSection(): React.JSX.Element {
  const constraints = useFitnessStore((s) => s.constraints);
  const activePresetName = useFitnessStore((s) => s.activePresetName);
  const searchStatus = useSearchStore((s) => s.status);

  const summary = buildSummary(constraints, activePresetName);
  const isRunning = searchStatus === "running";

  return (
    <CollapsibleSection
      title="Goals"
      summary={summary}
      defaultOpen={false}
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
  constraints: ReturnType<typeof useFitnessStore.getState>["constraints"],
  presetName: string | null,
): string {
  const parts: string[] = [];

  if (presetName != null) {
    parts.push(presetName);
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
