/**
 * AtlanteanFields — form fields for atlantean modifier configuration.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { StatName, AtlanteanConfig } from "@/models/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BONUS_STATS: readonly StatName[] = [
  "power", "defense", "size", "dexterity", "range", "haste",
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AtlanteanFieldsProps {
  readonly config: AtlanteanConfig;
  readonly onChange: (config: AtlanteanConfig) => void;
  readonly onRemove: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AtlanteanFields({
  config,
  onChange,
  onRemove,
}: AtlanteanFieldsProps): React.JSX.Element {
  const toggleStat = (stat: StatName): void => {
    const current = new Set(config.possibleBonusStats);
    if (current.has(stat)) {
      current.delete(stat);
    } else {
      current.add(stat);
    }
    onChange({ ...config, possibleBonusStats: [...current] });
  };

  return (
    <div className="p-2 space-y-3 border-t border-border-subtle">
      <InsanityField config={config} onChange={onChange} />
      <BonusStatsField config={config} toggleStat={toggleStat} />
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-stat-negative hover:underline"
      >
        Remove Atlantean Behavior
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InsanityField
// ---------------------------------------------------------------------------

function InsanityField({
  config,
  onChange,
}: {
  readonly config: AtlanteanConfig;
  readonly onChange: (config: AtlanteanConfig) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className="text-xs text-text-muted mb-1 block">Insanity</Label>
      <Input
        type="number"
        value={config.insanity}
        min={0}
        max={999}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val)) onChange({ ...config, insanity: val });
        }}
        className="h-7 text-sm w-24"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BonusStatsField
// ---------------------------------------------------------------------------

function BonusStatsField({
  config,
  toggleStat,
}: {
  readonly config: AtlanteanConfig;
  readonly toggleStat: (stat: StatName) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className="text-xs text-text-muted mb-1 block">Possible Bonus Stats</Label>
      <div className="flex flex-wrap gap-2">
        {BONUS_STATS.map((stat) => (
          <div key={stat} className="flex items-center gap-1">
            <Checkbox
              id={`bonus-${stat}`}
              checked={config.possibleBonusStats.includes(stat)}
              onCheckedChange={() => { toggleStat(stat); }}
            />
            <Label htmlFor={`bonus-${stat}`} className="text-xs text-text-secondary cursor-pointer capitalize">
              {stat}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
