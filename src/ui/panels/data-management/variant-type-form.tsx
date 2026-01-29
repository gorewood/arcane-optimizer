/**
 * VariantTypeForm — form for editing a variant type entry.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VariantTypeWithKey } from "./variant-types-editor";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariantTypeFormProps {
  readonly variantType: VariantTypeWithKey;
  readonly onChange: (variantType: VariantTypeWithKey) => void;
  readonly isNew: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantTypeForm({
  variantType,
  onChange,
  isNew,
}: VariantTypeFormProps): React.JSX.Element {
  const variantsText = variantType.variants.join(", ");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Key (ID)</Label>
          <Input
            value={variantType.key}
            onChange={(e) => { onChange({ ...variantType, key: e.target.value }); }}
            disabled={!isNew}
            className="h-8 text-sm font-mono"
            placeholder="magic"
          />
        </div>
        <div>
          <Label className="text-xs text-text-muted mb-1 block">Label</Label>
          <Input
            value={variantType.label}
            onChange={(e) => { onChange({ ...variantType, label: e.target.value }); }}
            className="h-8 text-sm"
            placeholder="Magic Types"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-text-muted mb-1 block">
          Variants (comma-separated)
        </Label>
        <Input
          value={variantsText}
          onChange={(e) => {
            const text = e.target.value;
            const variants = text
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s !== "");
            onChange({ ...variantType, variants });
          }}
          className="h-8 text-sm"
          placeholder="fire, water, wind, earth, light, shadow"
        />
        <p className="text-xs text-text-muted mt-1">
          {variantType.variants.length} variant{variantType.variants.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
