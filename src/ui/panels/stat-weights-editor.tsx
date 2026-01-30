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

// Stat display names and groupings
const STAT_GROUPS: { label: string; stats: StatName[] }[] = [
  { label: "Primary", stats: ["power", "defense"] },
  { label: "Secondary", stats: ["size", "dexterity", "range", "haste"] },
  { label: "Special", stats: ["regeneration", "resistance", "pierce"] },
  { label: "Drawbacks", stats: ["insanity", "warding", "drawback"] },
];

const STAT_LABELS: Record<StatName, string> = {
  power: "Power",
  defense: "Defense",
  size: "Size",
  dexterity: "Dexterity",
  range: "Range",
  haste: "Haste",
  regeneration: "Regen",
  resistance: "Resistance",
  pierce: "Pierce",
  insanity: "Insanity",
  warding: "Warding",
  drawback: "Drawback",
};

export function StatWeightsEditor(): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const statWeights = useFitnessStore((s) => s.statWeights);
  const setStatWeight = useFitnessStore((s) => s.setStatWeight);
  const resetStatWeights = useFitnessStore((s) => s.resetStatWeights);

  // Check if weights differ from defaults
  const hasChanges = STAT_NAMES.some(
    (stat) => statWeights[stat] !== DEFAULT_STAT_WEIGHTS[stat],
  );

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => { setIsExpanded(!isExpanded); }}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        )}
        <h3 className="text-sm font-semibold text-accent-gold">Stat Weights</h3>
        {hasChanges && (
          <span className="text-xs text-text-muted">(modified)</span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 pl-6">
          {STAT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <h4 className="text-xs text-text-muted uppercase tracking-wide">
                {group.label}
              </h4>
              {group.stats.map((stat) => (
                <StatWeightSlider
                  key={stat}
                  stat={stat}
                  value={statWeights[stat]}
                  onChange={(v) => { setStatWeight(stat, v); }}
                />
              ))}
            </div>
          ))}

          <Button
            variant="ghost"
            size="xs"
            onClick={resetStatWeights}
            disabled={!hasChanges}
            className="text-text-muted hover:text-accent-gold"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset to Defaults
          </Button>
        </div>
      )}
    </div>
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
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary w-20">
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
        className="flex-1"
      />
      <span className="text-xs text-text-muted w-8 text-right">{value}</span>
    </div>
  );
}
