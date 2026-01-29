/**
 * FitnessPanel -- editor for configuring soft constraints and profiles.
 *
 * Allows users to manage profiles, add/edit/remove soft constraints.
 * Note: Heading and summary moved to FitnessSection collapsible wrapper.
 */

import type { SoftConstraint } from "@/models/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFitnessStore } from "@/stores/fitness-store";
import { useUIStore } from "@/stores/ui-store";
import { ProfileSelector } from "./profile-selector";
import { ConstraintRow } from "./constraint-row";
import { VariantSelector } from "./variant-selector";

// ---------------------------------------------------------------------------
// Default constraint for the "Add" button
// ---------------------------------------------------------------------------

const DEFAULT_CONSTRAINT: SoftConstraint = {
  stat: "power",
  type: "maximize",
  weight: 50,
};

// ---------------------------------------------------------------------------
// FitnessPanel
// ---------------------------------------------------------------------------

export function FitnessPanel(): React.JSX.Element {
  const constraints = useFitnessStore((s) => s.constraints);
  const loadPreset = useFitnessStore((s) => s.loadPreset);
  const addConstraint = useFitnessStore((s) => s.addConstraint);
  const updateConstraint = useFitnessStore((s) => s.updateConstraint);
  const removeConstraint = useFitnessStore((s) => s.removeConstraint);

  return (
    <div className="space-y-4 p-4">
      <ProfileSelector
        constraints={constraints}
        onApplyProfile={loadPreset}
      />

      <Separator className="bg-border-subtle" />

      <VariantSelector />

      <Separator className="bg-border-subtle" />

      <ConstraintList
        constraints={constraints}
        onUpdate={updateConstraint}
        onRemove={removeConstraint}
      />

      <div className="flex items-center gap-3">
        <AddConstraintButton onAdd={addConstraint} />
        <HelpLink />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConstraintList
// ---------------------------------------------------------------------------

function ConstraintList({
  constraints,
  onUpdate,
  onRemove,
}: {
  readonly constraints: readonly SoftConstraint[];
  readonly onUpdate: (index: number, constraint: SoftConstraint) => void;
  readonly onRemove: (index: number) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        Constraints
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({constraints.length})
        </span>
      </h3>

      {constraints.length === 0 ? (
        <p className="text-text-muted text-xs px-1">
          No constraints configured. Add one or load a preset.
        </p>
      ) : (
        constraints.map((c, i) => (
          <ConstraintRow
            key={`${String(i)}-${c.stat}-${c.type}`}
            constraint={c}
            index={i}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddConstraintButton
// ---------------------------------------------------------------------------

function AddConstraintButton({
  onAdd,
}: {
  readonly onAdd: (constraint: SoftConstraint) => void;
}): React.JSX.Element {
  return (
    <Button
      variant="outline"
      size="sm"
      className="border-dashed border-border-default text-text-secondary hover:text-accent-gold hover:border-accent-gold"
      onClick={() => {
        onAdd(DEFAULT_CONSTRAINT);
      }}
    >
      + Add Constraint
    </Button>
  );
}

// ---------------------------------------------------------------------------
// HelpLink
// ---------------------------------------------------------------------------

function HelpLink(): React.JSX.Element {
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  return (
    <button
      type="button"
      className="text-xs text-text-muted hover:text-accent-gold transition-colors"
      onClick={() => { setActivePanel("help"); }}
    >
      How do goals work?
    </button>
  );
}
