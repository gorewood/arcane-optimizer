/**
 * GemForm — form for editing a gem.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Gem } from "@/models/types";
import { StatsEditor } from "./stats-editor";
import { TierToggle } from "./tier-toggle";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GemFormProps {
  readonly gem: Gem;
  readonly onChange: (gem: Gem) => void;
  readonly isNew: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GemForm({
  gem,
  onChange,
  isNew,
}: GemFormProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-text-muted mb-1 block">ID</Label>
          <Input
            value={gem.id}
            onChange={(e) => { onChange({ ...gem, id: e.target.value }); }}
            disabled={!isNew}
            className="h-8 text-sm"
            placeholder="unique-gem-id"
          />
        </div>
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Name</Label>
          <Input
            value={gem.name}
            onChange={(e) => { onChange({ ...gem, name: e.target.value }); }}
            className="h-8 text-sm"
            placeholder="Gem Name"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-text-muted mb-1 block">Tier</Label>
        <TierToggle
          tier={gem.tier}
          onChange={(tier) => { onChange({ ...gem, tier }); }}
        />
      </div>

      <div>
        <Label className="text-xs text-text-muted mb-2 block">Stats</Label>
        <StatsEditor
          stats={gem.stats}
          onChange={(s) => { onChange({ ...gem, stats: s }); }}
        />
      </div>
    </div>
  );
}
