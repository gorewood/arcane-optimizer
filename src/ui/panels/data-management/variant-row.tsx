/**
 * VariantRow — single variant with name and stats editor.
 */

import { Button } from "@/components/ui/button";
import type { Stats } from "@/models/types";
import { StatsEditor } from "./stats-editor";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariantRowProps {
  readonly name: string;
  readonly stats: Partial<Stats>;
  readonly disabled: boolean;
  readonly onRemove: () => void;
  readonly onChange: (stats: Partial<Stats>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantRow({
  name,
  stats,
  disabled,
  onRemove,
  onChange,
}: VariantRowProps): React.JSX.Element {
  return (
    <div className="border border-border-subtle rounded p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-accent-gold font-medium">{name}</span>
        {!disabled && (
          <Button variant="ghost" size="xs" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <StatsEditor stats={stats} onChange={onChange} disabled={disabled} />
    </div>
  );
}
