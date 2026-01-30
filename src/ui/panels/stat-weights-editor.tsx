/**
 * StatWeightsEditor — collapsible panel for adjusting stat weights.
 * Used in Efficiency and Multiplier scoring modes.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useFitnessStore } from "@/stores/fitness-store";
import type { StatName } from "@/models/types";
import { DEFAULT_STAT_WEIGHTS } from "@/search/scoring-mode";
import { STAT_NAMES } from "@/search/stats";

// Flat list of stats in a sensible order for 2-column display
const STAT_ORDER: StatName[] = [
  "power",
  "defense",
  "size",
  "dexterity",
  "range",
  "haste",
  "regeneration",
  "resistance",
  "pierce",
  "insanity",
  "warding",
  "drawback",
];

const STAT_LABELS: Record<StatName, string> = {
  power: "Power",
  defense: "Defense",
  size: "Size",
  dexterity: "Dexterity",
  range: "Range",
  haste: "Haste",
  regeneration: "Regen",
  resistance: "Resist",
  pierce: "Pierce",
  insanity: "Insanity",
  warding: "Warding",
  drawback: "Drawback",
};

export function StatWeightsEditor(): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const scoringMode = useFitnessStore((s) => s.scoringMode);
  const efficiencyWeights = useFitnessStore((s) => s.efficiencyConfig.weights);
  const multiplierWeights = useFitnessStore((s) => s.multiplierConfig.weights);
  const setWeight = useFitnessStore((s) => s.setWeight);
  const resetWeights = useFitnessStore((s) => s.resetWeights);

  // Get weights for current mode (this component only shown in efficiency/multiplier)
  const statWeights = scoringMode === "multiplier" ? multiplierWeights : efficiencyWeights;

  const hasChanges = STAT_NAMES.some(
    (stat) => statWeights[stat] !== DEFAULT_STAT_WEIGHTS[stat],
  );

  const toggle = (): void => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="space-y-2">
      <StatWeightsHeader
        isExpanded={isExpanded}
        hasChanges={hasChanges}
        onToggle={toggle}
        onReset={resetWeights}
      />
      {isExpanded && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 pl-6">
          {STAT_ORDER.map((stat) => (
            <StatWeightSlider
              key={stat}
              stat={stat}
              value={statWeights[stat]}
              onChange={(v) => {
                setWeight(stat, v);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatWeightsHeader({
  isExpanded,
  hasChanges,
  onToggle,
  onReset,
}: {
  isExpanded: boolean;
  hasChanges: boolean;
  onToggle: () => void;
  onReset: () => void;
}): React.JSX.Element {
  const Icon = isExpanded ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full text-left"
    >
      <span className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-text-secondary" />
        <h3 className="text-sm font-semibold text-accent-gold">Stat Weights</h3>
        {hasChanges && (
          <span className="text-xs text-text-muted">(modified)</span>
        )}
      </span>
      {isExpanded && (
        <Button
          variant="ghost"
          size="xs"
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          disabled={!hasChanges}
          className="text-text-muted hover:text-accent-gold"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      )}
    </button>
  );
}

function StatWeightSlider({
  stat,
  value,
  onChange,
}: {
  stat: StatName;
  value: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary w-20 shrink-0">
        {STAT_LABELS[stat]}
      </span>
      <Slider
        value={[value]}
        onValueChange={([v]) => {
          if (v !== undefined) {
            onChange(v);
          }
        }}
        min={0}
        max={200}
        step={5}
        className="flex-1 min-w-12"
      />
      <span className="text-xs text-text-muted w-8 text-right shrink-0">{value}</span>
    </div>
  );
}
