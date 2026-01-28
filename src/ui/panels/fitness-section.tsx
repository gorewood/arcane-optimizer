/**
 * FitnessSection — collapsible fitness configuration wrapper.
 *
 * Shows a summary in the collapsed header, expands to reveal
 * the full constraint editor.
 */

import { useFitnessStore } from "@/stores/fitness-store";
import { CollapsibleSection } from "./collapsible-section";
import { FitnessPanel } from "./fitness-panel";

// ---------------------------------------------------------------------------
// FitnessSection
// ---------------------------------------------------------------------------

export function FitnessSection(): React.JSX.Element {
  const constraints = useFitnessStore((s) => s.constraints);
  const activePresetName = useFitnessStore((s) => s.activePresetName);

  const summary = buildSummary(constraints, activePresetName);

  return (
    <CollapsibleSection title="Fitness" summary={summary} defaultOpen={false}>
      <FitnessContent />
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
// FitnessContent — trimmed version without heading/summary
// ---------------------------------------------------------------------------

function FitnessContent(): React.JSX.Element {
  // Render FitnessPanel without wrapping div (it handles its own padding)
  // The outer CollapsibleSection already provides padding
  return (
    <div className="-m-4">
      <FitnessPanel />
    </div>
  );
}
