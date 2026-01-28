/**
 * PresetSelector -- dropdown for loading built-in fitness presets.
 *
 * Shows preset names from FITNESS_PRESETS, with Apply and Clear actions.
 * Active preset is highlighted with gold accent.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FITNESS_PRESETS, PRESET_NAMES } from "@/search/fitness";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PresetSelectorProps {
  readonly activePresetName: string | null;
  readonly onLoadPreset: (
    name: string,
    constraints: ReturnType<typeof getPresetConstraints>,
  ) => void;
  readonly onClear: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPresetConstraints(name: string): typeof FITNESS_PRESETS[string] {
  const preset = FITNESS_PRESETS[name];
  if (preset == null) return [];
  return preset;
}

// ---------------------------------------------------------------------------
// PresetSelector
// ---------------------------------------------------------------------------

export function PresetSelector({
  activePresetName,
  onLoadPreset,
  onClear,
}: PresetSelectorProps): React.JSX.Element {
  const [selectedName, setSelectedName] = useState<string>(
    activePresetName ?? PRESET_NAMES[0] ?? "",
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-text-secondary">Preset:</span>

      <Select value={selectedName} onValueChange={setSelectedName}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="Select preset..." />
        </SelectTrigger>
        <SelectContent>
          {PRESET_NAMES.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="xs"
        onClick={() => {
          const constraints = getPresetConstraints(selectedName);
          onLoadPreset(selectedName, constraints);
        }}
      >
        Apply
      </Button>

      <Button variant="outline" size="xs" onClick={onClear}>
        Clear
      </Button>

      {activePresetName != null && (
        <Badge className="bg-accent-gold/20 text-accent-gold border border-accent-gold/40">
          {activePresetName}
        </Badge>
      )}
    </div>
  );
}
