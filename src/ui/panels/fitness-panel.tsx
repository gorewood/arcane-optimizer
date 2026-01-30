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
// Default constraints for the "Add" button
// ---------------------------------------------------------------------------

const DEFAULT_CONSTRAINT: SoftConstraint = {
  stat: "power",
  type: "maximize",
  weight: 50,
};

const DEFAULT_LIMIT: SoftConstraint = {
  stat: "drawback",
  type: "atMost",
  value: 0,
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
  const constraints = useFitnessStore((s) => s.constraintsConfig.constraints);
  const applyProfile = useFitnessStore((s) => s.applyProfile);
  const addConstraint = useFitnessStore((s) => s.addConstraint);
  const updateConstraint = useFitnessStore((s) => s.updateConstraint);
  const removeConstraint = useFitnessStore((s) => s.removeConstraint);
  const scoringMode = useFitnessStore((s) => s.scoringMode);
  const setScoringMode = useFitnessStore((s) => s.setScoringMode);

  const isConstraintMode = scoringMode === "linear";

  return (
    <div className="space-y-4 p-4">
      <ProfileSelector onApplyProfile={applyProfile} />

      <Separator className="bg-border-subtle" />

      <ScoringModeSelector value={scoringMode} onChange={setScoringMode} />

      <Separator className="bg-border-subtle" />

      <VariantSelector />

      <Separator className="bg-border-subtle" />

      <ConstraintList
        constraints={constraints}
        onUpdate={updateConstraint}
        onRemove={removeConstraint}
        isConstraintMode={isConstraintMode}
      />

      <div className="flex items-center gap-3">
        <AddConstraintButton onAdd={addConstraint} isConstraintMode={isConstraintMode} />
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
  isConstraintMode,
}: {
  readonly constraints: readonly SoftConstraint[];
  readonly onUpdate: (index: number, constraint: SoftConstraint) => void;
  readonly onRemove: (index: number) => void;
  readonly isConstraintMode: boolean;
}): React.JSX.Element {
  const headerLabel = isConstraintMode ? "Constraints" : "Hard Limits";
  const emptyMessage = isConstraintMode
    ? "No constraints configured. Add one or load a preset."
    : "No limits configured. Add hard filters to exclude builds.";

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        {headerLabel}
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({constraints.length})
        </span>
      </h3>

      {constraints.length === 0 ? (
        <p className="text-text-muted text-xs px-1">
          {emptyMessage}
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
  isConstraintMode,
}: {
  readonly onAdd: (constraint: SoftConstraint) => void;
  readonly isConstraintMode: boolean;
}): React.JSX.Element {
  const defaultValue = isConstraintMode ? DEFAULT_CONSTRAINT : DEFAULT_LIMIT;
  const buttonLabel = isConstraintMode ? "+ Add Constraint" : "+ Add Limit";

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-dashed border-border-default text-text-secondary hover:text-accent-gold hover:border-accent-gold"
      onClick={() => {
        onAdd(defaultValue);
      }}
    >
      {buttonLabel}
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
