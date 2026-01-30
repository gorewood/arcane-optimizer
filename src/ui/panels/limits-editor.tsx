/**
 * LimitsEditor -- compact sliders for max insanity/warding/drawback.
 * Used in Efficiency and Multiplier scoring modes.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useFitnessStore } from "@/stores/fitness-store";
import { Slider } from "@/components/ui/slider";
import type { StatLimits } from "@/data/profile-types";

const LIMIT_STATS: (keyof StatLimits)[] = ["insanity", "warding", "drawback"];

const LIMIT_LABELS: Record<keyof StatLimits, string> = {
  insanity: "Insanity",
  warding: "Warding",
  drawback: "Drawback",
};

const LIMIT_MAX: Record<keyof StatLimits, number> = {
  insanity: 5,
  warding: 5,
  drawback: 10,
};

export function LimitsEditor(): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const scoringMode = useFitnessStore((s) => s.scoringMode);
  const efficiencyLimits = useFitnessStore((s) => s.efficiencyConfig.limits);
  const multiplierLimits = useFitnessStore((s) => s.multiplierConfig.limits);
  const setLimit = useFitnessStore((s) => s.setLimit);

  const limits = scoringMode === "multiplier" ? multiplierLimits : efficiencyLimits;
  const activeCount = LIMIT_STATS.filter((s) => limits[s] > 0).length;

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
          Limits
          {activeCount > 0 && (
            <span className="ml-2 text-xs text-text-muted font-normal">
              ({activeCount} active)
            </span>
          )}
        </h3>
      </button>

      {isExpanded && (
        <div className="flex items-center gap-6 pl-6">
          {LIMIT_STATS.map((stat) => (
            <LimitSlider
              key={stat}
              label={LIMIT_LABELS[stat]}
              value={limits[stat]}
              max={LIMIT_MAX[stat]}
              onChange={(v) => { setLimit(stat, v); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LimitSlider({
  label,
  value,
  max,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 flex-1">
      <span className="text-xs text-text-secondary w-16 shrink-0">{label}</span>
      <Slider
        value={[value]}
        onValueChange={([v]) => { if (v !== undefined) onChange(v); }}
        min={0}
        max={max}
        step={1}
        className="flex-1 min-w-16"
      />
      <span className="text-xs text-text-muted w-4 text-right shrink-0">{value}</span>
    </div>
  );
}
