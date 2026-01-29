/**
 * StatsEditor — reusable component for editing Partial<Stats>.
 * 2-column grid showing all 12 stats with number inputs.
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StatName, Stats } from "@/models/types";
import { STAT_LABELS } from "@/ui/panels/stat-indicator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_STATS: readonly StatName[] = [
  "power", "defense", "size", "dexterity", "range", "haste",
  "insanity", "warding", "drawback", "regeneration", "pierce", "resistance",
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatsEditorProps {
  readonly stats: Partial<Stats>;
  readonly onChange: (stats: Partial<Stats>) => void;
  readonly disabled?: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatsEditor({
  stats,
  onChange,
  disabled = false,
}: StatsEditorProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_STATS.map((stat) => (
        <StatInput
          key={stat}
          stat={stat}
          value={stats[stat]}
          disabled={disabled}
          onChange={(value) => {
            if (value === undefined) {
              const { [stat]: _, ...rest } = stats;
              onChange(rest);
            } else {
              onChange({ ...stats, [stat]: value });
            }
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatInput — single stat input with clear button
// ---------------------------------------------------------------------------

function StatInput({
  stat,
  value,
  disabled,
  onChange,
}: {
  readonly stat: StatName;
  readonly value: number | undefined;
  readonly disabled: boolean;
  readonly onChange: (value: number | undefined) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-text-muted w-12 shrink-0">
        {STAT_LABELS[stat]}
      </label>
      <Input
        type="number"
        value={value ?? ""}
        placeholder="-"
        disabled={disabled}
        min={-9999}
        max={9999}
        className="h-7 px-2 text-xs flex-1"
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") {
            onChange(undefined);
          } else {
            const num = parseInt(val, 10);
            if (!isNaN(num)) onChange(num);
          }
        }}
      />
      {value !== undefined && !disabled && (
        <Button
          variant="ghost"
          size="xs"
          className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
          onClick={() => { onChange(undefined); }}
          title="Clear stat"
        >
          x
        </Button>
      )}
    </div>
  );
}
