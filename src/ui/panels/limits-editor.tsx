/**
 * LimitsEditor -- compact sliders for max insanity/warding/drawback.
 * Used in Efficiency and Multiplier scoring modes.
 */

import { useFitnessStore } from "@/stores/fitness-store";
import { Slider } from "@/components/ui/slider";
import type { StatLimits } from "@/data/profile-types";

const LIMIT_STATS: (keyof StatLimits)[] = ["insanity", "warding", "drawback"];

const LIMIT_LABELS: Record<keyof StatLimits, string> = {
  insanity: "Max Insanity",
  warding: "Max Warding",
  drawback: "Max Drawback",
};

const LIMIT_MAX: Record<keyof StatLimits, number> = {
  insanity: 5,
  warding: 5,
  drawback: 10,
};

export function LimitsEditor(): React.JSX.Element {
  const scoringMode = useFitnessStore((s) => s.scoringMode);
  const efficiencyLimits = useFitnessStore((s) => s.efficiencyConfig.limits);
  const multiplierLimits = useFitnessStore((s) => s.multiplierConfig.limits);
  const setLimit = useFitnessStore((s) => s.setLimit);

  const limits = scoringMode === "multiplier" ? multiplierLimits : efficiencyLimits;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-accent-gold px-1">Limits</h3>
      <div className="space-y-1.5 pl-2">
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
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary w-24">{label}</span>
      <Slider
        value={[value]}
        onValueChange={([v]) => { if (v !== undefined) onChange(v); }}
        min={0}
        max={max}
        step={1}
        className="flex-1"
      />
      <span className="text-xs text-text-muted w-6 text-right">{value}</span>
    </div>
  );
}
