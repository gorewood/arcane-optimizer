/**
 * EnchantmentForm — form for editing an enchantment.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Enchantment } from "@/models/types";
import { StatsEditor } from "./stats-editor";
import { TierToggle } from "./tier-toggle";
import { ApplicableToCheckboxes } from "./applicable-to-checkboxes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EnchantmentFormProps {
  readonly enchantment: Enchantment;
  readonly onChange: (enchantment: Enchantment) => void;
  readonly isNew: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnchantmentForm({
  enchantment,
  onChange,
  isNew,
}: EnchantmentFormProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-text-muted mb-1 block">ID</Label>
          <Input
            value={enchantment.id}
            onChange={(e) => { onChange({ ...enchantment, id: e.target.value }); }}
            disabled={!isNew}
            className="h-8 text-sm"
            placeholder="unique-enchantment-id"
          />
        </div>
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Name</Label>
          <Input
            value={enchantment.name}
            onChange={(e) => { onChange({ ...enchantment, name: e.target.value }); }}
            className="h-8 text-sm"
            placeholder="Enchantment Name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Tier</Label>
          <TierToggle
            tier={enchantment.tier}
            onChange={(tier) => { onChange({ ...enchantment, tier }); }}
          />
        </div>
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Applicable To</Label>
          <ApplicableToCheckboxes
            applicableTo={enchantment.applicableTo}
            onChange={(applicableTo) => { onChange({ ...enchantment, applicableTo }); }}
          />
        </div>
      </div>

      <IncompatibleWithField enchantment={enchantment} onChange={onChange} />

      <div>
        <Label className="text-xs text-text-muted mb-2 block">Stats</Label>
        <StatsEditor
          stats={enchantment.stats}
          onChange={(s) => { onChange({ ...enchantment, stats: s }); }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IncompatibleWithField — comma-separated enchantment IDs
// ---------------------------------------------------------------------------

function IncompatibleWithField({
  enchantment,
  onChange,
}: {
  readonly enchantment: Enchantment;
  readonly onChange: (enchantment: Enchantment) => void;
}): React.JSX.Element {
  const value = enchantment.incompatibleWith?.join(", ") ?? "";

  return (
    <div>
      <Label className="text-xs text-text-muted mb-1 block">
        Incompatible With (comma-separated IDs)
      </Label>
      <Input
        value={value}
        onChange={(e) => {
          const text = e.target.value;
          if (text.trim() === "") {
            const { incompatibleWith: _, ...rest } = enchantment;
            onChange(rest as Enchantment);
          } else {
            const ids = text.split(",").map((s) => s.trim()).filter((s) => s !== "");
            onChange({ ...enchantment, incompatibleWith: ids });
          }
        }}
        className="h-8 text-sm"
        placeholder="e.g., hard, powerful"
      />
    </div>
  );
}
