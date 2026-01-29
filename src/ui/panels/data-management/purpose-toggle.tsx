/**
 * PurposeToggle - radio toggle for selecting item purpose (contribution/custom).
 */

import type { ItemPurpose } from "@/data/user-data-types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PurposeToggleProps {
  /** Unique prefix for radio button IDs (e.g., "equipment", "gem"). */
  readonly idPrefix: string;
  readonly value: ItemPurpose;
  readonly onChange: (purpose: ItemPurpose) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isItemPurpose(value: string): value is ItemPurpose {
  return value === "contribution" || value === "custom";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PurposeToggle({
  idPrefix,
  value,
  onChange,
}: PurposeToggleProps): React.JSX.Element {
  const handleChange = (v: string): void => {
    if (isItemPurpose(v)) {
      onChange(v);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-text-muted">Purpose</Label>
      <RadioGroup value={value} onValueChange={handleChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="contribution"
            id={`${idPrefix}-purpose-contribution`}
          />
          <Label
            htmlFor={`${idPrefix}-purpose-contribution`}
            className="text-sm font-normal cursor-pointer"
          >
            Contribution{" "}
            <span className="text-text-muted">(syncs with updates)</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="custom" id={`${idPrefix}-purpose-custom`} />
          <Label
            htmlFor={`${idPrefix}-purpose-custom`}
            className="text-sm font-normal cursor-pointer"
          >
            Custom <span className="text-text-muted">(keeps forever)</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
