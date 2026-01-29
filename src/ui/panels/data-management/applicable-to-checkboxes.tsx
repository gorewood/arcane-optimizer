/**
 * ApplicableToCheckboxes — checkboxes for armor/accessory applicability.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApplicableToCheckboxesProps {
  readonly applicableTo: readonly ("armor" | "accessory")[];
  readonly onChange: (applicableTo: readonly ("armor" | "accessory")[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplicableToCheckboxes({
  applicableTo,
  onChange,
}: ApplicableToCheckboxesProps): React.JSX.Element {
  const hasArmor = applicableTo.includes("armor");
  const hasAccessory = applicableTo.includes("accessory");

  const toggle = (type: "armor" | "accessory"): void => {
    const current = new Set(applicableTo);
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }
    onChange([...current] as ("armor" | "accessory")[]);
  };

  return (
    <div className="flex gap-4">
      <div className="flex items-center gap-1.5">
        <Checkbox
          id="armor"
          checked={hasArmor}
          onCheckedChange={() => { toggle("armor"); }}
        />
        <Label htmlFor="armor" className="text-xs text-text-secondary cursor-pointer">
          Armor
        </Label>
      </div>
      <div className="flex items-center gap-1.5">
        <Checkbox
          id="accessory"
          checked={hasAccessory}
          onCheckedChange={() => { toggle("accessory"); }}
        />
        <Label htmlFor="accessory" className="text-xs text-text-secondary cursor-pointer">
          Accessory
        </Label>
      </div>
    </div>
  );
}
