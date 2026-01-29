/**
 * ModifierForm — form for editing a modifier.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Modifier } from "@/models/types";
import { StatsEditor } from "./stats-editor";
import { AtlanteanBehaviorEditor } from "./atlantean-behavior-editor";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModifierFormProps {
  readonly modifier: Modifier;
  readonly onChange: (modifier: Modifier) => void;
  readonly isNew: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModifierForm({
  modifier,
  onChange,
  isNew,
}: ModifierFormProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-text-muted mb-1 block">ID</Label>
          <Input
            value={modifier.id}
            onChange={(e) => { onChange({ ...modifier, id: e.target.value }); }}
            disabled={!isNew}
            className="h-8 text-sm"
            placeholder="unique-modifier-id"
          />
        </div>
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Name</Label>
          <Input
            value={modifier.name}
            onChange={(e) => { onChange({ ...modifier, name: e.target.value }); }}
            className="h-8 text-sm"
            placeholder="Modifier Name"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="grantsSocket"
          checked={modifier.grantsSocket === true}
          onCheckedChange={(checked) => {
            if (checked === true) {
              onChange({ ...modifier, grantsSocket: true });
            } else {
              const { grantsSocket: _, ...rest } = modifier;
              onChange(rest as Modifier);
            }
          }}
        />
        <Label htmlFor="grantsSocket" className="text-xs text-text-secondary cursor-pointer">
          Grants Socket
        </Label>
      </div>

      <div>
        <Label className="text-xs text-text-muted mb-2 block">Stats</Label>
        <StatsEditor
          stats={modifier.stats}
          onChange={(s) => { onChange({ ...modifier, stats: s }); }}
        />
      </div>

      <AtlanteanBehaviorEditor modifier={modifier} onChange={onChange} />
    </div>
  );
}
