/**
 * EquipmentExtraFields — tags and atlantean fields.
 */

import { Input } from "@/components/ui/input";
import type { EquipmentPiece } from "@/models/types";
import { FormField } from "./form-field";
import { EquipmentNumericFields } from "./equipment-numeric-fields";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentExtraFieldsProps {
  readonly equipment: EquipmentPiece;
  readonly onChange: (equipment: EquipmentPiece) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentExtraFields({
  equipment,
  onChange,
}: EquipmentExtraFieldsProps): React.JSX.Element {
  return (
    <>
      <EquipmentNumericFields equipment={equipment} onChange={onChange} />

      <FormField label="Tags (comma-separated)">
        <Input
          value={equipment.tags.join(", ")}
          placeholder="armor, magic, fire"
          className="h-8 text-sm"
          onChange={(e) => {
            onChange({
              ...equipment,
              tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
            });
          }}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={equipment.atlanteanOnly ?? false}
          onChange={(e) => {
            onChange({ ...equipment, atlanteanOnly: e.target.checked || undefined });
          }}
          className="size-4 rounded border-border-default accent-accent-gold"
        />
        Atlantean Only
      </label>
    </>
  );
}
