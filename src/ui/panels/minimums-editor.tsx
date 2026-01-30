/**
 * MinimumsEditor -- sliders for minimum stat requirements.
 * Used in Efficiency and Multiplier scoring modes.
 * Stats with no minimum set show "off".
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useFitnessStore } from "@/stores/fitness-store";
import { Slider } from "@/components/ui/slider";
import type { StatName } from "@/models/types";

// Stats that can have minimums (beneficial stats only)
const MIN_STATS: StatName[] = [
  "power", "defense", "size", "dexterity", "range", "haste",
  "regeneration", "resistance", "pierce",
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

// Max values for each stat's minimum slider
const STAT_MAX: Record<StatName, number> = {
  power: 300,
  defense: 2000,
  size: 100,
  dexterity: 100,
  range: 100,
  haste: 50,
  regeneration: 50,
  resistance: 50,
  pierce: 50,
  insanity: 5,
  warding: 5,
  drawback: 10,
};

export function MinimumsEditor(): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const scoringMode = useFitnessStore((s) => s.scoringMode);
  const efficiencyMins = useFitnessStore((s) => s.efficiencyConfig.minimums);
  const multiplierMins = useFitnessStore((s) => s.multiplierConfig.minimums);
  const setMinimum = useFitnessStore((s) => s.setMinimum);

  const minimums = scoringMode === "multiplier" ? multiplierMins : efficiencyMins;
  const activeCount = Object.keys(minimums).length;

  const toggle = (): void => { setIsExpanded(!isExpanded); };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded
          ? <ChevronDown className="w-4 h-4 text-text-secondary" />
          : <ChevronRight className="w-4 h-4 text-text-secondary" />}
        <h3 className="text-sm font-semibold text-accent-gold">
          Minimums
          {activeCount > 0 && (
            <span className="ml-2 text-xs text-text-muted font-normal">
              ({activeCount} active)
            </span>
          )}
        </h3>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 pl-6">
          {MIN_STATS.map((stat) => (
            <MinimumSlider
              key={stat}
              stat={stat}
              value={minimums[stat] ?? null}
              max={STAT_MAX[stat]}
              onChange={(v) => { setMinimum(stat, v); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MinimumSlider({
  stat,
  value,
  max,
  onChange,
}: {
  readonly stat: StatName;
  readonly value: number | null;
  readonly max: number;
  readonly onChange: (v: number | null) => void;
}): React.JSX.Element {
  const isActive = value !== null;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs w-20 shrink-0 ${isActive ? "text-text-secondary" : "text-text-muted"}`}
      >
        {STAT_LABELS[stat]}
      </span>
      <Slider
        value={[value ?? 0]}
        onValueChange={([v]) => {
          if (v !== undefined) {
            // If slider moved from 0 and wasn't active, enable the minimum
            // If slider is at 0 and wasn't active, keep it off
            onChange(v === 0 && !isActive ? null : v);
          }
        }}
        min={0}
        max={max}
        step={Math.max(1, Math.floor(max / 20))}
        className={`flex-1 min-w-12 ${isActive ? "" : "opacity-50"}`}
      />
      <span className="text-xs text-text-muted w-10 text-right shrink-0">
        {isActive ? value : "off"}
      </span>
    </div>
  );
}
