/**
 * FitnessPanel -- editor for configuring soft constraints and profiles.
 *
 * Allows users to manage profiles, add/edit/remove soft constraints.
 * Note: Heading and summary moved to FitnessSection collapsible wrapper.
 */

import type { SoftConstraint } from "@/models/types";
import type { ScoringMode } from "@/search/scoring-mode";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFitnessStore } from "@/stores/fitness-store";
import { useUIStore } from "@/stores/ui-store";
import { ProfileSelector } from "./profile-selector";
import { ConstraintRow } from "./constraint-row";
import { VariantSelector } from "./variant-selector";
import { StatWeightsEditor } from "./stat-weights-editor";

// ---------------------------------------------------------------------------
// Default constraint for the "Add" button
// ---------------------------------------------------------------------------

const DEFAULT_CONSTRAINT: SoftConstraint = {
  stat: "power",
  type: "maximize",
  weight: 50,
};

// ---------------------------------------------------------------------------
// Scoring Mode Descriptions
// ---------------------------------------------------------------------------

const SCORING_MODE_INFO: Record<ScoringMode, { label: string; description: string }> = {
  linear: {
    label: "Constraints",
    description: "Target specific stat values with thresholds and priorities.",
  },
  efficiency: {
    label: "Efficiency",
    description: "Normalized stat sum. Power 3:1, defense 1:3.",
  },
  multiplier: {
    label: "Multiplier",
    description: "Game-accurate with diminishing returns. Rewards balance.",
  },
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
  const scoringMode = useFitnessStore((s) => s.scoringMode);
  const setScoringMode = useFitnessStore((s) => s.setScoringMode);

  const isConstraintMode = scoringMode === "linear";

  return (
    <div className="space-y-4 p-4">
      <ProfileSelector constraints={constraints} onApplyProfile={loadPreset} />

      <Separator className="bg-border-subtle" />

      <ScoringModeSelector value={scoringMode} onChange={setScoringMode} />

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

      {!isConstraintMode && (
        <>
          <Separator className="bg-border-subtle" />
          <StatWeightsEditor />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScoringModeSelector
// ---------------------------------------------------------------------------

/** Type-safe list of scoring modes for iteration. */
const SCORING_MODES: readonly ScoringMode[] = ["linear", "efficiency", "multiplier"] as const;

function ScoringModeSelector({
  value,
  onChange,
}: {
  readonly value: ScoringMode;
  readonly onChange: (mode: ScoringMode) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        Scoring Mode
      </h3>
      <div className="flex gap-1">
        {SCORING_MODES.map((mode) => {
          const info = SCORING_MODE_INFO[mode];
          const isActive = value === mode;
          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => { onChange(mode); }}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/50"
                      : "bg-bg-surface text-text-secondary border border-border-default hover:text-text-primary hover:border-border-subtle"
                    }
                  `}
                >
                  {info.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {info.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
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
